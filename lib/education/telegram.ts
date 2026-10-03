import 'server-only';
import {isMember} from './core';
import {db, rpc} from './db';

export async function telegram<T>(method: string, data: object): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('Telegram is not configured');
  // Never include fetch errors or the request URL in logs: the URL contains the bot secret.
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data),
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    const result = await response.json() as {ok:boolean;result:T};
    if (!response.ok || !result.ok) throw new Error('Telegram unavailable');
    return result.result as T;
  } catch { throw new Error('Telegram unavailable'); }
}
export type Membership = {user_id: number; active: boolean; checked_at: string | null; version: number};
export async function membership(userId: number, fresh = false): Promise<boolean> {
  const rows = await db<Membership[]>(`edu_memberships?user_id=eq.${userId}&select=*`);
  const previous = rows[0];
  const minutes = Math.min(30, Math.max(1, Number(process.env.MEMBERSHIP_CACHE_MINUTES) || 30));
  if (!fresh && previous?.checked_at && Date.now() - Date.parse(previous.checked_at) < minutes * 60000) return previous.active;
  const chats = (process.env.TELEGRAM_PREMIUM_CHAT_IDS || '').split(',').map(v => v.trim()).filter(Boolean);
  if (!chats.length) throw new Error('Premium groups are not configured');
  let active = false;
  for (const chat of chats) {
    const result = await telegram<{status: string; is_member?: boolean}>('getChatMember', {chat_id: chat, user_id: userId});
    if (isMember(result)) { active = true; break; }
  }
  // A membership event that arrived during the network request invalidates this result.
  const saved = await rpc<boolean>('edu_set_membership', {p_user: userId, p_active: active, p_version: previous?.version ?? 0});
  if (!saved) throw new Error('Membership changed; check again');
  return active;
}
export async function invalidateMembership(userId: number) { await rpc('edu_invalidate_membership', {p_user: userId}); }
