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

**Identity group**: `restaurantName`, `slug` (URL slug, used as fallback tenant key), `logo` (image), `tagline`, `address`, `phone` (display), `phoneDialable` (tel: href), `email`, `uberEatsUrl`, `instagram`, `facebook`

**Hero group**: `heroLabel`, `heroHeadline`, `heroSubheadline`, `heroPrimaryCtaText`, `heroSecondaryCtaText`, `heroBackground` (image with hotspot)

**About group**: `aboutSection` object containing `{ heading, subheading, body, image, background }`, plus `gallery` (array of images, each with `alt` and `caption`)

**Catering group**: catering section copy fields

**Hours & Ordering group**: `hours` (array of `{ days, time }` objects), `pickupWaitTime` (string), `kitchenOpen` (boolean — gates checkout API)

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
| Cart panel UI overhaul | In progress — localStorage persistence complete. Remaining: delivery card removal, pickup location card, modifier descriptor line, removal UX, Sanity-connected quick-add empty state, pre-populated modifier modal on item tap |

## System Changelog
* **v1.4.0 (Current):** Added localStorage cart persistence. Cart survives page refresh and browser close. Key: `'btt-cart'`.
* **v1.3.0:** Resolved Sub-Modifier Pipeline. Replaced synthetic keys with explicit `parentOptionId` relational mapping. Re-wrote Kitchen and Floor 2-Pass algorithms to ensure perfect receipt accounting (dynamic base pricing) and operational clarity.
* **v1.2.0:** Translated vanilla HTML Admin mockups into isolated React components. Preserved SWR and Sanity mutations. Scoped CSS under `.admin-shell`.
* **v1.1.0:** Ripped out local `orderStore`. Wired Stripe webhooks directly to Sanity `create` mutations. 
* **v1.0.0:** Migrated from single-tenant siteSettings to multi-tenant `location` schema with dynamic Tailwind v4 theming.
````
