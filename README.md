# Czy Blog

A self-hosted blog writer where you write and publish them so other people can read them

Two apps in one npm workspace:

- `apps/api` — Fastify + Prisma + Postgres, port `4000`
- `apps/dashboard` — Next.js 16 admin + reader, port `3000`

## Quick start

```bash
mkdir czy-blog && cd czy-blog
curl -sSL -o docker-compose.yml https://raw.githubusercontent.com/ZIDAN44/Czy_Blog/main/docker-compose.yml
curl -sSL -o .env https://raw.githubusercontent.com/ZIDAN44/Czy_Blog/main/.env.docker.example
docker compose up -d
```

Dashboard: `http://localhost:3000` API: `http://localhost:4000`
