# Code conventions

Rules that keep files small enough to read in one sitting. They are enforced by
`npm run lint`, which runs in CI on every push and pull request.

## Limits

| Rule                      | Limit  | Applies to                   |
| ------------------------- | ------ | ---------------------------- |
| Lines per file            | 200    | `apps/*/src`, `packages/*/src` (TS/TSX) |
| Lines per function        | 100    | same                         |
| Nesting depth             | 4      | same                         |
| Parameters per function   | 4      | same — pass an object beyond |
| Nested callbacks          | 3      | same                         |
| Cyclomatic complexity     | 20     | same                         |
| Lines per stylesheet      | 300    | every `.css` under `apps/`, `packages/` |

Blank lines and comments don't count, so documenting code never pushes a file over.
Generated code (`apps/api/src/generated`) is exempt.

**Hitting a limit means split by responsibility, not raise the limit.** If a split
would genuinely hurt, raise it in review first.

## How to split

**React components** — one component per file once it has its own state or is reused.

- Data and actions go in a hook next to the components: `useUsers`, `usePosts`,
  `usePostForm`. The page or component then only arranges pieces.
- Pure logic (mapping, validation, copy tables) goes in a plain `.ts` module with no
  React, e.g. `post-editor/postModel.ts`.
- Long JSX splits into named sections (`PostSidebar`, `RecentActivity`), not into
  anonymous fragments.
- Repeated markup becomes a shared component (`common/ListStates.tsx`,
  `auth/AuthField.tsx`). Copy-paste across two places is the trigger.

**API routes** — the plugin function only registers routes; each handler is a named
function. Group by sub-resource in a folder (`routes/posts/`, `routes/users/`), with
shared schemas and guards in `shared.ts` / `guards.ts`. Domain logic used by more
than one route (e.g. `lib/postTaxonomy.ts`) lives in `lib/`.

**Lookup over branching** — a long `switch` over types becomes a table of handlers
(see `TiptapRender`'s `RENDERERS`, the editor's `tools.ts`).

**Stylesheets** — one partial per concern under `packages/ui/src/styles/`, imported
in order from `index.css`.

## Where things go

| Path                                | Contents                                               |
| ----------------------------------- | ------------------------------------------------------ |
| `packages/ui`                       | Design system shared by both apps: styles, theme, motion, Logo, SegmentedControl, ThemeToggle. Never copy these into an app. |
| `apps/dashboard/src/components/<feature>/` | Feature folders: `post-editor`, `editor`, `posts`, `users`, `overview`, `nav`, `api-keys`, `settings`, `auth`, `overlay`, `toast`. |
| `apps/dashboard/src/components/common/` | Small pieces used across features.                 |
| `apps/dashboard/src/lib/`           | Non-UI helpers: API client, roles, formatting.         |
| `apps/web/src/components/{home,post}/` | Sections of the home and post pages.                |
| `apps/web/src/lib/posts.ts`         | Public API reads and their types.                      |
| `apps/api/src/routes/<resource>/`   | Route plugins and handlers.                            |
| `apps/api/src/lib/`                 | Domain logic and shared validation.                    |

## Checks

```bash
npm run lint        # ESLint (incl. the limits above) + stylesheet sizes
npm run typecheck   # tsc for api, web, dashboard and packages/ui
```
