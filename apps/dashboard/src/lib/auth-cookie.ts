import 'server-only';
import { jwtVerify } from 'jose';

// httpOnly session cookie; set by /api/auth/*, read by the proxy and middleware.
export const TOKEN_COOKIE = 'czyblog_token';

const TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

// Mirror the API's JWT settings so we verify the tokens it issues (server-only).
const secret = process.env.JWT_SECRET ?? 'dev-jwt-secret-change-me';
const issuer = process.env.JWT_ISSUER ?? 'czy-blog';
const audience = process.env.JWT_AUDIENCE ?? 'czy-blog-api';
const key = new TextEncoder().encode(secret);

type CookieOptions = {
  name: string;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
};

// Secure only in prod (dev is plain http localhost); Lax suffices same-origin.
export function sessionCookie(token: string): CookieOptions {
  return {
    name: TOKEN_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_MAX_AGE,
  };
}

export function clearedCookie(): CookieOptions {
  return { ...sessionCookie(''), maxAge: 0 };
}

// Coarse gate: signature/iss/aud/expiry only — the API still checks tokenVersion.
export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, key, { issuer, audience, algorithms: ['HS256'] });
    return true;
  } catch {
    return false;
  }
}
