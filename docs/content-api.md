# Using the Content API

How to pull published posts into another site. Endpoint list is in the
[API reference](api.md#content-api-headless--apiv1content); this page covers
getting a key, calling from your own app, and what to do when a key leaks.

## What you get

Two read-only endpoints under `/api/v1/content`, authenticated with an API key.
They return published, non-deleted posts only — drafts, scheduled and archived
posts are never visible, whichever key you use.

The shape is flat and meant for listings:

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

There is no post body in that response. `link` is built from
[`PUBLIC_SITE_URL`](environment.md#public_site_url) and points at the post on
your blog. If you want to render the article on your own site instead of linking
out, read `GET /api/v1/posts/:slug` — it is public, needs no key, and returns
`content` as a Tiptap document (`{ "type": "doc", "content": [...] }`) that you
have to walk yourself.

| You want                           | Use                            |
| ---------------------------------- | ------------------------------ |
| A teaser list linking back         | `/api/v1/content/posts` (key)  |
| The full article body to re-render | `/api/v1/posts/:slug` (public) |
| A feed for a reader                | `/rss.xml` (public)            |

## 1. Create a key

Dashboard → **API keys** → name it after the consumer (`czy.dev production`),
create, copy. Or over HTTP with a logged-in token:

```bash
curl -X POST http://localhost:4000/api/v1/users/me/api-keys \
  -H "Authorization: Bearer <jwt>" \
  -H 'Content-Type: application/json' \
  -d '{"name":"czy.dev production"}'
```

```json
{ "id": "clx…", "name": "czy.dev production", "prefix": "czk_AbCd", "key": "czk_…" }
```

- Needs the [Author role](architecture.md#roles-rbac) or higher. Contributors
  can list and revoke keys but not create them.
- `key` is returned once. Only a SHA-256 hash is stored, so a lost key cannot be
  recovered — create a new one and revoke the old.
- `prefix` is the first 12 characters. It is all the dashboard can show you
  later, so it is what you use to tell keys apart.
- 20 active keys per user. The 21st create returns `409`.

Keys are not scoped: any valid, unrevoked key reads the same published content.
The reason to issue one key per consumer is that you can revoke one without
breaking the others, and `lastUsedAt` tells you whether a key is still in use.

## 2. Call it

Send the key in the `x-api-key` header. Query-string keys are not accepted —
URLs end up in browser history, proxy logs and `Referer` headers.

```bash
curl -H "x-api-key: czk_xxx" \
  "https://api.example.com/api/v1/content/posts?page=1&limit=20"
```

```js
// Server-side only — a route handler, a build step, a cron job.
const res = await fetch(`${process.env.CZY_API_URL}/api/v1/content/posts?limit=20`, {
  headers: { 'x-api-key': process.env.CZY_API_KEY },
});
if (!res.ok) throw new Error(`content api ${res.status}`);
const { data, pagination } = await res.json();
```

`page` starts at 1 and caps at 10000; `limit` caps at 50 and defaults to 10.
Posts come back newest first. Read `pagination.pages` to decide whether to ask
for another page — don't loop until you get an empty array.

## 3. Keep the key on your server

The key is a bearer credential: whoever holds it can read with it. Treat it like
a password.

- Fetch in a server component, API route, build step or cron job, and pass the
  result to the browser. Never `fetch` the content API from client-side
  JavaScript — the key ships to every visitor with the bundle.
- In Next.js that means `CZY_API_KEY`, not `NEXT_PUBLIC_CZY_API_KEY`. Anything
  prefixed `NEXT_PUBLIC_` is inlined into the client bundle.
- Read it from the environment or a secret manager. Keep it out of the repo,
  including committed `.env` files and CI config files.
- Don't log the key or the whole request headers object. The API redacts
  `x-api-key` from its own logs; your side has to do the same.

## 4. Cache, and expect rate limits

The limit is 300 requests/minute per IP across the whole API, shared with every
other caller behind the same address. Over it you get `429`.

- Cache responses. Posts change rarely; a few minutes of TTL removes almost all
  the traffic. In Next.js, `fetch(..., { next: { revalidate: 300 } })`.
- Prefer fetching at build time or on a schedule over per-visitor requests, or
  one popular page on your site becomes a burst on the API.
- Behind a reverse proxy the API must have
  [`TRUST_PROXY`](environment.md#trust_proxy) set, otherwise every client counts
  against one bucket.
- Back off on `429` and `5xx` rather than retrying immediately, and serve the
  last good response if you have one.

## 5. Rotate and revoke

Nothing expires on its own. Rotate on a schedule you pick (every few months is
usual), and immediately if a key was pasted somewhere it shouldn't be.

Because several keys can be active at once, rotation needs no downtime:

1. Create the new key.
2. Deploy it to the consumer.
3. Confirm the new key's `lastUsedAt` is moving in the dashboard.
4. Revoke the old one: `DELETE /api/v1/users/me/api-keys/:id`.

Revocation takes effect on the next request — keys are checked against the
database every time, not cached. `lastUsedAt` is only written at most once a
minute per key, so a key used constantly still shows a timestamp up to a minute
old; that is a write-reduction measure, not a delay in authentication.

Deleting a user deletes their keys. Changing a password does not — that only
invalidates JWTs.

## Errors

| Status | Body                             | Cause                                              |
| ------ | -------------------------------- | -------------------------------------------------- |
| `401`  | `Missing or malformed x-api-key` | Header absent, empty, or over 128 characters.      |
| `401`  | `Invalid API key`                | Unknown or revoked key.                            |
| `400`  | `ValidationError` + `issues`     | Bad `page`/`limit`, or a slug outside `[a-z0-9-]`. |
| `404`  | `Not found`                      | No published post with that slug.                  |
| `429`  | Rate-limit body                  | Over 300 req/min from your IP.                     |
| `5xx`  | `Internal Server Error`          | Detail is in the server log, never in the body.    |

Both `401`s mean the same thing operationally: fix the credential. Don't retry
them — a loop on a revoked key just burns the rate limit.
