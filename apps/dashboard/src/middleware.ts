import { NextResponse, type NextRequest } from 'next/server';
import { TOKEN_COOKIE, verifyToken } from '@/lib/auth-cookie';

// Server-side gate for the admin console, before any admin page code renders.
export async function middleware(req: NextRequest) {
  const authed = await verifyToken(req.cookies.get(TOKEN_COOKIE)?.value);
  const { pathname } = req.nextUrl;

  // Unauthenticated → keep out of the console.
  if (pathname.startsWith('/dashboard') && !authed) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Already signed in → skip the auth screens.
  if ((pathname === '/login' || pathname === '/signup') && authed) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
