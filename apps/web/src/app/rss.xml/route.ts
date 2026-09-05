import { API_URL } from '@/lib/api';

// Serve the API's feed same-origin so the reader needs no public API address.
export const dynamic = 'force-dynamic';

export async function GET() {
  const upstream = await fetch(`${API_URL}/rss.xml`, { cache: 'no-store' });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/xml; charset=utf-8',
      'cache-control': upstream.headers.get('cache-control') ?? 'public, max-age=300',
    },
  });
}
