# Phase 05 — Project Initialization: Completion Report

|                    |                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Phase**          | 05 — Project Initialization                                                                                                                                                                |
| **Status**         | **COMPLETE** — build, typecheck, lint, unit tests and integration tests all pass                                                                                                           |
| **Date**           | 2026-09-11                                                                                                                                                                                 |
| **Inputs**         | [`prd/01`](../prd/01-product-requirements.md) · [`ux/02`](../ux/02-ux-design-system.md) · [`arch/03`](../arch/03-technical-architecture.md) · [`db/04`](../db/04-database-architecture.md) |
| **Scope boundary** | Platform foundation only. **No business modules implemented** (see §8).                                                                                                                    |

---

## 1. What was built

A pnpm + Turborepo monorepo containing the API, the web app, two shared packages, a
development CLI, and a real integration-test harness. **143 files / ~4,300 lines of
TypeScript** across the workspaces.

```
easytrip/
├── apps/
│   ├── api/                    NestJS 11 HTTP service (@easytrip/api)
│   └── web/                    Next.js 15 App Router (@easytrip/web)
├── packages/
│   ├── contracts/              Zod schemas, error catalog, envelope, money (@easytrip/contracts)
│   └── database/               Drizzle client, migrator, seed runner, schema (@easytrip/database)
├── src/                        Root development CLI (tsx) — check:env, db:*
├── tests/                      Integration suite (@easytrip/tests, vitest)
├── config/
│   ├── tsconfig/               base · library · nestjs · nextjs
│   ├── eslint/                 base · nestjs · nextjs (flat configs)
│   ├── prettier/               shared prettier config
│   ├── env/                    .env.example · .env.development · .env.test
│   └── docker/                 compose + postgres init + redis.conf + Caddyfile
└── docs/                       PRD · UX · architecture · database · this report
```

### 1.1 Requested deliverables

| Requested                  | Where                                                           | Status                                                                    |
| -------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Frontend                   | `apps/web`                                                      | ✅ server-rendered health page reading the live API                       |
| Backend                    | `apps/api`                                                      | ✅ NestJS, 6 routes, global pipeline                                      |
| Database                   | `packages/database`                                             | ✅ Drizzle + node-postgres, migration 0000 applied                        |
| Shared types / utilities   | `packages/contracts`                                            | ✅ env, errors, http, money, ids, health                                  |
| TypeScript                 | `config/tsconfig/*`                                             | ✅ 4 presets, `strict: true` everywhere                                   |
| ESLint                     | `config/eslint/*`                                               | ✅ flat config, typescript-eslint 8, type-aware                           |
| Prettier                   | `config/prettier/*`                                             | ✅ single shared config                                                   |
| Environment variables      | `packages/contracts/src/env` + `config/env/*`                   | ✅ 29-var Zod schema, fail-fast                                           |
| Database connection        | `apps/api/src/infra/db`                                         | ✅ pooled, statement timeout, graceful close                              |
| PostgreSQL                 | `packages/database/migrations`                                  | ✅ 16.14, connectivity **verified**                                       |
| Redis                      | `apps/api/src/infra/redis`                                      | ⚠️ client + health probe implemented; **no server available here** (§7.2) |
| API structure              | `apps/api/src/{modules,common,infra}`                           | ✅ envelope, correlation id, exception filter, RBAC scope                 |
| Logging                    | `apps/api/src/infra/logging`                                    | ✅ pino JSON, per-request child logger, PII redaction                     |
| Error handling             | `apps/api/src/common/filters` + `packages/contracts/src/errors` | ✅ 24-code catalog, every body carries `requestId`                        |
| Validation                 | Zod + `ValidationPipe`                                          | ✅ fail-closed, `ETN-VAL-001` on rejection                                |
| Testing framework          | jest (api) · vitest (contracts, database, web, integration)     | ✅ 85 unit + 18 integration                                               |
| Docker dev environment     | `config/docker/docker-compose.yml`                              | ⚠️ authored, **not executed** — no Docker daemon (§7.1)                   |
| `GET /health`              | `apps/api/src/modules/health`                                   | ✅ verified against a real database                                       |
| Development seed mechanism | `packages/database/src/seed`                                    | ✅ registry + transactional runner, zero business seeders                 |

---

## 2. Verification — everything below was executed

| Command                    | Result                                                                        |
| -------------------------- | ----------------------------------------------------------------------------- |
| `pnpm build`               | ✅ **4/4** tasks (contracts, database, api, web)                              |
| `pnpm typecheck`           | ✅ **8/8** tasks                                                              |
| `pnpm lint`                | ✅ **5/5** tasks, 0 errors 0 warnings                                         |
| `pnpm test`                | ✅ **7/7** tasks — **85 tests** (contracts 29 · database 13 · api 34 · web 9) |
| `pnpm test:integration`    | ✅ **18 tests** across 3 files, real PostgreSQL + real HTTP                   |
| `pnpm format:check`        | ✅ all files match the Prettier config                                        |
| `pnpm check`               | ✅ typecheck 8/8 · lint 5/5 · test 7/7 · build 4/4 in one pass                |
| `pnpm check:env`           | ✅ `✓ environment is valid` — 29 vars, `DATABASE_URL` redacted                |
| `pnpm db:migrate`          | ✅ 1 migration applied                                                        |
| `pnpm db:status`           | ✅ real connection: `PostgreSQL 16.14 on x86_64`                              |
| `pnpm db:seed`             | ✅ 1 row (`foundation`)                                                       |
| `pnpm db:seed --with-demo` | ✅ 4 rows                                                                     |

Integration tests run against a **real embedded PostgreSQL 16.14** (not a mock) and drive the
API over **real HTTP** via supertest — covering migration application, the seed registry, the
health envelope, correlation-id propagation, the error envelope, and **graceful shutdown of
the full application graph** (closed twice on purpose).

### 2.1 `GET /health` against a live database

```console
$ curl -i http://127.0.0.1:4000/health
HTTP/1.1 200 OK
x-request-id: req_01M275FMF1J4N7BDDAEGJ4GAC2
content-type: application/json; charset=utf-8

{"data":{"status":"degraded","service":"easytrip-api","version":"0.5.0",
 "environment":"development","checks":[
   {"name":"database","state":"up","latencyMs":0.72,
    "message":"PostgreSQL 16.14 on x86_64-pc-linux-gnu, ..."},
   {"name":"redis","state":"down","message":"connect ECONNREFUSED 127.0.0.1:6379"}]}}
```

The `database` check is a genuine round-trip (`SELECT version(), now()`), measured at 0.72 ms.
`redis` reports `down` honestly because no Redis server exists in this environment (§7.2).
`status` is `degraded`, never `ok`, until every dependency is up. `/readyz` returns 200 (the
API is usable with Redis absent); it returns **503** only when `status === 'down'`.

### 2.2 End-to-end stack, verified running simultaneously

```
PostgreSQL 16.14  ──:5432──▶  API  ──:4000──▶  Web  ──:3000
   (pnpm db:serve)      (pnpm --filter @easytrip/api start)   (… web start)
```

The web page is server-rendered from the API's live health report — no static or mocked data.
Its rendered output contained `PostgreSQL 16.14 on x86_64-pc-linux-gnu` and
`Overall: Degraded`, both sourced from the running API.

---

## 3. `GET /health` design (Arch §16)

| Endpoint                       | Meaning                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `GET /health`, `/healthz`      | Full report: status, identity, uptime, per-dependency checks       |
| `GET /health/ready`, `/readyz` | Readiness — **503** when `status === 'down'`                       |
| `GET /metrics`                 | Prometheus **text exposition format** (deliberately not enveloped) |

Status is `ok` (all up) / `degraded` (an optional dependency down) / `down` (database down).
Each check reports `state`, `latencyMs`, and a `message`. Dependency detail is never leaked
into client-facing error bodies.

---

## 4. Cross-cutting conventions established

These are wired globally now so Phase 06+ modules inherit them without repeating work:

- **Response envelope** (Arch §3.3) — success `{"data":…}`; lists `{"data":[…],"page":{…}}`;
  errors `{"error":{code,message,details?,requestId}}`.
- **Cursor pagination only** (Arch §3.6) — opaque `etc1:` cursors, default limit 25, max 100,
  allowlisted `sort=field|-field`. Malformed cursors decode to `null`, never throw.
- **Error catalog** (§17.1) — 24 codes across VAL/AUTH/AUTHZ/BK/QT/PY/RF/VEN/REV/CORP/UP/SYS.
  Framework wording is replaced by the catalog's message so internals never leak.
- **Correlation id** — inbound `x-request-id` is echoed; otherwise a `req_<ULID>` is generated
  and attached to every log line and error body.
- **Logging** (§14.1) — pino JSON, per-request child logger, serializer-level PII redaction.
- **Money** (§C-3) — integer minor units + ISO code; `toMinor` rejects sub-minor precision,
  per-currency exponent table (JPY/KRW = 0).
- **RBAC scope contract** (§6) — `apps/api/src/common/scope/scope.ts` defines the object-scope
  type the Phase 07 guards will consume. The four fail-closed layers are **not** built yet.
- **Configuration** (§25.2) — one shared Zod `EnvSchema`, fail-fast at boot. Production adds
  `superRefine` rules: no `trace`/`debug` log level, `REDIS_REQUIRED=true`, no pretty logs,
  no localhost `DATABASE_URL`.

---

## 5. Database (DB §4.13, L0 foundation)

One migration exists: `0000_lush_stone_men.sql`, creating the transactional **`outbox`** table.

| Column                                         | Type                | Notes                           |
| ---------------------------------------------- | ------------------- | ------------------------------- |
| `id`                                           | TEXT PK             | ULID (convention C-1)           |
| `aggregate_type`, `aggregate_id`, `event_type` | TEXT                |                                 |
| `payload`                                      | jsonb NOT NULL `{}` |                                 |
| `created_at`                                   | timestamptz         | now() (C-4: all timestamps UTC) |
| `published_at`                                 | timestamptz NULL    |                                 |
| `attempt`                                      | int 0               |                                 |
| `last_error`                                   | TEXT NULL           |                                 |

Indexes: btree `(aggregate_type, aggregate_id, created_at)`, btree `(event_type)`, partial
btree `created_at WHERE published_at IS NULL`.

### 5.1 Seed mechanism

An **ordered registry + transactional runner** with **zero business seeders**:

| Seeder                             | Order | Behaviour                                           |
| ---------------------------------- | ----- | --------------------------------------------------- |
| `foundation.platform-seeded-event` | 10    | Appends one real `platform.seeded` row to `outbox`  |
| `demo.outbox-fixtures`             | 90    | 3 rows; `developmentOnly`, opt-in via `--with-demo` |

Flags: `--with-demo` · `--dry-run` (rolls back) · `--only=<name>` · `--list`. Every seeder runs
inside a transaction on a dedicated pooled connection and rolls back on any error.

### 5.2 Root CLI

`pnpm check:env` · `db:migrate` · `db:status` · `db:seed` · `db:reset` · `db:serve`

---

## 6. Bugs found and fixed during verification

Each of these was caught by running the code, not by reading it:

1. **`/metrics` was JSON-enveloped** — the global interceptor wrapped the Prometheus text in
   `{"data":"…"}`, which no scraper can parse. Now writes the raw response directly and sets
   `content-type: text/plain; version=0.0.4`. The integration test now asserts the body is
   **not** valid JSON.
2. **404 responses leaked framework wording** (`"Cannot GET /v1/nope"`). Now always the catalog
   message (Arch §17.2).
3. **Redis teardown crashed the process on shutdown** — `onModuleDestroy` re-read
   `this.client` inside its own `catch` after it had been nulled, throwing
   `TypeError: Cannot read properties of null`. Now detaches into a local first. Covered by
   three regression tests in `apps/api/test/unit/redis.service.spec.ts`.
4. **`@easytrip/tests` failed typecheck with 63 errors** — the jest→vitest switch left
   `types: ["node"]`, so `describe`/`it`/`expect` were unresolved. Vitest's `globals: true` is a
   _runtime_ setting; `"vitest/globals"` had to be added for `tsc`.
5. **`db:migrate` printed `✗ Invalid time value`** — drizzle stores `created_at` as BIGINT ms
   and node-postgres returns it as a **string**. Fixed with `Number(...)` in
   `packages/database/src/migrate.ts`.
6. **Three Nest DI faults** surfaced only when the app booted under supertest:
   a token declared in the same file as its consumer resolved to `undefined` (fixed by
   extracting `metrics.token.ts`); `app.useLogger(app.get(Logger))` needed **nestjs-pino's**
   `Logger`, not `@nestjs/common`'s; and `EnvelopeInterceptor`/`CorrelationIdMiddleware` were
   constructed with `new` and so absent from the container (fixed with a `@Global()`
   `CoreModule`).
7. **The embedded-postgres fixture seeded the wrong result index** — `results[0]` is the
   `foundation` seeder, not the demo one.
8. **`pnpm db:serve` failed with `database "easytrip" does not exist"`** — `initdb` does not
   create a database named after the user, so the admin client now connects to `postgres` and
   calls `createDatabase(name)`.
9. **Shutdown crashed with `Error: Called end on pool more than once`** — the same class as
   #3, on the database side: `DbModule.onModuleDestroy` called `pool.end()` again after it had
   already ended. `createDbClient().close()` is now idempotent (memoises the teardown promise).
   Covered by `packages/database/test/client-close.spec.ts` and
   `tests/integration/shutdown.spec.ts`; the latter was **confirmed to fail** with
   `"Called end on pool more than once"` when the guard was temporarily removed, then pass
   again when it was restored.
10. **Prettier had been configured but never run** — `pnpm format:check` reported **48 files**
    out of style. `pnpm format` was applied and the whole pipeline re-run afterwards, so the
    reformatting is verified rather than assumed.

---

## 7. Deviations, gaps and things this environment could not prove

Stated plainly, because an unverified claim is worse than a named gap.

### 7.1 Docker / Compose — authored, **not executed**

`config/docker/docker-compose.yml` (postgres 16, redis 7, api, web, caddy),
`config/docker/postgres/init/01-init.sql`, `config/docker/redis/redis.conf` and
`config/docker/Caddyfile` are written, but **this sandbox has no Docker daemon**, so
`docker compose up` has never been run and the files are unverified. Treat them as untested
until someone runs them.

Because Docker was unavailable, **`pnpm db:serve`** was added as a Docker-free alternative: it
boots a real PostgreSQL 16.14 from `embedded-postgres` on port 5432 with its data in
`.tmp-pg/dev` (gitignored). This is what all live verification above ran against.

### 7.2 Redis — client implemented, **no server available**

`ioredis` 6 is wired with a health probe, prefixing and graceful degradation, and `redis:7` is
in compose. But no Redis server could be obtained here (`apt-get` has no route to
`deb.debian.org`; `redis-memory-server`'s postinstall fails). Every Redis path is therefore
exercised only through **`ioredis-mock`** in unit tests plus the "connection refused" branch of
the health check. The real client against a real server is **unverified**.

### 7.3 OpenTelemetry / OTLP — **deferred**

No OTel packages are installed. `OTEL_*` variables exist in the env schema and are validated,
but nothing consumes them. Tracing/export is deferred to the phase that introduces the workers
and a collector. Metrics today come from the in-process `/metrics` registry.

### 7.4 BRIN index on `outbox.created_at` — **not created**

DB §4.13 specifies a BRIN index for the append-only time series. `drizzle-kit` does not emit
BRIN indexes, so migration 0000 has the three btree indexes only. The BRIN index needs a
hand-written migration once `outbox` volume justifies it.

### 7.5 Other deliberate omissions

- **No business modules** — by instruction. No bookings, payments, vendors, etc.
- **`@nestjs/cli` not installed** — `tsc` compiles the API directly.
- **`@nestjs/config` not used** — v11 does not exist; replaced by the Zod `ConfigModule`.
- Located in the DB doc but intentionally **not** built: `idempotency_key` (§4.12),
  `adm_setting` / `adm_feature_flag` / `dsp_*` / `srch_keyword_alias` (§28).

---

## 8. Environment actually verified

Node v22.22.3 · pnpm 12.3.4 · PostgreSQL 16.14 · Linux x64.

Pinned to the versions the architecture document specifies rather than the newest majors
(next 16, @nestjs 12, typescript 7, eslint 10 and vitest 5 were all rejected):

`next 15.5.25` · `react 19.3.0` · `@nestjs/* 11.2.3` · `typescript 5.9.3` · `eslint 9.39.5` ·
`typescript-eslint 8.70.0` · `prettier 3.9.6` · `zod 4.6.2` · `vitest 3.2.7` · `vite 7.3.6` ·
`jest 29.7.0` · `drizzle-orm 0.45.2` · `drizzle-kit 0.31.10` · `pg 8.23.0` · `ioredis 6.0.0` ·
`pino 10.3.1` · `nestjs-pino 5.1.0` · `helmet 8.3.0` · `tailwindcss 4.3.3` · `turbo 2.10.12`.

---

## 9. Ready for the next phase

The foundation is in place for **Phase 07 (Admin Dashboard)**: 27 modules and 11 KPIs, all
behind RBAC. What those modules will inherit without rebuilding —

envelope · cursor pagination · error catalog · correlation id · structured logging · Zod
validation · money helpers · migration + seed tooling · health/metrics · the RBAC scope
contract · and a green build/typecheck/lint/format/test/integration baseline to regress against.

**Before Phase 07 begins**, someone with Docker and a Redis server should run
`docker compose up` and the Redis client against a live server — the two gaps in §7 that this
environment could not close.
