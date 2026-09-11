# Easy Trip Nepal — UX Architecture & Design System (Phase 02)

| Field       | Value                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| Document ID | ETN-UX-002                                                                                                       |
| Phase       | 02 — UX/UI & Design System                                                                                       |
| Version     | 0.1 (DRAFT — pending design review)                                                                              |
| Date        | 2026-09-09                                                                                                       |
| Depends on  | [`docs/prd/01-product-requirements.md`](../prd/01-product-requirements.md) (PRD v0.1) — PRD IDs cited throughout |
| Status      | Awaiting stakeholder review                                                                                      |

**Change log**

| Version | Date       | Author                       | Summary                                                                                                                             |
| ------- | ---------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 0.1     | 2026-09-09 | Product/Design (Arena agent) | Initial UX architecture: principles, tokens, components, responsive strategy, sitemap, homepage spec, state systems, a11y, handoff. |

**Scope & reading guide**

- This document is a **design contract**: layout, tokens, component anatomy, states, behavior rules, accessibility, responsive behavior, and sitemap. It contains **no business logic** and **no application implementation** (interface sketches are API _contracts_ only).
- Where this document and the PRD disagree, the PRD wins (this doc must be corrected, not the other way round).
- Data-honesty is inherited: UI may **only** display real catalog data, real reviews, real availability, real prices (PRD GC-2/GC-3). Sections and badges with no real data behind them are hidden, never faked (§7.0).
- Reference assets (original, generated for this phase): [`assets/hero-concept.jpg`](./assets/hero-concept.jpg) (visual direction), [`assets/empty-state-concept.png`](./assets/empty-state-concept.png) (illustration system direction), [`assets/logo-concept.svg`](./assets/logo-concept.svg) (brand mark concept — provisional until final brand lettering).

---

## 1. Brand & Design Principles

### 1.1 Brand identity

| Element           | Definition                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| Name              | **Easy Trip Nepal** (wordmark: `easytrip` + tracked `NEPAL`)                                              |
| Mark              | Rounded-square "summit" mark: deep-teal field, white two-peak silhouette, marigold sun (see logo concept) |
| Tagline (primary) | **"Plan. Book. Explore."**                                                                                |
| Positioning line  | "Nepal's travel marketplace — one place for trips, treks, stays, and rides."                              |
| Brand promise     | Real inventory, honest prices, verified vendors — ease without fine print                                 |
| Personality       | Warm-hospitable, capable, calm, unpretentious; like a trusted senior travel guide                         |

**Voice & tone**

- Plain language; short sentences; you-style. Numbers and policies stated exactly (no "unlimited", no "guaranteed best").
- Warmth at hospitality moments (confirmation, completion, re-engagement); precision at money moments (prices, policies, payments).
- Never: fake urgency ("last chance!"), unverified superlatives ("#1 in Nepal"), fear-based pushes, invented social proof.

**Do / Don't**

| Do                                                                 | Don't                                                                              |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Show real availability, real prices, "on request" when unpublished | Imply live airline/hotel data that isn't connected (PRD §26/§27)                   |
| Label curated picks ("Popular — hand-picked by our team")          | Label curated as "trending" without a data basis before `[V1.5]` views data exists |
| Use photography of real places (licensed, C-12)                    | Use cliché stock (hands-on-laptop, "happy tourist jumping")                        |
| One clear primary action per view                                  | Two competing primary CTAs                                                         |

### 1.2 Design principles (binding)

| #    | Principle                   | What it means in practice                                                                                                                                                                                   |
| ---- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DP-1 | **Clarity over cleverness** | Mobile-first; ≤ 1 primary action per view; plain labels; no hidden navigation; 3-second understandability of any card                                                                                       |
| DP-2 | **Trust at every step**     | Verified-vendor badges, policy visible _before_ payment, itemized prices with no hidden totals, secure-payment signals, refund terms up front, reference IDs on confirmations                               |
| DP-3 | **Himalayan calm**          | Spacious layout, restrained palette (teal + snow + marigold accent), generous white space, minimal animation, photography-led. No gradients everywhere, no parallax, no autoplay                            |
| DP-4 | **Conversion with honesty** | Dual CTA pattern (Book now / Request a quote) reflects the real booking models; sticky mobile CTA; trust cluster under price; no fake scarcity (capacity badges only when published capacity ≤ 2, PRD GC-3) |
| DP-5 | **One card system**         | Everything marketplace-shaped renders from the same card anatomy (media → body → price → CTA) with line-specific meta rows; consistency across all 10 lines                                                 |
| DP-6 | **Accessible by default**   | WCAG 2.1 AA minimum (contrast, focus, keyboard, screen reader, 44px targets, reduced motion) — see §10                                                                                                      |
| DP-7 | **Fast feels premium**      | Skeletons before spinners, instant local feedback, lazy media with blur-up, no blocking modals on entry, performance budget honored (PRD §32.3)                                                             |

### 1.3 Visual direction & mood

- **Photography:** bright, real, landscape-first; mountains, lakes, routes, hotels, vehicles. Consistent grade: slight teal lift in shadows, natural skin tones, no heavy filters. Aspect rules: hero 16:9, cards 4:3, destination 3:2. Licensing record mandatory (PRD C-12). Alt text on every image (descriptive, not keyword-stuffed).
- **Color story:** deep pine teal = brand + primary action (calm, trustworthy); snow/white surfaces = spaciousness; marigold = warmth, ratings, featured accents (used sparingly); sky blue = info/links; crimson reserved for destructive/error.
- **Motion:** functional only — feedback, orientation, state change. Durations & easing in §9. Respects `prefers-reduced-motion`.
- **Texture:** flat surfaces + soft shadows (no glassmorphism, no neon, no heavy gradients).

---

## 2. Color System

### 2.1 Token model

- Semantic naming: `color-{role}-{weight}` with roles: `bg`, `surface`, `ink`, `border`, `brand` (pine), `accent` (marigold), `info` (sky), `success` (moss), `warning` (amber), `danger` (crimson).
- Mapped 1:1 to CSS custom properties (Appendix A) and to the Tailwind theme in implementation (Phase 03+). No raw hex in components.
- Dark mode: **out of scope for MVP** — token structure (not hard-coded hex) keeps it possible for `[V1.5]`.

### 2.2 Brand — "Pine" (primary)

| Token       | Hex       | Usage                                              |
| ----------- | --------- | -------------------------------------------------- |
| `brand-50`  | `#F0F7F5` | Section tints, selected-row bg                     |
| `brand-100` | `#DCEDE8` | Tinted surfaces, chips bg                          |
| `brand-200` | `#B9DCD3` | Disabled fills, dividers on tint                   |
| `brand-300` | `#8FC5B8` | Icon accents                                       |
| `brand-400` | `#5FA899` | Hover-adjacent, chart                              |
| `brand-500` | `#3A8A79` | Link hover, subtle emphasis                        |
| `brand-600` | `#236E60` | **Primary** (buttons, active nav, selected states) |
| `brand-700` | `#1C594E` | Primary hover, dark links                          |
| `brand-800` | `#174A41` | Header dark surfaces                               |
| `brand-900` | `#123B34` | Footer bg, deep tint                               |

### 2.3 Accent — "Marigold"

| Token        | Hex       | Usage                                        |
| ------------ | --------- | -------------------------------------------- |
| `accent-50`  | `#FFF8EC` | Highlight chips bg                           |
| `accent-100` | `#FEEFD2` | Tinted highlight                             |
| `accent-300` | `#F9CC74` | Decorative only (large)                      |
| `accent-500` | `#EE9F2B` | Badges "Featured" fill (text `ink-900`)      |
| `accent-600` | `#D97F14` | **Rating stars (filled)**, underline accents |
| `accent-800` | `#8F4D12` | Accent text on light (AA)                    |

### 2.4 Info — "Himalayan Sky"

`info-50 #EFF5FB · 100 #DCEAF6 · 200 #BBD6EE · 300 #8FB9E2 · 500 #3B79BC · 600 #2C61A0 · 700 #264F82 · 900 #1E3758`
**Links:** `info-700` on light surfaces (underline on hover + always focus-visible underline); `info-300` on dark surfaces.

### 2.5 Semantic

| Role             | Base token            | Text on light         | Bg light             | Usage                                                   |
| ---------------- | --------------------- | --------------------- | -------------------- | ------------------------------------------------------- |
| Success (Moss)   | `success-600 #256B43` | `success-700 #1F5938` | `success-50 #EEF7F1` | Confirmed, completed, paid, success alerts              |
| Warning (Amber)  | `warning-600 #B45309` | `warning-700 #92400E` | `warning-50 #FFF7E8` | Warnings, expiring offers, document expiry              |
| Danger (Crimson) | `danger-600 #A72E22`  | `danger-700 #8A271D`  | `danger-50 #FCF1EF`  | Errors, destructive actions, failed payments, cancelled |
| Info             | `info-600 #2C61A0`    | `info-700 #264F82`    | `info-50 #EFF5FB`    | Informational banners, tips                             |

### 2.6 Neutrals — "Slate" (cool green-grey)

| Token        | Hex                    | Usage                            |
| ------------ | ---------------------- | -------------------------------- |
| `surface`    | `#FFFFFF`              | Cards, modals, inputs            |
| `bg`         | `#F6F8F8`              | Page background ("snow")         |
| `bg-tint`    | `#F0F7F5` (= brand-50) | Alternating sections             |
| `ink-900`    | `#1F2A2A`              | Primary text (4.5:1+ on `bg` ✓)  |
| `ink-600`    | `#5C6B6B`              | Secondary text (AA ✓)            |
| `ink-400`    | `#A8B3B3`              | Placeholder text (min 3:1 ✓)     |
| `border-200` | `#E2E7E7`              | Default borders, dividers        |
| `border-300` | `#CBD3D3`              | Input borders, emphasis dividers |

### 2.7 Contrast & usage rules

- CO-01 Body text ≥ 4.5:1; large text (≥ 24px or 18.66px bold) ≥ 3:1; UI components/graphics ≥ 3:1. (Token choices above satisfy these; CI contrast check in design QA, §12.)
- CO-02 Primary button: bg `brand-600`, text `#FFFFFF` (≈ 5.9:1 ✓); hover `brand-700`; disabled: bg `border-200`, text `ink-400`.
- CO-03 Destructive button: bg `danger-600`, text white; **never** crimson for non-destructive things.
- CO-04 Status colors are paired **color + text/icon** (never color alone — DP-6).
- CO-05 Marigold never as text-on-white below 18px (use `accent-800` for small accent text).
- CO-06 Imaginary "on-sale" red: not used in MVP (no fake discounts — PRD §11.5; V1.5 real discounts use `danger-600` only with real struck price).

---

## 3. Typography

### 3.1 Families

| Role                                      | Family                                                   | Weights            | Notes                                           |
| ----------------------------------------- | -------------------------------------------------------- | ------------------ | ----------------------------------------------- |
| UI + body                                 | **Inter** (self-hosted, `next/font`, subsets latin)      | 400, 500, 600, 700 | Fallback: system-ui stack                       |
| Display (hero, section titles, editorial) | **Bricolage Grotesque**                                  | 500, 600, 700      | Character without loudness; fallback: Inter 700 |
| Data (PNR, reference IDs, tables numeric) | `ui-monospace, "SF Mono", Menlo, monospace`              | 400                | Tabular                                         |
| Devanagari `[V1.5]`                       | **Noto Sans Devanagari** added to Inter's fallback stack | 400, 600           | Nepal-first ready (GC-1)                        |

### 3.2 Type scale (fluid — mobile → desktop at `lg`)

| Token        | Size      | Line height | Weight        | Use                                     |
| ------------ | --------- | ----------- | ------------- | --------------------------------------- |
| `display-xl` | 40 → 56px | 1.15        | 700 (display) | Hero headline                           |
| `display-md` | 32 → 40px | 1.2         | 700 (display) | Section hero (homepage blocks, landing) |
| `h1`         | 28 → 32px | 1.25        | 700           | Page titles (results, detail, account)  |
| `h2`         | 24 → 28px | 1.3         | 600           | Section titles                          |
| `h3`         | 20 → 22px | 1.35        | 600           | Card group titles, modal titles         |
| `h4`         | 17 → 18px | 1.4         | 600           | Sub-sections, table headers context     |
| `body-lg`    | 18px      | 1.55        | 400           | Lead paragraphs                         |
| `body`       | 16px      | 1.55        | 400           | Default body                            |
| `body-sm`    | 14px      | 1.45        | 400/500       | Meta rows, form helpers, table cells    |
| `caption`    | 12px      | 1.4         | 500           | Badges, timestamps, legal               |
| `price`      | 20 → 22px | 1.2         | 700           | Price values (tabular-nums)             |
| `price-unit` | 13px      | 1.3         | 500           | "/ day", "/ person"                     |

### 3.3 Rules

- TY-01 Letter-spacing: display −0.02em; h1/h2 −0.01em; body 0; uppercase labels +0.08em.
- TY-02 Never scale type below 12px. Line length 45–80ch for prose (guides).
- TY-03 Prices always `font-variant-numeric: tabular-nums`; currency + amount + unit pattern per §8.15.
- TY-04 Heading hierarchy never skips a level (h1 → h3) for screen readers; section titles on a page with an h1 must be h2.
- TY-05 Buttons/labels: 14–16px, weight 600; no all-caps buttons.

---

## 4. Layout & Spacing

### 4.1 Breakpoints (mobile-first)

| Name   | Min width | Strategy                                                                            |
| ------ | --------- | ----------------------------------------------------------------------------------- |
| `base` | 0         | Mobile: 1 column, bottom nav, sheets, sticky CTA bar                                |
| `sm`   | 640       | 2-col card grids, larger touch → hover still                                        |
| `md`   | 768       | Tablet: 2–3 col grids, side rails become sheets; header keeps desktop nav collapsed |
| `lg`   | 1024      | Desktop: 12-col grid, mega menu, facet rail, 3–4 col cards                          |
| `xl`   | 1280      | Max container 1200px (wide 1320px for tables/dashboards)                            |

### 4.2 Spacing scale (4px base)

`2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128` px → tokens `sp-0.5 … sp-32`.

- Section vertical padding: `48` (base) / `64` (`md`) / `96` (`lg`).
- Card padding: `16` (base) / `20` (`md+`); card grid gap: `16` / `20` / `24`.
- Stacking inside components: related `8`, related groups `16`, section `32` (8-pt scale discipline).

### 4.3 Container & grid

- Content container: `100% − 2×gutter`, max 1200px, centered; gutter `16/20/24` (base/md/lg).
- 12-column grid at `lg+` (gap 24); card grids: results 1→2→3 (with facet rail) / home carousels 2→3→4 (compact cards allowed at 2-col mobile).
- Dashboards (vendor/admin): max 1320px; table layouts may use full container.

### 4.4 Radius, elevation, borders

| Token         | Value | Use                                  |
| ------------- | ----- | ------------------------------------ |
| `radius-xs`   | 6     | Chips, small tags                    |
| `radius-sm`   | 10    | Inputs, small buttons, thumbnails    |
| `radius-md`   | 14    | Cards, modals, buttons md/lg default |
| `radius-lg`   | 20    | Hero search card, sheets             |
| `radius-xl`   | 28    | Full-bleed media cards, banners      |
| `radius-full` | 999   | Pills, avatar, badge                 |

| Shadow       | Value                           | Use                                     |
| ------------ | ------------------------------- | --------------------------------------- |
| `elev-1`     | `0 1px 2px rgba(19,27,27,.06)`  | Cards resting                           |
| `elev-2`     | `0 2px 8px rgba(19,27,27,.08)`  | Card hover (with 2px lift), dropdowns   |
| `elev-3`     | `0 8px 24px rgba(19,27,27,.10)` | Modals, sheets, sticky header on scroll |
| `focus-ring` | 2px `info-500`, offset 2        | All focus-visible states                |

Borders: `1px border-200` default; inputs `1px border-300` → `brand-600` on focus + ring.

### 4.5 Iconography

- Grid 24px (rendered 20 in text contexts, 24 in navigation), stroke 1.75, rounded caps/joins, `currentColor`.
- Original set built for the product (or a permissively-licensed base — MIT-class — with modifications; record the license decision, GC-6). No mixed stroke weights.
- Naming: `icon-{name}-{variant}` (e.g., `icon-route`, `icon-star-filled`, `icon-chevron-down`).
- Do: pair icons with text labels in nav/CTAs. Don't: use icons as the only label (DP-6).

### 4.6 Imagery rules

- Placeholder media: neutral `bg` tile + line icon (never lorem images in production).
- Blur-up: low-res tinted placeholder → full image; lazy below fold; `srcset` per aspect.
- Every image: `alt` (empty `alt` only for decorative); focusable images are links; max width 100%.
- Map/geo display: OSM/Leaflet default (PRD D10), branded marker (pine pin, marigold active), simplified control set (zoom, locate).

---

## 5. Responsive UX Strategy (Desktop / Tablet / Mobile)

### 5.1 Tier strategy

| Tier                                | Widths   | Navigation                                                                                            | Layout grammar                                                                                                                          | CTA pattern                                                                 |
| ----------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Mobile** (primary design surface) | < 768    | Header (logo, search, account) + **bottom tab bar** (5 tabs: Home, Explore, Trips, Wishlist, Account) | Single column; cards stacked (compact 2-col for carousels); **bottom sheets** for filters/modals; sticky bottom CTA bar on detail pages | Full-width primary buttons; thumb-reach zones (bottom third); 44px+ targets |
| **Tablet**                          | 768–1023 | Full header nav (condensed labels), no mega menu (simple dropdowns)                                   | 2–3 col card grids; facet rail collapses to sheet; dashboards 2-col                                                                     | Hover + tap parity; buttons inline                                          |
| **Desktop**                         | ≥ 1024   | Full header + **mega menus**; hover affordances; keyboard-first                                       | 12-col; 3–4 col card grids; persistent facet rail on results; dashboards full                                                           | Inline CTAs; cards show full meta; sticky detail-side booking panel         |

### 5.2 Component behavior matrix (key surfaces)

| Surface                 | Mobile                                                                                                                                  | Tablet                                    | Desktop                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| Universal search (home) | Single-column field stack in a card; line selector as horizontal scrolling tabs                                                         | 2-column field grid                       | Line tabs + 3-field row + button; compact                   |
| Results page            | Sticky result header (count + sort); filters = bottom sheet with chips row above list; 1-col cards (2-col compact optional)             | Sheet filters; 2-col                      | Left facet rail (280px) + 3-col grid; URL-synced state      |
| Detail page             | Hero media (4:3) → sticky bottom bar (price + Book/Quote) → tabbed content (Overview / Itinerary or Rooms / Pricing / Reviews / Policy) | Same as mobile + 2-col media where useful | 2-col: content left, **sticky booking panel** right (360px) |
| Checkout                | 3-step vertical progress; full-width fields; payment method cards stack                                                                 | 2-col fields                              | Centered 560px column; step indicator top                   |
| My Trips                | Trip cards stacked; status banner per card                                                                                              | 2-col                                     | 3-col + filters top                                         |
| Vendor dashboard        | Bottom-nav sub-tabs (Overview, Services, Bookings, Earnings, More→)                                                                     | Collapsible sidebar                       | Persistent sidebar (240px) + content                        |
| Admin console           | Read-optimized (tables → stacked cards); write actions available but dense                                                              | Collapsible sidebar                       | Sidebar + data tables with full controls                    |

### 5.3 Mobile-specific rules

- MB-01 **Bottom tab bar** fixed; content padding-bottom reserves 64px + safe-area inset; active tab: brand-600 icon + label 11px; badges (Trips: active count) as marigold dot/count.
- MB-02 **Sticky CTA bar** (detail + offer pages): safe-area aware, shows total price (+ unit) and primary action (or dual: "Book" | "Quote" side by side); hidden while sheet/keyboard open.
- MB-03 Bottom sheets: drag handle, 90% height default, swipe-to-dismiss, `aria-modal`, body scroll lock; first interactive control reachable without scrolling for ≤ 5 items.
- MB-04 No hover-dependent info: everything reachable by tap; hover-only affordances must have a tap equivalent.
- MB-05 Forms: one primary field focus per screen segment; autocomplete attributes on all identity fields; date pickers use native mobile fallbacks where web pickers are weak.
- MB-06 Gesture safety: no swipe-only navigation (bottom nav + back button always work).
- MB-07 Touch targets ≥ 44×44px (DP-6); tap targets not closer than 8px.

### 5.4 Tablet/desktop rules

- TD-01 Mega menu open on hover **and** click/Enter (keyboard); close on Esc/outside/blur; never trap focus.
- TD-02 Facet rail sticky below header; scrolls independently; "Done (n)" applies-and-closes on sheet variants.
- TD-03 Detail-page booking panel sticky at `top: header + 16`; on scroll past, condenses to a compact bar (desktop equivalent of MB-02).
- TD-04 Tables at `lg+`; below `lg` auto-transform to stacked rows (§8.12).
- TD-05 Cursor: `pointer` only on interactive; text fields `text`; default elsewhere.

---

## 6. Sitemap

Legend: `[MVP]` / `[V1.5]` scope; render mode: SSG (static), ISR (revalidated on publish events), CSR (client-rendered, auth-gated or dynamic).

### 6.1 Customer (public)

```
/  Home .............................................................. [MVP] SSG/ISR
/vehicles  (list + filters) ........................................... [MVP] ISR
/vehicles/[slug]  (vehicle/rental package detail) ........................ [MVP] ISR
/transfers  (list; airport ⇄ city, intercity, local) .................... [MVP] ISR
/transfers/[slug]  (route/transfer detail, e.g. ktm-airport-to-kathmandu)  [MVP] ISR
/tours  (list; day + multi-day; subfilter family/corporate) .............. [MVP] ISR
/tours/[slug]  (tour detail) ........................................... [MVP] ISR
/trekking  (list) ........................................................ [MVP] ISR
/trekking/[slug]  (trek detail) ......................................... [MVP] ISR
/hotels  (list) .......................................................... [MVP] ISR
/hotels/[slug]  (property detail) ....................................... [MVP] ISR
/packages  (list; curated multi-component) .............................. [MVP] ISR
/packages/[slug]  (package detail) ...................................... [MVP] ISR
/flights  (search → quote request; no live fares — PRD §26) .............. [MVP] ISR+CSR
/flights/[route-slug]  (SEO route page, e.g. kathmandu-pokhara) ........... [MVP] ISR
/destinations  (index of destination hubs) ............................... [MVP] ISR
/destinations/[slug]  (hub: services by line, guides, map) ................ [MVP] ISR
/guides  (index) ......................................................... [MVP] ISR
/guides/[slug]  (travel guide article) ................................... [MVP] SSG
/corporate  (landing → corporate account CTA) ............................ [MVP] ISR
/vendor  ("Sell with Easy Trip" vendor landing) .......................... [MVP] ISR
/deals  (promotions — PRD V1.5; section reserved on home) ................ [V1.5] ISR
/about ................................................................. [MVP] SSG
/contact  (form + details; no invented SLAs) ............................ [MVP] SSG+CSR
/help  (index) + /help/[slug]  (help article) ............................ [MVP] SSG
/login ................................................................. [MVP] CSR
/register  (role select: Customer / Vendor) .............................. [MVP] CSR
/404, /500, /503 ....................................................... [MVP] SSG
```

### 6.2 Customer (authenticated)

```
/account  .............................................................. [MVP] CSR
  /account/profile  (identity, verification status)
  /account/security  (password, sessions `[V1.5]`, MFA `[V1.5]`)
  /account/notifications  (preferences)
  /account/payment-methods  ............................................. [V1.5]
/trips  (My Trips: all booking states, trip groups) ..................... [MVP] CSR
  /trips/[id]  (booking detail: timeline, voucher, docs, actions)
  /trips/[id]/cancel  (cancellation flow: policy preview → confirm)
  /trips/[id]/invoice  (e-invoice PDF — corporate) ........................ [MVP] (corporate)
/custom-trip  (Build-Your-Trip wizard) + /custom-trip/[draftId] .......... [MVP] CSR
/wishlist  .............................................................. [MVP] CSR
/quote/[id]  (offer view for guest quote requests — deep link from email)  [MVP] CSR
```

### 6.3 Vendor portal (`/vendor/app` — role `VENDOR`)

```
/vendor/app  (dashboard: today's services, inbox SLA, revenue snapshot)
/vendor/app/services  (+ /new, /services/[id] edit: content, pricing, availability editors)
/vendor/app/bookings  (+ /bookings/[id]: confirm/decline, offer composer, deliverables upload)
/vendor/app/earnings  (ledger, settlements, payout history)
/vendor/app/reports  (filters + CSV)
/vendor/app/profile  (business info)
/vendor/app/documents  (upload/replace, status, expiry)
/vendor/app/notifications
/vendor/app/settings  (contacts, payout details — re-verification per PRD VA-07)
```

### 6.4 Admin console (`/admin` — admin roles; MFA required, PRD §5)

```
/admin  (KPI overview: GMV, revenue, pipeline, SLA breaches, system health)
/admin/vendors  (+ /vendors/approvals queue, /vendors/[id]: profile, documents, capabilities, actions)
/admin/bookings  (+ /bookings/[id]: timeline, interventions)
/admin/payments  (intents, bank-transfer verification)
/admin/refunds  (queue, approvals)
/admin/settlements  (weekly batches, holds, payouts)
/admin/customers  (+ /customers/[id])
/admin/corporate  (org KYC queue)
/admin/disputes  (+ /disputes/[id]: evidence, decision)
/admin/content  (destinations, guides, banners, help articles)
/admin/geo  (geo tree management)
/admin/reports  (dashboards + exports)
/admin/audit  (audit log explorer)
/admin/settings  (lines, commission config, SLA defaults, rate table, notification templates, feature flags) — SUPER_ADMIN
```

### 6.5 Static/legal

`/terms` · `/privacy` · `/vendor-terms` (incl. commission & clawback, PRD C-7) · `/security` (responsible-disclosure) — all SSG, pre-launch required.

### 6.6 Route rules

- RM-01 Slugs: kebab-case, stable, SEO-owned (PRD SO-04); list pages filter-state lives in query params (shareable), never in hash.
- RM-02 Auth-gated routes: 302 → `/login?next=…`; vendor/admin routes additionally role-checked server-side (PRD GC-5).
- RM-03 Detail URLs are the canonical indexable URLs (PRD §32); app sub-states (checkout steps) are non-indexed client routes.
- RM-04 Guest quote deep links (`/quote/[id]`) require no login (contact-verified access token).
- RM-05 All routes render a unique `<title>`/meta per PRD §32.3.

---

## 7. Homepage Architecture

### 7.0 Data-honesty rule for the homepage (binding)

- Every merchandising section renders **only** from real published catalog data (PRD GC-2/GC-3).
- Section with < minimum items (default 4, carousels ≥ 3) → **hide the section** (fallback layout reflows), never pad with fake items.
- "Trending"/"Popular" in MVP = **ops-curated** ("Popular — hand-picked"); views-based ranking unlocks `[V1.5]` (PRD §34) and then the label may change to "Trending".
- Reviews section renders only real verified reviews (PRD §17); pre-launch state: hidden (no seeded quotes).
- Counts shown ("120+ hotels") must equal live catalog counts at render (ISR revalidate) — or use "hand-picked" phrasing without counts.

### 7.1 Global page frame

Header (§8.8) → [1] Hero → [2] Universal search (overlaps hero bottom edge) → [3]…[15] sections → [16] Footer. Section order fixed for consistency (no per-user randomization in MVP). Section rhythm: alternate `bg` / `bg-tint`; section header pattern: h2 + one-line sub + "See all →" link (top-right).

### 7.2 Sections

**S1 — Hero `[MVP]`**

- Purpose: instant positioning + primary action. Conversion: search is the hero CTA (no separate "explore" CTA competing).
- Layout: full-bleed 16:9 media (hero-concept direction; dark scrim gradient L→R only where text overlays, scrim ≤ 35%), headline left-aligned on `lg`, mobile: media 4:5 with bottom scrim, text over lower third.
- Content: `display-xl` headline ("Plan. Book. Explore Nepal."), sub (positioning line), micro-trust row under search: "Verified vendors · Secure payments · Flexible cancellation" (icons, caption).
- Fallback: if media fails → `brand-800` panel with brand-100 pattern + same copy (text never depends on image).
- A11y: media `alt=""` (decorative behind text); scrim maintains 4.5:1 for white text.
- Analytics: `page_view` (hero visible), search interaction events (§8.5).

**S2 — Universal search `[MVP]`**

- Purpose: single entry to all 7 search lines — the homepage's conversion engine.
- Anatomy: elevated card (`radius-lg`, `elev-2`, overlaps hero by 48px on `lg`; full-width inset on mobile) with: **line tabs** (Tours, Hotels, Transfers, Vehicles, Treks, Flights, Packages — icons + labels; active = brand underline), then **line-specific field row** (§8.5 specs), then primary button ("Search").
- Behavior: tab switch morphs fields (200ms), preserves entered values per tab (session memory); submit → results URL with params; keyboard: tabs are a proper tablist; mobile: tabs become a horizontal scroll row (snap), fields stack, button full-width.
- Dual output: instant-capable lines go to results; Flights/quote-only go to their quote-flow pages (label on button changes: "Find tours" vs "Request flight quotes" — honest verb, PRD §26).
- Empty state: no pre-filled suggestions (no invented data); placeholder text only (e.g., "Where to? Pokhara, Chitwan…").

**S3 — Popular destinations `[MVP]`**

- Purpose: discovery for destination-driven travelers (P2, P3).
- Layout: carousel `DestinationCard` (§8.4) — 2 compact (mobile) → 3 (md) → 4 (lg); drag/swipe; "See all destinations →".
- Data: geo hubs with ≥ 1 published service (ordered by ops ranking); card: photo, name, country, live count chip ("38 tours · 12 hotels" — real counts), top line badge.
- Fallback: < 3 hubs → hide section.

**S4 — Popular services (line tiles) `[MVP]`**

- Purpose: quick access for line-driven travelers (P1, P6).
- Layout: 8-tile grid (2×4 mobile, 4×2 desktop): icon + label + one-line promise ("Airport transfers that wait for your flight"). Tiles link to list pages.
- Lines: Vehicle Rental, Airport Transfers, Tours, Trekking, Hotels, Flights (badge: "Quotes by partner agencies"), Packages, Corporate travel.
- No counts, no fake stats; promises are value statements (product-owned copy).

**S5 — Popular tours `[MVP]`**

- Purpose: social-proof-adjacent conversion for the highest-intent line.
- Layout: 4 `ServiceCard` (tour variant) + "See all tours →"; label: "Popular tours" with sub "Hand-picked by our team" (MVP honesty label).
- CTA per card: "View details" (secondary) + price/from.

**S6 — Vehicle rental `[MVP]`**

- Purpose: domestic road-trip segment (P1, P5).
- Layout: intro row (h2 + "With driver or self-drive" toggle that re-filters the row) + 4 `VehicleCard` (vehicle variant).
- Card meta: class icon, seats, fuel, "from NPR X/day".

**S7 — Hotels & resorts `[MVP]`**

- Layout: 4 `HotelCard` (gallery-strip thumb, star (vendor-declared, tooltip "vendor-reported"), amenity chips ×3, "from / night").
- Sub: "Direct with hotels" (differentiator vs OTA — true for our model, PRD §27).

**S8 — Transfers `[MVP]`**

- Purpose: the classic first-Nepal-need (airport pickup) — conversion + trust builder.
- Layout: **route pills row** (Kathmandu Airport ⇄ City · Pokhara · Chitwan · Bhairahawa — each a search deep-link) + 4 `TransferCard` (route-with-arrow layout, duration, vehicle class, price/vehicle).
- Pill tap → `/transfers?route=…` pre-filled.

**S9 — Family packages `[MVP]`**

- Purpose: P7 segment, higher AOV.
- Layout: editorial split: left copy (h2 "Made for families", 2–3 benefit bullets, CTA "Browse family packages"), right: 3 `PackageCard` (family-flagged; days, inclusions count, per-person price).
- Fallback: < 3 family packages → section becomes a banner with CTA only.

**S10 — Corporate travel `[MVP]`**

- Purpose: P6/P8 acquisition (PRD §24).
- Layout: full-width `brand-800` band (the one dark section): headline + 3 benefit columns (Approval controls · Budget policies · Consolidated statements — feature-true, no invented stats) + dual CTA ("Open a corporate account" primary-inverse / "Plan a group trip" ghost).
- CTA targets: `/corporate` landing (→ register with corporate role).

**S11 — AI Travel Planner `[MVP: "Build Your Trip"]` `[V2: AI]`**

- Purpose: multi-component itineraries (PRD §23/§25) — with **honest labeling** (PRD R-3):
  - **MVP state:** section titled **"Plan a custom trip"**; sub "Flights, stays, rides and tours — one request."; visual = 3-step horizontal (Pick your pieces → We prepare one offer → Book with confidence); CTA "Start planning" → `/custom-trip`. A small caption: "Coordinated by our trip desk" (human-in-loop disclosure, PRD CT-01).
  - **V2 state (feature-flagged, when LLM planner ships):** same slot upgrades to "Ask the Easy Trip planner" with chat entry + "powered by AI — prices & availability from our live listings" microcopy; MVP design slot must fit both (design once).
- Layout: `bg-tint` card with step visual left, copy + CTA right (stack on mobile).

**S12 — Travel inspiration `[MVP]`**

- Purpose: SEO + delight + return visits (PRD §32 content ops).
- Layout: 3 `GuideCard` (cover, category chip, title, read-time) — "See all guides →".
- Fallback: < 3 guides → hide (content ops cadence 2/month, PRD §32.4).

**S13 — Reviews `[MVP — renders only with real data]`**

- Purpose: trust (PRD §17 verified-only).
- Layout: quote-style `ReviewCard` strip (3): stars, text, reviewer name (first name + initial), service + destination, "Verified purchase" badge.
- **Pre-launch/insufficient state: section hidden** (no placeholder quotes, no stock avatars — PRD GC-3).

**S14 — Trust section `[MVP]`**

- Purpose: objection handling near the funnel base.
- Layout: 4-up icon row (stack 2×2 mobile): **Verified vendors** (approval process, PRD §15) · **Secure payments** (provider-verified, no card storage, PRD §19) · **Clear cancellation policies** (shown before you pay, PRD §13) · **Real human support** (human support hours stated truthfully — "support @ [hours]" product-set, no 24/7 claim unless true).
- No numbers, no awards, no invented partners.

**S15 — Newsletter `[MVP]`**

- Purpose: retention channel (re-engagement `[V1.5]`).
- Layout: inline band (not a modal — never an exit-intent popup): headline "Trip ideas, route guides, and deal alerts", single email field + button, privacy microcopy ("One or two emails a month. Unsubscribe anytime."), consent recorded (PRD §34 privacy).
- Validation: inline; success state replaces form ("You're in — first guide arrives soon").
- Rule: no pre-checked boxes; no double-opt-in spam (single confirmation email with link — honest).

**S16 — Footer** → §8.9.

### 7.3 Conversion focus (homepage)

| Rule                                 | Spec                                                                                                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CV-01 First action within 1 viewport | Search card top edge ≤ 70vh on mobile, ≤ 60vh desktop                                                                                                    |
| CV-02 One primary CTA per section    | Sections use exactly one primary action; "See all" is always secondary                                                                                   |
| CV-03 CTA vocabulary                 | §Appendix C (consistent verbs: Search / View details / Book now / Request a quote / Start planning)                                                      |
| CV-04 Trust adjacency                | Trust row (S1) under search; trust band (S14) after content sections; policy icons on cards where line supports (Free cancellation)                      |
| CV-05 No friction traps              | No newsletter modal, no cookie banner blocking content (consent bar bottom, dismissible, non-essential only — PRD §34 AN-01), no login wall on discovery |
| CV-06 Section CTA tracking           | Every section CTA fires `page_cta_click {section, line}` (PRD §34 taxonomy)                                                                              |
| CV-07 Mobile thumb zone              | S2 search, S8 route pills, S11 CTA positioned for one-hand use; bottom sheet quick-access on Explore tab                                                 |
| CV-08 A/B candidates (V2 framework)  | Hero copy; search tab order; S9 editorial vs grid — **no A/B tooling in MVP** (PRD §34.4)                                                                |

---

## 8. Reusable Component Specifications

Spec format per component: **Purpose · Variants · Anatomy · States · Tokens · Accessibility · Responsive · Rules (do/don't)**. Interface sketches are API contracts only (no logic).

### 8.1 Buttons

**Purpose:** primary actions; the product's conversion vocabulary.

**Variants**

| Variant       | Look                                                                     | Use                                                             |
| ------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `primary`     | bg `brand-600`, white text                                               | The one main action per view (Book now, Search, Submit, Pay)    |
| `secondary`   | 1px `brand-600` border, `brand-700` text, white bg; hover: `brand-50` bg | Request a quote (dual-CTA pair), View details                   |
| `tertiary`    | text-only `brand-700` + optional chevron                                 | "See all", links-as-buttons                                     |
| `destructive` | bg `danger-600`, white                                                   | Cancel booking, Delete (always paired with confirm dialog §8.7) |
| `ghost-dark`  | white text, 1px white/40 border                                          | CTAs on dark imagery/bands (S10)                                |
| `icon`        | square, borderless, `ink-600` → hover `ink-900`                          | Close, back, sort; always `aria-label`                          |

**Sizes:** `sm` h-36 (text `body-sm`), `md` h-44 (text `body`, default), `lg` h-52 (text `body-lg`) — hero/checkout; full-width below `sm` in forms/checkout.

**States**

| State         | Behavior                                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| hover         | bg darken one step / tint; icon buttons: `bg` tint circle                                                                        |
| active        | 1px translate-y + shadow remove                                                                                                  |
| focus-visible | `focus-ring` (never removed)                                                                                                     |
| disabled      | `border-200` bg, `ink-400` text; **keep label** (tooltip explains why, optional)                                                 |
| loading       | inline spinner replaces icon (or left-padded), width locked, label preserved ("Booking…"), input disabled — never a silent click |
| error-shake   | on failed submit: 180ms x-axis shake + field errors (not the button itself as error carrier)                                     |

**Rules**

- BT-01 One `primary` per view (dual-CTA pattern = `primary` + `secondary` side by side, never two primaries).
- BT-02 Label = verb + object ("Book now", "Request a quote", "Save changes"); no "Submit", "OK", "Click here".
- BT-03 Minimum width 96px (sm) to keep alignment; icon-only requires `aria-label` + tooltip on desktop.
- BT-04 Split button (e.g., "Pay · bank transfer") only where a secondary selection genuinely exists — else single button.
- BT-05 Loading state is **optimistic-safe**: if the server command is idempotent (PRD BK-1), the button may re-enable after timeout with "Try again".

**Sketch:** `Button { variant, size, leadingIcon?, trailingIcon?, loading?, full? }` → `<button>`/`<a>` polymorphic.

### 8.2 Forms (layout & patterns)

**Purpose:** all data entry (auth, checkout, quote request, vendor forms, admin actions).

**Layout**

- Label **above** field (never floating-only; mobile a11y), helper text under label (`body-sm`, `ink-600`), error text under field (`danger-700`, icon, `body-sm`).
- Field width: full column on mobile; 2-col at `md` for paired fields (first/last, from/to); date-range spans full.
- Section grouping: fieldsets with `legend` (h3); visual separator 24px between groups.
- Single submit at bottom (primary, full-width on mobile); multi-step forms show step progress (§8.6 BookingStep) and validate per step.

**Validation pattern**

- VF-01 Validate on **blur** (first pass) + on **submit** (all); success shows nothing (no green noise) except on email-verification-style fields.
- VF-02 Error summary: on failed submit, focus jumps to a top summary card (danger tint) listing errors as links to fields (`aria-live=assertive`).
- VF-03 Never clear user input on error; mark field (border `danger-600` + ring) + message (specific: "Enter a valid phone with country code, e.g. +977 98…").
- VF-04 Server validation re-checks everything (PRD GC-5); server errors map to the same field-error component with server error code (hidden in text, shown in reference line).

**Rules**

- One primary action per form; Cancel = tertiary ("Go back"), never destructive-styled for benign exits.
- Long forms (vendor onboarding): progress bar + per-section completion + autosave draft (draft state visible: "Saved 12:04").
- All forms state machine: `idle → validating → submitting → success | error` (success replaces form with confirmation state, not a page jump, where possible).

### 8.3 Inputs (field components)

| Input                          | Spec highlights                                                                                                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TextField`                    | `sm/md/lg` heights (36/44/52); left icon slot (search, phone); trailing slot (clear ✕, eye for password); counters for maxlength (right, caption)                                                         |
| `PasswordField`                | show/hide (aria-pressed), strength meter **not** used (policy-driven), breach-list check message from server (specific: "This password appears in a data breach — choose another")                        |
| `PhoneField`                   | country-code selector (default from account/IP region, overridable) + number; E.164 output (PRD CV-02); flag + code chip                                                                                  |
| `SelectField`                  | native `<select>` styled (a11y-first, mobile-perfect); searchable select `[V1.5]` (combobox pattern); option groups; empty-value prompt option                                                            |
| `DateField` / `DateRangeField` | custom calendar (month view, range highlight, disabled dates = past/off-season), mobile: native input fallback; presets ("Tomorrow", "Next weekend"); min/today rule per line (PRD HB-03)                 |
| `StepperField`                 | − / value / + (min/max, step); 44px buttons; used for party size, room count; value center `body` 600                                                                                                     |
| `Toggle` / `Switch`            | on/off setting ("Add-ons", preferences); label + description; never for form _data_ (use checkbox)                                                                                                        |
| `Checkbox` / `Radio`           | 20px box, 44px hit area, label left-aligned; radio groups with `fieldset`+`legend`; required-consent checkbox unchecked by default                                                                        |
| `OtpField`                     | 4–6 boxes, auto-advance, paste-friendly (splits pasted code), resend countdown ("Resend in 00:45" — honest timer), shake on wrong code                                                                    |
| `FileUpload`                   | drag-drop + tap-to-browse; type/size rules shown before upload ("PDF or JPG, max 5MB"); queue list (name, size, progress, remove); per-file error state; **no file opens in-browser** (security, PRD §33) |
| `SearchInput`                  | magnifier icon, clear button, `role=combobox` results dropdown (keyboard navigable), debounced 250ms (PRD SE)                                                                                             |
| `MoneyInput`                   | read-only in MVP (prices are system-computed, PRD GC-4); admin/finance fields only, suffix currency, decimal rules per currency                                                                           |

**States (all inputs):** default / hover / focus (border `brand-600` + ring) / disabled (bg `bg`, cursor) / error (as VF-03) / success (rare, e.g., email-verified check icon).

**A11y:** visible labels always; `aria-describedby` → helper/error ids; `aria-invalid` on error; radio/checkbox groups announce selected; date pickers keyboard-navigable (arrows + Enter + Esc) with `aria-live` range announcement.

### 8.4 Cards (one card system — DP-5)

**Purpose:** every marketplace item renders from a single card anatomy; line variants change only media treatment + meta rows. Consistency is the marketplace pattern (DP-5).

**Canonical anatomy**

```
┌──────────────────────────────────┐
│ Media 4:3 (destination 3:2)       │  blur-up image / route graphic (CD-03)
│  [badge][badge]        [♡]       │  ≤2 badges top-left (§8.13) · wishlist
├──────────────────────────────────┤
│ Title            (h3, 2-line)    │
│ Meta row 1  (body-sm, ink-600)   │  destination / route / property
│ Meta row 2  (icon + label ×2-3)  │  line-specific attributes
│ ★★★★☆ 4.6 (128)                  │  only with real reviews (§8.14)
├──────────────────────────────────┤
│ From NPR 4,500 / day   →         │  price block (§8.15) + affordance
└──────────────────────────────────┘
```

**Line variants**

| Variant                                                 | Media                                                               | Meta rows                                            | Price                                          | Notes                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `ServiceCardBase` (tours, treks, packages, experiences) | 4:3 photo                                                           | destination · duration · group size (or nights/days) | `PriceFrom` "/ person" or "/ trip"             | badges: Instant Book, Free cancellation, Featured (ops)                                              |
| `HotelCard`                                             | 4:3 + 2nd thumb overlay ("+3")                                      | property name · star (caption "vendor-reported")     | `PriceFrom` "/ night"                          | amenity chips ×3 (vendor-declared)                                                                   |
| `VehicleCard`                                           | 4:3 vehicle photo                                                   | class · seats · fuel · driver/self-drive             | `PriceFrom` "/ day"                            | "With driver" / "Self-drive" badge                                                                   |
| `TransferCard`                                          | **no photo** — route layout: `● KTM Airport → Kathmandu` + duration | pickup mode (meet & greet) · vehicle class chip      | `Price` "/ vehicle"                            | scheduled variant shows next departure time (real data)                                              |
| `FlightCard`                                            | route layout + dates                                                | pax/class summary                                    | `PriceOnRequest`                               | **"Quotes by partner agencies"** badge (info) — no live fares (PRD §26 AT-02); CTA "Request a quote" |
| `DestinationCard`                                       | 3:2 photo                                                           | name · country                                       | — (count chips: "38 tours · 12 hotels" — live) | whole card = link                                                                                    |
| `GuideCard`                                             | cover                                                               | category chip · read time                            | —                                              | whole card = link                                                                                    |
| `VendorCard` `[V1.5]`                                   | mark/logo                                                           | line chips                                           | —                                              | rating summary; "View vendor"                                                                        |
| `TripCard` (My Trips)                                   | no media — status strip (StatusBadge §8.13 + date)                  | service title · vendor                               | total paid (read-only)                         | next-action CTA per state ("Pay" / "Track" / "Review")                                               |
| `OfferCard`                                             | —                                                                   | —                                                    | —                                              | full component, not a list card (§8.6)                                                               |

**Rules**

- CD-01 **One link per card:** media + title form a single focusable link to detail; internal interactive elements (wishlist ♡, explicit CTA button) are separate controls with their own focus — never nested links (a11y).
- CD-02 Price block is **always present**: `PriceFrom` (published) or `PriceOnRequest` (quote-only) — never blank (PC-01).
- CD-03 Media: blur-up (§4.6); `alt` = "{title} — {destination}"; fallback = `brand-100` tile + line icon. No autoplay, no video in cards.
- CD-04 Hover (desktop only): elev-1→elev-2 + 2px lift (150ms), media zoom 1.03× (300ms), title → `brand-700`; mobile: press state 96ms, no lift.
- CD-05 Badges ≤ 2 on card (reliability > policy > merchandising); remaining attributes live on detail. Wishlist: ♡ outline → filled `brand-600` + toast "Saved to wishlist" (optimistic with revert, LD rule).
- CD-06 `compact` variant (home carousels / 2-col mobile): 16:9 media crop, one meta row, stars without count.
- CD-07 Every variant ships a skeleton twin (§8.17) matching its geometry.
- CD-08 Grids: results 1→2→3 col; home carousels 2→3→4; gap tokens per §4.3; fixed media ratio + clamped title keeps rows visually even without height stretching.

### 8.5 Search components

| Component                      | Spec                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UniversalSearch`              | Homepage S2 anatomy (§7.2): `LineTabs` + `LineSearchForm` + submit. Tab = `role=tablist`; form fields per line below; state preserved per tab (session).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `LineSearchForm`               | **Tours/Treks:** destination (SearchInput w/ geo autocomplete), date-range, party (Steppers adults/children), [trek: duration chip row]. **Hotels:** destination, date-range, guests (adults/children/rooms). **Vehicles:** pickup location, pickup datetime, return datetime, class filter (chip row optional). **Transfers:** route (origin→destination SearchInputs with swap button), date, time window, pax. **Flights:** origin/destination (airports), date (or range round), pax, cabin select — button label "Request flight quotes" (PRD §26). **Packages:** destination, dates (flexible toggle chip "±3 days"), party, budget band select (guidance only, PRD CT-04). |
| `SearchBar` (header, `[V1.5]`) | Collapsed: icon + "Search…" (expands on focus); quick-results dropdown (top 5 matches); full search via S2 / list pages.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `GeoAutocomplete`              | Typeahead over geo tree (PRD GC-1: country→state→district→city); returns typed value (`{kind, id, label, path}`); keyboard listbox pattern; recent searches (device-local only).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `ResultsHeader`                | "N results" (h1 for SEO) + active-filter chips (removable) + sort menu (relevance/price↑/price↓/rating/newest/duration per line) + density? (no) — sticky on mobile.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `FacetPanel` / `FacetSheet`    | Desktop: sticky rail, accordion facets (destination, dates, price range, rating, line-specific sets per PRD §21); Mobile/tablet: bottom sheet (`Filter · n active`, apply button "Show N results").                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `FacetGroup`                   | title + controls (checkbox list w/ counts, price = dual-thumb range (display currency, PRD §21 FA-04), rating = radio chips 2.5/3.5/4+, date, duration, mode Instant/Quote)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `FilterChip`                   | removable pill in header row; counts in facets use `tabular-nums`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `SortMenu`                     | dropdown (not native) for design consistency; `aria-haspopup=listbox`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `NoResults`                    | Empty state variant (§8.16): icon + "No matches for …" + relax suggestions (as buttons: "Clear dates", "Clear price", "Clear all") + popular links. Never auto-clears silently.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

**Rules:** SE-URL sync (all params in URL, PRD RM-01); facet counts = server-side over filtered set (PRD SE-02); search submissions tracked (`search_performed {line, query, filters}`); results skeleton while fetching (§8.17).

### 8.6 Booking components

| Component                        | Spec                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BookingPanel`                   | Detail-page right column (desktop) / bottom-sheet + sticky CTA (mobile). Anatomy: availability header (selected dates or "Dates"), party row, add-ons, `PriceBreakdown`, policy mini-strip (cancellation summary + "Full policy" → modal), primary CTA. Dual state: **instant** → "Book now — NPR 12,400"; **quote-only** → "Request a quote" (primary) + microcopy "A vendor replies within 24h" (SLA from PRD §8, product-set).                                                    |
| `PriceBreakdown`                 | Itemized rows (base, add-ons, date surcharge, taxes "VAT (13%)", discount `[V1.5]`) → divider → **Total** (`price` token, 700). Collapsible "Price details" on mobile. `≈` display-currency row under total (PRD PR-02, tooltip: rate source + as-of). Tax-inclusion chip ("incl. taxes" / "excl. taxes — see checkout").                                                                                                                                                            |
| `PartySelector`                  | Steppers (adults/children/rooms) + age-band note where child pricing applies (PRD §11.3); live total update (200ms fade, no scroll jump).                                                                                                                                                                                                                                                                                                                                            |
| `AddOnList`                      | Checkbox rows: label + short description + `+NPR X` right; selection updates breakdown; "vendor will confirm" tag on non-inventoried add-ons (PRD TF-06 child seat, VB self-drive extras).                                                                                                                                                                                                                                                                                           |
| `OfferCard` (quote)              | Version chip ("Offer v2"), vendor name + verified badge, validity ("Expires in 1d 04h" — countdown, honest timer), itemized `PriceBreakdown`, terms summary (3 bullets max + "Full terms" modal), actions: **Accept offer** (primary) / "Request changes" (secondary → 1-line form, capped PRD §10.4) / Decline (tertiary danger-text). Accepted → locked state (read-only, "Accepted · expires at payment").                                                                        |
| `CheckoutFlow`                   | 3 steps: **1 Details** (traveler/contact per line; corporate: approver notice "Awaiting corporate approval — payment unlocks after approval", PRD CO-03) → **2 Payment** (`PaymentMethodPicker` + order summary side) → **3 Confirmation** (success state: reference ID, next steps, vendor SLA, "View in My Trips"). Progress: `BookingStepIndicator` (numbered, check on complete, current ring, future muted; mobile: "Step 2 of 3 — Payment"). Draft persistence 7d (PRD §10.7). |
| `PaymentMethodPicker`            | Radio cards (wallet logo / card brand marks — from provider capability matrix, PRD §19.3; bank transfer = instructions card with booking reference + countdown 48h + "I've paid" → admin-verify state); disabled method shows reason ("Unavailable for this booking"). **No free-text amount field anywhere** (GC-4).                                                                                                                                                                |
| `PaymentState`                   | `processing` (spinner + "Contacting your bank — don't close this window" + step hints) / `success` (green check, summary, reference) / `failed` (specific reason from provider code mapped to plain text + **Try again** + "Choose another method") / `pending_manual` (bank transfer: countdown, "What to do" 3 steps). Never a generic "error".                                                                                                                                    |
| `VoucherCard`                    | Post-confirmation: trip title, dates, vendor + driver/agent contact (tel/mail buttons), meeting point, reference ID (mono, copy button), policy summary, buttons: View itinerary / Download PDF / Cancel (→ §8.7 confirm) / Share (link `[V1.5]`). Air: PNR + e-ticket download after issuance (PRD §26).                                                                                                                                                                            |
| `TripStatusTimeline`             | Horizontal (desktop) / vertical (mobile) state path from PRD §10.3 (relevant subset per mode: e.g., quote: Submitted → Offer → Paid → Confirmed → In progress → Completed): nodes = dot + label + timestamp (past = brand, current = ring pulse, future = muted; terminal CANCELLED = danger with reason + "What happens next" (refund) inline).                                                                                                                                     |
| `CancellationPolicyPanel`        | Tier table (window                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | charge) with the **current window highlighted** (computed at render, timezone-aware, PRD CN-03) + rule notes (no-show, air = agency rules, PRD CN-04) + "Ask for an exception" (support CTA) where allowed. |
| `CancelFlow`                     | Modal (§8.7) with policy preview (component above) → typed confirmation for irreversible (enter "CANCEL") on paid bookings → result state (refund created: amount, method, timeline text per PRD RF-05).                                                                                                                                                                                                                                                                             |
| `TravelerForm` / `PassengerForm` | Per-line traveler fields; air: passport number field (masked display after entry — "••••1234", PRD AT-04), name-match confirmation checkbox ("Name exactly as in passport"); corporate: traveler picker.                                                                                                                                                                                                                                                                             |
| `ItineraryBlock`                 | Day-by-day accordion (tours/treks/packages): day header (date + title), bullets, inclusions/exclusions two-column (✓ / ✕ lists) — structured data from PRD TR-02, never free text only.                                                                                                                                                                                                                                                                                              |
| `ReviewComposer`                 | After completion: stars interactive (§8.14) + textarea (2000 max, counter) + photo upload (≤5) + submit; eligibility enforced server-side (PRD RV-01) with specific ineligible messages.                                                                                                                                                                                                                                                                                             |

### 8.7 Modal system (`Dialog` / `Sheet`)

**One component, two presentations:** `Dialog` (centered card, desktop-first) and `Sheet` (bottom sheet on < md, PRD MB-03). Same API, presentation by breakpoint (or explicit `variant`).

| Size    | Width (dialog)         | Use                                                                |
| ------- | ---------------------- | ------------------------------------------------------------------ |
| `sm`    | 400                    | Confirmations (cancel booking, remove wishlist), OTP               |
| `md`    | 560                    | Forms (cancel flow, add-on request), policy reader, payment result |
| `lg`    | 800                    | Offer full terms, image viewer, vendor document status             |
| `xl`    | 1080                   | Side-by-side (compare detail, dispute evidence)                    |
| `sheet` | full-width, 90% height | Mobile presentation of md/lg; filters; booking panel (mobile)      |

**Rules**

- MD-01 **One modal at a time** (exception: confirm on top of a form — max stack 2); no nested modals beyond that.
- MD-02 A11y: `role=dialog aria-modal=true`, focus trap, Esc = dismiss (guard: unsaved form → "Discard changes?" confirm), focus returns to trigger, body scroll locked, `aria-labelledby` = title.
- MD-03 Destructive confirm: danger icon, explicit consequence line ("You'll be charged per policy: NPR 2,400"), typed confirmation for high-value (≥ NPR 20,000 or paid bookings), buttons: [Keep booking] (primary) [Cancel booking] (destructive) — **safe action is primary**.
- MD-04 Never a modal on page entry (no cookie-modal; consent = bottom bar, §7.3 CV-05).
- MD-05 States: opening (scale+fade 150ms), content skeleton for async loads, closing (150ms); loading buttons per §8.1.
- MD-06 Sheets: drag handle + swipe dismiss (guarded when dirty form), `Done` bar where scrollable.

### 8.8 Navigation

**Header (desktop `lg+`)**

- Row 1 (utility, 36px, `bg`): left: "Nepal · NPR" (locale chip `[V1.5]`); right: Help · "Sell with Easy Trip" (vendor landing link, `brand-700` text) · Login / Account menu.
- Row 2 (main, 64px, white, `elev-3` on scroll, sticky): logo left (mark + wordmark, 40px tall) · primary nav center-left: **Destinations** (mega), **Tours**, **Trekking**, **Hotels**, **Vehicles**, **Transfers**, **Flights**, **Packages** · right: search icon (→ S2 pattern), notifications bell (badge), account avatar (menu: My Trips, Wishlist, Account, Corporate `[V1.5]`, Logout) · "Vendor login" as icon+text at `xl`.
- Mega menu (Destinations): 3 columns — Popular destinations (8, with thumb), Regions (Karnali–Mechi, PRD geo seed), Guides (3 links); overlay `elev-3`, opens on hover/click, closes on Esc/outside; keyboard: roving tabindex.
- Nav item states: default `ink-900` 500; hover: `brand-700` + 2px underline offset 6; active page: `brand-700` + persistent underline; focus-visible ring.
- Condensed (scrolled): row 1 hides, row 2 → 56px.

**Header (mobile < md)**

- 56px: logo (mark only + "easytrip" wordmark), right: bell, avatar (or "Login" text). Search via bottom-tab Explore (S2 on Explore tab) + long-press? No — search icon always present (opens sheet with line tabs).
- **Bottom tab bar** (64px + safe-area): Home · Explore (search+lines) · Trips · Wishlist · Account; active: `brand-600` icon+label; badge: Trips (active count, `accent-500` chip), bell dot in header.

**Tablet (md–lg):** header nav visible with tighter spacing; mega menu → simple accordion dropdowns; no bottom bar (header search icon present).

**Breadcrumbs**

- Pattern: Home / {Line} / {Name} (list pages: Home / {Line}; deep: Home / {Line} / {Name} / {Step}). `caption` size, `ink-600`, links `info-700`; truncated middle levels on mobile ("…" menu, PRD RM-05); on detail pages, breadcrumb sits above title; skip-link first.

**In-page navigation (detail pages)**

- Sticky sub-nav tabs (below header, `lg+`; mobile: swipeable tab row + snap sections): Overview · Itinerary/Rooms · Pricing & add-ons · Reviews · Policies. Scroll-spy active state; anchor links from breadcrumb/menu.
- Mobile: sticky CTA bar (MB-02) + "Jump to" sheet (☰ on detail).

**Account menus & dropdowns**

- Consistent `Menu` component: 8px item padding, 12 icon left, chevron/right-action slot, dividers, danger item last; keyboard full support; closes on route change.

### 8.9 Footer

**Structure (all pages, condensed on utility pages)**

- `brand-900` bg, text `surface`/70, links `surface`/90 hover underline; 5 columns at `lg` (2×2 + brand col on mobile stacked, accordion optional):
  1. **Book:** Tours · Trekking · Hotels · Vehicle Rental · Transfers · Flights · Packages · Corporate travel
  2. **Discover:** Destinations · Travel guides · Deals `[V1.5]` · My Trips · Wishlist
  3. **Company:** About · Contact · Help center · Security · Vendor terms
  4. **Vendors:** Sell with Easy Trip · Vendor login · Vendor portal · Approved-vendor FAQ
  5. **Stay in touch:** newsletter mini-form (same component as S15, compact; or link if already subscribed inline) + contact row (phone/email, hours stated truthfully) + social icons (only real accounts).
- Bottom bar: "© {year} Easy Trip Nepal" · Terms · Privacy · Security disclosure · payment method marks (from verified capability matrix — only methods actually enabled, PRD §19.3) · "Proudly Nepali — built for travelers everywhere" (positioning line, no flags/logos copied).
- Language switch `[V1.5]` (EN/NE) top-right of footer.
- Back-to-top: floating icon button after 800px scroll (a11y: `aria-label`, respects reduced motion — instant jump if reduced).

---

### 8.10 Alerts & toasts

**Three distinct mechanisms (never mixed):**

| Mechanism     | Placement                                                        | Lifetime                                                           | Use                                                                                                                         |
| ------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `InlineAlert` | In content flow (above form, under section, in panel)            | Persists until resolved/dismissed                                  | Field-context errors, policy warnings, offer-expiry banners, verification states                                            |
| `BannerAlert` | Page-top, below header                                           | Persists until dismissed or action done                            | System-wide: maintenance, airport closure (PRD TF-08 edge), vendor suspension notice (account-level), payment-method outage |
| `Toast`       | Top-right (desktop) / above bottom tab bar (mobile); stack max 3 | Auto 5s (info/success), **persistent for errors** (manual dismiss) | Async feedback: wishlist saved, offer submitted, copy to clipboard, upload done                                             |

**Anatomy (all):** icon (semantic) + title (600, `body-sm`/`body`) + message (`body-sm`) + optional action (tertiary) + dismiss (icon, ≥ 44px hit).
**Variants:** `success` (moss check), `info` (sky), `warning` (amber triangle), `danger` (crimson alert). Bg: 50-tint; border-left 3px base color; text 900/700. On dark surfaces: elevated card with variant icon + white text.

**Rules**

- AL-01 `aria-live`: toasts = `polite` (assertive only for payment failures); banners = `polite`; inline errors = `assertive` (VF-02).
- AL-02 One toast per event (dedup by idempotency key, mirrors PRD NF-01); queue overflow drops oldest info toasts (never errors).
- AL-03 Toast copy: short outcome + one action max ("Wishlist saved — View"). No links longer than 2 words.
- AL-04 Payment failures: **not** toasts — `PaymentState` component (§8.6) in-flow (too important to dismiss).
- AL-05 Banners survive navigation (session-scoped, e.g., outage banner) but not login changes; dismiss stored per session.

### 8.11 Notifications (in-app center)

**Purpose:** PRD §18 in-app channel; the durable record of email contents for logged-in users.

**Layout**

- Header trigger: bell icon + unread badge (count, `accent-500`, capped "99+").
- Panel (`lg`): dropdown card (400px) with top 5 + "View all"; full page `/account/notifications` (list, 720px): filter tabs (All · Bookings · Offers · Payments · Account), each row: type icon (in colored circle), title (600), snippet (`ink-600`), timestamp (relative, "2h ago"; absolute on hover/focus), unread dot, action slot ("Review offer" → deep link), chevron.
- Vendor/admin variants: SLA countdown chip on actionable items ("Offer due in 6h", `warning`), priority dot for SEV (admin system alerts), bulk "Mark all read".

**Rules**

- NT-01 Types map 1:1 to PRD §18.2 event catalog (icon + color per type: booking=brand, offer=info, payment=success/danger by outcome, refund=warning, review=accent, document=neutral, system=danger).
- NT-02 Unread = server state (not local); mark-read fires on open; polling/refresh via app events (no long-poll spam); badge updates optimistically.
- NT-03 Retention: 90 days in-app (email is the archive — stated in help center); empty state per filter.
- NT-04 Every notification deep-links to the exact state (booking id, offer version) — no dead links after state changes (fallback: booking page + explanation chip).

### 8.12 Tables (`DataTable`)

**Where:** vendor & admin portals, reports, My Trips (desktop), compare view.

**Anatomy:** toolbar (title + result count, filter controls, actions: Export CSV `[per PRD RP-03 audited]`, refresh) → column header row (sortable: icon states none/asc/desc; `aria-sort`) → body rows → footer (pagination + row summary "Showing 1–25 of 132").

**Column types:** text (left), mono (refs/PNR, left), amount (right, `tabular-nums`, currency), date (relative+absolute), status (`StatusBadge` §8.13), action (right, icon buttons max 3 + "More" menu).

**States:** loading (skeleton rows ×8), empty (inline empty state, compact), error (inline alert + retry), row-selected (brand-50 + checkbox), row-hover (bg tint), keyboard-focusable rows (Enter = primary action), sticky header, row density `cozy` (56px) / `compact` (44px, admin only).

**Responsive (critical):** below `lg`, each row becomes a **stacked card**: title row (primary value + status badge), 2-col key/value grid, action row. No horizontal scroll as a fallback (exception: reports tables with > 6 columns may scroll with first column sticky + on-screen hint — flagged in design review).

**Rules**

- TB-01 Server-side pagination (page size 25 default; 10/25/50 options); URL-synced (page, sort, filters) — shareable.
- TB-02 Bulk actions (admin: multi-select) with confirmation naming counts ("Suspend 3 vendors?").
- TB-03 Amounts never left-aligned; dates one format per table (default `12 Sep 2026, 14:30` local tz label, PRD RP-02).
- TB-04 Cap: max 12 columns on screen; overflow → "More" detail drawer (`lg` dialog), never column cramming.

### 8.13 Badges & chips

**Two families (don't mix):**

| Family                     | Shape                               | Use                                 | Examples                                       |
| -------------------------- | ----------------------------------- | ----------------------------------- | ---------------------------------------------- |
| `Badge` (status/attribute) | pill, caption, icon-optional        | Machine state & verified attributes | Booking status, offer state, vendor capability |
| `Chip` (filter/tag)        | pill with removable ✕ or selectable | User input & facets                 | Active filters, selected add-ons, tags         |

**Badge variants & colors (status = PRD §10 states):**

| Status           | Badge                                                                         |
| ---------------- | ----------------------------------------------------------------------------- |
| DRAFT            | neutral (`border-200` bg `bg`, `ink-600`)                                     |
| PENDING / QUOTED | info (`info-50` bg, `info-700` text, dot)                                     |
| AWAITING_PAYMENT | warning                                                                       |
| PAID             | info-strong (`info-100`, `info-700`)                                          |
| CONFIRMED        | success                                                                       |
| IN_PROGRESS      | brand (`brand-100`, `brand-700`, pulse dot — subtle, respects reduced motion) |
| COMPLETED        | success-soft (`success-100`, `success-700`)                                   |
| CANCELLED        | danger (`danger-50`, `danger-700`)                                            |
| REFUNDED         | neutral + check icon                                                          |
| FAILED           | danger strong (danger-600 bg, white)                                          |

**Attribute badges (cards):**

- "Instant Book" (brand outline) · "Free cancellation" (moss, calendar icon — only when policy truly has a free window, PRD §13) · "Verified vendor" (brand, shield) · "Featured" (accent-500 fill, ops-curated only) · "From NPR X" handled by `PriceFrom`, not a badge · "Only N seats left" (warning) — **only when published capacity ≤ 2** (PRD GC-3, CV-4) · "Price on request" (neutral, info icon) for quote-only · "≈ display currency" uses `PriceApprox` row, never a badge.
- Max 3 badges per card (visual noise cap); priority order: status/reliability > policy > merchandising.

**Chips:** selectable (checked: `brand-600` fill white text), removable (neutral bg, ✕), count suffix; hit area 32px min (touch 44 via padding).

### 8.14 Rating & review components

| Component              | Spec                                                                                                                                                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StarRating` (display) | 5 stars, 0.5-step precision (filled/half/empty; filled = `accent-600`, empty = `border-300`); sizes 16/20/24; aria: `role=img aria-label="4.5 out of 5"`; numeric adjacent always (never stars alone)                                                     |
| `RatingSummary`        | Average (1 decimal) + "(128 reviews)" + 5→1 histogram bars (brand fill, track `border-200`) — computed only from VISIBLE verified reviews (PRD RV-04); empty: "No reviews yet — verified reviews appear after completed trips" (never blank, never faked) |
| `ReviewComposer`       | Interactive stars (hover preview, keyboard: arrows 0.5 steps, announced), required; sub-ratings `[V1.5]` (line-configured, PRD §17.2)                                                                                                                     |
| `ReviewCard`           | Stars + text (clamped 4, "Read more" expands inline), date, reviewer (first name + initial, verified badge "Verified purchase"), service link, vendor reply block (indented, "Vendor response" label, its own date); flag action (tertiary, `aria-label`) |
| `VerifiedBadge`        | Small shield-check + "Verified purchase" (caption, `brand-700` on `brand-50`) — the **only** review badge (all are verified; PRD §17)                                                                                                                     |
| `ReviewList`           | Sort (newest / highest / lowest — verified only), pagination (5/page), loading skeletons, empty state per above                                                                                                                                           |

**Rules:** no star ratings on unverified/insufficient data (threshold: ≥ 1 review shows stars; display "New — no reviews yet" below); vendor self-review impossible at data level (PRD RV-05) so UI never offers it; histogram bar widths animate once on view (reduced-motion: none).

### 8.15 Price components

| Component              | Spec                                                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Price`                | "NPR 12,400" (code + amount, `price` token, tabular-nums); no decimals for NPR (integer rupees display; minor units stored, PRD GC-7); other currencies per symbol convention (US$ 90.00)                                 |
| `PriceWithUnit`        | `Price` + unit suffix (`price-unit`, `ink-600`): "/ day", "/ person", "/ night", "/ vehicle", "/ trip" — unit always present where pricing type is per-X (PRD §11.2); party-context note ("for 2 adults, 3 days" beneath) |
| `PriceFrom`            | "From NPR 4,500" — "from" in `ink-600` caption before the price; used on cards/listings per PRD §11.4 (min published price, labeled); quote-only: `PriceOnRequest`                                                        |
| `PriceOnRequest`       | "Price on request" (`ink-600`, info icon) + tooltip/inline "Availability & price set by the vendor on request" — never a guessed number (GC-3)                                                                            |
| `PriceBreakdown`       | §8.6 (itemized, total-emphasized)                                                                                                                                                                                         |
| `PriceApprox`          | "≈ US$ 91" row (`body-sm`, `ink-600`, "≈" mandatory) + expandable "Rate: 136.2 NPR/USD · source: admin table · as of 08 Sep 2026" (PRD PR-02/PR-04 — honest provenance)                                                   |
| `PriceStruck` `[V1.5]` | Struck original only when a **real** discount exists (PRD §11.5); never cosmetic                                                                                                                                          |
| `TaxNote`              | "Incl. 13% VAT" / "Taxes shown at checkout" chips (caption) — config-driven per PRD §11.3                                                                                                                                 |

**Rules**

- PC-01 **Total never hidden:** any surface showing a price shows the unit and (where multi-component) a "details" expand to the full breakdown — no "hidden fees" surface exists by construction.
- PC-02 Prices are always server-computed values rendered read-only (GC-4); no client-side arithmetic in display.
- PC-03 Rounding: display rounds to whole NPR; internal exact (PRD §11.6).
- PC-04 Money in badges/chips: only short forms ("From NPR 4,500") — full breakdown in panel.
- PC-05 Number format: Western grouping (1,234,567) across all currencies in MVP (decision; `Intl.NumberFormat` per currency locale for display only).

### 8.16 Empty states

**Pattern:** illustration/icon (120–160px, empty-state concept direction) + title (h3) + one-line description (`ink-600`) + primary action (contextual) + optional secondary. Centered in a min-height 320px region; compact variant (inline, 80px icon, for tables/panels).

**Catalog (message + action per state):**

| State                  | Title                                                       | Action                                                             |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| Search no results      | "No matches for "…""                                        | Relax filters (§8.5 NoResults)                                     |
| Filters empty          | "Nothing fits all these filters"                            | Remove chips / Clear all                                           |
| Wishlist empty         | "Your wishlist is empty"                                    | "Explore popular tours"                                            |
| Trips empty            | "No trips yet"                                              | "Plan your first trip" (S11 entry)                                 |
| Notifications empty    | "You're all caught up"                                      | — (secondary: "Browse help")                                       |
| Table no rows (vendor) | "No bookings yet"                                           | "Publish a service to start receiving" (onboarding checklist link) |
| Vendor no services     | "List your first service"                                   | Onboarding checklist (3 steps, PRD §8 vendor journey)              |
| Guest session          | "Sign in to save trips & wishlist"                          | Login (preserves guest data, PRD §22 WL-01)                        |
| Reviews empty          | "No reviews yet"                                            | "Reviews appear after completed trips" (no CTA)                    |
| Offer pending          | "We're preparing your offer" (not empty — loading-adjacent) | SLA text ("Usually within 24h") + "Need help?"                     |
| 404 / 500              | §8.18                                                       | —                                                                  |

**Rules:** ES-01 Empty ≠ error (no danger colors); ES-02 always offer a forward path (or an honest explanation when none — reviews); ES-03 illustrations: original, two-tone (empty-state concept), one per state family (not 20 unique arts); ES-04 never show skeletons as empty (distinct visual languages, §8.17).

### 8.17 Loading states

**Ladder (prefer left):** instant (local) → skeleton → optimistic update → spinner (inline, < 1s) → progress (file upload) → timeout → error (§8.18).

| Pattern          | Spec                                                                                                                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Skeleton`       | Shimmer-block placeholders matching final layout geometry (card skeleton: media 4:3 + 3 lines + price line; table: 8 rows; detail: hero + panel). `bg` tone blocks on white; 1200ms loop; **reduced-motion: static blocks** (no shimmer) |
| `Spinner`        | 20px inline (buttons, small async), 32px standalone (rare); always paired with text ("Checking availability…") when > 1s; never a bare page spinner                                                                                      |
| `PageTransition` | First paint: branded minimal (mark pulse) ≤ 1.5s, then content; route changes: content fade 150ms (no full-page white flash); PWA offline: banner, not spinner                                                                           |
| `Progress`       | Uploads: per-file bar + %; checkout: step indicator (no fake percent)                                                                                                                                                                    |
| `Optimistic`     | Allowed: wishlist add/remove, mark-read, like — with instant revert on failure + toast; **never** for money/booking state (GC-4)                                                                                                         |
| `Timeout`        | > 8s: add "Taking longer than usual" + [Retry] [Cancel] (cancellable where safe); > 30s: error state                                                                                                                                     |

**Rules:** LD-01 Skeletons only where layout is predictable; LD-02 content loads top-down (LCP first — PRD §32.3); LD-03 images: blur-up placeholder (§4.6); LD-04 inputs never disabled during unrelated loads; LD-05 search: keep previous results dimmed while new results load (no empty flash).

### 8.18 Error states

**Principles (copy system):** plain language · name the problem · give the next step · provide a reference ID for support · never blame the user. Template: "{What happened}. {Why, if known}. {What to do}."

| Surface                 | Design                                                                                                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `404`                   | Branded, centered: h1 "Page not found" + search box + 3 popular destination links + "Back to home"; no dead visuals                                                                                                                               |
| `500`                   | h1 "Something went wrong" + "Try again" (primary) + reference ID (mono, copy) + support CTA; incident banner variant for known outages (BannerAlert)                                                                                              |
| `503/offline`           | Offline banner (top, warning): "You're offline — some features paused" (local content still works)                                                                                                                                                |
| `403`                   | "You don't have access to this" + role-aware hint (vendor: "This area is for your organization's admins") + action                                                                                                                                |
| Form errors             | §8.2 (field-level + summary)                                                                                                                                                                                                                      |
| API/entity errors       | In-flow InlineAlert (danger) + retry where idempotent; toasts for non-critical                                                                                                                                                                    |
| Payment errors          | `PaymentState failed` (§8.6): specific mapped reason ("Your bank declined this payment — no money was taken"), Try again / other method / support; **reassurance line always** (no charge without webhook, PRD PY-01)                             |
| Booking errors          | Offer expired → OfferCard expired state + "Request a new offer" (1-tap, same inputs); availability lost (instant) → InlineAlert "This date just sold out" + alternate dates (real, from calendar) + quote CTA; validation failures → field errors |
| Webhook/provider outage | Vendor/admin: BannerAlert (status page link); customer: booking page shows last-verified state + "Status may be a few minutes behind" chip (honest, no fake states)                                                                               |

**Rules:** ER-01 Every error surface: reference ID (short, copyable) + support path; ER-02 Errors never block navigation (data can reload); ER-03 Retry buttons only where idempotent/safe (PRD BK-1); ER-04 Error text is plain-language mapping table (provider codes → copy) owned by product (no raw codes in UI); ER-05 Dark-mode-agnostic (errors must read on all surfaces).

---

## 9. Interaction & Motion

- MO-01 Durations: micro 120–150ms (hover, press, chip), standard 200ms (menus, sheets, tabs), page 250–300ms (fade/slide content). No motion > 400ms.
- MO-02 Easing: enter `cubic-bezier(0.2, 0, 0, 1)`; exit faster (150ms); no bounce/elastic anywhere (calm brand, DP-3).
- MO-03 Allowed motion inventory: hover lift (2px + elev-2), card media zoom on hover (desktop only, 1.03×, 300ms), sheet slide-up, menu scale-fade (origin top), tab underline slide, skeleton shimmer, focus ring fade (80ms), count-up numbers **off** (no marketing counters), pulse dot (IN_PROGRESS, 2s, subtle).
- MO-04 Prohibited: parallax, autoplay carousels (manual swipe/drag only, no infinite loop; position preserved), scroll-jacking, full-screen transitions, confetti, looping video.
- MO-05 `prefers-reduced-motion: reduce` → all motion replaced by instant/crossfade (100ms); carousels become paged buttons.
- MO-06 Carousels: accessible alternative mandatory (prev/next buttons + "n of m" indicator + swipe); keyboard operable; not used for content users must see (sections never hide content in overflow without "see all").
- MO-07 Feedback latency: any user action → visible response ≤ 100ms (local state first).

---

## 10. Accessibility Requirements (binding — WCAG 2.1 AA)

| Area               | Requirement                                                                                                                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contrast           | Text 4.5:1 (3:1 large); non-text UI 3:1 (CO-01); CI token audit in design QA                                                                                                                                                        |
| Focus              | Visible `focus-ring` on every interactive element; logical tab order; no traps (mega menu, sheets, dialogs restore focus)                                                                                                           |
| Keyboard           | 100% of functionality: nav (including mega menu, sheets, steppers, date pickers, carousels), forms (all inputs), tables (row actions reachable)                                                                                     |
| Screen reader      | Landmarks (header/nav/main/footer), heading hierarchy (TY-04), labels on all inputs, `aria-live` for toasts/results/errors (AL-01), tables with caption + scope, star rating announced numerically, charts/hero decorative `alt=""` |
| Touch              | ≥ 44px targets (MB-07); no hover-only (MB-04); bottom-nav safe-area; pinch-zoom **never** disabled                                                                                                                                  |
| Forms              | Label-before-input; errors linked (`aria-describedby`) + summary (VF-02); autocomplete attributes (name, tel, email, organization); OTP paste-friendly                                                                              |
| Localization-ready | No text in images (except branded art with `alt`); expandable text (no fixed width/height on text containers); Devanagari fallback stack (PRD V1.5, GC-1); date/number formats tokenized                                            |
| Color independence | Status = color + icon/text always (CO-04)                                                                                                                                                                                           |
| Motion             | Reduced-motion honored (MO-05)                                                                                                                                                                                                      |
| Testing            | axe-core automated checks in CI (Phase 03+); manual checklist per release (keyboard pass, VoiceOver/TalkBack pass on 5 core flows: search→book, quote, pay, cancel, vendor-confirm)                                                 |

---

## 11. Design QA & Handoff (for Phase 03+)

### 11.1 Token handoff

- Design tokens exported as the single source of truth (JSON) → mapped to CSS custom properties (Appendix A list) → Tailwind theme (Phase 03). **Components may only reference tokens**, never raw values (CI lint rule).
- Naming: `{category}-{role}-{modifier}` (e.g., `color-brand-600`, `sp-4`, `radius-md`, `elev-2`, `text-h2`, `font-display`).
- Component naming: PascalCase, domain-prefixed where ambiguous (`ServiceCardTour` vs `ServiceCardBase`); package boundary `@easytrip/ui` (web) consumed by all apps (PRD monorepo plan).

### 11.2 State coverage checklist (every component ships with)

`default / hover / active / focus-visible / disabled / loading / error / empty` (where applicable) + `mobile / tablet / desktop` + `reduced-motion` + `rtl-not-required` (LTR-only MVP, structure must not hardcode left).

### 11.3 Design review gates

| Gate          | Checks                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-component | Tokens-only, a11y list (§10), state coverage, responsive matrix, copy per Appendix C, no invented data (GC-3)                               |
| Per-page      | One primary CTA, section rhythm, LCP budget fit (PRD §32.3), SEO render (PRD §32), analytics events wired (PRD §34)                         |
| Pre-launch    | Contrast CI green, axe green, keyboard pass, 5-flow screen-reader pass, reduced-motion pass, mobile real-device pass (2 OS, 3 screen sizes) |

### 11.4 Figma/asset structure (when the design file is produced)

`00 Foundations` (tokens, type, color, icons, imagery) · `10 Components` (by §8 order) · `20 Patterns` (search, results, detail, checkout, portal) · `30 Pages` (sitemap §6) · `90 QA` (state matrices, a11y checklists). Naming = token/component names 1:1 (no drift between file and code).

---

## Appendix A — Token table (CSS custom property spec)

```css
/* Color (full values in §2) */
--color-brand-50…900;  --color-accent-50…900;  --color-info-50…900;
--color-success-50/100/500/600/700;  --color-warning-50/100/500/600/700;  --color-danger-50…900;
--color-surface;  --color-bg;  --color-bg-tint;
--color-ink-900/600/400;  --color-border-200/300;

/* Type (§3) */
--font-ui: "Inter", system-ui, …;  --font-display: "Bricolage Grotesque", var(--font-ui);
--font-mono: ui-monospace, …;
--text-display-xl: clamp(2.5rem, 4.5vw, 3.5rem);  --text-display-md; --text-h1; --text-h2; --text-h3; --text-h4;
--text-body-lg; --text-body; --text-body-sm; --text-caption; --text-price; --text-price-unit;
--leading-*;  --tracking-display/-0.02em; --tracking-label/0.08em;

/* Space (§4) */
--sp-0.5:2px; --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:20px; --sp-6:24px;
--sp-8:32px; --sp-10:40px; --sp-12:48px; --sp-16:64px; --sp-20:80px; --sp-24:96px; --sp-32:128px;
--container-max: 1200px;  --container-max-wide: 1320px;
--gutter: 16/20/24px (responsive);  --section-pad: 48/64/96px (responsive);

/* Shape & depth */
--radius-xs:6px; --radius-sm:10px; --radius-md:14px; --radius-lg:20px; --radius-xl:28px; --radius-full:999px;
--elev-1; --elev-2; --elev-3;  --focus-ring: 0 0 0 2px var(--color-info-500);

/* Motion (§9) */
--dur-micro: 140ms; --dur-std: 200ms; --dur-page: 280ms;
--ease-enter: cubic-bezier(0.2, 0, 0, 1);

/* Layout */
--header-h: 64px;  --header-h-compact: 56px;  --tabbar-h: 64px;  --sticky-cta-h: 68px;
--breakpoint-sm: 640px; --breakpoint-md: 768px; --breakpoint-lg: 1024px; --breakpoint-xl: 1280px;
```

---

## Appendix B — Component inventory & ownership

| Group      | Components                                                                                                                                                                                                          | Owner (Phase 03+)     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Primitives | Button, Badge, Chip, Icon, Spinner, Skeleton, Avatar, Divider                                                                                                                                                       | UI lib                |
| Inputs     | TextField, PasswordField, PhoneField, SelectField, DateField, DateRangeField, StepperField, Toggle, Checkbox, Radio, OtpField, FileUpload, SearchInput, MoneyInput                                                  | UI lib                |
| Feedback   | InlineAlert, BannerAlert, Toast, Dialog, Sheet, Menu, Tooltip, ProgressBar                                                                                                                                          | UI lib                |
| Commerce   | Price, PriceWithUnit, PriceFrom, PriceOnRequest, PriceBreakdown, PriceApprox, StarRating, RatingSummary, ReviewCard, ReviewComposer, VerifiedBadge                                                                  | UI lib                |
| Cards      | ServiceCard (tour/trek/package/experience), VehicleCard, TransferCard, HotelCard, FlightCard, DestinationCard, GuideCard, VendorCard, TripCard, OfferCard, VoucherCard, ReviewCard                                  | UI lib + web patterns |
| Search     | UniversalSearch, LineSearchForm (×7), GeoAutocomplete, ResultsHeader, FacetPanel/Sheet, FacetGroup, FilterChip, SortMenu, NoResults                                                                                 | Web patterns          |
| Booking    | BookingPanel, PartySelector, AddOnList, CheckoutFlow, BookingStepIndicator, PaymentMethodPicker, PaymentState, TripStatusTimeline, CancellationPolicyPanel, CancelFlow, TravelerForm, PassengerForm, ItineraryBlock | Web patterns          |
| Navigation | Header (desktop/mobile), MegaMenu, BottomTabBar, Breadcrumbs, SubNavTabs, Menu, Footer                                                                                                                              | Web app               |
| Data       | DataTable, StatusBadge, Pagination, ExportButton, KpiCard (dashboards)                                                                                                                                              | Portal patterns       |
| States     | EmptyState (+catalog), LoadingState, ErrorPage (404/500/503/403), OfflineBanner                                                                                                                                     | UI lib                |

---

## Appendix C — Copy & CTA vocabulary

**CTA dictionary (single source; UI strings must match):**

| Context                | Label                                                                 | Never                           |
| ---------------------- | --------------------------------------------------------------------- | ------------------------------- |
| Search (instant lines) | "Search {line}" e.g., "Search tours"                                  | "Go", "Find now"                |
| Search (quote lines)   | "Request flight quotes" / "Request a quote"                           | "Book flight" (implies instant) |
| Detail (instant)       | "Book now"                                                            | "Reserve", "Purchase"           |
| Detail (quote)         | "Request a quote"                                                     | "Enquire"                       |
| Offer                  | "Accept offer" / "Request changes" / "Decline"                        | "OK"                            |
| Checkout               | "Continue to payment" · "Pay NPR 12,400" (amount always in pay label) | "Submit"                        |
| Cancel flow            | "Keep booking" (primary/safe) · "Cancel booking" (destructive)        | "Are you sure?" as a label      |
| Wishlist               | "Saved to wishlist" (toast) · "View wishlist"                         | —                               |
| Corporate              | "Open a corporate account"                                            | "Register business"             |
| Vendor                 | "Publish a service" · "Sell with Easy Trip"                           | "Join as partner" (vagueness)   |

**Tone do/don't (enforced in review):**

| Do                                                                 | Don't                            |
| ------------------------------------------------------------------ | -------------------------------- |
| "A vendor usually replies within 24h." (true SLA, PRD §8)          | "Instant reply!"                 |
| "Only 2 seats left on this departure." (only when true)            | "Selling fast!"                  |
| "No money was taken." (after decline)                              | "Payment issue."                 |
| "We couldn't verify this payment yet — it may take a few minutes." | "Processing…" (forever)          |
| "Free cancellation until 12 Sep, 14:30." (concrete window)         | "Flexible cancellation." (vague) |

---

_End of Phase 02 document v0.1. Design decisions marked "decision" (number format C-PC-05, icon sourcing §4.5, font final license confirmation) require product sign-off. This document is the contract for Phase 03 (scaffold + token wiring) and all subsequent UI work._
