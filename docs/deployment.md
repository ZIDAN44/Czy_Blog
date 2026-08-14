# Production Deployment (Docker Compose)

Three containers — Postgres, API, dashboard — from pre-built GHCR images.
Migrations run automatically on API startup, so there is no separate migration step.

| Container           | Image                                      | Host port |
| ------------------- | ------------------------------------------ | --------- |
| `czyblog-postgres`  | `postgres:18-alpine`                       | 5432      |
| `czyblog-api`       | `ghcr.io/zidan44/czyblog-api:latest`       | 4000      |
| `czyblog-dashboard` | `ghcr.io/zidan44/czyblog-dashboard:latest` | 3000      |

Named volumes: `czyblog_pgdata` (database), `czyblog_uploads` (media).

## Prerequisites

- Docker Engine 24+ with Compose (`docker compose version`).
- Ports 3000 (and optionally 4000, 5432) free.

## 1. Get the files

```bash
mkdir czy-blog && cd czy-blog
curl -sSL -o compose.yml https://raw.githubusercontent.com/ZIDAN44/Czy_Blog/main/docker-compose.yml
curl -sSL -o .env https://raw.githubusercontent.com/ZIDAN44/Czy_Blog/main/.env.example
```

## 2. Edit `.env`

Set real secrets (full list: [environment](environment.md)).

```dotenv
POSTGRES_USER=czyblog
POSTGRES_PASSWORD=CHANGE-ME
POSTGRES_DB=czyblog
POSTGRES_PORT=5432

JWT_SECRET=CHANGE-ME-32+chars
API_PORT=4000
CORS_ORIGINS=https://blog.example.com
TRUST_PROXY=false
PUBLIC_SITE_URL=https://blog.example.com
PUBLIC_UPLOAD_BASE_URL=https://blog.example.com/uploads
MEDIA_CLEANUP_INTERVAL_HOURS=24

DASHBOARD_PORT=3000
```

Notes: `JWT_SECRET` must be ≥32 chars and not the example (else the API won't
boot). `CORS_ORIGINS` must list real origins — `*` fails to boot in production.
Set `TRUST_PROXY` once a reverse proxy is in front (see [step 5](#5-access)).

Leave `DATABASE_URL` and `API_URL` at their shipped localhost values: Compose
overrides both with the internal service hosts (`postgres`, `api`), so the same
`.env` also works when you run the apps directly on a machine. To use an
external database instead, set `DATABASE_URL` here **and** delete the
`DATABASE_URL` line from the `api` service's `environment:` block in
`docker-compose.yml`, which otherwise takes precedence.

## 3. Start

```bash
docker compose up -d
```

The API runs `prisma migrate deploy` on first boot
([entrypoint](../apps/api/docker-entrypoint.sh)). Postgres health gates the API; the
API gates the dashboard. Check: `docker compose ps`, `docker compose logs -f api`.

## 4. Create the first admin

No public sign-up — bootstrap the first super admin via the dashboard's first-run
screen, or:

```bash
curl -X POST http://localhost:3000/api-proxy/api/v1/auth/bootstrap \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"a-strong-password","name":"You"}'
```

Afterwards, add users from the dashboard (Users).

## 5. Access

- Dashboard + reader: `http://<host>:3000`
- API (optional): `http://<host>:4000`
- RSS: `http://<host>:4000/rss.xml`

For a real domain, put a reverse proxy with TLS in front of port 3000. The API
usually need not be public — expose 4000 only for headless
[content API](api.md#content-api-headless--apiv1content) clients.

If the API is reached through that proxy, set
[`TRUST_PROXY`](environment.md#trust_proxy) to the proxy's address or CIDR;
otherwise rate limiting counts every request as coming from the proxy. Leave it
`false` while the API is only reachable inside the Compose network.

## Operations

| Task               | Command                                             |
| ------------------ | --------------------------------------------------- |
| Logs               | `docker compose logs -f [api\|dashboard\|postgres]` |
| Restart            | `docker compose restart api`                        |
| Update images      | `docker compose pull && docker compose up -d`       |
| Stop (keep data)   | `docker compose down`                               |
| Stop and wipe data | `docker compose down -v`                            |

Backups:

```bash
docker compose exec -T postgres pg_dump -U czyblog czyblog > backup-$(date +%F).sql
docker run --rm -v czyblog_uploads:/data -v "$PWD":/out alpine \
  tar czf /out/uploads-$(date +%F).tar.gz -C /data .
```

Upgrades: migrations are idempotent, so `docker compose pull && docker compose up -d`.

## Troubleshooting

| Symptom                             | Fix                                                                  |
| ----------------------------------- | -------------------------------------------------------------------- |
| API exits on a `JWT_SECRET` error   | Set it, ≥32 chars, not the example value.                            |
| API exits on a `CORS_ORIGINS` error | Replace `*` with the real origins.                                   |
| "Missing env: DATABASE_URL"         | Set `DATABASE_URL` in `.env`.                                        |
| Everyone rate limited at once       | Set `TRUST_PROXY` to your proxy's address.                           |
| Upload rejected with `415`          | Only JPEG, PNG, WebP, GIF, AVIF; the bytes must match the format.    |
| Dashboard loads, API calls fail     | `API_URL` must be `http://api:4000`.                                 |
| CORS errors from a headless client  | Add its origin to `CORS_ORIGINS`.                                    |
| Uploaded images 404                 | `PUBLIC_UPLOAD_BASE_URL` must resolve to where `/uploads` is served. |
