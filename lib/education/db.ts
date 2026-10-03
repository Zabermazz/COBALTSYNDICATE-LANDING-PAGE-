import 'server-only';

export function configured() { return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY); }
export async function db<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Education storage is not configured');
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...init, cache: 'no-store', signal: AbortSignal.timeout(12000),
    headers: {apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init.headers},
  });
  if (!response.ok) throw new Error('Education storage unavailable');
  return response.status === 204 ? undefined as T : response.json();
}
export function rpc<T = unknown>(name: string, values: object) { return db<T>(`rpc/${name}`, {method: 'POST', body: JSON.stringify(values)}); }
export function baseUrl() {
  const value = process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) throw new Error('APP_URL is required');
  const url = new URL(value);
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('APP_URL must use HTTPS');
  return url.origin;
}
