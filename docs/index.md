---
layout: home

hero:
  name: Czy Blog
  text: Self-hosted blog platform
  tagline: Write and publish posts from an admin console; readers read them on a separate public site.
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

Three apps in one repo, behind a single `.env`. The public reader and the admin
console are separate apps on separate origins, so a reader cannot reach an admin
page. Both talk to the API server-side, so the API need not be public.

| App              | Stack                       | Port | Purpose                               |
| ---------------- | --------------------------- | ---- | ------------------------------------- |
| `apps/api`       | Fastify + Prisma + Postgres | 4000 | REST API, auth, media, scheduling     |
| `apps/web`       | Next.js + React             | 3000 | Public reader site (blog + RSS)       |
| `apps/dashboard` | Next.js + React + Tiptap    | 3001 | Admin console (write, publish, users) |

## Quick start

```bash
mkdir czy-blog && cd czy-blog
curl -sSL -o compose.yml https://raw.githubusercontent.com/ZIDAN44/Czy_Blog/main/docker-compose.yml
curl -sSL -o .env https://raw.githubusercontent.com/ZIDAN44/Czy_Blog/main/.env.example
docker compose up -d
```

Blog on `http://localhost:3000`, admin console on `http://localhost:3001`, API on
`http://localhost:4000`. Full walkthrough, including what to change before exposing it:
[production deployment](./deployment.md).
