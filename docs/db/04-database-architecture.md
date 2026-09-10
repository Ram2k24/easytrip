# Easy Trip Nepal — Database Architecture & Schema Plan (Phase 04)

| Field | Value |
|---|---|
| Document ID | ETN-DB-004 |
| Phase | 04 — Database Architecture |
| Version | 0.1 (DRAFT — pending engineering sign-off) |
| Date | 2026-09-10 |
| Depends on | [`docs/prd/01-product-requirements.md`](../prd/01-product-requirements.md) (PRD v0.2) · [`docs/ux/02-ux-design-system.md`](../ux/02-ux-design-system.md) (UX v0.1) · [`docs/arch/03-technical-architecture.md`](../arch/03-technical-architecture.md) (Arch v0.2, esp. §4) |
| Status | Awaiting stakeholder review (open items: §33) |

**Change log**

| Version | Date | Author | Summary |
|---|---|---|---|
| 0.1 | 2026-09-10 | Product/Engineering (Arena agent) | Initial full schema plan: 65+ requested entities mapped to canonical tables (Appendix A crosswalk), per-entity field/type/key/index/status/relationship specs, global conventions, enum catalog, ERD description, requirements-coverage matrix, index plan, plan additions vs Arch §4.2 (each justified), open items for sign-off. **No migrations implemented in this phase.** |

**Binding inheritance:** PRD global constraints GC-1…GC-7 and Arch §4 (DB-01…DB-06, naming, prefixes, indexes) bind this document. Where this document and the PRD/Arch disagree, the PRD/Arch wins. This document **refines and instantiates** Arch §4.2 (module → table ownership) — every table below carries the Arch-mandated module prefix; new tables beyond Arch §4.2 are listed with justification in §32.

---

## Table of contents

1. [Scope, reading guide & decisions](#1-scope-reading-guide--decisions)
2. [Global conventions](#2-global-conventions)
3. [Status & enum catalog (all tables)](#3-status--enum-catalog)
4. [Identity & access (auth, users, RBAC)](#4-identity--access)
5. [Customers & guests](#5-customers--guests)
6. [Vendors](#6-vendors)
7. [Geography & destinations](#7-geography--destinations)
8. [Catalog core (shared by all service lines)](#8-catalog-core)
9. [Vehicles line](#9-vehicles-line)
10. [Transfers line](#10-transfers-line)
11. [Transportation (charter) line](#11-transportation-charter-line)
12. [Hotels line](#12-hotels-line)
13. [Tours line](#13-tours-line)
14. [Treks line](#14-treks-line)
15. [Travel packages line](#15-travel-packages-line)
16. [Flights line (quote-only)](#16-flights-line-quote-only)
17. [Shared availability](#17-shared-availability)
18. [Quotes (incl. custom trips)](#18-quotes-incl-custom-trips)
19. [Bookings](#19-bookings)
20. [Payments & ledger](#20-payments--ledger)
21. [Refunds](#21-refunds)
22. [Invoices](#22-invoices)
23. [Coupons & promotions [V1.5]](#23-coupons--promotions-v15)
24. [Reviews](#24-reviews)
25. [Corporate](#25-corporate)
26. [Notifications](#26-notifications)
27. [Content (guides, pages)](#27-content-guides-pages)
28. [Admin config, disputes, search ops](#28-admin-config-disputes-search-ops)
29. [Analytics & reports](#29-analytics--reports)
30. [ERD description](#30-erd-description)
31. [Requirements coverage matrix](#31-requirements-coverage-matrix)
32. [Plan additions beyond Arch §4.2 (justified)](#32-plan-additions-beyond-arch-42-justified)
33. [Open items for sign-off](#33-open-items-for-sign-off)
- [Appendix A — Requested-entity → canonical-table crosswalk](#appendix-a--requested-entity--canonical-table-crosswalk)

---

## 1. Scope, reading guide & decisions

### 1.1 What this phase is (and is not)

- **Is:** the approved **schema plan** — every entity's fields, data types, primary key, foreign keys, indexes, unique constraints, status fields, and relationships, plus an ERD description and a proof that the design supports the mandated capabilities (multi-currency, multi-country, multi-vendor, multi-service-type, multi-item bookings, partial payments, refunds, availability, date/time, time zones).
- **Is not:** migration code, ORM code, seed data, or indexes on a live DB. Migrations come in a later phase, executed with Arch §4.6 expand/contract discipline against a fresh DB + N-1 upgrade check. **Nothing in this document is implemented yet.**
- **Source of truth for what exists:** PRD (behavior) > Arch §4 (structure) > this document (instantiation). This document may **add** tables/columns (justified in §32) but never **remove** or contradict Arch §4.2 ownership or DB-01…DB-06.

### 1.2 How to read the entity specs

Each entity section contains:

1. One-line **purpose** + owning **module** (Arch §21.4) + **line/version tag** where relevant.
2. **Fields table** — `Field | Type | Key | Notes`. `Key` values: `PK`, `FK`, `UQ` (unique), `UQ*` (unique partial — predicate in Notes), `IDX` (indexed, non-unique; full list also given after the table).
3. **Indexes** line — explicit, beyond what the table marks.
4. **Status** line — the status/state column + its enum (values in §3).
5. **Relationships** line — cardinality to other tables + the FKs that realize it.

All tables implicitly carry the baseline columns of Convention C-2 (`id`, `created_at`, `updated_at`) unless stated "append-only" (`created_at` only). They are not repeated in every field table.

### 1.3 Global design decisions (this document)

| ID | Decision | Rationale |
|---|---|---|
| D-1 | **One identity table** (`user`) for all human actors (customer, vendor member, platform staff); `cust_profile` / `ven_user` / RBAC rows specialize it | Arch §4.2 (users module owns `user`); avoids duplicate identities; PRD dedup rule CV-01 lives here |
| D-2 | **RBAC tables now** (`role`, `permission`, `user_role`, `role_permission`) with seeded platform roles (SUPER_ADMIN, OPS, FINANCE, SUPPORT, TRIP_DESK, CUST, VENDOR); vendor *org* roles are separate (`ven_user.org_role`) | PRD RBAC (GC-5) + Admin console; vendor org roles are a different concern (team membership, not platform permissions) |
| D-3 | **Status vs state naming:** `state` = full lifecycle state machine (booking, payment intent, refund, quote request, offer, settlement, invoice, dispute); `status` = simpler lifecycle flag (service, vendor org/capability/document, vehicle, property, content) | matches Arch §4.2 naming; prevents column-name collisions on joins |
| D-4 | **Money:** `BIGINT` minor units + `CHAR(3)` currency on **every** price/amount (DB-01); ledger normalized to NPR with dual-record on `pay_charge` for foreign-currency charges (PRD §19.5 PY-07) | mandated |
| D-5 | **Time:** all stored UTC (`timestamptz`); business dates as `date`; **local** business times as `time` + IANA `timezone` on the owning row (e.g. `bk_booking.timezone`); all timers/SLAs as `due_at timestamptz` | user requirement (time zones) + GC-1 (no hardcoded TZ) |
| D-6 | **Multi-currency:** every priced row carries its own `currency` (vendor may price in NPR or other ISO currency, admin-visible); display-currency conversion via `fx_rate` (admin-managed, versioned by date); booking price snapshot locks currency at booking | user requirement (multiple currencies) |
| D-7 | **Multi-item bookings:** `bk_booking` 1:N `bk_item` (one row per catalog service in the booking); single-item bookings have exactly one item; item carries `service_id` + optional reserved `asset` (specific vehicle/room). Corporate consolidated payment = one booking per trip group with multiple items (PRD V1.5) | user requirement (multiple booking items) |
| D-8 | **Partial payments:** a booking may have **multiple `pay_intent`s over time** (deposit `[V1.5]`, remainder, second payment for consolidated groups); `pay_intent.state=SUCCEEDED` events accumulate toward the booking's paid total (computed from ledger, never a cached counter); `AWAITING_PAYMENT` persists until total covered | user requirement (partial payments); PRD deposit+balance is V1.5 |
| D-9 | **Refunds:** `ref_refund` 1:N `ref_line` allocates the refund amount **per booking item** (pro-rata commission reversal per PRD CM-06/07); multiple refunds per booking allowed (partial refunds never change booking state — PRD BK-6) | user requirement (refunds) |
| D-10 | **Availability:** two shared structures, both CAS-versioned (DB-03): `av_count` (per-entity per-**date** capacity: vehicle-days, room-nights, transfer-day capacity) and `av_departure` (per-**dated-departure** seats: tours, treks, packages, scheduled-transfer windows). Line tables never duplicate seat/day inventory | Arch §4.2 (availability module) + user requirement (availability) |
| D-11 | **Custom trips = quotes:** `qtr_request.mode=CUSTOM` + `qtr_item` rows (the "trip items"); AI planner `[V2]` drafts write the same tables (single source of truth; no separate `custom_trip` tables) | Arch §21.4 (quotes owns "custom-trip draft orchestration"); avoids duplicated business logic (standing rule) |
| D-12 | **Flight bookings = bookings:** line `FLIGHT` bookings are normal `bk_booking`/`bk_item` rows (Pricing source = accepted agency **offer** only — no platform air pricing, GC-2); `bk_document(kind=ETICKET, provider_ref=PNR)` carries the e-ticket; no airline-inventory tables | PRD §26 (quote-only air line) + Arch §21.4 note |
| D-13 | **Invoices are first-class** (`inv_invoice` + `inv_invoice_line`) even though *corporate invoicing* is `[V1.5]`: customer receipts/invoices for payments exist from MVP (PRD §14), the table is additive and small | requested entity (Invoices); cheap now, painful later |
| D-14 | **Coupons/promotions tables designed now, feature `[V1.5]`** (PRD scope: "coupons/discount campaigns" = V1.5): schema additive, no MVP code path reads them | requested entities; PRD scope respected |
| D-15 | **Media:** one shared `srv_media` table serves all line image entities (VehicleImages, TourImages, …) with `kind` + moderation state — the lines already share `srv_service` (Arch BR-8); no per-line image tables | requested entities covered via canonical table (Appendix A) |
| D-16 | **Append-only protection:** `audit_log`, `pay_ledger_entry`, `bk_event`, `outbox`, `pay_provider_event`, `ana_event` get NO UPDATE/DELETE grant on the app DB role; immutability enforced at DB level, not just code (DB-05, BR-2) | PRD §33 audit + money integrity |
| D-17 | **No generic `deleted_at`:** lifecycle via status/state; hard delete only for never-published DRAFT rows without dependents (admin tooling, audited) | keeps queries simple, audit clean |
| D-18 | **IDs:** ULID (26-char Crockford base32) as `TEXT`, generated app-side; sortable by time; used for `id` on every table and for all FKs; human refs (`bk_booking.ref`, `cpn_coupon.code`) are separate, unique, display strings | Arch §4.1 |
| D-19 | **Enums:** `TEXT` + `CHECK` constraint (values in §3), canonical TS enums in `packages/contracts`; state machines are data (states + transitions) in the owning module, exhaustively unit-tested (Arch §2) | expand/contract migrations stay ALTER-free (T-12) |
| D-20 | **PII:** `*_enc BYTEA` app-level AES-256-GCM (DB-04) for passport, MFA secret, bank details; `*_masked` text for display; PII never in jsonb snapshots, events, or ledger memos | PRD §33.3 |
| D-21 | **Single logical DB, single schema, table prefixes per module** (Arch T-3); no cross-module FKs *except* where Arch §4.2 already implies them (e.g. `bk_item.service_id` → `srv_service` is allowed because bookings legitimately references catalog core — module matrix "Consumes catalog-core"); all other cross-module links are logical (documented, no physical FK) to keep extraction cheap | Arch §4.1 + §21.1; physical FKs used only within a module or to explicitly-consumed modules |

> **Physical-FK policy (D-21, concrete):** physical FKs **are** created for: same-module references; `→ user` (identity, L1, consumed by all); `→ geo_*` / `dst_destination` (destinations, consumed by L3+); `srv_service` (catalog-core, consumed by L3 line tables + L4 bookings/quotes); `→ pay_intent/pay_charge` (payments, consumed by refunds via facade); `bk_booking` (bookings, consumed by corporate/reviews/notifications). All other cross-module links (e.g. `ven_org` → `user`) are physical only within their module; vendor ownership of services is `srv_service.vendor_id → ven_org.id` (catalog-core explicitly consumes vendors — module matrix "Depends on vendors"). This is documented here so the migration phase has one rule to apply.

---

## 2. Global conventions

| # | Convention | Rule |
|---|---|---|
| C-1 | **ID** | `id TEXT` PK — ULID, app-generated (D-18). |
| C-2 | **Baseline columns** | `created_at timestamptz NOT NULL DEFAULT now()`; `updated_at timestamptz NOT NULL DEFAULT now()` (maintained by app layer; **append-only tables** carry `created_at` only, no `updated_at` — D-16 list). |
| C-3 | **Money** | `*_minor BIGINT NOT NULL` + `currency CHAR(3) NOT NULL`. Non-negative by default; `CHECK (x >= 0)` unless the column is explicitly signed (ledger `amount_minor`, surcharge `amount_minor`, adjustments). No `NUMERIC` for amounts/balances (DB-01). Rates (FX, tax %) and non-money metrics **may** be `NUMERIC`. |
| C-4 | **Time & time zones** | Timestamps `timestamptz` (UTC). Calendar dates `date`. Local business times `time` + owning-row `timezone TEXT` (IANA, e.g. `Asia/Kathmandu`). SLA/timer instants `timestamptz` (`due_at`). |
| C-5 | **Enums** | `TEXT` + `CHECK (col IN (…))`; values per §3; canonical enums in `packages/contracts`. |
| C-6 | **FKs** | `col {table}_id TEXT NOT NULL REFERENCES {table}(id)`. `ON DELETE`: default **RESTRICT**; **CASCADE** only for owned child rows of catalog/content entities (media, itineraries, inclusions, amenities, rate rows, package items, location points); never CASCADE into transactional/audit tables. Physical-FK policy per D-21. |
| C-7 | **Soft delete** | None generic (D-17). Retire via status; hard delete limited to never-published drafts without dependents. |
| C-8 | **JSONB** | Allowed for: immutable snapshots (`price_snapshot_jsonb`, `policy_snapshot_jsonb`, `qtr_offer.breakdown_jsonb`), provider payloads (redacted), SEO config, `meta`/`data` bags. **Not** for FK-referenced values or consistently-queried attributes (real columns). |
| C-9 | **PII** | D-20. Masked display columns alongside encrypted storage. |
| C-10 | **Indexes** | B-tree default; `UNIQUE` where listed; partial indexes marked `UQ*`/`IDX*`; GIN `tsvector` (generated column) + `pg_trgm` on catalog titles/slugs; BRIN on time-ordered high-volume tables (Arch §4.4). `EXTENSIONS: citext, pg_trgm` required. |
| C-11 | **Retention/partitioning** | `ana_event` monthly partitions (13 months hot → detach/archive); `ntf_notification` purge > 90 d; `audit_log` 1-year policy (legal confirm); `pay_provider_event` hot 48 h + 90-day archive `[V1.5]` (Arch §4.5). |
| C-12 | **Naming** | `snake_case`, singular table names (canonical entity name), `{table}_id` for FKs, `{purpose}_at` for timestamps, `*_minor` for money, `*_enc` for encrypted PII, `*_jsonb` for jsonb columns. The requested entity list uses plurals (e.g. "Vehicles"); canonical names are singular — Appendix A maps every requested entity to its canonical table. |
| C-13 | **Audit** | Every privileged/admin mutation and every state transition appends `audit_log` (or `bk_event` for booking transitions — DB-02/DB-05). |
| C-14 | **Outbox** | Every domain state change that emits an event writes `outbox` in the same transaction (DB-06). |
| C-15 | **Availability CAS** | All capacity decrements: `UPDATE … SET sold = sold + :n, version = version + 1 WHERE entity… AND version = :v AND sold + :n <= capacity` — affected-rows = 0 ⇒ conflict (409, "availability changed") (DB-03). |

### 2.1 Type shorthand used in field tables

| Shorthand | PostgreSQL |
|---|---|
| `ulid` | `TEXT` (ULID) |
| `ts` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `date` / `time` | `DATE` / `TIME` (no zone — pair with a `timezone` column per C-4) |
| `money` | `BIGINT NOT NULL` (+ sibling `currency CHAR(3) NOT NULL` unless noted) |
| `txt` | `TEXT` |
| `char(n)` / `var(n)` | `CHAR(n)` / `VARCHAR(n)` |
| `bool` | `BOOLEAN NOT NULL DEFAULT false` |
| `jsonb` | `JSONB NOT NULL DEFAULT '{}'` |
| `f8` | `DOUBLE PRECISION` (lat/lng only, with range CHECK) |
| `num(p,s)` | `NUMERIC(p,s)` — rates, ratings, non-money metrics only |
| `bytea` | `BYTEA` (encrypted PII) |

---

## 3. Status & enum catalog

All `TEXT`+`CHECK` columns, with owning tables. Values are closed sets for the scope tag shown; additions follow expand/contract (T-12).

| Enum | Values | Used by (tables) |
|---|---|---|
| `user.status` | `PENDING_VERIFICATION, ACTIVE, DEACTIVATED, BANNED` | user |
| `user.verification_level` | `NONE, EMAIL, PHONE, ID` (PHONE/ID `[V1.5]`) | user |
| `role.code` (seed) | `SUPER_ADMIN, OPS, FINANCE, SUPPORT, TRIP_DESK, CUST, VENDOR` + custom `[V1.5]` | role |
| `ven_org.status` | `DRAFT, PENDING_REVIEW, APPROVED, REJECTED, SUSPENDED, CLOSED` | ven_org |
| `ven_capability.status` | `PENDING, APPROVED, REJECTED, SUSPENDED, EXPIRED` | ven_capability |
| `ven_document.status` | `UPLOADED, UNDER_REVIEW, APPROVED, REJECTED, EXPIRED` | ven_document |
| `ven_bank.status` | `UNVERIFIED, VERIFIED, FLAGGED` | ven_bank |
| `srv_service.status` | `DRAFT, PENDING, PUBLISHED, SUSPENDED, RETIRED` (PRD §4 base entity) | srv_service + line extensions inherit |
| `srv_media.status` | `PENDING_MODERATION, APPROVED, REJECTED, REMOVED` | srv_media |
| `svc_line` (service line) | `TOUR, TREK, HOTEL, VEHICLE, TRANSFER, TRANSPORTATION, PACKAGE, FLIGHT, EXPERIENCE[V1.5]` | srv_service.line, bk_item.line, qtr_item.item_kind (as applicable), adm_setting commission keys |
| `price_unit` | `PER_PERSON, PER_VEHICLE, PER_NIGHT, PER_BOOKING, PER_DAY, PER_ITEM` | pricing tables |
| `qtr_request.status` | `SUBMITTED, ROUTED, IN_PROGRESS, OFFERED, ACCEPTED, DECLINED, EXPIRED, CANCELLED, NO_RESPONSE` | qtr_request |
| `qtr_request.mode` | `QUOTE, CUSTOM` | qtr_request |
| `qtr_offer.state` | `DRAFT, PENDING, ACCEPTED, DECLINED, EXPIRED, REVOKED, SUPERSEDED` | qtr_offer |
| `bk_booking.state` | `DRAFT, PENDING, QUOTED, AWAITING_PAYMENT, PAID, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, REFUNDED, FAILED` (PRD §10.7 — the 11-state lifecycle) | bk_booking |
| `bk_booking.mode` | `INSTANT, QUOTE, CUSTOM` | bk_booking |
| `bk_cancel_reason` | `CUSTOMER_REQUEST, VENDOR_DECLINED, PAYMENT_EXPIRED, OFFER_EXPIRED, NO_RESPONSE_TIMEOUT, VENDOR_CANNOT_HONOR, ADMIN, SAFETY, NO_SHOW, SYSTEM` (PRD BK-4) | bk_booking.cancel_reason_code, bk_event.reason_code |
| `bk_item.status` | `ACTIVE, CANCELLED` | bk_item |
| `bk_traveler.role_in_trip` | `LEAD, PAX` | bk_traveler |
| `bk_document.kind` | `VOUCHER, ETICKET, CONFIRMATION, POLICY_PDF, CERTIFICATE` | bk_document |
| `bk_timer.state` | `PENDING, FIRED, CANCELED` | bk_timer |
| `pay_intent.state` | `CREATED, PROCESSING, PENDING_MANUAL, SUCCEEDED, FAILED, EXPIRED, CANCELED` | pay_intent |
| `pay_method.method_type` | `EWALLET_ESewa, EWALLET_KHALTI, CARD_DOMESTIC, CARD_INTL, BANK_MANUAL` (capability-matrix driven) | pay_method, pay_intent.method_code |
| `pay_ledger.account` | `booking_receivable, vendor_payable, platform_commission, tax_collected, refund_asset, settlement, adjustment` (Arch §7.3) | pay_ledger_entry |
| `pay_settlement.state` | `DRAFT, APPROVED, PAID, VOID` | pay_settlement |
| `pay_payout.state` | `RECORDED, COMPLETED, FAILED` | pay_payout |
| `ref_refund.state` | `REQUESTED, APPROVED, PROCESSING, COMPLETED, REJECTED, FAILED` (Arch §7.5) | ref_refund |
| `ref_case.state` | `OPEN, VENDOR_ACK, RESOLVED, ESCALATED` | ref_case |
| `inv_invoice.state` | `DRAFT, ISSUED, PARTIALLY_PAID, PAID, VOID, OVERDUE` | inv_invoice |
| `cpn_coupon.kind` | `PERCENT, FIXED_AMOUNT, FEE_WAIVER` | cpn_coupon |
| `cpn_coupon.status` | `DRAFT, ACTIVE, PAUSED, EXPIRED, REVOKED` | cpn_coupon, cpn_promotion.status |
| `rev_review.state` | `PENDING_MODERATION, VISIBLE, REJECTED, REMOVED` | rev_review, rev_photo.status (PENDING/APPROVED/REJECTED) |
| `corp_org.status` | `PENDING_APPROVAL, ACTIVE, SUSPENDED, CLOSED` | corp_org |
| `corp_user.org_role` | `ADMIN, APPROVER, MEMBER` | corp_user |
| `corp_user.status` | `INVITED, ACTIVE, REMOVED` | corp_user |
| `corp_approval.state` | `PENDING, APPROVED, REJECTED, EXPIRED, CANCELLED` | corp_approval |
| `ntf_notification.channel` | `IN_APP, EMAIL, SMS[V1.5], WHATSAPP[V1.5]` | ntf_notification, ntf_delivery_log |
| `ntf_delivery_log.state` | `QUEUED, SENT, DELIVERED, BOUNCED, FAILED` | ntf_delivery_log |
| `cms.status` (guides/pages) | `DRAFT, PUBLISHED, ARCHIVED` | cms_guide, cms_page |
| `geo.status` | `ACTIVE, ARCHIVED` | geo_* |
| `dst_location.kind` | `LANDMARK, AIRPORT, STATION, PICKUP_POINT, DROP_OFF, MEETING_POINT, OTHER` | dst_location, srv_location_point.kind (PICKUP/DROP_OFF/MEETING/START/END) |
| `dsp_dispute.state` | `OPEN, IN_REVIEW, RESOLVED, ESCALATED, CLOSED` | dsp_dispute |
| `trek.difficulty` | `EASY, MODERATE, CHALLENGING, DIFFICULT` | trek_attr |
| `htl.meal_plan` | `NONE, BREAKFAST, HALF_BOARD, FULL_BOARD` | htl_rate_plan |
| `veh.status` | `AVAILABLE, MAINTENANCE, INACTIVE, RETIRED` | veh_fleet_vehicle |
| `trf.mode` | `SCHEDULED, PRIVATE, SHARED` | trf_service |
| `av.state` | `ACTIVE, CANCELED` | av_departure (av_count has no state — rows are deleted with the parent) |
| `pay_provider_event.state` | `RECEIVED, PROCESSED, IGNORED_REPLAY, ERROR` | pay_provider_event |
| `audit.actor_type` | `USER, ADMIN, SYSTEM, PROVIDER, VENDOR` | audit_log, bk_event.actor_type |
| `ana partitioning` | — | ana_event (monthly by `ts`) |

---

## 4. Identity & access

### 4.1 `user` — users (module **users**, L1)

Single identity table for every human actor (customers, vendor team members, platform staff). D-1.

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| email | citext | UQ | canonicalized (trim + lower) — dedup at commit (PRD CV-01) |
| phone | var(20) | IDX | E.164, nullable (MVP: email-first; GC-1 intl codes) |
| country_id | ulid | FK, IDX | → geo_country (self-declared) |
| first_name | txt | NOT NULL | |
| last_name | txt | NOT NULL | |
| password_hash | txt | NULL | Argon2id (E-5 params); NULL for OTP/IDP-only accounts `[V1.5]` |
| status | txt | IDX | `user.status` (§3) |
| verification_level | txt | | `user.verification_level` |
| preferred_currency | char(3) | | display preference (default `NPR`) — D-6 |
| preferred_locale | var(10) | | `en` MVP |
| timezone | txt | | IANA display default (NULL ⇒ device) |
| last_login_at | ts | NULL | |
| banned_reason | txt | NULL | set with status=BANNED |
| created_at / updated_at | ts | | baseline |

- **Indexes:** UQ(email); (phone) where phone IS NOT NULL; (status); (created_at desc).
- **Status:** `status` ∈ user.status; deactivation (not delete) on GDPR-style requests `[V1.5]` workflow.
- **Relationships:** 1:1 `cust_profile` (customers) · 1:1 `mfa_enrollment` · 1:N `auth_session` (families) · 1:N `pay_method` · M:N `role` via `user_role` · N:1 `ven_org` via `ven_user` · N:1 `corp_org` via `corp_user` · referenced by bookings/quotes/reviews as `*_user_id`.

### 4.2 `user_verification_event` — users

Verification attempts (email now; phone/ID `[V1.5]`).

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | append-only |
| user_id | ulid | FK, IDX | → user |
| kind | txt | | EMAIL_VERIFY / PHONE_VERIFY[V1.5] / ID_VERIFY[V1.5] |
| state | txt | | PENDING, SUCCESS, FAILED, EXPIRED |
| token_hash | txt | NULL | single-use tokens stored hashed |
| expires_at | ts | NULL | |
| ip_hash | txt | NULL | salted hash, not raw IP |
| created_at | ts | | append-only |

- **Relationships:** N:1 user.

### 4.3 `role` — auth (L1) — **requested: Roles**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| code | txt | UQ | `role.code` — seeded: SUPER_ADMIN, OPS, FINANCE, SUPPORT, TRIP_DESK, CUST, VENDOR |
| name | txt | NOT NULL | display |
| description | txt | NULL | |
| is_system | bool | | system roles cannot be deleted (D-2) |

- **Indexes:** UQ(code).
- **Relationships:** M:N `user` via `user_role`; M:N `permission` via `role_permission`.

### 4.4 `permission` — auth (L1) — **requested: Permissions**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| code | txt | UQ | e.g. `vendor.approve`, `booking.cancel`, `refund.approve`, `payment.void`, `settings.write`, `report.read`, `audit.read`, `dispute.manage`, `content.publish` (seed catalog in migration; ~24 codes) |
| module | txt | IDX | owning module (ownership map, Arch §2.2) |
| description | txt | | |
| is_privileged | bool | | requires admin step-up (TOTP re-prompt, Arch §6.6) |

- **Relationships:** M:N `role` via `role_permission`.

### 4.5 `user_role` — auth (L1) — **requested: UserRoles**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| user_id | ulid | FK, UQ-pair | → user |
| role_id | ulid | FK, UQ-pair | → role |
| granted_by | ulid | FK NULL | → user (admin) |
| expires_at | ts | NULL | optional expiry (temp access) |
| created_at | ts | | |

- **Unique:** UQ(user_id, role_id).
- **Indexes:** (user_id); (role_id).
- **Relationships:** M:N link user ↔ role.

### 4.6 `role_permission` — auth (L1)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| role_id | ulid | FK, UQ-pair | → role |
| permission_id | ulid | FK, UQ-pair | → permission |
| created_at | ts | | |

- **Unique:** UQ(role_id, permission_id).

### 4.7 `auth_session` — auth (L1) — refresh-token families (Arch §5.2)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| user_id | ulid | FK, IDX | → user |
| family_id | txt | UQ | opaque family id (reuse detection unit) |
| refresh_token_hash | txt | UQ | SHA-256; never raw (Arch §5.2) |
| device_fingerprint | txt | NULL | coarse, privacy-safe |
| ip_hash | txt | NULL | |
| user_agent | txt | NULL | |
| mfa_verified_at | ts | NULL | admin step-up validity (5-min window) |
| created_at | ts | | |
| rotated_at | ts | NULL | last rotation |
| expires_at | ts | NOT NULL | 30 d |
| revoked_at | ts | NULL | |
| revoke_reason | txt | NULL | LOGOUT, REUSE_DETECTED, POLICY, ADMIN |

- **Unique:** UQ(refresh_token_hash); (family_id, revoked_at IS NULL) partial unique → enforces 1 active row per family rotation chain.
- **Indexes:** (user_id, created_at desc) — customer max-5-families eviction; (family_id); partial IDX (expires_at) for sweeper.
- **Relationships:** N:1 user.

### 4.8 `mfa_enrollment` — auth (L1)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| user_id | ulid | FK, UQ | → user (one TOTP enrollment) |
| kind | txt | | TOTP (MVP) |
| secret_enc | bytea | NOT NULL | AES-256-GCM (DB-04/D-20) |
| verified | bool | | |
| created_at | ts | | |
| disabled_at | ts | NULL | |

- **Unique:** UQ(user_id) where disabled_at IS NULL (partial).
- **Relationships:** 1:1 user.

### 4.9 `otp_issue` — auth (L1)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | append-only |
| purpose | txt | | EMAIL_VERIFY, PASSWORD_RESET, LOGIN[V1.5] |
| identifier_hash | txt | IDX | hashed email/phone (rate-limit key) |
| code_hash | txt | NOT NULL | 6-digit, never raw |
| expires_at | ts | NOT NULL | 10 min (verify) / 30 min (reset) |
| consumed_at | ts | NULL | single-use |
| attempts | int | NOT NULL DEFAULT 0 | |
| created_at | ts | | append-only |

- **Indexes:** (identifier_hash, created_at desc) — 3/15-min rate limit.
- **Relationships:** logical → user.

### 4.10 `auth_idp_account` — auth (L1) `[V1.5]` (schema now per Arch §5.5)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| user_id | ulid | FK, UQ-pair | → user |
| provider | txt | UQ-pair | google (MVP: none active) |
| subject | txt | UQ | provider subject id |
| linked_at | ts | | |

- **Unique:** UQ(provider, subject); UQ(user_id, provider).

### 4.11 `audit_log` — auth (L1) — **requested: AuditLogs** (DB-05)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | append-only, no UPDATE/DELETE grant (D-16) |
| actor_type | txt | IDX | `audit.actor_type` |
| actor_id | ulid | NULL, IDX | user id when human |
| role_code | txt | NULL | role at action time |
| action | txt | IDX | e.g. `vendor.approve`, `booking.cancel`, `settings.update` |
| entity_type | txt | IDX-pair | |
| entity_id | ulid | IDX-pair | |
| before_hash | txt | NULL | SHA-256 of before-state (or of before-payload) |
| after_hash | txt | NULL | |
| meta | jsonb | NULL | non-PII context (reason, ids) |
| ip_hash | txt | NULL | |
| created_at | ts | BRIN, IDX | BRIN(ts) + (actor_id, ts desc) + (entity_type, entity_id, ts desc) |

- **Indexes (Arch §4.4):** (actor_id, ts desc); (entity_type, entity_id, ts desc); BRIN(created_at).
- **Retention:** 1 year (C-11, legal confirm).

### 4.12 `idempotency_key` — auth (L1) (Arch §3.6)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| key_hash | txt | UQ | SHA-256(scope + key); scope = user_id (or 'anon') |
| scope_user_id | ulid | NULL, IDX | |
| request_hash | txt | NOT NULL | hash of normalized request body — same key + different body ⇒ 422 |
| response_status | int | NULL | stored on first completion |
| response_body | jsonb | NULL | replayed verbatim |
| created_at | ts | | |
| expires_at | ts | IDX | 24 h retention sweeper |

- **Unique:** UQ(key_hash).
- **Relationships:** none (standalone); referenced logically by `bk_booking.idempotency_ref` (stores the raw key, not FK — key may expire).

### 4.13 `outbox` — foundation/events (L0) (DB-06)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | append-only |
| aggregate_type | txt | IDX-pair | e.g. `bk_booking` |
| aggregate_id | ulid | IDX-pair | |
| event_type | txt | IDX | canonical catalog (Arch §12.4) |
| payload | jsonb | NOT NULL | typed in packages/contracts |
| created_at | ts | NOT NULL | |
| published_at | ts | NULL | dispatcher sets |
| attempt | int | NOT NULL DEFAULT 0 | |
| last_error | txt | NULL | |

- **Indexes:** (aggregate_type, aggregate_id, created_at desc); (published_at IS NULL) partial — dispatcher scan; BRIN(created_at).

---

## 5. Customers & guests

### 5.1 `cust_profile` — customers (L5) — **requested: Customers**

Customer-facing profile, 1:1 with `user` (D-1). "Customer" = user with role CUST (or any user who books).

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| user_id | ulid | FK, UQ | → user |
| display_name | txt | NULL | fallback full name |
| preferred_currency | char(3) | | display (D-6) |
| preferred_locale | var(10) | | |
| emergency_contact_name | txt | NULL | |
| emergency_contact_phone | var(20) | NULL | E.164 |
| nationality | var(60) | NULL | used to prefill travelers |
| dob | date | NULL | PII-light (display-able, not `*_enc`) |
| marketing_consent | bool | | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(user_id).
- **Relationships:** 1:1 user; 1:N bookings (via user); 1:N wishlists; 1:N reviews (via user).

### 5.2 `cust_guest_contact` — customers (L5) (Arch §4.2)

Quote-only guest (no account): contact + signed one-time deep-link token (24 h, Arch §5.1).

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| name | txt | NOT NULL | |
| email | citext | NOT NULL, IDX | |
| phone | var(20) | NULL | |
| token_hash | txt | UQ | single-use, 24 h (account claim) |
| token_expires_at | ts | | |
| claimed_user_id | ulid | NULL | set when guest claims account (merge path) |
| created_at | ts | | |

- **Relationships:** 1:N `qtr_request` (guest quotes); logical N:1 user after claim.

### 5.3 `cust_wishlist` — customers (L5) — **requested: Wishlists**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| user_id | ulid | FK, IDX | → user |
| title | txt | NOT NULL | default `My wishlist` |
| visibility | txt | NOT NULL DEFAULT private | private, shared[V1.5] |
| created_at / updated_at | ts | | |

- **Indexes:** (user_id, created_at desc).
- **Relationships:** 1:N user; 1:N `cust_wishlist_item`. (If named lists are later cut from scope, item table still works standalone — low cost, D-17.)

### 5.4 `cust_wishlist_item` — customers (L5) — **requested: WishlistItems**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| wishlist_id | ulid | FK, CASCADE | → cust_wishlist |
| user_id | ulid | FK, IDX | denormalized (badge counts) |
| service_id | ulid | FK | → srv_service |
| note | txt | NULL | |
| created_at | ts | | |

- **Unique:** UQ(wishlist_id, service_id).
- **Indexes:** (user_id, created_at desc).
- **Relationships:** N:1 wishlist/user/srv_service.

---

## 6. Vendors

### 6.1 `ven_org` — vendors (L2) — **requested: Vendors**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| name | txt | NOT NULL, IDX | legal/brand name |
| slug | txt | UQ | |
| email | citext | NOT NULL | org contact |
| phone | var(20) | NULL | E.164 |
| country_id | ulid | FK | → geo_country (multi-country vendors, GC-1) |
| state_id | ulid | FK NULL | → geo_state |
| district_id | ulid | FK NULL | → geo_district |
| address_text | txt | NULL | |
| website | txt | NULL | |
| tax_id_masked | var(40) | NULL | masked (finance-scoped) |
| status | txt | IDX | `ven_org.status` |
| approved_at | ts | NULL | |
| approved_by | ulid | NULL | → user (admin) |
| rejection_reason | txt | NULL | |
| suspended_at | ts | NULL | |
| suspension_reason | txt | NULL | |
| profile_meta | jsonb | NULL | about, service highlights (display) |
| created_at / updated_at | ts | | |

- **Indexes:** UQ(slug); (status); (country_id); GIN trgm(name) for admin search.
- **Status:** `status` ∈ ven_org.status.
- **Relationships:** 1:N `ven_user` (team), `ven_capability`, `ven_document`, `ven_bank`, `ven_payout_detail`; 1:N `srv_service` (services, via catalog-core consumption); 1:N `pay_settlement`/`pay_payout`; 1:N `ref_case`; 1:N `dsp_dispute`; review aggregates roll up via service.

### 6.2 `ven_user` — vendors (L2) — vendor team membership + org role

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| ven_org_id | ulid | FK, IDX | → ven_org |
| user_id | ulid | FK | → user |
| org_role | txt | NOT NULL | OWNER, MANAGER, STAFF (D-2: org role ≠ platform RBAC) |
| status | txt | NOT NULL | ACTIVE, INVITED, REMOVED |
| invited_by | ulid | NULL | → user |
| joined_at | ts | NULL | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(ven_org_id, user_id) where status <> 'REMOVED' (partial).
- **Relationships:** M:N link ven_org ↔ user.

### 6.3 `ven_capability` — vendors (L2) — per-line approval + expiry (PRD VA-05/06)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| ven_org_id | ulid | FK, IDX | → ven_org |
| line | txt | NOT NULL | `svc_line` |
| status | txt | IDX | `ven_capability.status` |
| expiry_date | date | NULL | line-level doc expiry driver |
| reminder_sent_t30 | bool | | T-30 doc-expiry reminder (PRD VA-06) |
| reminder_sent_t7 | bool | | T-7 reminder |
| approved_at | ts | NULL | |
| approved_by | ulid | NULL | → user |
| rejection_reason | txt | NULL | |
| meta | jsonb | NULL | e.g. IATA/ground-handling refs for flight agencies |
| created_at / updated_at | ts | | |

- **Unique:** UQ(ven_org_id, line).
- **Indexes:** (status, expiry_date) — expiry sweep job.
- **Relationships:** N:1 ven_org; gates `srv_service.publish` per line (Arch BR-4, atomic with catalog gate).

### 6.4 `ven_document` — vendors (L2) — **requested: VendorDocuments**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| ven_org_id | ulid | FK, IDX | → ven_org |
| line | txt | NULL | NULL = org-level (registration), else line-specific license |
| doc_type | txt | NOT NULL | REGISTRATION, LICENSE, INSURANCE, TAX, IATA_ACCREDITATION, PARTNERSHIP, OTHER |
| title | txt | NOT NULL | |
| file_key | txt | NOT NULL | S3 object key (minio, `private` bucket) |
| file_name | txt | NULL | original filename (display) |
| valid_from | date | NULL | |
| valid_to | date | NULL | expiry ⇒ T-30/T-7 reminders, auto-status EXPIRED sweep |
| status | txt | IDX | `ven_document.status` |
| review_note | txt | NULL | |
| reviewed_by | ulid | NULL | → user |
| reviewed_at | ts | NULL | |
| version | int | NOT NULL DEFAULT 1 | re-upload bumps version (history kept) |
| created_at / updated_at | ts | | |

- **Indexes:** (ven_org_id, doc_type, status); (status, valid_to) — expiry sweep.
- **Relationships:** N:1 ven_org; drives `ven_capability` expiry.

### 6.5 `ven_bank` — vendors (L2) — finance-scoped (BR-6), encrypted (DB-04)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| ven_org_id | ulid | FK, UQ | → ven_org (one active bank record; replace = new row, old archived) |
| bank_name | txt | NOT NULL | |
| branch | txt | NULL | |
| account_holder_enc | bytea | NOT NULL | encrypted (DB-04) |
| account_number_enc | bytea | NOT NULL | encrypted; masked display column below |
| account_masked | var(20) | | `****1234` |
| currency | char(3) | NOT NULL | payout currency |
| is_verified | bool | NOT NULL DEFAULT false | |
| verified_by | ulid | NULL | → user (FINANCE) |
| verified_at | ts | NULL | |
| status | txt | | `ven_bank.status` |
| created_at / updated_at | ts | | |

- **Unique:** UQ(ven_org_id) where status <> 'FLAGGED' and archived_at IS NULL — keep simple: UQ(ven_org_id, created_at) + app enforces single-active; partial UQ(ven_org_id) where status = 'VERIFIED'.
- **Relationships:** N:1 ven_org; consumed by `pay_payout` (settlement runs).

### 6.6 `ven_payout_detail` — vendors (L2)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| ven_org_id | ulid | FK, UQ | → ven_org |
| method | txt | NOT NULL DEFAULT bank_transfer | bank_transfer (MVP; auto-payout `[V1.5]`) |
| schedule | txt | NOT NULL DEFAULT weekly | weekly (PRD SM-01) |
| holds_config | jsonb | NOT NULL | per-line hold days, e.g. `{"FLIGHT":30,"default":7}` (PRD CM-03) |
| min_payout_minor | money | NOT NULL | below ⇒ carry to next period |
| currency | char(3) | NOT NULL | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(ven_org_id).
- **Relationships:** 1:1 ven_org; read by settlement job.

---

## 7. Geography & destinations

> Multi-country by construction (D-5/D-6): every geo table is country-scoped; seeds start from Nepal (7 provinces / 77 districts, PRD C-8) but nothing is hardcoded.

### 7.1 `geo_country` — destinations (L3) — **requested: Countries**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| code_iso2 | char(2) | UQ | `NP` |
| name | txt | NOT NULL | |
| currency_default | char(3) | NOT NULL | `NPR` |
| timezone_default | txt | NOT NULL | IANA (e.g. `Asia/Kathmandu`) |
| map_center | jsonb | NULL | `[lat, lng]` + zoom |
| status | txt | | `geo.status` |
| created_at / updated_at | ts | | |

- **Indexes:** UQ(code_iso2); (status).
- **Relationships:** 1:N `geo_state`, `geo_airport`, `dst_destination`; referenced by user/ven_org/corp_org.

### 7.2 `geo_state` — destinations (L3) — **requested: Provinces**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| country_id | ulid | FK, IDX | → geo_country |
| name | txt | NOT NULL | province (Nepal) / region (generic) |
| code | var(10) | NULL | e.g. province number |
| status | txt | | `geo.status` |
| created_at / updated_at | ts | | |

- **Unique:** UQ(country_id, name).
- **Indexes:** (country_id, name).
- **Relationships:** N:1 country; 1:N `geo_district`.

### 7.3 `geo_district` — destinations (L3) — **requested: Districts**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| state_id | ulid | FK, IDX | → geo_state |
| country_id | ulid | FK, IDX | → geo_country (denormalized for queries) |
| name | txt | NOT NULL | |
| code | var(10) | NULL | |
| status | txt | | `geo.status` |
| created_at / updated_at | ts | | |

- **Unique:** UQ(country_id, name).
- **Relationships:** N:1 state + country; 1:N `geo_city`, `dst_location`.

### 7.4 `geo_city` — destinations (L3) — **requested: Cities**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| district_id | ulid | FK, IDX | → geo_district |
| country_id | ulid | FK, IDX | → geo_country (denormalized) |
| name | txt | NOT NULL, GIN trgm | |
| lat | f8 | | CHECK (-90…90) |
| lng | f8 | | CHECK (-180…180) |
| status | txt | | `geo.status` |
| created_at / updated_at | ts | | |

- **Unique:** UQ(country_id, name).
- **Indexes:** (district_id); (country_id, name); GIN trgm(name).
- **Relationships:** N:1 district/country; 1:N `geo_airport`, `dst_location`.

### 7.5 `geo_alias` — destinations (L3)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| entity_type | txt | NOT NULL | country, state, district, city, destination |
| entity_id | ulid | NOT NULL, IDX | logical ref (no physical FK — polymorphic) |
| alias | txt | NOT NULL | normalized (lower, trimmed) |
| kind | txt | | TRANSLIT, SPELLING, NAME, OLD_NAME |
| created_at | ts | | |

- **Unique:** UQ(entity_type, entity_id, alias).
- **Indexes:** (alias, entity_type) — search fallback.
- **Relationships:** logical N:1 to any geo/destination entity.

### 7.6 `geo_airport` — destinations (L3)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| iata | char(3) | UQ | |
| icao | char(4) | NULL, UQ | |
| name | txt | NOT NULL | |
| city_id | ulid | FK NULL | → geo_city |
| country_id | ulid | FK | → geo_country |
| lat | f8 | NOT NULL | |
| lng | f8 | NOT NULL | |
| status | txt | | `geo.status` |
| created_at / updated_at | ts | | |

- **Relationships:** N:1 city/country; referenced by `flt_route`, `dst_location(kind=AIRPORT)`.

### 7.7 `dst_destination` — destinations (L3) — **requested: Destinations**

SEO destination hub (PRD: 15–20 at launch).

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| slug | txt | UQ | SEO |
| name | txt | NOT NULL, GIN trgm | |
| kind | txt | NOT NULL | REGION, CITY, LANDMARK, TREK_AREA, LAKE, MOUNTAIN, OTHER |
| country_id | ulid | FK, IDX | → geo_country |
| state_id | ulid | FK NULL | → geo_state |
| district_id | ulid | FK NULL | → geo_district |
| city_id | ulid | FK NULL | → geo_city |
| lat | f8 | NULL | representative point |
| lng | f8 | NULL | |
| summary | txt | NULL | short (card) |
| body_md | txt | NULL | hub page content (original, GC-6) |
| hero_media_key | txt | NULL | S3 key |
| seo_title | txt | NULL | |
| seo_description | txt | NULL | |
| seo_jsonb | jsonb | | structured data (JSON-LD) |
| timezone | txt | NULL | display TZ override (IANA) |
| currency_display | char(3) | NULL | display default override |
| featured | bool | | homepage rail |
| ops_rank | int | | manual ordering |
| status | txt | IDX | `cms.status` (DRAFT/PUBLISHED/ARCHIVED) |
| published_at | ts | NULL | |
| created_at / updated_at | ts | | |

- **Indexes:** UQ(slug); (country_id, status); (kind, status); GIN trgm(name); GIN tsvector generated `search_vector` (name+summary+body) — FTS behind SearchProvider SPI (Arch §10).
- **Relationships:** N:1 geo chain; 1:N `srv_service` (destination_id), `dst_location`, `qtr_item`, `rpt` rollups.

### 7.8 `dst_location` — destinations (L3) — **requested: Locations**

Points of interest (pickup/drop-off/meeting/landmarks) referenced by services & routes.

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| destination_id | ulid | FK NULL, IDX | → dst_destination |
| country_id | ulid | FK | → geo_country |
| state_id | ulid | FK NULL | |
| district_id | ulid | FK NULL | |
| city_id | ulid | FK NULL | |
| name | txt | NOT NULL, GIN trgm | |
| kind | txt | NOT NULL | `dst_location.kind` (§3) |
| lat | f8 | NOT NULL | |
| lng | f8 | NOT NULL | |
| address_text | txt | NULL | |
| notes | txt | NULL | e.g. "meet 15 min before departure" |
| status | txt | | `geo.status` |
| created_at / updated_at | ts | | |

- **Indexes:** (destination_id); (district_id, kind); GIN trgm(name); (lat, lng) — radius queries `WHERE status='ACTIVE'`.
- **Relationships:** N:1 geo; referenced by `trf_route` (origin/destination), `srv_location_point`, `av_departure.meeting_location_id`, `bk_document` meeting notes.

---

## 8. Catalog core

> All service lines share `srv_service` (Arch BR-8). Line modules own their extension tables (next sections) linked by `service_id` — the **one base row per sellable offer** rule. Pricing that is date-driven lives in line-specific rate tables or `price_surcharge`; the base price lives on `srv_service`.

### 8.1 `srv_service` — catalog-core (L3) — the base service entity (PRD §4)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| vendor_id | ulid | FK, IDX | → ven_org |
| line | txt | NOT NULL, IDX | `svc_line` (FLIGHT rows do not exist — quote-only, D-12) |
| status | txt | IDX | `srv_service.status` |
| destination_id | ulid | FK NULL, IDX | → dst_destination |
| lat | f8 | NULL | primary point (search radius) |
| lng | f8 | NULL | |
| title | txt | NOT NULL | |
| slug | txt | UQ | |
| summary | txt | NULL | card blurb |
| description_md | txt | NULL | detail content (original, GC-6) |
| tags | jsonb | | array of tag codes |
| is_instant | bool | NOT NULL | instant-booking eligible (PRD booking model) |
| is_quote | bool | NOT NULL | quote-eligible (custom) |
| min_participants | int | NULL | |
| max_participants | int | NULL | |
| base_price_minor | money | NULL | NULL ⇒ "Price on request" (UX data-honesty) |
| currency | char(3) | NULL | with base price (D-6) |
| price_unit | txt | NULL | `price_unit` |
| duration_minutes | int | NULL | typical duration |
| lead_time_hours | int | NULL | minimum booking lead |
| version | int | NOT NULL DEFAULT 1 | edit version (publish bumps) |
| seo_title | txt | NULL | |
| seo_description | txt | NULL | |
| seo_jsonb | jsonb | | JSON-LD |
| ops_rank | int | | |
| submitted_at | ts | NULL | vendor submit |
| published_at | ts | NULL | |
| retired_at | ts | NULL | |
| created_by_user_id | ulid | NULL | → user (vendor member or ops) |
| search_vector | tsvector | generated | GIN — FTS (Arch §10) |
| created_at / updated_at | ts | | |

- **Indexes (Arch §4.4):** UQ(slug); (line, status, destination_id); GIN(search_vector); GIN trgm(title), GIN trgm(slug); (vendor_id, status); (created_at desc).
- **Status:** `status` per PRD base entity.
- **Relationships:** N:1 ven_org / dst_destination; 1:N `srv_media`, `srv_addon`, `srv_location_point`, `price_surcharge`; 1:1 line extension (one row in exactly one of veh_/trf_/trp_/htl_/tour_/trek_/pkg_ tables, `service_id` UQ); 1:N `bk_item`, `qtr_item`, `cust_wishlist_item`, `rev_review`, availability rows.

### 8.2 `srv_media` — catalog-core (L3) — **requested: VehicleImages, TourImages, (all line images)**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, CASCADE, IDX | → srv_service |
| file_key | txt | NOT NULL | S3 (media bucket) |
| kind | txt | NOT NULL | IMAGE, VIDEO, THUMB |
| alt | txt | NULL | a11y + SEO |
| width | int | NULL | |
| height | int | NULL | |
| position | int | NOT NULL DEFAULT 0 | ordering |
| status | txt | IDX | `srv_media.status` (moderation) |
| created_at | ts | | |

- **Unique:** UQ(service_id, file_key).
- **Indexes:** (service_id, position) where status='APPROVED'.
- **Relationships:** N:1 service (CASCADE).

### 8.3 `srv_addon` — catalog-core (L3)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, CASCADE, IDX | |
| title | txt | NOT NULL | |
| description | txt | NULL | |
| kind | txt | | UPGRADE, EXTRA_DAY, TRANSPORT, GUIDE, EQUIPMENT, OTHER |
| price_minor | money | NOT NULL | |
| currency | char(3) | NOT NULL | |
| price_unit | txt | NOT NULL | |
| is_active | bool | NOT NULL DEFAULT true | |
| position | int | | |
| created_at / updated_at | ts | | |

- **Relationships:** N:1 service; 1:N `bk_item.addon_ids` (jsonb array on item, logical).

### 8.4 `srv_location_point` — catalog-core (L3)

Service-specific pickup/drop-off/meeting points (Arch §4.2 "location points").

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, CASCADE, IDX | |
| kind | txt | NOT NULL | PICKUP, DROP_OFF, MEETING, START, END |
| location_id | ulid | FK NULL | → dst_location (preferred) |
| name | txt | NOT NULL | |
| lat | f8 | NULL | fallback point |
| lng | f8 | NULL | |
| address_text | txt | NULL | |
| position | int | | |
| created_at / updated_at | ts | | |

- **Relationships:** N:1 service (CASCADE), N:1 dst_location.

### 8.5 `price_surcharge` — catalog-core (L3) — date-based adjustments (shared line logic, BR-8)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, CASCADE, IDX | |
| kind | txt | NOT NULL | PEAK_SEASON, HOLIDAY, LONG_STAY_DISCOUNT, SINGLE_SUPPLEMENT, OFF_SEASON_DISCOUNT, OTHER |
| name | txt | NOT NULL | |
| amount_minor | money | NOT NULL | **signed** (negative = discount); CHECK allows ± |
| currency | char(3) | NOT NULL | |
| applies_to | txt | NULL | PER_NIGHT, PER_DAY, PER_BOOKING, PER_PERSON |
| valid_from | date | NOT NULL | |
| valid_to | date | NULL | |
| meta | jsonb | NULL | e.g. date lists for holidays |
| status | txt | NOT NULL DEFAULT active | active, inactive |
| created_at / updated_at | ts | | |

- **Indexes:** (service_id, valid_from, valid_to).
- **Relationships:** N:1 service (CASCADE); consumed by shared pricing engine (catalog-core facade).

### 8.6 `tax_config` — catalog-core (L3)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| country_id | ulid | FK | → geo_country |
| line | txt | NULL | NULL = all lines |
| tax_kind | txt | NOT NULL | GST, VAT, SERVICE_TAX |
| rate | num(5,2) | NOT NULL | percent (NUMERIC allowed — rate, not money) |
| applies_to | txt | NOT NULL | SUBTOTAL, BASE_PRICE, SERVICE_FEE |
| valid_from | date | NOT NULL | |
| valid_to | date | NULL | |
| status | txt | NOT NULL DEFAULT active | |
| note | txt | NULL | config, never hardcoded (GC-1) |
| created_at / updated_at | ts | | |

- **Unique:** UQ(country_id, line, tax_kind, valid_from) (partial, valid_to IS NULL).
- **Relationships:** N:1 country; read by pricing engine + booking snapshot.

### 8.7 `fx_rate` — catalog-core (L3)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| from_currency | char(3) | UQ-pair | |
| to_currency | char(3) | UQ-pair | |
| rate | num(18,8) | NOT NULL | NUMERIC (rate, not money) |
| as_of | date | UQ-pair | |
| source | txt | NOT NULL | MANUAL (MVP) / PROVIDER[V1.5] |
| set_by | ulid | NULL | → user (FINANCE) |
| created_at | ts | | |

- **Unique:** UQ(from_currency, to_currency, as_of).
- **Indexes:** (to_currency, as_of desc).
- **Relationships:** none; seeds per Arch §4.6 (manual, labeled source); display conversion only — **ledger stays NPR-normalized** (D-4).

---

## 9. Vehicles line

### 9.1 `veh_type` — vehicles (L3) — **requested: VehicleTypes**

Dictionary of vehicle classes (shared by transfers/transportation via `veh_type_id`).

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| name | txt | UQ | e.g. Sedan, SUV, 4x4, Minibus, Bus |
| category | txt | | ECONOMY, STANDARD, PREMIUM, LUXURY, 4X4, COACH |
| seat_min | int | NULL | |
| seat_max | int | NULL | |
| description | txt | NULL | |
| is_active | bool | NOT NULL DEFAULT true | |
| created_at / updated_at | ts | | |

- **Relationships:** 1:N `veh_fleet_vehicle`, `trf_service.veh_type_id`, `trp_service.veh_type_id`.

### 9.2 `veh_feature` — vehicles (L3) — **requested: VehicleFeatures**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, CASCADE, IDX | → srv_service (line=VEHICLE) |
| feature_code | txt | NOT NULL | AC, REFRIGERATOR, GPS, ROOF_RACK, INVERTER, EXTRA_BAGGAGE, DRIVER_SPEAKS_EN, … |
| label | txt | NOT NULL | display |
| value | jsonb | NULL | e.g. seats count, liters |
| is_included | bool | NOT NULL DEFAULT true | false ⇒ paid addon (links srv_addon) |
| position | int | | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(service_id, feature_code).
- **Relationships:** N:1 service (CASCADE).

### 9.3 `veh_fleet_vehicle` — vehicles (L3) — **requested: Vehicles**

Physical fleet unit behind a VEHICLE service (a service may list several identical units).

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, IDX | → srv_service (NULL = unlisted spare unit) |
| ven_org_id | ulid | FK, IDX | → ven_org (denormalized) |
| veh_type_id | ulid | FK | → veh_type |
| make | txt | NOT NULL | |
| model | txt | NOT NULL | |
| year | int | NULL | |
| color | txt | NULL | |
| plate_masked | var(20) | NULL | masked (vehicle registry is not customer PII but keep masked, D-20 spirit) |
| seats | int | NOT NULL | |
| luggage_capacity | int | NULL | bags |
| fuel_type | txt | NULL | PETROL, DIESEL, HYBRID, ELECTRIC |
| transmission | txt | NULL | MANUAL, AUTOMATIC |
| is_self_drive | bool | NOT NULL DEFAULT false | self-drive deposit per PRD D6 (vendor-collected exception) |
| deposit_required_minor | money | NULL | self-drive deposit (D6) |
| currency | char(3) | NULL | |
| status | txt | IDX | `veh.status` |
| notes | txt | NULL | |
| created_at / updated_at | ts | | |

- **Indexes:** (service_id, status); (ven_org_id, status).
- **Relationships:** N:1 service/ven_org/veh_type; 1:N `av_count` (entity_type='vehicle'); reserved via `bk_item.asset_kind='vehicle', asset_id=veh_fleet_vehicle.id`.

### 9.4 `veh_rate` — vehicles (L3) — **requested: VehiclePricing**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, CASCADE, IDX | → srv_service (line=VEHICLE) |
| date_from | date | NOT NULL | |
| date_to | date | NULL | NULL = open-ended |
| per_day_price_minor | money | NOT NULL | |
| currency | char(3) | NOT NULL | |
| km_included | int | NULL | daily km allowance |
| km_overtime_price_minor | money | NULL | per km |
| driver_included | bool | NOT NULL DEFAULT false | |
| fuel_policy | txt | NOT NULL DEFAULT full_to_full | full_to_full, INCLUDE, RETURN_SAME |
| min_rental_days | int | NOT NULL DEFAULT 1 | |
| weekend_price_minor | money | NULL | Fri–Sun override (Nepal weekend) |
| status | txt | NOT NULL DEFAULT active | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(service_id, date_from) (partial, date_to IS NULL) — app validates no overlaps at write.
- **Indexes:** (service_id, date_from).
- **Relationships:** N:1 service (CASCADE); date-range pricing + `price_surcharge` composites in the shared pricing engine.

---

## 10. Transfers line

### 10.1 `trf_route` — transfers (L3) — **requested: TransferRoutes**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| name | txt | NOT NULL | e.g. "Kathmandu → Pokhara (Airport→City)" |
| slug | txt | UQ | |
| origin_location_id | ulid | FK | → dst_location |
| destination_location_id | ulid | FK | → dst_location |
| distance_km | num(7,1) | NULL | |
| duration_minutes | int | NULL | typical |
| vendor_id | ulid | FK NULL | curated by ops (NULL) or vendor-proposed |
| status | txt | NOT NULL DEFAULT active | |
| notes | txt | NULL | |
| created_at / updated_at | ts | | |

- **Indexes:** UQ(slug); (origin_location_id); (destination_location_id).
- **Relationships:** N:1 locations; 1:N `trf_service`.

### 10.2 `trf_service` — transfers (L3) — **requested: Transfers** (line extension of a service)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, UQ, CASCADE-logical | → srv_service (line=TRANSFER) |
| route_id | ulid | FK | → trf_route |
| veh_type_id | ulid | FK | → veh_type (vehicle class) |
| mode | txt | NOT NULL | `trf.mode` (SCHEDULED, PRIVATE, SHARED) |
| is_scheduled | bool | NOT NULL | scheduled ⇒ windows (below) |
| seats_per_window | int | NULL | shared/scheduled capacity |
| window_minutes | int | NULL | window length |
| price_unit | txt | NOT NULL | PER_VEHICLE / PER_PERSON |
| notes | txt | NULL | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(service_id); UQ(route_id, veh_type_id, mode) (dedup identical offerings).
- **Indexes:** (route_id); (mode, is_scheduled).
- **Relationships:** 1:1 service (the offer); N:1 route/veh_type; 1:N `trf_rate`, `trf_window`; availability: private ⇒ no inventory (instant, vendor-honored); scheduled/shared ⇒ `trf_window` rows + `av_count` (entity_type='trf_daily') for daily capacity.

### 10.3 `trf_rate` — transfers (L3) — **requested: TransferPricing**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, CASCADE, IDX | |
| rate_date | date | NOT NULL | |
| price_minor | money | NOT NULL | date-specific override (holidays/peak) |
| currency | char(3) | NOT NULL | |
| status | txt | NOT NULL DEFAULT active | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(service_id, rate_date).
- **Relationships:** N:1 service (CASCADE); absent row ⇒ base price applies.

### 10.4 `trf_window` — transfers (L3) — scheduled transfer windows

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, CASCADE, IDX | |
| window_date | date | NOT NULL | |
| window_start | time | NOT NULL | local |
| window_end | time | NOT NULL | |
| timezone | txt | NOT NULL | IANA (route local tz) — C-4 |
| capacity | int | NOT NULL | |
| sold | int | NOT NULL DEFAULT 0 | CHECK (sold <= capacity) |
| version | int | NOT NULL DEFAULT 0 | CAS (C-15) |
| status | txt | NOT NULL DEFAULT active | active, canceled |
| created_at / updated_at | ts | | |

- **Unique:** UQ(service_id, window_date, window_start).
- **Indexes:** (service_id, window_date) where status='active' and sold < capacity — search.
- **Relationships:** N:1 service (CASCADE); seats sold at booking (CAS).

---

## 11. Transportation (charter) line

### 11.1 `trp_service` — transportation (L3) — **requested: TransportationServices**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, UQ | → srv_service (line=TRANSPORTATION) |
| origin_location_id | ulid | FK NULL | → dst_location (free-text alt in notes) |
| destination_location_id | ulid | FK NULL | |
| veh_type_id | ulid | FK | → veh_type |
| capacity_max | int | NULL | max pax |
| day_type | txt | NOT NULL | DAY_TRIP, MULTI_DAY |
| duration_minutes | int | NULL | typical |
| is_driver_included | bool | NOT NULL DEFAULT true | |
| notes | txt | NULL | route description, stops |
| created_at / updated_at | ts | | |

- **Unique:** UQ(service_id).
- **Relationships:** 1:1 service; 1:N `trp_rate`; capacity per day via `av_count` (entity_type='trp_daily', capacity = max pax or vehicle count).

### 11.2 `trp_rate` — transportation (L3) — charter pricing

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, CASCADE, IDX | |
| rate_date | date | NOT NULL | |
| price_minor | money | NOT NULL | per-vehicle per-day |
| currency | char(3) | NOT NULL | |
| status | txt | NOT NULL DEFAULT active | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(service_id, rate_date).

---

## 12. Hotels line

### 12.1 `htl_property` — hotels (L3) — **requested: Hotels** (line extension)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, UQ | → srv_service (line=HOTEL) |
| name | txt | NOT NULL | |
| destination_id | ulid | FK NULL | → dst_destination |
| district_id | ulid | FK NULL | → geo_district |
| address_text | txt | NULL | |
| lat | f8 | NULL | |
| lng | f8 | NULL | |
| star_rating | int | NULL | 1–5, vendor-claimed; CHECK (1..5) |
| star_verified | bool | NOT NULL DEFAULT false | ops-verified (honest display, GC-2) |
| checkin_time | time | NULL | local |
| checkout_time | time | NULL | |
| timezone | txt | NOT NULL | IANA (property local) |
| contact_phone | var(20) | NULL | |
| policy_snapshot_seed | jsonb | NULL | default cancellation policy (copied to booking snapshot) |
| notes | txt | NULL | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(service_id).
- **Relationships:** 1:1 service; 1:N `htl_room_type`, `htl_amenity`; 1:N `av_count` (entity_type='room').

### 12.2 `htl_room_type` — hotels (L3) — **requested: HotelRooms**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| property_id | ulid | FK, CASCADE, IDX | → htl_property |
| name | txt | NOT NULL | |
| capacity_max | int | NOT NULL | guests |
| extra_bed_allowed | bool | NOT NULL DEFAULT false | |
| bed_config | jsonb | | e.g. `{"king":1}` |
| size_m2 | num(6,1) | NULL | |
| floor | var(10) | NULL | |
| base_price_minor | money | NULL | default night (rate plans override) |
| currency | char(3) | NULL | |
| status | txt | NOT NULL DEFAULT active | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(property_id, name).
- **Relationships:** N:1 property (CASCADE); 1:N `htl_amenity` links (via room), `htl_rate_plan`, `av_count` (entity_id=room_type).

### 12.3 `htl_amenity` — hotels (L3) — **requested: HotelAmenities**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| property_id | ulid | FK, CASCADE, IDX | |
| room_type_id | ulid | FK NULL, CASCADE | NULL = property-level amenity |
| amenity_code | txt | NOT NULL | WIFI, PARKING, RESTAURANT, POOL, SPA, GYM, BREAKFAST_ONSITE, HEATING, … |
| label | txt | NOT NULL | |
| is_verified | bool | NOT NULL DEFAULT false | |
| position | int | | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(property_id, room_type_id, amenity_code) (NULL-safe: partial unique for room-scoped + separate for property-scoped — implemented as UQ(property_id, amenity_code) where room_type_id IS NULL and UQ(room_type_id, amenity_code) where room_type_id IS NOT NULL).
- **Relationships:** N:1 property / room.

### 12.4 `htl_rate_plan` — hotels (L3) — **requested: HotelPricing**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| room_type_id | ulid | FK, CASCADE, IDX | |
| name | txt | NOT NULL | e.g. "Non-refundable" |
| meal_plan | txt | NOT NULL DEFAULT NONE | `htl.meal_plan` |
| price_per_night_minor | money | NOT NULL | |
| currency | char(3) | NOT NULL | |
| min_nights | int | NOT NULL DEFAULT 1 | |
| max_nights | int | NULL | |
| capacity_override | int | NULL | max guests for this plan |
| cancel_policy | jsonb | NOT NULL | structured: `[{hours_before:72, charge_pct:0},{hours_before:0, charge_pct:100}]` (snapshot-copied to booking) |
| taxes_included | bool | NOT NULL DEFAULT false | |
| valid_from | date | NULL | |
| valid_to | date | NULL | |
| status | txt | NOT NULL DEFAULT active | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(room_type_id, name, valid_from).
- **Indexes:** (room_type_id, valid_from).
- **Relationships:** N:1 room (CASCADE); date-specific night overrides via `price_surcharge` (kind=PEAK_SEASON, applies_to=PER_NIGHT).

- **RoomAvailability (requested):** `av_count` rows, entity_type=`room`, entity_id=room_type id, per date (capacity = available rooms, sold = booked rooms) — §17.

---

## 13. Tours line

### 13.1 `tour_service` — tours (L3) — **requested: Tours** (line extension)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, UQ | → srv_service (line=TOUR) |
| duration_minutes | int | NOT NULL | |
| is_departure_based | bool | NOT NULL DEFAULT true | true ⇒ dated departures (seats) |
| min_participants | int | NULL | |
| max_participants | int | NULL | |
| languages | jsonb | | e.g. `["en","ne"]` |
| meeting_location_id | ulid | FK NULL | → dst_location (default meeting point) |
| guide_required | bool | NOT NULL DEFAULT true | |
| equipment_provided | jsonb | | array of codes |
| permits_included | jsonb | | array of permit codes |
| notes | txt | NULL | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(service_id).
- **Relationships:** 1:1 service; 1:N `tour_package`, `tour_itinerary`, `tour_inclusion`, `tour_exclusion`; seat inventory via `av_departure` (entity_type='tour', entity_id=service).

### 13.2 `tour_package` — tours (L3) — **requested: TourPackages**

Named sellable variants of one tour (e.g. "Half Day", "Full Day + Lunch") sharing the tour's itinerary/inclusions with overrides.

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, CASCADE, IDX | → srv_service (line=TOUR) |
| name | txt | NOT NULL | |
| description | txt | NULL | |
| price_minor | money | NULL | NULL ⇒ uses service base price |
| currency | char(3) | NULL | |
| price_unit | txt | NOT NULL DEFAULT PER_PERSON | |
| valid_from | date | NULL | |
| valid_to | date | NULL | |
| is_default | bool | NOT NULL DEFAULT false | package shown when none selected |
| position | int | | |
| status | txt | NOT NULL DEFAULT active | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(service_id, name, valid_from).
- **Relationships:** N:1 service (CASCADE); optional filter target of `tour_inclusion/tour_exclusion.applies_to_package_id`; selected on `bk_item.meta.package_id` (logical).

### 13.3 `tour_itinerary` — tours (L3) — **requested: TourItineraries**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, CASCADE, IDX | |
| day_number | int | NOT NULL | 1-based (multi-day tours) |
| title | txt | NOT NULL | |
| description_md | txt | NULL | |
| stops | jsonb | | `[{location_id?, name, order, duration_min}]` (location refs logical) |
| position | int | | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(service_id, day_number, position).
- **Relationships:** N:1 service (CASCADE).

### 13.4 `tour_inclusion` — tours (L3) — **requested: TourInclusions**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, CASCADE, IDX | |
| applies_to_package_id | ulid | FK NULL | → tour_package (NULL = all packages) |
| item_code | txt | NOT NULL | TRANSPORT, LUNCH, GUIDE, ENTRY_FEES, PICKUP, WATER, … |
| label | txt | NOT NULL | |
| quantity | int | NULL | |
| position | int | | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(service_id, applies_to_package_id, item_code) (NULL-safe pair).
- **Relationships:** N:1 service (CASCADE); N:1 package.

### 13.5 `tour_exclusion` — tours (L3) — **requested: TourExclusions**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, CASCADE, IDX | |
| applies_to_package_id | ulid | FK NULL | |
| label | txt | NOT NULL | |
| position | int | | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(service_id, applies_to_package_id, label).

---

## 14. Treks line

### 14.1 `trek_attr` — treks (L3) — **requested: Treks** (line extension of the trek service)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, UQ | → srv_service (line=TREK) |
| trek_route_id | ulid | FK NULL | → trek_route (fixed named route, e.g. ABC) |
| difficulty | txt | NOT NULL | `trek.difficulty` |
| days | int | NOT NULL | |
| nights | int | NOT NULL | |
| max_altitude_m | int | NULL | |
| season_tags | jsonb | | e.g. `["spring","autumn"]` |
| accommodation_type | txt | NOT NULL | LODGE, TENT, MIXED |
| permits_required | jsonb | | `[{code, name, cost_minor, currency, paid_by}]` |
| start_location_id | ulid | FK NULL | → dst_location |
| end_location_id | ulid | FK NULL | |
| guide_required | bool | NOT NULL DEFAULT true | |
| notes | txt | NULL | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(service_id).
- **Relationships:** 1:1 service; N:1 trek_route; 1:N `trek_itinerary`; seat inventory via `av_departure` (entity_type='trek').

### 14.2 `trek_route` — treks (L3) — **requested: TrekRoutes**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| name | txt | NOT NULL | e.g. "Annapurna Circuit" |
| slug | txt | UQ | |
| country_id | ulid | FK | → geo_country |
| region | txt | NULL | e.g. Annapurna, Everest, Langtang |
| start_location_id | ulid | FK NULL | |
| end_location_id | ulid | FK NULL | |
| distance_km | num(7,1) | NULL | |
| max_altitude_m | int | NULL | |
| typical_days | int | NULL | |
| summary | txt | NULL | original content (GC-6) |
| status | txt | NOT NULL DEFAULT active | |
| created_at / updated_at | ts | | |

- **Indexes:** UQ(slug); (region).
- **Relationships:** N:1 country/locations; 1:N `trek_attr`.

### 14.3 `trek_itinerary` — treks (L3) — **requested: TrekItineraries**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, CASCADE, IDX | |
| day_number | int | NOT NULL | |
| from_location_id | ulid | FK NULL | |
| to_location_id | ulid | FK NULL | |
| distance_km | num(7,1) | NULL | |
| walking_hours | num(5,1) | NULL | |
| altitude_m | int | NULL | |
| description_md | txt | NULL | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(service_id, day_number).

---

## 15. Travel packages line

### 15.1 `pkg_service` — packages (L3) — **requested: TravelPackages** (line extension)

Multi-component trip (hotel + tours + transfers …) sold as one offer.

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, UQ | → srv_service (line=PACKAGE) |
| min_days | int | NULL | |
| max_days | int | NULL | |
| style_flags | jsonb | NOT NULL DEFAULT '{}' | `{family: bool, corporate: bool, honeymoon: bool, …}` (PRD: Family/Corporate = flags) |
| min_participants | int | NULL | |
| max_participants | int | NULL | |
| per_person_pricing | bool | NOT NULL DEFAULT true | false ⇒ per-group |
| is_departure_based | bool | NOT NULL DEFAULT false | true ⇒ fixed-date departures (av_departure) |
| notes | txt | NULL | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(service_id).
- **Relationships:** 1:1 service; 1:N `pkg_item`.

### 15.2 `pkg_item` — packages (L3) — **requested: PackageItems**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| pkg_service_id | ulid | FK, CASCADE, IDX | → pkg_service |
| service_id | ulid | FK, IDX | → srv_service (component: tour/hotel/vehicle/transfer/…) |
| item_kind | txt | NOT NULL | TOUR, HOTEL, VEHICLE, TRANSFER, TRANSPORTATION, TREK |
| quantity | int | NOT NULL | nights / days / units |
| unit_price_minor | money | NULL | NULL ⇒ price at composition time (component base) |
| currency | char(3) | NULL | |
| position | int | NOT NULL | itinerary order |
| notes | txt | NULL | |
| created_at / updated_at | ts | | |

- **Indexes:** (pkg_service_id, position); (service_id) — "used in N packages".
- **Relationships:** N:1 pkg_service (CASCADE); N:1 srv_service (RESTRICT — components must exist; components are references, never owned).

---

## 16. Flights line (quote-only)

> Per PRD §26 / Arch D-12: **no air inventory, no airline/GDS assumptions (GC-2)**. The "catalog" is curated routes; every flight request is a quote (agency vendor); booking happens only from an accepted offer.

### 16.1 `flt_route` — flights (L3) — **requested: Flights**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| origin_airport_id | ulid | FK, IDX | → geo_airport |
| destination_airport_id | ulid | FK, IDX | → geo_airport |
| name | txt | NOT NULL | e.g. "Kathmandu ↔ Pokhara" |
| slug | txt | UQ | |
| is_round_trip_eligible | bool | NOT NULL DEFAULT true | |
| typical_duration_minutes | int | NULL | informational |
| airlines_info | jsonb | NULL | informational list (display only, **never** availability/inventory — GC-2) |
| status | txt | NOT NULL DEFAULT active | |
| notes | txt | NULL | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(slug); UQ(origin_airport_id, destination_airport_id, is_round_trip_eligible).
- **Relationships:** N:1 airports; referenced by `qtr_item (item_kind=FLIGHT_ROUTE)`, `flt_search`.

### 16.2 `flt_search` — flights (L3) — **requested: FlightSearches**

Search log (analytics + quote prefill). Never invents inventory.

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| user_id | ulid | FK NULL, IDX | → user |
| guest_id | ulid | FK NULL | → cust_guest_contact |
| qtr_request_id | ulid | NULL | set when a search converts to a quote |
| flt_route_id | ulid | FK NULL | → flt_route (or null for free-text city pair) |
| origin_iata | char(3) | NOT NULL | |
| dest_iata | char(3) | NOT NULL | |
| depart_date | date | NOT NULL | |
| return_date | date | NULL | |
| pax | jsonb | NOT NULL | `{"adults":1,"children":0}` |
| cabin_class | txt | NULL | ECONOMY, PREMIUM, BUSINESS |
| created_at | ts | BRIN | |

- **Indexes:** (origin_iata, dest_iata, depart_date); (qtr_request_id); BRIN(created_at).
- **Relationships:** logical → quote; feeds `rpt_funnel_daily` (search funnel).

---

## 17. Shared availability

> The **only** capacity structures in the schema (D-10). Both use the CAS decrement pattern C-15 (DB-03). Line tables never store their own sold-capacity columns.

### 17.1 `av_count` — availability (L3, shared) — **requested: VehicleAvailability, TransferAvailability, RoomAvailability** (day-granular)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| entity_type | txt | NOT NULL | vehicle, room, trf_daily, trp_daily, other |
| entity_id | ulid | NOT NULL | ulid of the concrete asset (veh_fleet_vehicle / htl_room_type / trf_service / trp_service) |
| count_date | date | NOT NULL | |
| capacity | int | NOT NULL CHECK (capacity >= 0) | |
| sold | int | NOT NULL DEFAULT 0 CHECK (sold <= capacity) | |
| version | int | NOT NULL DEFAULT 0 | CAS (C-15) |
| created_at / updated_at | ts | | |

- **Unique:** UQ(entity_type, entity_id, count_date) (Arch §4.4).
- **Indexes:** (entity_type, entity_id, count_date) partial `sold < capacity` — search/availability checks; (count_date) for ops calendar.
- **Lifecycle:** rows created by vendor/ops (or auto-seeded from defaults); deleted with parent (CASCADE managed at app level via module ownership); capacity 0 = locked-out, **never deleted mid-history** (DB-03).
- **Relationships:** polymorphic owner (vehicle/room/trf/trp) — logical, documented per line section.

### 17.2 `av_departure` — availability (L3, shared) — dated seat departures (tours, treks, packages, scheduled departures)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| entity_type | txt | NOT NULL | tour, trek, package |
| entity_id | ulid | NOT NULL | ulid of the `srv_service` (departure belongs to the offer) |
| departure_date | date | NOT NULL | |
| departure_time | time | NULL | local |
| timezone | txt | NOT NULL | IANA (departure local tz) — C-4 |
| meeting_location_id | ulid | FK NULL | → dst_location |
| guide_name | txt | NULL | |
| seats_total | int | NOT NULL CHECK (seats_total > 0) | |
| seats_sold | int | NOT NULL DEFAULT 0 CHECK (seats_sold <= seats_total) | |
| version | int | NOT NULL DEFAULT 0 | CAS (C-15) |
| state | txt | NOT NULL DEFAULT active | `av.state` (ACTIVE, CANCELED) |
| meta | jsonb | NULL | line-specific (e.g. trek permit batch) |
| created_at / updated_at | ts | | |

- **Unique:** UQ(entity_type, entity_id, departure_date, departure_time) (partial where departure_time IS NOT NULL) + UQ(entity_type, entity_id, departure_date) (partial where departure_time IS NULL).
- **Indexes:** (entity_type, entity_id, departure_date) where state='ACTIVE' and seats_sold < seats_total — search; (state, departure_date) — expiry/cancel sweeps.
- **Relationships:** logical owner = service; 1:N bookings consume seats via `bk_item.meta.departure_id` (logical) + CAS on this table at booking time.

---

## 18. Quotes (incl. custom trips)

> D-11: **custom trips are quotes** — `qtr_request.mode=CUSTOM` + `qtr_item` rows. The AI planner `[V2]` writes the same tables. No separate custom-trip tables.

### 18.1 `qtr_request` — quotes (L4) — **requested: Quotes, CustomTrips**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| ref | txt | UQ | human quote ref (e.g. `QT-2026-000123`) |
| mode | txt | NOT NULL | `QUOTE, CUSTOM` (custom = Build-Your-Trip) |
| user_id | ulid | FK NULL, IDX | → user |
| guest_id | ulid | FK NULL | → cust_guest_contact (guest quote) |
| corp_org_id | ulid | FK NULL | → corp_org (corporate request) |
| contact_name | txt | NOT NULL | |
| contact_email | citext | NOT NULL | |
| contact_phone | var(20) | NULL | |
| destination_id | ulid | FK NULL | → dst_destination (primary) |
| travel_date_from | date | NULL | |
| travel_date_to | date | NULL | |
| pax | jsonb | NOT NULL | `{"adults":2,"children":0,"total":2}` |
| requirements_txt | txt | NULL | free text (custom trips) |
| status | txt | IDX | `qtr_request.status` |
| routed_vendor_ids | jsonb | NULL | assigned vendor orgs (routing) |
| sla_due_at | ts | NOT NULL | quote 24 h / offer 48 h default (PRD §10.7, bk_timer-driven) |
| responded_at | ts | NULL | first vendor offer |
| accepted_offer_id | ulid | NULL | → qtr_offer |
| booking_id | ulid | NULL | → bk_booking (on accept) |
| expires_at | ts | | request TTL |
| no_response_at | ts | NULL | SLA breach marker |
| source | txt | NOT NULL DEFAULT web | web, trip_desk, ai[V2] |
| notes | txt | NULL | |
| created_at / updated_at | ts | | |

- **Indexes:** (status, sla_due_at) — SLA sweep; (user_id, created_at desc); (guest_id); (routed_vendor_ids @> ?) GIN jsonb — vendor inbox; (travel_date_from).
- **Status:** `qtr_request.status`.
- **Relationships:** 1:N `qtr_item`, `qtr_offer`; 1:0..1 bk_booking; emits `quote.requested` (outbox); SLA via `bk_timer` (subject_type='qtr_request').

### 18.2 `qtr_item` — quotes (L4) — **requested: QuoteItems, TripItems**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| request_id | ulid | FK, CASCADE, IDX | → qtr_request |
| item_kind | txt | NOT NULL | TOUR, TREK, HOTEL, VEHICLE, TRANSFER, TRANSPORTATION, PACKAGE, FLIGHT_ROUTE, TRIP_DAY, OTHER |
| service_id | ulid | FK NULL, IDX | known catalog service (optional) |
| flt_route_id | ulid | FK NULL | for FLIGHT_ROUTE items |
| destination_id | ulid | FK NULL | |
| date_from | date | NULL | |
| date_to | date | NULL | |
| quantity | int | NULL | nights / seats / units |
| position | int | NOT NULL | trip order (custom trips) |
| notes | txt | NULL | |
| created_at / updated_at | ts | | |

- **Indexes:** (request_id, position); (service_id).
- **Relationships:** N:1 request (CASCADE); N:1 service/flt_route/destination.

### 18.3 `qtr_offer` — quotes (L4) — vendor offer (versioned)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| request_id | ulid | FK, CASCADE, IDX | → qtr_request |
| vendor_id | ulid | FK, IDX | → ven_org |
| version | int | NOT NULL | 1-based per request+vendor |
| state | txt | IDX | `qtr_offer.state` |
| amount_minor | money | NOT NULL | offer total |
| currency | char(3) | NOT NULL | |
| breakdown_jsonb | jsonb | NOT NULL | **immutable after submit (PRD PR-08):** items (service refs, qty, unit price, per-day where relevant), taxes, fees |
| terms_md | txt | NULL | cancellation policy terms, inclusions/exclusions summary |
| valid_until | ts | NOT NULL | offer validity (default 48 h from submit) |
| booking_id | ulid | NULL | set on accept |
| submitted_by_user_id | ulid | NULL | → user (vendor member) |
| submitted_at | ts | NULL | |
| accepted_at | ts | NULL | |
| reject_reason | txt | NULL | |
| superseded_by_id | ulid | NULL | → qtr_offer (newer version) |
| created_at / updated_at | ts | | |

- **Unique:** UQ(request_id, vendor_id, version).
- **Indexes (Arch §4.4):** (request_id, version desc); (state, valid_until) — expiry timer; (vendor_id, state, created_at desc) — vendor inbox.
- **Status:** `qtr_offer.state`.
- **Relationships:** N:1 request/vendor; 1:0..1 bk_booking (accept ⇒ booking created with `qtr_offer_id`); emits `offer.created/accepted/declined/expired`.

---

## 19. Bookings

### 19.1 `bk_group` — bookings (L4) — trip group (consolidated payments)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| user_id | ulid | FK, IDX | → user |
| label | txt | NOT NULL | |
| trip_date_from | date | NULL | |
| trip_date_to | date | NULL | |
| status | txt | NOT NULL DEFAULT active | active, completed, canceled |
| created_at / updated_at | ts | | |

- **Relationships:** 1:N `bk_booking`.

### 19.2 `bk_booking` — bookings (L4) — **requested: Bookings** (state machine, BR-3)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| ref | txt | UQ | human booking ref (e.g. `ET-2026-000123`) |
| mode | txt | NOT NULL | `INSTANT, QUOTE, CUSTOM` |
| line | txt | NOT NULL, IDX | dominant/primary line (single-item: that line; multi-item: ops-assigned primary) — `svc_line` |
| state | txt | IDX | `bk_booking.state` (11-state PRD lifecycle) |
| vendor_id | ulid | FK, IDX | → ven_org (single-vendor per booking — multi-vendor trips = multiple bookings in one group) |
| user_id | ulid | FK NULL, IDX | → user (customer of record) |
| guest_id | ulid | FK NULL | → cust_guest_contact |
| corp_org_id | ulid | FK NULL, IDX | → corp_org (corporate booking) |
| trip_group_id | ulid | FK NULL | → bk_group |
| qtr_offer_id | ulid | FK NULL | → qtr_offer (QUOTE/CUSTOM provenance) |
| service_id | ulid | FK NULL, IDX | → srv_service (single-item convenience; multi-item ⇒ NULL, items carry services) |
| currency | char(3) | NOT NULL | booking settlement currency (D-6) |
| total_minor | money | NOT NULL | grand total at snapshot |
| price_snapshot_jsonb | jsonb | NOT NULL | **immutable (PRD PR-08, DB-01):** items, unit prices, surcharges, tax, totals, source (base/surcharge/offer) |
| policy_snapshot_jsonb | jsonb | NOT NULL | cancellation policy + SLAs + holds at booking time |
| start_date | date | NOT NULL | trip local start |
| end_date | date | NOT NULL | trip local end |
| start_time_local | time | NULL | |
| end_time_local | time | NULL | |
| timezone | txt | NOT NULL | IANA (trip local tz, C-4/D-5) |
| pax_count | int | NOT NULL | |
| idempotency_ref | txt | NULL | raw Idempotency-Key (money/state commands, Arch §3.6) |
| paid_at | ts | NULL | |
| confirmed_at | ts | NULL | vendor confirm (SLA 12 h) |
| completed_at | ts | NULL | |
| cancelled_at | ts | NULL | |
| cancel_reason_code | txt | NULL | `bk_cancel_reason` (BK-4) |
| failure_reason | txt | NULL | |
| status_changed_at | ts | NOT NULL | last transition (audit pair with bk_event) |
| created_by_user_id | ulid | NULL | → user |
| created_at / updated_at | ts | | |

- **Indexes (Arch §4.4):** UQ(ref); (state); (vendor_id, created_at desc); (trip_group_id); (user_id, created_at desc); (corp_org_id, created_at desc); UQ* (idempotency_ref) partial where idempotency_ref IS NOT NULL; (start_date, end_date) — vendor ops calendar; (service_id) where service_id IS NOT NULL.
- **Status:** `state` — transitions only via bookings commands (BR-3); every transition appends `bk_event` (DB-02) + `audit_log` when actor ≠ system.
- **Relationships:** 1:N `bk_item`, `bk_traveler`, `bk_document`, `bk_event`, `bk_timer`; 1:1 venue of payment intents (`pay_intent.booking_id`); N:1 vendor/user/corp/offer/group/service; 1:N `inv_invoice`, `ref_refund`, `corp_approval`, `dsp_dispute`, `rev_review` (via items).

### 19.3 `bk_item` — bookings (L4) — **requested: BookingItems**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| booking_id | ulid | FK, CASCADE, IDX | → bk_booking |
| qtr_item_id | ulid | FK NULL | provenance (quote/custom trip item) |
| service_id | ulid | FK, IDX | → srv_service |
| line | txt | NOT NULL | `svc_line` (denormalized from service at snapshot time) |
| title_snapshot | txt | NOT NULL | display title at booking (survives service edits) |
| quantity | int | NOT NULL | |
| unit_price_minor | money | NOT NULL | |
| currency | char(3) | NOT NULL | |
| line_total_minor | money | NOT NULL | qty × unit |
| discount_minor | money | NOT NULL DEFAULT 0 | coupon/promotion allocation `[V1.5]` |
| asset_kind | txt | NULL | vehicle, room (specific asset reserved) |
| asset_id | ulid | NULL | ulid of reserved asset (veh_fleet_vehicle / htl_room_type) — logical |
| meta | jsonb | NULL | package_id, departure_id, addon ids, flight route id, pax mapping |
| status | txt | NOT NULL DEFAULT active | `bk_item.status` |
| position | int | NOT NULL | |
| notes | txt | NULL | |
| created_at / updated_at | ts | | |

- **Indexes:** (booking_id, position); (service_id); (asset_kind, asset_id) where asset_id IS NOT NULL — asset double-booking guard.
- **Status:** `status` ∈ bk_item.status (partial refund/cancel per item — PRD BK-6).
- **Relationships:** N:1 booking (CASCADE on delete of booking is impossible — bookings are never deleted); N:1 service/qtr_item; 1:N `ref_line` (refund allocation), `rev_review` (one verified review per completed item).

### 19.4 `bk_traveler` — bookings (L4) — **requested: BookingPassengers**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| booking_id | ulid | FK, CASCADE, IDX | |
| item_id | ulid | FK NULL | → bk_item (per-item pax where needed) |
| first_name | txt | NOT NULL | |
| middle_name | txt | NULL | |
| last_name | txt | NOT NULL | |
| dob | date | NULL | |
| gender | txt | NULL | |
| nationality | var(60) | NULL | |
| passport_enc | bytea | NULL | encrypted (DB-04); air items |
| passport_masked | var(20) | NULL | |
| passport_expiry | date | NULL | |
| phone | var(20) | NULL | E.164 |
| email | citext | NULL | |
| role_in_trip | txt | NOT NULL DEFAULT PAX | LEAD, PAX |
| position | int | NOT NULL | |
| created_at / updated_at | ts | | |

- **Indexes:** (booking_id, position); (item_id).
- **Relationships:** N:1 booking (CASCADE); N:1 item.

### 19.5 `bk_document` — bookings (L4) — vouchers, e-tickets, confirmations

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| booking_id | ulid | FK, CASCADE, IDX | |
| item_id | ulid | FK NULL | |
| kind | txt | NOT NULL | `bk_document.kind` |
| title | txt | NOT NULL | |
| file_key | txt | NULL | S3 (private bucket) |
| provider_ref | var(60) | NULL | **PNR for ETICKET** (GC-2: agency-supplied, never platform-fabricated) |
| issued_at | ts | | |
| meta | jsonb | NULL | |
| created_at | ts | | |

- **Unique:** UQ(booking_id, kind, provider_ref) (partial, provider_ref IS NOT NULL).
- **Relationships:** N:1 booking/item.

### 19.6 `bk_event` — bookings (L4) — **requested: BookingStatusHistory** (append-only, DB-02)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | append-only, no UPDATE/DELETE grant (D-16) |
| booking_id | ulid | FK, CASCADE, IDX | |
| from_state | txt | NULL | NULL on creation |
| to_state | txt | NOT NULL | |
| reason_code | txt | NULL | `bk_cancel_reason` / system codes |
| actor_type | txt | NOT NULL | `audit.actor_type` |
| actor_id | ulid | NULL | user (customer/vendor/admin) |
| note | txt | NULL | non-PII |
| created_at | ts | BRIN | |

- **Indexes:** (booking_id, created_at desc); BRIN(created_at).
- **Relationships:** N:1 booking.

### 19.7 `bk_timer` — bookings (L4) — durable SLA timers (Arch §12.3)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| subject_type | txt | NOT NULL | bk_booking, qtr_request, qtr_offer, pay_intent, ref_refund, corp_approval, … |
| subject_id | ulid | NOT NULL | |
| type | txt | NOT NULL | DRAFT_EXPIRY, PAY_EXPIRY, OFFER_VALIDITY, VENDOR_CONFIRM_SLA, QUOTE_SLA, BANK_VERIFY_48H, REFUND_FOLLOWUP, … (registry in contracts) |
| due_at | ts | NOT NULL | UTC |
| payload | jsonb | NOT NULL DEFAULT '{}' | |
| state | txt | NOT NULL DEFAULT PENDING | `bk_timer.state` |
| attempts | int | NOT NULL DEFAULT 0 | |
| fired_at | ts | NULL | |
| canceled_reason | txt | NULL | |
| created_at | ts | | |

- **Indexes (Arch §4.4):** (state, due_at) — sweep `FOR UPDATE SKIP LOCKED`.
- **Relationships:** logical to any aggregate.

---

## 20. Payments & ledger

> BR-2: **only** `payments` writes `pay_*`/ledger (refunds writes via payments facade). Money rules D-4/C-3. Webhook-only success (PRD PY-05).

### 20.1 `pay_method` — payments (L4) — stored method profiles (SAQ-A: token refs only)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| user_id | ulid | FK, IDX | → user |
| provider | txt | NOT NULL | esewa, khalti, nch-connectips, intl-acquirer, bank-manual |
| method_type | txt | NOT NULL | `pay_method.method_type` |
| token_ref | txt | NULL | provider token (never PAN — SAQ-A) |
| last4 | char(4) | NULL | |
| brand | txt | NULL | |
| exp_month | int | NULL | |
| exp_year | int | NULL | |
| is_default | bool | NOT NULL DEFAULT false | |
| status | txt | NOT NULL DEFAULT active | active, revoked |
| created_at / updated_at | ts | | |

- **Unique:** UQ(user_id, provider, token_ref) (partial, token_ref IS NOT NULL).
- **Relationships:** N:1 user.

### 20.2 `pay_intent` — payments (L4) — **requested: Payments** (the payment session)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| booking_id | ulid | FK, IDX | → bk_booking (one booking ⇒ **many intents over time**: partial payments D-8) |
| user_id | ulid | FK NULL | → user (initiator) |
| provider | txt | NOT NULL | adapter code |
| method_code | txt | NOT NULL | `pay_method.method_type` |
| amount_minor | money | NOT NULL | amount this intent covers (≤ remaining) |
| currency | char(3) | NOT NULL | |
| provider_ref | txt | NULL | provider intent/session id |
| session_url | txt | NULL | redirect/QR target (transient, may be cleared) |
| state | txt | IDX | `pay_intent.state` (incl. PENDING_MANUAL for bank transfer) |
| failure_reason | txt | NULL | mapped provider reason |
| bank_reference | var(60) | NULL | customer-remitted reference (manual verify; duplicate ⇒ blocked, §7.4) |
| manual_verified_by | ulid | NULL | → user (FINANCE) |
| expires_at | ts | NOT NULL | session TTL (48 h bank-manual) |
| created_at / updated_at | ts | | |

- **Unique:** UQ(booking_id, provider_ref) (partial, provider_ref IS NOT NULL); UQ(bank_reference) partial (state IN (PENDING_MANUAL, SUCCEEDED) and provider='bank-manual') — duplicate-reference guard.
- **Indexes:** (state, expires_at) — expiry sweep + PROCESSING>2 min reconcile job; (booking_id, created_at desc); (user_id, created_at desc).
- **Status:** `pay_intent.state` (PRD §14: CREATED→PROCESSING→SUCCEEDED|FAILED|EXPIRED|CANCELED + PENDING_MANUAL).
- **Relationships:** N:1 booking/user; 1:0..1 `pay_charge`; 1:N `pay_provider_event`; success ⇒ ledger entries (atomic) + outbox `payment.succeeded` + booking `AWAITING_PAYMENT→PAID` (via event).

### 20.3 `pay_charge` — payments (L4) — **requested: PaymentTransactions** (provider charge record)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| intent_id | ulid | FK, IDX | → pay_intent |
| provider | txt | NOT NULL | |
| provider_charge_ref | txt | UQ-pair | provider charge id (replay-safe) |
| charged_amount_minor | money | NOT NULL | amount actually charged (may differ from intent in FX) |
| charged_currency | char(3) | NOT NULL | provider currency (intl cards) |
| fx_rate | num(18,8) | NULL | provider FX applied (PY-07 dual record) |
| fx_source | txt | NULL | PROVIDER / MANUAL |
| captured_at | ts | NOT NULL | |
| raw | jsonb | NULL | redacted provider payload (PII/money-redacted per C-9) |
| created_at | ts | | |

- **Unique:** UQ(provider, provider_charge_ref).
- **Indexes:** (intent_id); (captured_at) BRIN.
- **Relationships:** 1:1 intent (one successful charge per intent; retries = new intents); 1:N `ref_refund.charge_id`.

### 20.4 `pay_provider_event` — payments (L4) — webhook event log (replay protection, Arch §3.5)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | append-only |
| provider | txt | NOT NULL | |
| provider_event_id | txt | NOT NULL | |
| event_type | txt | NOT NULL | payment.succeeded, chargeback, refund.completed, … |
| signature_valid | bool | NOT NULL | |
| state | txt | NOT NULL DEFAULT RECEIVED | `pay_provider_event.state` |
| payload | jsonb | NULL | redacted raw event |
| processed_at | ts | NULL | |
| error | txt | NULL | |
| created_at | ts | BRIN | |

- **Unique:** UQ(provider, provider_event_id) — **replay protection** (48 h hot window per Arch §3.5; later rows archived C-11).
- **Indexes:** (state, created_at) — processor; (provider_event_id) covered by UQ.
- **Relationships:** logical → pay_intent (via payload ref).

### 20.5 `pay_ledger_entry` — payments (L4) — append-only money core (Arch §7.3, D-16)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | append-only, no UPDATE/DELETE grant |
| account | txt | IDX | `pay_ledger.account` |
| amount_minor | money | NOT NULL | **signed** (debit/credit) — the one signed money column |
| currency | char(3) | NOT NULL | **NPR-normalized** (ledger base, D-4) |
| booking_id | ulid | NULL, IDX | |
| vendor_id | ulid | NULL, IDX | |
| intent_id | ulid | NULL | |
| refund_id | ulid | NULL | |
| settlement_id | ulid | NULL | |
| ref_type | txt | NOT NULL | PAYMENT, REFUND, SETTLEMENT, ADJUSTMENT, CHARGEBACK |
| ref_id | ulid | NOT NULL | id of the referencing aggregate |
| commission_rate | num(5,2) | NULL | rate applied (recorded once at payment, PRD CM-01/02) |
| memo | txt | NULL | non-PII, never raw provider payloads |
| prev_hash | txt | NULL | hash chain `[V1.5]` |
| created_by | ulid | NULL | → user (for ADJUSTMENT) |
| created_at | ts | BRIN | |

- **Indexes (Arch §4.4):** (ref_type, ref_id); (account, created_at); BRIN(created_at).
- **Invariants (app-enforced, tested):** per-event atomicity (PAYMENT adds +receivable, +vendor_payable(1−c), +commission, +tax split); REFUND mirrors; SETTLEMENT moves vendor_payable→payout; balances derivable, never stored.
- **Relationships:** logical to booking/vendor/intent/refund/settlement.

### 20.6 `pay_settlement` — payments (L4) — weekly vendor settlement (PRD §32/CM)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| vendor_id | ulid | FK, IDX | → ven_org |
| period_start | date | NOT NULL | |
| period_end | date | NOT NULL | |
| currency | char(3) | NOT NULL | |
| gross_minor | money | NOT NULL | |
| commission_minor | money | NOT NULL | |
| refunds_minor | money | NOT NULL | |
| holds_minor | money | NOT NULL | per-line holds (air 30 d, PRD CM-03) |
| net_minor | money | NOT NULL | may be negative (vendor debt carried, SM-06) |
| state | txt | NOT NULL DEFAULT DRAFT | `pay_settlement.state` |
| approved_by | ulid | NULL | → user (FINANCE) |
| approved_at | ts | NULL | |
| payout_id | ulid | NULL | → pay_payout |
| notes | txt | NULL | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(vendor_id, period_start, period_end).
- **Indexes:** (state, period_end); (vendor_id, period_start desc).
- **Relationships:** N:1 vendor; 1:0..1 payout.

### 20.7 `pay_payout` — payments (L4)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| settlement_id | ulid | FK, IDX | → pay_settlement |
| vendor_id | ulid | FK | → ven_org |
| amount_minor | money | NOT NULL | |
| currency | char(3) | NOT NULL | |
| method | txt | NOT NULL DEFAULT bank_transfer | bank_transfer (MVP recorded manual) / auto[V1.5] |
| bank_masked | var(20) | NULL | from ven_bank (never raw) |
| reference | var(60) | NULL | bank transfer reference |
| state | txt | NOT NULL DEFAULT RECORDED | `pay_payout.state` |
| paid_at | ts | NULL | |
| verified_by | ulid | NULL | → user (FINANCE) |
| created_at / updated_at | ts | | |

- **Relationships:** N:1 settlement/vendor.

### 20.8 `pay_recon_run` — payments (L4) `[V1.5]`

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| provider | txt | NOT NULL | |
| period_start | date | NOT NULL | |
| period_end | date | NOT NULL | |
| state | txt | NOT NULL | running, completed, variances_open |
| variances | jsonb | NOT NULL DEFAULT '[]' | |
| run_by | ulid | NULL | |
| run_at | ts | NOT NULL | |
| created_at | ts | | |

- **Unique:** UQ(provider, period_start, period_end).

---

## 21. Refunds

### 21.1 `ref_refund` — refunds (L4) — **requested: Refunds**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| booking_id | ulid | FK, IDX | → bk_booking (many refunds per booking — partial refunds, PRD BK-6) |
| charge_id | ulid | FK NULL | → pay_charge (source of funds) |
| vendor_id | ulid | FK | → ven_org |
| amount_minor | money | NOT NULL | refund total (≤ unrefunded balance, app-enforced) |
| currency | char(3) | NOT NULL | |
| reason_code | txt | NOT NULL | CUSTOMER_CANCEL, VENDOR_CANCEL, VENDOR_CANNOT_HONOR, POLICY_FAIL, ADMIN, CHARGEBACK_ADJ, OTHER |
| policy_snapshot | jsonb | NOT NULL | cancellation policy applied (from booking policy snapshot) |
| state | txt | IDX | `ref_refund.state` |
| requested_by | txt | NOT NULL | customer / vendor / admin / system |
| requested_by_user_id | ulid | NULL | → user |
| approved_by | ulid | NULL | → user |
| provider_ref | txt | NULL | provider refund id (auto path) |
| timeline_copy | jsonb | NOT NULL | honest customer timeline (PRD RF-05) |
| completed_at | ts | NULL | |
| failed_reason | txt | NULL | |
| created_at / updated_at | ts | | |

- **Indexes:** (state, created_at desc); (booking_id, created_at desc); (vendor_id, state).
- **Status:** `ref_refund.state` (Arch §7.5).
- **Relationships:** N:1 booking/charge/vendor; 1:N `ref_line`; 1:0..1 `ref_case` (vendor-mediated, air); atomic ledger mirror + commission reversal (payments facade, PRD CM-06/07).

### 21.2 `ref_line` — refunds (L4) — per-item allocation (D-9)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| refund_id | ulid | FK, CASCADE, IDX | → ref_refund |
| booking_item_id | ulid | FK, IDX | → bk_item |
| amount_minor | money | NOT NULL | this item's share |
| commission_reversal_minor | money | NOT NULL DEFAULT 0 | pro-rata |
| currency | char(3) | NOT NULL | |
| created_at | ts | | |

- **Unique:** UQ(refund_id, booking_item_id).
- **Invariant:** Σ ref_line.amount_minor = ref_refund.amount_minor (app-enforced, tested).

### 21.3 `ref_case` — refunds (L4) — vendor-mediated cases (air, PRD §14 CN-04)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| refund_id | ulid | FK, UQ, IDX | → ref_refund |
| vendor_id | ulid | FK | → ven_org (agency) |
| state | txt | NOT NULL DEFAULT OPEN | `ref_case.state` |
| agency_sla_due | ts | NOT NULL | 5 business days target (PRD CN-04) |
| vendor_response | txt | NULL | amount + fees + outcome |
| resolved_at | ts | NULL | |
| notes | txt | NULL | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(refund_id).
- **Relationships:** 1:1 refund; N:1 vendor; SLA via `bk_timer`.

---

## 22. Invoices

> D-13: customer invoices/receipts exist from MVP (PRD §14 payment proof); consolidated **corporate** invoicing is `[V1.5]` — same tables.

### 22.1 `inv_invoice` — payments (L4) — **requested: Invoices**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| ref | txt | UQ | human invoice number (sequential per vendor/org, app-managed) |
| kind | txt | NOT NULL | CUSTOMER, CORPORATE, VENDOR |
| booking_id | ulid | FK NULL, IDX | → bk_booking |
| user_id | ulid | FK NULL | → user (customer) |
| corp_org_id | ulid | FK NULL | → corp_org (corporate invoice) |
| vendor_id | ulid | FK NULL | → ven_org (vendor invoice) |
| currency | char(3) | NOT NULL | |
| subtotal_minor | money | NOT NULL | |
| tax_minor | money | NOT NULL | |
| discount_minor | money | NOT NULL DEFAULT 0 | `[V1.5]` |
| total_minor | money | NOT NULL | |
| due_date | date | NULL | corporate net terms |
| state | txt | NOT NULL DEFAULT DRAFT | `inv_invoice.state` |
| pdf_file_key | txt | NULL | rendered PDF (S3) |
| issued_at | ts | NULL | |
| notes | txt | NULL | |
| created_at / updated_at | ts | | |

- **Indexes:** UQ(ref); (user_id, created_at desc); (corp_org_id, due_date) where corp_org_id IS NOT NULL; (vendor_id, created_at desc); (state, due_date) — OVERDUE sweep.
- **Status:** `inv_invoice.state`.
- **Relationships:** 1:N `inv_invoice_line`; N:1 booking/user/corp/vendor.

### 22.2 `inv_invoice_line` — payments (L4)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| invoice_id | ulid | FK, CASCADE, IDX | |
| description | txt | NOT NULL | |
| qty | int | NOT NULL | |
| unit_minor | money | NOT NULL | |
| total_minor | money | NOT NULL | |
| currency | char(3) | NOT NULL | |
| position | int | NOT NULL | |
| created_at | ts | | |

- **Indexes:** (invoice_id, position).

---

## 23. Coupons & promotions [V1.5]

> D-14: schema now, feature V1.5 (PRD scope). Additive; no MVP code path reads these tables.

### 23.1 `cpn_promotion` — admin (L6) — **requested: Promotions**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| title | txt | NOT NULL | |
| slug | txt | UQ | |
| kind | txt | NOT NULL | CAMPAIGN, FLASH, SEASONAL |
| description | txt | NULL | |
| valid_from | ts | NOT NULL | |
| valid_to | ts | NOT NULL | |
| targeting | jsonb | NOT NULL DEFAULT '{}' | scope: GLOBAL, LINE, DESTINATION, SERVICE, CORP (ids in `scope_ids`) |
| scope_ids | jsonb | NOT NULL DEFAULT '[]' | ulids of lines/destinations/services |
| budget_minor | money | NULL | total discount cap (NULL = uncapped) |
| spent_minor | money | NOT NULL DEFAULT 0 | |
| status | txt | NOT NULL DEFAULT DRAFT | `cpn_coupon.status` |
| created_by | ulid | NULL | → user (admin) |
| created_at / updated_at | ts | | |

- **Relationships:** 1:N `cpn_coupon`.

### 23.2 `cpn_coupon` — admin (L6) — **requested: Coupons**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| promotion_id | ulid | FK NULL, IDX | → cpn_promotion |
| code | txt | UQ | display code (case-insensitive via citext lower) |
| kind | txt | NOT NULL | `cpn_coupon.kind` |
| value | num(10,2) | NOT NULL | percent or minor-units amount (per kind) |
| currency | char(3) | NULL | for FIXED_AMOUNT |
| min_spend_minor | money | NOT NULL DEFAULT 0 | |
| max_discount_minor | money | NULL | cap |
| per_user_limit | int | NOT NULL DEFAULT 1 | |
| usage_limit | int | NULL | total redemptions cap |
| used_count | int | NOT NULL DEFAULT 0 | |
| valid_from | ts | NOT NULL | |
| valid_to | ts | NOT NULL | |
| status | txt | NOT NULL DEFAULT DRAFT | `cpn_coupon.status` |
| created_by | ulid | NULL | |
| created_at / updated_at | ts | | |

- **Indexes:** UQ(code); (status, valid_to) — expiry sweep; (promotion_id).
- **Redemption:** recorded on `bk_item.discount_minor` + `bk_item.meta.coupon_id` (logical) at price-snapshot time; usage counters CAS-updated.

---

## 24. Reviews

> Verified-only rule (standing + PRD §17): eligibility = **completed** booking **item**; one review per booking item; 365-day window (PRD D8); vendor gets one response.

### 24.1 `rev_review` — reviews (L5) — **requested: Reviews**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| booking_item_id | ulid | FK, UQ*, IDX | → bk_item — **one review per item** (partial unique where state <> 'REMOVED'?) — enforced: UQ(booking_item_id) |
| booking_id | ulid | FK, IDX | → bk_booking (denormalized) |
| service_id | ulid | FK, IDX | → srv_service (aggregate target) |
| vendor_id | ulid | FK, IDX | → ven_org (denormalized) |
| user_id | ulid | FK, IDX | → user (customer) |
| rating | int | NOT NULL CHECK (rating BETWEEN 1 AND 5) | overall |
| title | txt | NULL | |
| body | txt | NULL | |
| verified | bool | NOT NULL DEFAULT true | true only when item booking COMPLETED (eligibility gate, app-enforced) |
| context | jsonb | NULL | trip dates, mode, line (display context) |
| state | txt | IDX | `rev_review.state` |
| rejected_reason | txt | NULL | moderation |
| moderated_by | ulid | NULL | → user (admin) |
| moderated_at | ts | NULL | |
| eligible_until | ts | NOT NULL | created + 365 d window guard (PRD D8) |
| created_at / updated_at | ts | | |

- **Unique:** UQ(booking_item_id).
- **Indexes:** (service_id, state, created_at desc) — listing; (user_id, created_at desc); (vendor_id, state); (state, created_at) — moderation queue.
- **Status:** `rev_review.state`.
- **Relationships:** 1:1 booking_item; N:1 service/vendor/user; 1:1 `rev_reply`; 1:N `rev_photo`, `rev_report`; feeds `rev_aggregate` (event-driven refresh).

### 24.2 `rev_reply` — reviews (L5) — **requested: ReviewResponses**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| review_id | ulid | FK, UQ, IDX | → rev_review (**one response per review**) |
| vendor_id | ulid | FK | → ven_org |
| user_id | ulid | FK NULL | → user (responding vendor member) |
| body | txt | NOT NULL | |
| created_at / updated_at | ts | | (edited via updated_at; no history) |

- **Unique:** UQ(review_id).

### 24.3 `rev_photo` — reviews (L5)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| review_id | ulid | FK, CASCADE, IDX | |
| file_key | txt | NOT NULL | |
| alt | txt | NULL | |
| width | int | NULL | |
| height | int | NULL | |
| position | int | NOT NULL DEFAULT 0 | |
| status | txt | NOT NULL DEFAULT PENDING | PENDING, APPROVED, REJECTED |
| created_at | ts | | |

- **Relationships:** N:1 review (CASCADE).

### 24.4 `rev_report` — reviews (L5)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| review_id | ulid | FK, CASCADE, IDX | |
| reporter_user_id | ulid | FK | → user |
| reason_code | txt | NOT NULL | SPAM, ABUSE, FAKE, SENSITIVE, OTHER |
| note | txt | NULL | |
| state | txt | NOT NULL DEFAULT OPEN | OPEN, ACTIONED, DISMISSED |
| created_at | ts | | |

- **Indexes:** (state, created_at desc); (review_id).

### 24.5 `rev_aggregate` — reviews (L5) — denormalized service rating (Arch §4.4)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| service_id | ulid | FK, UQ, IDX | → srv_service |
| avg_rating | num(3,2) | NOT NULL DEFAULT 0 | |
| count | int | NOT NULL DEFAULT 0 | VISIBLE reviews only |
| histogram | jsonb | NOT NULL DEFAULT '{}' | `{"5":10,"4":5,...}` |
| updated_at | ts | NOT NULL | (refreshed by job/event) |

- **Unique:** UQ(service_id).
- **Invariant:** computed **only** from `state='VISIBLE'` reviews (never vendor-tunable, GC-3 spirit).

---

## 25. Corporate

### 25.1 `corp_org` — corporate (L5) — **requested: CorporateAccounts**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| name | txt | NOT NULL | |
| slug | txt | UQ | |
| industry | txt | NULL | |
| country_id | ulid | FK | → geo_country |
| address_text | txt | NULL | |
| primary_user_id | ulid | FK | → user (org admin) |
| kyc_docs | jsonb | NULL | `[{file_key, doc_type, status}]` (vendor-style docs, PRD corporate core) |
| kyc_status | txt | NOT NULL DEFAULT PENDING | PENDING, VERIFIED, REJECTED |
| status | txt | IDX | `corp_org.status` |
| suspended_at | ts | NULL | |
| suspension_reason | txt | NULL | |
| created_by | ulid | NULL | → user (admin) |
| created_at / updated_at | ts | | |

- **Relationships:** 1:N `corp_user`, `corp_approval`, `bk_booking` (corp_org_id), `inv_invoice`; 1:1 `corp_policy`.

### 25.2 `corp_user` — corporate (L5) — **requested: CorporateUsers**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| corp_org_id | ulid | FK, IDX | → corp_org |
| user_id | ulid | FK | → user |
| org_role | txt | NOT NULL | `corp_user.org_role` (ADMIN, APPROVER, MEMBER) |
| status | txt | NOT NULL | `corp_user.status` |
| invited_by | ulid | NULL | → user |
| joined_at | ts | NULL | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(corp_org_id, user_id) where status <> 'REMOVED' (partial).
- **Relationships:** M:N corp_org ↔ user.

### 25.3 `corp_policy` — corporate (L5)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| corp_org_id | ulid | FK, UQ | → corp_org (1:1, versioned by rows: new row bumps version, old archived) |
| version | int | NOT NULL DEFAULT 1 | |
| max_booking_value_minor | money | NULL | per-booking cap (NULL = no cap) |
| per_person_daily_minor | money | NULL | |
| requires_approval | bool | NOT NULL DEFAULT false | |
| approval_threshold_minor | money | NULL | bookings above ⇒ `corp_approval` required |
| allowed_lines | jsonb | NULL | NULL = all; else array of `svc_line` |
| booking_window_days | int | NULL | must book within N days of travel start? (policy) |
| currency | char(3) | NOT NULL | |
| archived_at | ts | NULL | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(corp_org_id, version).
- **Relationships:** 1:1 (latest) corp_org.

### 25.4 `corp_approval` — corporate (L5) — **requested: CorporateBookings** (approval workflow)

> CorporateBookings as an entity = `bk_booking` rows with `corp_org_id` set (+ optional `corp_approval` when policy requires). No separate booking table (D-7/D-11 pattern: bookings are bookings).

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| booking_id | ulid | FK, UQ, IDX | → bk_booking (one approval per booking) |
| corp_org_id | ulid | FK | → corp_org |
| requester_user_id | ulid | FK | → user (traveler) |
| approver_user_id | ulid | FK NULL | → user (org APPROVER) |
| amount_minor | money | NOT NULL | snapshot at request |
| currency | char(3) | NOT NULL | |
| state | txt | NOT NULL DEFAULT PENDING | `corp_approval.state` |
| reason | txt | NULL | rejection/notes |
| requested_at | ts | NOT NULL | |
| decided_at | ts | NULL | |
| expires_at | ts | NOT NULL | approval SLA (booking held in DRAFT/PENDING meanwhile) |
| created_at / updated_at | ts | | |

- **Unique:** UQ(booking_id).
- **Relationships:** 1:1 booking; N:1 corp_org/users; emits `corporate.approval.requested/decided` (outbox) ⇒ booking proceeds to payment.

---

## 26. Notifications

### 26.1 `ntf_notification` — notifications (L5) — **requested: Notifications**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| user_id | ulid | FK, IDX | → user |
| kind | txt | NOT NULL | booking_confirmed, payment_succeeded, quote_offered, refund_updated, vendor_new_booking, doc_expiry_t7, … (registry in contracts) |
| channel | txt | NOT NULL | `ntf_notification.channel` |
| title | txt | NOT NULL | |
| body | txt | NOT NULL | |
| data | jsonb | NOT NULL DEFAULT '{}' | deep-link + context (no PII beyond user's own) |
| read_at | ts | NULL | |
| created_at / updated_at | ts | | |

- **Indexes (Arch §4.4):** (user_id, created_at desc); partial IDX (user_id) where read_at IS NULL — badge count.
- **Retention:** purge > 90 d (C-11).
- **Relationships:** N:1 user; 1:N `ntf_delivery_log`.

### 26.2 `ntf_preference` — notifications (L5)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| user_id | ulid | FK, IDX | → user |
| channel | txt | NOT NULL | |
| kind | txt | NOT NULL | NULL-pattern not allowed: kind = '*' means all |
| enabled | bool | NOT NULL DEFAULT true | |
| quiet_hours | jsonb | NULL | `{start:"22:00",end:"07:00",tz:"Asia/Kathmandu"}` |
| created_at / updated_at | ts | | |

- **Unique:** UQ(user_id, channel, kind).

### 26.3 `ntf_suppression` — notifications (L5)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| user_id | ulid | FK NULL, IDX | |
| email | citext | NULL | for unregistered addresses (vendor bounces) |
| reason | txt | NOT NULL | BOUNCE_PERM, UNSUBSCRIBE, COMPLAINT |
| until | ts | NULL | NULL = permanent |
| created_by | ulid | NULL | |
| created_at | ts | | |

- **Relationships:** logical → user.

### 26.4 `ntf_delivery_log` — notifications (L5)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| notification_id | ulid | FK, IDX | → ntf_notification |
| channel | txt | NOT NULL | |
| provider_ref | txt | NULL | provider message id (email provider) |
| state | txt | NOT NULL | `ntf_delivery_log.state` |
| error | txt | NULL | |
| attempted_at | ts | NOT NULL | |
| created_at | ts | | |

- **Indexes:** (notification_id, attempted_at desc); (state, attempted_at) — bounce sweeper.

---

## 27. Content (guides, pages)

### 27.1 `cms_guide` — content (L3) — **requested: TravelGuides**

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| slug | txt | UQ | SEO |
| title | txt | NOT NULL | |
| category | txt | NOT NULL, IDX | TREK, CULTURE, FOOD, SAFETY, SEASON, PHOTO, GEAR, OTHER (PRD: 10 launch guides) |
| country_id | ulid | FK NULL | → geo_country |
| destination_id | ulid | FK NULL, IDX | → dst_destination |
| body_md | txt | NOT NULL | original content (GC-6) |
| hero_media_key | txt | NULL | |
| seo_title | txt | NULL | |
| seo_description | txt | NULL | |
| seo_jsonb | jsonb | | |
| author_user_id | ulid | NULL | → user |
| ops_rank | int | | |
| status | txt | IDX | `cms.status` |
| published_at | ts | NULL | |
| created_at / updated_at | ts | | |

- **Indexes:** UQ(slug); (category, status); (destination_id); GIN trgm(title).

### 27.2 `cms_page` — content (L3) — **requested: CMSPages** (banners, help, policy pages, SEO landing pages)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| slug | txt | UQ | |
| kind | txt | NOT NULL, IDX | BANNER, HELP, POLICY, LANDING |
| title | txt | NOT NULL | |
| body_md | txt | NULL | |
| placement | jsonb | NULL | where shown: `{zone:"home.hero", position:1}` etc. |
| seo_title | txt | NULL | |
| seo_description | txt | NULL | |
| seo_jsonb | jsonb | NULL | |
| media_keys | jsonb | NULL | array of S3 keys |
| author_user_id | ulid | NULL | |
| status | txt | IDX | `cms.status` |
| published_at | ts | NULL | |
| created_at / updated_at | ts | | |

- **Indexes:** UQ(slug); (kind, status); (status, placement) GIN partial for zone queries.

### 27.3 `cms_localized` — content (L3) `[V1.5]` (Nepali UI/content)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| entity_type | txt | NOT NULL | guide, page, destination, service |
| entity_id | ulid | NOT NULL, IDX | logical (polymorphic) |
| locale | txt | NOT NULL | `ne` (V1.5) |
| content | jsonb | NOT NULL | localized fields subset |
| status | txt | NOT NULL DEFAULT DRAFT | |
| created_at / updated_at | ts | | |

- **Unique:** UQ(entity_type, entity_id, locale).

---

## 28. Admin config, disputes, search ops

### 28.1 `adm_setting` — admin (L6) — config store (commissions, SLAs, capability matrix, templates)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| key | txt | UQ | e.g. `commission.TOUR` (10%), `commission.TREK` (10%), `commission.HOTEL` (8%), `commission.VEHICLE` (8%), `commission.TRANSFER` (3%), `commission.PACKAGE` (5%) — PRD §12.2 (config, not code, GC-1); `sla.quote_hours` (24), `sla.offer_hours` (48), `sla.confirm_hours` (12), `provider.matrix.{name}`, `template.booking_confirmed` … |
| value | jsonb | NOT NULL | |
| description | txt | NULL | |
| updated_by | ulid | NULL | → user |
| created_at / updated_at | ts | | |

- **Indexes:** UQ(key).
- **Audit:** every UPDATE ⇒ audit_log (settings.changed event).

### 28.2 `adm_feature_flag` — admin (L6) — 2-tier flags (Arch T-13)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| key | txt | UQ | e.g. `corporate.consolidated_payment`, `ai.suggestions` |
| name | txt | NOT NULL | |
| description | txt | NULL | |
| default_enabled | bool | NOT NULL DEFAULT false | |
| scope | txt | NOT NULL | GLOBAL, PERCENT, ROLE, ORG |
| scope_value | jsonb | NULL | percent seed / role codes / org ids |
| status | txt | NOT NULL DEFAULT ACTIVE | ACTIVE, PAUSED, RETIRED |
| created_by | ulid | NULL | |
| created_at / updated_at | ts | | |

- **Indexes:** UQ(key); (status).

### 28.3 `dsp_dispute` — admin (L6)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| booking_id | ulid | FK, IDX | → bk_booking (read-only reference) |
| vendor_id | ulid | FK | → ven_org |
| user_id | ulid | FK | → user (customer) |
| reason_code | txt | NOT NULL | SERVICE_NOT_AS_DESCRIBED, NO_SHOW, SAFETY, CANCELLATION_FEE, DAMAGE, OTHER |
| summary | txt | NOT NULL | |
| state | txt | IDX | `dsp_dispute.state` |
| compensation | jsonb | NULL | `{amount_minor, currency, kind: refund|credit}` |
| sla_due | ts | NOT NULL | 5 business days (PRD dispute SLA) |
| opened_by | ulid | NULL | |
| resolved_by | ulid | NULL | |
| resolved_at | ts | NULL | |
| created_at / updated_at | ts | | |

- **Indexes:** (state, sla_due); (vendor_id, state); (user_id, created_at desc).
- **Relationships:** N:1 booking/vendor/user; 1:N `dsp_evidence`; chargeback resolution ⇒ ADJUSTMENT ledger entries (PRD CM-08).

### 28.4 `dsp_evidence` — admin (L6)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| dispute_id | ulid | FK, CASCADE, IDX | |
| kind | txt | NOT NULL | CHAT, DOCUMENT, PHOTO, SYSTEM_LOG |
| file_key | txt | NULL | |
| content | jsonb | NULL | |
| uploaded_by | ulid | NULL | → user |
| created_at | ts | | |

### 28.5 `srch_keyword_alias` — search (L3) — ops typo/variant map (PRD §20.5)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| alias | txt | UQ | normalized ("phewa") |
| canonical | txt | NOT NULL | ("Phewa Lake") |
| line | txt | NULL | scope to a line if needed |
| note | txt | NULL | |
| created_at | ts | | |

- **Indexes:** UQ(alias); (canonical).

---

## 29. Analytics & reports

### 29.1 `ana_event` — analytics (L6) — monthly partitioned (C-11)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| session_id | ulid | NULL, IDX | → ana_session (pseudonymous) |
| user_id | ulid | NULL, IDX | set only for authed, privacy-minimized |
| event_name | txt | NOT NULL, IDX | versioned schema (PRD §34.2) |
| props | jsonb | NOT NULL | schema-validated per event |
| page | txt | NULL | |
| device | jsonb | NULL | coarse |
| ts | ts | NOT NULL | partition key (monthly) |

- **Indexes:** (event_name, ts); BRIN(ts); partition by month (ts); 13 months hot → detach/archive (PRD §34 retention).
- **No PII in props** (PRD §33.3/§34.1).

### 29.2 `ana_session` — analytics (L6)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| pseudonymous_id | txt | UQ | client-side, hash-rotated |
| user_id | ulid | NULL | linked on auth (join only, opt-in analytics D9) |
| started_at | ts | NOT NULL | |
| last_seen_at | ts | NOT NULL | |
| source | txt | NULL | referrer/UTM (sanitized) |
| device | jsonb | NULL | |
| created_at | ts | | |

- **Unique:** UQ(pseudonymous_id).
- **Retention:** 26 months then purge (cookieless).

### 29.3 `rpt_kpi_rollup` — reports (L6)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| day | date | NOT NULL, UQ-pair | |
| scope_type | txt | NOT NULL, UQ-pair | GLOBAL, LINE, VENDOR, DESTINATION |
| scope_id | ulid | NULL, UQ-pair | NULL for GLOBAL |
| metric | txt | NOT NULL, UQ-pair | gmv_minor, bookings, payment_success_rate_bps, quote_response_h_p50, … |
| value | num(20,4) | NOT NULL | metrics may be money (minor) or rates — unit documented per metric (NUMERIC allowed: rollup, not transactional money) |
| created_at | ts | | |

- **Unique:** UQ(day, scope_type, scope_id, metric).
- **Written by** nightly `rollups` queue (Arch §16.2).

### 29.4 `rpt_funnel_daily` — reports (L6)

| Field | Type | Key | Notes |
|---|---|---|---|
| id | ulid | PK | |
| day | date | NOT NULL | |
| funnel | txt | NOT NULL | SEARCH→DETAIL→START, QUOTE→OFFER→ACCEPT, CHECKOUT→PAID |
| stage | txt | NOT NULL | |
| count | int | NOT NULL | |
| currency | char(3) | NULL | for money stages (NPR) |
| created_at | ts | | |

- **Unique:** UQ(day, funnel, stage).

---

## 30. ERD description

### 30.1 Domain map (ASCII)

```
 ┌─────────────────────────────── IDENTITY & ACCESS (L1) ───────────────────────────────┐
 │  user ──< user_role >── role ──< role_permission >── permission                        │
 │  user ──< auth_session · mfa_enrollment · otp_issue · auth_idp_account · pay_method    │
 │  user ──< audit_log (append-only) · idempotency_key · outbox (append-only)             │
 └──────────────┬──────────────────────────────┬─────────────────────────────────────────┘
                │                              │
 ┌──────────────▼───────────────┐  ┌───────────▼──────────────── CUSTOMERS (L5) ─────────┐
 │ VENDORS (L2)                 │  │ cust_profile (1:1 user) · cust_guest_contact         │
 │ ven_org ──< ven_user (team)  │  │ cust_wishlist ──< cust_wishlist_item >── srv_service │
 │ ven_org ──< ven_capability   │  └───────────────────────────────────────────────────────┘
 │           (line, expiry)     │
 │ ven_org ──< ven_document     │        ┌────────────────── GEO & DESTINATIONS (L3) ──────────────────┐
 │           (type, expiry)     │        │ geo_country ──< geo_state ──< geo_district ──< geo_city      │
 │ ven_org ──< ven_bank (PII)   │        │ geo_country ──< geo_airport · geo_alias (poly)               │
 │ ven_org ── 1:1 ven_payout_   │        │ dst_destination (hub: geo refs, SEO)                         │
 │           detail             │        │ dst_location (POIs: pickup/drop/meeting/landmark)            │
 └──────────────┬───────────────┘        └──────────────────────────────┬────────────────────────────────┘
                │                                                       │
 ┌──────────────▼──────────────────────── CATALOG CORE (L3) ───────────▼────────────────────────────────┐
 │ srv_service (one row per sellable offer; vendor_id, line, status, base price, slug/SEO, FTS)         │
 │   ──< srv_media (all line images) · srv_addon · srv_location_point · price_surcharge (date-based)     │
 │ tax_config · fx_rate (config)                                                                          │
 └──┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────────────────┘
    │1:1 line extensions (service_id UQ in each)
 ┌──▼─────┐┌──▼─────┐┌──▼─────┐┌──▼─────┐┌──▼─────┐┌──▼─────┐┌─────────▼───┐
 │ veh_   ││ trf_   ││ trp_   ││ htl_   ││ tour_  ││ trek_  ││ pkg_        │
 │ fleet  ││ route  ││ service││ proper ││ servic ││ attr   ││ service     │
 │ vehicle││ service││        ││ ty     ││ package││ route  ││ item >── srv│
 │ type   ││ rate   ││ rate   ││ room_  ││ itin.  ││ itin.  ││ (components)│
 │ feature││ window ││        ││ type   ││ incl./ ││        ││             │
 │ rate   ││        ││        ││ amenity││ excl.  ││        ││             │
 │        ││        ││        ││ rate_  ││        ││        ││             │
 └──┬─────┘└──┬─────┘└──┬─────┘└──┬─────┘└──┬─────┘└──┬─────┘└─────────────┘
    │         │         │         │         │         │
 ┌──▼─────────▼─────────▼─────────▼─────────▼─────────▼──────────────────────────────────────────────┐
 │ SHARED AVAILABILITY:  av_count (entity_type, entity_id, date, capacity, sold, version — CAS)       │
 │                       av_departure (entity_type, entity_id, date, time, tz, seats, version — CAS)  │
 └───────────────────────────────────────────────────────────────────────────────────────────────────┘
 flights (quote-only): flt_route (curated) · flt_search (log) — no services, no inventory (GC-2)

 ┌─────────────────────────────────── COMMERCIAL CORE (L4) ───────────────────────────────────────────┐
 │ qtr_request (QUOTE|CUSTOM = custom trips) ──< qtr_item (items / trip items)                        │
 │ qtr_request ──< qtr_offer (vendor, versioned, breakdown_jsonb immutable, valid_until)              │
 │                     │ accept                                                                         │
 │                     ▼                                                                                │
 │ bk_group ──< bk_booking (11-state machine; price+policy snapshots; local dates + IANA tz)           │
 │   ──< bk_item (service_id, qty, prices, asset_kind/asset_id, discount) ──< bk_traveler              │
 │   ──< bk_document (voucher/e-ticket+PNR) · bk_event (append-only history) · bk_timer (SLA sweeps)   │
 │                                                                                                      │
 │ pay_intent (booking 1:N intents — partial payments; PENDING_MANUAL bank) ── 1:1 pay_charge          │
 │   pay_provider_event (webhook log, replay-protected) · pay_method (tokens, SAQ-A)                   │
 │ pay_ledger_entry (append-only, NPR-normalized, signed) ← atomic per PAYMENT/REFUND/SETTLEMENT       │
 │ pay_settlement (weekly, holds) ── pay_payout                                                         │
 │                                                                                                      │
 │ ref_refund (booking 1:N) ──< ref_line (per bk_item allocation) ── 0..1 ref_case (air, agency SLA)   │
 │ inv_invoice ──< inv_invoice_line                                                                     │
 └──────────────────────────────────────────────────────────────────────────────────────────────────────┘

 CORPORATE (L5): corp_org ──< corp_user · corp_org 1:1 corp_policy · corp_org ──< corp_approval >── bk_booking
 REVIEWS (L5):   bk_item 1:1 rev_review (verified, completed-only) ──< rev_photo · rev_report · 1:1 rev_reply
                 rev_review ──> rev_aggregate (denormalized, VISIBLE-only)
 NOTIFICATIONS:  ntf_notification ──< ntf_delivery_log · ntf_preference · ntf_suppression
 CONTENT:        cms_guide · cms_page · cms_localized[V1.5]
 ADMIN/OBS:      adm_setting · adm_feature_flag · dsp_dispute ──< dsp_evidence · srch_keyword_alias
 ANALYTICS:      ana_session ──< ana_event (monthly partitions) · rpt_kpi_rollup · rpt_funnel_daily
```

### 30.2 Cardinality catalog (primary relationships)

| Relationship | Type | Realized by |
|---|---|---|
| user ↔ role / role ↔ permission | M:N | user_role / role_permission |
| user : cust_profile | 1:1 | cust_profile.user_id UQ |
| user : ven_org team | M:N | ven_user (org_role) |
| ven_org : ven_capability/ven_document/ven_bank | 1:N | ven_org_id FK |
| ven_org : srv_service | 1:N | srv_service.vendor_id |
| geo chain | 1:N down | country→state→district→city (+denorm country_id) |
| dst_destination : srv_service | 1:N | service.destination_id |
| srv_service : line extension | 1:1 (exactly one) | extension.service_id UQ |
| srv_service : srv_media/srv_addon/srv_location_point/price_surcharge | 1:N | service_id FK (CASCADE) |
| line : availability | 1:N (logical) | av_count/av_departure (entity_type, entity_id) |
| qtr_request : qtr_item / qtr_offer | 1:N | request_id FK |
| qtr_offer : bk_booking | 1:0..1 | booking.qtr_offer_id (set on accept) |
| bk_group : bk_booking | 1:N | trip_group_id |
| bk_booking : bk_item / bk_traveler / bk_document / bk_event | 1:N | booking_id FK |
| bk_booking : pay_intent | 1:N (partial payments) | pay_intent.booking_id |
| pay_intent : pay_charge | 1:0..1 | pay_charge.intent_id |
| bk_booking : ref_refund : ref_line | 1:N → 1:N | refund.booking_id / line.booking_item_id |
| bk_booking : inv_invoice | 1:N | invoice.booking_id |
| bk_booking : corp_approval | 1:1 (corporate) | corp_approval.booking_id UQ |
| bk_item : rev_review | 1:1 (verified) | rev_review.booking_item_id UQ |
| corp_org : corp_user / corp_approval / bk_booking | 1:N | corp_org_id FKs |
| srch/ana | n:1 logical | flt_search.qtr_request_id, ana_event.user_id |

### 30.3 Key flows through the schema (narrative)

1. **Instant booking (pay-first):** checkout ⇒ `bk_booking` DRAFT → submit ⇒ items+travelers+**price/policy snapshots** (immutable) + CAS decrement of `av_count`/`av_departure` (conflict ⇒ 409, re-render availability) ⇒ `AWAITING_PAYMENT` + `bk_timer(PAY_EXPIRY)` ⇒ `pay_intent` (CREATED→PROCESSING) ⇒ provider webhook ⇒ `pay_provider_event` (replay-checked) ⇒ `pay_charge` + atomic **ledger entries** ⇒ intent SUCCEEDED ⇒ event ⇒ booking PAID ⇒ vendor notified (SLA 12 h via `bk_timer`) ⇒ CONFIRMED ⇒ IN_PROGRESS ⇒ COMPLETED (unlocks review eligibility).
2. **Quote (incl. custom trip):** request (+`qtr_item` rows; CUSTOM = Build-Your-Trip) ⇒ routed to capable vendors (per-line `ven_capability`) ⇒ `qtr_offer` (versioned, breakdown locked at submit, `valid_until`) ⇒ accept ⇒ booking created from offer snapshot (BR-4 gates were checked at offer time).
3. **Multi-item / multi-vendor:** one `bk_booking` = one vendor, N items; a multi-vendor trip = N bookings in one `bk_group` (settlement and refunds stay per-vendor). Corporate consolidated payment `[V1.5]` = multiple `pay_intent`s across the group's bookings.
4. **Partial payment:** each `pay_intent` covers part of the remaining total (computed from ledger, never a cached counter); booking leaves `AWAITING_PAYMENT` only when fully covered (D-8).
5. **Refund:** `ref_refund` + per-item `ref_line` (pro-rata commission reversal) ⇒ atomic ledger mirror via payments facade ⇒ provider refund (auto) or `ref_case` (air, agency 5-bd SLA) ⇒ timeline copy to customer; partial refunds never change booking state (BK-6).
6. **Settlement:** weekly job aggregates ledger per vendor ⇒ `pay_settlement` (holds per line, air 30 d) ⇒ FINANCE approve ⇒ `pay_payout` (manual bank record in MVP).

---

## 31. Requirements coverage matrix

| Requirement | How the schema supports it |
|---|---|
| **Multiple currencies** | Every price/amount column pair is `*_minor BIGINT + currency CHAR(3)` (C-3, D-4/D-6); vendor rates per their currency; `fx_rate` (date-versioned) for display conversion; `pay_charge` dual-record (charged currency + NPR-normalized ledger); booking snapshot locks currency at booking |
| **Multiple countries** | Full geo tree (`geo_country` root; nothing NP-hardcoded, GC-1); `country_id` on user/ven_org/corp_org/destination/tax_config; per-country `currency_default` + `timezone_default`; tax_config per country; flights route on any airport pair |
| **Multiple vendors** | `ven_org` (many) with per-line `ven_capability` gating, team `ven_user`, documents, bank; every `srv_service` is vendor-owned; vendor inbox indexes on `(vendor_id, state, created_at)`; per-vendor settlements/holds/payouts |
| **Multiple service types** | `srv_service.line` (9 values) + one 1:1 extension table per line (D: exactly one extension row per service); shared availability + shared pricing engine (BR-8); flights quote-only (D-12) |
| **Multiple booking items** | `bk_booking` 1:N `bk_item` (service, qty, prices, asset reservation, discount, per-item status); multi-vendor trips = group of bookings (D-7); package components `pkg_item`; quote items `qtr_item` |
| **Partial payments** | `pay_intent` 1:N per booking with per-intent `amount_minor` ≤ remaining; ledger accumulates; `AWAITING_PAYMENT` persists until covered (D-8); bank-manual `PENDING_MANUAL` + 48 h timer; duplicate bank-reference guard |
| **Refunds** | `ref_refund` (many per booking) + `ref_line` per-item allocation (Σ invariant) + `ref_case` vendor-mediated (air); state machine; atomic ledger mirror + commission reversal; timeline copy (D-9) |
| **Availability** | `av_count` (per-entity per-date capacity/sold/version) + `av_departure` (dated seats) — single source of truth, CAS decrement (C-15/DB-03), locked-out rows (capacity 0) never deleted mid-history; search partial indexes on unsold rows |
| **Date/time** | Trip dates as `date` (start/end); business times as `time` (local); all instants `timestamptz` UTC; rate windows by date; availability by date; offer validity by instant (C-4) |
| **Time zones** | IANA `timezone` on the owning row (bk_booking, htl_property, trf_window, av_departure, user display default, ntf quiet hours); UTC storage + local display conversion; never stored-offset math (D-5) |

---

## 32. Plan additions beyond Arch §4.2 (justified)

Arch §4.2 names key tables per module; this plan adds the following tables to fully instantiate it. Each is **additive** (no Arch table removed or renamed).

| Added table(s) | Justification |
|---|---|
| `role`, `permission`, `user_role`, `role_permission` | PRD RBAC (GC-5) + admin console; Arch §4.2 listed auth tables but not the RBAC set; D-2 |
| `qtr_item` | requested QuoteItems/TripItems; multi-item quotes + custom trips (D-11); Arch `qtr_request.inputs` was underspecified for multi-item |
| `bk_item` | requested BookingItems; multi-item bookings (D-7); per-item refund allocation target; Arch §4.2 `bk_booking` carried a single service ref |
| `ref_line` | partial refunds per item + pro-rata commission reversal (PRD CM-06/07, BK-6) |
| `inv_invoice`, `inv_invoice_line` | requested Invoices; PRD §14 payment receipts; corporate invoicing [V1.5] (D-13) |
| `cpn_promotion`, `cpn_coupon` | requested; PRD V1.5 scope — schema early, feature late (D-14) |
| `trf_rate`, `trp_rate` | line-level date pricing concrete tables (Arch referenced "pricing reference" generically) |
| `htl_amenity` | requested HotelAmenities (property + room scoped) |
| `tour_package`, `tour_itinerary`, `tour_exclusion` | requested; PRD tour content completeness (itinerary/inclusions were named; exclusions are the UX pair, PRD tour detail spec) |
| `trek_route`, `trek_itinerary` | requested TrekRoutes/TrekItineraries; PRD trek detail spec |
| `dst_location` | requested Locations; service location points (pickup/drop/meeting) need referable POIs |
| `srv_location_point` | Arch §4.2 "location points" instantiated as table (referable, not jsonb) |
| `flt_search` | requested FlightSearches; quote prefill + search funnel analytics (PRD §34.3) |
| `trf_window` | scheduled transfer windows (capacity/sold/time) — the line's availability unit for SCHEDULED mode |
| `pay_provider_event` | webhook raw-event log + replay protection (Arch §3.5 `webhook_seen` instantiated in payments, BR-5 keeps inbound webhooks in payments) |
| `cust_wishlist` | requested Wishlists (named-list wrapper; items already in Arch `cust_wishlist_item`) |
| `corp_policy` | corporate policy (caps/approvals) — Arch `corp_policy` was listed in §4.2 but only corp_org/corp_user in the matrix; instantiated here |

> Note: `av_departure`, `bk_timer`, `bk_group`, `bk_document`, `outbox`, `idempotency_key`, `audit_log`, `srch_keyword_alias`, `ana_*`, `rpt_*`, `dsp_*`, `adm_*`, `pay_recon_run` are **already in Arch §4.2** and are instantiated verbatim here.

---

## 33. Open items for sign-off

| # | Item | Options | Recommendation |
|---|---|---|---|
| O-1 | `citext` extension for case-insensitive email/aliases | citext vs generated lower-column | citext (standard, small cost) |
| O-2 | Review granularity: one per **booking item** vs per booking | per-item (this plan) / per-booking | per-item (partial-refund bookings remain fair; PRD "1 per item") |
| O-3 | Named wishlist lists vs single implicit list | both now (this plan) / implicit only | both now (cheap; PRD V1.5 share feature wants lists) |
| O-4 | Invoice feature scope: customer receipts MVP, corporate invoicing V1.5 (tables now) | as planned / all V1.5 | as planned (D-13) |
| O-5 | Coupons/promotions tables now, feature V1.5 | as planned / defer tables | as planned (D-14; additive) |
| O-6 | Flight item pricing source: accepted **offer only** (no platform air pricing) | as planned / allow vendor list-price hints | as planned (GC-2 honesty) |
| O-7 | Asset reservation field: generic `bk_item.asset_kind/asset_id` (vehicle/room) | generic (this plan) / per-line tables | generic (one pattern, auditable) |
| O-8 | `ana_event` partition & retention: monthly, 13 months hot | as planned / 6 months | as planned (PRD §34) |
| O-9 | Geo naming: `geo_state` = province/region (Arch name kept) | keep / rename to `geo_province` | keep (Arch binding; naming-only concern) |
| O-10 | Vendor rate currency: allow non-NPR base prices (admin-visible) | allow (this plan, D-6) / NPR-only MVP | allow (GC-1; zero extra cost) |
| O-11 | `bk_booking.line` on multi-item bookings: ops-assigned dominant line | as planned / derive from highest-value item | derive from highest-value item (deterministic, no admin step) |
| O-12 | `htl_amenity` dictionary: per-service rows with codes (this plan) vs global amenity dictionary + links | as planned / dictionary table [V1.5] | as planned (codes are stable enough; dictionary later if i18n labels needed) |

---

## Appendix A — Requested-entity → canonical-table crosswalk

| # | Requested entity | Canonical table(s) | Section |
|---|---|---|---|
| 1 | Users | `user` | 4.1 |
| 2 | Roles | `role` | 4.3 |
| 3 | Permissions | `permission` | 4.4 |
| 4 | UserRoles | `user_role` (+ `role_permission`) | 4.5 / 4.6 |
| 5 | Customers | `user` (role CUST) + `cust_profile` | 4.1 / 5.1 |
| 6 | Vendors | `ven_org` | 6.1 |
| 7 | VendorDocuments | `ven_document` | 6.4 |
| 8 | VendorServices | `srv_service` (vendor-owned, line-scoped) + `ven_capability` | 8.1 / 6.3 |
| 9 | Countries | `geo_country` | 7.1 |
| 10 | Provinces | `geo_state` | 7.2 |
| 11 | Districts | `geo_district` | 7.3 |
| 12 | Cities | `geo_city` | 7.4 |
| 13 | Locations | `dst_location` | 7.8 |
| 14 | Destinations | `dst_destination` | 7.7 |
| 15 | Vehicles | `veh_fleet_vehicle` | 9.3 |
| 16 | VehicleTypes | `veh_type` | 9.1 |
| 17 | VehicleFeatures | `veh_feature` | 9.2 |
| 18 | VehicleAvailability | `av_count` (entity_type=`vehicle`) | 17.1 |
| 19 | VehiclePricing | `veh_rate` (+ `price_surcharge`) | 9.4 / 8.5 |
| 20 | VehicleImages | `srv_media` (service.line=VEHICLE) | 8.2 |
| 21 | Transfers | `trf_service` (+ `srv_service`) | 10.2 |
| 22 | TransferRoutes | `trf_route` | 10.1 |
| 23 | TransferAvailability | `trf_window` + `av_count` (entity_type=`trf_daily`) | 10.4 / 17.1 |
| 24 | TransferPricing | `trf_rate` | 10.3 |
| 25 | TransportationServices | `trp_service` (+ `trp_rate`) | 11.1 / 11.2 |
| 26 | Hotels | `htl_property` (+ `srv_service`) | 12.1 |
| 27 | HotelRooms | `htl_room_type` | 12.2 |
| 28 | HotelAmenities | `htl_amenity` | 12.3 |
| 29 | RoomAvailability | `av_count` (entity_type=`room`) | 17.1 |
| 30 | HotelPricing | `htl_rate_plan` | 12.4 |
| 31 | Tours | `tour_service` (+ `srv_service`) | 13.1 |
| 32 | TourPackages | `tour_package` | 13.2 |
| 33 | TourItineraries | `tour_itinerary` | 13.3 |
| 34 | TourInclusions | `tour_inclusion` | 13.4 |
| 35 | TourExclusions | `tour_exclusion` | 13.5 |
| 36 | TourImages | `srv_media` (service.line=TOUR) | 8.2 |
| 37 | Treks | `trek_attr` (+ `srv_service`) | 14.1 |
| 38 | TrekRoutes | `trek_route` | 14.2 |
| 39 | TrekItineraries | `trek_itinerary` | 14.3 |
| 40 | TravelPackages | `pkg_service` (+ `srv_service`) | 15.1 |
| 41 | PackageItems | `pkg_item` | 15.2 |
| 42 | Flights | `flt_route` (quote-only line — no services/inventory) | 16.1 |
| 43 | FlightSearches | `flt_search` | 16.2 |
| 44 | FlightBookings | `bk_booking` (line=FLIGHT) + `bk_document` (ETICKET/PNR) + `bk_traveler` | 19.x / D-12 |
| 45 | Bookings | `bk_booking` | 19.2 |
| 46 | BookingItems | `bk_item` | 19.3 |
| 47 | BookingPassengers | `bk_traveler` | 19.4 |
| 48 | BookingStatusHistory | `bk_event` (append-only) | 19.6 |
| 49 | Quotes | `qtr_request` + `qtr_offer` | 18.1 / 18.3 |
| 50 | QuoteItems | `qtr_item` | 18.2 |
| 51 | Payments | `pay_intent` (+ `pay_charge`, `pay_method`) | 20.2 / 20.3 / 20.1 |
| 52 | PaymentTransactions | `pay_charge` (+ `pay_provider_event`) | 20.3 / 20.4 |
| 53 | Refunds | `ref_refund` (+ `ref_line`, `ref_case`) | 21.1–21.3 |
| 54 | Invoices | `inv_invoice` (+ `inv_invoice_line`) | 22.1 / 22.2 |
| 55 | Coupons | `cpn_coupon` [V1.5] | 23.2 |
| 56 | Promotions | `cpn_promotion` [V1.5] | 23.1 |
| 57 | Reviews | `rev_review` (+ `rev_aggregate`) | 24.1 / 24.5 |
| 58 | ReviewResponses | `rev_reply` | 24.2 |
| 59 | Wishlists | `cust_wishlist` | 5.3 |
| 60 | WishlistItems | `cust_wishlist_item` | 5.4 |
| 61 | CustomTrips | `qtr_request` (mode=CUSTOM) | 18.1 / D-11 |
| 62 | TripItems | `qtr_item` | 18.2 / D-11 |
| 63 | CorporateAccounts | `corp_org` | 25.1 |
| 64 | CorporateUsers | `corp_user` | 25.2 |
| 65 | CorporateBookings | `bk_booking` (corp_org_id) + `corp_approval` | 19.2 / 25.4 |
| 66 | Notifications | `ntf_notification` (+ preference/suppression/delivery_log) | 26.x |
| 67 | TravelGuides | `cms_guide` | 27.1 |
| 68 | CMSPages | `cms_page` | 27.2 |
| 69 | AuditLogs | `audit_log` (append-only) | 4.11 |

**Supporting tables beyond the requested list** (needed by PRD/Arch to make the above work — see §32 for justifications): `user_verification_event`, `auth_session`, `mfa_enrollment`, `otp_issue`, `auth_idp_account`, `idempotency_key`, `outbox`, `cust_guest_contact`, `ven_user`, `ven_capability`, `ven_bank`, `ven_payout_detail`, `geo_alias`, `geo_airport`, `srv_media`, `srv_addon`, `srv_location_point`, `price_surcharge`, `tax_config`, `fx_rate`, `trf_window`, `trp_rate`, `av_count`, `av_departure`, `qtr_offer`, `bk_group`, `bk_document`, `bk_timer`, `pay_method`, `pay_provider_event`, `pay_ledger_entry`, `pay_settlement`, `pay_payout`, `pay_recon_run`, `ref_line`, `ref_case`, `inv_invoice_line`, `rev_reply`, `rev_photo`, `rev_report`, `rev_aggregate`, `corp_policy`, `ntf_preference`, `ntf_suppression`, `ntf_delivery_log`, `cms_localized`, `adm_setting`, `adm_feature_flag`, `dsp_dispute`, `dsp_evidence`, `srch_keyword_alias`, `ana_event`, `ana_session`, `rpt_kpi_rollup`, `rpt_funnel_daily`.

**Totals:** 69 requested entities → **116 canonical tables** (MVP: 111; `[V1.5]`-tagged: `auth_idp_account`, `pay_recon_run`, `cms_localized`, `cpn_promotion`, `cpn_coupon` = 5; `[V2]`-referenced only: `ai_session_meta`/`ai_feedback` — not in this schema, deferred with the feature).

---

*End of Database Architecture & Schema Plan v0.1 (Phase 04). DRAFT pending sign-off on §33. **No migrations or code implemented in this phase** — approval of this plan (including O-1…O-12) is the gate for the migration phase.*
