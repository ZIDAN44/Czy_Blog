# Environment Variables

One env file: `.env` at the repo root (copy [`.env.example`](../.env.example)). The
apps have none of their own.

Read by:

| Consumer       | How                                                                        |
| -------------- | -------------------------------------------------------------------------- |
| Docker Compose | `env_file: .env` on the `api`, `web`, and `dashboard` services.            |
| API            | [`apps/api/src/env.ts`](../apps/api/src/env.ts) loads it by absolute path. |
| Prisma CLI     | [`apps/api/prisma.config.ts`](../apps/api/prisma.config.ts).               |
| Web            | [`apps/web/next.config.mjs`](../apps/web/next.config.mjs).                 |
| Dashboard      | [`apps/dashboard/next.config.mjs`](../apps/dashboard/next.config.mjs).     |

Loaded by absolute path, so it works from the repo root and inside `apps/*`. A variable
already in the real environment wins — dotenv never overwrites — so Compose's
`environment:` and image `ENV` defaults still take effect. The only two settings that
differ on the Docker network (the database host and `API_URL`) are overridden per
service in `docker-compose.yml`.

## Postgres (Compose only)

The apps connect via `DATABASE_URL`, not these.

| Variable            | Default   | Purpose                            |
| ------------------- | --------- | ---------------------------------- |
| `POSTGRES_USER`     | `czyblog` | DB user.                           |
| `POSTGRES_PASSWORD` | `czyblog` | DB password. Change in production. |
| `POSTGRES_DB`       | `czyblog` | DB name.                           |
| `POSTGRES_PORT`     | `5432`    | Host port.                         |

## API — `apps/api`

Read in [config.ts](../apps/api/src/config.ts).

| Variable                       | Required  | Default                             | Purpose                                                       |
| ------------------------------ | --------- | ----------------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`                 | Yes       | —                                   | Postgres connection string. Compose overrides the host.       |
| `JWT_SECRET`                   | Prod only | dev fallback                        | Signs JWTs. In production must be set, ≥32 chars.             |
| `JWT_ISSUER`                   | No        | `czy-blog`                          | `iss` claim; rejected on verify if it differs.                |
| `JWT_AUDIENCE`                 | No        | `czy-blog-api`                      | `aud` claim; rejected on verify if it differs.                |
| `BCRYPT_ROUNDS`                | No        | `12`                                | Password hash work factor.                                    |
| `API_PORT`                     | No        | `4000`                              | Listen port, and the host port Compose publishes.             |
| `API_HOST`                     | No        | `0.0.0.0`                           | Bind address. Falls back to `HOST`.                           |
| `CORS_ORIGINS`                 | No        | `http://localhost:3000`             | Comma-separated origins. `*` is refused in production.        |
| `TRUST_PROXY`                  | No        | `false`                             | Client-IP source. `false` \| `true` \| hop count \| cidr.     |
| `PUBLIC_SITE_URL`              | No        | `http://localhost:3000`             | Reader origin: post links in RSS / content API.               |
| `S3_BUCKET`                    | Yes       | —                                   | Bucket uploads are stored in.                                 |
| `S3_REGION`                    | No        | `us-east-1`                         | Bucket region.                                                |
| `S3_ACCESS_KEY_ID`             | No        | —                                   | Access key.                                                   |
| `S3_SECRET_ACCESS_KEY`         | No        | —                                   | Secret key.                                                   |
| `S3_ENDPOINT`                  | No        | —                                   | Endpoint of an S3-compatible server.                          |
| `S3_FORCE_PATH_STYLE`          | No        | on when `S3_ENDPOINT` set           | Path-style addressing.                                        |
| `MEDIA_PUBLIC_BASE_URL`        | No        | `http://localhost:<API_PORT>/media` | Browser-facing base for image URLs.                           |
| `MAX_UPLOAD_BYTES`             | No        | `10485760`                          | Per-file upload limit (10 MB).                                |
| `MEDIA_CLEANUP_INTERVAL_HOURS` | No        | `24`                                | Orphan-media sweep interval.                                  |
| `NODE_ENV`                     | No        | —                                   | `production` enforces the `JWT_SECRET`/`CORS_ORIGINS` checks. |

Generate a secret: `openssl rand -base64 48`.

`API_PORT`/`API_HOST` carry the prefix so a bare `PORT`/`HOST` in the shared file isn't
also picked up by the Next.js apps. The unprefixed pair is still read as a fallback.

**`TRUST_PROXY`** decides where the API reads the client IP (which rate limiting buckets
on). Leave it `false` unless a proxy you control sits in front; then set it to the
proxy's address or CIDR (`TRUST_PROXY=10.0.0.0/8`) rather than `true`.

## Web + Dashboard

| Variable         | Default                 | Purpose                                    |
| ---------------- | ----------------------- | ------------------------------------------ |
| `API_URL`        | `http://localhost:4000` | Where both apps reach the API server-side. |
| `WEB_PORT`       | `3000`                  | Host port for the public reader.           |
| `DASHBOARD_PORT` | `3001`                  | Host port for the admin console.           |

## Minimal production `.env`

```dotenv
POSTGRES_USER=czyblog
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=czyblog

JWT_SECRET=<openssl rand -base64 48>
CORS_ORIGINS=https://blog.example.com,https://admin.example.com
TRUST_PROXY=<proxy ip/cidr, if any>
PUBLIC_SITE_URL=https://blog.example.com

S3_BUCKET=czyblog-media
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=<access-key>
S3_SECRET_ACCESS_KEY=<secret-key>
MEDIA_PUBLIC_BASE_URL=https://blog.example.com/media
```

`DATABASE_URL` and `API_URL` are omitted on purpose — under Compose they come from
`docker-compose.yml`. Set `DATABASE_URL` here only for an external database, and remove
the override from the `api` service when you do.
