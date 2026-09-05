import 'server-only';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { TOKEN_COOKIE, sessionCookie } from './auth-cookie';

const API_URL = () => process.env.API_URL ?? 'http://localhost:4000';

// Forward a credential request to the API and move its returned token into the cookie.
export async function issueSession(
  endpoint: string,
  body: string,
  { withBearer = false, okStatus = 200 }: { withBearer?: boolean; okStatus?: number } = {},
): Promise<NextResponse> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };

  // change-password authenticates as the current user; pull the token from the cookie.
  if (withBearer) {
    const token = (await cookies()).get(TOKEN_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    headers.authorization = `Bearer ${token}`;
  }

  const upstream = await fetch(`${API_URL()}${endpoint}`, { method: 'POST', headers, body });
  const data = (await upstream.json().catch(() => ({}))) as {
    token?: string;
    user?: unknown;
    error?: string;
  };

  if (!upstream.ok || !data.token) {
    return NextResponse.json(
      { error: data.error ?? 'Request failed' },
      { status: upstream.ok ? 502 : upstream.status },
    );
  }

  const res = NextResponse.json({ user: data.user }, { status: okStatus });
  res.cookies.set(sessionCookie(data.token));
  return res;
}
