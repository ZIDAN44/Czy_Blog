# Using the Content API

Pull published posts into another site. Endpoints: [API reference](api.md#content-api-headless--apiv1content).

## What you get

Two read-only endpoints under `/api/v1/content`, authenticated with an API key.
Published, non-deleted posts only. The shape is flat, meant for listings:

```json
{
  "data": [
    {
      "title": "Post title",
      "link": "https://blog.example.com/posts/post-title",
      "published_date": "2026-03-04T10:00:00.000Z",
      "author": "Name",
      "description": "The excerpt.",
      "cover_image": "https://cdn.example.com/abc.webp"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 42, "pages": 5 }
}
```

No post body in that response. `link` is built from
[`PUBLIC_SITE_URL`](environment.md#public_site_url).

| You want                           | Use                            |
| ---------------------------------- | ------------------------------ |
| A teaser list linking back         | `/api/v1/content/posts` (key)  |
| The full article body to re-render | `/api/v1/posts/:slug` (public) |
| A feed for a reader                | `/rss.xml` (public)            |

`/api/v1/posts/:slug` returns `content` as a Tiptap document
(`{ "type": "doc", "content": [...] }`) you walk yourself.

## 1. Create a key

Dashboard → **API keys** → name it, create, copy. Or over HTTP:

```bash
curl -X POST http://localhost:4000/api/v1/users/me/api-keys \
  -H "Authorization: Bearer <jwt>" \
  -H 'Content-Type: application/json' \
  -d '{"name":"czy.dev production"}'
```

- Needs the [Author role](architecture.md#roles-rbac) or higher.
- `key` is returned once; only a SHA-256 hash is stored. Lost key → create a new one.
- `prefix` (first 12 chars) is all the dashboard shows later.
- 20 active keys per user; the 21st returns `409`.

Keys are not scoped — any valid key reads the same content. One key per consumer lets
you revoke one without breaking the others.

## 2. Call it

Send the key in the `x-api-key` header (not the query string).

```bash
curl -H "x-api-key: czk_xxx" \
  "https://api.example.com/api/v1/content/posts?page=1&limit=20"
```

```js
// Server-side only.
const res = await fetch(`${process.env.CZY_API_URL}/api/v1/content/posts?limit=20`, {
  headers: { 'x-api-key': process.env.CZY_API_KEY },
});
if (!res.ok) throw new Error(`content api ${res.status}`);
const { data, pagination } = await res.json();
```

`page` 1–10000; `limit` caps at 50, defaults to 10. Newest first. Use
`pagination.pages` to page — don't loop until an empty array.

## 3. Keep the key server-side

The key is a bearer credential — treat it like a password.

- Fetch server-side (route, build step, cron) and pass results to the browser. Never
  fetch from client JS.
- In Next.js use `CZY_API_KEY`, not `NEXT_PUBLIC_*` (that inlines into the bundle).
- Read it from the environment or a secret manager; keep it out of the repo.
- Don't log the key or full headers.

## 4. Cache, expect rate limits

300 requests/minute per IP across the whole API, shared per address. Over it → `429`.

- Cache responses (`fetch(..., { next: { revalidate: 300 } })` in Next.js).
- Prefer build-time or scheduled fetches over per-visitor requests.
- Behind a proxy, set [`TRUST_PROXY`](environment.md#trust_proxy) or every client
  shares one bucket.
- Back off on `429`/`5xx`; serve the last good response if you have one.

## 5. Rotate and revoke

Nothing expires on its own. Rotate on a schedule, and immediately if a key leaks.
Because several keys can be active, rotation needs no downtime:

1. Create the new key.
2. Deploy it.
3. Confirm its `lastUsedAt` is moving.
4. Revoke the old one: `DELETE /api/v1/users/me/api-keys/:id`.

Revocation takes effect on the next request. `lastUsedAt` is written at most once a
minute per key. Deleting a user deletes their keys; a password change does not.

## Errors

| Status | Body                             | Cause                                              |
| ------ | -------------------------------- | -------------------------------------------------- |
| `401`  | `Missing or malformed x-api-key` | Header absent, empty, or over 128 characters.      |
| `401`  | `Invalid API key`                | Unknown or revoked key.                            |
| `400`  | `ValidationError` + `issues`     | Bad `page`/`limit`, or a slug outside `[a-z0-9-]`. |
| `404`  | `Not found`                      | No published post with that slug.                  |
| `429`  | Rate-limit body                  | Over 300 req/min from your IP.                     |
| `5xx`  | `Internal Server Error`          | Detail is in the server log, never in the body.    |

Both `401`s mean: fix the credential. Don't retry them.
