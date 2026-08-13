# Environment Variables

Docker Compose reads one `.env` file (see
[`.env.docker.example`](../.env.docker.example)). Local dev: the API reads
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
| `PORT`                         | No        | `4000`                          | Listen port.                                                                             |
| `HOST`                         | No        | `0.0.0.0`                       | Bind address.                                                                            |
| `CORS_ORIGINS`                 | No        | `http://localhost:3000`         | Comma-separated origins; `*` allows all.                                                 |
| `PUBLIC_SITE_URL`              | No        | `http://localhost:3000`         | Base for post links in RSS / content API.                                                |
| `UPLOAD_DIR`                   | No        | `./uploads`                     | Where uploads are stored on disk.                                                        |
| `PUBLIC_UPLOAD_BASE_URL`       | No        | `http://localhost:4000/uploads` | Public base prepended to upload filenames.                                               |
| `MEDIA_CLEANUP_INTERVAL_HOURS` | No        | `24`                            | Orphan-media sweep interval.                                                             |
| `NODE_ENV`                     | No        | —                               | `production` enforces the `JWT_SECRET` checks (set in the image).                        |

Generate a secret: `openssl rand -base64 48`.

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
PUBLIC_SITE_URL=https://blog.example.com
PUBLIC_UPLOAD_BASE_URL=https://blog.example.com/uploads

API_URL=http://api:4000
```
