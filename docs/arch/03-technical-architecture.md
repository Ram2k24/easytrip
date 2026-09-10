# Easy Trip Nepal — Technical Architecture (Phase 03)

| Field | Value |
|---|---|
| Document ID | ETN-ARCH-003 |
| Phase | 03 — Technical Architecture |
| Version | 0.1 (DRAFT — pending engineering sign-off) |
| Date | 2026-09-09 |
| Depends on | [`docs/prd/01-product-requirements.md`](../prd/01-product-requirements.md) (PRD v0.1) · [`docs/ux/02-ux-design-system.md`](../ux/02-ux-design-system.md) (UX v0.1) |
| Status | Awaiting stakeholder review (open items: Appendix C) |

**Change log**

| Version | Date | Author | Summary |
|---|---|---|---|
| 0.1 | 2026-09-09 | Product/Engineering (Arena agent) | Initial technical architecture: 20 mandated areas, module boundaries, folder structures, API versioning, environment configuration, dev/staging/production, Nepal→international scaling. |

**Binding inheritance:** PRD global constraints GC-1…GC-7 and Phase 02 design rules apply to this document. Where this document and the PRD disagree, the PRD wins.

---

## 0. Overview

### 0.1 Stack (final choices)

| Concern | Choice | Notes |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | `apps/web`, `apps/api`, `packages/*` |
| Frontend | **Next.js 15 (App Router) + React 19 + TypeScript (strict)** | SSG/ISR + SSR + CSR split per surface (§1) |
| UI | Tailwind CSS 4 + `@easytrip/ui` package (Phase 02 tokens 1:1) | Design QA gates apply |
| Backend | **NestJS 11 + TypeScript (strict)** | Modular monolith (§2) |
| Validation | **Zod** (single schema source in `packages/contracts`) | Web + API share schemas |
| Database | **PostgreSQL 16** (managed, Multi-AZ) via **Drizzle ORM** | Migrations: drizzle-kit; SQL escape hatch allowed |
| Cache/queues | **Redis 7** (managed) + **BullMQ** | §11, §12 |
| Storage | **S3-compatible** (3 buckets) + CDN | §8 |
| Search | **PostgreSQL FTS + pg_trgm** behind a `SearchProvider` SPI | §10, swap-ready for V2 |
| Payments | **Provider-agnostic SPI** + capability matrix (GC-2) | §7 |
| Auth | JWT access + rotating opaque refresh (cookie), Argon2id, TOTP for admin | §5 |
| Jobs | BullMQ + **timer-sweep pattern** (DB-backed SLA timers) | §12 |
| Observability | pino (logs) + **OpenTelemetry** (traces/metrics) + SLO alerts | §14, §15 |
| API contract | OpenAPI 3.1 generated from code; URI versioning `/v1` | §3, §24 |
| Testing | Jest (api) · Vitest + RTL (web/ui) · Playwright (E2E) · Testcontainers (integration) | PRD quality gates |
| Cloud target | **AWS as canonical** (ECS Fargate + RDS + ElastiCache + S3/CloudFront) + **Vercel** (web); Terraform IaC | T-7; any 12-factor equivalent stays possible |
| AI | None in MVP; rule-based suggestions V1.5; LLM planner V2 (provider-gated, GC-2) | §19 |

### 0.2 Architecture style

- **Modular monolith API** (not microservices): one deployable NestJS app with strict domain modules, one-way dependency layers, facade-only cross-module calls, and domain events via a transactional outbox. Decomposition is cheap later (extraction candidates when needed: `payments`, `search`, `notifications` — each already behind an interface).
- **Server-rendered web** with a sharp rendering split: SEO surfaces static/ISR, app surfaces client-driven (React Query), money/PII only crosses the boundary server-side.
- **Everything external is an adapter** with a capability matrix verified in sandbox before enablement (GC-2). Nothing is "assumed to exist".
- **Money and state are backend-authoritative** (GC-4): client sends selections and idempotency keys, never amounts or success claims.

### 0.3 Key decisions (summarized; full table Appendix B)

| ID | Decision | One-line rationale |
|---|---|---|
| T-1 | Modular monolith, not microservices | Team/ops size; modules + events preserve decomposability |
| T-2 | Next 15 App Router, SSG/ISR/SSR/CSR per surface | SEO + performance + interactivity in one framework |
| T-3 | Single Postgres DB, table prefixes per module | Operational simplicity; boundaries enforced in code, not schemas |
| T-4 | Drizzle ORM | Typed, migration-first, SQL escape hatch for search/complex queries |
| T-5 | BullMQ + DB timer-sweep for SLAs | Durable, inspectable, admin-adjustable timers (no lost in-memory jobs) |
| T-6 | Transactional outbox for domain events | No lost/duplicate cross-module side effects |
| T-7 | AWS canonical + Vercel web from day 1 | PRD requires AWS-deployable; avoids a later migration; IaC keeps alternatives open |
| T-8 | Provider SPI + capability matrix | GC-2: no invented external capabilities; UI reads verified capabilities |
| T-9 | Money = BIGINT minor units + ISO code (GC-7) | No float money, no rounding drift; app-side integer math |
| T-10 | Postgres FTS for MVP search behind SPI | Zero new infra; documented swap trigger to dedicated engine [V2] |
| T-11 | OpenTelemetry from day 1, vendor-neutral exporter | Vendor-swappable observability; business + system telemetry together |
| T-12 | Trunk-based + expand/contract migrations + feature flags | Small, safe, fast deploys; kill switches for risky behavior |

### 0.4 System context

```
                         ┌────────────────────────────────────────────────────────┐
                         │                        CLIENTS                         │
                         │  browsers (mobile-first) · future PWA/app [V2] · ops   │
                         └──────────────┬─────────────────────────────┬───────────┘
                                        │ HTTPS (TLS 1.2+)            │ HTTPS
                                        ▼                             ▼
        ┌────────────────────────────────────────┐   ┌────────────────────────────────────────┐
        │  WEB (Vercel)                          │   │  EXTERNAL PROVIDERS (adapters, T-8)    │
        │  Next.js 15 · SSG/ISR/SSR/CSR          │   │  payment PSPs · email · SMS/WA [V1.5]  │
        │  auth via httpOnly cookies · RSC       │   │  maps (client, OSM) · LLM [V2] · AV    │
        └───────┬────────────────────────────────┘   │  [V1.5] · observability · 3P [V1.5]    │
                │ typed API client (OpenAPI)         └───────▲───────────────────▲────────────┘
                │  + server-side fetch (BFF-lite)            │ outbound (SPI)     │ inbound webhooks
                ▼                                            │ (signed)           │ (signature-verified)
        ┌──────────────────────────────────────────────────────────────────────────┐
        │  API (NestJS 11, stateless, ECS Fargate) — /v1/* · /v1/webhooks/*        │
        │  REST + OpenAPI · RBAC guards · validation · idempotency · audit         │
        │  modules: auth users customers vendors catalog+lines quotes bookings     │
        │  payments refunds reviews notifications corporate destinations content   │
        │  search ai-planner reports admin + outbox dispatcher                     │
        └──────┬───────────────┬───────────────┬───────────────┬───────────────────┘
               ▼               ▼               ▼               ▼
        ┌────────────┐  ┌────────────┐  ┌──────────────┐  ┌────────────────────────┐
        │ Postgres 16│  │ Redis 7    │  │ S3 + CDN     │  │ WORKER (ECS, same img) │
        │ Multi-AZ   │  │ cache · RL │  │ private ·    │  │ BullMQ consumers:      │
        │ PITR 5min  │  │ queues(L)  │  │ media · orig │  │ timers media email     │
        │            │  │ dedup ·    │  │ tmp          │  │ search payments        │
        └────────────┘  │ locks      │  └──────────────┘  │ rollups exports …      │
                        └────────────┘                     └────────────────────────┘
```

---

## 1. Frontend Architecture

### 1.1 Framework & libraries

- Next.js 15 (App Router, React 19), TypeScript strict, `next/font` (Inter + Bricolage, subsets, swap), `next/image` (AVIF/WebP, lazy, blur-up — Phase 02 §4.6).
- Tailwind CSS 4; tokens wired exactly per Phase 02 §11.1/Appendix A (CSS custom properties → theme); no raw values in components (CI lint).
- `@easytrip/ui` package (monorepo): all Phase 02 component specs (§8.1–8.18) implemented once, consumed by public, customer, vendor, and admin surfaces.
- Forms: react-hook-form + Zod schemas from `packages/contracts` (shared with API).
- Client data: **React Query** (cache, retries, invalidation) for interactive areas; URL as state owner for search/filters (Phase 02 §8.5); minimal UI-store (sheets/drawers) — **no Redux**.
- i18n: message catalogs (next-intl) — English MVP, structure for `ne` [V1.5] (Phase 02 §3.1 Devanagari fallback).
- Analytics client: consent-gated event batcher (PRD §34 AN-01/AN-02) → `/v1/track`.

### 1.2 Rendering strategy (per surface)

| Surface | Mode | Reason |
|---|---|---|
| Home, category hubs, destination hubs, guides, about/legal | **SSG/ISR** (revalidate: time 5 min + **on-demand** via API publish-event → `POST /api/revalidate` (secret-authenticated)) | PRD SEO (§32.3) + speed |
| Service detail (all lines) | **ISR** (on-demand revalidation on service/price/availability events; stale-while-revalidate) | SEO + fresh data |
| Search results | **SSR** (server component calling API with query params) + client facet interactivity | Shareable URLs (RM-01) + instant first paint |
| Auth pages, quote deep links | **SSR** (light) | State-aware render, fast |
| My Trips, Account, Wishlist | **SSR shell + RSC data** (auth via cookies server-side) | PII never in client bundle |
| Checkout, booking wizard, custom-trip builder, offer view | **CSR** (interactive, React Query) | Multi-step state, optimistic UI (safe ops only, Phase 02 LD) |
| Vendor portal, Admin console | **CSR under authenticated shell** (React Query everywhere) | App-like density |
| Error/404/500 pages | SSG | Phase 02 §8.18 |

### 1.3 Data & auth on the web

- **Typed API client** generated from OpenAPI (orval/openapi-typescript) — no hand-written DTOs drift (CI drift test).
- **BFF-lite:** Server Components fetch the API **server-side** using the session (httpOnly refresh cookie present in RSC request context) — PII/bookings/PII-sensitive data never appears in client payloads. Client components call the API only for interactive mutations (short-lived access token kept in memory, refreshed via cookie flow; **no JWT in localStorage**).
- Auth flows (login/register/OTP/MFA) are server actions/routes — cookie set/clear server-side only.
- No secrets in the browser: only `NEXT_PUBLIC_*` allowlisted vars (CI-enforced allowlist, §25).
- Webhooks and provider calls **never** go through the web app (API-only, §3).

### 1.4 Performance & quality budgets

- LCP < 2.5 s (4G mobile, p75), CLS < 0.1, INP < 200 ms (PRD §32.3): route-level code splitting, ISR, image pipeline, font subsetting, `next/link` prefetch, streaming for long detail pages (shell → media → reviews async).
- Lighthouse CI in pipeline (per-surface budgets); client error capture + Web Vitals → analytics events (consent-aware).
- Tests: Vitest + RTL (component contracts incl. Phase 02 state-coverage checklist §11.2), Playwright E2E for the 8 critical flows (search→book, quote, pay, cancel/refund, review, vendor confirm, admin approve, corporate approval), visual regression [V1.5].
- A11y: axe checks in CI + Phase 02 §10 gates; keyboard/screen-reader passes per release.

---

## 2. Backend Architecture

### 2.1 Framework & layering

NestJS 11, TypeScript strict. Each module is internally layered:

```
transport     REST controllers, DTO (Zod), webhooks, guards/decorators
      │
application   use-case services: orchestration, transactions, idempotency,
      │      authorization checks (permission + object scope), event emission
      │
domain        entities, state machines (table-driven), invariants,
      │      pure logic — no framework imports
      │
infrastructure  Drizzle repositories (module-owned tables only), Redis,
                S3, provider adapters (payments, email, …), media pipeline
```

Rules: `domain` imports nothing above it; `infrastructure` implements interfaces declared in `application` (dependency inversion for providers/repositories); controllers contain no business logic (thin: parse → command → result).

### 2.2 Module system & boundaries

- One Nest module per PRD Phase 03 module list (§21) + a foundational `catalog` module (base `Service` entity shared by all line modules) + infrastructure modules (`events`, `jobs`, `media`, `storage`, `config`, `telemetry`).
- **Facade-only access:** each module exposes a public facade service; cross-module calls go through facades only. Enforced by: import-boundary lint rules, circular-dependency ban, module ownership map in CI (table prefix → module), code-review checklist.
- **Events over direct calls for side effects:** state changes emit domain events (outbox, §12.4); other modules react (notifications, reindex, rollups, analytics). Commands stay synchronous (booking command → immediate result).
- **State machines** (booking, offer, refund, vendor approval, payment intent, settlement): implemented as data (states, transitions, guards, allowed actors) + a small interpreter in the owning module; **exhaustive transition unit tests** (every transition + every illegal transition rejected).

### 2.3 Consistency & concurrency

- Single DB ⇒ single-transaction units of work per command; no cross-DB transactions.
- Availability decrements: optimistic locking (`version` column, `UPDATE … WHERE version = $n`); oversell ⇒ vendor-fault path (PRD §10.5/BK-7), never silent success.
- Money invariants: computed in app layer with integer math (T-9); price/policy snapshots frozen on booking (immutable JSONB).
- Idempotency: `Idempotency-Key` header for money/state commands (§3.6); DB idempotency store (source of truth) + Redis fast path.
- Outbox (T-6): `outbox` table written in the same transaction as state changes; dispatcher publishes to in-process bus + BullMQ queues.

### 2.4 Cross-cutting infrastructure (common/)

- Validation pipeline (Zod, shared schemas), global exception filter + error codes (§17), idempotency middleware, permission guard (§6), audit interceptor (PRD §33.4), request context (pino child logger + trace), pagination/sort/filter helpers (cursor), rate-limit middleware (§11), PII masking (serializer-level, §14).

### 2.5 Testing strategy (api)

| Layer | Tool | Coverage focus |
|---|---|---|
| Unit | Jest | domain 100% transition coverage; services with in-memory fakes; state machine exhaustiveness |
| Integration | Jest + Supertest + **Testcontainers** (Postgres 16, Redis 7) | auth flows, RBAC matrix (role × route class), booking e2e with **mock payment provider** (SPI, dev-only), webhook signature/replay/out-of-order, idempotency replays, oversell concurrency, migration upgrade path |
| Contract | OpenAPI diff gate + client drift test | breaking-change detection (§24) |
| E2E (api) | Playwright API mode against staging | sandbox payment round-trip, settlement dry-run |

---

## 3. API Architecture

### 3.1 Style & hosting

- REST/JSON, resource-oriented, single API host (`api.` subdomain), OpenAPI 3.1 generated from code (single source of truth = code + Zod schemas).
- Three API families under one version root: customer `/v1/…`, vendor `/v1/vendor/…`, admin `/v1/admin/…` (same contract discipline, different permission scopes).
- OpenAPI published: staging (public for partner dev), production (auth-restricted only).

### 3.2 URL conventions

- `/v1/{resource}` list + `/v1/{resource}/{id}`; nesting ≤ 1 level for genuine child resources (`/v1/bookings/{id}/offers`, `/v1/bookings/{id}/refund`); line catalog at top level (`/v1/tours`, `/v1/hotels`, `/v1/vehicles`, `/v1/transfers`, `/v1/trekking`, `/v1/packages`, `/v1/flights`, `/v1/transportation`).
- Query conventions: `?cursor=`, `?limit=` (default 25, max 100), `?sort=`, structured filter params (typed per line, Phase 02 §8.5); filter state fully expressible in URL (shareable, PRD RM-01).
- ETag + `If-None-Match` on catalog detail/list (304 support for ISR/bots).

### 3.3 Response envelope & errors

```
success:  { "data": … }                       lists: { "data": […], "page": { "nextCursor": … } }
error:    { "error": { "code": "ETN-BK-103", "message": "…", "details": {…}, "requestId": "…" } }
```

- Stable error codes `ETN-{DOMAIN}-{NNN}` + user-safe message + `requestId` on every error (Phase 02 ER-01); full catalog in §17; no stack traces, no raw provider text.
- HTTP mapping: 400/422 (validation, field map in `details.fields`), 401, 403, 404 (existence-hidden for scoped resources), 409 (state conflicts), 422 (business rules), 429, 500/502/503.

### 3.4 Endpoint inventory (grouped)

| Area | Example endpoints |
|---|---|
| Auth | `POST /v1/auth/login|register|logout|refresh|reset-request|reset-confirm|otp/*|mfa/*`, `GET /v1/auth/me` |
| Customer | `GET /v1/customers/me`, `PUT …/me`, wishlist `GET|POST|DELETE /v1/customers/me/wishlist(/{id})`, notifications `GET /v1/customers/me/notifications`, `PATCH …/read` |
| Catalog (per line) | `GET /v1/tours` (+filters), `GET /v1/tours/{slug}` (SEO), same for trekking/hotels/vehicles/transfers/packages/transportation/flights (search), `GET /v1/destinations(/{slug})`, `GET /v1/guides(/{slug})` |
| Search | `GET /v1/search` (global; line/destination/date/party/price/rating/sort), `GET /v1/search/facets` |
| Booking | `POST /v1/bookings` (mode: instant/quote/custom; idempotency), `GET /v1/bookings(/{id})`, `POST /v1/bookings/{id}/cancel`, `POST /v1/bookings/{id}/reschedule-request`, `GET /v1/bookings/{id}/voucher.pdf`, `GET /v1/bookings/{id}/itinerary` |
| Quotes/offers | `GET /v1/bookings/{id}/offers`, `POST /v1/quotes/guest` (no auth), guest offer view `GET /v1/quotes/{token}` |
| Payments | `POST /v1/payments/intents` (server-priced), `GET /v1/payments/intents/{id}`, `POST /v1/payments/intents/{id}/retry` |
| Reviews | `POST /v1/reviews` (eligibility server-side), `GET /v1/services/{id}/reviews`, `POST /v1/reviews/{id}/flag` |
| Custom trip | `POST /v1/custom-trips` (draft), `GET|PUT /v1/custom-trips/{draftId}`, `POST /v1/custom-trips/{draftId}/submit`, offers via bookings |
| Corporate | `POST /v1/corporate/orgs`, `GET /v1/corporate/me/org|members|policy`, `POST /v1/corporate/approvals/{id}/decision`, `GET /v1/corporate/expenses.csv` |
| Vendor | `/v1/vendor/dashboard|services(/{id})|availability|bookings(/{id})|offers|earnings|settlements|documents|reports…` |
| Admin | `/v1/admin/approvals|bookings|payments|refunds|settlements|customers|vendors|disputes|content|geo|reports|audit|settings…` |
| Uploads | `POST /v1/uploads/init` → presigned PUT → `POST /v1/uploads/confirm` (§8) |
| Analytics | `POST /v1/track` (consent-gated, rate-limited) |
| Webhooks (inbound) | `POST /v1/webhooks/payments/{provider}` (signature-verified, replay-protected) |
| Ops (unversioned) | `GET /healthz`, `GET /readyz`, `GET /metrics` (network-restricted), `POST /api/revalidate` (web, secret-authenticated) |

### 3.5 Webhooks (inbound)

- Provider-only routes; no auth cookie — **HMAC signature verification** + replay store (`webhook_seen`, 48 h) + out-of-order tolerance (state guards); processing is **synchronous inline** (money-critical, §11.4); only non-critical follow-ups queue.
- Outbound partner webhooks: `[V2]` (signed, idempotent delivery, event types versioned).

### 3.6 Idempotency, pagination, rate limits

- `Idempotency-Key` required for: booking create/transition, payment intent create/cancel, refund create, offer accept, bank-transfer verify, vendor approve actions. Semantics: same key + same body → stored response (24 h); same key + different body → 422.
- Cursor pagination everywhere (stable under writes); no offset APIs in v1.
- Rate-limit tiers (Redis sliding window, §11): anonymous (global + per-IP), authenticated (per-user), strict (auth endpoints: 5/15 min; OTP: 3/15 min per identifier), payment endpoints (per-user + per-IP), admin (per-role); headers `X-RateLimit-*`; 429 with `Retry-After`.

### 3.7 Versioning → §24 (full strategy).

---

## 4. Database Architecture

### 4.1 Engine & organization

- PostgreSQL 16 (managed, Multi-AZ, PITR 5-min / 35-day retention); **single logical database**, single schema, **table prefixes per module** (T-3). Boundaries are code-enforced (§2.2), not schema-enforced (RRL/RLS evaluated `[V2]`, §6.5).
- Drizzle ORM: typed schemas per module in `packages/database` (owned by the module), migrations (drizzle-kit) versioned and reviewed; SQL escape hatch allowed for FTS/complex queries (documented per query).
- Naming: `snake_case`; every table: `id` (ULID, sortable), `created_at`, `updated_at` (UTC timestamptz); status where applicable; FK `ON DELETE` explicit per relationship.

### 4.2 Module → table ownership (prefixes)

| Module | Prefixes / key tables |
|---|---|
| auth | `auth_session` (refresh families), `auth_idp_account` (Google/OTP future), `mfa_enrollment`, `otp_issue`, `audit_log`, `idempotency_key`, `outbox` |
| users | `user` (identity: email, phone, country, password_hash, status, verification levels), `user_verification_event` |
| customers | `cust_profile` (display name, preferred currency/locale), `cust_guest_contact` (quote w/o account + signed token), `cust_wishlist_item` |
| vendors | `ven_org`, `ven_user` (membership + org role), `ven_capability` (line, status, expiry), `ven_document`, `ven_bank` (finance-scoped, verified flag), `ven_payout_detail` |
| corporate | `corp_org`, `corp_user`, `corp_policy`, `corp_approval` |
| destinations | `geo_country`, `geo_state`, `geo_district`, `geo_city` (→ generalized `geo_node` w/ type+parent, §27), `geo_alias`, `geo_airport`, `dst_destination` (hub: geo ref, slug, content, seo, ops_rank) |
| content | `cms_guide`, `cms_banner`, `cms_help`, `cms_localized` [V1.5] |
| catalog (core) | `srv_service` (vendor, line, status, destination, geo points, title/slug, description, seo_json, flags instant/quote, version), `srv_media`, `srv_addon`, `price_surcharge` (date-based), `tax_config`, `fx_rate` |
| vehicles | `veh_fleet_vehicle` (make/model/class/seats/fuel/year/plate_masked/self_drive), `veh_rate` (per-day, KM limit, overtime, fuel/driver policy) |
| transfers | `trf_route` (origin/dest, type, est duration), `trf_service` (route, vehicle class, mode), `trf_window` (date, window, capacity, sold) |
| transportation | `trp_service` (charter route/date capacity) |
| hotels | `htl_property`, `htl_room_type`, `htl_rate_plan` (per-night, min stay, meal, cancel policy ref, tax flag, capacity) |
| tours | `tour_service` (duration, min/max, languages, meeting), `tour_inclusion` (structured ✓/✕), `tour_departure` (date, seats, sold) |
| treks | `trek_attr` (difficulty, nights, season tags, permits flags, accommodation), `trek_departure` |
| packages | `pkg_service` (components refs, style flags family/corporate, per-person pricing) |
| flights | `flt_route` (curated route catalog + IATA refs) |
| availability (shared by lines) | `av_count` (entity, date, capacity, sold, version) — daily granularity; `av_departure` (dated seat capacity) — used by tours/treks/packages/transfers-scheduled |
| quotes | `qtr_request` (inputs, routing, status), `qtr_offer` (booking, version, total, breakdown_jsonb, terms, valid_until, state) |
| bookings | `bk_booking` (mode, state, vendor, service, trip_group, price_snapshot_jsonb, policy_snapshot_jsonb, scheduled start/end local + tz, idem ref), `bk_event` (transition audit), `bk_timer` (SLA timers, §12.3), `bk_traveler` (name, dob, `passport_enc`, nationality), `bk_document` (e-ticket, voucher), `bk_group` (trip group) |
| payments | `pay_method` (user, provider, token_ref, last4, brand), `pay_intent` (booking, amount_minor, currency, state, provider_ref, expires), `pay_charge` (provider ref, fx rate, charged amount/currency), `pay_ledger_entry` (account, amount, currency, ref_type/ref_id, memo, prev_hash [V1.5]), `pay_settlement` (vendor, period, gross, commission, refunds, net, state), `pay_payout`, `pay_recon_run` [V1.5] |
| refunds | `ref_refund` (booking, amount, state, method, provider_ref, timeline, policy ref), `ref_case` (vendor-mediated status, agency SLA) |
| reviews | `rev_review` (booking, service, rating, text, state), `rev_photo`, `rev_reply`, `rev_report`, `rev_aggregate` (service, avg, count, histogram_jsonb, updated_at) |
| notifications | `ntf_notification` (user, type, title, body, data, read_at), `ntf_preference`, `ntf_suppression`, `ntf_delivery_log` |
| disputes | `dsp_dispute`, `dsp_evidence` |
| search | `srch_keyword_alias` (ops typo/variant map) |
| ai-planner | `ai_session_meta` (V2: budget, cost, state), `ai_feedback` (ops sampling) |
| reports | `rpt_kpi_rollup` (day, scope, metric, value), `rpt_funnel_daily` |
| admin | `adm_feature_flag`, `adm_setting` (commission per line, SLA defaults, capability matrix overrides, template config) |
| analytics | `ana_event` (**monthly partitioned**), `ana_session` (pseudonymous) |

### 4.3 Entity & consistency rules

- DB-01 **Money:** `BIGINT` minor units + `currency` (ISO) columns (T-9); no NUMERIC for balances; app-side integer math; snapshots (`price_snapshot_jsonb`, `policy_snapshot_jsonb`, `qtr_offer.breakdown_jsonb`) immutable after creation (PRD PR-08).
- DB-02 **State:** booking/offer/refund/payment/settlement states are single-column enums changed **only** via owning-module commands (BR-3); every transition also appends `bk_event`/module event table (append-only).
- DB-03 **Availability:** `av_count`/`av_departure` rows carry `version`; decrement `UPDATE … WHERE version=$n`; capacity ≤ 0 ⇒ row locked-out (not deleted); published-only rule enforced in the booking command (GC-3).
- DB-04 **PII:** encrypted columns (`passport_enc`, `mfa_enrollment.secret_enc`, `ven_bank` details) — app-level AES-256-GCM, data keys from KMS (env key ref); never in logs/events/ledger memos; masked in API responses (PRD §33.3).
- DB-05 **Audit:** `audit_log` append-only (no UPDATE/DELETE grants), actor + role + action + entity + before/after hash + IP + ts (PRD §33.4).
- DB-06 **Outbox:** `outbox` (id, aggregate_type/id, event_type, payload_jsonb, created_at, published_at, attempt) — same transaction as state change (T-6).

### 4.4 Indexes (hot paths)

| Table | Indexes |
|---|---|
| `srv_service` | unique(slug); (line, status, destination_id); GIN tsvector (generated); GIN trgm (title, slug); (vendor_id, status); (created_at desc) |
| `bk_booking` | (state); (vendor_id, created_at desc); (trip_group_id); (contact_user_id, created_at desc); (pay_intent_ref) unique partial (where state in pay-states) |
| `av_count` / `av_departure` | unique(entity_id, date); (entity_id, date) with `sold < capacity` partial for search |
| `pay_ledger_entry` | (ref_type, ref_id); (account, ts); BRIN (ts) |
| `ana_event` | partition by month (ts); (name, ts); BRIN (ts) |
| `audit_log` | (actor_id, ts desc); (entity_type, entity_id, ts desc); BRIN (ts) |
| `qtr_offer` | (booking_id, version desc); (state, valid_until) for expiry timer |
| `ntf_notification` | (user_id, created_at desc) partial (read_at IS NULL) for badge count |
| `rev_aggregate` | unique(service_id) |
| `bk_timer` | (state, due_at) — timer sweep scan (§12.3) |

### 4.5 Partitioning, retention, growth

- `ana_event`: monthly partitions, 13 months hot, then detached to cold storage/archive (PRD §34 retention); `ntf_notification`: purge > 90 days (job); `audit_log`: 1-year retention policy (legal confirm), quarterly partitioning `[V1.5]` if volume warrants.
- Growth math: MVP ≈ < 10M rows/yr; single-region Postgres is adequate to V2 international pilot; **scale triggers documented** (not preempted): read replica when read p95 > 300 ms sustained or DB CPU > 70 %; partitioning for `pay_ledger_entry` if > 100M rows; no sharding in plan (revisit only with multi-region, FUT).

### 4.6 Migrations, seeds, backups

- Migrations: numbered, expand/contract (T-12); CI runs against **fresh DB** and **N-1 upgrade path**; destructive changes two-phase (flag old writes off → migrate → enable new writes).
- Seeds (idempotent, versioned, separate from migrations): geo tree (7 provinces / 77 districts / cities / airports — curated, PRD C-8), service lines, `tax_config` (Nepal 13 % example — config, GC-1), `fx_rate` initial rows (manual, labeled source), feature flags, default SLAs.
- Backups: PITR 5 min + daily snapshot, 35-day retention; **quarterly restore drill** (PRD §33.1) to a throwaway instance; cross-account backup export `[V1.5]`.

---

## 5. Authentication Architecture

### 5.1 Methods & levels (aligned to PRD §16)

| Method | Version | Notes |
|---|---|---|
| Email + password (Argon2id) | MVP | OWASP baseline: m = 19 456 KiB, t = 2, p = 1 (decision E-5 for tuning) |
| Email OTP (verification, reset) | MVP | 6-digit, 10-min expiry, single-use, rate-limited (3/15 min per identifier) |
| TOTP MFA | MVP (admin **required**), customer `[V1.5]` | RFC 6238, 30 s, ±1 window, enrollment QR |
| Google OAuth | `[V1.5]` | via `auth_idp_account` (provider, subject) + email-match linking |
| Phone OTP (login + verification) | `[V1.5]` | E.164, intl codes (GC-1) |
| Guest (no account) | MVP | quote requests only; contact + signed one-time deep-link token (24 h) |

### 5.2 Token & session model

- **Access:** JWT, 15 min, HS256 (MVP; rotation runbook 180 d — decision E-5), claims minimal (`sub`, `roles`, `org_id?`, `mfa_verified` (admin step-up), `exp/iss/aud/jti`); **no PII in claims**; kept in memory on client; RSC uses it server-side derived from the cookie session.
- **Refresh:** opaque 256-bit token, 30 d, **stored hashed** in `auth_session` (family + user + device fingerprint + IP hash + issued/rotated/released flags); **rotated on every use**; **reuse detection** ⇒ revoke entire family + security event + audit.
- **Transport:** refresh in `httpOnly; Secure; SameSite=Lax` cookie on app root domain; access never persisted client-side; logout = revoke family + clear cookie; "log out everywhere" = revoke all families.
- **Session policies:** customer max 5 active families (evict oldest, notification); admin 1 per fingerprint (second concurrent ⇒ warn + audit); admin access requires TOTP step-up (verified flag valid 5 min for privileged routes, re-prompt after 15 min idle — §6.6).

### 5.3 Login hardening

- Rate limiting (5/15 min per IP **and** per identifier, progressive lockout), breach-list check (decision E-3: HIBP k-anonymity range API vs local list), password policy (min 10, no known-breach, complexity light), audit on all events (success/fail/MFA/reset/lockout), generic failure message (no user enumeration: same response for unknown user vs bad password).

### 5.4 Flows (key sequences)

- **Login:** verify credentials → (admin: TOTP challenge) → issue access + set refresh cookie (new family) → audit.
- **Refresh:** `POST /v1/auth/refresh` (cookie) → rotate → new access; reuse ⇒ family revocation + alert.
- **Register:** email+password → `otp_issue` (verify email) → account `EMAIL_VERIFIED` (PRD CV-01 canonicalization/dedup on commit).
- **Reset:** request (rate-limited; constant-time response whether or not email exists) → single-use 30-min token (hashed) → confirm → revoke all families.
- **Step-up (sensitive admin actions):** password or fresh MFA if session idle > 15 min (configurable).

### 5.5 Provider extensibility

`auth_idp_account(user_id, provider, subject, created_at)` + linking flow (email match, verified-email required) — schema ready now; Google/phone feature `[V1.5]` (PRD CV-04, no invented providers in MVP).

---

## 6. Authorization Architecture

### 6.1 Roles & permissions

Roles: `CUSTOMER`, `VENDOR`, `ADMIN_SUPER`, `ADMIN_OPS`, `ADMIN_FINANCE`, `ADMIN_SUPPORT`, `TRIP_DESK` (PRD §5 + corporate org-roles separate, §6.4).

Permission catalog (string permissions, mapped per role; deny-by-default):

| Permission | SUPER | OPS | FINANCE | SUPPORT | TRIP_DESK | VENDOR | CUSTOMER |
|---|---|---|---|---|---|---|---|
| `vendors:approve` / `vendors:suspend` | ✓ | ✓ | | | | | |
| `bookings:read:all` / `bookings:intervene` (force-cancel, extend) | ✓ | ✓ | ✓(read) | ✓(read) | | | |
| `payments:verify-bank` / `refunds:approve` / `settlements:manage` | ✓ | | ✓ | | | | |
| `customers:manage` / `corporate:kyc` | ✓ | ✓ | | ✓ | | | |
| `content:manage` / `geo:manage` / `destinations:manage` | ✓ | ✓ | | ✓(help only) | | | |
| `disputes:manage` | ✓ | ✓ | ✓(finance outcome) | ✓(case work) | | | |
| `reports:finance` / `reports:ops` | ✓ | ✓(ops) | ✓(finance) | | | | |
| `settings:write` (commission, SLAs, flags, fx) | ✓ only | | | | | | |
| `audit:read` | ✓ | ✓ | ✓ | | | | |
| `tripsdesk:work` (quote routing, offer threads, custom-trip coordination) | | | | | ✓ | | |
| `vendor:*` (own org) | | | | | | ✓ (org-scoped) | |
| `customer:*` (own) | | | | | | | ✓ (self-scoped) |

### 6.2 Enforcement layers (all required, fail-closed)

1. **Route guard:** permission check via route metadata (decorator) → 403 + audit on deny.
2. **Object scope policy:** resolver determines scope (`own` / `org` / `all`): customer sees own only; vendor sees own org only; admin sees `all` (or scoped by role); **cross-scope reads return 404** (no existence leak) except admin.
3. **Repository scope injection:** every query in scoped modules passes a `Scope` (user/org) parameter; repository base enforces the `WHERE`; unit tests assert scope injection (a query without scope is a compile/test error pattern).
4. **Sensitive-action step-up** (§5.2/§5.4).

### 6.3 Boundary rules

- AZ-01 Unknown permission ⇒ deny + audit.
- AZ-02 Vendor org isolation: all vendor tables carry `org` scoping via `ven_user` membership; sub-user roles within vendor org: `OWNER` / `ADMIN` / `STAFF` (permission sub-matrix, e.g., STAFF cannot see earnings).
- AZ-03 Corporate org isolation (PRD §24 CO-08): same pattern over `corp_user`; members see own + org-shared bookings only.
- AZ-04 Trip desk scope: sees quote/custom-trip work items + vendor offer threads (read + coordination actions), **no** financial tables, no customer PII beyond contact needed for coordination.
- AZ-05 Admin action ⇒ audit (PRD AR-3); settings changes ⇒ audit + changelog entry in console.

### 6.4 Corporate roles (separate system, PRD §24)

`corp_org` roles: `OWNER` (manage members/policy), `APPROVER` (decide), `BOOKER` (create), `VIEWER` (read) — enforced inside `corporate` module; booking commands validate role **and** approval state (CO-03: payment only after approval) server-side.

### 6.5 Postgres RLS

Not used in MVP (app-level scoping + exhaustive RBAC integration tests: role × route-class matrix). **Evaluate RLS as defense-in-depth for vendor/corp isolation `[V2]`** (low effort given clean org columns).

### 6.6 Step-up & sessions for admin

Admin MFA at login (required); privileged routes (refunds approve, force-cancel, settings write, vendor approve/suspend) require `mfa_verified` within 5 min + password re-entry if idle > 15 min; concurrent admin sessions capped (PRD AR-4).

---

## 7. Payment Architecture

### 7.1 Provider SPI & capability matrix

```
PaymentProvider (interface)
  capabilities(): { methods, currencies, supports3DS, refund: {auto, limits}, chargebackWebhook, modes }
  createIntent(bookingRef, amountMinor, currency, descriptor, customerRef) → { sessionUrl | qr | reference, intentRef }
  getIntent(intentRef) → status          cancelIntent(intentRef)
  refund(chargeRef, amountMinor) → refundRef      getRefund(refundRef)
  verifyWebhook(rawBody, signature) → event?     (all providers; bank-manual = internal adapter)
```

- Adapters (MVP candidates, **none assumed working until sandbox gate passes**, PRD C-1/C-2, GC-2): `esewa`, `khalti` (domestic wallets), `nch-connectips` (domestic cards), `intl-acquirer` (international cards — decision D2), `bank-manual` (internal: PENDING_MANUAL state + admin verification action, §7.4).
- **Capability matrix** stored in `adm_setting` (per provider: methods enabled per environment, currencies, refund support, test-mode flag) — drives: `PaymentMethodPicker` rendering (Phase 02 §8.5), refund routing (auto vs manual, PRD RF-01), and settlement reporting. UI copy generated from verified capabilities (PRD §14.3) — never from assumptions.
- A **mock provider** (same SPI) exists for local dev + integration tests only; config guard hard-disables it in staging/production (build-time + runtime check).

### 7.2 Payment flow (authoritative sequence)

```
checkout (web, CSR)
  → POST /v1/payments/intents  (bookings module supplies amount from price snapshot — server-only, GC-4)
      → payments: create pay_intent (CREATED) → provider.createIntent (PROCESSING)
  → customer completes at provider (redirect/QR)
  → provider webhook → /v1/webhooks/payments/{provider}
      → signature verify + replay check (webhook_seen) + idempotent handler
      → pay_intent SUCCEEDED → ledger entries (PAYMENT) → emit payment.succeeded (outbox)
  → bookings (event consumer): PAID → vendor notify (SLA clock starts)
  → fallback: job scans PROCESSING intents > 2 min → provider.getIntent → reconcile
```

- **Race protection:** if booking left pay-state (e.g., auto-cancelled on expiry) before webhook ⇒ **auto-refund job** (customer never owes) + admin-visible event (PRD §19.7).
- Failure: `pay_intent FAILED` with mapped provider reason → UI `PaymentState failed` (Phase 02 §8.5); retries: new intent per attempt (×3 in session); no client-initiated "did it work" (PRD PY-04 fallback is server query only).

### 7.3 Ledger (money integrity core)

- `pay_ledger_entry` (append-only, T-9, hash-chained `[V1.5]`): accounts `booking_receivable`, `vendor_payable`, `platform_commission`, `tax_collected`, `refund_asset`, `settlement`, `adjustment`.
- Entry rules (atomic per event): **PAYMENT** (+receivable; +vendor_payable (1−c); +commission c; +tax per split), **REFUND** (mirror), **SETTLEMENT** (vendor_payable → payout), **ADJUSTMENT** (admin, reason + audit, SUPER/FINANCE only).
- Commission computed **once at payment** from `adm_setting` line config (PRD CM-01/CM-02), recorded on the entry (no later recomputation); refund ⇒ pro-rata reversal entries (PRD CM-06/07).
- **Writes:** only `payments` (and `refunds` via payments facade for refund entries) — BR-2. Reads: scoped queries for reports/vendor earnings (PRD §31).

### 7.4 Bank transfer (manual verification)

- Intent `PENDING_MANUAL` with booking reference + instructions (account details from config); 48 h expiry timer (§12.3) → auto-cancel (PRD §10.7).
- Admin verify action (FINANCE, step-up): reference + amount both matched (idempotent; duplicate reference blocked) → SUCCEEDED → ledger; reject → intent CANCELED + booking auto-cancel + notification.
- Audit + delivery log entries on every verify attempt.

### 7.5 Refunds, chargebacks, settlement

- **Refunds (module `refunds`):** auto path (policy-computed full + provider auto-capable) vs manual (partials, bank-paid, air vendor-mediated — PRD §14); calls `payments.provider.refund`; ledger mirror + commission reversal atomic; state machine `REQUESTED→APPROVED→PROCESSING→COMPLETED|REJECTED`; customer timeline copy honest (PRD RF-05).
- **Chargebacks:** provider webhook ⇒ freeze further auto-refunds on that charge + open admin case (PRD §19.6); resolution ⇒ ADJUSTMENT entries + settlement clawback (PRD CM-08).
- **Settlement:** weekly job → per-vendor `pay_settlement` (gross − commission − refunds − holds) with holds per line (air 30 d, suspension holds — PRD CM-03) → `APPROVED` (FINANCE) → `pay_payout` (MVP: recorded manual bank transfer; auto `[V1.5]`); negative settlement ⇒ vendor debt carried (PRD SM-06).
- **Reconciliation:** MVP manual CSV (provider statement vs ledger, documented procedure) → `[V1.5]` job + variance queue (`pay_recon_run`).

### 7.6 Security & resilience

- SAQ-A posture (redirect/tokenized; no PAN — store `last4` + brand + provider token ref only); webhook secrets per provider (rotation runbook); rate limits on payment endpoints (§3.6); fraud heuristics (velocity/anomaly → manual review queue) `[V1.5]`.
- Provider outage: intent creation retried with backoff; bookings remain `AWAITING_PAYMENT` with countdown; runbook (PRD §19.4/§19.7); circuit breaker per provider op (§17.3).
- Multi-currency: intent in NPR (domestic) or provider FX (intl cards): `pay_charge` stores charged amount + currency + provider FX rate; ledger in NPR-normalized entries (dual record, PRD §19.5 PY-07).


---

## 8. File Storage

### 8.1 Buckets & access

| Bucket | Content | Access |
|---|---|---|
| `etn-private` | Vendor documents, PII-adjacent files, internal | API service role only; presigned GET (15 min, access-logged, single-use flag for sensitive) |
| `etn-media` | Public service/guide/review images (derivatives), OG images | Public read via **CDN**; invalidation on replace |
| `etn-media-orig` | Originals (preserved, private) | API service role; retained per retention policy |
| `etn-uploads-tmp` | Presigned upload landing zone | Presigned PUT (15 min); lifecycle delete 24 h |

- Object keys: `{domain}/{entity}/{id}/{uuid}[.{variant}].{ext}` (media derivatives: `…/{uuid}-{w}x{h}.avif`); random names, never user-supplied.
- No public write, ever; bucket policies deny non-service principals; CDN origin-authenticated.
- Vendor share links (PII docs → vendor portal, PRD §30.4 TD-02): expiring presigned URLs (72 h default), access-logged, revocable (PRD §33.6).

### 8.2 Upload flow (all uploads, one path)

1. `POST /v1/uploads/init {purpose, filename, contentType, size}` → server validates against **upload policy table** (purpose ⇒ allowed types, max size, max dimensions, per-org quota) → presigned PUT to `etn-uploads-tmp` (Content-Type locked).
2. Client PUTs directly to S3 (no data through API).
3. `POST /v1/uploads/confirm {uploadId}` → server verifies object exists, magic-bytes match declared type, size within policy (PRD §33.1) → moves to domain bucket → returns stored key → module stores reference.
4. Failures: unconfirmed uploads GC'd by lifecycle (24 h); confirm mismatches rejected with specific codes; quota exceeded ⇒ 413 + guidance.

**Upload policy (MVP values, admin-adjustable):** vendor docs PDF/JPG/PNG ≤ 5 MB; service media JPG/WEBP ≤ 8 MB ≤ 4000 px; review photos JPG/PNG ≤ 5 MB; corporate KYC docs PDF ≤ 10 MB.

### 8.3 Lifecycle & retention

- Immutability: replace = new object (old kept per retention, never overwritten).
- Retention: service media deleted 30 d after service `RETIRED` (audit); PII docs per data policy (24 mo post-fulfillment, PRD §30.4 TD-03); originals 90 d after derivatives verified (then per media retention).
- AV scanning hook for private docs `[V1.5]` (decision: provider AV vs self-hosted ClamAV-class); no executable content ever stored/served; `Content-Disposition: attachment` on private doc GETs.
- Quotas per vendor org (default 2 GB media, configurable) with usage surfaced in portal.

---

## 9. Image Processing

### 9.1 Pipeline (media queue)

```
confirm (private/tmp) → validate (type/size/dimensions) → EXIF strip + orientation
→ derivatives: 400 / 800 / 1200 / 1600 px widths · AVIF (q≈70) + WebP fallback
→ blur-up placeholder (16 px, low q)
→ write to etn-media-orig (original) + etn-media (derivatives) → CDN invalidation
→ media.ready event (service card unblocks)
```

- Engine: **sharp** (libvips) in the **worker** (not API — CPU isolation); concurrency cap + per-org rate limiting in queue; memory limits per job.
- Failure handling: retries ×3 (backoff) → keep original, mark media `FAILED`, UI shows placeholder (Phase 02 §4.6) + vendor notified; admin alert if org failure rate high.
- Review photos: processed to a **private** location until review is `VISIBLE` (then promoted) — never public pre-moderation (PRD §17.3).
- Vendor documents: **no processing** (original only, private) — integrity of legal docs.

### 9.2 OG images

- Deterministic generator (sharp + SVG template, brand tokens): 1200×630, per content type (service/destination/guide), title/price/vendor slots; cached per entity + version; fallback branded card (Phase 02 SO-03).

### 9.3 Boundaries

- No AI-generated imagery for catalog/brand (PRD C-12: original/licensed photography only); no watermarking (vendor ownership + license record per image in `srv_media`).
- Alt text stored per media (required, Phase 02 §4.6) — enforced at publish validation (catalog rule, PRD §6.1).

---

## 10. Search Architecture

### 10.1 MVP: Postgres-native (T-10)

- **Full-text:** generated `tsvector` columns (weights: title A, tags B, description C; english config), GIN-indexed; query = ranked FTS with `ts_rank`.
- **Fuzzy/typo:** `pg_trgm` GIN (similarity) on title/slug/aliases + ops `srch_keyword_alias` table (curated variants: "phewa" → Phewa Lake, PRD §20.5).
- **Structured filters:** indexed predicates per PRD §21 (destination, dates, price, rating, line-specific); **availability-aware date filter** joins `av_count`/`av_departure` for instant lines only; quote-only lines never date-excluded (PRD SE-04, UX §8.5).
- **Facets:** server-side counts over the filtered set; Redis-cached (key = hash(filter set); TTL 5 min + event invalidation; stale-while-revalidate 10 s) (PRD SE-02).
- **Ranking:** relevance + recency + review-weighted tie-break (PRD SE-03); sorts (price/rating/duration/newest) as explicit orders; availability-aware ranking `[V1.5]`.
- **Query surface:** one internal `SearchService` (query builder) powers `GET /v1/search` (global), all line list endpoints, and the SEO/ISR renderers (same data path, PRD §32).
- **Index maintenance:** generated columns update in-row (no batch reindex for edits); full reindex job (post-migration/monthly, off-peak, single-flight lock).
- **Performance:** p95 < 300 ms server-side (PRD SE-05) — enforced by query-plan review, covering indexes (§4.4), cursor pagination, slow-query alerts (§15); search read path has its own connection pool.

### 10.2 Swap path (documented trigger, not a rewrite)

`SearchProvider` SPI (query, facets, reindex, aliases) with `PostgresSearchProvider` (MVP). **Swap trigger:** sustained p95 > 500 ms, or multilingual search need `[V2]` → implement `MeilisearchProvider` or `OpenSearchProvider` (same contract; web app + API endpoints unchanged). Semantic/embedding search `[V2]` adds a rerank stage behind the same SPI (PRD SE-07, provider-gated, GC-2).

### 10.3 Multilingual `[V2]`

Localized content table (`cms_localized` / per-line title/desc per locale) + per-locale text-search config; Nepali Devanagari tokenizer config; content localization ops per PRD §32 SO-06.

---

## 11. Caching

### 11.1 Redis roles (managed, Multi-AZ)

| Role | Data | Persistence | Failure behavior |
|---|---|---|---|
| Rate limiting | sliding-window counters (per IP/user/tier, §3.6) | AOF everysec | **fail-closed** for auth/payment tiers (503), fail-open with alert for read tiers |
| Idempotency fast path | key → response ref (24 h) | AOF | fallback: DB `idempotency_key` (source of truth) |
| Webhook replay | seen event ids (48 h) | AOF | fallback: DB `webhook_seen` (source of truth) |
| Facet cache | filter-set → counts (5 min) | none (cache) | bypass to DB (breaker: 500 ms timeout → skip facets, keep results) |
| Config/geo cache | geo tree, lines, settings, capability matrix (10 min + flag invalidation) | none | read-through to DB |
| Feature flags | flag state (10 s) | none | read-through; env kill-switch always checked directly |
| Distributed locks | single-flight (timer sweep, reindex, settlement, OG gen) | none | lock loss ⇒ at-most-once risk bounded by idempotent jobs |
| OTP counters | attempt counts (short TTL) | AOF | fail-closed (reject, rate-limit default) |
| Queues (BullMQ) | job data + acks | AOF everysec | jobs pause + page (SEV2: lag; SEV1: payment-fallback queue) |

- Policy: `all-lru`; maxmemory set with headroom; **never cache money-critical computed values** (prices computed per request from DB; booking price locks live in `bk_booking`/draft rows) — GC-4.
- Invalidation: event-driven (service published/suspended, price changed, availability changed, settings change) + TTL backstop; versioned keys.

### 11.2 Database caching posture

- Hot catalog reads: application-level read-through for geo/lines/settings only; **booking/payment paths always read committed state** (no cache); list/search reads served by Postgres (+ Facet cache) — acceptable at MVP scale (§4.5), ISR absorbs public catalog load at the edge.

---

## 12. Background Jobs

### 12.1 Queue inventory (BullMQ)

| Queue | Consumers | Concurrency | Retry/backoff | DLQ | Latency target |
|---|---|---|---|---|---|
| `media` (image pipeline, OG) | worker | 4 | 3× exp | ✓ | < 30 s typical |
| `email-txn` | worker | 8 | 5× exp | ✓ | < 60 s |
| `email-bulk` (newsletter [V1.5]) | worker | 2 (rate-capped) | 3× | ✓ | < 10 min |
| `search-reindex` (bulk, backfill) | worker | 1 (lock) | 2× | ✓ | off-peak window |
| `payments-fallback` (status query, orphan cleanup, recon [V1.5]) | worker | 4 | 5× exp | ✓ (**SEV1 if lagging > 10 min**) | < 5 min |
| `timers` (sweep dispatcher, §12.3) | worker | 2 | n/a (claims rows) | n/a | 30 s cadence |
| `analytics-batch` | worker | 2 | 3× | ✓ | < 60 s (flush 10 s/5 ev) |
| `rollups` (daily KPI, aggregate recompute [V1.5]) | worker | 2 | 3× | ✓ | nightly 02:00 KTM |
| `exports` (CSV/XLSX async) | worker | 2 | 2× | ✓ | < 5 min / 100k rows |
| `cleanup` (purges, orphan intents, GC of tmp uploads) | worker | 1 (lock) | 2× | ✓ | daily |
| `settlement` (weekly batch) | worker | 1 (lock) | 2× | ✓ | Monday 06:00 KTM |

- Job contract: **idempotent handlers**, versioned payloads `{v, …}`, attempts ≤ max then DLQ (admin-visible: list, inspect, manual requeue, poison-pill cap); per-queue metrics (depth, lag, fail rate) → dashboards + alerts (§15).
- Worker deployment: separate service (same image, `worker` entrypoint), autoscaled on queue depth (CloudWatch), versioned with API (no long-lived queue payload compatibility concerns — deploys are minutes; payloads are versioned regardless).

### 12.2 Why queues for side effects, not for money movement

Webhook processing (payment success) is **synchronous inline** in the API (critical path, §3.5); queues carry everything that tolerates seconds of latency (notifications, media, rollups). This keeps the money path short and observable.

### 12.3 SLA timer pattern (durable, inspectable)

`bk_timer` table: `(id, subject_type/id, type, due_at, payload, state: PENDING|FIRED|CANCELED, fired_at)`; **sweep job every 30 s**: `SELECT … WHERE state='PENDING' AND due_at <= now() FOR UPDATE SKIP LOCKED` (batch 200) → dispatch domain command → `FIRED`.

Timer types (defaults per PRD §10.7/§8, all admin-configurable in `adm_setting`):

| Type | Due | Effect (command) |
|---|---|---|
| `DRAFT_EXPIRY` | +7 d | booking → CANCELLED (abandoned) |
| `PRICE_LOCK` | +15 min | invalidate cart lock (re-price) |
| `QUOTE_ESCALATION` | +24 h | trip-desk/vendor escalation + customer reassurance |
| `QUOTE_CLOSE` | +72 h | quote → CANCELLED (no response) |
| `OFFER_VALIDITY` | valid_until | offer expired → booking CANCELLED (OFFER_EXPIRED) |
| `PAYMENT_EXPIRY` (bank) | +48 h | intent CANCELED → booking CANCELLED (PAYMENT_EXPIRED) |
| `VENDOR_CONFIRM_REMINDER` | +12 h / +24 h | reminder; at 24 h customer may cancel penalty-free (PRD §8 SLA) |
| `TICKET_ISSUANCE_ESCALATION` | +24 h / +48 h | escalation; at 48 h auto-refund option (PRD §8) |
| `AUTO_START` | start + grace | CONFIRMED → IN_PROGRESS (line rules) |
| `AUTO_COMPLETE` | end + grace (line: 24 h hotel, 30 min transfer, final day trek) | → COMPLETED → review invite |
| `REVIEW_INVITE` | +1 d / +7 d post-completion | review invitation (window per PRD, default 365 d) |
| `DOCUMENT_EXPIRY` | T-30 / T-7 | vendor + admin reminders (PRD VA-06) |
| `CORP_APPROVAL_REMINDER` | +24 h | approver nudge (PRD CO-02) |

- Timers are **cancellable** (e.g., offer accepted cancels `OFFER_VALIDITY`), **adjustable by admin** (extend deadline — audited), and **durable across restarts** (the reason this beats in-memory timeouts — T-5).

### 12.4 Outbox dispatch (T-6)

- `outbox` rows published by dispatcher (API process, batch 100, every 5 s + on-write trigger): (a) in-process bus → same-process consumers (e.g., review aggregate recompute, notification preference resolution), (b) BullMQ enqueues → cross-process (notifications, reindex triggers, analytics, rollups feed).
- Publisher marks `published_at`; retries with backoff; stuck rows > 5 min ⇒ alert (SEV2). Consumers are idempotent (event id in dedup key).
- Canonical event catalog (typed in `packages/contracts`): `user.registered/verified`, `vendor.submitted/approved/rejected/suspended`, `service.published/suspended/retired`, `availability.changed`, `price.changed`, `quote.requested`, `offer.created/accepted/declined/expired`, `booking.created/state-changed/paid/confirmed/completed/cancelled`, `payment.succeeded/failed/refunded/chargeback`, `refund.created/processed/completed`, `review.submitted/visible/rejected`, `notification.delivered`, `corporate.approval.requested/decided`, `dispute.opened/resolved`.

---

## 13. Notifications

### 13.1 Pipeline

```
domain command (outbox event)
  → notification service: resolve recipients × channels (event catalog, PRD §18.2)
      → per recipient: preferences (ntf_preference; transactional class exempt)
        + suppression check (ntf_suppression) + rate guard (≤ 20 non-txn/h)
      → in-app: insert ntf_notification (synchronous with dispatch — durable record)
      → provider: enqueue (email-txn) → provider.send
  → delivery log (ntf_delivery_log: provider ref, status, attempts)
  → bounces/complaints (provider webhook) → suppression + audit
```

- Idempotency key: `outbox-event-id + recipient + channel` (mirrors PRD NF-01); retries 5× exp; DLQ + admin view.
- **Event → channel matrix** is configuration (PRD §18.2 table), versioned in code, admin-previewable `[V1.5]`.

### 13.2 Templates & locales

- Templates: versioned, **typed merge fields** (Zod-validated payloads; no free-form HTML from user input — PRD NF-06), locale-keyed (English MVP; Nepali `[V1.5]`, human-authored); plain-language copy per Phase 02 Appendix C.
- Transactional vs non-transactional classing: state-change/financial events are transactional (always sent, preference-exempt); everything else respects preferences + digest `[V1.5]`.

### 13.3 Providers & real-time

- `NotificationChannel` SPI: `send(message)`, deliverability webhook, test mode. Providers: email (MVP, PRD C-3), SMS `[V1.5]` (PRD C-4), WhatsApp official API via BSP `[V1.5]` (no unofficial channels — PRD §18.1), in-app (internal).
- Real-time: MVP = polling (app refresh on mount + tab-focus; badge count query). SSE for vendor booking inbox `[V2]` (no WebSocket infra in MVP — cost/complexity not justified at scale).
- Vendor/admin alerts (SLA breaches, webhook failures, document expiry) ride the same pipeline with role-scoped templates (PRD §18.2/§8 SLA table).


---

## 14. Logging

### 14.1 Operational logs

- **pino** (JSON) in api + worker + web (server side); per-request child logger (`requestId`), per-job (`jobId`), per-webhook (`webhookId`); fields: `ts, level, msg, module, route?, userId? (masked id), role?, durationMs, entity {type,id}?, traceId`.
- Levels: `info` default in prod (debug in staging, trace in dev only); structured levels for noisy paths (search queries at `debug`).
- **Correlation:** W3C `traceparent` (OTel, §15); booking flows carry `bookingFlowId` across API → worker → provider calls (where headers allowed) so one booking's history is one query.
- **Masking (hard requirement):** serializer-level redaction — PII patterns (email, phone, card, passport, tokens, passwords) replaced before write; provider payloads logged as redacted summaries only (never full bodies); no log-injection (values are data, not format strings).
- **Budgets:** no full request/response bodies in prod (headers + size + status); no catalog payloads; per-instance volume alert.

### 14.2 Audit log (distinct from operational logs)

| | Operational logs | Audit log (`audit_log`) |
|---|---|---|
| Purpose | Debugging, observability | Business accountability (PRD §33.4) |
| Store | Log service (30 d hot) | Postgres (append-only, 1 yr, legal-confirmable) |
| Written by | everywhere | permission-exercising actions: auth events, state transitions, admin actions, config changes, exports, file access, refunds, suspensions |
| Fields | §14.1 | actor (id+role), action, entity, before/after hash (+ diff for admin actions), IP, UA class, ts, correlation id |
| Integrity | best-effort | no UPDATE/DELETE grants; hash chain `[V1.5]`; SIEM export `[V1.5]` |

### 14.3 Shipping & retention

- Ship: OTel logs → observability backend (§15); dev: pino-pretty local. Retention: 30 d hot (cost), 12 mo cold (compliance events); audit per §14.2; export tooling for incident forensics (role-gated).

---

## 15. Monitoring

### 15.1 Stack

- **OpenTelemetry** (T-11) in api + worker + web-server: traces (auto-instrumented: HTTP, Postgres, Redis, provider SDKs), metrics (RED + business), logs (same pipeline).
- Backend: **managed observability platform (Datadog/New Relic/Honeycomb-class) for MVP speed** — decision E-2; OTel-native exporter keeps it vendor-swappable (self-hosted Grafana: Prometheus + Loki + Tempo, as the cost alternative); X-Ray-compatible trace format as fallback.
- Sampling: 10 % traces, 100 % for errors + payment flows; budget-aware (cost guardrails, §15.4).

### 15.2 Health & readiness

- `GET /healthz` (process alive — LB keepalive), `GET /readyz` (deps: DB ping, Redis ping, S3 head, queue reachable — LB routing), `GET /metrics` (Prometheus format, network-restricted).
- Deploy gates use `/readyz`; ECS service health checks 10 s interval, 3 failures ⇒ replace.

### 15.3 SLOs & alerts

| SLO (monthly) | Target | Error budget policy |
|---|---|---|
| API availability | 99.5 % | budget burn > 5 % in 30 min ⇒ SEV1 + freeze non-critical deploys |
| API p95 latency (excl. search) | < 500 ms | 1 h degradation ⇒ SEV2 |
| Search p95 | < 300 ms | 1 h ⇒ SEV2 |
| Checkout pipeline p95 (intent → confirmed or failed) | < 2 s | per-payment tracing always on |
| Payment webhook processing p99 | < 5 s | breach ⇒ SEV2; payment **success-rate drop > 10 % vs 24 h baseline** ⇒ SEV1 |

**Alert catalog (abridged):** SEV1 (page): API 5xx > 1 %/5 min; `/readyz` failing; DB down; Redis down (money tiers); payment webhook failure rate > 5 %; `payments-fallback` queue lag > 10 min; DLQ growth > 50; backup failure (2 consecutive). SEV2 (ticket): p95 degradation; cert expiry 14 d; disk > 75 %; queue lag (email > 10 min); provider quota > 80 %; restore-drill overdue; dependency critical vuln > 7 d.

### 15.4 Dashboards

System (RED per service + deps) · Payments (funnel by method, webhook health, chargebacks, settlement) · Jobs (queue depth/lag/DLQ, timer sweep lag) · Search (latency, cache hit, slow queries) · Business (bookings by state/line, GMV day-run-rate from `rpt_kpi_rollup`, vendor SLA attainment — PRD §31.2) · Cost (cloud + provider spend daily).

### 15.5 Synthetic checks & incident ops

- External synthetic (per minute, multi-region lite): home 200, search 200, `/healthz`, login page; checkout **dry-run on staging** (sandbox PSP) per deploy + daily.
- Status page `[V1.5]`; incident process per PRD §33.5 (SEV definitions, comms templates, runbook per alert type, post-mortem ≤ 5 business days); status-history retention 1 yr.

---

## 16. Analytics

### 16.1 Ingestion (two paths, one table)

| Source | Path | Consent |
|---|---|---|
| Client (web) | batched beacons (10 s / 5 events) → `POST /v1/track` (rate-limited, Zod schema-per-event-name, PII blocklist validation, dedup by client `event_id`) | **required** (non-essential events; consent state in payload + cookie) |
| Server (authoritative) | direct insert on domain events (booking transitions, payment outcomes, offers, search) | n/a (first-party, product-necessary) |

- `ana_event` (monthly partitioned): `ts, name, version, session_id, user_id? (internal id), src, consent, props jsonb, event_id`; unknown schema ⇒ rejected + counter (no silent bad data).
- **PII blocklist (hard):** email/phone/passport/card patterns in props ⇒ event rejected + alert (PRD §34.5); amounts as bands only (PC rule: no raw amounts in events — revenue truth is the ledger, PRD §31 RP-06).
- Session: pseudonymous `ana_session` (client-generated uuid persisted in cookie), linked to `user_id` only when authenticated.

### 16.2 Storage → rollups → dashboards

- Retention: raw 13 months (then aggregate-only), partitions detached to cold.
- Nightly rollups (`rollups` queue): `rpt_kpi_rollup` (day × scope × metric) + `rpt_funnel_daily` (search→detail→start, submit→paid by mode, quote funnel, payment funnel — PRD §34.3); admin KPI dashboards + CSV read **rollups** (fast, stable, permission-gated — BR-7).
- Funnels with ad-hoc filters: bounded on-demand queries (timebox 30 d) on `ana_event` partitions.

### 16.3 Experiments & beyond

- A/B/experiments `[V2]` (PRD §34.4): experiment registry (DB) + deterministic assignment (stable hash of user/session) + variant tagging on events + guardrail metrics from rollups.
- No third-party analytics in MVP (PRD D9); `[V1.5]` optional self-hosted Plausible-class (decision D9/E-list) behind consent, IP-anonymized.
- Warehouse `[V2]`: Postgres → BigQuery/Athena-class sync (provider decision) for cohort/retention; MVP intentionally warehouse-free (PRD §34.4, GC-2).

---

## 17. Error Handling

### 17.1 Taxonomy (stable codes, versioned catalog in `packages/contracts`)

Format `ETN-{DOMAIN}-{NNN}`; HTTP mapping + user-safe message (Phase 02 Appendix C copy rules); **every error body carries `requestId`** (copyable → support; Phase 02 ER-01).

| Code | HTTP | Meaning (user-facing gist) |
|---|---|---|
| `ETN-VAL-001` | 422 | field validation failed (`details.fields` map) |
| `ETN-AUTH-101/102/103` | 401 | token expired (silent refresh) / invalid / MFA required |
| `ETN-AUTHZ-101` | 403 | not permitted (audited) |
| `ETN-BK-101` | 409 | booking state transition not allowed (state shown) |
| `ETN-BK-102` | 422 | price lock expired — re-confirm shown price |
| `ETN-BK-103` | 409 | availability lost for selected dates (alternates offered) |
| `ETN-QT-101` | 409 | offer expired/withdrawn — re-request available |
| `ETN-QT-102` | 422 | offer revision limit reached (3) |
| `ETN-PY-101` | 409 | amount mismatch (server-authoritative; request rejected) |
| `ETN-PY-102` | 402 | payment failed (provider reason mapped to plain text) |
| `ETN-PY-103` | 409 | payment session expired — new attempt |
| `ETN-PY-104` | 502 | payment provider unreachable (retry offered) |
| `ETN-RF-101` | 409 | refund cap exceeded (paid − refunded) |
| `ETN-VEN-101` | 403 | line capability not approved |
| `ETN-REV-101` | 403 | review not eligible (reason: state/window/ownership) |
| `ETN-CORP-101` | 409 | approval required before payment |
| `ETN-UP-101/102` | 413/415 | upload quota / type+size rejected |
| `ETN-SYS-500/502/503` | 500/502/503 | unexpected (reference id) / upstream / maintenance |

(Extended catalog in contracts package with localized copy keys `[V1.5]`.)

### 17.2 Layers

- **Boundary:** Zod parse (422 field map) → auth (401, client silent-refresh contract for `ETN-AUTH-101`) → authz (403 + audit) → business rules (409/422 above) → provider (502/503 mapped; **raw provider text never reaches clients**) → catch-all (500 + requestId; full context logged).
- **Global filter:** single `ExceptionFilter` (typed error classes); response sanitization (no stack/paths/internal ids beyond requestId); error **contract tests** per code (api) + client mapping tests (web) — the server→UI mapping table lives in `packages/contracts` (Phase 02 §8.18 states).
- **Client:** route error boundaries (Phase 02 §8.17), React Query retry policy (only idempotent ops), offline banner, form error mapping (VF-02 summary + field errors).

### 17.3 Resilience

| Mechanism | Config |
|---|---|
| Timeouts (provider) | intent create 10 s; status query 2 s; email 5 s |
| Circuit breaker (per provider op) | open after 5 fails/30 s; half-open 1 probe/30 s; open ⇒ mapped 503 + runbook hint |
| Retries | idempotent ops only (GET, webhook reprocess, provider queries); exponential + jitter; max 3 |
| Bulkheads | payment provider pool isolated (promise-pool cap 32) — a stalled PSP cannot exhaust the API |
| Degradation matrix | Redis down ⇒ §11.1 behaviors; search slow ⇒ facet-skip + stale-while-revalidate; analytics down ⇒ no-op (never blocks domain); email down ⇒ queue backlog (alert); DB replica down ⇒ primary reads |
| Compensation | payment-after-cancel race ⇒ auto-refund job + alert; orphan intent cleanup (provider-side success w/o our record ⇒ recon → credit); double-charge guard (provider ref unique per intent) |
| Chaos (staging) | provider timeout injection, webhook replay/duplicate, Redis kill, DB failover drill — per release train |

---

## 18. External Integrations

### 18.1 Discipline (binding)

- Every integration = **adapter (SPI) + config + capability record + sandbox verification gate** before production enablement (T-8, GC-2): auth model, happy path, failure path, webhooks (if any), limits/quotas, SLA, DPA, support contact, cost model. Capability record lives in `adm_setting` + this document's inventory (kept current).
- Secrets: per-environment secret manager entries, least-privilege credentials per integration, rotation runbook (default 90 d), access audit.
- Change control: new integration ⇒ PRD note (scope impact) + capability record + contract tests (recorded sandbox) in CI + runbook entry.

### 18.2 Inventory

| # | Integration | Purpose | Version | Type | Provider candidates | Failure impact |
|---|---|---|---|---|---|---|
| 1 | Payment — domestic wallets | card-less checkout | MVP | outbound + webhook | eSewa, Khalti | checkout blocked (other methods) |
| 2 | Payment — domestic cards | NP cards | MVP | outbound + webhook | NCH ConnectIPS/ConnectIPSe-class | checkout blocked (other methods) |
| 3 | Payment — international cards | intl customers (D2) | MVP-if-validated, else V1.5 | outbound + webhook | partner acquirer / foreign-entity route | honest UI gap (PRD §3.3) |
| 4 | Bank transfer (manual) | all (corporate esp.) | MVP | internal process | — (bank account config) | verification delay (48 h window) |
| 5 | Email (transactional) | notifications | MVP | outbound + deliverability webhook | managed transactional provider (C-3) | notifications delayed (queue) |
| 6 | SMS | notifications | V1.5 | outbound | local aggregator (C-4) | channel reduced |
| 7 | WhatsApp (official, via BSP) | notifications | V1.5 | outbound + webhook | official Business API only | channel reduced |
| 8 | Maps/tiles | geo display | MVP | client-side (OSM via CDN, D10) | OSM/Leaflet | detail pages degrade (addresses shown) |
| 9 | FX reference rates | display conversion | MVP manual table; feed V2 | data (admin or licensed) | admin-managed (MVP) | ≈ rows hidden (NPR-only, PR-02) |
| 10 | Google OAuth | login | V1.5 | outbound (OAuth) | Google | login method unavailable |
| 11 | Push (web/app) | notifications | V2 | outbound | web push / app vendor | channel reduced |
| 12 | LLM (AI planner) | V2 planner | V2 (C-9, provider-gated) | outbound (API key) | decision at V2 planning | planner off (rule-based remains) |
| 13 | GDS/NDC airline APIs | live air inventory | V2 pilot (separate PRD) | outbound + webhook | provider decision | air stays quote-only (by design) |
| 14 | Hotel channel manager | hotel feed | FUT | inbound/outbound | provider decision | hotels stay direct-vendor (by design) |
| 15 | Object storage + CDN | files/media | MVP (infra) | outbound | S3-compatible + CDN (C-5) | uploads blocked (SEV1) |
| 16 | Observability | logs/metrics/traces | MVP (infra) | outbound | managed platform (E-2) | monitoring degraded (SEV1) |
| 17 | Breach-password list | auth hardening | MVP | outbound (k-anonymity) or local list | HIBP range API vs local (E-3) | check skipped (logged) |
| 18 | AV scanning | private doc safety | V1.5 | outbound or self-hosted | provider AV / ClamAV-class | uploads held for manual scan (alert) |
| 19 | 3P web analytics | traffic insights | V1.5 (optional, D9) | client-side | self-hosted Plausible-class | none (first-party analytics unaffected) |

### 18.3 Notes

- **No invented capabilities:** any provider feature (3DS, auto-refund, chargeback webhook, SMS international, WhatsApp template approval) is a capability-matrix entry **verified in sandbox** and reflected in UI copy (PRD §14.3, §19.3).
- Provider health: per-integration circuit breaker + metrics (§15.3); status page integration `[V1.5]`.

---

## 19. AI Architecture

### 19.1 Phasing (PRD §25 — capability-honest)

| Version | What exists technically |
|---|---|
| MVP | **No AI.** Build-Your-Trip is conventional (quotes module + trip desk). |
| V1.5 | `SuggestionService` (module `ai-planner`): **deterministic, Postgres-only** rule-based suggestions — popular combos (destination × season from completed bookings), budget-fit scoring (published prices), similar trips (tags/geo/duration similarity). No external calls, fully unit-testable, no model. |
| V2 | LLM-assisted planner (below) — **conditional on provider selection** (PRD C-9); if none passes evaluation, feature defers (GC-2). |
| FUT | Agentic booking (payments in-loop) — separate PRD + trust/audit work; **not** in any current plan. |

### 19.2 V2 component design (feature-flagged, kill-switchable)

```
PlannerController  /v1/ai/sessions · /v1/ai/sessions/{id}/chat · GET …/itinerary
   │  (auth: customer; explicit consent banner at first use — PRD AI-04)
   ▼
AgentCore (provider SDK; versioned system prompt; function calling; ≤ 8 turns;
           session token budget 60k; per-user daily + global cost caps)
   │  tools (read-only, ToolGateway-enforced)
   ▼
ToolGateway  search_services · get_service (price/availability/terms summary)
             get_destination · build_draft (maps to custom-trip draft)
             — NO PII tools, NO write ops, NO money ops; per-call rate limits;
             catalog content wrapped as untrusted-data markers (injection defense)
   ▼
OutputValidator  itinerary-draft JSON schema check + per-item cross-check of
                 price/availability against ToolGateway source (TTL 60 s)
                 ⇒ mismatch ⇒ re-ask or fallback (never render unverified data)
   ▼
Safety  input PII redaction (passport/phone/card patterns → replace + flag)
        output content filter · refusal policy (no medical/legal/visa advice)
        session terminate · profanity
   ▼
SessionStore (Redis: conversation + draft + budget; TTL 24 h; no PII persisted)
Handoff  one-click "Talk to our trip desk" ⇒ case with context packet (trip desk SOP)
Observability  session log (anonymized, 30 d) · cost dashboard · quality sample queue (ops reviews 5 %)
```

### 19.3 Guardrails (blocking-defect level, PRD AI-01…AI-06)

- Grounding: model may only cite live catalog data via ToolGateway; "price on request" is a **valid, expected output** (never a failure to improvise a number).
- Output is a **draft** — it renders into the Build-Your-Trip cart and proceeds through normal quote/payment/confirmation (the AI never books, never touches payments).
- Privacy: zero user PII to the provider (redacted sessions); zero-retention contract where available; no training on our data; DPA; consent recorded.
- Cost: per-session cap, per-user daily cap, global budget ⇒ auto-disable (kill switch) + alert.
- Deployment: same API container (stateless) initially; separate service only on documented scale/cost trigger.
- Evaluation gate before enable: golden set (≥ 20 itineraries, offline regression on every prompt/model change) + online A/B (PRD AI-06) with handoff-rate guardrail.


---

## 20. Deployment Architecture

### 20.1 Topology (canonical target, T-7)

```
Vercel ────────────────  web (Next.js; edge for static/ISR, Node runtime for auth/BFF routes)
                          · preview per PR · production

AWS (Terraform, all 12-factor; equivalent managed stacks stay viable)
  ECS Fargate
    ├─ service: api      (stateless; ALB; 2..10 tasks; Multi-AZ)
    └─ service: worker   (BullMQ consumers; 1..4 tasks; scale on queue depth)
  RDS PostgreSQL 16      (Multi-AZ; PITR; RDS Proxy pooling)
  ElastiCache Redis 7    (Multi-AZ; AOF)
  S3 + CloudFront        (§8 buckets; origin-authenticated)
  Secrets Manager · CloudWatch/X-Ray (OTel) · WAF (basic)
```

- Single container image for api + worker (different entrypoints); web builds via Vercel (monorepo-aware).
- **Why AWS-first (T-7):** PRD requires AWS-deployability; choosing it at day 1 avoids a later migration and aligns backups/compliance tooling; IaC + 12-factor keep any major cloud viable (decision recorded if changed).

### 20.2 Pipeline (trunk-based, T-12)

```
push/PR → CI: typecheck · lint (incl. module boundaries + secret scan) · unit
        · integration (Testcontainers: fresh + N-1 upgrade) · OpenAPI diff gate
        · dependency audit · build
  → web: Vercel preview (per PR) — points at staging API (E-6)
  → staging: migrate (upgrade-path verified) → deploy api (rolling, /readyz gate)
            → deploy worker → E2E (Playwright, incl. sandbox payment round-trip)
            → synthetic smoke
  → production: migrate → deploy api (rolling; min 2 tasks; readiness-gated)
            → deploy worker → Vercel production → post-deploy watch (15 min:
            health, synthetics, error rate) → announce
```

- **Migrations:** expand/contract only; backward-compatible with N-1 across the deploy window; destructive changes two-phase (flag off old writes → migrate → enable new writes); rollback = redeploy N-1 (DB rollback only for pure-additive).
- **Feature flags (two tiers):** env kill-switches (hard off: payment methods, AI planner, custom-trip, review submission, bank-transfer) + DB `adm_feature_flag` (runtime, audited, per-env) for gradual rollout.
- **Hotfix:** cherry-pick + fast lane (security gates never skipped).

### 20.3 Scaling & capacity

| Component | Strategy |
|---|---|
| api | autoscale on CPU 65 % / RPS per task; min 2 (Multi-AZ); stateless (session in DB/cookie) |
| worker | autoscale on queue depth (per-queue targets); media vs payments-fallback scaled independently |
| web | Vercel auto (edge + Node runtime) |
| DB | vertical headroom at launch class; read replica `[V2]` (trigger §4.5); partitioning planned (§4.5) |
| Redis | managed scale; maxmemory + AOF sized for queues + dedup (not for big caches) |
| Storage/CDN | infinite; lifecycle policies |
| Seasonality (PRD R-5) | **pre-scale +50 % api/worker 2 weeks before Mar–May & Sep–Nov peaks**; load-test re-run at V2 |
| Load gate | 2× projected peak (search p95, checkout concurrency) pre-launch (PRD §33.5) + at V2 |

### 20.4 DR & availability

- RPO 5 min (PITR) · RTO 1 h (runbook: ALB target-group failover, DB Multi-AZ auto-failover, Redis managed failover, backup-restore to clone); cross-account backup export `[V1.5]`; quarterly restore drill (PRD §33.1); data-loss runbook (PITR clone + provider-record backfill for payments).
- TLS 1.2+ everywhere, HSTS; CORS allowlist (web origin only); security headers per PRD §33.1; WAF basic (rate-limit assist, SQLi signatures).

### 20.5 Domain & environment wiring

`www.`/apex (web) · `api.` (API) · `assets.` (CDN) — per environment (staging subdomain set); env-specific CORS + cookie domain + OpenAPI visibility; all internal service-to-service calls over private network (no public DB/Redis/S3).

---

## 21. Module Boundaries

### 21.1 Principles

1. **Module = NestJS module = table ownership unit = public facade.** One-way dependencies (layers below); no cycles (CI-enforced).
2. **Cross-module = facade or event, never table** (BR-1): import-boundary lint + ownership map in CI + review checklist.
3. **Events for side effects** (outbox, §12.4); **commands synchronous** (request/response).
4. Shared kernel in `packages/contracts`: event schemas, enums (states, lines, reason codes), DTO types, error catalog — versioned, single source.

### 21.2 Layers & dependency graph

```
L6  admin · reports · analytics
L5  customers · reviews · notifications · ai-planner · corporate
L4  bookings · payments · refunds · quotes
L3  catalog-core + lines (vehicles transfers transportation hotels tours treks packages flights) · search · destinations · content
L2  vendors
L1  auth · users
L0  foundation: events(outbox) · jobs · storage · media · config · telemetry
```
(Edges point downward only; horizontal edges only via facade/events. `admin` orchestrates via facades; `reports` reads rollups + ledger queries, never domain tables directly (BR-7).)

### 21.3 Boundary rules

| Rule | Text |
|---|---|
| BR-1 | No cross-module table access (ownership map CI-enforced) |
| BR-2 | Money writes (`pay_*`, ledger) only via `payments`; `refunds` writes its own tables + ledger entries through payments facade |
| BR-3 | Booking state changes only via `bookings` commands (any module may *request*, none may *write*) |
| BR-4 | Catalog publishability = `catalog-core` gate ∧ `vendors` capability check (both, atomically at publish command) |
| BR-5 | Inbound provider webhooks only in `payments` (and notification deliverability in `notifications`) |
| BR-6 | PII columns only readable by owning module + explicitly granted facades (access review quarterly `[V1.5]`) |
| BR-7 | `reports` reads rollups/ledger/own tables only; no ad-hoc domain table scans (bounded ad-hoc queries on partitions allowed for admin analytics, timeboxed) |
| BR-8 | Line modules (L3) share `catalog-core` base `Service` but own their extension tables, availability semantics, and line rules; **no business logic duplicated across lines** (shared pricing/surcharge/add-on logic lives in `catalog-core`) |

### 21.4 Module matrix (25 mandated + foundation)

| Module | Layer | Owns (prefix) | Public facade (key capabilities) | Emits (key events) | Consumes (key events) | Depends on |
|---|---|---|---|---|---|---|
| **auth** | L1 | auth_session, mfa, otp, idp, audit, idem, outbox | login/logout/refresh, MFA, OTP, sessions, audit write | auth events | — | L0 |
| **users** | L1 | user, user_verification_event | account CRUD, verification levels, dedup | user.registered/verified | auth events | auth, L0 |
| **customers** | L5 | cust_* (profile, guest, wishlist) | profile, guest contact + tokens, wishlist | wishlist.changed (internal) | user.*, booking.* | users, bookings (facade), L0 |
| **vendors** | L2 | ven_* | org/capability/document lifecycle, approval commands, bank (finance-scoped) | vendor.submitted/approved/rejected/suspended | user.* | auth, users, L0 |
| **vehicles** | L3 | veh_* | vehicle/rate CRUD, availability (per-vehicle days) | service.* (via catalog), availability.changed | vendor.approved | catalog-core, vendors, L0 |
| **transfers** | L3 | trf_* | routes/services, window capacity, scheduled departures | service.*, availability.changed | vendor.approved | catalog-core, destinations, L0 |
| **transportation** | L3 | trp_* | charter services + capacity | service.* | vendor.approved | catalog-core, destinations, L0 |
| **hotels** | L3 | htl_* | property/room/rate-plan CRUD, date availability | service.*, availability.changed | vendor.approved | catalog-core, destinations, L0 |
| **tours** | L3 | tour_* | itineraries, inclusions, departures | service.*, availability.changed | vendor.approved | catalog-core, destinations, L0 |
| **treks** | L3 | trek_* | trek attrs, permits flags, departures | service.*, availability.changed | vendor.approved | catalog-core, destinations, L0 |
| **packages** | L3 | pkg_* | package components, family/corporate flags | service.* | vendor.approved, tour/hotel facades (component refs) | catalog-core, destinations, L0 |
| **flights** | L3 | flt_route | curated route catalog, quote inputs validation | (no service events — quote-only, PRD §26) | quote.* | destinations, L0 |
| **catalog-core** | L3 | srv_*, price_surcharge, tax_config, fx_rate | base service lifecycle, media, SEO, publish gate, shared pricing/surcharge/add-on logic | service.published/suspended/retired, price.changed | vendor.approved | vendors, destinations, media, L0 |
| **quotes** | L4 | qtr_* | quote requests, offers (versions, validity), routing to vendors, custom-trip draft orchestration | quote.requested, offer.* | service.*, availability.*, booking.* | catalog-core facades, vendors, bookings, destinations, L0 |
| **bookings** | L4 | bk_*, bk_group, bk_timer | **booking state machine** (all commands), travelers, documents, vouchers, timers emission | booking.* | payment.succeeded/failed, offer.accepted, refund.*, corporate.approval.* | payments (facade), refunds (facade), quotes, catalog-core, notifications (facade), L0 |
| **payments** | L4 | pay_* | intents, charges, **ledger**, settlement, reconciliation, provider SPI host | payment.succeeded/failed, chargeback, settlement.state | booking.created (payable), refund.created | bookings (facade), refunds (facade), vendors (bank), L0 |
| **refunds** | L4 | ref_* | refund lifecycle, vendor-mediated cases (air) | refund.* | payment.*, booking.cancelled, dispute.* | payments (facade), bookings (facade), L0 |
| **reviews** | L5 | rev_* | eligibility, moderation, aggregates, replies, reports | review.visible/rejected | booking.completed | bookings (facade), catalog-core, users, L0 |
| **notifications** | L5 | ntf_* | event→channel dispatch, preferences, suppression, delivery logs | notification.delivered | **all** domain events (consumer) | all facades (event-driven; no table reads), L0 |
| **corporate** | L5 | corp_* | org/members/policy, approval workflow, expense exports | corporate.approval.* | booking.created (corporate), user.* | users, vendors (KYC docs), bookings (facade), payments (facade), L0 |
| **destinations** | L3 | geo_*, dst_* | geo tree CRUD, destinations, airports, aliases | geo.changed, destination.published | — | content (facade), L0 |
| **content** | L3 | cms_* | guides/banners/help, localized content `[V1.5]`, SEO config | content.published | — | destinations (facade), media, L0 |
| **search** | L3 | srch_* | SearchService (query/facets/reindex), alias ops | search.reindex-requested | service.*, availability.*, price.changed | catalog-core (read path), destinations, L0 |
| **ai-planner** | L5 | ai_* (V2) | suggestions (V1.5), planner sessions (V2), draft → custom-trip handoff | ai.draft-created | search (facade), quotes (facade, build_draft) | search, quotes, catalog-core, L0 |
| **reports** | L6 | rpt_* | KPI dashboards, funnel, exports (CSV/XLSX `[V1.5]`), rollup jobs | — | domain events (rollup feed) | payments (ledger queries), all (read facades for admin views), L0 |
| **admin** | L6 | adm_* | approvals orchestration (via facades), interventions, disputes, settings (commission/SLA/fx/flags/templates), audit explorer | settings.changed | vendor.*, booking.*, payment.*, dispute.* | **all** facades (orchestration only; owns no business tables), L0 |
| foundation: **events** | L0 | outbox | bus, dispatcher, event registry | — | — | L0 |
| foundation: **jobs** | L0 | (queue config) | queue registry, timer sweep, maintenance | — | outbox events | L0 |
| foundation: **storage / media** | L0 | — | presigned upload flow, buckets, image pipeline | media.ready | — | L0 |
| foundation: **config / telemetry** | L0 | — | env validation, settings facade, OTel, logging | — | — | L0 |

> Notes: `disputes` tables live with `admin` (operational domain, admin-owned workflow; cases reference bookings/payments read-only). `flights` intentionally has **no** service catalog (quote-only line, PRD §26 AT-01) — its "catalog" is `flt_route` (routes) + agency offers in `quotes`.

---

## 22. Frontend Folder Structure

```
apps/web/
  src/
    app/                          # App Router (routes ↔ sitemap, UX §6)
      (public)/                   # SSG/ISR marketing + catalog
        layout.tsx  page.tsx      # home (16 sections, UX §7)
        vehicles/  vehicles/[slug]/
        transfers/  transfers/[slug]/
        tours/  tours/[slug]/
        trekking/  trekking/[slug]/
        hotels/  hotels/[slug]/
        packages/  packages/[slug]/
        flights/  flights/[route-slug]/
        destinations/  destinations/[slug]/
        guides/  guides/[slug]/
        corporate/  vendor/       # landings
        about/  contact/  help/[slug]?  deals/ [V1.5]
        login/  register/
        not-found.tsx  error.tsx  global-error.tsx
      (customer)/                 # authenticated (SSR shell + CSR interactivity)
        trips/  trips/[id]/  trips/[id]/cancel/  trips/[id]/invoice/
        account/  account/profile|security|notifications|payment-methods [V1.5]
        wishlist/
        custom-trip/  custom-trip/[draftId]/
        quote/[token]/            # guest deep link
      (vendor)/app/               # vendor portal (CSR)
        dashboard/  services/  services/new/  services/[id]/
        bookings/  bookings/[id]/  earnings/  reports/
        profile/  documents/  notifications/  settings/
      (admin)/                    # admin console (CSR; MFA-gated)
        overview/  vendors/  vendors/approvals/  vendors/[id]/
        bookings/  payments/  refunds/  settlements/  customers/
        corporate/  disputes/  content/  geo/  reports/  audit/  settings/
      api/                        # server-only routes (BFF-lite)
        revalidate/route.ts       # API publish-event → ISR revalidation (secret-auth)
        track/route.ts [V1.5?]    # (optional) analytics proxy — default: client → API direct
    components/
      ui/                         # @easytrip/ui re-exports + web-specific wrappers
      layout/                     # header, mega-menu, bottom-tab-bar, footer, breadcrumbs, sub-nav, sheets
      commerce/                   # cards (UX §8.4), price (UX §8.15), rating (UX §8.14)
      search/                     # universal search, line forms, facets, sort, no-results
      booking/                    # booking panel, checkout steps, offer, voucher, timeline, cancel flow
      feedback/                   # alerts, toasts, empty/loading/error states
      portal/                     # vendor portal composites (inbox, editors)
      admin/                      # admin composites (approval queue, tables, settings)
    features/                     # feature slices (data + behavior per feature)
      auth/  account/  trips/  wishlist/  notifications/  corporate/  custom-trip/
      # each: components/ · queries/ (React Query hooks) · forms/ · types/
    lib/
      api/                        # generated client + fetch wrappers (auth, idempotency, retries)
      auth/                       # session helpers (server), token refresh (client)
      format/                     # money (PC-05), dates (tz-aware), phone, numbers
      analytics/                  # consent + event batcher
      utils/
    hooks/                        # shared hooks (useMediaQuery, useCountdown, useDebounce…)
    styles/                       # Tailwind entry, token wiring (Phase 02 Appendix A)
    config/                       # site config, NEXT_PUBLIC_* allowlist values, feature flags (public subset)
    types/                        # generated + local non-DTO types
  public/                         # static assets (logo, icons, og fallback)
  e2e/                            # Playwright specs (8 critical flows)
  tests/                          # unit (Vitest + RTL)
  next.config.ts  tsconfig.json  tailwind/postcss config  package.json
```

**Rules:** `app/` stays route-only (no business logic — logic in `features/`); server-only modules marked (`"use server"` / `server-only` package) for PII paths; no direct `fetch` outside `lib/api/`; generated client is the only API type source.

---

## 23. Backend Folder Structure

```
apps/api/
  src/
    main.ts  app.module.ts
    common/                       # cross-cutting (framework-level only)
      guards/ (permission.guard, mfa-stepup.guard, idempotency.middleware)
      interceptors/ (audit.interceptor, logging.interceptor, response-mapper)
      filters/ (exception.filter — §17.2)
      decorators/ (current-user, permission, idempotent, scoped)
      dto/ (pagination, cursor, envelope)
      errors/ (typed error classes + code catalog re-export)
      scope/ (Scope types, repository base w/ enforced scoping)
    modules/
      auth/        (auth.{controller,service}, mfa.service, sessions.service, otp.service, dto/)
      users/       (users.{controller,service}, repository/)
      customers/   (controller, service, wishlist.service, guest.service, repository/)
      vendors/     (controller, service, approval.service, documents.service, bank.service, repository/)
      catalog/     # CORE: service.{controller,service}, media.service, seo.service,
                   # publish-gate.service, pricing.service (shared surcharge/add-on logic),
                   # tax.service, fx.service, repository/
      vehicles/  transfers/  transportation/  hotels/  tours/  treks/  packages/  flights/
                   # each: controller, service, availability.service (line semantics), repository/
      quotes/      (controller, service, offer.service, routing.service, custom-trip.service, repository/)
      bookings/    (controller, service, state-machine/ (states, transitions, guards, interpreter),
                    travelers.service, documents.service, timers.service, voucher.service, repository/)
      payments/    (controller, intents.service, ledger.service, settlement.service, recon.service [V1.5],
                    providers/ (payment-provider.ts (SPI) · esewa.adapter · khalti.adapter ·
                                nch.adapter · intl-acquirer.adapter · bank-manual.adapter · mock.adapter (dev-only guard)),
                    webhooks/ (payment-webhook.controller — signature verify, replay, dispatcher), repository/)
      refunds/     (controller, service, cases.service (vendor-mediated), repository/)
      reviews/     (controller, service, eligibility.service, moderation.service, aggregates.service, repository/)
      notifications/ (service, dispatch.service, preferences.service, providers/ (email.adapter · sms.adapter [V1.5] · whatsapp.adapter [V1.5]),
                      templates/ (typed, versioned, locale-keyed), repository/)
      corporate/   (controller, orgs.service, approvals.service, policy.service, expenses.service, repository/)
      destinations/ (controller, geo.service, destinations.service, repository/)
      content/     (controller, guides.service, banners.service, help.service, localized.service [V1.5], repository/)
      search/      (search.service (SearchProvider SPI + postgres-search.provider), facets.service, aliases.service, repository/)
      ai-planner/  (controller, suggestions.service (V1.5) · planner/ (V2: agent.core, tool-gateway,
                    output-validator, safety, session-store) — feature-flagged)
      reports/     (controller, kpi.service, funnel.service, exports.service, rollups.service, repository/)
      admin/       (controller, approvals-orchestrator.service, interventions.service, disputes.service,
                    settings.service (commission/sla/fx/flags/templates), audit.service, repository/)
      events/      # L0: outbox.repository, dispatcher, event-bus, event-registry (typed contracts)
      jobs/        # L0: queue-registry, consumers/ (media, email, timers-sweep, payments-fallback,
                   #        search-reindex, analytics-batch, rollups, exports, cleanup, settlement)
    infra/
      db/          (drizzle client, migrations/ (versioned), pool config)
      redis/       (client, locks, rate-limiter impl)
      storage/     (s3 client, presign.service, upload-policy)
      media/       (sharp pipeline, og-generator)
      config/      (env.schema (zod, fail-fast), settings.service (DB config facade))
      logging/     (pino setup, masking serializer, audit.writer)
      telemetry/   (otel sdk init, tracing/metrics)
    webhooks/      # non-payment inbound (email deliverability) — payments' webhook lives in payments module (BR-5)
  test/
    unit/  integration/ (testcontainers harness)  contract/  e2e/  fixtures/
  package.json  tsconfig.json  nest-cli.json  .env.example (placeholders only)
```

**Rules:** module folder owns its tables/repositories (CI ownership map); `providers/` and `adapters/` implement interfaces declared at module root (DIP); `common/` is framework-only (no domain logic); `mock.adapter` guarded by env assert (staging/prod hard-fail on presence, §7.1).

---

## 24. API Versioning Strategy

- **URI versioning:** `/v1` prefix on all versioned surfaces (customer + vendor + admin share the version root; families differ by path + permissions). Unversioned: `/healthz`, `/readyz`, `/metrics`, web `api/revalidate`, and **webhooks** (provider contracts are outside our versioning — adapter-owned).
- **Compatibility policy within v1 (additive only):** new optional fields, new endpoints, new optional params, new error codes, new events. **Breaking** = removed/renamed fields, changed semantics, tightened validation on existing inputs, changed error code meaning.
- **Breaking change procedure:** introduce `/v2` (or `/v2/{family}`) → run in parallel ≥ 6 months → deprecate v1 via `Deprecation: true` + `Sunset: <date>` headers + vendor/customer changelog + in-portal banner → removal after sunset (audit-logged, support runbook for stragglers).
- **Contract management:** OpenAPI 3.1 generated from code (single source); published per environment; **CI breaking-change gate** (diff vs main) blocks merges that break v1 without version bump; consumer typed client (web) regenerated per merge with a drift test; API changelog file (repo) updated per change (keep-a-changelog format).
- **Payload/event versioning:** outbound events carry `v`; consumers declare supported versions (unknown v+1 ⇒ alert, not crash); idempotency & pagination semantics are version-stable standards (§3.6).
- **Rollout mechanics:** web app pins its API version in config; canary to a new version via feature flag (per cohort); vendor API consumers (future partners) get sandbox + changelog + sunset notice (PRD §35 B2B prep).
- **Minimum supported horizon:** at any time, at most 2 versions live (v1, v2); older versions frozen (security fixes only).

---

## 25. Environment Configuration

### 25.1 Configuration tiers (separation of concerns)

| Tier | Lives in | Change cadence | Examples |
|---|---|---|---|
| Code constants | source | release | tokens (Phase 02), defaults, state catalogs, error catalog |
| **Env** (deploy-time, per environment) | env vars / secret manager; **zod-validated at boot (fail fast on missing/invalid)**; no defaults for secrets | deploy | URLs, credentials, provider keys, mode flags |
| **Runtime settings** (operational) | Postgres `adm_setting` (+ `adm_feature_flag`) | runtime (admin UI, audited) | commission per line, SLA defaults, capability matrix, fx rates, notification template config, upload quotas |

Rule: **anything an operator may tune without a deploy is in the DB, never env** (and vice versa: env never holds business data).

### 25.2 Env variable catalog (names — no values; required/optional per environment)

| Group | Variables | Notes |
|---|---|---|
| App | `APP_ENV` (dev/staging/prod), `APP_URL`, `API_URL`, `WEB_ORIGIN`, `ALLOWED_ORIGINS` (CORS), `LOG_LEVEL`, `TZ_DEFAULT=Asia/Katmandu` | CORS strict allowlist |
| DB | `DATABASE_URL`, `DB_POOL_MAX`, `DB_STATEMENT_TIMEOUT_MS` | RDS Proxy aware |
| Redis | `REDIS_URL`, `REDIS_PREFIX` | per-env prefix isolation |
| Storage | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET_PRIVATE/MEDIA/ORIG/TMP`, `CDN_URL`, `S3_CRED_REF` (secret manager ref, not raw) | no raw creds in env |
| Auth | `JWT_SECRET_REF`, `JWT_ACCESS_TTL_S=900`, `REFRESH_TTL_DAYS=30`, `ARGON2_{M,K,P}`, `MFA_ISSUER`, `COOKIE_DOMAIN`, `AUTH_MOCK_ENABLED` (dev-only; staging/prod boot-assert false) | §5 |
| Payments | per provider: `{PSP}_MODE` (sandbox/production), `{PSP}_CRED_REF`, `{PSP}_WEBHOOK_SECRET_REF`, `{PSP}_ENABLED` (kill-switch) | capability matrix in DB (§7.1) |
| Notifications | `EMAIL_FROM`, `EMAIL_PROVIDER_CRED_REF`, `SMS_*` `[V1.5]`, `WA_*` `[V1.5]` | |
| Media | `MEDIA_CONCURRENCY`, `MEDIA_MAX_PER_ORG_GB` (default; DB-overridable) | |
| Telemetry | `OTEL_ENDPOINT`, `OTEL_EXPORTER`, `OTEL_SAMPLE_RATE`, `OTEL_SERVICE_NAME` | |
| Analytics | `TRACK_RATE_LIMIT_PER_MIN` | schema registry in code |
| Jobs | `TIMER_SWEEP_INTERVAL_S=30`, `WORKER_CONCURRENCY_{QUEUE}` overrides | |
| Rate limits | `RL_TIER_{ANON/AUTH/STRICT/PAYMENT}_RPM` | §3.6 |
| Web (build-time, allowlisted) | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_TRACK_ENABLED`, `NEXT_PUBLIC_FF_*` (public-safe flags) | CI allowlist check — anything else is a build error |

### 25.3 Secrets hygiene

- Secret manager (per-env), naming `{env}.{service}.{purpose}`; access audited; rotation: provider secrets 90 d, JWT 180 d (runbook), webhook secrets on any suspected exposure; **no secrets in repo** (pre-commit + CI secret scan; `.env.example` placeholders only); no secrets in logs (serializer redaction, §14); no secrets in images (build args scrubbed).

### 25.4 Feature flags (two tiers, §20.2)

- **Env kill-switches** (hard off, deploy-level): `PSP_{X}_ENABLED`, `AI_PLANNER_ENABLED`, `CUSTOM_TRIP_ENABLED`, `REVIEWS_SUBMIT_ENABLED`, `BANK_TRANSFER_ENABLED`.
- **DB flags** (`adm_feature_flag`, runtime, per-env, audited, optional scope: role/org/percentage): gradual rollouts (e.g., 10 % of new vendors → new approval UI), vendor-facing features, A/B variants `[V2]`.

---

## 26. Environments (dev / staging / production)

| Dimension | **Local (dev)** | **Staging** | **Production** |
|---|---|---|---|
| Stack | docker-compose (Postgres 16, Redis 7, MinIO) + `pnpm dev` (api + web) | Full managed stack (same IaC as prod, smaller scale) | Full managed stack, Multi-AZ |
| Data | **Dev fixtures** (explicitly synthetic, labeled; GC-3 applies to production surfaces — fixtures are a dev tool, never a data source) | Synthetic seed + **anonymized production export** `[V1.5]`; scripted weekly reset | Real data only |
| Providers | **Mock adapters** (payment mock via SPI; email → local sink; OTP to logs) — hard-disabled outside dev | **Real providers in sandbox/test mode** (payment test mode, email test mode or allow-listed real sends) | Real providers, production mode |
| Auth | Same flows; OTP printed to logs (dev-only); no MFA enrollment friction (dev factor) | Real MFA required (admin); test users | Real |
| Vendors | Fixture vendors | Pilot onboarding exercises; **vendor production onboarding happens in production** (real documents), with booking flows dry-runnable on staging via synthetic vendors (decision E-4) | Real vendors (launch floor PRD A8) |
| Observability | Local pretty logs + optional local Grafana | Same observability backend, separate project + alerts (suppressed paging, tickets only) | Full SLO alerts + paging |
| CI/E2E | Unit + integration (Testcontainers) | Integration + **E2E (Playwright incl. sandbox payment)** + load tests + pen-test target | Synthetic checks (read-only), no E2E against prod |
| Secrets | Local `.env` (gitignored), mock creds | Staging secrets (sandbox creds; **never production secrets**) | Production secrets (secret manager) |
| Who | Engineers (personal) | Eng + QA + ops + **pilot vendors** (scoped) | End users + scoped admins |
| Purpose | Fast loop, safe experimentation | Pre-release verification, release gate, debugging with realistic data | Service |

- **Data movement:** prod → staging only via anonymized export tool `[V1.5]` (PII masked, PII fields dropped); staging → prod: never; migrations rehearsed on staging (fresh + N-1 upgrade).
- **Previews:** PR ⇒ Vercel web preview → staging API (E-6); team-only views via DB feature flags (percentage/role scope) — never ad-hoc env hacks.
- **Launch gate (prod):** PRD Appendix A8 + §33.5 security gate + staging soak (48 h) + load test 2× peak.

---

## 27. Scaling from Nepal-Only to International

### 27.1 Design stance

GC-1 made geography, currency, timezone, locale, tax, pricing, vendor, service, and payment **first-class, config-driven entities**. Internationalization is therefore mostly **data + config + adapters**, not rewrites. What is Nepal-specific today is **seed data** (geo tree, tax rows, fx rows, curated destinations, document checklists), never code paths.

### 27.2 Dimension-by-dimension scaling plan

| Dimension | Today (MVP, Nepal) | V1.5 | V2 | Change type |
|---|---|---|---|---|
| **Geo** | 7 provinces / 77 districts / cities / airports (NP seed) on `geo_node` (type + parent, arbitrary depth, nullable levels — countries without districts still fit) | add countries as needed (e.g., India for cross-border vehicle context) | full multi-country trees | **data** (schema already generic) |
| **Currency** | NPR base + settlement; ≈ display (admin fx table, PR-02) | more display currencies; per-country base currency config | **multi-currency settlement** (per-vendor settlement currency column already exists) | config + settlement-engine extension (code, bounded) |
| **Timezone** | UTC storage; Asia/Katmandu display | — | per-geo display tz; cross-tz booking windows (tz labels everywhere, PRD TF-08) | code (display layer) + config |
| **Locale** | English (i18n structure, Devanagari fallback ready) | **Nepali UI + content** (hreflang, PRD SO-06) | per-country locales; `cms_localized` content pipeline | code (pipeline) + data (human-authored) |
| **Tax** | `tax_config` (jurisdiction × line): Nepal 13 % VAT example | — | per-country rates + cross-border rules (OSS/VAT on intl sales) | **config** + legal |
| **Payment** | NP wallets + domestic cards + bank transfer (+ intl cards if D2 validated) | int'l card path finalized (D2); per-country method enablement via capability matrix | new-country PSP adapters (local acquirers) — SPI already provider-agnostic | **adapters** (SPI ready) + config |
| **Vendors** | NP KYC doc matrix (per-line checklists) | — | non-NP entities: country field on `ven_org` (exists), per-country document checklists, settlement currency | config + data + vendor BD |
| **Services** | NP destinations across 10 lines | — | **first non-NP destination pilot** — agency-fulfilled via existing QUOTE flow (`INTL_TRAVEL`/`V-9`); then direct intl vendors | **data + supply** (engine unchanged) |
| **Search** | English FTS + trigram | — | multilingual index (per-locale config / engine swap §10.2) | code (provider-swap path documented) |
| **Site** | single domain, EN | hreflang (ne/en) | country subdomain/site (locale + currency + payment + support per country) | code + ops (V2 decision) |
| **Data/privacy** | NP data practices; DPA with sub-processors | GDPR-class DPA review | data residency evaluation (regional hosting), GDPR compliance pass | infra decision + legal |
| **Ops** | KTM support + trip desk | — | per-region support SLAs; localized vendor onboarding | ops |

### 27.3 Sequencing

1. **V1.5 (foundation):** international card acceptance (D2) · Nepali locale + `cms_localized` · expanded display currencies · DPA/GDPR review.
2. **V2 (pilot):** first non-NP destination via agency vendors (reuses quote flow end-to-end — the lowest-risk international surface by design) · per-country tax config · multi-tz display · multi-currency settlement · hosting/data-residency decision.
3. **FUT:** multi-country sites, per-country PSP scale-up, regionalized ops, (only then) multi-region infrastructure.

### 27.4 What explicitly does NOT change

Booking engine & state machine · ledger (currency-agnostic, T-9) · module boundaries & API contracts (additive versioning, §24) · RBAC model · verified-review model · payments security baseline · security controls (PRD §33) — international growth exercises the existing abstractions; it does not fork them.

### 27.5 Risks & mitigations (scale-specific)

FX accounting (dual-record already, §7.6) · per-market legal variance (country checklist per launch, PRD R-8) · content quality (human-authored localization, no machine-spam — PRD SO-06) · seasonality overlap across hemispheres (capacity planning, PRD R-5) · support coverage (per-region SLAs before demand, ops plan).

---

## Appendix A — Cross-reference index (Phase 01/02 hooks)

| This document | PRD hook | UX hook |
|---|---|---|
| §5 auth | §16, §33.1, CV-*, AR-* | §8.2/8.3 (auth forms), §8.7 |
| §6 authz | §5, §24, AR-*, CO-* | §5.2 (portal/admin tiers) |
| §7 payments | §19, §12, §14, PY-*, CM-*, RF-* | §8.5 (PaymentState/Picker), §8.18 |
| §10 search | §20, §21, SE-* | §8.5 (search components) |
| §12 timers | §10.7, §8 SLA, §26–30 | — (drives UX countdowns honestly) |
| §13 notifications | §18, NF-* | §8.10 (notification center) |
| §17 errors | GC-4/GC-5, §33 | §8.18 (error states, ER-*) |
| §19 AI | §25, AI-* | §7.2 S11 (dual-state section) |
| §27 international | GC-1, §35.3, R-9 | §3.1 (Devanagari), §8.14 (≈ price) |

## Appendix B — Key decisions (full list)

| ID | Decision | Alternatives considered | Why |
|---|---|---|---|
| T-1 | Modular monolith API | Microservices; single flat app | Team size/ops; boundaries keep extraction viable (payments/search/notifications first candidates) |
| T-2 | Next 15 App Router (SSG/ISR/SSR/CSR split) | MPA + SPA; pure SSR | SEO + perf + interactivity in one stack; Vercel fit |
| T-3 | Single DB, table prefixes | Per-domain schemas; polyglot | Ops simplicity; code-enforced boundaries (CI) |
| T-4 | Drizzle ORM | Prisma; TypeORM | Typed + migration-first + SQL escape for FTS |
| T-5 | BullMQ + DB timer sweep | In-memory timers; dedicated scheduler service | Durable, inspectable, admin-adjustable SLAs |
| T-6 | Transactional outbox | Direct queue publish on change | No lost/duplicate cross-module events |
| T-7 | AWS canonical + Vercel web | GCP; Fly/Render PaaS; all-Serverless | PRD AWS requirement at day 1; IaC keeps options open |
| T-8 | Provider SPI + capability matrix | Hard-coded provider integrations | GC-2: no invented capabilities; UI driven by verified matrix |
| T-9 | BIGINT minor units | NUMERIC(14,2) | No float/rounding drift; integer math app-side |
| T-10 | Postgres FTS behind SPI | Meilisearch day 1; external SaaS | Zero new infra; documented swap trigger (T-10.2) |
| T-11 | OTel from day 1 | Vendor-locked APM agents | Vendor-neutral telemetry; business + system in one |
| T-12 | Trunk-based + expand/contract + flags | Release branches | Small safe fast deploys; kill switches |
| E-1 | AWS as canonical cloud (confirm) | — | see T-7 |
| E-2 | Managed observability platform (MVP) | Self-hosted Grafana stack | Speed; OTel keeps swap open |
| E-3 | HIBP k-anonymity range API (or local list) | Full-hash lookup | Privacy + practicality |
| E-4 | Vendor onboarding in production; staging dry-runs with synthetic vendors | Staging-first onboarding | Real documents in real system; staging parity for flows |
| E-5 | JWT HS256 + 180 d rotation runbook (MVP) | RS256/JWKS from day 1 | Single service today; upgrade path documented |
| E-6 | PR previews point at staging API | Ephemeral per-PR API | Cost; staging is the gate anyway |
| E-7 | sharp in worker (not API) | S3 image transforms | CPU isolation; full control of derivatives |
| E-8 | Postgres RLS deferred to `[V2]` evaluation | RLS at MVP | App-level scoping + tests sufficient now; clean org columns make RLS cheap later |

## Appendix C — Sign-off items (before Phase 04 scaffold)

1. **Cloud confirmation (E-1):** AWS canonical (recommended) or alternative.
2. **Observability vendor (E-2)** selection (affects budget line).
3. **Breach-list approach (E-3).**
4. **Preview API strategy (E-6)** confirmation.
5. **Postgres instance class + budget** at launch (right-sized by monitoring; decision with DevOps).
6. **Redis persistence scope** confirmation (AOF everysec for money-adjacent keys as specified).
7. **Webhook processing inline** (critical path) vs queued — confirm §3.5/§12.2 stance.
8. **Admin console in same web app** (role-gated routes) vs separate app — current plan: same app (UX §6.4 routes), separate build target optional `[V1.5]`.

---

*End of Phase 03 document v0.1. This architecture is the contract for Phase 04 (scaffold + foundations) and all subsequent build phases. Any deviation requires a version bump, change-log entry, and note in the affected PRD/UX sections.*
