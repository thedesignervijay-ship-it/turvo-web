# Turvo

Turf booking management platform — Phase 1.

## Scope

- **Admin Web** — React + TypeScript
- **Owner Web** — React + TypeScript
- **Backend** — Node.js + TypeScript REST API at `/api/v1`
- **Database** — Supabase PostgreSQL
- **Authentication** — Supabase Auth
- **Storage** — Supabase Storage

Single source of truth: `docs/Turvo-Spec.md` (Phase 1 specification). Customer Flutter app and online payments are **out of scope** for Phase 1.

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

## Prerequisites

- Node.js >= 20
- npm
- Supabase project (or Supabase CLI for local development)

## Getting Started

```bash
npm install
```

Copy `.env.example` to `.env` in each application and fill in Supabase credentials.

## Database

Migrations live in `supabase/migrations/` and are applied in filename order. Schema changes must be made through migrations only.

Verify migrations against an ephemeral Postgres:

```bash
npm run verify:migrations
```

## Environments

Development, staging and production. Secrets are stored in deployment secret management and are never committed to Git.
