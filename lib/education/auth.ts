import 'server-only';
import {cookies} from 'next/headers';
import {db, baseUrl, rpc} from './db';
import {hashToken, opaqueToken, rateKey, validToken} from './core';
import {membership} from './telegram';

export const COOKIE = process.env.NODE_ENV === 'production' ? '__Host-cobalt-session' : 'cobalt-session';
export const cookieOptions = {httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/'};
export type User = {telegram_id: number; first_name: string; username: string | null};
export class RateLimitError extends Error {}
export async function session(): Promise<User | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!validToken(raw)) return null;
  const rows = await db<{user_id: number}[]>(`edu_sessions?token_hash=eq.${hashToken(raw)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=user_id`);
  if (!rows[0]) return null;
  return (await db<User[]>(`edu_users?telegram_id=eq.${rows[0].user_id}&select=telegram_id,first_name,username`))[0] || null;
}
export function assertOrigin(request: Request) {
  if (request.headers.get('origin') !== baseUrl()) throw new Error('Invalid origin');
}
export async function rateLimit(scope: string, identity: string, limit: number, seconds: number) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('AUTH_SECRET is required');
  const allowed = await rpc<boolean>('edu_rate_limit', {p_key: rateKey(`${scope}:${identity}`, secret), p_limit: limit, p_seconds: seconds});
  if (!allowed) throw new RateLimitError('Too many requests. Please wait before trying again.');
}
export function requestIp(request: Request) { return request.headers.get('x-real-ip') || request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || 'local'; }
export async function issueLink(userId: number) {
  await rateLimit('issue', String(userId), 5, 600);
  if (!await membership(userId, true)) return null;
  const token = opaqueToken();
  await db('edu_login_tokens', {method: 'POST', headers: {Prefer: 'return=minimal'}, body: JSON.stringify({token_hash: hashToken(token), user_id: userId, expires_at: new Date(Date.now() + 5 * 60000).toISOString()})});
  // Fragment keeps the secret out of HTTP access logs and referrer headers.
  return `${baseUrl()}/login/claim#token=${token}`;
}
export async function redeem(token: string) {
  if (!validToken(token)) throw new Error('This sign-in link is invalid or expired.');
  const rows = await db<{user_id: number}[]>(`edu_login_tokens?token_hash=eq.${hashToken(token)}&used_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=user_id`);
  if (!rows[0]) throw new Error('This sign-in link is invalid or expired.');
  const userId = rows[0].user_id;
  await rateLimit('redeem-user', String(userId), 10, 600);
  if (!await membership(userId, true)) throw new Error('Premium membership not detected.');
  const raw = opaqueToken();
  const success = await rpc<boolean>('edu_redeem_login', {p_token: hashToken(token), p_session: hashToken(raw)});
  if (!success) throw new Error('This sign-in link was already used or has expired.');
  return raw;
}
