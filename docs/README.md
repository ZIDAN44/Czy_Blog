# Czy Blog | Documentation

Self-hosted blog platform.

| App              | Stack                       | Port | Purpose                           |
| ---------------- | --------------------------- | ---- | --------------------------------- |
| `apps/api`       | Fastify + Prisma + Postgres | 4000 | REST API, auth, media, scheduling |
| `apps/dashboard` | Next.js + React + Tiptap    | 3000 | Admin dashboard and public reader |

## Index

| Doc                                     | Contents                                                  |
| --------------------------------------- | --------------------------------------------------------- |
| [Introduction](introduction.md)         | What it is, feature list, limitations                     |
| [Architecture](architecture.md)         | Diagrams, request flow, data model, auth, hardening, jobs |
| [API reference](api.md)                 | Every endpoint, auth, role gate                           |
| [Using the Content API](content-api.md) | Pulling published posts into another site with an API key |
| [Environment variables](environment.md) | All env vars and defaults                                 |
| [Production deployment](deployment.md)  | Docker Compose                                            |
| [Development setup](development.md)     | Local Node.js workflow                                    |
