// seed-orders.mjs
// Generates realistic mock orders for Bull Top Taste — Royal Palm Beach
// Run: node seed-orders.mjs
// Produces: 300 historical completed orders (30 days) + 9 active orders
import { createClient } from "@sanity/client"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: "2024-03-29",
})

// ── Config ────────────────────────────────────────────────────────────────────
const LOCATION_ID = "108830e7-492c-4ccf-8c70-8b7e2a4dc34e" // Royal Palm Beach
const HISTORICAL_COUNT = 300
const TAX_RATE = 1.07 // Palm Beach County 7%
const BATCH_SIZE = 50

// ── Menu Items (real Sanity refs) ─────────────────────────────────────────────
const MENU_ITEMS = [
  {
    ref: "235f1ebe-b16e-4923-a33e-137b6f6762e8",
    name: "Oxtails",
    price: 23.99,
    largeMod: 4,
    weight: 15,
  },
  {
    ref: "690c69a2-7dae-489d-8d4e-1789e6264f36",
    name: "Jerk Chicken",
    price: 14,
    largeMod: 2,
    weight: 25,
  },
  {
    ref: "03b7bc2e-5e41-4d0b-bd41-72c3cdf229d5",
    name: "Curry Chicken",
    price: 14,
    largeMod: 2,
    weight: 20,
  },
  {
    ref: "23672e7a-ae3a-4e14-a1e3-d2b546a46480",
    name: "Stew Chicken",
    price: 14,
    largeMod: 2,
    weight: 20,
  },
  {
    ref: "bb551bac-a4eb-4efd-b84a-9e19a7c5b7fd",
    name: "Fried Chicken",
    price: 14,
    largeMod: 2,
    weight: 15,
  },
  {
    ref: "cd770c28-0fe6-4218-b17e-5dd27e11cb1a",
    name: "Curry Goat",
    price: 16.5,
    largeMod: 3.5,
    weight: 5,
  },
]

// Complement items — low attach rate to reflect reality
const COMPLEMENT_ITEMS = [
  { ref: "d0a22311-dce3-4de9-ba24-5ba96c8d13ba", name: "Spicy Beef Patty", price: 3, weight: 60 },
  {
    ref: "9b3d67bd-3c62-4e91-a75e-2747be9bf33d",
    name: "Pineapple Guava Juice",
    price: 3.5,
    weight: 40,
  },
]

// ── South Florida name pools ───────────────────────────────────────────────────
const FIRST_NAMES = [
  "Marcus",
  "Destiny",
  "Andre",
  "Keisha",
  "Devon",
  "Latoya",
  "Darnell",
  "Shaniqua",
  "Tyrone",
  "Monique",
  "Jamal",
  "Tanisha",
  "Rasheed",
  "Brianna",
  "Antoine",
  "Jasmine",
  "Malik",
  "Shanice",
  "Terrence",
  "Alicia",
  "Dwayne",
  "Nichelle",
  "Jerome",
  "Tiffany",
  "Carlos",
  "Maria",
  "Miguel",
  "Sofia",
  "Juan",
  "Isabella",
  "Luis",
  "Gabriela",
  "Roberto",
  "Valentina",
  "Diego",
  "Camila",
  "Ricardo",
  "Daniela",
  "Eduardo",
  "Lucia",
  "James",
  "Ashley",
  "Robert",
  "Jennifer",
  "Michael",
  "Amanda",
  "David",
  "Stephanie",
  "Kevin",
  "Nicole",
  "Brian",
  "Michelle",
  "Jason",
  "Danielle",
  "Ryan",
  "Amber",
  "Kwame",
  "Asha",
  "Kofi",
  "Abena",
  "Olu",
  "Adaeze",
  "Chidi",
  "Ngozi",
]

const LAST_NAMES = [
  "Williams",
  "Johnson",
  "Brown",
  "Davis",
  "Wilson",
  "Anderson",
  "Thomas",
  "Jackson",
  "White",
  "Harris",
  "Martin",
  "Thompson",
  "Garcia",
  "Martinez",
  "Rodriguez",
  "Lopez",
  "Gonzalez",
  "Hernandez",
  "Perez",
  "Torres",
  "Campbell",
  "Mitchell",
  "Carter",
  "Roberts",
  "Phillips",
  "Evans",
  "Turner",
  "Parker",
  "Collins",
  "Edwards",
  "Stewart",
  "Morris",
  "Jean",
  "Pierre",
  "Baptiste",
  "Desir",
  "Charles",
  "Henry",
  "Louis",
  "Paul",
  "Mensah",
  "Asante",
  "Osei",
  "Boateng",
  "Owusu",
  "Adjei",
  "Acheampong",
  "Darko",
]

const EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "aol.com",
  "comcast.net",
  "bellsouth.net",
  "att.net",
]

const AREA_CODES = ["561", "954", "786", "305"]

const SIDE_COMBOS = [
  "White Rice, Cabbage Slaw",
  "Rice & Peas, Cabbage Slaw",
  "White Rice, Plantain-Sweet",
  "Rice & Peas, Lettuce Mix",
  "White Rice, Lettuce Mix",
  "Rice & Peas, Plantain-Sweet",
]

const SPECIAL_INSTRUCTIONS = [
  "Extra spicy please",
  "Sauce on the side",
  "No onions",
  "Well done",
  "Extra rice",
  null,
  null,
  null,
  null,
  null,
  null,
  null,
]

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))
const randomId = () => Math.random().toString(36).slice(2, 9)
const getRandom = arr => arr[Math.floor(Math.random() * arr.length)]

function weightedRandom(items) {
  const total = items.reduce((s, i) => s + i.weight, 0)
  let rand = Math.random() * total
  for (const item of items) {
    rand -= item.weight
    if (rand <= 0) return item
  }
  return items[items.length - 1]
}

function randomName() {
  return `${getRandom(FIRST_NAMES)} ${getRandom(LAST_NAMES)}`
}

function randomEmail(name) {
  const clean = name.toLowerCase().replace(" ", ".")
  const suffix = Math.random() > 0.5 ? Math.floor(Math.random() * 99) : ""
  return `${clean}${suffix}@${getRandom(EMAIL_DOMAINS)}`
}

function randomPhone() {
  const area = getRandom(AREA_CODES)
  const mid = Math.floor(Math.random() * 900) + 100
  const end = Math.floor(Math.random() * 9000) + 1000
  return `${area}${mid}${end}`
}

function addMins(isoDate, mins) {
  return new Date(new Date(isoDate).getTime() + mins * 60000).toISOString()
}

// ── Timestamp generators ───────────────────────────────────────────────────────
function historicalTimestamp() {
  const now = new Date()
  const daysAgo = Math.floor(Math.random() * 30) + 1
  const date = new Date(now)
  date.setDate(date.getDate() - daysAgo)

  const r = Math.random()
  let hour
  if (r < 0.1)
    hour = Math.floor(Math.random() * 3) + 8 // 8-10am  (10%)
  else if (r < 0.4)
    hour = Math.floor(Math.random() * 3) + 11 // 11am-1pm (30%)
  else if (r < 0.5)
    hour = Math.floor(Math.random() * 3) + 14 // 2-4pm   (10%)
  else hour = Math.floor(Math.random() * 4) + 17 // 5-8pm   (50%)

  date.setHours(hour, Math.floor(Math.random() * 60), 0, 0)
  return date.toISOString()
}

function activeTimestamp(minutesAgo) {
  return new Date(Date.now() - minutesAgo * 60000).toISOString()
}

// ── Order item builder ────────────────────────────────────────────────────────
function buildItem(idx) {
  const menuItem = weightedRandom(MENU_ITEMS)
  const qty = Math.random() < 0.7 ? 1 : Math.random() < 0.7 ? 2 : 3
  const modifiers = []
  let upcharge = 0

  // Size Choice — only for items that have a large variant
  if (menuItem.largeMod) {
    const isLarge = Math.random() < 0.4
    modifiers.push({
      _type: "modifierSelection",
      _key: `mod-${randomId()}`,
      groupName: "Size Choice",
      selections: isLarge ? `Large +$${menuItem.largeMod.toFixed(2)}` : "Small",
    })
    if (isLarge) upcharge += menuItem.largeMod
  }

  // Protein Choice
  const protein =
    menuItem.name === "Oxtails" ? "Beef" : menuItem.name === "Curry Goat" ? "Goat" : "Chicken"
  modifiers.push({
    _type: "modifierSelection",
    _key: `mod-${randomId()}`,
    groupName: "Protein Choice",
    selections: protein,
  })

  // Side Choice
  modifiers.push({
    _type: "modifierSelection",
    _key: `mod-${randomId()}`,
    groupName: "Side Choice",
    selections: getRandom(SIDE_COMBOS),
  })

  // Sauce Additions — 25% chance
  if (Math.random() < 0.25) {
    const saucePick = Math.random()
    let sauceStr, sauceCharge
    if (saucePick < 0.4) {
      sauceStr = "Jerk Sauce +$0.75"
      sauceCharge = 0.75
    } else if (saucePick < 0.7) {
      sauceStr = "Fry Chicken Sauce +$0.75"
      sauceCharge = 0.75
    } else {
      sauceStr = "Jerk Sauce +$0.75, Fry Chicken Sauce +$0.75"
      sauceCharge = 1.5
    }
    modifiers.push({
      _type: "modifierSelection",
      _key: `mod-${randomId()}`,
      groupName: "Sauce Additions",
      selections: sauceStr,
    })
    upcharge += sauceCharge
  }

  // Recommended Sides & Apps — 15% chance (low to reflect reality)
  if (Math.random() < 0.15) {
    const apps = [
      { text: "Plantain (8 Oz) +$6.98", price: 6.98 },
      { text: "Plantain (16 Oz) +$11.90", price: 11.9 },
      { text: "Cabbage (8 Oz) +$4.99", price: 4.99 },
      { text: "Cow Foot (16 Oz) +$27.00", price: 27.0 },
    ]
    const app = getRandom(apps)
    modifiers.push({
      _type: "modifierSelection",
      _key: `mod-${randomId()}`,
      groupName: "Recommended Sides and Apps",
      selections: app.text,
    })
    upcharge += app.price
  }

  const effectivePrice = Number((menuItem.price + upcharge).toFixed(2))

  return {
    _type: "orderItem",
    _key: `item-${randomId()}-${idx}`,
    itemName: menuItem.name,
    menuItemRef: menuItem.ref,
    quantity: qty,
    basePrice: menuItem.price,
    effectivePrice,
    modifiers,
    specialInstructions: getRandom(SPECIAL_INSTRUCTIONS) || undefined,
  }
}

function buildOrder({ status, createdAt, confirmedAt, startedAt, readyAt, pickedUpAt }) {
  const name = randomName()
  const itemCount = Math.random() < 0.6 ? 1 : Math.random() < 0.7 ? 2 : 3
  const items = Array.from({ length: itemCount }, (_, i) => buildItem(i))

  // Complement item — ~12% attach rate to reflect reality
  if (Math.random() < 0.12) {
    const comp = weightedRandom(COMPLEMENT_ITEMS)
    items.push({
      _type: "orderItem",
      _key: `item-${randomId()}-comp`,
      itemName: comp.name,
      menuItemRef: comp.ref,
      quantity: 1,
      basePrice: comp.price,
      effectivePrice: comp.price,
      modifiers: [],
    })
  }

  const subtotal = items.reduce((s, i) => s + i.effectivePrice * i.quantity, 0)
  const total = Number((subtotal * TAX_RATE).toFixed(2))

  return {
    _type: "order",
    location: { _type: "reference", _ref: LOCATION_ID },
    status,
    type: "pickup",
    customerName: name,
    customerEmail: randomEmail(name),
    customerPhone: randomPhone(),
    items,
    total,
    createdAt,
    ...(confirmedAt && { confirmedAt }),
    ...(startedAt && { startedAt }),
    ...(readyAt && { readyAt }),
    ...(pickedUpAt && { pickedUpAt }),
    stripePaymentIntentId: `pi_test_${randomId()}${randomId()}`,
    stripeSessionId: `cs_test_${randomId()}${randomId()}`,
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log(`\n🌱 Seeding Bull Top Taste — Royal Palm Beach`)
  console.log(`   Tax rate: 7% | Batch size: ${BATCH_SIZE} | Historical: ${HISTORICAL_COUNT}\n`)

  // 1. Historical completed orders — batched transactions
  console.log(`📅 Creating ${HISTORICAL_COUNT} historical orders in batches of ${BATCH_SIZE}...`)

  let transaction = client.transaction()
  let batchCount = 0

  for (let i = 1; i <= HISTORICAL_COUNT; i++) {
    const createdAt = historicalTimestamp()
    const confirmedAt = addMins(createdAt, 1)
    const startedAt = addMins(createdAt, 5)
    const readyAt = addMins(createdAt, 20)
    const pickedUpAt = addMins(createdAt, 25)

    const order = buildOrder({
      status: "completed",
      createdAt,
      confirmedAt,
      startedAt,
      readyAt,
      pickedUpAt,
    })
    transaction.create(order)
    batchCount++

    if (batchCount === BATCH_SIZE || i === HISTORICAL_COUNT) {
      try {
        await transaction.commit()
        console.log(`  ✓ Batch committed — ${i}/${HISTORICAL_COUNT} orders`)
        transaction = client.transaction()
        batchCount = 0
        await sleep(300)
      } catch (err) {
        console.error(`  ✗ Batch failed at order ${i}:`, err.message)
      }
    }
  }

  // 2. Active orders — individual creates for precise timestamp control
  console.log(`\n🍽️  Creating active orders for kitchen demo...`)

  const activeOrders = [
    // Incoming (pending)
    { status: "pending", minsAgo: 3 },
    { status: "pending", minsAgo: 7 },
    { status: "pending", minsAgo: 12 },
    { status: "pending", minsAgo: 18 },
    // Preparing (kitchen) — one approaching warn, one at crit
    { status: "kitchen", minsAgo: 8, startOffset: 3 },
    { status: "kitchen", minsAgo: 22, startOffset: 3 },
    { status: "kitchen", minsAgo: 35, startOffset: 3 },
    // Ready (floor)
    { status: "floor", minsAgo: 15, startOffset: 3, readyOffset: 12 },
    { status: "floor", minsAgo: 28, startOffset: 3, readyOffset: 12 },
  ]

  for (const config of activeOrders) {
    const createdAt = activeTimestamp(config.minsAgo)
    const confirmedAt = addMins(createdAt, 1)
    const startedAt = config.startOffset ? addMins(createdAt, config.startOffset) : undefined
    const readyAt = config.readyOffset ? addMins(createdAt, config.readyOffset) : undefined

    const order = buildOrder({ status: config.status, createdAt, confirmedAt, startedAt, readyAt })

    try {
      await client.create(order)
      console.log(
        `  ✓ ${config.status.toUpperCase().padEnd(8)} — ${order.customerName} ($${order.total})`
      )
      await sleep(150)
    } catch (err) {
      console.error(`  ✗ Failed:`, err.message)
    }
  }

  console.log(`\n✅ Done — ${HISTORICAL_COUNT + activeOrders.length} total orders seeded`)
  console.log(`   /admin        → kitchen dashboard with active orders`)
  console.log(`   /admin/office → analytics with 30 days of history\n`)
}

seed()
