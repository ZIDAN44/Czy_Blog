// Runtime API proxy.
//
// Browser code calls `/api-proxy/...` (same origin). This handler forwards the
// request to the real API at `process.env.API_URL`, read at REQUEST time.
//  Server components can keep calling the API directly.

export const dynamic = 'force-dynamic';

const API_URL = () => process.env.API_URL ?? 'http://localhost:4000';

// Connection-scoped headers describe the hop we just terminated, not the one we
// are about to open, so they must not be copied onto the upstream request.
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

// The API buckets rate limits on the client IP it derives from these. If a
// browser's own values were passed through, any client could rotate them and
// hand itself unlimited buckets — this proxy is the only thing entitled to
// state where the request came from.
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
  // Segments arrive decoded, so `..` here would climb the upstream path once
  // fetch normalises the URL. Re-encode each one and refuse traversal outright.
  if (!path.every(isSafeSegment)) {
    return Response.json({ error: 'Invalid path' }, { status: 400 });
  }

  const url = new URL(req.url);
  const target = `${API_URL()}/${path.map(encodeURIComponent).join('/')}${url.search}`;

  const headers = new Headers(req.headers);
  for (const h of [...HOP_BY_HOP, ...CLIENT_SPOOFABLE]) headers.delete(h);

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
