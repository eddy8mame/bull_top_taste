// ─── Modifiers ────────────────────────────────────────────────────────────────

export interface ModifierOption {
  _id:                string
  name:               string
  priceAdjustment:    number          // 0 = included, positive = upcharge
  subModifierGroups?: ModifierGroup[] // nested customization (e.g. Plantain → size)
}

export interface ModifierGroup {
  _id:      string
  name:     string
  required: boolean
  min:      number          // minimum selections (0 = optional)
  max:      number          // maximum selections (1 = single-select, 2+ = multi)
  options:  ModifierOption[]
}

export interface SelectedModifier {
  groupId:   string
  groupName: string
  selections: {
    optionId:        string
    name:            string
    priceAdjustment: number
  }[]
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface MenuItem {
  _id:            string
  name:           string
  description:    string
  price:          number | null   // null → "Market Price"
  section:        string          // top-level nav tab  (e.g. "Mains", "Fish")
  category?:      string          // sub-group within a section (e.g. "Weekly Specials")
  tag?:           string
  available:      boolean
  imageUrl?:      string          // from Sanity: image.asset->url
  modifierGroups?: ModifierGroup[]
  orderCount?:    number          // for "Most Ordered" ranking
}

export interface Special {
  _id:        string
  title:      string
  items:      string[]
  price:      number
  validFrom:  string
  validUntil: string
  hours:      string
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem extends MenuItem {
  cartItemId:          string              // unique per cart entry
  quantity:            number
  effectivePrice:      number              // base price + all modifier adjustments
  selectedModifiers?:  SelectedModifier[]
  specialInstructions?: string
}

export interface CartState {
  items:      CartItem[]
  addItem:    (item: CartItem) => void
  removeItem: (cartItemId: string) => void
  updateQty:  (cartItemId: string, qty: number) => void
  clearCart:  () => void
  total:      number
  count:      number
  isOpen:     boolean
  setIsOpen:  (open: boolean) => void
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface Order {
  id:            string
  items:         CartItem[]
  total:         number
  customerName:  string
  customerEmail: string
  customerPhone: string
  type:          "pickup" | "delivery"
  notes?:        string
  createdAt:     string
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotifyPayload {
  order: Order
  to:    string
}

// ─── Site Settings ────────────────────────────────────────────────────────────

export interface HoursEntry {
  days: string
  time: string
}

export interface SiteSettings {
  restaurantName:        string
  tagline?:              string
  address?:              string
  phone?:                string
  phoneDialable?:        string
  email?:                string
  uberEatsUrl?:          string
  instagram?:            string
  facebook?:             string
  heroLabel?:            string
  heroHeadline?:         string
  heroSubheadline?:      string
  heroPrimaryCtaText?:   string
  heroSecondaryCtaText?: string
  hours?:                HoursEntry[]
  pickupWaitTime?:       string
  primaryColor?:         string
  primaryDarkColor?:     string
  accentColor?:          string
  serifFont?:            string
  sansFont?:             string
  metaTitle?:            string
  metaDescription?:      string
}
