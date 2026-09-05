# Production Deployment (Docker Compose)

Four containers from pre-built GHCR images. Migrations run on API startup — no
separate migration step.

| Container           | Image                                      | Host port |
| ------------------- | ------------------------------------------ | --------- |
| `czyblog-postgres`  | `postgres:18-alpine`                       | 5432      |
| `czyblog-api`       | `ghcr.io/zidan44/czyblog-api:latest`       | 4000      |
| `czyblog-web`       | `ghcr.io/zidan44/czyblog-web:latest`       | 3000      |
| `czyblog-dashboard` | `ghcr.io/zidan44/czyblog-dashboard:latest` | 3001      |

Named volume: `czyblog_pgdata` (database). Media lives in S3, not a volume.

## Prerequisites

- Docker Engine 24+ with Compose.
- Ports 3000 and 3001 (and optionally 4000, 5432) free.

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
CORS_ORIGINS=https://blog.example.com,https://admin.example.com
TRUST_PROXY=false
PUBLIC_SITE_URL=https://blog.example.com

S3_BUCKET=czyblog-media
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=CHANGE-ME
S3_SECRET_ACCESS_KEY=CHANGE-ME
MEDIA_PUBLIC_BASE_URL=https://blog.example.com/media
MEDIA_CLEANUP_INTERVAL_HOURS=24

WEB_PORT=3000
DASHBOARD_PORT=3001
```

- `JWT_SECRET` ≥32 chars and not the example, else the API won't boot.
- `CORS_ORIGINS` must be real origins — `*` fails to boot in production.
- Leave `DATABASE_URL` and `API_URL` at their localhost values; Compose overrides both
  with internal hosts (`postgres`, `api`). For an external database, set `DATABASE_URL`
  here **and** delete the `DATABASE_URL` line from the `api` service in
  `docker-compose.yml`, which otherwise wins.

## 3. Start

```bash
docker compose up -d
```

The API runs `prisma migrate deploy` on first boot. Postgres gates the API; the API
gates the reader and console. Check: `docker compose ps`, `docker compose logs -f api`.

## 4. Create the first admin

No public sign-up. Bootstrap via the console's first-run screen
(`http://<host>:3001/signup`), or its proxy:

```bash
curl -X POST http://localhost:3001/api-proxy/api/v1/auth/bootstrap \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"a-strong-password","name":"You"}'
```

Add further users from the console (Users).

## 5. Access

- Reader: `http://<host>:3000`
- Console: `http://<host>:3001`
- API (optional): `http://<host>:4000`
- RSS: `http://<host>:3000/rss.xml`

For a real domain, put a reverse proxy with TLS in front of both apps. Set
`PUBLIC_SITE_URL` to the reader's URL. Expose 4000 only for headless
[content API](api.md#content-api-headless--apiv1content) clients. Behind the proxy, set
[`TRUST_PROXY`](environment.md#trust_proxy) to the proxy's address/CIDR; leave it
`false` while the API is only reachable inside the Compose network.

## Operations

| Task               | Command                                                  |
| ------------------ | -------------------------------------------------------- |
| Logs               | `docker compose logs -f [api\|web\|dashboard\|postgres]` |
| Restart            | `docker compose restart api`                             |
| Update images      | `docker compose pull && docker compose up -d`            |
| Stop (keep data)   | `docker compose down`                                    |
| Stop and wipe data | `docker compose down -v`                                 |

Database backup (media lives in S3 — back it up with bucket versioning):

```bash
docker compose exec -T postgres pg_dump -U czyblog czyblog > backup-$(date +%F).sql
```

## Troubleshooting

| Symptom                             | Fix                                                           |
| ----------------------------------- | ------------------------------------------------------------- |
| API exits on a `JWT_SECRET` error   | Set it, ≥32 chars, not the example value.                     |
| API exits on a `CORS_ORIGINS` error | Replace `*` with the real origins.                            |
| "Missing env: DATABASE_URL"         | Set `DATABASE_URL` in `.env`.                                 |
| Everyone rate limited at once       | Set `TRUST_PROXY` to your proxy's address.                    |
| Upload rejected with `415`          | Only JPEG, PNG, WebP, GIF, AVIF.                              |
| Dashboard loads, API calls fail     | `API_URL` must be `http://api:4000`.                          |
| Images 404 / don't load             | `MEDIA_PUBLIC_BASE_URL` must be the API's `/media` route.     |
| Upload fails                        | Check `S3_BUCKET`, `S3_ENDPOINT`, and the access credentials. |
