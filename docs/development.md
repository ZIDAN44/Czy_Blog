# Development Setup (Node.js)

Runs the API and dashboard on your machine with hot reload, using Docker only for
Postgres. For a deployed stack, see [deployment](deployment.md).

## Prerequisites

- Node.js 24+ (images use 26), npm 10+.
- Docker (for the Postgres container).

Layout:

```text
apps/api         Fastify + Prisma  (:4000)
apps/dashboard   Next.js           (:3000)
package.json     root scripts orchestrate both
```

## 1. Install

```bash
git clone https://github.com/ZIDAN44/Czy_Blog.git
cd Czy_Blog
npm install
```

## 2. Start Postgres

```bash
npm run db:up      # docker compose up -d postgres → localhost:5432
```

Stop later with `npm run db:down`.

## 3. Env

```bash
cp .env.example .env
```

Full list: [environment](environment.md).

## 4. Migrate

```bash
npm run db:migrate     # prisma migrate dev — creates tables, generates client
```

Other Prisma scripts: `db:deploy` (apply existing), `db:generate` (client only),
`db:studio` (browse data).

## 5. Run

```bash
npm run dev            # API + dashboard together
# or: npm run dev:api / npm run dev:dashboard
```

Dashboard `http://localhost:3000`, API `http://localhost:4000`
(`/health` to check).

## 6. First user

```bash
curl -X POST http://localhost:4000/api/v1/auth/bootstrap \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.com","password":"devpassword","name":"Dev"}'
```

Or use the dashboard sign-up screen, then log in at `/login`.

## Scripts (root)

| Command                            | Action                         |
| ---------------------------------- | ------------------------------ |
| `npm run dev`                      | API + dashboard, hot reload.   |
| `npm run build` / `start`          | Build / run production output. |
| `npm run db:up` / `db:down`        | Start / stop Postgres.         |
| `npm run db:migrate` / `db:deploy` | Migrations.                    |
| `npm run lint` / `lint:fix`        | ESLint.                        |
| `npm run format` / `format:check`  | Prettier.                      |

## Layout

| Path                             | Contents                                    |
| -------------------------------- | ------------------------------------------- |
| `apps/api/src/app.ts`            | Plugins, route registration, error handler. |
| `apps/api/src/routes/`           | Route handlers.                             |
| `apps/api/src/plugins/auth.ts`   | JWT + API-key auth.                         |
| `apps/api/src/lib/rbac.ts`       | Roles and permissions.                      |
| `apps/api/src/lib/schemas.ts`    | Shared field validators (id, slug, url).    |
| `apps/api/src/lib/content.ts`    | Post-document validation.                   |
| `apps/api/src/scheduler.ts`      | Publish + media-cleanup jobs.               |
| `apps/api/prisma/schema.prisma`  | Schema and migrations.                      |
| `apps/dashboard/src/app/`        | Next.js routes.                             |
| `apps/dashboard/src/components/` | Editor, forms, nav.                         |
| `apps/dashboard/src/lib/api.ts`  | Client API helper, session.                 |

Schema change: edit `schema.prisma`, run `npm run db:migrate`. The generated client
lands in `apps/api/src/generated/prisma` (committed). Reset the dev DB:
`npm run db:down`, `docker compose down -v`, then `db:up` and `db:migrate`.
