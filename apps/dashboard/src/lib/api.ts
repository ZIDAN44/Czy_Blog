export const API_URL = process.env.API_URL ?? 'http://localhost:4000';

const BROWSER_API_BASE = '/api-proxy';

export type Role = 'SUPER_ADMIN' | 'EDITOR' | 'AUTHOR' | 'CONTRIBUTOR';
export type PostStatus = 'DRAFT' | 'PENDING_REVIEW' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

// User profile cache for rendering only; the token lives in an httpOnly cookie.
export function setSession(user: SessionUser) {
  localStorage.setItem('czyblog_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('czyblog_user');
}

export function currentUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('czyblog_user');
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  // Auth rides on the httpOnly cookie; the proxy adds the Bearer header.
  if (opts.body && !(opts.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${BROWSER_API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    let detail: { error?: string } | undefined;
    try {
      detail = (await res.json()) as { error?: string };
    } catch {
      /* */
    }
    throw new Error(detail?.error ?? `Request failed: ${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Whether the install has no users yet (so /signup is open). Stated once for the
// landing/login/signup pages; throws if the API is unreachable, callers decide what that means.
export async function needsBootstrap(): Promise<boolean> {
  const r = await api<{ needsBootstrap: boolean }>('/api/v1/auth/bootstrap-status');
  return r.needsBootstrap;
}

// Credential actions hit /api/auth/*, which manage the httpOnly session cookie.
async function authAction(path: string, body: unknown): Promise<SessionUser> {
  const res = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail: { error?: string } | undefined;
    try {
      detail = (await res.json()) as { error?: string };
    } catch {
      /* */
    }
    throw new Error(detail?.error ?? `Request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()).user as SessionUser;
}

export function login(email: string, password: string): Promise<SessionUser> {
  return authAction('login', { email, password });
}

export function bootstrapAccount(input: {
  email: string;
  name: string;
  password: string;
}): Promise<SessionUser> {
  return authAction('bootstrap', input);
}

export function changePassword(currentPassword: string, newPassword: string): Promise<SessionUser> {
  return authAction('change-password', { currentPassword, newPassword });
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}
