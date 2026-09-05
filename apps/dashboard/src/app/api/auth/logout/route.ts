import { NextResponse } from 'next/server';
import { clearedCookie } from '@/lib/auth-cookie';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(clearedCookie());
  return res;
}
