import { cookies } from 'next/headers';
import { TOKEN_COOKIE } from '@/lib/auth-cookie';

// Runtime API proxy: browser code calls same-origin `/api-proxy/...` and this
// forwards to process.env.API_URL, read at request time. (Server components call the API directly.)
export const dynamic = 'force-dynamic';

const API_URL = () => process.env.API_URL ?? 'http://localhost:4000';

// Connection-scoped headers describe the hop we just terminated, so don't copy them upstream.
const HOP_BY_HOP = [
  'host',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'content-length',
];

// The API derives the rate-limit client IP from these; strip the browser's own
// values so a client can't rotate them into unlimited buckets. Only this proxy sets them.
const CLIENT_SPOOFABLE = [
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-forwarded-port',
  'x-real-ip',
  'forwarded',
];

function isSafeSegment(segment: string): boolean {
  return segment !== '' && segment !== '.' && segment !== '..' && !segment.includes('\\');
}

async function forward(req: Request, path: string[]): Promise<Response> {
  // Segments arrive decoded, so a `..` would climb the upstream path; reject traversal, re-encode the rest.
  if (!path.every(isSafeSegment)) {
    return Response.json({ error: 'Invalid path' }, { status: 400 });
  }

  const url = new URL(req.url);
  const target = `${API_URL()}/${path.map(encodeURIComponent).join('/')}${url.search}`;

  const headers = new Headers(req.headers);
  for (const h of [...HOP_BY_HOP, ...CLIENT_SPOOFABLE]) headers.delete(h);

  // Translate the httpOnly cookie into the Bearer the API wants; drop client auth.
  headers.delete('authorization');
  headers.delete('cookie');
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (token) headers.set('authorization', `Bearer ${token}`);

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: 'manual',
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  const upstream = await fetch(target, init);
  const resHeaders = new Headers(upstream.headers);
  resHeaders.delete('content-encoding');
  resHeaders.delete('transfer-encoding');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

const handler = async (req: Request, ctx: Ctx) => {
  const { path } = await ctx.params;
  return forward(req, path);
};

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as HEAD,
  handler as OPTIONS,
};
