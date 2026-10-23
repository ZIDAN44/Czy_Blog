# CLAUDE.md

Self-hosted blog: a public reader, an admin console, and an API, in one npm-workspaces
monorepo. Long-form docs live in `docs/` (VitePress) — read the relevant page before
changing behavior they describe, and update it in the same change.

## Layout

| Path             | What                                                            | Port |
| ---------------- | --------------------------------------------------------------- | ---- |
| `apps/api`       | Fastify 5 + Prisma 7 (pg driver adapter) + Zod 4, ESM           | 4000 |
| `apps/web`       | Next.js 16 reader, server components only, read-only            | 3000 |
| `apps/dashboard` | Next.js 16 admin console (client components), Tiptap 3 editor   | 3001 |
| `packages/ui`    | `@czyblog/ui`: shared styles, theme, motion, Logo, SegmentedControl, ThemeToggle | — |
| `docs/`          | Architecture, API reference, env vars, deployment, conventions  | —    |

Postgres via `docker-compose.yml`; media in a private S3 bucket, served through the API's
`/media` route. Both Next apps use the `@/*` → `src/*` alias.

## Commands

Node ≥ 26, npm ≥ 11 (`engines`). Run from the repo root.

```bash
npm install
npm run db:up                 # Postgres only (docker compose)
npm run dev                   # api + web + dashboard with reload (or dev:api / dev:web / dev:dashboard)
npm run lint                  # ESLint incl. size limits + stylesheet size check
npm run typecheck             # tsc for api, web, dashboard, packages/ui
npm run format                # Prettier write (format:check to verify)
npm run build                 # api, then web, then dashboard
npm run db:migrate            # prisma migrate dev — create a migration after editing schema.prisma
npm --workspace apps/api run db:generate   # regenerate the Prisma client (no root alias)
npm run docs:dev              # docs site
```

There is **no automated test suite**. Verify with `lint` + `typecheck`, then exercise the
change against the running stack (API with curl, UIs in a browser). CI
(`.github/workflows/ci.yml`) runs lint and typecheck on pushes to `main` and on PRs.

## Code limits (enforced by lint and CI)

Per TS/TSX file in `apps/*/src` and `packages/*/src`: ≤ 200 lines, functions ≤ 100 lines
(blank lines and comments don't count), depth ≤ 4, ≤ 4 params, complexity ≤ 20. CSS files
≤ 300 lines. Hitting a limit means split by responsibility — don't raise the limit or
add disable comments. Patterns and where code goes: `docs/conventions.md`.

- Dashboard: feature folders under `src/components/<feature>/` with a `use<Thing>` hook
  for data/actions, plain `.ts` modules for pure logic, small section components; pages
  only compose. Shared bits: `components/common/`, `lib/roles.ts`.
- API: route plugins only register named handler functions; one folder per resource
  (`routes/posts/`, `routes/users/`); cross-route domain logic in `src/lib/`.
- Never copy something from `packages/ui` into an app — import `@czyblog/ui/<export>`
  (see `packages/ui/package.json` `exports`). Next transpiles it from source.

## Things that must stay in sync

- **Document vocabulary (3 places).** Allowed Tiptap node/mark types are validated in
  `apps/api/src/lib/content.ts` (`NODE_TYPES`, `MARK_TYPES`), produced by
  `apps/dashboard/src/components/editor/BlockEditor.tsx` (+ `tools.ts`), and rendered by
  `apps/web/src/components/TiptapRender.tsx` (`RENDERERS`, `applyMarks`). Adding a node
  or mark means all three. Image `src`s are also scanned by `lib/mediaCleanup.ts`.
- **JWT settings.** The API signs (`src/plugins/auth.ts`, `src/config.ts`); the dashboard
  middleware verifies with `JWT_SECRET`/`JWT_ISSUER`/`JWT_AUDIENCE` in
  `apps/dashboard/src/lib/auth-cookie.ts`. Different secrets ⇒ every login bounces back to
  `/login` with a 200 from the login call.
- **Theme canvas colors.** `CANVAS` in `packages/ui/src/theme.ts` mirrors
  `--color-canvas` in `styles/tokens.css` and `styles/dark.css`.
- **Docker install stage.** Every Dockerfile copies each workspace `package.json` before
  `npm ci`. A new workspace package must be added to all three Dockerfiles.

## API conventions

- Responses: `{ data }`, lists add `pagination` (`lib/queries.ts`); errors `{ error }`.
  Zod errors → 400 and known Prisma codes → 404/409 via the global handler in
  `src/app.ts`. 5xx bodies never include internal messages.
- **Request bodies are camelCase, post responses are snake_case** (`serializePost` in
  `lib/serialize.ts`: `cover_image`, `published_date`, `view_count`, …).
- Validate every input with Zod; reuse `lib/schemas.ts` (`idParam`, `slugField`,
  `httpUrlField` — http(s) only, never bare `z.url()`).
- Auth: `app.authenticate` re-loads the user each request and rejects tokens whose
  `tokenVersion` is stale (bumped on password change). `requireRole(min)` and
  `canEditPost`/`coerceStatus` in `lib/rbac.ts` are the permission source of truth;
  contributors' publish/schedule requests are silently downgraded to `PENDING_REVIEW`.
- Posts are soft-deleted (`deletedAt`); public reads go through `publishedPostWhere()`.
- Content API (`/api/v1/content/*`) uses `x-api-key` (`app.apiKeyAuth`).

## Database & migrations

- Schema: `apps/api/prisma/schema.prisma`. Create migrations with `npm run db:migrate`.
- The API applies pending SQL migrations itself on startup (`src/migrate.ts`, advisory
  lock, `_schema_migrations` table) — there is no separate deploy step. Never edit an
  applied migration; add a new one.
- The generated client (`apps/api/src/generated/prisma`) is gitignored; `build` and
  `db:generate` recreate it. Import Prisma types from `src/db.ts`, not the generated path.

## Frontend notes

- Dashboard browser code calls the API only via `api()` in `src/lib/api.ts`, which goes
  through the same-origin `/api-proxy/*` route (cookie → Bearer). A 401 there signs the
  user out. Credential actions use `/api/auth/*` route handlers that own the httpOnly cookie.
- After sign-in/sign-out use a full page load (`window.location.replace`), not
  `router.replace` — the client router can replay a cached middleware redirect.
- The reader fetches the API server-side only (`src/lib/posts.ts`, `API_URL`); fetchers
  return `null`/`[]` instead of throwing so an API outage never becomes a 500.
- Styling: Tailwind 4 + semantic tokens (`bg-surface`, `text-content-secondary`, …) and
  component classes (`.btn`, `.card`, `.input`, `.t-*`) from `packages/ui/src/styles/`.
  Component classes live in `@layer components`, so utilities override them. Use tokens,
  not raw colors; check light and dark.
- Icons: `lucide-react`. Fonts: Geist / Geist Mono / Newsreader via `@czyblog/ui/fonts`.

## Environment

One `.env` at the repo root, loaded by every app (`apps/api/src/env.ts`, both
`next.config.mjs`, `apps/api/prisma.config.ts`); real env vars win. Template:
`.env.example`; reference: `docs/environment.md`.

- `.env.example` sets `NODE_ENV=production`, which makes the API demand a non-default
  ≥ 32-char `JWT_SECRET` and refuse `*` in `CORS_ORIGINS`. Use `development` locally.
- The API refuses to start without `DATABASE_URL` and `S3_BUCKET`, or with
  `MEDIA_CLEANUP_INTERVAL_HOURS` outside (0, 596].
- `PUBLIC_SITE_URL` is read by both the API and the reader. Every absolute URL the reader
  emits (sitemap, robots.txt, canonicals, Open Graph) comes from it, so a localhost value
  in production silently points search engines at localhost.
- `.env` may hold real production credentials — never print, commit, or copy its values.

## Style

- Prettier: single quotes, semicolons, trailing commas, width 100, LF.
- Comments are short and explain *why* (constraints, security reasons, races), not what.
- Commits: imperative subject; body explains the why; end with
  `Signed-off-by: Zinadin Zidan <zidan.roking@gmail.com>`. One logical change per commit.
