const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type Role = 'SUPER_ADMIN' | 'EDITOR' | 'AUTHOR' | 'CONTRIBUTOR';
export type PostStatus = 'DRAFT' | 'PENDING_REVIEW' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export interface SessionUser { id: string; email: string; name: string; role: Role; }

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('czyblog_token');
}

export function setSession(token: string, user: SessionUser) {
  localStorage.setItem('czyblog_token', token);
  localStorage.setItem('czyblog_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('czyblog_token');
  localStorage.removeItem('czyblog_user');
}

export function currentUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('czyblog_user');
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

interface ApiOptions extends RequestInit { skipAuth?: boolean; }

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  if (!opts.skipAuth) {
    const tok = getToken();
    if (tok) headers.set('Authorization', `Bearer ${tok}`);
  }
  if (opts.body && !(opts.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  if (!res.ok) {
    let detail: unknown;
    try { detail = await res.json(); } catch { /* */ }
    throw new Error(
      (detail as any)?.error ?? `Request failed: ${res.status} ${res.statusText}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
