# Easy Trip Nepal — Product Requirements Document (PRD)

| Field | Value |
|---|---|
| Document ID | ETN-PRD-001 |
| Phase | 01 — Product Requirements |
| Version | 0.1 (DRAFT — pending product sign-off) |
| Date | 2026-09-09 |
| Status | Awaiting stakeholder review (see Appendix G: Open Decisions) |
| Supersedes | — |

**Change log**

| Version | Date | Author | Summary |
|---|---|---|---|
| 0.1 | 2026-09-09 | Product/Engineering (Arena agent) | Initial full PRD covering all 35 mandated sections + scope classification + appendices. |

**Scope legend used throughout this document**

| Tag | Meaning |
|---|---|
| `[MVP]` | Shipped at launch. Gated by Appendix A checklist. |
| `[V1.5]` | 0–6 months post-launch. |
| `[V2]` | 6–12 months post-launch. |
| `[FUT]` | 12+ months / conditional on provider or market decision. |

**Global constraints (binding on every section)**

- GC-1 Nepal-first, not Nepal-locked: geography (country → state/province → district → city), currency, timezone, language, tax, and pricing are all first-class, config-driven entities. Nepal data is seed data, never hardcoded logic.
- GC-2 No invented capabilities: no feature may assume live airline/GDS inventory, live hotel channel data, flight-tracking APIs, OCR auto-verification, LLM access, or any external API capability until a named provider is selected and validated (see Appendix C).
- GC-3 No invented data: no fake availability, inventory, prices, reviews, payment success, or booking confirmations. The only availability the platform knows about is availability a vendor explicitly published.
- GC-4 Payment success is backend-authoritative (provider webhook / verified status query). No endpoint, UI, or client input can set a booking paid.
- GC-5 All state changes are idempotent, audited (who/what/when/why), and guarded by RBAC + input validation.
- GC-6 All content (copy, images, guides) must be original or properly licensed. No copied branding, design, or text.
- GC-7 Money is represented as integer minor units + ISO currency code. No floating-point money.

---

## 1. Executive Summary

Easy Trip Nepal is a **Nepal-first travel marketplace** where customers discover, compare, customize, and book travel services across ten core service lines — vehicle rental, airport & city transfers, tourist transportation, tours, trekking, air ticketing, hotels & resorts, domestic travel, international travel, family & corporate tours — in one place.

Three booking models coexist and share one booking engine:

1. **Instant booking** against vendor-published inventory and prices.
2. **Request a quote** — vendor (or platform-routed vendors) responds with a versioned offer; the customer accepts and pays.
3. **Custom trip / Build-Your-Trip** — a multi-component, potentially multi-vendor itinerary assembled in a wizard, fulfilled through consolidated offers (trip-desk-assisted in MVP).

Supply-side: vendors self-register, submit business and service documentation, are approved by administrators (per service line), then manage services, pricing, availability, bookings, and earnings in a vendor portal.

Demand-side: an English-first, mobile-first, SEO-strong storefront with search, filters, compare, wishlist, and transparent pricing. International customers (non-Nepali phone, country, and payment) are supported from day 1.

The platform earns **commission** on customer-paid amounts (configurable per service line), recorded in an immutable ledger at payment time.

Quality bar: production-oriented from the start — typed API-first architecture, backend-verified payments, RBAC, audit logs, verified-only reviews, structured analytics, and a pre-launch security gate (threat model + external pen test).

---

## 2. Business Objectives

> All numeric values below are **planning targets to be validated**, not promises or invented facts.

| ID | Objective | Measure (working target) | Version |
|---|---|---|---|
| BO-1 | Launch a trusted Nepal domestic travel marketplace covering all 10 service lines | First real end-to-end paid booking in production; launch gate = Appendix A | MVP |
| BO-2 | Establish credible supply | ≥ 50 approved vendors and ≥ 300 published bookable/quoteable services by month 3 post-launch | MVP→V1.5 |
| BO-3 | Build recurring, commission-based revenue | GMV run-rate NPR 25M/month by month 6 (planning assumption, review at month 3) | V1.5 |
| BO-4 | Deliver a premium, trustworthy experience | LCP < 2.5s on 4G mobile (p75); NPS ≥ 50 by month 6; ≥ 95% of bookings confirmed within vendor SLA | MVP |
| BO-5 | Operate with zero payment or data integrity incidents | 100% webhook-verified payments; 0 unexplained ledger variances; 0 PII incidents; clean pen-test gate before launch | MVP |
| BO-6 | Prove international readiness without international launch | Geo/currency/locale/tax abstractions exercised in production with Nepal data; one non-Nepal destination pilot scoped in V2 | V2 |
| BO-7 | Supportable operations | Support first response < 4 business hours; quote response SLA < 24h (vendor) with escalation path; dispute resolution < 5 business days | MVP |

**Non-goals (MVP):** native mobile apps; live airline inventory / instant air booking; hotel channel-manager/OTA feeds; dynamic pricing; loyalty/points; machine-translated content; multi-country operations; B2B open API; LLM-powered planning (see §25).

---

## 3. Target Customers `[MVP unless noted]`

### 3.1 Customer personas

| ID | Persona | Description | Primary lines | Booking-mode affinity | Notes |
|---|---|---|---|---|---|
| P1 | Domestic leisure traveler (Nepali family/couple) | Weekend/getaway trips within Nepal: Pokhara, Chitwan, Bhairahawa, hill stations | Transfers, hotels, tours, vehicle rental | Instant | Price transparency, flexible cancellation, NPR payments (wallets/cards) |
| P2 | International tourist visiting Nepal | Arrival to departure: airport transfer, trekking/tours, hotels, onward domestic flights | Transfers, treks, tours, hotels, air tickets | Quote + Instant mix | English UI, international card payment, permit guidance |
| P3 | Adventure / trekking traveler | Everest, Annapurna, Langtang, Manaslu; gear-aware, group or solo | Treks, tours, vehicles | Quote (group departures) + Instant (fixed dates) | Difficulty, season, inclusions/exclusions clarity, guide quality |
| P4 | Pilgrim | Temple/circuit routes (e.g., Muktinath, Pashupatinath circuits, Janaki Janaki-dham) | Tours, transfers, vehicles | Quote | Group comfort, dietary considerations, respectful content |
| P5 | Students & groups | Budget-conscious groups (schools, clubs, university) | Packages, transfers, tours | Quote | Group pricing, single invoice, flexible dates |
| P6 | Corporate traveler | Business trips Kathmandu ↔ region, meetings, events | Air tickets, hotels, transfers | Quote + Instant | Policy, approvals, consolidated billing (§24) |
| P7 | Family / leisure premium | Multi-day curated family holidays; occasional luxury stays | Family tours, hotels, packages | Custom trip + Quote | One-stop itinerary, trusted vendors, child-friendly detail |
| P8 | Group / event organizer (corporate tours, incentive trips) | Company outings, retreats, incentive travel | Corporate tours, packages | Custom trip | Dedicated handling, volume, invoicing |

### 3.2 Account types

- **Individual** — default. One person, E.164 phone + country + email.
- **Corporate** — organization account with roles (see §24). `[MVP core]`
- **Guest** — no account. May browse and submit **quote requests** with contact details. Cannot instant-book, wishlist, or review. `[MVP]`

### 3.3 International-customer requirements (day 1)

- Non-NP phone numbers (E.164) and non-NP countries accepted in all identity fields.
- Display-currency conversion with explicit "approximate" labeling (NPR exact always shown). `[MVP]`
- International card acceptance **only if** the selected payment path supports it (Dependency D2 / §19); otherwise international customers use supported methods and the gap is surfaced honestly in UI.

---

## 4. Target Vendors

### 4.1 Vendor archetypes

| ID | Archetype | Lines | Inventory model (MVP) | Booking modes | Notes |
|---|---|---|---|---|---|
| V-1 | Vehicle operator | Vehicle rental | Fleet + per-vehicle daily calendar, vendor-managed | Instant (with-driver); self-drive with vendor-collected deposit (documented exception, §28) | Driver names provided by vendor (vendor-reported, displayed as such) |
| V-2 | Airport/city transfer operator | Transfers | Route services; capacity per time window (vendor-managed) or on-request | Instant (published) / Quote | Fixed-route departures modeled as dated services |
| V-3 | Tour operator | Tours, family tours, corporate tours, packages, (experiences `[V1.5]`) | Dated departures with seat counts, or custom-departure on-request | Instant (fixed departures) / Quote (custom) | Structured inclusions/exclusions required |
| V-4 | Trekking operator | Trekking | Dated departures with seat counts; restricted-area lead time | Quote-first (default), Instant where published | Permits handled by vendor; see PII handling §30.4 |
| V-5 | Hotel / resort (direct) | Hotels & resorts | Room types + rate plans + daily availability counts, vendor-managed | Instant (published) / Quote (group/long stay) | No channel-manager feeds in MVP (GC-2) |
| V-6 | Travel agency / ticketing agent | Air tickets, international travel, custom-trip fulfillment | Quote-only (no live inventory) | Quote only | Licensed agency; issues tickets post-payment; §26 |
| V-7 | Intercity/tourist transportation operator | Tourist transportation | Charter-capacity per route/date (vendor-managed) or on-request | Instant (published) / Quote | Charter-style; public-ticketed buses are out of scope |
| V-8 | Experience/activity provider `[V1.5]` | Experiences (sub-type of tour) | Dated slots with capacity | Instant / Quote | Paragliding, rafting, etc. — same engine |
| V-9 | International destination vendor `[V2/FUT]` | International lines | Quote (MVP-era pattern) | Quote | First non-Nepal destination pilot |

### 4.2 Vendor profile & documentation (schema-level; exact documents finalized with legal)

Core (all lines): business registration/operating license, PAN/VAT registration (Nepal example), bank account for payouts, primary contact + backup contact, profile content (about, photos, policies).

Line-specific (examples; admin checklist is configurable per line):

| Line | Example additional documents |
|---|---|
| Vehicle rental / transfers / tourist transport | Vehicle registration certificates, insurance certificates, driver employment/qualification proof |
| Tours / trekking / agency (air) | Tourism business license (e.g., Department of Tourism — to be verified per line), guide qualification proof (vendor-declared) |
| Hotels / resorts | Fire safety / safety compliance certificate, food hygiene (if F&B), tax registration for lodging |

Rules: documents are stored privately in object storage; admin-only access; no OCR/auto-verification in MVP (GC-2); expiry tracking `[MVP basic]` + automated expiry handling `[V2]`.

---

## 5. Admin Users

### 5.1 Roles

| Role | Scope summary |
|---|---|
| `SUPER_ADMIN` | Everything, including settings, commission config, user management, feature flags |
| `OPS_ADMIN` | Vendor approval, service moderation, bookings intervention, geo/destination/content management, disputes |
| `FINANCE_ADMIN` | Payments verification (bank transfer), refunds approval, settlements, reconciliation, finance reports |
| `SUPPORT_ADMIN` | Customer & vendor support, disputes (case work), notifications, content (help), no finance actions |
| `TRIP_DESK` | Custom-trip coordination only: quote routing, offer threads, vendor coordination |

### 5.2 Rules

- AR-1 Multi-factor authentication (TOTP) required for all admin roles. `[MVP]`
- AR-2 Deny-by-default authorization: every route checks role permission **and** object ownership/scope.
- AR-3 Every admin action on entities (approve, reject, suspend, refund, force-cancel, config change) writes an audit record with reason where applicable.
- AR-4 Admin sessions: shorter lifetime, concurrent-session cap (1 active per device fingerprint, warn on second), logout everywhere on credential change.
- AR-5 Granular per-permission matrix (finer than role) `[V1.5]`.
- AR-6 Admin access review (monthly list export of active admin sessions) `[V1.5]`.
- AR-7 IP allowlist option for admin area (configurable) `[V1.5]`.

---

## 6. Complete Service Catalog

### 6.1 Catalog architecture

- **Base entity `Service`** shared by all lines: ID, vendor, line, status (`DRAFT → PENDING → PUBLISHED → SUSPENDED → RETIRED`), destination/region (geo-linked), location points (pickup/dropoff/meeting), title/slug, description, media, tags, pricing reference, policy references, SEO fields, computed review aggregate.
- **Line-specific extensions** (attributes, pricing, availability, policies) per §26–§30.
- **Publishability gate:** a service is bookable only when: vendor (and its line capability) is `APPROVED` AND service `PUBLISHED` AND pricing present AND availability published (instant lines) — otherwise it appears as "availability/price on request" (quote).
- **Content rules:** original copy only; images original or licensed with record; vendor-reported claims (e.g., "fire-safety certified") displayed with attribution "vendor-reported"; alt text mandatory.
- **Localization:** English content in MVP; Nepali content `[V1.5]` (human-authored, not machine-spam); multi-destination/multi-language `[V2]`.

### 6.2 Service lines

| Line ID | Line | MVP booking mode(s) | Inventory model | Key attributes (summary) |
|---|---|---|---|---|
| `VEHICLE_RENTAL` | Vehicle Rental | Instant (with-driver); self-drive (deposit exception §28) | Per-vehicle daily calendar | Vehicle type, seats, fuel, driver/self-drive, KM limit, daily rate |
| `TRANSFER` | Airport & City Transfers | Instant (published) / Quote | Per route, per time-window capacity (optional) | Route, airport/local/intercity, vehicle class, time window, flight ref (informational) |
| `TOURIST_TRANSPORT` | Tourist Transportation | Instant (published) / Quote | Per route/date charter capacity (optional) | Route, charter capacity, duration, schedule mode |
| `TOUR` | Tours & day tours | Instant (fixed departures) / Quote (custom) | Dated departures with seats | Duration, inclusions/exclusions, group min/max, languages, meeting point |
| `TREK` | Trekking | Quote (default) / Instant (published departures) | Dated departures with seats | Difficulty, nights/days, season, permits, accommodation type, guide/porter |
| `AIR_TICKET` | Air Ticketing | **Quote only** (no live inventory, GC-2) | None (agency-mediated) | Route (airports), dates, pax, class, baggage preference, fare basis, refundability |
| `HOTEL` | Hotel & Resort Booking | Instant (published) / Quote (group/long stay) | Room type × date availability counts | Star (vendor-declared), room types, rate plans, meal plan, check-in/out |
| `DOMESTIC_TRAVEL` | Domestic travel packages | Quote / Instant (fixed published packages) | Dated departures (packages) | Multi-component itinerary, duration, inclusions |
| `INTL_TRAVEL` | International travel (from Nepal) | Quote | None (agency-mediated) | Destination, duration, components, visa info (content), inclusions |
| `FAMILY_TOUR` | Family Tours | Quote / Instant (published) | Dated departures (packages) | TOUR/PACKAGE with family attributes (age fit, child facilities) |
| `CORPORATE_TOUR` | Corporate Tours | Quote | Dated departures (packages) | TOUR/PACKAGE with group/billing attributes |
| `PACKAGE` | Packages (curated) | Quote / Instant (published) | Dated departures | Itinerary, components, per-person pricing |
| `EXPERIENCE` `[V1.5]` | Activities & experiences | Instant / Quote | Dated slots with capacity | Duration, location, group size |

> `FAMILY_TOUR` / `CORPORATE_TOUR` are merchandising categories of the same package/tour entity (flag + attributes), not separate engines. `DOMESTIC_TRAVEL` / `INTL_TRAVEL` are curated multi-component packages; `INTL_TRAVEL` destinations outside Nepal remain agency-fulfilled (quote) until V2 vendor expansion.

### 6.3 "Additional trending travel services" handling

| Service | Treatment | Version |
|---|---|---|
| Travel insurance | Advisory content MVP; optional partner product at checkout (underwriter-provided, never underwritten by platform) | V1.5 (content MVP) |
| eSIM | Partner-sold product (provider-dependent; no invented inventory) | V2 |
| Visa assistance | Informational content + agency quote routing (same as `INTL_TRAVEL`) | MVP (content) / V1.5 (quote routing) |
| Permits (trekking/national park) | Vendor-managed line item inside trek services; platform displays + collects minimal PII (§30.4) | MVP |
| Helicopter / adventure fly-tours | Modeled as `EXPERIENCE`/`TOUR` services by qualified vendors | V1.5 |
| Group events (weddings, retreats) | `CORPORATE_TOUR` / custom-trip | MVP |

---

## 7. Customer Journeys

### 7.1 Canonical journey (all modes)

`Discover → Search → Filter → Compare → Select → Customize → Book → Pay → Receive confirmation → Manage trip → Complete trip → Review`

| Step | Touchpoint | System behavior (MVP) | Exit / edge |
|---|---|---|---|
| Discover | Home, destination hubs, SEO pages, guides, wishlist re-engagement | SSG content + catalog merchandising (curated + rule-based) | Bounce → exit; re-engagement email `[V1.5]` |
| Search | Search bar, category landing | FTS + structured filters (§20–21) | No results → suggestions/popular |
| Filter | Results page | Facets, URL-shareable state | Empty set → relax hints |
| Compare | Compare drawer (≤4) | Attribute tables (§22) | — |
| Select | Detail page | Full pricing breakdown, policy, availability (instant) or "on request" (quote), reviews (verified only) | Sold out / off-season → alternate dates / quote CTA |
| Customize | Wizard per line (dates, party, add-ons) | Server-side price recompute on every change | Price change → explicit re-confirmation |
| Book | Cart/checkout | Idempotent booking creation (mode A/B/C, §10) | Draft auto-expire 7 days |
| Pay | Payment page (provider redirect) | Webhook-verified success only (GC-4) | Failure → retry ×3 in session; expiry → auto-cancel |
| Confirmation | Email + in-app | Itinerary, voucher, vendor/driver contact, policy, emergency contacts | Vendor can't honor → full-refund path (§10.5) |
| Manage | My trips | Status timeline, reschedule request (quote flow), cancellation (§13), documents, add-on requests | — |
| Complete | — | Vendor marks complete (or auto-complete rule per line) | Dispute window opens |
| Review | Post-completion | Verified-review flow (§17) | Ineligible → explained |

### 7.2 Variant A — Instant booking (detailed)

1. Detail page shows live published price for selected dates/party + availability (only if vendor published; else "on request").
2. Price lock at cart creation for 15 minutes (server-side); expiry → re-quote of same inputs.
3. Traveler details + payment → booking `AWAITING_PAYMENT`.
4. Provider webhook → `PAID` → vendor confirms within 12h SLA (or auto-confirm if vendor policy allows) → `CONFIRMED` + voucher + notifications.
5. Delivery window → `IN_PROGRESS` (vendor or auto per line rules) → `COMPLETED` → review eligibility.

Edge: vendor declines after payment → auto-full-refund flow + admin case + customer offer of alternatives (§10.5).

### 7.3 Variant B — Request a quote

1. Customer submits request (service + dates + party + free-text needs) — guest allowed with contact.
2. System routes to the service's vendor(s) (`[MVP]`: the service vendor; custom-trip items route per §23).
3. Vendor responds within 24h SLA with versioned offer (price breakdown, terms, validity 48h default).
4. Customer accepts → `AWAITING_PAYMENT` (offer price locked) → pay → `PAID` → vendor confirms → `CONFIRMED`.
5. Decline / expiry / re-quote (max 3 revisions) → `CANCELLED` with reason.

### 7.4 Variant C — Custom trip / Build-Your-Trip

See §23 for the full flow.

### 7.5 Post-booking management

- **View:** itinerary, voucher/PDF, vendor & on-ground contacts, policy, booking timeline.
- **Reschedule:** request → vendor decision (quote lines re-offer; instant lines re-validate availability) `[MVP: request-based; one-way rebooking]`.
- **Cancel/refund:** per §13/§14.
- **Add-ons:** request-based in MVP (e.g., extra guide, child seat) → vendor confirm + amend invoice if needed (delta payment `[V1.5]`; MVP: vendor-adjusted re-offer before service start only).
- **Documents:** e-ticket PDF (air), permits info, packing lists — delivered in-app + email links.

### 7.6 Guest vs account

| Capability | Guest | Account (email-verified) |
|---|---|---|
| Browse/search/detail | ✓ | ✓ |
| Quote request | ✓ (contact required) | ✓ |
| Instant booking | ✗ (account required — needed for management, payment verification, reviews) | ✓ |
| Wishlist / compare persistence | Session only | ✓ |
| Reviews | ✗ | ✓ (on completed bookings) |
| Corporate features | ✗ | ✓ (org roles) |

---

## 8. Vendor Journeys

| Step | System behavior | Rules / edges |
|---|---|---|
| Register | Vendor signup (business identity, primary contact, requested lines) | One business per account (dedup by business ID, best-effort); account is separate from customer accounts |
| Submit profile | Complete profile + upload documents (§4.2) | Status `SUBMITTED`; editable until `IN_REVIEW` |
| Verification (manual) | Admin queue: document checklist per line, side-by-side review | Target SLA 3 business days; no OCR in MVP (GC-2) |
| Admin approval | Per-line capabilities granted; decision with mandatory reason on reject/suspend | Rejection → 30-day reapplication cooldown (configurable); suspension → existing bookings continue, new bookings blocked |
| Add services | Create service (line-specific forms), media, structured attributes | Must pass validation + content rules; services of an approved line auto-publish after validation; admin moderation (suspend/hold) available as safety valve |
| Add pricing | Price types per §11 + per-line rules | No negative prices; changes never affect existing bookings |
| Add availability | Per-line availability editors (calendars, departures, time windows) | Published availability = bookable availability (GC-3); "on request" when not published |
| Receive booking | In-app + email notification; inbox with SLA countdown | SLA: quote response 24h; confirm after payment 12h |
| Confirm / Reject | Instant: confirm/decline (decline ⇒ full refund + case); Quote: submit offer (≤3 revisions) | Decline after payment is a vendor-fault event: counted in vendor metrics, refund auto-processed |
| Deliver service | Mark start/complete; upload deliverables (e-ticket, final itinerary) | Auto-complete rules per line (§26–30) with vendor override |
| Receive earnings | Earnings ledger (gross, commission, refunds, holds, settlements) | Settlement weekly (manual verification MVP); hold periods per line (air 30 days) |
| Reports | Vendor dashboards + CSV export (§31) | Permissions scoped to vendor org |
| Maintain | Update documents, availability, prices, respond to reviews | Document expiry reminders (MVP basic) |

**Vendor SLA table (defaults, admin-configurable):**

| Event | SLA | Consequence of miss |
|---|---|---|
| Quote response | 24h | Escalation to trip desk; customer notified "we are getting your best offer"; quote auto-closed at 72h |
| Offer validity | 48h (vendor-set within 24–96h) | Auto-expire → booking `CANCELLED` (reason: offer expired) |
| Confirm after payment (instant) | 12h | Reminder → 24h: customer option to cancel with full refund (no penalty) |
| Ticket issuance (air) | 24h | Escalation; >48h: auto-refund option to customer |
| Service start mark | Day of service | Auto `IN_PROGRESS` at scheduled start + grace (line-specific) |

---

## 9. Admin Journeys

| Area | Capability (MVP) | Rules |
|---|---|---|
| Monitor | KPI home: GMV, revenue, bookings by status/line, quote pipeline, SLA breaches, webhooks/queue health | Read-only; audit-safe |
| Approve vendors | Queue, documents, per-line checklists, approve/reject/suspend with reason | AR-3 audit; SLA target 3 business days |
| Manage inventory | Service moderation (hold/suspend/restore), geo tree & destination management, destination content | Suspension hides service everywhere incl. search; URL 301s handled |
| Manage bookings | Search/filter all bookings; timeline view; intervene: force-cancel (reason), reassign trip desk, extend deadlines | Force-cancel triggers refund policy review (manual) |
| Manage payments | Verify bank-transfer payments (reference match), approve manual/partial refunds, settlement batches, reconciliation view | Two-person rule for settlements `[V1.5]`; MVP single FINANCE_ADMIN with audit |
| Manage customers | Search, profile, verification status, flags, support notes; corporate KYC review | PII masked by default |
| Manage content | Destinations, guides, banners, static pages (help/FAQ) | Original-content policy enforced by checklist |
| Manage promotions | Coupon/campaign engine | `[V1.5]` |
| Resolve disputes | Case queue: evidence from both sides, decision (refund/compensation/reject), SLA 5 business days | Compensatory credits `[V1.5]`; every decision audited |
| Reports | Admin dashboards + CSV (§31) | Export audit (who/when/rows) |
| System settings | Service lines, commission config, geo seeds, display-currency rate table, notification templates, feature flags, SLA defaults | Config changes audited; require SUPER_ADMIN |

---

## 10. Booking Models `[MVP]`

### 10.1 Modes

| | INSTANT | QUOTE | CUSTOM (Build-Your-Trip) |
|---|---|---|---|
| Trigger | Published price + availability | Price/availability on request, or customer needs flexibility | Wizard assembles multi-component trip |
| Price source | Vendor-published pricing, locked at cart creation (15 min) | Vendor offer (versioned, valid 24–96h) | Per-component (instant components locked; quote components via offers) |
| Payment timing | Before vendor confirmation (pay-first) | After offer acceptance | After consolidated offer acceptance (per-booking in MVP) |
| Confirmation | Vendor confirms ≤12h (or auto-confirm policy) | Vendor confirms after payment | Per-vendor confirmations grouped under one trip |
| Typical lines | Transfers, hotels, vehicles, fixed-departure tours/treks | Air tickets, custom departures, international, groups | Any mix |
| Guest access | No (account required) | Yes | Account required (multi-step) |

### 10.2 Trip grouping

- Every booking belongs to an optional **trip group** (`tripGroupId`). Custom trips create one booking **per vendor** under one group; the customer sees one consolidated itinerary and manages items individually.
- MVP: payment is **per booking** (sequential). Consolidated single payment for a group: `[V1.5]`.
- Cancellation of one group item does not auto-cancel siblings (customer decides; §23.3).

### 10.3 Lifecycle state machine

States: `DRAFT, PENDING, QUOTED, AWAITING_PAYMENT, PAID, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, REFUNDED, FAILED`.

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PENDING: submit (quote/custom)
    DRAFT --> AWAITING_PAYMENT: submit (instant, pay-first)
    DRAFT --> CANCELLED: abandoned (auto-expire 7d) / customer cancels
    PENDING --> QUOTED: vendor offer submitted
    PENDING --> CANCELLED: vendor declined / customer cancelled / no-offer timeout (72h)
    QUOTED --> AWAITING_PAYMENT: customer accepts offer
    QUOTED --> QUOTED: vendor re-quote (≤3 revisions)
    QUOTED --> CANCELLED: customer declined / offer expired / vendor pulled
    AWAITING_PAYMENT --> PAID: provider webhook verified
    AWAITING_PAYMENT --> CANCELLED: payment session expired (auto)
    AWAITING_PAYMENT --> FAILED: unrecoverable processing error (rare)
    PAID --> CONFIRMED: vendor confirmed (manual/auto policy)
    PAID --> CANCELLED: vendor cannot honor (vendor-fault; auto full refund)
    CONFIRMED --> IN_PROGRESS: vendor marks start / auto at start+grace
    CONFIRMED --> CANCELLED: customer cancels per policy (refund if owed)
    IN_PROGRESS --> COMPLETED: vendor marks complete / auto at end+grace
    IN_PROGRESS --> CANCELLED: mid-service stop (safety/vendor; admin-aware; refund manual)
    CANCELLED --> REFUNDED: full refund processed (when owed)
    CANCELLED --> [*]
    REFUNDED --> [*]
    FAILED --> [*]
```

**Transition rules**

| Rule | Text |
|---|---|
| BK-1 | Every transition is an idempotent command (idempotency key = actor+entity+action+clientKey), validated server-side, with allowed-actor check (customer / vendor / admin / system). |
| BK-2 | Every transition writes an audit record: actor, role, from→to, reason code, context hash, timestamp (UTC). |
| BK-3 | Customer-visible transitions always enqueue notifications (§18). |
| BK-4 | `CANCELLED` always carries a reason code (`CUSTOMER_REQUEST, VENDOR_DECLINED, PAYMENT_EXPIRED, OFFER_EXPIRED, NO_RESPONSE_TIMEOUT, VENDOR_CANNOT_HONOR, ADMIN, SAFETY, NO_SHOW, SYSTEM`). |
| BK-5 | Terminal states (`COMPLETED, CANCELLED→(REFUNDED when refund owed), REFUNDED, FAILED`) are immutable; corrections are admin-journal entries, never state rewrites. |
| BK-6 | Partial refunds never change booking state; they are refund records on `CANCELLED`/`COMPLETED` bookings. `REFUNDED` = terminal only when the full paid amount is refunded after cancellation. |
| BK-7 | Concurrency: availability decrements use optimistic locking/version check; on oversell the system must never silently succeed — it triggers vendor alert + compensating full-refund offer (§27.4/28.4). |

### 10.4 Offers (quote mode)

- Offer: itemized price breakdown, terms summary, validity window (vendor-set 24–96h, default 48h), payment methods, version number.
- Max 3 vendor revisions per booking; after that the booking closes (`CANCELLED`).
- Acceptance outside validity → rejected with "offer expired, re-request" (no silent re-pricing).
- Vendor may withdraw an unaccepted offer (notifies customer).

### 10.5 Price integrity & vendor-cannot-honor

- Prices are computed **server-side only** (GC-4/GC-7); the client transmits selections, never amounts.
- Instant: price locked 15 min at cart creation; on expiry the same inputs are re-priced (customer re-confirms any delta).
- If a vendor cannot honor a paid instant booking: auto `CANCELLED` (vendor-fault) → **full refund** (no policy deduction — vendor fault) → admin case opened → vendor metrics impacted → customer offered alternates (manual, trip desk).

### 10.6 Availability integrity (anti-invention)

- Instant bookings decrement **only vendor-published** capacity (departures/seat counts, room counts, vehicle-day slots, time-window capacity).
- No published capacity ⇒ the service is effectively quote-mode in UI ("availability on request").
- The platform never buffers, overbooks, or fabricates capacity. Vendor "overbooking" is a vendor-fault path (§10.5).

### 10.7 SLA & timing defaults (admin-configurable)

| Parameter | Default |
|---|---|
| Draft auto-expire | 7 days |
| Price lock (instant cart) | 15 minutes |
| Quote response | 24h (vendor), quote closed 72h |
| Offer validity | 48h (24–96h allowed) |
| Payment session expiry (card/wallet) | 15 min + 3 retries |
| Payment expiry (bank transfer, manual verify) | 48h → auto-cancel |
| Vendor confirmation after payment | 12h |
| Ticket issuance (air) | 24h |
| Review window after completion | 365 days (Open Decision D8) |

### 10.8 Party & traveler data

- Booking has a primary contact (booker) + travelers (individual lines: name, birthdate where required; air: passport number for international — masked display, encrypted at rest, access-scoped; §26.3).
- Party size rules per line (min/max, children age bands) validated server-side at cart and at offer acceptance.

---

## 11. Pricing Model

### 11.1 Representation & currency

- PR-01 Money = integer minor units + ISO-4217 code (GC-7). DB `numeric(14,2)`-equivalent semantics; never floats.
- PR-02 **Base/settlement currency: NPR.** Display currencies (USD, EUR, INR, etc.) are conversions from an admin-managed reference-rate table with source label + timestamp + TTL. Converted amounts are always shown as "**≈**" (approximate) alongside the exact NPR amount. Missing/stale rate ⇒ NPR only. `[MVP]`
- PR-03 Vendor settlement currency = NPR (MVP). Multi-currency settlement: `[V2]` (GC-1 ready).
- PR-04 Rate-table source is a **decision** (manually maintained vs. licensed feed); MVP ships manual entries with required "source + as-of" fields. No invented live FX feed.

### 11.2 Price types

| Type | Use |
|---|---|
| `FIXED` | Package price, transfer per-vehicle, custom offer total |
| `PER_DAY` | Vehicle rental, some tours |
| `PER_PERSON` | Tours, treks, experiences |
| `PER_NIGHT` | Hotels (rate plan) |
| `PER_ITEM` | Add-ons (child seat, extra permit fee, single supplement) |

### 11.3 Price components (checkout breakdown, always itemized)

`base` + `addons` + `date_surcharge` (peak/holiday calendar, vendor- or admin-configured) + `taxes` (jurisdiction-configured; Nepal example: standard VAT 13% where applicable — config, not hardcode) − `discount` (`[V1.5]`) = **total**.

- PR-05 No hidden platform booking fee in MVP. If a platform service fee is ever introduced, it is itemized, disclosed before payment, and configurable per line (legal + product decision).
- PR-06 Per-person lines support child/infant age bands (line-configurable) and group minimums.
- PR-07 Multi-unit math: per-vehicle + per-person mixed carts (e.g., tour with vehicle) resolve via the line's pricing template; rounding per component, final = sum of components (no round-then-sum drift).

### 11.4 Published vs on-request pricing

- Every service/rate plan declares: `PUBLISHED_PRICE` (instant-capable) or `ON_REQUEST` (quote).
- "From ~" price on cards = minimum published price across dates, always labeled "from"; for quote-only services: "Price on request" (never a fabricated number).
- Vendor price changes affect **new** bookings/quotes only (BK-6/PR-08: existing bookings hold their locked price).

### 11.5 Discounts & promotions `[V1.5]`

- Coupon engine: %-or-fixed, caps (per user/vendor/line/date), one per booking, non-stackable, expiring, server-validated at payment.
- Vendor-set discounts vs platform campaign (commission-impact rules defined in §12.4).
- Price-drop detection feeds wishlist alerts (§22).

### 11.6 Edge cases

| Edge | Rule |
|---|---|
| Surcharge calendar overlap | Highest applicable wins; both shown itemized |
| Long-stay (hotel >30n, vehicle >7d) | Vendor may define long-stay rates; else linear (no invented discount) |
| Child pricing missing for a line | Block per-person cart completion until vendor sets bands (validation) |
| Display-currency rounding | Round display only; charge always in NPR (or provider card currency with disclosed FX — §19.5) |
| Peak-date selection after off-peak quote | Re-quote required; delta shown explicitly |

---

## 12. Commission Model

### 12.1 Fee basis

- CM-01 Commission = configured **% of (customer-paid amount − platform-collected taxes)**, per service line. Record computed once at successful payment, written to ledger. Never recomputed later.
- CM-02 Seed proposal (admin-configurable; **final values = Open Decision D3**):

| Line | Proposed commission |
|---|---|
| Tours / Treks / Packages / Family / Corporate | 10% |
| Hotels | 10% |
| Transfers / Tourist transport | 8% |
| Vehicle rental | 8% |
| Air ticketing (agency) | 3% |
| International travel (agency) | 5% |

- CM-03 Customer-side fees: none in MVP (§11.5 PR-05).
- CM-04 Commission on quote bookings uses the **accepted offer** amount. Custom trip: per-item booking, per-line rate.
- CM-05 No commission on the portion of a booking refunded (pro-rata reversal at refund processing, CM-07).

### 12.2 Settlement

- SM-01 Settlement cycle: **weekly batch** (MVP: batch generated, FINANCE_ADMIN verifies, bank transfer executed outside platform, recorded as `PAYOUT` with reference + amount + batch).
- SM-02 Settlement = gross paid − commission − refunds − adjustments, per vendor, per cycle.
- SM-03 Hold periods (before amount enters settlement): completed services 7 days (admin-configurable); **air ticketing 30 days** (refund/chargeback exposure); vendor-suspended: all pending amounts held.
- SM-04 Minimum payout threshold (e.g., NPR 5,000 — configurable); below threshold rolls forward.
- SM-05 Automated payout execution (API-driven): `[V1.5]`. Same-day/instant payouts for eligible vendors: `[V2]`.
- SM-06 Vendor debt (negative settlement after clawbacks) is carried to next cycle and surfaced in dashboard; repeated negative ⇒ finance review.

### 12.3 Reversals & chargebacks

- CM-06 Full refund ⇒ full commission reversal (ledger entry pairs with original).
- CM-07 Partial refund ⇒ pro-rata commission reversal.
- CM-08 Provider chargeback after settlement ⇒ clawback from next settlement + vendor case (contractual liability per vendor agreement — legal doc required pre-launch).
- CM-09 All commission figures appear in vendor reports (§31) with per-booking transparency.

### 12.4 Edge cases

| Edge | Rule |
|---|---|
| Discounted booking (V1.5) | Commission on actual customer-paid amount |
| Platform-funded campaign discount | Platform absorbs; vendor paid on net customer-paid; commission recomputed on net (recorded at campaign config, not at payment drift) |
| Vendor-initiated full refund | Commission reversed; vendor revenue −0 |
| Multi-line one vendor (custom trip) | Each item booking carries its own line's rate |
| FX display vs settlement | Settlement always NPR (MVP); reports show NPR |

---

## 13. Cancellation Model

### 13.1 Cancellation policy object

- CN-01 Every bookable service/rate plan has a **cancellation policy**: ordered tiers of `hours_before_start` boundaries and charge types: `FREE | PERCENT(%) | FIXED(amount) | NON_REFUNDABLE`.
- CN-02 Defaults per line (seed, vendor-overridable within admin-defined bounds):
  - Transfers: free until 12h before; then 100%.
  - Hotels: per rate plan (vendor-set, typical: free until 48h).
  - Vehicle: free until 24h (vendor-set).
  - Tours/treks: vendor-set tiers (e.g., >7d free; 7–3d 50%; <3d 100%).
  - Air ticketing: **no platform-computed policy** — agency decides per airline rules (CN-07).
- CN-03 Time is computed in the service's local timezone (MVP: Asia/Katmandu; GC-1 ready), boundary inclusivity: exactly-at-boundary ⇒ the more customer-favorable tier.

### 13.2 Actors & rights

| Actor | Right | Rules |
|---|---|---|
| Customer | Cancel any non-terminal booking | Charge per policy; refund auto-created if owed (original method); confirm + audit + notify |
| Vendor | Decline unaccepted quotes; cancel paid bookings | Post-payment vendor cancel = **vendor-fault**: full refund regardless of policy, metrics impact, admin case (BK/§10.5) |
| Admin | Force-cancel any booking | Mandatory reason; refund decision manual (can exceed policy for customer good); full audit |
| System | Auto-cancel on: draft expiry, payment expiry, offer expiry, no-response timeout | Reason codes set; refunds auto (owed = full, pre-delivery) |

### 13.3 Special cases

- CN-04 **Air ticketing:** cancellation routed to agency; agency responds with airline outcome (refund amount/fees/none) within 5 business days target; platform records as `REFUND PROCESSING (vendor-mediated)` until vendor confirms amount → then standard refund flow. No platform auto-computation (GC-2).
- CN-05 **Mid-service cancellation** (`IN_PROGRESS`): safety stops are vendor-initiated ⇒ full refund of undelivered portion (auto for pre-agreed per-day rates; else admin). Customer-initiated mid-trek exit ⇒ vendor-determined partial refund with published per-day schedule where available; always admin-visible.
- CN-06 **No-show:** separate reason code; policy applies (typically NON_REFUNDABLE tier); vendor may grant exception (recorded).
- CN-07 **Partial (per-item) cancellation:** allowed on custom-trip groups (each booking independent) and hotel multi-room? MVP: whole-booking only except custom-trip groups; general per-item cancellation `[V1.5]`.
- CN-08 **Modification:** reschedule = cancel-and-rebook semantics in MVP (quote lines: new offer; instant lines: re-validate availability), no state mutation. In-place modification `[V1.5]`.

### 13.4 Effects & edge cases

| Edge | Rule |
|---|---|
| Cancel while refund already processing | Second cancel rejected (idempotent no-op, state already `CANCELLED`) |
| Cancel on `PAID` before vendor confirm | Full refund auto (policy tier = FREE pre-confirmation) |
| Cancellation at service start moment | Vendor confirms actual start time; boundary uses confirmed time |
| Vendor cancels, customer wants alternate | Trip desk offers substitutes (manual, logged) |
| Payment method dead (wallet closed) for refund | Refund via admin-selected fallback (bank transfer to verified account) — recorded, customer-consented |

---

## 14. Refund Model

### 14.1 Refund entity

Fields: amount (minor units + currency), reason code, policy reference, origin (auto/manual/vendor/admin), method, status `REQUESTED → APPROVED → PROCESSING → COMPLETED | REJECTED`, provider reference, timeline.

### 14.2 Rules

- RF-01 **Original method first.** Provider supports auto-refund for that method ⇒ auto (within policy-computed amount, full-tier refunds). Otherwise manual: bank transfer to the account on file (customer consent captured at booking for refunds), processed by FINANCE_ADMIN with SLA 5 business days.
- RF-02 Partial refunds always manual approval (FINANCE_ADMIN or delegate), amount must be ≤ (paid − already-refunded).
- RF-03 Air-ticket refunds are vendor-mediated status until agency confirms amount (CN-04), then RF-01.
- RF-04 Refund processing creates ledger reversal entries **and** commission reversal (§12.3) atomically.
- RF-05 Customer receives: request acknowledgement, processing, and completion notifications with expected-timeline text ("typically 3–10 business days to your original method, depending on provider" — honest, provider-dependent; never a fabricated exact date).
- RF-06 Refund of bank-transfer-paid booking: reverse manual transfer (admin), 5–10 business days target.
- RF-07 Rejected refunds (e.g., admin-determined policy non-eligible) require reason + customer support follow-up; audit mandatory.
- RF-08 Reconciliation: refunds reconcile to provider statements daily `[V1.5 tool; MVP manual CSV]`.

### 14.3 Provider capability table (to be finalized at provider selection — Dependency C-1)

| Method | Auto-refund expected | Manual fallback |
|---|---|---|
| eSewa / Khalti (candidate wallets) | Confirm during integration | Bank transfer |
| Domestic cards via NCH (candidate) | Confirm during integration | Bank transfer |
| International cards (partner acquirer — Dependency C-2) | Confirm | Bank transfer / provider dispute |
| Bank transfer (inbound) | n/a (manual) | Manual transfer |

> GC-2: exact capabilities, limits, and timelines are verified in sandbox before launch; UI copy is generated from the verified capability matrix, not assumptions.

### 14.4 Edge cases

| Edge | Rule |
|---|---|
| Refund after vendor already settled | Clawback from next settlement (§12.3) |
| Double partial refund attempt | Server cap (paid − refunded); UI + API both enforce |
| Refund currency | Always original payment currency |
| Chargeback vs platform refund race | Provider webhook for chargeback freezes further auto-refunds on that charge; admin resolves |
| Vendor-suspended with pending refunds | Refunds proceed (customer protection); vendor debt handled separately |
| Customer changes refund details mid-flight | Frozen at `APPROVED`; changes = new request |

---

## 15. Vendor Approval Model

### 15.1 States

`DRAFT → SUBMITTED → IN_REVIEW → APPROVED | REJECTED`; `APPROVED → SUSPENDED → APPROVED` (appeal/re-review).

### 15.2 Per-line capabilities

- VA-01 Approval is **per service line**: a vendor may be approved for `VEHICLE_RENTAL` only, or for `TOUR + TREK + AIR_TICKET`, etc. Publishing is blocked for non-approved lines (UI hidden + API 403).
- VA-02 Each line capability carries: status, approved date, expiry (if any), reviewer, decision note.
- VA-03 New line request on an existing account ⇒ new `SUBMITTED` cycle for that line only (existing lines unaffected).

### 15.3 Admin workflow

| Step | Behavior |
|---|---|
| Queue | SLA countdown (3 business days target), priority (launch-critical lines first), filterable |
| Review | Document checklist per line (config), business-registry cross-check (manual, e.g., PAN verification via official portal — human, not OCR), references/contact sanity |
| Decision | Approve (select lines) / Reject (mandatory reason, customer-facing summary) / Request more info (vendor notified; 7-day response window, else auto-close as REJECTED) |
| Effects | Approve: portal live, services publishable, payout account enabled. Suspend: new bookings blocked, in-flight bookings continue, notice + appeal path, immediate or scheduled |

### 15.4 Integrity rules

- VA-04 Manual review only in MVP (no auto-verification, GC-2). Document authenticity = human diligence + spot checks; contract includes misrepresentation termination + blacklist.
- VA-05 Reapplication after rejection: 30-day cooldown (configurable); each application is a new versioned record (immutable history).
- VA-06 Document expiry: expiry field where applicable; reminder at T-30/T-7 (MVP: notification to vendor + admin queue flag); auto-suspend on expiry `[V2]` (MVP: admin action).
- VA-07 Payout banking details are finance-scoped (FINANCE_ADMIN view); changes require re-verification (admin confirm) before use.
- VA-08 Vendor identity dedup: business registration number + business name matching (best-effort, fuzzy) flags potential duplicates for admin.

### 15.5 Edge cases

| Edge | Rule |
|---|---|
| Suspend one line of a multi-line vendor | Only that line blocked; others unaffected |
| Documents expire mid-peak-season | Grace period 7 days (admin-set) with daily flags |
| Vendor disputes suspension | Appeal → SUPER_ADMIN review, 5 business day target |
| Duplicate vendor (same business, new account) | Second account blocked on match; admin merges/keeps one |
| Payout details changed fraudulently | Change is inert until admin re-verification (VA-07) |

---

## 16. Customer Verification

### 16.1 Levels

| Level | Requires | Unlocks |
|---|---|---|
| `UNVERIFIED` (new) | — | Browse, guest quote submit |
| `EMAIL_VERIFIED` `[MVP baseline]` | Email OTP confirmation | Full account, instant booking, wishlist, reviews (on completion) |
| `PHONE_VERIFIED` `[V1.5]` | Phone OTP (E.164, intl codes) | Optional MFA, faster support verification, SMS channel |
| `CORPORATE_VERIFIED` | Org account + business docs + admin review | Corporate features (§24) |

### 16.2 Gates (MVP)

| Action | Minimum |
|---|---|
| Browse/search/detail | none |
| Quote request (guest) | valid contact (email or phone, no account) |
| Instant booking | account + `EMAIL_VERIFIED` + payment |
| Wishlist/compare persist | account |
| Review | account owning a `COMPLETED` eligible booking (§17) |
| Corporate booking | org roles + `CORPORATE_VERIFIED` |
| Support identity check | account credentials + email/phone confirmation |

### 16.3 Rules

- CV-01 Email canonicalization + dedup (one account per email; merge flow admin-only).
- CV-02 Phone stored E.164; country inferred but always overridable (GC-1).
- CV-03 Verification OTPs: rate-limited (max 3 per 15 min per identifier), 10-min expiry, one-time use, audited.
- CV-04 No invented identity providers in MVP. Google OAuth + phone/OTP login: `[V1.5]` (provider decision, see Dependencies).
- CV-05 Ban/suspend with reason + appeal via support; banned accounts keep data (retention) but lose access.
- CV-06 PII minimization: collect only what gates require; masked display (phone `+977 •••• 1234`, email `j***@dom`); access-scoped.
- CV-07 "Verified" badge on public profiles: only `EMAIL_VERIFIED`+ (honest label: "Verified email"); never imply identity-document verification we don't perform.

### 16.4 Edge cases

| Edge | Rule |
|---|---|
| Booker ≠ traveler (corporate/family) | Travelers added by booker; no per-traveler accounts (MVP) |
| Email change | Re-verification of new email; old address retains history |
| OTP spam / SIM farming | Rate limits + anomaly flag (velocity); manual unblock via support |
| International customer with no NP phone | Fully supported from day 1 (no NP-only validation) |
| Account email verified but card/wallet belongs to another | Accepted risk MVP (wallet login itself is a strong factor); flagged for V2 (provider 3DS-like signals where available) |

---

## 17. Reviews

### 17.1 Eligibility (strict — verified reviews only)

- RV-01 Only the account that owns a booking with status `COMPLETED` may review that booking's service item(s).
- RV-02 One review per (customer, service-item, booking-item). Multi-item custom trips ⇒ one review per item.
- RV-03 Window: 365 days after completion (configurable; D8). After window: no new review (extension admin-only, audited).
- RV-04 Cancelled/refunded bookings: no reviews (service-failure complaints route to disputes, §9/§13).
- RV-05 Vendors cannot review services of their own organization (enforced by ownership graph + role). Platform cannot seed reviews (GC-3) — **zero seed/fake reviews at launch; empty state shows "No reviews yet."**

### 17.2 Content model

- Overall rating 1–5 (integer). Sub-ratings (value/quality/communication/safety — line-configured set): `[V1.5]`.
- Text ≤ 2000 chars; tags from curated per-line vocabulary; photos ≤ 5 (validated MIME/size, private bucket until visible, alt text optional).
- No edit after submit (integrity); customer may **flag** for abuse (admin queue).

### 17.3 Moderation pipeline

`PENDING_MODERATION → VISIBLE | REJECTED`
- Auto-hold heuristics (MVP): profanity list, external links, near-duplicate text (basic similarity), PII patterns (phone/email in text).
- Admin actions: approve / reject (mandatory reason) / remove-visible (reason); all audited.
- Vendor replies: one per review, editable (change history kept), subject to same heuristics.

### 17.4 Aggregates & display

- Aggregate (average, count, 1–5 histogram) computed **only from VISIBLE reviews**, incrementally maintained, recomputable from source (integrity job `[V1.5]`).
- Display: "Verified purchase — completed booking required" note; vendor aggregate on detail pages + vendor profile.
- No pay-for-review, no review gating by vendor (terms + contract; violation ⇒ moderation removal + vendor case).

### 17.5 Edge cases

| Edge | Rule |
|---|---|
| Review after partial refund of item | Item completed ⇒ reviewable (policy CN-07/V1.5 nuance documented) |
| Review text contains another customer's PII | Heuristic hold + admin redact |
| Vendor reply after review rejected | Blocked (no replies on non-visible) |
| Photo contains other persons | Vendor/customer responsibility; takedown path via support (abuse flow) |
| Same customer, multiple bookings same service | Multiple verified reviews allowed (each booking distinct) — histogram reflects recurrence |

---

## 18. Notifications

### 18.1 Channels

| Channel | Version | Provider (decision) |
|---|---|---|
| In-app (web) | MVP | Built-in (notification center, unread count) |
| Email (transactional + non-transactional) | MVP | Provider to be selected (e.g., transactional email service) — Dependency C-3 |
| SMS (+977 first, intl later) | V1.5 | Provider decision (e.g., local aggregator) — Dependency C-4 |
| WhatsApp (business) | V1.5 | Official Business API via BSP — provider decision; **no unofficial API** |
| Push (PWA → app) | V2 | Web push MVP-optional; app push V2 |

### 18.2 Event catalog (MVP core set)

| Event | Recipient(s) | Channel |
|---|---|---|
| Account created / email verification code / reset code | Customer | Email (+in-app) |
| Vendor submitted / info requested / approved / rejected / suspended | Vendor (+admin ack) | Email + in-app |
| Quote request received | Vendor | Email + in-app (+admin if stale) |
| Offer submitted / revised / withdrawn | Customer | Email + in-app |
| Offer expired | Customer | Email + in-app |
| Payment pending (bank transfer) / payment link due | Customer (+admin) | Email + in-app |
| Payment succeeded / failed | Customer (+vendor on success) | Email + in-app |
| Booking confirmed (voucher + contacts) | Customer (+vendor) | Email + in-app |
| Booking cancelled (any actor) + refund created/processed/completed | Customer (+vendor/admin) | Email + in-app |
| Vendor decline after payment (fault) | Customer (+admin) | Email + in-app |
| Service start / completed | Customer (+vendor) | In-app (+email) |
| Review invitation | Customer | Email + in-app |
| Review posted / vendor reply | Customer (+vendor) | In-app (+email) |
| Dispute opened / decision | Customer, vendor | Email + in-app |
| SLA breach alerts (quote, confirm, ticket issuance) | Vendor (+admin) | In-app + email |
| Webhook/queue/health incidents | Admin | Email |
| Document expiry warnings (T-30/T-7) | Vendor (+admin) | In-app + email |
| Corporate: approval requested / decision | Approver, booker | In-app + email |

### 18.3 Infrastructure rules

- NF-01 Queue-based, at-least-once delivery with **idempotency key** (`event+entity+transition-version`); dedup store; retries with backoff; DLQ + admin visibility.
- NF-02 Bounce/complaint handling ⇒ suppression list (per channel); transactional legal notices excepted.
- NF-03 Preferences (MVP): per-category email on/off (non-transactional categories only); digest mode `[V1.5]`; quiet hours `[V1.5]`.
- NF-04 Rate limits per user (e.g., ≤ 20 emails/hour; burst events coalesced).
- NF-05 Locale: English MVP; Nepali templates `[V1.5]` (human-authored).
- NF-06 Templates are versioned, admin-previewable (SUPPORT_ADMIN), with merge fields from typed payloads (no user-input HTML injection).
- NF-07 Every notification event is logged (sent/failed/suppressed + reason) — visible to support for the affected booking.

### 18.4 Edge cases

| Edge | Rule |
|---|---|
| Customer preference off + critical state change | Transactional state changes always delivered (policy class, not preference class) |
| Vendor stale quote (no offer 24h) | Escalation notification to trip desk; customer reassurance at 24h (no spam before) |
| Duplicate webhook-driven events | Idempotency key suppresses duplicate notification |
| International recipient, local SMS provider | Fallback to email + in-app (SMS intl `[V1.5]`) |
| Vendor email bounce | Account flagged; phone/in-app emphasized; 2 consecutive bounces ⇒ vendor alert to complete contact update |

---

## 19. Payments

### 19.1 Principles (binding)

- PY-01 **Backend-authoritative:** booking reaches `PAID` only via (a) provider webhook with valid signature + idempotent processing, or (b) verified provider status query. No client input, no admin "mark paid" without a provider/bank reference (bank-transfer verification is the controlled exception, §19.4).
- PY-02 Amount integrity: amount, currency, and descriptor computed server-side; provider session created with the same amount; mismatches reject the payment.
- PY-03 No raw card data ever touches platform systems: redirect/tokenized flows only; target PCI scope **SAQ-A**; 3DS where the provider supports it.
- PY-04 Immutable ledger: every payment, refund, commission, settlement, adjustment = ledger entries (double-entry-ish pairs), append-only, hash-chained `[V1.5]` (MVP: append-only + audit).
- PY-05 Webhooks: signature verification, replay protection (seen-event store, 48h), out-of-order tolerance (state machine guards), dead-letter + admin alert.
- PY-06 Idempotency keys on all payment commands (create intent, refund, verify).

### 19.2 Entities

`PaymentMethodProfile` (user ↔ provider token reference, method type), `PaymentIntent` (booking, amount, currency, status `CREATED→PROCESSING→SUCCEEDED|FAILED|EXPIRED|CANCELED`), `Charge` (provider ref, FX details), `Refund` (§14), `Payout` (vendor settlement), `LedgerEntry` (account: `customer_receivable, vendor_payable, platform_commission, tax_collected, refund_asset, settlement` …).

### 19.3 Payment methods (MVP target — final at provider selection, Dependencies C-1/C-2)

| Method | Audience | Flow | Status |
|---|---|---|---|
| Domestic wallets (eSewa, Khalti — candidates) | NP customers | Provider redirect/QR | MVP (verify sandbox) |
| Domestic cards via NCH ecosystem (ConnectIPS/ConnectIPSe — candidates) | NP customers | Provider redirect/3DS | MVP (verify sandbox) |
| International cards | Intl customers | Partner acquirer / foreign-entity route (**Decision D2 — see risk R-2**) | MVP **if** path validated; else launch gap surfaced honestly |
| Bank transfer (manual) | All (corporate esp.) | Customer transfers with booking reference; FINANCE_ADMIN verifies (reference + amount match) → `SUCCEEDED`; 48h expiry → auto-cancel | MVP |
| Vendor-collected | Limited: self-drive deposits (MVP exception §28), then general `[V1.5]` | Vendor attests (amount/method/time on booking); sampled audit; disputes resolved via cases | MVP-narrow → V1.5 |

### 19.4 Flow & failure handling

1. Checkout → server creates `PaymentIntent` (amount locked) → provider session URL.
2. Customer completes at provider → webhook → verify → `SUCCEEDED` → booking `PAID` → vendor notify.
3. Failure: user retry ×3 within 15-min session (new intents, old canceled); session expiry ⇒ booking `CANCELLED` (PAYMENT_EXPIRED), draft inputs preserved for 1h.
4. Webhook delay > 2 min ⇒ platform status-query fallback (provider API) — no client-initiated "did it work?" trust.
5. Bank transfer: status `PENDING_MANUAL` with countdown; admin verify (both fields matched) or reject (auto-cancel + notification).
6. Provider outage: intents queued/retried; bookings remain `AWAITING_PAYMENT` with countdown; support runbook; customer may switch methods within session.

### 19.5 Multi-currency & FX

- NPR-denominated charge for domestic methods. International cards: charge in NPR **or** card currency per provider capability — if card currency, platform stores provider FX rate applied (shown at checkout: "you will be charged ≈ X in card currency at provider FX rate; exact amount set by bank").
- Display conversion (≈) is separate from charge FX (PY-07: two distinct concepts, both labeled).

### 19.6 Additional models

- Deposit + balance (2 linked intents, line policy): `[V1.5]`.
- Consolidated payment across trip group: `[V1.5]`.
- Reconciliation: daily statement-vs-ledger report + variance queue: `[V1.5 tool; MVP manual]`.
- Fraud heuristics (velocity, amount anomalies, method/address mismatch signals → manual review queue): `[V1.5]`.
- Chargeback webhooks (provider) ⇒ case + freeze further refunds on that charge: MVP (provider-dependent).

### 19.7 Edge cases

| Edge | Rule |
|---|---|
| Webhook replay after 48h | Rejected by seen-store; logged |
| Provider reports success, ledger mismatch (amount) | Booking stays AWAITING_PAYMENT; admin + provider escalation; no partial credit |
| Customer paid, provider auto-refund (their side) before webhook | Webhook refund event handled → our refund record (RF consistency) |
| Bank transfer with split payments | Reject (single reference rule, documented in UI) |
| Duplicate bank reference | Second verify attempt blocked (idempotent) |
| Payment succeeds after booking auto-cancelled (race) | Refund auto-initiated (admin-visible) — customer never owes |
| Card charged in USD, platform in NPR | Ledger stores both (charged amount/currency + NPR equivalent at provider rate) |

---

## 20. Search `[MVP]`

### 20.1 Purpose & users

- Purpose: let any visitor find bookable/quoteable services and destinations fast, with honest availability signals.
- Users: all customer personas; vendors (demand insights `[V1.5]`); admins (catalog health).

### 20.2 Inputs / outputs

- Inputs: free text (keywords), line/category, destination (geo node or free text), dates (from/to), party, price band, rating min, sort, page cursor.
- Outputs: ranked list (title, vendor, line, destination, price-from or "on request", rating (verified), duration, badges: Instant/Quote, Free-cancel), facet counts, total count, query-echoed URL.

### 20.3 Mechanics (MVP — self-contained, no external SaaS, GC-2)

- SE-01 PostgreSQL full-text search: generated `tsvector` (title weight A, tags B, description C) + `pg_trgm` similarity for typo/substring tolerance.
- SE-02 Structured filters applied as indexed predicates (§21); facets = distinct-value counts over the filtered set (Redis-cached, TTL 5 min, invalidated on publish/suspend).
- SE-03 Ranking (MVP): relevance (FTS score) + recency + review-weighted tie-break; "price" and "rating" sorts override. Availability-aware ranking (date-fit first) `[V1.5]`.
- SE-04 Date handling: instant-capable services filter by **published** capacity for the selected dates; quote-only services are never excluded by date (labeled "on request").
- SE-05 Performance: p95 < 300 ms server-side at MVP scale; result pages SSG/ISR with on-demand revalidation (SEO + speed).
- SE-06 Languages: English index MVP; Nepali-script search + multilingual content `[V2]` (tokenizer/config decision).
- SE-07 No semantic/AI search in MVP `[V2: embedding-based optional, provider-dependent]`.

### 20.4 Business rules

- SE-08 Only `PUBLISHED` + vendor-approved services are searchable (index = published set).
- SE-09 Suspended/retired removed from index within 60 s (event-driven).
- SE-10 Search API returns stable, versioned DTOs; web and future apps share the contract.
- SE-11 Personalization (recent searches, personalized ranks) `[V1.5]`; "no PII in search logs beyond pseudonymous session id."

### 20.5 Edge cases

| Edge | Rule |
|---|---|
| Query spans categories ("hotel pokhara" on trek page) | Global search across lines; category pinned in URL |
| No results | Suggested destinations/typos + popular fallback (never fake results) |
| Date filter excludes all of a popular service | Show "N dates available this month" hint `[V1.5]`; MVP: "No availability — request quote" CTA |
| Vendor mass-publishes (index spike) | Batch reindex with rate limit; stale-while-revalidate |
| Long tail Nepali spellings | Trigram + admin alias table (e.g., "phewa" ↔ "Phewa Lake") |

---

## 21. Filters

### 21.1 Global filters `[MVP]`

Destination (geo tree: country → state/province → district → city; multi-select), dates, price range (display currency, applied in NPR equivalent), rating min (2.5/3.5/4+), mode (`INSTANT | QUOTE`), free cancellation, duration band, language (vendor-declared), sort.

### 21.2 Per-line filters `[MVP]`

| Line | Filters |
|---|---|
| Hotel | star band (vendor-declared), meal plan, room capacity (adults/children), bed type, amenities (Wi-Fi, pool, parking, breakfast — vendor-declared) |
| Vehicle | vehicle class (sedan/SUV/jeep/bus…), seats, fuel, with-driver/self-drive, AC |
| Transfer | origin/destination (route endpoints incl. airports), time-of-day band, vehicle class, private |
| Tour/Trek | duration (days/nights), difficulty (trek 1–5), group size fit, permits included, season tag, departure type (fixed/custom), private/group |
| Package/Family/Corporate | duration, budget band (displayed "from" only), style tags (family, adventure, cultural) |
| Air ticket | route, dates, direction (one-way/round), cabin preference, pax |

### 21.3 UX & state

- FA-01 Mobile: bottom-sheet filters + active-filter chips; desktop: left rail. All state in URL (shareable/bookmarkable), no login required.
- FA-02 Facets are dynamic (only values present in current result set) with counts.
- FA-03 "Reset all"; saved filter sets per session; saved-to-account filter presets `[V1.5]`.
- FA-04 Price filter uses display currency in UI but is converted server-side (PR-02); boundary rounding customer-favorable.

### 21.4 Edge cases

| Edge | Rule |
|---|---|
| Filter value vendor-declared but stale | Displayed "as vendor-reported"; admin curation fixes (content ops) |
| Empty result after filters | Progressive-relaxation suggestions (drop date → then price band), explicit, not automatic |
| Multi-destination (itinerary) search | MVP: per-destination results; itinerary-aware ranking `[V1.5]` |
| Party size 0 children edge | Validated (children ≥ 0, adults ≥ 1 per line rules) |

---

## 22. Wishlist & Compare `[MVP core, V1.5 extensions]`

### 22.1 Purpose / users

- Purpose: defer-and-return purchase path; compare shortlists. Users: all personas (P1/P7 heavy).

### 22.2 Spec

| Item | MVP | V1.5 |
|---|---|---|
| Wishlist (auth) | Add/remove, order, cap 200, cross-device | Notes, shareable read-only expiring link |
| Guest wishlist | Session-only, merge-on-login | — |
| Price-change alert | — | On vendor price drop ≥ threshold, per-item opt-in (email) |
| Compare | ≤4 items, per-line attribute table, side-by-side, "book" CTA | Print/share, availability check |
| Cleanup | Auto-hide suspended/retired items (marked unavailable) | Purge job |

### 22.3 Rules & edge cases

- WL-01 Only published services wishlistable; item snapshots (price shown = current at view, labeled "from/on request" correctly).
- WL-02 Shared links contain no PII; owner-controlled expiry (default 7 days) `[V1.5]`.
- WL-03 Vendor price change while in wishlist ⇒ UI shows current price + "changed" flag; alert only if opted in (V1.5).
- Edge: vendor suspended ⇒ item "unavailable" + similar-suggestions; compare with mixed lines ⇒ common-attribute-only table; wishlist export `[V1.5]`.

---

## 23. Custom Trip / Build-Your-Trip `[MVP — trip-desk-assisted]`

### 23.1 Purpose / users

- Purpose: one-stop multi-component itineraries (flights, hotels, transfers, tours, vehicles) across vendors, with a single consolidated offer and transparent per-item pricing.
- Users: P2, P5, P6, P7, P8 (international & group customers most).

### 23.2 Flow (MVP)

1. **Wizard:** destination(s), dates, party, budget (guidance), components to include (checkboxes + free-text "anything else").
2. **Per component:** choose from catalog (instant-capable items lock price with the 15-min rule while composing; quote items recorded as "by request") OR describe (text + constraints).
3. **Submit** ⇒ `CUSTOM` request: instant-capable components pre-priced; quote components routed to eligible vendors (line-capability + geo + date match). **Trip desk (ops) coordinates** vendor offers, may manually add preferred vendors; customer sees one consolidated offer view.
4. **Offers:** each quote component gets versioned offers (≤3 revisions each); consolidated total updates live; whole-trip offer validity 72h.
5. **Acceptance:** customer accepts (whole or per-item before payment) ⇒ one booking **per vendor** under the trip group ⇒ pay per booking (MVP sequential) ⇒ per-vendor confirmations ⇒ consolidated itinerary + vouchers.
6. **Changes:** date/party change before all items confirmed ⇒ re-quote affected items (unaccepted offers invalidated); after confirmations begin ⇒ per-booking modification path (§10/§13).

### 23.3 Business rules

- CT-01 Human-in-loop (trip desk) is **required in MVP** — no fully automated multi-vendor orchestration (honest capability, GC-2). Automation `[V2]`.
- CT-02 Mixed modes allowed; instant items in a custom trip remain pay-first and can be **removed** (not "held") before the customer accepts the whole; removal releases their locks.
- CT-03 A declined/failed quote component does **not** auto-cancel accepted siblings: customer chooses (replace / continue without / cancel all). Trip desk mediates replacements.
- CT-04 Budget is guidance only (no hard block); total always itemized; taxes included per §11.3.
- CT-05 One vendor holding multiple components ⇒ single booking (no duplicate vendor confirmations).
- CT-06 Pricing integrity: any input change that affects a component invalidates that component's locked price/offer (explicit re-confirm).
- CT-07 Capacity plan: trip desk staffing (min 1 ops, peak 2) is a launch dependency (C-11).
- CT-08 Custom-trip SLA: first consolidated offer ≤ 48h (target); quote components ≤ 24h vendor response (§8 SLA).

### 23.4 Edge cases

| Edge | Rule |
|---|---|
| Vendor conflict of interest (vendor offers two components) | Allowed (CT-05); disclosed in breakdown |
| Customer abandons wizard | Draft 7-day expiry; resume link via email `[V1.5]` |
| Party size changes post-acceptance | Affects per-person items ⇒ re-quote (price delta shown) |
| Two components same vendor, one confirmed, other declined | Independent outcomes; customer notified per item |
| FX display for intl customer | All ≈ labels; NPR exact everywhere |
| Impossible dates (past) | Wizard validation (from ≥ today) |
| Vendor goes silent | 24h nudge → 48h trip-desk manual sourcing → customer notified with ETA |

---

## 24. Corporate Travel

### 24.1 Scope split

| Capability | Version |
|---|---|
| Org account, roles (OWNER / APPROVER / BOOKER / VIEWER), member management | MVP |
| Approval workflow (booking requires approval before payment) | MVP |
| Spend policy (per-traveler caps per line per month; class caps; advance-booking window) | MVP (basic rules) |
| Consolidated monthly invoice + org payment methods | V1.5 (MVP: per-booking payment + monthly statement CSV) |
| Traveler expense reports, dashboards, SSO, preferred vendors, dedicated AM | V2 |

### 24.2 Rules

- CO-01 Org must be `CORPORATE_VERIFIED` (business docs + admin review) before booking capabilities.
- CO-02 Approval matrix (org-configurable): always / above threshold / per-traveler; approver sees policy fit (caps, class) + cost; decide ≤ 24h SLA (reminders); rejection requires reason.
- CO-03 **Payment only after approval** (hard rule, server-enforced).
- CO-04 Cap breach ⇒ blocked with explanation (owner override allowed, audited).
- CO-05 Multi-traveler bookings: traveler list + primary booker; bookings persist after member removal (historical access to org).
- CO-06 Invoicing: e-invoice PDF per booking (MVP); monthly consolidated (V1.5); bank transfer / org card as org methods (V1.5); expense CSV export by traveler/date/line (MVP).
- CO-07 Corporate tour services (group outbound) use the standard package engine with group attributes + dedicated handling flags.
- CO-08 Org PII isolation: members see only own + org-shared bookings; no cross-org data.

### 24.3 Edge cases

| Edge | Rule |
|---|---|
| Approver = booker (self-approval) | Config option "require second approver for self-bookings" (default on) |
| Traveler departs org mid-booking | Booking unaffected; future approvals stop |
| Cap reset timing | Calendar month in org timezone |
| Approved booking, price changes at payment | Re-approval if delta > threshold (org-config, default 10%) |
| Org card declined | Booker notified; re-approval not required (same price) |

---

## 25. AI Travel Planner

### 25.1 Phasing & capability honesty

| Version | What exists |
|---|---|
| MVP | **No LLM.** Build-Your-Trip (§23) + curated content + rule-based suggestions is the planner. |
| V1.5 | Rule-based "smart suggestions": popular-combo ranking, budget-fit scoring, similar-trip discovery — all computed from catalog data (no model calls). |
| V2 | LLM-assisted planner (chat) — **conditional on provider selection** (Dependency C-9). No invented capabilities (GC-2): if no acceptable provider, feature defers. |
| FUT | Agentic booking (autonomous multi-step with payments) — separate PRD, requires deeper trust/audit work. |

### 25.2 V2 specification (when activated)

- AI-01 Grounding: the model may only cite **live catalog data** via internal search/availability APIs (function calls). It must state "price on request" when no published price exists. **Fabricated prices, availability, or schedules = blocking defect.**
- AI-02 Output contract: structured itinerary draft (JSON) rendered in the UI → editable → maps into Build-Your-Trip cart → normal quote/payment/confirmation flows. The AI never books or takes payments directly.
- AI-03 Guardrails: input PII redaction (passport/phone/card patterns → masked), catalog-content sanitization (anti prompt-injection), output validation (schema + price/availability cross-check), safety (no medical/legal/visa advice; standard disclaimers), token/cost budget per session with hard stop, rate limits.
- AI-04 Privacy: user data used only for the session unless explicit consent; no training on user data; retention ≤ 30 days (configurable); logged for quality (anonymized).
- AI-05 Fallback: any failure ⇒ handoff to trip desk with full context (one click).
- AI-06 Evaluation: offline eval set (golden itineraries) before enable; online A/B on suggestion CTR + conversion; human spot-audit 5% of sessions initially.

### 25.3 Edge cases

| Edge | Rule |
|---|---|
| Hallucinated departure date | Availability cross-check rejects; model re-asks |
| User pastes passport/OTP | Redaction + warning |
| Adversarial prompt in chat | System-prompt isolation + output filters; session can be terminated |
| Cost runaway | Hard token/turn budget; polite stop + handoff |
| Non-English query (Nepali) | V2: multilingual model capability required (provider gate) |

---

## 26. Air Ticketing

### 26.1 Model (MVP) — quote-only, agency-fulfilled

- AT-01 **No live GDS/NDC/airline inventory in MVP** (GC-2). Air ticketing is a `QUOTE`-only line fulfilled by licensed travel-agency vendors (V-6).
- AT-02 UI must never imply live availability or live fares. Reference "from" prices may be published **by the agency vendor** with as-of date + label "indicative, published by vendor."

### 26.2 Flow (detailed)

1. Inputs: origin/destination (MVP: curated common routes incl. NP domestic airports — KTM, PKR, BWA, BIR, HMT, KWY, JGA, SKH — plus common international destinations from Nepal; free IATA input `[V1.5]`), dates, pax (name, DOB, nationality; **passport number for international — masked display, encrypted, access-scoped**), cabin preference, baggage preference, contact.
2. Quote request → agency responds ≤ 12h target (air SLA; §8) with fare options (class, baggage, refundability flag, total, fare basis summary, validity 24h).
3. Acceptance ⇒ `AWAITING_PAYMENT` ⇒ payment (webhook) ⇒ agency issues ticket ≤ 24h ⇒ uploads: PNR, e-ticket PDF, fare/payment details ⇒ `CONFIRMED` with documents in-app.
4. Changes/cancellations: customer request ⇒ agency processes per airline rules ⇒ outcome (new PNR / refund amount + fees / denial) reported in-app ⇒ platform records; refunds via §14 (vendor-mediated timeline 5–20 business days typical, agency-reported, never platform-fabricated).
5. Post-issuance schedule changes: agency updates ticket info; platform notifies customer.

### 26.3 Business rules

- AT-03 Pax name validation: exact-match-with-ID confirmation step pre-payment (airline name rules); mismatch ⇒ vendor flag pre-issuance.
- AT-04 PII minimization: passport stored encrypted, displayed as `••••1234`, access scoped to (booking owner, vendor, support-with-case); retention after fulfillment per data policy (default 24 months, legal review); no passport in logs (masked).
- AT-05 Commission hold 30 days (CM-03); chargeback/dispute exposure high ⇒ contract terms stricter for air vendors.
- AT-06 Multi-segment (domestic+intl connections) allowed via agency offer (MVP: one-way/round-trip; multi-city `[V1.5]`).
- AT-07 No platform-side reissue/refund automation — all airline-rule logic lives at the agency (platform is router + record + status).
- AT-08 Infant/lap-child, seats, meals: as agency offer options (declared in offer, not platform-invented).

### 26.4 V2+ — live inventory (separate PRD when scoped)

Provider-dependent GDS/NDC/airline-direct integration: published fares with conditions, instant booking, automated changes/refunds per fare rules. **Out of MVP scope by design.**

### 26.5 Edge cases

| Edge | Rule |
|---|---|
| Fare changes between quote and payment | Offer version control; acceptance outside validity ⇒ re-quote (no silent price drift) |
| Payment succeeded, issuance fails | Full refund + case + customer alternates (trip desk) |
| Name misspoken at input | Pre-issuance vendor check; post-issuance ⇒ airline reissue fees (agency, itemized) |
| Duplicate PNR across bookings | Vendor integrity check at upload (platform validates PNR format + cross-booking dup) |
| Customer no-show | Airline rules via agency; platform records outcome |
| Visa-required destination | Advisory content + agency confirmation field in offer (never platform visa advice) |

---

## 27. Hotel & Resort Booking

### 27.1 Model (MVP)

- HB-01 **Direct hotel/resort vendors only** (no OTA/channel-manager feeds — none invented, GC-2). Feed integration `[FUT, provider-dependent]`.
- HB-02 Entity model: `Property` (geo/address, check-in/out times, policies, contact) → `RoomType` (capacity, beds, size, amenities vendor-declared) → `RatePlan` (per-night price, min stay, meal plan, cancellation policy, tax-inclusion flag, capacity) → `Availability` (per room-type, per-day **counts**).

### 27.2 Flow

1. Search (property/destination + dates + party) ⇒ properties with **published** availability for dates (else "check availability" quote CTA).
2. Select room + rate plan + add-ons (breakfast if separate, airport transfer link, late checkout if vendor offers) ⇒ itemized quote (nights × rate + surcharges + taxes) ⇒ book (pay-first; deposit+balance `[V1.5]`) ⇒ vendor confirms (auto if policy) ⇒ confirmation with check-in details + contact + voucher.
3. Stay: auto `IN_PROGRESS` at check-in date (vendor overridable) ⇒ auto `COMPLETED` at checkout + 24h grace (or vendor-confirmed early).
4. Review eligibility at completion.

### 27.3 Business rules

- HB-03 Date-overlap validation with row-level locking; **no overbooking** — published count = sellable count (GC-3). Oversell path = vendor-fault (§10.5).
- HB-04 No-show: vendor rate-plan policy (default NON_REFUNDABLE); recorded.
- HB-05 Modification (MVP): date change = new booking + cancellation of old (policy applied to old); in-place modify `[V1.5]`.
- HB-06 Extra guest fees: per rate plan (vendor-set) — itemized.
- HB-07 Taxes: jurisdiction-configured (Nepal example: VAT 13% where applicable) — itemized, vendor-declared inclusion flag.
- HB-08 Group/long-stay (> 8 rooms or > 30 nights) ⇒ auto-quote mode (no invented group inventory).
- HB-09 Same-day booking: vendor policy flag (allow / cutoff hour).
- HB-10 International properties: same engine `[V2]` (settlement currency, local taxes) — GC-1 ready.

### 27.4 Edge cases

| Edge | Rule |
|---|---|
| Check-in date in the past | Blocked (from = today or vendor cutoff) |
| Vendor suspends mid-booking (PAID, unconfirmed) | Full refund + case (vendor-fault) |
| Rate plan deleted after booking | Snapshot retained on booking (price/policy immutable per PR-08) |
| Long-stay price gap (vendor adds 30-night rate later) | New bookings only |
| Child in adult-only property | Vendor age policy flag ⇒ blocked/quote |
| Two bookings same room type overlapping | Locking prevents; race ⇒ second customer offered next availability or quote |

---

## 28. Vehicle Rental Booking

### 28.1 Model (MVP)

- VB-01 Vendors: vehicle operators (V-1). Entity: `Fleet` → `Vehicle` (make/model, class, seats, fuel, year, features, photos, plate — **masked display**) → per-vehicle availability (daily slots; hourly `[V1.5]`) → `RatePlan` (per-day rate, KM limit, overtime rate, fuel policy, driver allowance, tolls policy, min rental hours).
- VB-02 Modes: **with-driver** (default; fully platform-paid) and **self-drive** (policy flag; deposit **vendor-collected at handover** — the single MVP exception to platform-collected payments, documented & audited: amount, method, time recorded on booking; sampled audit by FINANCE_ADMIN).

### 28.2 Flow

1. Search (class, dates, pickup location) ⇒ vehicles (or "any of class X" — vendor assigns specific vehicle at confirmation, disclosed).
2. Quote: pickup/return date-time, locations, estimated KM, options (extra driver, child seat) ⇒ itemized total (days × rate + surcharges + taxes) ⇒ book (pay-first) ⇒ vendor confirms (vehicle + driver details: name/phone — **vendor-reported**) ⇒ delivery day: vendor marks `IN_PROGRESS` (handover) ⇒ return: vendor marks `COMPLETED` (returns details; KM actual, overtime/fuel per plan).
3. Self-drive adds: license-copy exchange at handover (vendor-managed; platform stores masked reference only), deposit recorded as vendor-collected (VB-02).

### 28.3 Business rules

- VB-03 Rental block = 24h from pickup (or vendor min-hours policy); calendar-day approximation forbidden.
- VB-04 KM overage & overtime: vendor-reported at return; customer dispute window 48h (case-based, evidence: vendor log).
- VB-05 Damage/deposit claims: vendor-managed process, documented on booking; disputes via cases (platform mediates, no liability adjudication automation).
- VB-06 Cross-border (e.g., to India): vendor policy flag ⇒ quote mode (permits/insurance add-ons declared by vendor).
- VB-07 Vehicle breakdown/accident mid-rental: vendor replacement SLA (target 4h, vendor-attested) or pro-rata refund of undelivered days (admin-verified).
- VB-08 Peak/holiday date surcharges: vendor calendar (§11.3).
- VB-09 Vehicle data freshness: vendors must keep fleet updated; admin curation spot-checks (content ops).

### 28.4 Edge cases

| Edge | Rule |
|---|---|
| Late return | Overtime rate applied (vendor report); late > 24h ⇒ new rental day (policy) |
| Vendor can't provide booked vehicle (fault) | Alternate ≥ same class offered; customer accepts or full refund + case |
| Deposit refund delay (self-drive) | Vendor SLA 72h; platform tracks status; disputes via cases |
| Holiday week sold out | Next-available suggestion + waitlist `[V1.5]` |
| Partial-day request | Vendor hourly policy (else min-block applies, shown before booking) |

---

## 29. Transfer Booking

### 29.1 Model (MVP)

- TF-01 Scope: airport ⇄ city (KTM primary; PKR, BWA, BIR, HMT, KWY, JGA, SKH as seed geo), intercity point-to-point, local/hotel-attraction on-demand. Public-ticketed buses: **out of scope** (charter/private model only).
- TF-02 Entity: `Route` (origin, destination, type, estimated duration/distance) → `TransferService` (route + vehicle class + mode: `ON_DEMAND` (customer picks date + time window) or `SCHEDULED` (fixed departures = dated services with capacity)) → `RatePlan` (per-vehicle, wait-time allowance, overtime/wait rate, child seat add-on, luggage allowance).

### 29.2 Flow

1. Route + date + time window (±30 min) + pax + vehicle class + (optional) flight number (informational — **no flight-tracking API in MVP**; `[V1.5]` provider-dependent status display) + add-ons (child seat, extra luggage) ⇒ availability (published) or quote ⇒ pay ⇒ confirm (meeting point, vendor/driver contact) ⇒ day-of: vendor marks `IN_PROGRESS` at pickup ⇒ auto `COMPLETED` at window end + 30 min grace.
2. Scheduled mode: pick a departure (capacity per departure, decrement on booking).

### 29.3 Business rules

- TF-03 Late flight: free wait = policy allowance (default 45 min, vendor-set) then hourly wait rate (declared pre-booking). Flight number is for vendor convenience only — vendor monitors (no platform data feed, GC-2).
- TF-04 No-show (customer): vendor policy (default NON_REFUNDABLE); vehicle released. No-show (vendor): vendor-fault path (§10.5) + metrics.
- TF-05 Rebooking: free ≥ 24h before (vendor policy); closer ⇒ vendor fee or quote.
- TF-06 Child seat: requested at booking; vendor confirms (limited stock ⇒ "vendor to confirm" state, no invented inventory).
- TF-07 Shared-seat product (popular intercity routes) `[V1.5]` (per-seat pricing, seat inventory).
- TF-08 Airport operations: terminal/meeting-point SOPs are vendor content (displayed on confirmation).

### 29.4 Edge cases

| Edge | Rule |
|---|---|
| Airport closure / curfew | Admin broadcast → affected bookings auto-cancelled FREE (system actor) + refunds |
| Vehicle failure day-of | Vendor replacement ≤ 45 min target (vendor-attested); missed ⇒ vendor-fault path |
| Wrong meeting point | Vendor SOP + support case; customer location share `[V1.5]` |
| Timezone confusion | All displayed local (Asia/Katmandu MVP); multi-TZ `[V2]` with explicit tz labels |
| Luggage over allowance | Vendor surcharge declared pre-booking (or quote) |

---

## 30. Tour & Trekking Booking

### 30.1 Model (MVP)

- TR-01 Types: `DAY_TOUR`, `MULTI_DAY_TOUR`, `TREK`, plus `FAMILY_TOUR` / `CORPORATE_TOUR` / `PACKAGE` (merchandising flags, §6.2).
- TR-02 Entity: `TourService` (itinerary day-by-day, inclusions/exclusions **structured lists**, duration, difficulty (trek 1–5 + descriptor), group min/max, languages, meeting point, season tags (vendor-declared "best season"), accommodation type (trek: teahouse/lodge/star), guide/porter configuration, permits line items (included/excluded), single supplement, per-person pricing with child bands where relevant) → departure model: `FIXED_DATE` (dated departures with seat counts) or `CUSTOM` (on-request private/group).
- TR-03 Permits (e.g., trekking information management, national park entries, restricted-area permits where applicable): **vendor-managed and priced**; platform displays structured permit info + collects minimal data (§30.4). Restricted-area lead time ⇒ quote mode with stated processing timeline (vendor-set).

### 30.2 Flow

Fixed departure: pick date (seat availability published) ⇒ party (child bands) ⇒ add-ons (porter, extra guide, hotel upgrade where vendor offers) ⇒ itemized per-person total ⇒ pay ⇒ confirm (meeting details, packing list (content), emergency contact, guide name if assigned — vendor-reported) ⇒ day 1 auto `IN_PROGRESS` (or vendor) ⇒ final day + grace auto `COMPLETED` ⇒ review.

Custom departure: quote request (dates, group size, private/group, needs text) ⇒ vendor offer (≤3 revisions, 48h validity) ⇒ accept ⇒ pay ⇒ confirm ⇒ same lifecycle.

### 30.3 Business rules

- TR-04 **Go-date guarantee:** if vendor cannot run a sold fixed departure (min group not met), options in order: consolidation with other departures (customer consent), vendor-honored full price, or **full refund** (customer choice) — never silent cancellation. Vendor metrics impacted.
- TR-05 Safety stop (weather/disaster/vendor safety call): vendor may stop a running tour ⇒ `CANCELLED (SAFETY)` mid-service ⇒ refund of undelivered portion (auto where per-day rates published; else admin) + documented incident.
- TR-06 Mid-trek personal exit: vendor-determined partial refund per published per-day schedule where available; always admin-visible; customer receipt records.
- TR-07 Age/fitness: vendor minimums enforced (blocking validation); disclaimers displayed; platform gives no medical advice (content rules).
- TR-08 Insurance: advisory content + "bring your own" rule in confirmations; partner insurance product `[V1.5]` (provider-dependent, underwriter-owned — never platform-underwritten).
- TR-09 Guide qualifications: vendor-declared, displayed "as vendor-reported"; contract requires truthfulness.

### 30.4 PII for permits (rule)

- TD-01 Platform collects: passport **number** (encrypted, masked display), nationality, DOB — for permit purposes where vendor includes permits.
- TD-02 Full document upload (passport scans etc.) is exchanged via **expiring, logged, access-scoped share links** directly to the vendor portal — not stored long-term in platform media.
- TD-03 Retention after fulfillment per data policy (default 24 months, legal review); deletion workflow `[V1.5]`.

### 30.5 Edge cases

| Edge | Rule |
|---|---|
| Season closure (route inaccessible) | Vendor seasonal availability calendar; closed period ⇒ service hidden or quote-only |
| Solo traveler group min | Single supplement or auto-join rule (vendor-set) |
| Permits not obtained (vendor fault) | Vendor-fault path: refund + case |
| Restricted-area quota unavailable (govt) | Force-major: full refund, no penalty, documented |
| Group split mid-trek | Per-group continuation; billing adjustments manual (admin) |
| Weather-caused schedule slip (no stop) | Itinerary reordering by vendor; customer notified; no price change without consent |

---

## 31. Reports & Dashboards

### 31.1 Vendor reports `[MVP]`

| Report | Contents | Access |
|---|---|---|
| Overview | Bookings by status, revenue (gross/net), upcoming services, response SLA stats, review summary (verified) | Vendor org |
| Bookings detail | Filters (date/line/status), CSV export | Vendor org |
| Earnings | Settlement cycles, per-booking commission, holds, payouts history | Vendor org |
| Performance | Top services, cancellation/refund rate (own), confirmation times | Vendor org |
| Availability gaps `[V1.5]` | Unpublished dates for popular routes | Vendor org |

### 31.2 Admin reports `[MVP]`

| Report | Contents |
|---|---|
| Revenue | GMV, net revenue, commission by line/destination/vendor/month; FX-normalized NPR |
| Funnel | Search→detail→booking-start, quote→offer→accept→paid, payment success rate, abandon points |
| Bookings | Status pipeline, SLA breaches, by line/destination/vendor, seasonality |
| Vendors | Onboarding funnel (registered→submitted→approved, time-in-stage), performance, holds |
| Refunds & disputes | Refund rate by reason, dispute queue aging, outcomes |
| Customers | New/active accounts, corporate vs individual, repeat booking rate |
| System | Webhook health, queue depth, failed jobs, search latency |
| Exports | CSV (MVP); XLSX + scheduled email delivery `[V1.5]`; data warehouse `[V2]` |

### 31.3 Rules

- RP-01 Server-side computation only; point-in-time (no retro mutation of historical figures; corrections = new entries).
- RP-02 All timestamps stored UTC; reports rendered in viewer timezone (admin setting, default Asia/Katmandu).
- RP-03 Export audit (who, when, filters, row count) — mandatory.
- RP-04 Permission-gated; PII masked in exports (default views pseudonymous).
- RP-05 No external BI tooling in MVP (GC-2); warehouse decision `[V2]` (Dependency).
- RP-06 Multi-currency: report currency NPR (MVP); settlement-currency detail available.

### 31.4 Edge cases

| Edge | Rule |
|---|---|
| Partial month comparison | "Like-for-like days" toggle |
| Deleted/suspended vendor | Data retained, flagged; historical reports unaffected |
| FX rate change mid-cycle | Cycle uses rate-at-event; report shows both |
| Export of 100k+ rows | Async export + download link (7-day expiry), never synchronous HTTP |

---

## 32. SEO

### 32.1 Page inventory

| Page type | Example URL pattern | Version |
|---|---|---|
| Home | `/` | MVP |
| Line/category hubs | `/tours`, `/trekking`, `/hotels`, `/vehicle-rental`, `/transfers`, `/packages` | MVP |
| Destination hubs | `/destination/pokhara` (geo-linked) | MVP |
| Service detail (all lines) | `/tours/{slug}`, `/trekking/{slug}`, `/hotels/{slug}`, `/vehicle-rental/{slug}`, `/transfers/{slug}`, `/packages/{slug}`, `/flights/{route-slug}` | MVP |
| Travel guides / route guides | `/guides/annapurna-circuit`, `/guides/pokhara-2-days` | MVP (seed set), ongoing |
| Help/FAQ | `/help/…` | MVP |
| Legal | `/terms`, `/privacy`, `/vendor-terms` | MVP (pre-launch requirement) |
| Vendor directory | `/vendors`, `/vendors/{slug}` | V1.5 |
| Blog (content marketing) | `/blog/{slug}` | V1.5 |
| Localized (Nepali) | `//ne/…` with hreflang | V1.5 (human-authored) |

### 32.2 Strategy rules

- SO-01 **Original content only** (GC-6). Destination/guide content authored/edited by team; vendor content attributed.
- SO-02 Pillar-cluster model: destination hub → line pages → detail pages; disciplined internal linking (≥ 3 contextual links per detail page).
- SO-03 Programmatic governance: a detail page is indexable only with minimum content (description ≥ 300 chars, media ≥ 3, structured attributes complete) — no thin pages; below-threshold ⇒ noindex (admin audit job).
- SO-04 Slugs stable; edits create 301 (admin redirect manager); never delete-and-recreate.
- SO-05 Keyword research is an **ops activity pre-launch** (documented target list per destination/line); no keyword stuffing; E-E-A-T signals (author bylines for guides, vendor credentials displayed).
- SO-06 Nepali content `[V1.5]` human-authored with hreflang; no machine-translation at scale (quality bar).
- SO-07 One domain for NP MVP; multi-country site structure (subdomain/country) is a V2 decision (Dependency).

### 32.3 Technical requirements `[MVP]`

| Item | Requirement |
|---|---|
| Rendering | SSG/ISR (Next.js App Router); dynamic booking surfaces client-side only |
| Meta | Unique title/description, canonical, OG + Twitter cards (auto OG images with brand template) |
| Structured data | `TouristTrip` (tours/treks/packages), `LodgingBusiness` (hotels), `BreadcrumbList`, `FAQPage` (guides), `LocalBusiness` (vendor directory V1.5) |
| Sitemap/robots | Auto-generated partitioned sitemaps; robots disallow app/private paths |
| 404/redirects | Branded 404 with search; admin redirect manager with audit |
| Performance | LCP < 2.5s (4G mobile, p75), CLS < 0.1, INP < 200ms; images AVIF/WebP + `srcset` + lazy; CWV monitoring `[V1.5]` |
| Accessibility | WCAG 2.1 AA baseline (keyboard nav, contrast, focus states, form labels) — applies site-wide, not just SEO pages |

### 32.4 Content ops plan (MVP seed)

- 15–20 destination hubs (Kathmandu, Pokhara, Chitwan, Bhairahawa, Nagarkot, Bandipur, Mustang, Langtang, Everest region, Lumbini, Patan/Bhaktapur/Pashupatinath area, Ilam, etc. — final list ops-owned).
- 10 guides at launch (2 trek route guides, 2 city guides, 2 season guides, 2 budget guides, 2 practical: documents/permits, currency).
- Cadence: 2 guides/month post-launch (ops-owned, not invented volume).

### 32.5 Edge cases

| Edge | Rule |
|---|---|
| Duplicate parameter URLs (`?date=`) | Canonical to clean URL; noindex on param variants |
| Service suspended while indexed | 60s index removal; page returns 404/redirect (admin choice) |
| OG image failure | Branded fallback (never broken image) |
| Guide references a retired service | Content review triggers on linked-service suspension |

---

## 33. Security

### 33.1 Control baseline (OWASP Top-10 aware)

| Area | Control | Version |
|---|---|---|
| Injection | Parameterized queries via ORM only; Zod validation on **every** input (API + forms); no string-built SQL; template escaping | MVP |
| Authentication | Argon2id password hashing; JWT access (15 min) + rotating refresh (30 d, reuse detection ⇒ session family revocation); password policy (min 10, breach-list check); login lockout 5/15 min per identifier; email-verified gate; admin TOTP MFA **required** | MVP |
| Authorization | RBAC deny-by-default; per-route role checks + object ownership checks (customer→own, vendor→own org, admin scoped); corporate org isolation | MVP |
| Secrets | Env/secret manager only; no secrets in repo (pre-commit + CI secret scan); rotation policy; least-privilege provider credentials | MVP |
| Crypto | TLS 1.2+ everywhere; AES-256 at rest for PII fields; HMAC for signed URLs (vendor share links) | MVP |
| File uploads | MIME + magic-byte validation, size caps, random server-side names, private-by-default buckets, public only for approved media; AV-scan hook `[V1.5]`; no executables | MVP |
| API protection | Rate limiting (per IP/user/endpoint tier; login & payment endpoints strict), CORS allowlist, generic error responses + stable error codes (no stack leaks), no debug routes in prod | MVP |
| Logging & audit | Structured logs with PII masking; immutable audit table (who/what/when/why, admin + state + auth events); retention 1 year (MVP); SIEM export `[V1.5]` | MVP |
| Monitoring | Health/readiness probes, webhook & queue alerting, error budget dashboards | MVP |
| Supply chain | Locked dependency graphs, dependency audit in CI (high/critical gate), reproducible builds, minimal base images | MVP |
| Data protection | Daily backups (30-day retention), restore test (quarterly, documented), retention schedules, PII access role-scoped, deletion workflow `[V1.5]`, DPA with sub-processors | MVP |
| Client hardening | CSP, HSTS, X-Frame-Options/DENY, referrer-policy, secure/httponly cookies; CSRF via SameSite + token for cookie auth | MVP |

### 33.2 Payment-specific

- SAQ-A target (redirect/tokenized only); zero PAN in storage/logs; webhook signature verification; token storage only at provider; 3DS where provider supports; rate-limit + anomaly flags on payment endpoints `[V1.5]`.

### 33.3 PII inventory & rules

| Data | Purpose | Retention (default, legal review) | Access |
|---|---|---|---|
| Email, phone, name | Account | Account life + 24 months dormant | Support+ |
| Passport number (air/trek permits) | Fulfillment | 24 months post-fulfillment | Booking owner, vendor (scoped link), support (case) |
| Bank details (vendor payout) | Settlement | Account life | FINANCE_ADMIN only |
| Vendor documents | Verification | Approval life + audit 1 yr | Admin only |
| Payment references | Reconciliation | 5 years (financial) | Finance |

- PI-01 Minimization by design (collect at point of need); PI-02 masking in UI/logs (default masked); PI-03 no PII in analytics events (blocklist validation at ingestion); PI-04 hosting region preference: region-adjacent (e.g., Singapore/Mumbai-class availability) with legal review for Nepal data considerations `[pre-launch]`.

### 33.4 Audit logging

- Events: auth (login/fail/MFA), state transitions (§10), admin actions (§5), config changes, exports, file accesses (vendor docs), refunds, suspensions.
- Schema: actor (id+role), action, entity+id, before/after (hash + stored diff for admin actions), IP, user-agent class, ts (UTC), correlation id.
- Integrity: append-only (no UPDATE/DELETE grants); export `[V1.5]`.

### 33.5 Incident response & pre-launch gate

- IR-01 Severity levels (SEV1 data/payment breach → 24/7 phone chain), comms template, escalation, post-mortem within 5 business days (SEV1/2).
- IR-02 **Pre-launch gate:** STRIDE threat model (documented), external penetration test (findings ≥ high = blocked), load test (2× expected peak: search p95, checkout), backup-restore drill, runbooks (webhook outage, DB failover, provider outage).

### 33.6 Edge cases

| Edge | Rule |
|---|---|
| Admin session hijack (suspected) | Global admin revoke (SUPER_ADMIN), forced re-MFA, audit sweep |
| Webhook signature key compromise | Key rotation runbook; replay window shrunk; alert |
| Mass credential stuffing | Per-IP + per-identifier rate limits, challenge step `[V1.5]` |
| Vendor share-link leak (PII doc) | Expiring links (default 72h), access logging, immediate revoke endpoint |

---

## 34. Analytics

### 34.1 Principles

- AN-01 Privacy-first: consent banner (non-essential tracking only), no payment/card data in any event, no PII in properties (server-side blocklist validation), retention policy, pseudonymous session ids.
- AN-02 Server-side event ingestion (same pipeline client & server use) — idempotent (dedup key), versioned schema, at-least-once.
- AN-03 No third-party analytics in MVP (self-contained tables + dashboards); third-party (e.g., Plausible self-hosted or GA4 with consent + IP anonymization) is a `[V1.5]` decision (D9).

### 34.2 Event taxonomy (MVP core set)

`page_view, search_performed, filter_applied, result_clicked, detail_viewed, compare_opened, wishlist_added/removed, booking_started, booking_submitted (mode), offer_received (vendor), offer_accepted/rejected, payment_initiated, payment_succeeded, payment_failed, booking_confirmed, booking_cancelled (reason), refund_completed, ticket_issued (air), service_started/completed, review_submitted, notification_sent/clicked, vendor_service_published`

Properties: entity ids, line, destination id (no free-text PII), amounts **excluded** (use bands), mode, device class, session id, ts_server.

### 34.3 Dashboards & KPIs `[MVP]`

| KPI | Definition |
|---|---|
| Traffic & engagement | Sessions, pages, bounce (p75), top destinations/lines |
| Conversion | search→detail, detail→booking-start, submit→paid (by mode), quote acceptance rate, offer-to-payment time |
| Payment | Success rate by method, failure reasons, bank-transfer verify time |
| Revenue | GMV, net, AOV by line (from ledger, not events) |
| Quality | Refund rate by reason, cancellation rate, dispute aging, vendor SLA attainment, NPS/CSAT (survey, opt-in) |
| Performance | Lighthouse/CWV field data `[V1.5]` |

- AN-04 Funnel dashboards: acquisition→booking (by mode), quote pipeline, payment pipeline.
- AN-05 Exports: CSV `[MVP]`; cohort/retention `[V2]`.

### 34.4 V2

- Data warehouse (provider decision: e.g., BigQuery/Athena-class), experiment framework (feature flags + experiment registry + A/B with guardrail metrics), attribution model, forecasting (simple), product analytics deep-dives.

### 34.5 Edge cases

| Edge | Rule |
|---|---|
| Consent withdrawn mid-session | Collection stops for non-essential; retained aggregates unchanged |
| Event property contains PII pattern | Ingestion rejects + alert (blocklist) |
| Clock skew | Server timestamp authoritative |
| Bot traffic | Basic heuristics (no paid ads in MVP; UA/rate flags) |
| Event schema migration | Versioned events; dashboards pin version |

---

## 35. Scope Plan — MVP / V1.5 / V2 / Future

### 35.1 Definitions & gates

- **MVP** = launch gate. Launch is defined as: all Appendix A items green + security gate (§33.5) passed + first real end-to-end paid booking in production + supply floor (≥ 20 approved vendors, ≥ 100 published services across ≥ 6 lines — working target, Ops-confirmed).
- **V1.5** = 0–6 months post-launch: revenue expansion, convenience, corporate depth, notification breadth.
- **V2** = 6–12 months: internationalization pilot, AI planning, automation, live-inventory pilots.
- **FUT** = 12+ months: multi-country marketplace, agentic booking, embedded finance, IoT.

### 35.2 MVP scope statement (what "launch" includes)

Customer web (responsive, English): auth (email+password, email OTP), search/filter/browse/detail/compare, wishlist, three booking models (instant / quote / custom with trip desk), payments (wallets + domestic cards + bank transfer; international cards if D2 validated), booking management (timeline, reschedule request, cancel/refund), verified reviews, notifications (email + in-app), corporate core (org account, roles, approvals, caps, CSV), vendor-verified badges (email), original content + SEO pages (hubs, details, 10 guides, 15–20 destinations), help center.

Vendor web portal: registration + documents, profile, service CRUD (all lines), pricing + availability editors, booking inbox (offer/confirm/decline, deliverables upload), earnings + settlements, basic reports + CSV, notifications.

Admin console: vendor approval (per-line), service moderation, bookings oversight + interventions, payment verification (bank transfer) + refunds + settlements, customers, corporate KYC, disputes, geo/destination + content management, settings (lines, commission, SLAs, rate table, templates, feature flags), audit views, KPI dashboards.

Platform: typed API-first backend, PostgreSQL + Redis, S3-compatible storage, RBAC + audit, webhook-verified payments + ledger, event analytics + KPI dashboards, CI/CD, structured logging, monitoring, pre-launch security gate.

### 35.3 Future scope statement (international readiness)

- V2: non-Nepal destination pilot (agency-fulfilled, quote mode — same engine), multi-currency settlement, Nepali UI + hreflang, LLM planner, live-airline-inventory **pilot** (provider-dependent), hotel feed **pilot** (provider-dependent), warehouse + A/B.
- FUT: multi-country operations (localized sites, multi-region hosting), B2B open API, loyalty (lightweight), instant payouts, agentic booking, eSIM/insurance products (partner-owned), embedded finance (regulated partner), native apps, IoT/telematics.

### 35.4 Master classification table (summary; section-level tags are authoritative)

| Feature | MVP | V1.5 | V2 | FUT |
|---|---|---|---|---|
| Email+password auth, email OTP, RBAC, audit | ✓ | MFA customers, Google/OTP login | SSO (corporate) | — |
| Vendor registration/approval (per-line) | ✓ | Expiry automation | — | — |
| Catalog all 10 lines + publish gate | ✓ | Experiences line | Intl destination lines | — |
| Instant / Quote / Custom booking | ✓ (custom = trip-desk) | In-place modify, consolidated pay | Auto multi-vendor orchestration | Agentic |
| Payments: wallets, domestic cards, bank transfer | ✓ | Deposit+balance, vendor-collected (broad), auto payouts | Multi-currency settlement | Embedded finance |
| International cards | If D2 validated | Else via partner | — | — |
| Cancellation/refund engine + policies | ✓ | Reconciliation tool, compensatory credits | — | — |
| Verified reviews + moderation | ✓ | Sub-ratings, similarity heuristics | — | — |
| Notifications: email + in-app | ✓ | SMS, WhatsApp (official), digest | Push (app) | — |
| Search (FTS) + filters + facets | ✓ | Availability-aware ranking, saved presets | Semantic search (provider) | — |
| Wishlist + compare | ✓ | Share, price alerts | — | — |
| Corporate: org, roles, approvals, caps, CSV | ✓ | Consolidated invoicing, org methods | Dashboards, AM, SSO | — |
| AI planner | Rule-based only (suggestions in V1.5) | Rule-based suggestions | LLM planner (provider-gated) | Agentic booking |
| Air ticketing | Quote-only (agency) | Free IATA input, multi-city | Live inventory pilot | — |
| Hotels | Direct vendors | Waitlists, in-place modify, intl properties prep | Feed/channel-manager pilot | — |
| SEO | Hubs/details/guides, schema, CWV budget | Vendor directory, blog, Nepali | Multi-country structure | — |
| Reports | Vendor + admin dashboards + CSV | Scheduled, XLSX, availability gaps | Warehouse, cohorts | — |
| Analytics | Event pipeline + KPI dashboards | Optional 3P (D9), CWV field data | Experiment framework | — |
| Security baseline + pen-test gate | ✓ | AV scan, SIEM export, 2-person finance | Bug bounty | — |
| i18n | English (structure i18n-ready) | Nepali UI + content | Multi-language content | Regional sites |

---

## Appendix A — MVP Feature List (launch gate checklist)

**A1. Platform & quality**
1. Monorepo (web + api + shared packages), TS strict, CI (lint/type/test), preview + production pipelines, health checks, structured logging, monitoring/alerting, backup/restore verified.
2. PostgreSQL schema v1 + migrations; Redis (cache/rate-limit/queues); S3-compatible storage (private + public media).
3. API-first: typed contracts, validation on all endpoints, stable error codes, OpenAPI docs, rate limiting.

**A2. Identity & access**
4. Customer auth: email+password (Argon2id), email OTP verification, reset, lockout; JWT access + rotating refresh; guest (quote) path.
5. Vendor + admin auth incl. admin TOTP MFA; RBAC (5 roles, deny-by-default); session policy; ban/suspend + appeal.
6. Audit logging (auth, state, admin, config, exports, file access).

**A3. Vendor & approval**
7. Vendor registration, profile, document upload (private, admin-only), line-capability model.
8. Admin approval workflow: queue, per-line checklists, approve/reject/info-request, suspension + appeal, cooldowns, audit.
9. Vendor portal: service CRUD (all lines), pricing editors, availability editors (per line), publish gate enforcement.

**A4. Catalog & content**
10. Catalog core (Service + line extensions), status lifecycle, publishability gate, SEO fields, media pipeline (validated, licensed-record).
11. Geo tree (country→state→district→city) + airport/destination seed data; currency/language/tax config entities.
12. Original content: 15–20 destination hubs, 10 guides, help center, legal pages; content ops checklist.

**A5. Customer experience**
13. Storefront: responsive/mobile-first design system; home; category hubs; destination hubs; detail pages (all lines); search; filters; compare (≤4); wishlist (auth + guest session); my-trips; notifications center; account/settings; corporate account area.
14. Three booking models end-to-end with §10 state machine, idempotency, price integrity, SLA timers, trip-desk tooling for custom trips.
15. Corporate core: org verification, roles, approval-before-payment, caps (basic), CSV statement export.
16. Verified reviews (eligibility, moderation, aggregates, vendor replies) — zero seed reviews.

**A6. Money**
17. Payments: provider sandbox integration (wallets + domestic cards), bank-transfer manual verification, webhook verification, ledger, payment failure/expiry handling.
18. Commission + settlement (weekly manual batch), holds (air 30d), refund engine (auto full-tier + manual partials, vendor-mediated air), chargeback handling (provider-dependent).
19. Pricing engine (types, surcharges, taxes config, display-currency ≈ conversion), itemized checkout.

**A7. Operations & growth**
20. Notification engine (email + in-app), event catalog, preferences, suppression.
21. Admin console (all §9 areas, MVP depth), KPI dashboards, reports + CSV, geo/content management, settings + feature flags.
22. SEO: SSG/ISR, meta/schema, sitemaps, redirects, performance budget.
23. Analytics: event ingestion + KPI/funnel dashboards (privacy-compliant).
24. Security gate: threat model, external pen test (≥ high = blocked), load test, runbooks, IR plan.

**A8. Supply & launch**
25. Launch supply: ≥ 20 approved vendors / ≥ 100 published services across ≥ 6 lines (Ops-confirmed target).
26. First real end-to-end paid booking in production (all modes verified with real vendors).

---

## Appendix B — Non-MVP Feature List (versioned)

**V1.5:** Google OAuth + phone/OTP login; customer optional MFA; session management UI; SMS + official-WhatsApp notifications; Nepali UI + content (+ hreflang); coupons/discount campaigns; price-drop alerts + wishlist share + saved filter presets; deposit+balance; consolidated trip-group payment; in-place booking modification; vendor-collected (broad); automated settlement execution; reconciliation tool; 2-person finance rule; IP allowlist; granular permissions; sub-ratings + review heuristics; corporate consolidated invoicing + org payment methods + dashboards; rule-based smart suggestions; experiences line + shared-seat transfers + waitlists; free-IATA + multi-city air; vendor directory + blog (SEO); scheduled reports; AV scanning; SIEM export; deletion workflow; optional third-party analytics (D9); CWV field monitoring; compensatory credits.

**V2:** LLM AI planner (provider-gated, §25.2); live airline inventory pilot (GDS/NDC/direct — separate PRD); hotel channel feed pilot; non-Nepal destination pilot (intl vendors, quote); multi-currency settlement; automatic custom-trip orchestration (no trip desk); data warehouse + cohort/retention; A/B experiment framework; push notifications (app); native mobile apps (or PWA push); SSO for corporate; B2B open API (partner, API keys); same-day payouts; tiered commission; corporate flat-rate; semantic search (provider); multilingual content; bug bounty.

**FUT:** Multi-country marketplace (regional sites, multi-region hosting); agentic autonomous booking (payments in-loop — dedicated PRD + trust work); loyalty/points (lightweight, non-monetary-first); eSIM + travel insurance products (partner-owned); embedded finance (BNPL/credit via regulated partner); IoT/fleet telematics; driver/guide marketplace + ratings; offline travel companion (itinerary, permits, maps); demand forecasting + dynamic pricing (policy-controlled); wholesale/B2B2C distribution.

---

## Appendix C — Critical Dependencies

| ID | Dependency | Owner | Needed by | Impact if late | Mitigation |
|---|---|---|---|---|---|
| C-1 | **Payment provider selection + sandbox** (wallets + domestic cards; verify refund/3DS/chargeback webhooks) | Eng + Finance | Before payment build | Launch delayed or bank-transfer-only launch | Parallel evaluation of 2+ candidates; sandbox PoC in Phase 02 |
| C-2 | **International card acceptance path** (D2): partner acquirer or compliant foreign-entity route | Finance + Legal | Launch (else honest gap in UI) | Intl customers pay via supported methods only | Evaluate at provider stage; contract by month 1 |
| C-3 | Transactional email provider | Eng | Phase 01 end | No notification SLAs | Decide in Phase 01 sign-off |
| C-4 | SMS/WhatsApp (official) provider | Eng | V1.5 | Notification channels reduced | Provider market review at V1.5 planning |
| C-5 | Object storage + CDN (S3-compatible) | DevOps | Phase 02 | Media pipeline blocked | Managed service selection (cloud-agnostic) |
| C-6 | Hosting: web (Vercel-class), API (containers/FaaS), managed Postgres + Redis | DevOps | Phase 02 | No environments | 12-factor setup; AWS-portable IaC |
| C-7 | Domain, business entity, merchant accounts, legal docs (ToS, privacy, vendor agreement incl. commission/clawback, DPA) | Legal/Ops | Pre-launch (legal before vendor onboarding) | Cannot onboard vendors or collect payments | Legal draft in Phase 02; sign-off gate before first vendor approval |
| C-8 | Seed data: geo tree (7 provinces, 77 districts, cities), airports, destinations | Product/Ops | Phase 03 (catalog) | Catalog/search/SEO blocked | Curated, sourced, original — no scraped datasets |
| C-9 | LLM provider (if V2 AI planner proceeds) | Product/Eng | V2 planning | AI planner defers | Gate on privacy/cost/quality evaluation |
| C-10 | Vendor supply (BD pipeline per line) | Ops | Launch (floor A8.25) | Marketplace has nothing to book | Pre-sign launch vendors in Phase 02–05; quote-first for thin lines |
| C-11 | Trip-desk + support staffing (ops hours, SOPs) | Ops | Launch | Custom trips & disputes bottleneck | SOPs + staffing plan approved at V1.5 planning |
| C-12 | Original/licensed photography + destination content | Product/Ops | Phase 04 (storefront) | Thin/low-trust launch | Licensing lead time 4–6 weeks; shoot plan |
| C-13 | Map/geo display provider | Eng | Phase 04 | Detail pages degraded | Default: OSM/Leaflet (no invented premium features); upgrade optional |
| C-14 | External penetration test | Security | Pre-launch gate | Launch blocked (by design) | Book 2–4 weeks ahead of gate |
| C-15 | Analytics decision (3P vs none) | Product | V1.5 planning | Analytics remains self-contained | Low risk; decide with consent UX review |

---

## Appendix D — Major Risks

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R-1 | **Supply-side chicken-and-egg** (no vendors ⇒ no demand) | High | Launch credibility | Pre-signed launch vendors (C-10); quote-first for thin lines; curated "launch line" set (transfers, tours, hotels, vehicles) before air/international | Ops |
| R-2 | **International card acceptance gap** (Stripe-class not available in NP) | Medium-High | Intl customers friction | C-2 decision early; partner acquirer / foreign-entity; honest UI gap messaging; bank transfer + wallets as fallback | Finance/Legal |
| R-3 | **Air ticketing expectation gap** (no live inventory) | Medium | Complaints, chargebacks | Explicit "partner agency" UX, SLA clocks, no live-price UI, agency contract strictness (C-7), 30d hold | Product/Ops |
| R-4 | Payment provider integration delay (sandbox quirks, refund API gaps) | Medium | Launch slip | Parallel PoCs; bank-transfer path always viable; capability matrix drives UI copy (GC-2) | Eng |
| R-5 | Seasonality (peak Mar–May, Sep–Nov; monsoon lull) | High (structural) | Revenue/ops variance | Launch aligned to shoulder/peak; content ops fills lull; vendor availability calendars; capacity planning in trip desk | Ops |
| R-6 | Refund/chargeback ops complexity across wallets | Medium | Financial leakage, disputes | Ledger + reconciliation (V1.5 tool), contract clawback terms, manual-verify discipline, KPI tracking | Finance |
| R-7 | Scope creep beyond MVP gate | Medium | Launch slip, quality debt | Appendix A is the gate; change requests re-version this PRD; weekly scope review | Product |
| R-8 | Regulatory (tourism licensing per line, data protection) | Low-Medium | Lines blocked, legal exposure | Per-line document checklists (C-7 legal), data policy + DPA, legal review gate | Legal |
| R-9 | FX volatility (display trust) | Medium | Intl customer confusion | ≈ labeling always; rate-table TTL + source label; NPR-exact everywhere | Product |
| R-10 | PII/security incident (passports, vendor docs) | Low (controls) / High (impact) | Trust + legal | §33 controls, pen-test gate, retention limits, access scoping, IR plan | Security |
| R-11 | Review manipulation (vendor self-dealing, astroturfing) | Medium | Marketplace trust | Verified-only + eligibility + ownership enforcement + moderation + contract terms (RV-04/RV-05) | Product/Ops |
| R-12 | Trip-desk bottleneck for custom trips | Medium | V1.5+ conversion loss | CT-07 staffing, SLAs (CT-08), automation roadmap (V2), quote-only guardrails | Ops |
| R-13 | Data quality (geo/destinations/vendors) | Medium | Search/SEO degradation | Seed governance (C-8), content ops cadence, curation checklists | Ops |
| R-14 | Vendor quality variance (safety, service) | Medium | Incidents, brand damage | Line-specific docs, metrics + SLA enforcement, suspension tooling, dispute process, contract termination rights | Ops/Legal |
| R-15 | Key-person dependency (single trip-desk/finance operator) | Medium | Ops fragility | SOPs, runbooks, ≥ 1 backup per role from day 1 | Ops |

---

## Appendix E — Recommended Implementation Order

> Rationale: **supply and money before demand polish.** Vendors need the portal early to build catalogs; payments must be proven (sandbox) before storefront launch; SEO/content rides on stable catalog APIs.

| Order | Phase | Exit criteria |
|---|---|---|
| 1 | **P0 — Foundations** | Monorepo, CI/CD, environments, DB/Redis/storage connected, auth skeleton, error/logging/health, provider sandboxes (payments, email) provisioned |
| 2 | **P1 — Core schema + Identity** | Schema v1 (identity, roles, geo, catalog core, money/ledger), authN/Z (customer + admin MFA), audit, feature flags |
| 3 | **P2 — Vendor onboarding & approval** | Vendor portal (profile/docs/services CRUD/pricing/availability), admin approval workflow end-to-end with **real pilot vendors** (C-10 starts) |
| 4 | **P3 — Catalog & content** | All line models, publish gate, geo/destination seeds, media pipeline, content seeds (destinations, 10 guides), search/filter APIs |
| 5 | **P4 — Payments & money** | Payment integrations (webhook-verified), bank-transfer verification, ledger, commission/settlement batch, refund engine, price engine — **money path proven in staging with real provider sandboxes** |
| 6 | **P5 — Booking engine** | Instant → Quote → Custom (trip desk tooling) on the §10 state machine; SLA timers; notifications engine wired |
| 7 | **P6 — Storefront (customer web)** | Design system, all §A5 customer surfaces, corporate core, reviews, wishlist/compare; SEO rendering (SSG/ISR) + schema + sitemaps |
| 8 | **P7 — Vendor & Admin consoles (full)** | Vendor booking inbox/earnings/reports; admin §9 areas; KPI dashboards; reports/CSV; settings |
| 9 | **P8 — Analytics + content ops tooling** | Event ingestion, funnels/KPI dashboards, content checklists live |
| 10 | **P9 — Hardening & gates** | Load test, pen test + fixes, CWV budget, a11y pass, backup-restore drill, runbooks, legal docs signed |
| 11 | **P10 — Launch** | Staging soak with pilot vendors, supply floor check (A8), first real paid bookings (all 3 modes), go/no-go |
| 12 | **P11 — V1.5 backlog start** | Per §35.4 (promotions, i18n-ne, SMS/WhatsApp, deposits, consolidated pay, invoicing, suggestions…) |

---

## Appendix F — Glossary

| Term | Meaning |
|---|---|
| Line | A service line (e.g., `HOTEL`, `TREK`) — the unit of commission, capability, and catalog extension |
| Service | A bookable catalog item owned by a vendor within a line |
| Offer | A versioned vendor price/term proposal on a quote booking |
| Trip group | A set of related bookings (custom trip) shown as one itinerary |
| Ledger | Append-only financial journal (payments, refunds, commission, settlements) |
| Hold | Settlement delay before an amount becomes payable to a vendor |
| Vendor-fault | Cancellation/decline by vendor after payment — triggers full refund + metrics |
| Trip desk | Platform ops role coordinating custom-trip vendor offers |
| Published availability | Vendor-declared capacity; the only availability the platform may honor (GC-3) |
| Capability | A vendor's approved right to operate a specific line |
| ≈ (approx) | Display-currency conversion from the reference rate table — never the charge amount |

---

## Appendix G — Open Decisions (require sign-off before Phase 02)

| ID | Decision | Recommendation | Default if unconfirmed |
|---|---|---|---|
| D1 | MVP UI language | English only (i18n-ready structure); Nepali V1.5 | English only |
| D2 | International card path | Start partner-acquirer/foreign-entity evaluation immediately | Launch without int'l cards; honest UI gap |
| D3 | Commission seed rates (§12.2) | Adopt proposal table | Table values (configurable) |
| D4 | Bank transfer in MVP | Yes (manual verify; ops cost) | Yes |
| D5 | Trip-desk model | 1 ops FTE MVP (peak 2), SOPs | 1 FTE |
| D6 | Self-drive deposit vendor-collected exception | Allow (documented, audited) | Allow |
| D7 | Quote SLA defaults (24h/48h) | Adopt §10.7 defaults | Adopt |
| D8 | Review window | 365 days | 365 days |
| D9 | Third-party analytics | None in MVP | None |
| D10 | Map provider | OSM/Leaflet default | OSM/Leaflet |
| D11 | Corporate in MVP | Core (account/roles/approvals/caps/CSV); invoicing V1.5 | Core |
| D12 | Launch supply floor | 20 vendors / 100 services / 6 lines (working target) | Ops to confirm |
| D13 | Legal docs owner & timing | Drafts in Phase 02; signed before first vendor approval | Per recommendation |

---

*End of PRD v0.1. This document is a DRAFT pending sign-off on Appendix G. Any scope change requires a version bump and a change-log entry.*
