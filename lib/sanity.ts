import { createClient } from "@sanity/client"
import type { MenuItem, Special, SiteSettings, ModifierGroup } from "@/types"

// ─── Client factory ───────────────────────────────────────────────────────────

const SHARED_CONFIG = {
  dataset:    process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
} as const

// Read-only client (CDN-backed, no token required). Used for data fetching.
function getSanityClient() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  if (!projectId) return null
  return createClient({ ...SHARED_CONFIG, projectId, useCdn: true })
}

// Write client (bypasses CDN, requires SANITY_API_WRITE_TOKEN).
// Used in API routes that mutate Sanity documents (order creation, status patches).
// Returns null and logs a warning when the token is absent — callers must handle
// the null case gracefully so the user-facing flow is never blocked by a missing key.
export function getSanityWriteClient() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const token     = process.env.SANITY_API_WRITE_TOKEN
  if (!projectId || !token) {
    console.warn(
      "[Sanity] Write client unavailable — set NEXT_PUBLIC_SANITY_PROJECT_ID " +
      "and SANITY_API_WRITE_TOKEN in your environment."
    )
    return null
  }
  return createClient({ ...SHARED_CONFIG, projectId, useCdn: false, token })
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getMenuItems(): Promise<MenuItem[]> {
  const client = getSanityClient()
  if (!client) return FALLBACK_MENU
  return client.fetch<MenuItem[]>(`
    *[_type == "menuItem" && available == true] | order(section asc, category asc) {
      _id, name, description, price, section, category, tag, available, orderCount,
      "imageUrl": image.asset->url,
      modifierGroups[] {
        "_id": _key, name, required, min, max,
        options[] {
          "_id": _key, name, priceAdjustment,
          subModifierGroups[] {
            "_id": _key, name, required, min, max,
            options[] { "_id": _key, name, priceAdjustment }
          }
        }
      }
    }
  `)
}

export async function getActiveSpecials(): Promise<Special[]> {
  const client = getSanityClient()
  if (!client) return FALLBACK_SPECIALS
  const today = new Date().toISOString().split("T")[0]
  return client.fetch<Special[]>(`
    *[_type == "special" && validFrom <= $today && validUntil >= $today] {
      _id, title, items, price, validFrom, validUntil, hours
    }
  `, { today })
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const client = getSanityClient()
  if (!client) return null
  return client.fetch<SiteSettings | null>(`
    *[_type == "siteSettings" && _id == "siteSettings"][0] {
      restaurantName, tagline, address, phone, phoneDialable, email,
      uberEatsUrl, instagram, facebook,
      heroLabel, heroHeadline, heroSubheadline,
      heroPrimaryCtaText, heroSecondaryCtaText,
      hours, pickupWaitTime,
      primaryColor, primaryDarkColor, accentColor,
      serifFont, sansFont, metaTitle, metaDescription
    }
  `)
}

// ─── Location (multi-tenant) ──────────────────────────────────────────────────

// Minimal shape needed by the root layout for theming + metadata.
export interface LocationMeta {
  restaurantName: string
  theme:          "tropical" | "midnight" | "spice" | "ocean"
  metaTitle?:     string
  metaDescription?: string
  tagline?:       string
}

export async function getLocationBySlug(slug: string): Promise<LocationMeta | null> {
  const client = getSanityClient()
  if (!client) {
    console.warn(`[Sanity] Client not configured — cannot resolve location "${slug}". Falling back to default theme.`)
    return null
  }
  return client.fetch<LocationMeta | null>(
    `*[_type == "location" && slug.current == $slug][0] {
      restaurantName, theme, metaTitle, metaDescription, tagline
    }`,
    { slug }
  )
}

// ─── Full location data (homepage) ──────────────────────────────────────────

export interface LocationImage {
  url:     string
  alt?:    string
  caption?: string
}

export interface LocationFull extends LocationMeta {
  logoUrl?:           string
  address?:           string
  phone?:             string
  phoneDialable?:     string
  email?:             string
  uberEatsUrl?:       string
  instagram?:         string
  facebook?:          string

  // Hero
  heroLabel?:            string
  heroHeadline?:         string
  heroSubheadline?:      string
  heroPrimaryCtaText?:   string
  heroSecondaryCtaText?: string
  heroBackgroundUrl?:    string

  // About
  aboutSection?: {
    heading?:       string
    subheading?:    string
    body?:          string
    imageUrl?:      string
    backgroundUrl?: string
  }

  // Gallery
  gallery?: LocationImage[]

  // Hours
  hours?: { days: string; time: string }[]
  pickupWaitTime?: string
}

// The full GROQ projection shared by both lookup paths.
const LOCATION_FULL_PROJECTION = `{
  restaurantName, theme, metaTitle, metaDescription, tagline,
  "logoUrl": logo.asset->url,
  address, phone, phoneDialable, email,
  uberEatsUrl, instagram, facebook,

  heroLabel, heroHeadline, heroSubheadline,
  heroPrimaryCtaText, heroSecondaryCtaText,
  "heroBackgroundUrl": heroBackground.asset->url,

  aboutSection {
    heading, subheading, body,
    "imageUrl": image.asset->url,
    "backgroundUrl": background.asset->url
  },

  gallery[] {
    "url": asset->url,
    alt,
    caption
  },

  hours[] { days, time },
  pickupWaitTime
}`

export async function getLocationFull(slug: string): Promise<LocationFull | null> {
  const client = getSanityClient()
  if (!client) return null

  // Prefer ID-based lookup when SANITY_LOCATION_ID is set — this is more
  // reliable than slug matching and is already required by the admin routes.
  const locationId = process.env.SANITY_LOCATION_ID
  if (locationId) {
    const result = await client.fetch<LocationFull | null>(
      `*[_type == "location" && _id == $id][0] ${LOCATION_FULL_PROJECTION}`,
      { id: locationId }
    )
    if (result) return result
    // Fall through to slug lookup if ID produced no results (e.g. wrong env value)
    console.warn(`[Sanity] getLocationFull: no location found for id "${locationId}", retrying by slug.`)
  }

  return client.fetch<LocationFull | null>(
    `*[_type == "location" && slug.current == $slug][0] ${LOCATION_FULL_PROJECTION}`,
    { slug }
  )
}

// Exported alias used by admin API routes that only need read access.
// Uses the CDN-backed client; does not require SANITY_API_WRITE_TOKEN.
export function getSanityReadClient() {
  return getSanityClient()
}

// ─── Shared modifier groups ───────────────────────────────────────────────────

const SIZE_CHOICE: ModifierGroup = {
  _id: "mg-size", name: "Size Choice", required: true, min: 1, max: 1,
  options: [
    { _id: "size-small", name: "Small",          priceAdjustment: 0    },
    { _id: "size-large", name: "Large",           priceAdjustment: 3.50 },
  ],
}

const SIDE_CHOICE: ModifierGroup = {
  _id: "mg-sides", name: "Side Choice", required: true, min: 2, max: 2,
  options: [
    { _id: "side-white-rice",       name: "White Rice",       priceAdjustment: 0 },
    { _id: "side-rice-peas",        name: "Rice & Peas",      priceAdjustment: 0 },
    { _id: "side-cabbage-slaw",     name: "Cabbage Slaw",     priceAdjustment: 0 },
    { _id: "side-lettuce-mix",      name: "Lettuce Mix",      priceAdjustment: 0 },
    { _id: "side-plantain-sweet",   name: "Plantain-Sweet",   priceAdjustment: 0 },
    { _id: "side-jerk-sauce",       name: "Jerk Sauce",       priceAdjustment: 0 },
    { _id: "side-fry-chicken-sauce",name: "Fry Chicken Sauce",priceAdjustment: 0 },
  ],
}

const SAUCE_ADDITIONS: ModifierGroup = {
  _id: "mg-sauce", name: "Sauce Additions", required: false, min: 0, max: 2,
  options: [
    { _id: "sauce-jerk",        name: "Jerk Sauce",        priceAdjustment: 0.75 },
    { _id: "sauce-fry-chicken", name: "Fry Chicken Sauce", priceAdjustment: 0.75 },
  ],
}

const PLANTAIN_SIZE: ModifierGroup = {
  _id: "mg-plantain-size", name: "Plantain Size", required: true, min: 1, max: 1,
  options: [
    { _id: "plantain-sm", name: "Small",  priceAdjustment: 0    },
    { _id: "plantain-lg", name: "Large",  priceAdjustment: 2.00 },
  ],
}

const RECOMMENDED_APPS: ModifierGroup = {
  _id: "mg-recommended", name: "Recommended Sides & Apps", required: false, min: 0, max: 3,
  options: [
    { _id: "app-plantain", name: "Plantain", priceAdjustment: 6.98,  subModifierGroups: [PLANTAIN_SIZE] },
    { _id: "app-cabbage",  name: "Cabbage",  priceAdjustment: 4.99  },
    { _id: "app-cow-foot", name: "Cow Foot", priceAdjustment: 27.00 },
  ],
}

const CRAB_PROTEIN: ModifierGroup = {
  _id: "mg-protein", name: "Protein Choice", required: true, min: 1, max: 1,
  options: [
    { _id: "protein-crab", name: "1 Crab", priceAdjustment: 0 },
  ],
}

const PATTY_CHOICE: ModifierGroup = {
  _id: "mg-patty", name: "Patty Flavour", required: true, min: 1, max: 1,
  options: [
    { _id: "patty-beef",   name: "Beef",      priceAdjustment: 0    },
    { _id: "patty-chicken",name: "Chicken",   priceAdjustment: 0    },
    { _id: "patty-veggie", name: "Vegetable", priceAdjustment: 0    },
  ],
}

// Standard plate modifiers (size + sides + sauce + recommended add-ons)
const PLATE_MODIFIERS = [SIZE_CHOICE, SIDE_CHOICE, SAUCE_ADDITIONS, RECOMMENDED_APPS]

// ─── Fallback menu ────────────────────────────────────────────────────────────

export const FALLBACK_MENU: MenuItem[] = [

  // ── Section: Mains — Category: Weekly Specials ───────────────────────────────
  {
    _id: "jerk-chicken", name: "Jerk Chicken", section: "Mains", category: "Weekly Specials",
    tag: "Must Try", orderCount: 198,
    description: "Slow-grilled over pimento wood with scotch bonnet, allspice, and island herbs. Choose your size and sides.",
    price: 13.99, available: true,
    modifierGroups: PLATE_MODIFIERS,
  },
  {
    _id: "stew-chicken", name: "Stew Chicken", section: "Mains", category: "Weekly Specials",
    tag: "Classic", orderCount: 89,
    description: "Marinated chicken braised low and slow in a savory brown stew. A Jamaican household staple.",
    price: 12.99, available: true,
    modifierGroups: PLATE_MODIFIERS,
  },
  {
    _id: "curried-goat", name: "Curried Goat", section: "Mains", category: "Weekly Specials",
    tag: "Popular", orderCount: 134,
    description: "Slow-cooked goat in fragrant Jamaican curry with potatoes. Rich, hearty, and deeply satisfying.",
    price: 14.99, available: true,
    modifierGroups: PLATE_MODIFIERS,
  },

  // ── Section: Mains — Category: Lunch Plates ──────────────────────────────────
  {
    _id: "jerk-pork", name: "Jerk Pork", section: "Mains", category: "Lunch Plates",
    tag: "Fan Favourite", orderCount: 142,
    description: "Jerk pork with choice of size; paired with crab protein. Sides include rice variations, cabbage slaw, lettuce mix, sweet plantain, and flavorful sauces.",
    price: 16.50, available: true,
    modifierGroups: [SIZE_CHOICE, CRAB_PROTEIN, SIDE_CHOICE, SAUCE_ADDITIONS, RECOMMENDED_APPS],
  },
  {
    _id: "oxtail", name: "Oxtail", section: "Mains", category: "Lunch Plates",
    tag: "Popular", orderCount: 167,
    description: "Tender, slow-braised oxtail in a rich, deeply seasoned gravy. A Bull Top Taste signature.",
    price: null, available: true,
    modifierGroups: [SIZE_CHOICE, SIDE_CHOICE, SAUCE_ADDITIONS, RECOMMENDED_APPS],
  },
  {
    _id: "fried-chicken", name: "Fried Chicken", section: "Mains", category: "Lunch Plates",
    tag: "Crispy", orderCount: 76,
    description: "Marinated in island spices and fried golden. Crispy outside, juicy inside.",
    price: 11.99, available: true,
    modifierGroups: PLATE_MODIFIERS,
  },
  {
    _id: "cow-foot", name: "Cow Foot", section: "Mains", category: "Lunch Plates",
    tag: "Hearty", orderCount: 58,
    description: "A beloved Jamaican staple — fall-off-the-bone tender, slow-simmered with butter beans and spices.",
    price: 14.99, available: true,
    modifierGroups: PLATE_MODIFIERS,
  },
  {
    _id: "stew-peas", name: "Stew Peas", section: "Mains", category: "Lunch Plates",
    tag: "Comfort", orderCount: 47,
    description: "Creamy kidney peas and tender meat simmered in a coconut milk-based stew.",
    price: 12.99, available: true,
    modifierGroups: PLATE_MODIFIERS,
  },
  {
    _id: "ackee-saltfish", name: "Ackee & Saltfish", section: "Mains", category: "Classics",
    tag: "National Dish", orderCount: 61,
    description: "Jamaica's national dish — ackee sautéed with salted codfish, onions, tomatoes, and scotch bonnet.",
    price: null, available: true,
    modifierGroups: [SIDE_CHOICE, SAUCE_ADDITIONS],
  },

  // ── Section: Fish ─────────────────────────────────────────────────────────────
  {
    _id: "fried-fish", name: "Fried Fish", section: "Fish",
    tag: "Fresh", orderCount: 43,
    description: "Whole fried fish seasoned with island spices. Crispy skin, tender flesh. Market price daily.",
    price: null, available: true,
    modifierGroups: [SIDE_CHOICE, SAUCE_ADDITIONS],
  },
  {
    _id: "escovitch-fish", name: "Escovitch Fish", section: "Fish",
    tag: "Classic", orderCount: 38,
    description: "Fried fish topped with pickled vegetables, scotch bonnet, and vinegar sauce. A Jamaican favourite.",
    price: null, available: true,
    modifierGroups: [SIDE_CHOICE, SAUCE_ADDITIONS],
  },
  {
    _id: "brown-stew-fish", name: "Brown Stew Fish", section: "Fish",
    orderCount: 29,
    description: "Fish braised in a rich brown stew with onions, tomatoes, and island herbs.",
    price: null, available: true,
    modifierGroups: [SIDE_CHOICE, SAUCE_ADDITIONS],
  },

  // ── Section: Starters — Category: Quick Bites ────────────────────────────────
  {
    _id: "jamaican-patty", name: "Jamaican Patty", section: "Starters", category: "Quick Bites",
    tag: "Quick Bite", orderCount: 210,
    description: "Flaky golden pastry filled with your choice of seasoned beef, chicken, or vegetable.",
    price: 2.99, available: true,
    modifierGroups: [PATTY_CHOICE],
  },
  {
    _id: "festival", name: "Festival", section: "Starters", category: "Quick Bites",
    tag: "Classic Side", orderCount: 184,
    description: "Sweet fried dough — lightly crispy outside, soft inside. The perfect complement to any dish.",
    price: 1.50, available: true,
  },

  // ── Section: Starters — Category: Sides ─────────────────────────────────────
  {
    _id: "plantain", name: "Sweet Plantain", section: "Starters", category: "Sides",
    orderCount: 156,
    description: "Ripe plantain sliced and fried golden. Sweet, caramelized, and irresistible.",
    price: 6.98, available: true,
  },
  {
    _id: "cabbage-side", name: "Cabbage", section: "Starters", category: "Sides",
    orderCount: 98,
    description: "Lightly sautéed cabbage seasoned the Jamaican way.",
    price: 4.99, available: true,
  },
  {
    _id: "rice-peas", name: "Rice & Peas", section: "Starters", category: "Sides",
    orderCount: 87,
    description: "Coconut-infused rice with kidney beans — a Jamaican Sunday staple, available every day.",
    price: 3.99, available: true,
  },
]

export const FALLBACK_SPECIALS: Special[] = [
  {
    _id: "s1", title: "Daily Lunch Special",
    items: ["Curry Chicken", "Fried Chicken", "Stew Chicken", "Jerk Chicken"],
    price: 6.99, validFrom: "2024-01-01", validUntil: "2099-12-31", hours: "11 am – 2 pm",
  },
  {
    _id: "s2", title: "Daily Lunch Special",
    items: ["Curried Goat", "Cow Foot", "Stew Peas"],
    price: 7.99, validFrom: "2024-01-01", validUntil: "2099-12-31", hours: "11 am – 2 pm",
  },
]
