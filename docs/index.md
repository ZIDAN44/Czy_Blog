---
layout: home

hero:
  name: Czy Blog
  text: Self-hosted blog platform
  tagline: A self-hosted blog writer where you write and publish them so other people can read them
  actions:
    - theme: brand
      text: Introduction
      link: /introduction
    - theme: alt
      text: Deploy it
      link: /deployment
    - theme: alt
      text: Develop locally
      link: /development

features:
  - icon: 🧭
    title: Architecture
    details: Diagrams, request flow, data model, auth, hardening, and background jobs.
    link: /architecture
  - icon: 🔌
    title: API reference
    details: Every endpoint, with its auth requirement and role gate.
    link: /api
  - icon: 📰
    title: Content API
    details: Pull published posts into another site with an API key.
    link: /content-api
  - icon: ⚙️
    title: Environment variables
    details: Every variable the stack reads, and its default.
    link: /environment
---

## The stack

Two apps in one repo, both behind a single `.env`. The browser only ever talks to the
dashboard, which proxies authenticated calls to the API — so the API need not be public.

| App              | Stack                       | Port | Purpose                           |
| ---------------- | --------------------------- | ---- | --------------------------------- |
| `apps/api`       | Fastify + Prisma + Postgres | 4000 | REST API, auth, media, scheduling |
| `apps/dashboard` | Next.js + React + Tiptap    | 3000 | Admin dashboard and public reader |

## Quick start

```bash
mkdir czy-blog && cd czy-blog
curl -sSL -o compose.yml https://raw.githubusercontent.com/ZIDAN44/Czy_Blog/main/docker-compose.yml
curl -sSL -o .env https://raw.githubusercontent.com/ZIDAN44/Czy_Blog/main/.env.example
docker compose up -d
```

Dashboard on `http://localhost:3000`, API on `http://localhost:4000`. The full walkthrough,
including the bits you must change before exposing it, is in
[production deployment](./deployment.md).
