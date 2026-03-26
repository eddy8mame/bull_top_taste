```markdown
# PROJECT_STATE.md

# Bull Top Taste — Full-Stack Restaurant Platform

## State of the Union — March 2026

---

## 1. Tech Stack & Core Architecture

### Framework

- **Next.js App Router** (v15/16), TypeScript strict mode throughout
- All data fetching in Server Components; interactive UI in Client Components (`"use client"`)
- `export const revalidate = 0` on all admin API routes — no CDN caching tolerated on order feeds

### Styling

- **Tailwind CSS v4** with the `@theme inline` syntax
  - The `inline` keyword prevents Tailwind writing tokens to `:root`; instead it inlines `var()` references directly into compiled utility classes (e.g. `.bg-brand-green { background-color: var(--theme-secondary); }`)
  - This means every utility class is automatically theme-aware at zero runtime cost
- **`app/globals.css`** owns the entire storefront theme engine (see §3)
- **`app/admin/admin.css`** owns all admin UI CSS, strictly scoped — never imported in the storefront

### Tooling

- **ESLint**: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- **Prettier**: semi-free, double quotes, 100 char print width, `es5` trailing commas
- **Import sorting**: `@trivago/prettier-plugin-sort-imports` — grouped order: React → Next → third-party → `@/types` → `@/lib` → `@/context` → `@/components` → relative. Blank lines between groups.
- **Tailwind class sorting**: `prettier-plugin-tailwindcss` (runs after import sorter)
- **Format on save**: VS Code Prettier extension (`esbenp.prettier-vscode`)

### CMS

- **Sanity** (Content Lake), GROQ queries
- **Multi-tenant WaaS model**: one Sanity dataset, multiple `location` documents
- Tenant resolution: server components read `process.env.SANITY_LOCATION_ID` (the Sanity `_id` of the location document) for primary lookup; falls back to slug if ID returns null
- `getSanityClient()` (read-only, CDN-enabled) for storefront data
- `getSanityWriteClient()` (no CDN, live data) for admin dashboard order feeds and all write operations

### Payments

- **Stripe Checkout Sessions** (`stripe.checkout.sessions.create`)
- Order flow: checkout API → create Stripe session → write pending order to Sanity → return session URL → customer completes payment → Stripe fires `checkout.session.completed` webhook → `app/api/notify/route.ts` handles confirmation
- `stripePaymentIntentId` (`pi_…`) is the cross-reference key between Stripe and Sanity; last 6 chars uppercased serve as the human-readable order reference on admin cards (e.g. `#AB3F2C`)

### Key Environment Variables

| Variable                | Purpose                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| `SANITY_LOCATION_ID`    | Primary tenant lookup — Sanity `_id` of the active location document |
| `SANITY_LOCATION_SLUG`  | Fallback slug if ID lookup fails (optional)                          |
| `SANITY_PROJECT_ID`     | Sanity project ID                                                    |
| `SANITY_DATASET`        | Sanity dataset name                                                  |
| `SANITY_API_TOKEN`      | Write token for server-side mutations                                |
| `NEXT_PUBLIC_BASE_URL`  | Used in Stripe success/cancel URLs                                   |
| `STRIPE_SECRET_KEY`     | Server-only Stripe key                                               |
| `STRIPE_WEBHOOK_SECRET` | For verifying Stripe webhook signatures                              |

---

## 2. Data Schemas

### 2a. `location` (Sanity document)

Replaces the old deprecated `siteSettings` singleton. One document per physical restaurant location. Key fields:

**Coordinates**: `latitude` (number, required, -90–90), `longitude` (number, required, -180–180) — used for Mapbox map embed in cart pickup location card

**Identity group**: `restaurantName`, `slug` (URL slug, used as fallback tenant key), `logo` (image), `tagline`, `address`, `phone` (display), `phoneDialable` (tel: href), `email`, `uberEatsUrl`, `instagram`, `facebook`

**Hero group**: `heroLabel`, `heroHeadline`, `heroSubheadline`, `heroPrimaryCtaText`, `heroSecondaryCtaText`, `heroBackground` (image with hotspot)

**About group**: `aboutSection` object containing `{ heading, subheading, body, image, background }`, plus `gallery` (array of images, each with `alt` and `caption`)

**Tax**: `taxRate` (number, 0–1) — sales tax rate for this location. Defaults to `DEFAULT_TAX_RATE` (0.07) when absent.

**Catering group**: catering section copy fields

**Hours & Ordering group**: `hours` (array of `{ days, time }` objects), `pickupWaitTime` (string), `kitchenOpen` (boolean — gates checkout API)

**Quick-add**: `featuredItems` — array of up to 4 `menuItem` references. When populated, shown as a 2×2 grid in the empty cart state. Falls back to omitting the panel entirely when absent. Resolved inline via GROQ `->` dereferencing — no separate fetch needed.

**Theme & Branding group**: `theme` (string enum: `tropical` | `midnight` | `spice` | `ocean`)

**SEO group**: `metaTitle`, `metaDescription`

TypeScript interface: `LocationFull` in `lib/sanity.ts` (extends `LocationMeta`). Fetched via `getLocationFull()` which tries `SANITY_LOCATION_ID` first, falls back to slug.

---

### 2b. `menuItem` (Sanity document)

Core menu item with nested modifier group structure.

Key fields: `name`, `description`, `price` (number | null — null = Market Price), `section` (top-level nav tab, e.g. "Mains"), `category` (sub-group within section), `tag`, `available` (boolean — used by 86 system), `image` (with hotspot), `orderCount` (for Most Ordered ranking)

**Modifier groups** (`modifierGroups[]`): Each group has `_id`, `name`, `required`, `min`, `max`, `options[]`. Each option has `_id`, `name`, `priceAdjustment` (0 = included, positive = upcharge), and optionally `subModifierGroups[]` (nested `ModifierGroup[]` — used for things like size choices on an add-on item).

TypeScript interfaces: `ModifierGroup`, `ModifierOption`, `SelectedModifier`, `MenuItem` in `types/index.ts`.

---

### 2c. `order` (Sanity document)

**Status pipeline**: `pending` → `kitchen` → `floor` → `completed`

**The 4 application timestamps** (separate from Sanity's internal `_createdAt`):

| Field        | Set when                                                         | Used for age calculation when |
| ------------ | ---------------------------------------------------------------- | ----------------------------- |
| `createdAt`  | Checkout API write (always set)                                  | Order is `pending`            |
| `startedAt`  | `PATCH` in `/api/orders/[id]/status` when `status === "kitchen"` | Order is `kitchen`            |
| `readyAt`    | `PATCH` in `/api/orders/[id]/ready`                              | Order is `floor`              |
| `pickedUpAt` | `PATCH` in `/api/orders/[id]/pickedup`                           | Analytics only                |

**Age is contextual**: the admin dashboard always measures age from the most recent relevant timestamp, not from `createdAt`. This ensures a kitchen card shows how long the cook has been working, not how long since the customer ordered.

**Order line items** (`items[]`): Denormalised snapshots — `itemName`, `menuItemRef`, `quantity`, `basePrice`, `effectivePrice`, `modifiers[]`, `specialInstructions`. Denormalisation is intentional: historical orders remain accurate if a menu item is later edited.

**`modifiers[]`** on each item: Each `SanityOrderModifier` has `{ _key, groupName, selections, parentKey? }`.

- `selections` is a pre-formatted string written at checkout: `"Large, White Rice"` (spec options) or `"Plantain-Sweet +$6.98, Jerk Sauce +$0.75"` (priced options concatenated)
- `parentKey` is the `_key` of the parent `SanityOrderModifier` record. Set when this record is a sub-modifier group (e.g. a Size Choice that belongs to a specific add-on option)
- When `parentKey` is present, the record is a sub-modifier and is consumed by the floor modal receipt renderer, never displayed as a separate row

**Payment fields**: `stripeSessionId` (`cs_…`), `stripePaymentIntentId` (`pi_…`)

**TypeScript interfaces**: `AdminOrder`, `AdminOrderItem`, `SanityOrderModifier`, `SanityOrderItem` in `types/index.ts`.

**GROQ projection** used by `GET /api/orders`:
```

{
\_id, stripePaymentIntentId, status, type,
customerName, customerEmail, customerPhone, notes, total,
createdAt, startedAt, readyAt, pickedUpAt,
items[] {
\_key, itemName, quantity, basePrice, effectivePrice,
modifiers[] { \_key, groupName, selections, parentKey },
specialInstructions
}
}

````

---

## 3. App Routing & Theme Isolation

### Storefront routes (`/`, `/menu`, `/order-confirmation`, etc.)

- `app/layout.tsx` reads the location's `theme` field from Sanity and writes it as `data-theme="tropical"` (or midnight/spice/ocean) on the `<html>` element — a single server-side attribute swap
- All Tailwind utilities in storefront components use semantic tokens (`bg-brand-green`, `text-brand-gold`, `bg-brand-tertiary`) which resolve via CSS variables — changing `data-theme` re-skins the entire site with zero JS
- **4-tier colour system** (defined in `globals.css` `[data-theme="tropical"]` block):
  - `--theme-primary: #FEB615` → `brand-gold` → hero highlights, prices
  - `--theme-secondary: #017530` → `brand-green` → buttons, headings
  - `--theme-secondary-dark: #015a24` → `brand-green-dark` → hover states
  - `--theme-tertiary: #F15F24` → `brand-tertiary` → CTAs, urgency
  - `--theme-fg: #031109` → brand neutral near-black body copy

### `/checkout` (new)
- `app/checkout/page.tsx` — server component, fetches `LocationFull` via `getLocationFull("")`, passes to `CheckoutClient`. `robots: noindex`.
- `app/checkout/CheckoutClient.tsx` — client component. Consumes `useCart()`. Two-column layout: left = order summary + pickup location + delivery upsell, right = customer details form + Stripe handoff.
- Empty cart state renders inline (no redirect on mount — avoids localStorage hydration race condition).
- On "Proceed to payment": POSTs to `/api/checkout` with `{ items, total, customer }`, redirects to Stripe hosted checkout URL.
- Cart is NOT cleared here — cleared only on `/order-confirmation` mount.
- `uberEatsUrl` field repurposed for DoorDash link — field rename deferred to future sprint.

### Admin routes (`/admin`, `/admin/office`)

**Strict CSS isolation** — the admin UI must never adopt storefront theme colours (a dark kitchen display cannot flash to tropical green when the storefront theme changes).

- `app/admin/layout.tsx`: minimal server component — imports `./admin.css`, wraps children in `<div className="admin-shell">`. No shared header; each page renders its own topbar.
- `app/admin/admin.css`: all admin CSS rules scoped under `.admin-shell { ... }`. Uses explicit hex values from the approved mockups — no `var(--theme-*)` references anywhere.
- Three distinct visual environments, each with their own CSS variable namespace:
  - **Kitchen** (`--k-*`): dark `#161614` background, amber `#EF9F27` accents, for line cook displays
  - **Floor** (`--f-*`): light `#f2f1ee` background, forest green `#3B6D11` accents, for front-of-house tablets
  - **Office** (`--o-*`): warm light `#f4f3f0`, for analytics/management
- `admin-page.kitchen` / `admin-page.floor` classes on the page wrapper switch background and topbar colours
- The `@theme inline` static tokens (`--color-brand-dark`, `--color-brand-charcoal`) are the only globals the admin may use

### Storefront components
`Nav.tsx`, `Hero.tsx`, `About.tsx`, `Gallery.tsx`, `Location.tsx`, `Cart.tsx`, `Footer.tsx`, `Catering.tsx`, `ReservationForm.tsx`, `Testimonials.tsx`, `ModifierModal.tsx`, `Menu.tsx`, `MenuPage.tsx`, `Hours.tsx`

All accept `location?: LocationFull | null` as their primary prop. All fetched server-side in `app/page.tsx` via `getLocationFull()`. Zero-Key safe — all degrade gracefully when env vars are absent.

**Section order on homepage**: Hero → Menu → Location & Hours → About → Gallery → Catering → Testimonials → ReservationForm

---

## 4. State Management & UI

### SWR polling (admin dashboard)
```typescript
const { data: rawOrders, isLoading, mutate: mutateOrders } =
  useSWR<AdminOrder[]>("/api/orders", fetcher, {
    refreshInterval: 15_000,          // poll every 15 seconds
    onSuccess(data) {
      const pendingCount = data.filter(o => o.status === "pending").length
      if (pendingCount > prevPendingRef.current) playNewOrderChime()
      prevPendingRef.current = pendingCount
    },
  })
```

`/api/menu/86` (unavailable items) uses SWR without auto-refresh — updates are staff-driven.

### Cart persistence (localStorage)

Cart state is persisted to `localStorage` under the key `'btt-cart'`. Implemented in `CartContext` via:
- Lazy `useState` initializer — reads from localStorage on mount, guards against SSR with `typeof window === 'undefined'` check
- `useEffect` syncing `items` to localStorage on every state change
- `clearCart` removes the key in addition to resetting state

Fails silently in all cases — localStorage unavailable or quota exceeded does not surface errors to the user.

### Cart modifier display (Cart.tsx)

Three-tier display per cart item:
1. **Item line**: `item.name` + `effectivePrice` (fully loaded — base + all adjustments)
2. **Spec line**: muted, single line — size and zero-price selections joined with ` · ` (e.g. `Large · Chicken · Rice & Peas`)
3. **Add-on lines**: indented with `↳` arrow, name + `(size)` if sub-modifier present, `+$X.XX` right-aligned in green

Classification uses `SelectedModifier.groupName` and `priceAdjustment` on client state — same rules as floor modal but applied before Sanity write:
- `groupName === 'Size Choice'` → spec regardless of price (size upgrade bundled into effectivePrice)
- `priceAdjustment === 0` AND no sub-modifier price → spec
- Everything else → priced add-on line

Sub-modifiers (`parentOptionId` present) are merged into their parent add-on via `subSelsByParent` map — never rendered as standalone lines. Format: `Plantain (16 Oz)` — parentheses chosen over `·` separator for vertical list legibility.

### Cart item editing (ModifierModal + CartContext)

Tapping a cart item's content area opens `ModifierModal` in edit mode via `existingItem?: CartItem` prop.

**Initialization from existing state:**
- `selections` reconstructed from `selectedModifiers` where `parentOptionId` absent
- `subSel` reconstructed from sub-modifier records — `parentGroupId` derived by traversing `modifierGroups` to find which group contains the parent option
- `specialInstructions` and `showInstructions` initialize from existing item

**CartContext `replaceItem`:** updates modifiers and `effectivePrice` in place, preserves `cartItemId` and `quantity`. Added to `CartState` type.

**Mode detection:** `existingItem` present → edit mode. CTA shows "Update Order", `handleAdd` calls `replaceItem` instead of `addItem`.

### Tax calculation (lib/tax.ts)

Processor-agnostic tax utility. Single source of truth for all price math regardless of payment method.
```typescript
calculateTotals(items: CartItem[], taxRate: number): {
  subtotal: number   // sum of effectivePrice × quantity
  tax: number        // rounded to 2dp
  total: number      // subtotal + tax, rounded to 2dp
  taxRateLabel: string  // e.g. "7%" or "8.25%"
}
```

`DEFAULT_TAX_RATE = 0.065` (Palm Beach County, FL). Overridden per location via `location.taxRate` from Sanity. Displayed as subtotal / tax / total breakdown on `/checkout`. Cart panel shows subtotal with deferred tax note.

**Multi-tenant note:** `taxRate` should be passed through `CheckoutBody` to `/api/checkout/route.ts` for full accuracy — currently server falls back to `DEFAULT_TAX_RATE`. Flagged as deferred item.

### Optimistic UI (`mutate`)

Every action function follows the same pattern:
1. **Snapshot** current orders array
2. **Optimistically apply** the state change via `mutateOrders(newState, false)` — `false` = skip revalidation, UI updates instantly
3. **Fire API call** (PATCH to Sanity)
4. **On success**: call `mutateOrders()` (no args) to revalidate and capture server-written timestamps (`startedAt`, `readyAt`, etc.)
5. **On failure**: call `mutateOrders(snapshot, false)` to roll back

Actions: `markStatus(id, status)`, `markPickedUp(id)`, `toggleKitchen()`, `toggle86(itemId)`

### Contextual age tracking

The `now` state (ms timestamp) is updated every second via `setInterval`:
```typescript
const [now, setNow] = useState(() => Date.now())
useEffect(() => {
  const id = setInterval(() => setNow(Date.now()), 1000)
  return () => clearInterval(id)
}, [])
```

Age reference selection (`getAgeSeconds`):
- `pending` → measures from `createdAt` (how long since customer ordered)
- `kitchen` → measures from `startedAt` (how long cook has been working; falls back to `createdAt` for old orders)
- `floor` → measures from `readyAt` (how long sitting at the pass; falls back to `createdAt`)

Age thresholds (configurable constants at top of `page.tsx`):
- `WARNING_THRESHOLD_MINUTES = 7` → `.warn` CSS class (amber card border, amber age badge)
- `CRITICAL_THRESHOLD_MINUTES = 15` → `.crit` CSS class (red card border, red age badge)

`fmtAge(seconds)` returns `"M:SS"` format. `ageCls(seconds)` returns `"ok" | "warn" | "crit"`.

### New order audio alert

`playNewOrderChime()` uses the Web Audio API to play a C–E–G ascending tone when `pendingCount` increases between SWR polls. Wrapped in try/catch — requires a prior user gesture to unlock the AudioContext; silently fails otherwise.

### Kitchen modifier display
Kitchen cards use two display-layer helpers and a text-based merge algorithm:
- `stripPricing(str)`: strips all `+$X.XX` annotations from selections strings.
- `kitchenLabel(groupName)`: maps CMS group names to short operational labels (e.g., "Recommend Sides and Apps" → "Add-on").
- **Orphaned Sub-Modifier Suppression:** Filters out orphaned size records *before* applying `stripPricing()`. A modifier is suppressed IF AND ONLY IF `groupName` contains "Size Choice", `parentKey` is absent, and the `selections` string does *not* contain `+$`.
- **Text-Based Two-Pass Algorithm:** 1. Identifies sub-modifiers (has `parentKey`), strips their price, and maps them.
  2. Identifies root modifiers, appends their sub-modifiers in parentheses, and groups them by `kitchenLabel`. Result: `Add-on: Plantain-Sweet (16 Oz), Cow Foot (24 Oz)`.

### Floor modal receipt rendering
The receipt math enforces absolute accounting integrity via a strictly price-driven 2-Pass Algorithm:
1. **Pass 1 (Map Subs):** Collects all modifiers with a `parentKey` and calculates their sub-price.
2. **Pass 2 (Root Rules):** Iterates over root modifiers and applies three strict rules:
   - *Rule 1 (Base Sizes):* If `groupName` is "Size Choice", the cost dynamically adds to the top-line item `basePrice`. The label goes to the free spec line.
   - *Rule 2 (Priced Add-ons):* If the selection costs > $0 (e.g., Sauces, Extra Sides), it renders as an independent, indented line item at `sel.price + subPrice`.
   - *Rule 3 (Free Specs):* If the selection is free, the label is appended to the comma-separated spec descriptor line.

### Order reference display

`fmtOrderNum(stripePaymentIntentId?: string)`: takes last 6 chars of `pi_…` string, uppercases → `#AB3F2C`. Falls back to `——` for cash/test orders without a payment intent. Displayed in kitchen card header, floor card header, and floor modal header. No sequential number field needed in Sanity.

---

## 5. Latest Milestone — Phase 4.5: Admin Dashboard UI Translation

### What was done
Translated two approved HTML/CSS/vanilla-JS mockup files (`island_ember_combined_v3.html`, `island_ember_admin_v1.html`) into production Next.js React components. This was a pure UI layer change — all backend logic, SWR polling, Sanity mutations, and API routes were preserved exactly.

### Files created / substantially rewritten

**`app/admin/admin.css`** (new, ~450 lines)
All CSS scoped under `.admin-shell`. Contains CSS custom properties for all three visual environments (Kitchen `--k-*`, Floor `--f-*`, Office `--o-*`) and every component class used in the dashboard. Explicit hex values only — no `var(--theme-*)` references. Added `.view-kitchen` and `.view-floor` flex wrappers (replacing the vanilla JS `display:none` view toggle).

**`app/admin/layout.tsx`** (rewritten — stripped to ~10 lines)
Removed the shared header entirely (topbar is now page-level, not layout-level). Imports `admin.css`, wraps children in `<div className="admin-shell">`. Server component — no `"use client"` needed.

**`app/admin/page.tsx`** (full rewrite)
- `Mode = "kitchen" | "floor"` state drives a single conditional render (not CSS toggling)
- Topbar: 3-column grid — [Kitchen/Floor pill tabs] [ordering status dot + label] [clock + `← Office` link]
- Ordering status dot doubles as kitchen open/close toggle (click fires `toggleKitchen()`)
- Kitchen view: 2-column `.k-pipeline` grid (Incoming | Preparing), collapsible stock panel below
- Floor view: `.floor-bar` count header + 4-col `.f-cards` grid (responsive down to 2-col at 1024px, 1-col at 640px), modal on card click
- `KitchenCard`: uses `.k-card`, `.k-card-top`, `.k-items`, `.k-specs`, `.k-btn` classes from admin.css; phone number removed; modifier labels normalised; pricing stripped
- `FloorCard`: uses `.f-card`, `.f-age`, `.f-btn-view` — click opens receipt modal
- `FloorModal`: full receipt with spec line + itemised add-on rows + sub-modifier collapsing; backdrop click closes

### Sub-modifier fix (implemented in this session)

**Problem**: A sub-modifier (e.g. "Size Choice: 16 Oz") and its parent add-on (e.g. "Plantain-Sweet") were stored as separate flat `SanityOrderModifier` records with no parent pointer, so the floor modal displayed them as two independent add-on rows instead of one collapsed row.

**Solution — write path** (`app/api/checkout/route.ts`, `toSanityItem()`):
When a modifier group contains any option that has `subModifierGroups`, that parent group is **split into per-option records** (one `SanityOrderModifier` per selection, instead of all selections joined in one record). This ensures `parentKey` points to a record with exactly one priced option, making the parent/child relationship unambiguous even when a parent group has multiple priced selections.
`parentKey` is then set on sub-modifier records via a lookup built from `CartItem.modifierGroups` (the menu structure, available on `CartItem` since it extends `MenuItem`).

**Solution — read path** (`app/admin/page.tsx`, `FloorModal`):
Two-pass renderer: first pass builds `subSelsByParent` from records with `parentKey`; second pass processes only root records, merging each priced add-on with its sub-modifier label and summed price.

**Backwards compatibility**: Old order records (written before `parentKey` existed) have no `parentKey` on any modifier. They pass through the root-mod path identically to before — `subSelsByParent` is always empty for them.

**Schema note**: The `parentKey` field on `SanityOrderModifier` is typed as `optional string` in `types/index.ts`. The Sanity Studio schema (`sanity/schema/order.ts`) does not yet have an explicit `parentKey` field on `modifierSelection` — Sanity accepts unknown fields gracefully, but the field should be added to the schema for Studio visibility if needed.

### Other display-layer fixes in this session

- **Order reference**: `fmtOrderNum()` replaced Sanity document ID fragment (`#JYT0`) with `stripePaymentIntentId` last-6-chars (`#AB3F2C`). `stripePaymentIntentId` added to `AdminOrder` type and GROQ projection.
- **Kitchen card**: phone number removed; modifier group labels normalised via `kitchenLabel()`; prices stripped from selections via `stripPricing()`
- **Floor modal receipt**: spec modifiers collapsed to a single descriptor line; priced add-ons individually itemised; collapsed add-ons total replaced with per-add-on line items

---

## 6. API Routes Reference

| Route | Method | Purpose |
|---|---|---|
| `GET /api/orders` | GET | Fetch all orders for this location (SWR polled, 15s) |
| `POST /api/orders/[id]/status` | POST | Advance status; patches `startedAt` when → `kitchen` |
| `POST /api/orders/[id]/ready` | POST | Mark order ready (→ `floor`); patches `readyAt` |
| `POST /api/orders/[id]/pickedup` | POST | Confirm pickup (→ `completed`); patches `pickedUpAt` |
| `GET /api/kitchen` | GET | Fetch `kitchenOpen` boolean from location document |
| `POST /api/kitchen` | POST | Toggle `kitchenOpen` on location document |
| `GET /api/menu/86` | GET | Fetch list of currently unavailable item IDs |
| `POST /api/menu/86` | POST | Toggle an item's unavailability |
| `POST /api/checkout` | POST | Create Stripe session + write pending order to Sanity |
| `POST /api/notify` | POST | Stripe webhook handler (`checkout.session.completed`) |

---

## 7. Known Deferred Items

| Item | Notes |
|---|---|
| `parentKey` field in Sanity Studio schema | `modifierSelection` object in `order.ts` doesn't explicitly declare `parentKey`. Sanity accepts it, but add the field for Studio visibility |
| `app/admin/office/page.tsx` redesign | Office analytics page not yet translated to the new admin CSS system — still uses old Tailwind classes |
| Sub-modifier with multiple parents | If a single parent group has 2+ priced options each with different sub-modifier groups (rare), the current split-record approach handles it correctly. If the same sub-modifier group ID appears under multiple parent options, the last one wins in `parentKeyOf` — theoretical edge case only |
| `startedAt` in Sanity Studio schema | `order.ts` doesn't have an explicit `startedAt` field definition (like `readyAt` does). Sanity accepts it from the API patch, but it should be added to the schema for Studio visibility |
| Cart panel UI overhaul | Complete. All subtasks shipped: localStorage persistence, delivery card removed, pickup location card with Mapbox, modifier descriptor, removal UX, quick-add empty state, pre-populated edit modal. |
| Pre-commit hooks | Deferred to post-demo. Plan: husky + lint-staged running Prettier then ESLint --fix on staged .ts/.tsx files. Skip until collaborators are added or approaching production. |
| Tax rate in checkout API | `taxRate` not yet passed through `CheckoutBody` to `/api/checkout/route.ts`. Server currently falls back to `DEFAULT_TAX_RATE = 0.065`. Add `taxRate?: number` to `CheckoutBody` and pass from `CheckoutClient` for full multi-tenant accuracy. |


## System
* **v2.1.0 (Current):** Customer ready SMS now includes the order reference (last 6 chars
  of Stripe payment intent, e.g. "order AB3F2C") matching what staff see on the
  floor card. Added SMS consent copy beneath the phone input on checkout for
  Twilio toll-free verification (30511). Floor card and modal order reference
  promoted from 10px muted to 13px bold for faster staff identification.
* **v2.0.1:** Added processor-agnostic tax calculation via lib/tax.ts. Sanity-driven taxRate per location with 0.07 Palm Beach County fallback. Checkout page shows full subtotal/tax/total breakdown. Cart panel shows deferred tax note.
* **v2.0.0:** Implemented add-on uptake panel in office
  dashboard Menu tab. Calculates ticket attach rate per upsell add-on
  from order history — the percentage of confirmed orders that included
  each add-on at least once. Uses a Set-based unique order count so
  multi-entree orders with the same add-on count once per ticket.
  isUpsellGroup() abstracts group classification for future Sanity
  schema migration. Bar fills use absolute percentage width. Empty
  state shown when no add-on data exists yet.
* **v1.9.0:** Restructured customer tables in office dashboard
  — email moved from Customer cell into a dedicated Contact column
  alongside phone. Added CSV export buttons for top customers and
  first-time customers. Fixed lag calculation in orders CSV export
  (was measuring order lifetime, now correctly measures readyAt →
  pickedUpAt). Fixed kitchen toggle in Settings always showing Closed
  due to wrong response key. Fixed InfoIcon tooltip text inheriting
  uppercase and letter-spacing from parent label classes.
* **v1.8.0:** Added InfoIcon tooltip component to office
  dashboard. All KPI cards, charts, bar lists, and table columns now
  carry hover tooltips explaining what each metric represents and how
  it is calculated. Added avg queue time (confirmedAt → startedAt) and
  avg prep time (startedAt → readyAt) KPIs to the overview tab, giving
  operators granular visibility into kitchen throughput vs. queue depth.
* **v1.7.0:** Fixed critical issue where orders appeared in the
kitchen pipeline before payment was confirmed. Introduced
`awaiting_payment` as a pre-payment status written at checkout time.
Stripe webhook now advances status to `pending` and stamps `confirmedAt`
on payment confirmation — this is the authoritative signal that an order
is real. Kitchen chime, Incoming column, and age timers all now anchor
to confirmed orders only. `startedAt` and `confirmedAt` declared
explicitly in Sanity schema alongside `parentKey` on modifier selections.
Revenue by day in office dashboard anchored to `confirmedAt` to correctly
attribute cross-midnight orders. Active order count excludes
`awaiting_payment` documents. Two minor schema corrections: `initialValue`
on status field updated to `awaiting_payment`, `💳` icon added to Studio
preview map for abandoned checkout visibility.
* **v1.6.0:** Multiple UI fixes and refinements. Nav tab and stock panel class concatenation fixed. 86 toggle revalidation removed to preserve optimistic state. Order flicker resolved with 1500ms delayed revalidation. Checkout form autofill enabled. Cart cleared on order confirmation mount. Demo mode banner added to checkout. DoorDash URL added to Sanity schema. Hero simplified — CTAs and scroll indicator removed, padding reduced. Reservation and Location sections centered and tightened. Cart panel left-edge shadow added. Empty cart popular items pushed to bottom.
* **v1.5.0:** Added /checkout page with 2-column order summary and customer details form. Cart stripped of form and API call — now routes to /checkout. Delivery upsell moved to checkout page.
* **v1.4.7:** Cart item editing via pre-populated ModifierModal. Tap any cart item to edit modifiers, size, add-ons, and special instructions in place. Quantity preserved on update.
* **v1.4.6:** Added featured items quick-add panel to empty cart state. 2×2 grid sourced from Sanity location document. Items with required modifiers open ModifierModal inline. Direct add for items with no required modifiers.
* **v1.4.5:** Replaced standalone remove button with contextual trash icon. Minus button becomes red trash icon at quantity 1. Hover deepens red to reinforce destructive intent.
* **v1.4.4:** Added categorized modifier summary to cart items. Specs collapsed to single descriptor line, priced add-ons itemized with ↳ arrow and price. Sub-modifiers merged inline with parent.
* **v1.4.3:** Added interactive Mapbox map to cart pickup location card. Coordinates stored in Sanity per location. Directions link uses Google Maps dir/ endpoint with device current location as origin.
* **v1.4.2:** Added pickup location card to filled cart state. Address renders as tap-to-maps link. Mapbox map embed deferred — placeholder in place.
* **v1.4.1:** Removed DoorDash delivery card and links from cart panel. Delivery option relocated to order confirmation page (not yet built).
* **v1.4.0:** Added localStorage cart persistence. Cart survives page refresh and browser close. Key: `'btt-cart'`.
* **v1.3.0:** Resolved Sub-Modifier Pipeline. Replaced synthetic keys with explicit `parentOptionId` relational mapping. Re-wrote Kitchen and Floor 2-Pass algorithms to ensure perfect receipt accounting (dynamic base pricing) and operational clarity.
* **v1.2.0:** Translated vanilla HTML Admin mockups into isolated React components. Preserved SWR and Sanity mutations. Scoped CSS under `.admin-shell`.
* **v1.1.0:** Ripped out local `orderStore`. Wired Stripe webhooks directly to Sanity `create` mutations.
* **v1.0.0:** Migrated from single-tenant siteSettings to multi-tenant `location` schema with dynamic Tailwind v4 theming.
````
