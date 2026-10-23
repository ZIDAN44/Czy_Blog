# API Reference

Base URL `http://<host>:4000`. JSON endpoints are under `/api/v1`. From the browser
they go through the dashboard proxy at `/api-proxy/api/v1/...`.

**Auth** column: `Public` (none), `JWT` (`Authorization: Bearer <token>`),
`API key` (`x-api-key: <czk_…>`). The role column is the minimum
[role](architecture.md#roles-rbac).

Conventions:

- Lists return `{ data: [...], pagination: { page, limit, total, pages } }`; single
  objects return `{ data: {...} }`.
- Validation errors → `400 { error: "ValidationError", issues }`; other errors →
  `{ error: "message" }`. `5xx` bodies are always `Internal Server Error`.
- `page` ≤ 10000. Ids must be cuids and slugs `[a-z0-9-]`, else `400`.
- Rate limit: 300 req/min per IP; credential endpoints (`/auth/login`,
  `/auth/bootstrap`, `/auth/change-password`) 10/min; `/media/upload` 30/min. Set
  [`TRUST_PROXY`](environment.md#trust_proxy) behind a proxy, or every client shares one
  bucket.

## Health

| Method | Path      | Auth   | Purpose         |
| ------ | --------- | ------ | --------------- |
| GET    | `/health` | Public | Liveness probe. |

## Auth — `/api/v1/auth`

| Method | Path                     | Auth   | Purpose                                                    |
| ------ | ------------------------ | ------ | ---------------------------------------------------------- |
| GET    | `/auth/bootstrap-status` | Public | `{ needsBootstrap }` — true when no users exist.           |
| POST   | `/auth/bootstrap`        | Public | First run only: create initial super admin. `409` if done. |
| POST   | `/auth/login`            | Public | Email + password → JWT + user.                             |
| GET    | `/auth/me`               | JWT    | Current user profile.                                      |
| POST   | `/auth/change-password`  | JWT    | `currentPassword`, `newPassword` (must differ).            |

Login, bootstrap and change-password return `{ token, user: { id, email, name, role } }`.
A password change invalidates every earlier token (they get
`401 { error: "Session is no longer valid" }`), so store the new one. Passwords are
8–72 characters.

## Posts — public — `/api/v1/posts`

Only published, non-deleted posts.

| Method | Path           | Auth   | Purpose                                                                  |
| ------ | -------------- | ------ | ------------------------------------------------------------------------ |
| GET    | `/posts`       | Public | List. Query: `page`, `limit` (≤50), `tag`, `category`, `q` (≤100 chars). |
| GET    | `/posts/:slug` | Public | One post by slug; increments view count (without changing `updated_at`). |

## Posts — admin — `/api/v1/admin/posts`

All JWT. Contributors/authors see only their own posts; editors+ see all.

| Method | Path               | Role        | Purpose                                                |
| ------ | ------------------ | ----------- | ------------------------------------------------------ |
| GET    | `/admin/posts`     | Contributor | List. Query: `page`, `limit` (≤100), `status`, `mine`. |
| GET    | `/admin/posts/:id` | Contributor | One post by id.                                        |
| POST   | `/admin/posts`     | Contributor | Create (status coerced to role's max).                 |
| PATCH  | `/admin/posts/:id` | Contributor | Update (title regenerates slug; tags replaced).        |
| DELETE | `/admin/posts/:id` | Contributor | Soft-delete and reclaim media.                         |

Body (all optional on PATCH):

```json
{
  "title": "string (1-200)",
  "excerpt": "string (<=500)",
  "content": { "type": "doc", "content": [] },
  "coverImageUrl": "https://... (http/https only)",
  "categorySlug": "string",
  "tagSlugs": ["string (max 25)"],
  "status": "DRAFT | PENDING_REVIEW | SCHEDULED | PUBLISHED | ARCHIVED",
  "scheduledFor": "ISO-8601 (future, required for SCHEDULED)"
}
```

Rules: `SCHEDULED` needs a future `scheduledFor`; contributor publish/schedule
downgrades to `PENDING_REVIEW`; only editors+ create new categories/tags via slugs.

`content` is validated against the editor's node/mark types (`paragraph`, `heading`,
`bulletList`, `orderedList`, `listItem`, `blockquote`, `codeBlock`, `horizontalRule`,
`hardBreak`, `image`, `text`; marks `bold`, `italic`, `strike`, `code`, `link`); unknown
types are rejected. Limits: 30 levels deep, 10000 nodes, 50000 chars per text node.
`href`/`src` must be relative or `http`/`https`/`mailto` — `javascript:` and `data:` are
rejected. The reader renders links with `rel="noopener noreferrer"` and no `nofollow`:
post content is editorial (written by staff, contributors' posts reviewed), so its links count
for the pages they point to.

## Taxonomy — `/api/v1`

| Method | Path                    | Auth   | Role   | Purpose                          |
| ------ | ----------------------- | ------ | ------ | -------------------------------- |
| GET    | `/categories`           | Public | —      | List categories.                 |
| GET    | `/tags`                 | Public | —      | List tags.                       |
| POST   | `/admin/categories`     | JWT    | Editor | Create (`name`, `description?`). |
| DELETE | `/admin/categories/:id` | JWT    | Editor | Delete; detaches it from posts.  |

Creating a category whose slug exists returns `409`.

## Media — `/api/v1/media`

All JWT.

| Method | Path            | Purpose                                                                  |
| ------ | --------------- | ------------------------------------------------------------------------ |
| POST   | `/media/upload` | Multipart image upload → `{ id, url, mime_type, size_bytes, filename }`. |
| GET    | `/media`        | List caller's uploads. Query: `page`, `limit` (≤100).                    |

Allowed: JPEG, PNG, WebP, GIF, AVIF. The type is read from the file's bytes, not the
`Content-Type` or filename — anything else is `415`. SVG is not accepted. Over
`MAX_UPLOAD_BYTES` is `413`.

Validated bytes go to S3 under a random key. The bucket stays private: `url` points at
the API's `/media/<key>` route (`MEDIA_PUBLIC_BASE_URL`), which streams the object using
the server's credentials. The original filename is kept for display only.

## Users — `/api/v1/users`

All JWT.

| Method | Path              | Role        | Purpose                                  |
| ------ | ----------------- | ----------- | ---------------------------------------- |
| GET    | `/users`          | Editor      | List users.                              |
| POST   | `/users`          | Super admin | Create user with a role.                 |
| PATCH  | `/users/:id/role` | Super admin | Change role (not last super admin).      |
| DELETE | `/users/:id`      | Super admin | Delete; reassigns posts/media to caller. |

API keys — `/api/v1/users/me/api-keys`:

| Method | Path                     | Role        | Purpose                               |
| ------ | ------------------------ | ----------- | ------------------------------------- |
| GET    | `/users/me/api-keys`     | Contributor | List your keys (metadata only).       |
| POST   | `/users/me/api-keys`     | Author      | Create; returns plaintext `key` once. |
| DELETE | `/users/me/api-keys/:id` | Contributor | Revoke.                               |

Max 20 active keys per user; past that, create returns `409`.

## Content API (headless) — `/api/v1/content`

For an external site to read published content. All require `x-api-key`; returns a
flattened shape (`link`, `published_date`, `cover_image`, …).

| Method | Path                   | Purpose                             |
| ------ | ---------------------- | ----------------------------------- |
| GET    | `/content/posts`       | List. Query: `page`, `limit` (≤50). |
| GET    | `/content/posts/:slug` | One post by slug.                   |

```bash
curl -H "x-api-key: czk_xxx" http://localhost:4000/api/v1/content/posts
```

Keys, caching, rotation: [using the Content API](content-api.md).

## Other

| Method | Path          | Auth   | Purpose                                    |
| ------ | ------------- | ------ | ------------------------------------------ |
| GET    | `/rss.xml`    | Public | RSS 2.0, 25 latest published.              |
| GET    | `/media/:key` | Public | Streams an uploaded image from the bucket. |
