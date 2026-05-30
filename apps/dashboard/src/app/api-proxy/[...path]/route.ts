// Runtime API proxy.
//
// Browser code calls `/api-proxy/...` (same origin). This handler forwards the
// request to the real API at `process.env.API_URL`, read at REQUEST time.
//  Server components can keep calling the API directly.

export const dynamic = 'force-dynamic';

const API_URL = () => process.env.API_URL ?? 'http://localhost:4000';

async function forward(req: Request, path: string[]): Promise<Response> {
  const url = new URL(req.url);
  const target = `${API_URL()}/${path.join('/')}${url.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('connection');

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
