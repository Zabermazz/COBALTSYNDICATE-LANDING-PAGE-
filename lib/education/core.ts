import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export type Access = 'public' | 'free_member' | 'premium';
export function opaqueToken() { return randomBytes(32).toString('base64url'); }
export function hashToken(value: string) { return createHash('sha256').update(value).digest('hex'); }
export function equalSecret(a: string, b: string) { return timingSafeEqual(Buffer.from(hashToken(a)), Buffer.from(hashToken(b))); }
export function validToken(value: unknown): value is string { return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value); }
export function isMember(member: {status?: string; is_member?: boolean}) {
  return ['creator', 'administrator', 'member'].includes(member.status || '') || (member.status === 'restricted' && member.is_member === true);
}
export function mayRead(access: Access, signedIn: boolean, premium: boolean) {
  return access === 'public' || (signedIn && (access === 'free_member' || premium));
}
export function rateKey(value: string, secret: string) { return createHmac('sha256', secret).update(value).digest('hex'); }
export function safeReturn(value: unknown) {
  return typeof value === 'string' && /^\/(learn|account)(\/|$)/.test(value) && !/[\\\r\n]/.test(value) ? value : '/learn/dashboard';
}
