# Easy Trip Nepal

Multi-vendor travel marketplace for Nepal — transfers, hotels, tours, treks and packages,
booked through one platform with vendor payouts, quotes and reviews.

**Current state: Phase 05 — project initialization complete.** The platform foundation is
built and verified; no business modules exist yet. See
[`docs/impl/05-project-initialization.md`](docs/impl/05-project-initialization.md).

---

## Documentation

| Doc                                                       | Path                                                                               |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Product Requirements (Phase 01)                           | [`docs/prd/01-product-requirements.md`](docs/prd/01-product-requirements.md)       |
| UX Architecture & Design System (Phase 02)                | [`docs/ux/02-ux-design-system.md`](docs/ux/02-ux-design-system.md)                 |
| Technical Architecture (Phase 03)                         | [`docs/arch/03-technical-architecture.md`](docs/arch/03-technical-architecture.md) |
| Database Architecture & Schema Plan (Phase 04)            | [`docs/db/04-database-architecture.md`](docs/db/04-database-architecture.md)       |
| **Project Initialization — Completion Report (Phase 05)** | [`docs/impl/05-project-initialization.md`](docs/impl/05-project-initialization.md) |

Precedence on conflict: **PRD > UX > architecture**. Global constraints GC-1…GC-7 in the PRD
bind every phase.

---

## Repository layout

```
apps/
  api/          NestJS 11 HTTP service          @easytrip/api
  web/          Next.js 15 App Router           @easytrip/web
packages/
  contracts/    Zod env schema, error catalog,  @easytrip/contracts
                HTTP envelope, money, ids
  database/     Drizzle client, migrator,       @easytrip/database
                seed runner, schema, migrations
src/            Root development CLI (tsx)
tests/          Integration suite (vitest, real PostgreSQL + real HTTP)
config/
  tsconfig/     base · library · nestjs · nextjs
  eslint/       base · nestjs · nextjs (flat configs)
  prettier/     shared prettier config
  env/          .env.example · .env.development · .env.test
  docker/       docker-compose.yml · postgres init · redis.conf · Caddyfile
docs/           PRD · UX · architecture · database · completion reports
```

Requires **Node 22** (see `.nvmrc`) and **pnpm 12**.

---

## Quick start

```bash
pnpm install
cp config/env/.env.development config/env/.env.local   # optional; templates are read directly
```

Start PostgreSQL, then migrate and seed:

```bash
pnpm db:serve        # terminal 1 — PostgreSQL 16 on :5432, data in .tmp-pg/dev
pnpm db:migrate      # terminal 2
pnpm db:seed         # foundation rows only
pnpm db:seed --with-demo   # + demo fixtures (development only)
```

Then run the services:

```bash
pnpm --filter @easytrip/api start    # http://localhost:4000
pnpm --filter @easytrip/web dev      # http://localhost:3000
```

`curl http://localhost:4000/health` returns a live report including a real database
round-trip. The web page at `/` is server-rendered from that report.

### With Docker

`config/docker/docker-compose.yml` defines postgres, redis, api, web and caddy.

```bash
pnpm infra:up    # postgres + redis only
pnpm stack:up    # full stack with --build
pnpm stack:down
```

**Note:** these files are authored but were never executed in the Phase 05 environment
(no Docker daemon available) — see the completion report §7.1.

---

## Scripts

| Command                 | What it does                                                        |
| ----------------------- | ------------------------------------------------------------------- |
| `pnpm build`            | Build every workspace (Turborepo)                                   |
| `pnpm typecheck`        | `tsc --noEmit` across all workspaces                                |
| `pnpm lint`             | ESLint (type-aware flat config)                                     |
| `pnpm format`           | Prettier write                                                      |
| `pnpm test`             | Unit tests — contracts, database, api, web                          |
| `pnpm test:integration` | Integration suite: real PostgreSQL 16 + real HTTP                   |
| `pnpm check:env`        | Validate the environment against the Zod schema                     |
| `pnpm db:migrate`       | Apply pending migrations                                            |
| `pnpm db:status`        | Show server version and applied migrations                          |
| `pnpm db:seed`          | Run seeders (`--with-demo`, `--dry-run`, `--only=<name>`, `--list`) |
| `pnpm db:reset`         | Drop, re-migrate and re-seed                                        |
| `pnpm db:serve`         | Docker-free PostgreSQL 16 on :5432                                  |

---

## API surface (foundation)

| Endpoint                       | Purpose                                       |
| ------------------------------ | --------------------------------------------- |
| `GET /health`, `/healthz`      | Full status report with per-dependency checks |
| `GET /health/ready`, `/readyz` | Readiness — 503 when the database is down     |
| `GET /metrics`                 | Prometheus text exposition format             |
| `GET /`                        | Service identity                              |

Every response uses one envelope:

```jsonc
// success
{ "data": { } }
// list
{ "data": [ ], "page": { "nextCursor": "etc1:…", "limit": 25, "returned": 0 } }
// error — requestId is always present
{ "error": { "code": "ETN-VAL-001", "message": "…", "requestId": "req_01J…" } }
```

Lists use opaque cursor pagination only (default limit 25, max 100). Errors come from the
24-code catalog in `packages/contracts/src/errors/catalog.ts`; framework wording never reaches
a client.

---

## Configuration

One Zod schema (`packages/contracts/src/env/env.schema.ts`) validates all **29** variables at
boot and fails fast. Templates live in `config/env/`. Precedence, lowest first:

`.env` → `config/env/.env` → `config/env/.env.$APP_ENV` → `config/env/.env.local`

Production adds extra rules: no `trace`/`debug` log level, `REDIS_REQUIRED=true`, pretty logs
off, and no localhost `DATABASE_URL`. Never commit a populated `.env` — `.gitignore` covers it.

---

## Conventions worth knowing before contributing

- **Money** is integer minor units + ISO currency code; never floats (`packages/contracts/src/money`).
- **IDs** are ULIDs in `TEXT` columns.
- **Timestamps** are `timestamptz` in UTC.
- **Enums** are `TEXT` + `CHECK` constraints.
- **State changes** write an `outbox` row in the same transaction, and are idempotent + audited (GC-5).
- **Availability** updates use compare-and-swap on a `version` column; 0 rows affected ⇒ 409.
- **RBAC** is fail-closed: an unknown permission denies and is audited.

---

## Status

| Phase                                          |                                                 |
| ---------------------------------------------- | ----------------------------------------------- |
| 01 PRD · 02 UX · 03 Architecture · 04 Database | ✅ documents complete (draft, pending sign-off) |
| **05 Project Initialization**                  | ✅ **complete and verified**                    |
| 06+ Business modules, 07 Admin Dashboard       | ⬜ not started                                  |

Two things Phase 05 could not verify, and someone should before Phase 07:
`docker compose up` has never been run, and the Redis client has never met a real Redis server.
Both are documented in the completion report §7.
