// ─── Modifiers ────────────────────────────────────────────────────────────────

export interface ModifierOption {
  _id: string
  name: string
  priceAdjustment: number // 0 = included, positive = upcharge
  subModifierGroups?: ModifierGroup[] // nested customization (e.g. Plantain → size)
}

export interface ModifierGroup {
  _id: string
  name: string
  required: boolean
  min: number // minimum selections (0 = optional)
  max: number // maximum selections (1 = single-select, 2+ = multi)
  options: ModifierOption[]
}

export interface SelectedModifier {
  groupId: string
  groupName: string
  selections: {
    optionId: string
    name: string
    priceAdjustment: number
  }[]
  parentOptionId?: string
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface MenuItem {
  _id: string
  name: string
  description: string
  price: number | null // null → "Market Price"
  section: string // top-level nav tab  (e.g. "Mains", "Fish")
  category?: string // sub-group within a section (e.g. "Weekly Specials")
  tag?: string
  available: boolean
  imageUrl?: string // from Sanity: image.asset->url
  modifierGroups?: ModifierGroup[]
  orderCount?: number // for "Most Ordered" ranking
}

export interface Special {
  _id: string
  title: string
  items: string[]
  price: number
  validFrom: string
  validUntil: string
  hours: string
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem extends MenuItem {
  cartItemId: string // unique per cart entry
  quantity: number
  effectivePrice: number // base price + all modifier adjustments
  selectedModifiers?: SelectedModifier[]
  specialInstructions?: string
}

export interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (cartItemId: string) => void
  updateQty: (cartItemId: string, qty: number) => void
  replaceItem: (cartItemId: string, updated: CartItem) => void 
  clearCart: () => void
  total: number
  count: number
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

// ─── Orders ───────────────────────────────────────────────────────────────────

// Status pipeline matches the Sanity order schema:
//   pending → kitchen → floor → completed
// ("kitchen" replaces the old "preparing"; "floor" replaces the old "ready")
export type OrderStatus = "pending" | "kitchen" | "floor" | "completed"

// Sanity document reference shape — used for the location field on Order.
export interface SanityRef {
  _type: "reference"
  _ref: string
}

// Denormalized modifier summary stored per item in Sanity.
// We collapse SelectedModifier[] into a human-readable string per group so the
// order record is self-contained even if the originating menu item is edited.
export interface SanityOrderModifier {
  _key: string // required by Sanity for keyed arrays
  groupName: string
  selections: string // e.g. "Large +$3.50, Rice & Peas"
  // BACKLOG: parentKey — the _key of the SanityOrderModifier whose selected
  // option spawned this sub-modifier group (e.g. the "Size Choice" record for
  // Plantain-Sweet points to the "Recommend Sides and Apps" record).
  // Set this at checkout write time; the floor modal receipt renderer can then
  // collapse sub-modifier rows inline with their parent add-on row.
  parentKey?: string
}

// Order line item as stored in the Sanity order document.
// Intentionally denormalized: name, price, and modifier text are snapshots
// taken at order time so the record stays accurate after menu changes.
export interface SanityOrderItem {
  _key: string // required by Sanity for keyed arrays
  itemName: string
  menuItemRef?: string // source menuItem._id — for analytics joins
  quantity: number
  basePrice: number | null
  effectivePrice: number
  modifiers?: SanityOrderModifier[]
  specialInstructions?: string
}

// The primary Order type, aligned with the Sanity `order` document schema.
// CartItem[] items are mapped to SanityOrderItem[] before writing to Sanity.
// The admin dashboard reads AdminOrder (a GROQ projection) instead of this type.
export interface Order {
  // Sanity document identity
  id: string // Sanity _id, e.g. "order-1234567890-abc123"
  location?: SanityRef // reference to the location document

  // Workflow
  status: OrderStatus
  type: "pickup" | "delivery"

  // Customer
  customerName: string
  customerEmail: string
  customerPhone: string
  notes?: string

  // Line items (denormalized snapshot — not CartItem[] in Sanity)
  items: CartItem[] // kept as CartItem[] so notification helpers in
  // lib/notify.ts can access .name / .price / .quantity

  // Financials
  total: number

  // Timestamps (ISO 8601 strings)
  createdAt: string
  readyAt?: string // set when kitchen marks order floor-ready
  pickedUpAt?: string // set when floor staff confirms pickup

  // Payment references
  stripeSessionId?: string // cs_…
  stripePaymentIntentId?: string // pi_…
}

// ─── Admin / API response types ───────────────────────────────────────────────
// These represent the Sanity order document as projected by GROQ and returned
// by /api/orders. Distinct from Order (which still carries CartItem[] items for
// notification helpers) so the admin UI can be typed against the actual Sanity shape.

export interface AdminOrderItem {
  _key: string
  itemName: string
  quantity: number
  basePrice: number | null
  effectivePrice: number
  modifiers?: SanityOrderModifier[] // selections is a pre-formatted string
  specialInstructions?: string
}

export interface AdminOrder {
  _id: string // Sanity document _id
  stripePaymentIntentId?: string // pi_… — last 6 chars used as display order ref
  status: OrderStatus
  type: "pickup" | "delivery"
  customerName: string
  customerEmail: string
  customerPhone: string
  notes?: string
  items: AdminOrderItem[]
  total: number
  createdAt: string
  startedAt?: string // set when kitchen accepts (pending → kitchen)
  readyAt?: string // set when kitchen marks ready (kitchen → floor)
  pickedUpAt?: string // set when floor staff confirms pickup
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotifyPayload {
  order: Order
  to: string
}

// ─── Site Settings (deprecated) ───────────────────────────────────────────────
// The siteSettings singleton is being replaced by the location document type.
// This interface is retained for backwards compatibility with getSiteSettings()
// during the migration. Remove once all consumers switch to getLocationBySlug().

export interface HoursEntry {
  days: string
  time: string
}

export interface SiteSettings {
  restaurantName: string
  tagline?: string
  address?: string
  phone?: string
  phoneDialable?: string
  email?: string
  uberEatsUrl?: string
  instagram?: string
  facebook?: string
  heroLabel?: string
  heroHeadline?: string
  heroSubheadline?: string
  heroPrimaryCtaText?: string
  heroSecondaryCtaText?: string
  hours?: HoursEntry[]
  pickupWaitTime?: string
  primaryColor?: string
  primaryDarkColor?: string
  accentColor?: string
  serifFont?: string
  sansFont?: string
  metaTitle?: string
  metaDescription?: string
}
