# Development Setup (Node.js)

Runs all three apps on your machine with hot reload, using Docker only for Postgres. For
a deployed stack, see [deployment](deployment.md).

Prerequisites: Node.js 24+ (images use 26), npm 10+, Docker (for Postgres).

```text
apps/api         Fastify + Prisma       (:4000)
apps/web         Next.js public reader  (:3000)
apps/dashboard   Next.js admin console  (:3001)
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

Also: `db:deploy` (apply existing), `db:generate` (client only), `db:studio` (browse).

## 5. Run

```bash
npm run dev            # API + reader + console together
# or: npm run dev:api / npm run dev:web / npm run dev:dashboard
```

Reader `:3000`, console `:3001`, API `:4000` (`/health` to check).

## 6. First user

```bash
curl -X POST http://localhost:4000/api/v1/auth/bootstrap \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.com","password":"devpassword","name":"Dev"}'
```

Or use the console's first-run sign-up at `http://localhost:3001/signup`.

## Scripts (root)

| Command                            | Action                          |
| ---------------------------------- | ------------------------------- |
| `npm run dev`                      | API + reader + console, reload. |
| `npm run build` / `start`          | Build / run production output.  |
| `npm run db:up` / `db:down`        | Start / stop Postgres.          |
| `npm run db:migrate` / `db:deploy` | Migrations.                     |
| `npm run lint` / `lint:fix`        | ESLint + size limits.           |
| `npm run typecheck`                | tsc across all workspaces.      |
| `npm run format` / `format:check`  | Prettier.                       |

## Layout

File size limits and where new code goes: [code conventions](conventions.md).


| Path                               | Contents                                    |
| ---------------------------------- | ------------------------------------------- |
| `apps/api/src/app.ts`              | Plugins, route registration, error handler. |
| `apps/api/src/routes/`             | Route handlers.                             |
| `apps/api/src/plugins/auth.ts`     | JWT + API-key auth.                         |
| `apps/api/src/lib/rbac.ts`         | Roles and permissions.                      |
| `apps/api/src/lib/schemas.ts`      | Shared field validators (id, slug, url).    |
| `apps/api/src/lib/content.ts`      | Post-document validation.                   |
| `apps/api/src/scheduler.ts`        | Publish + media-cleanup jobs.               |
| `apps/api/prisma/schema.prisma`    | Schema and migrations.                      |
| `apps/web/src/app/`                | Public reader routes (`/`, `/[slug]`, RSS). |
| `apps/dashboard/src/app/`          | Admin console routes + auth/proxy handlers. |
| `apps/dashboard/src/middleware.ts` | Cookie gate for the console.                |
| `apps/dashboard/src/components/`   | Feature folders (editor, nav, users, …).    |
| `packages/ui/`                     | Shared design system: styles, theme, motion. |
| `apps/dashboard/src/lib/api.ts`    | Client API helper, session.                 |

Schema change: edit `schema.prisma`, run `npm run db:migrate`. The generated client lands
in `apps/api/src/generated/prisma` (gitignored; `db:generate` recreates it). Reset the dev DB: `npm run db:down`,
`docker compose down -v`, then `db:up` and `db:migrate`.
