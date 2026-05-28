# Czy Blog

A self-hosted blog writer where you write and publish them so other people can read them

Two apps in one npm workspace:

- `apps/api` — Fastify + Prisma + Postgres, port `4000`
- `apps/dashboard` — Next.js 16 admin + reader, port `3000`

## Quick start

```bash
npm install
npm run db:up
npm run db:migrate
npm run dev
```

Dashboard: `http://localhost:3000` API: `http://localhost:4000`
