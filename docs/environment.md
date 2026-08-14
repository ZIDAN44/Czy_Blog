# Environment Variables

Docker Compose reads one `.env` file (see
[`.env.example`](../.env.example)). Local dev: the API reads
`apps/api/.env`; the dashboard reads `API_URL`.

## Postgres (Compose only)

Configure the `postgres` service. The apps connect via `DATABASE_URL`, not these.

| Variable            | Default   | Purpose                            |
| ------------------- | --------- | ---------------------------------- |
| `POSTGRES_USER`     | `czyblog` | DB user.                           |
| `POSTGRES_PASSWORD` | `czyblog` | DB password. Change in production. |
| `POSTGRES_DB`       | `czyblog` | DB name.                           |
| `POSTGRES_PORT`     | `5432`    | Host port.                         |

## API — `apps/api`

Read in [config.ts](../apps/api/src/config.ts).

| Variable                       | Required  | Default                         | Purpose                                                                                  |
| ------------------------------ | --------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| `DATABASE_URL`                 | Yes       | —                               | Postgres connection string.                                                              |
| `JWT_SECRET`                   | Prod only | dev fallback                    | Signs JWTs. In production must be set, ≥32 chars, not the dev default — else boot fails. |
| `JWT_ISSUER`                   | No        | `czy-blog`                      | `iss` claim; rejected on verify if it differs.                                           |
| `JWT_AUDIENCE`                 | No        | `czy-blog-api`                  | `aud` claim; rejected on verify if it differs.                                           |
| `BCRYPT_ROUNDS`                | No        | `12`                            | Password hash work factor.                                                               |
| `PORT`                         | No        | `4000`                          | Listen port.                                                                             |
| `HOST`                         | No        | `0.0.0.0`                       | Bind address.                                                                            |
| `CORS_ORIGINS`                 | No        | `http://localhost:3000`         | Comma-separated origins. `*` is refused in production — boot fails.                      |
| `TRUST_PROXY`                  | No        | `false`                         | See below. `false` \| `true` \| hop count \| ip/cidr list.                               |
| `PUBLIC_SITE_URL`              | No        | `http://localhost:3000`         | Base for post links in RSS / content API.                                                |
| `UPLOAD_DIR`                   | No        | `./uploads`                     | Where uploads are stored on disk.                                                        |
| `PUBLIC_UPLOAD_BASE_URL`       | No        | `http://localhost:4000/uploads` | Public base prepended to upload filenames.                                               |
| `MAX_UPLOAD_BYTES`             | No        | `10485760`                      | Per-file upload limit (10 MB).                                                           |
| `MEDIA_CLEANUP_INTERVAL_HOURS` | No        | `24`                            | Orphan-media sweep interval.                                                             |
| `NODE_ENV`                     | No        | —                               | `production` enforces the `JWT_SECRET` and `CORS_ORIGINS` checks (set in the image).     |

Generate a secret: `openssl rand -base64 48`.

### `TRUST_PROXY`

Decides where the API reads the client IP from, which is what rate limiting
buckets on. Leave it `false` unless a proxy you control sits in front — with it
on, a directly reachable API lets any client send its own `X-Forwarded-For` and
get a fresh rate-limit bucket per request. Behind a reverse proxy, set it to the
proxy's address or CIDR (`TRUST_PROXY=10.0.0.0/8`) rather than `true`.

## Dashboard — `apps/dashboard`

| Variable         | Default                 | Purpose                                                                        |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------ |
| `API_URL`        | `http://localhost:4000` | Where the proxy forwards. Read at request time. In Compose: `http://api:4000`. |
| `DASHBOARD_PORT` | `3000`                  | Host port (Compose).                                                           |

Browser→dashboard calls are same-origin (`/api-proxy/...`); dashboard→API uses
`API_URL` over the internal network. The API needs a published port only if
headless clients reach it directly.

## Minimal production `.env`

```dotenv
POSTGRES_USER=czyblog
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=czyblog

DATABASE_URL=postgresql://czyblog:<strong-password>@postgres:5432/czyblog?schema=public
JWT_SECRET=<openssl rand -base64 48>
CORS_ORIGINS=https://blog.example.com
TRUST_PROXY=<proxy ip/cidr, if any>
PUBLIC_SITE_URL=https://blog.example.com
PUBLIC_UPLOAD_BASE_URL=https://blog.example.com/uploads

API_URL=http://api:4000
```
