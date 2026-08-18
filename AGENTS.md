# AGENTS.md

Guidance for AI agents working in this repository.

## Project

Turvo — turf booking management platform (Phase 1).

- **Admin Web** — React 19 + TypeScript + Vite (`apps/admin-web`)
- **Owner Web** — React 19 + TypeScript + Vite (`apps/owner-web`)
- **API** — Node.js + Express + TypeScript REST API at `/api/v1` (`apps/api`)
- **Shared** — shared types, constants, validations (`packages/shared`)
- **Database** — Supabase PostgreSQL
- **Auth** — Supabase Auth (JWT verified server-side with `jose`)

Single source of truth: `docs/Turvo-Spec.md`. Customer Flutter app and online
payments are out of scope for Phase 1.

## Repository Layout

```text
apps/
  admin-web/          Admin web application (React + TS)
  owner-web/          Owner web application (React + TS)
  api/                Node.js + TS REST API (/api/v1)
packages/
  shared/             Shared types, constants and validations
supabase/
  migrations/         Versioned SQL migrations (001..019)
scripts/
  verify/             Migration verification harness
```

## Commands

Run from the repo root (npm workspaces). Requires Node >= 20.

```bash
npm install                  # install all workspaces (runs @turvo/shared build via prepare)
npm run build                # build all workspaces
npm run typecheck            # typecheck all workspaces (tsc --noEmit)
npm run lint                 # lint all workspaces
npm run test                 # run tests for all workspaces (Vitest)
npm run verify:migrations    # verify migrations against an ephemeral Postgres
```

Per-workspace scripts (run with `-w`, e.g. `npm run dev -w @turvo/api`):

- **admin-web / owner-web**: `dev`, `build`, `preview`, `typecheck`, `test`, `test:watch`
- **api**: `dev` (tsx watch), `build`, `start`, `typecheck`, `test`, `test:watch`
- **shared**: `build`, `typecheck`

Always run `npm run typecheck` and `npm run test` after making changes.

## Conventions

- **Commits** use Conventional Commits (e.g. `feat:`, `fix:`, `chore:`).
- **No comments** unless explicitly asked. Code should be self-documenting.
- **Validations** use `zod`; shared validations/types live in `packages/shared`.
- **Tests** use Vitest (API also uses Supertest; frontends use Testing Library).
- **Env config**: copy `.env.example` to `.env` per app. Never commit `.env`
  files or secrets (service role key, JWT secret, database URL).
- **Secrets** never appear in code, logs, or commit history.

## Database

- Migrations live in `supabase/migrations/` and are applied in filename order.
- Schema changes must be made through new versioned migration files only.
- Verify with `npm run verify:migrations`.

## Environments

Development, staging and production. Secrets live in deployment secret
management and are never committed to Git.