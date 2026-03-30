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

// Increased to 300 to provide roughly 10 orders per day for a solid graph
const ORDER_COUNT = 300

const INSTRUCTIONS = [
  "Extra spicy",
  "Allergy: Peanuts",
  "Sauce on the side",
  "No utensils",
  null,
  null,
  null,
  null,
]

const MENU_ITEMS = [
  { ref: "235f1ebe-b16e-4923-a33e-137b6f6762e8", name: "Oxtails", price: 23.99 },
  { ref: "mock-ref-jerk", name: "Jerk Chicken", price: 13.99 },
  { ref: "mock-ref-curry", name: "Curried Goat", price: 14.99 },
  { ref: "mock-ref-stew", name: "Stew Chicken", price: 12.99 },
]

// ── Helpers ─────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const getRandom = arr => arr[Math.floor(Math.random() * arr.length)]
const randomId = () => Math.random().toString(36).slice(2, 8).toLowerCase()

// ── Time Generation Engine ────────────────────────────────────────────────
function generateHistoricalTimestamps() {
  const now = new Date()

  // 1. Pick a random day in the last 30 days
  const daysAgo = Math.floor(Math.random() * 30)
  const orderDate = new Date(now)
  orderDate.setDate(orderDate.getDate() - daysAgo)

  // 2. Pick a weighted hour (8 AM to 8 PM)
  const hourRand = Math.random()
  let hour
  if (hourRand < 0.15) {
    hour = Math.floor(Math.random() * 3) + 8 // 8am - 10am (15% Morning)
  } else if (hourRand < 0.45) {
    hour = Math.floor(Math.random() * 3) + 11 // 11am - 1pm (30% Lunch Rush)
  } else if (hourRand < 0.6) {
    hour = Math.floor(Math.random() * 3) + 14 // 2pm - 4pm (15% Afternoon Lull)
  } else {
    hour = Math.floor(Math.random() * 4) + 17 // 5pm - 8pm (40% Dinner Rush)
  }

  const minute = Math.floor(Math.random() * 60)
  orderDate.setHours(hour, minute, 0, 0)

  // 3. Cascade timestamps chronologically forward from the creation time
  const addMins = (date, mins) => new Date(date.getTime() + mins * 60000).toISOString()

  // Simulating typical restaurant flow:
  // Checkout -> (1m) -> Paid -> (4m) -> Kitchen Starts -> (15m prep) -> Ready -> (5m wait) -> Picked up
  return {
    createdAt: orderDate.toISOString(),
    confirmedAt: addMins(orderDate, 1),
    startedAt: addMins(orderDate, 5),
    readyAt: addMins(orderDate, 20),
    pickedUpAt: addMins(orderDate, 25),
  }
}

// ── Dynamic Modifier Generator ──────────────────────────────────────────────
function generateModifiers() {
  const modifiers = []
  let upchargeTotal = 0

  if (Math.random() > 0.5) {
    modifiers.push({
      _type: "modifierSelection",
      _key: `mod-${randomId()}`,
      groupName: "Size Choice",
      selections: "Large +$3.50",
    })
    upchargeTotal += 3.5
  } else {
    modifiers.push({
      _type: "modifierSelection",
      _key: `mod-${randomId()}`,
      groupName: "Size Choice",
      selections: "Small",
    })
  }

  const sides = [
    "Rice & Peas, Cabbage Slaw",
    "White Rice, Plantain-Sweet",
    "Rice & Peas, Lettuce Mix",
    "White Rice, Cabbage Slaw",
  ]
  modifiers.push({
    _type: "modifierSelection",
    _key: `mod-${randomId()}`,
    groupName: "Side Choice",
    selections: getRandom(sides),
  })

  if (Math.random() > 0.7) {
    const sauces = [
      "Jerk Sauce +$0.75",
      "Fry Chicken Sauce +$0.75",
      "Jerk Sauce +$0.75, Fry Chicken Sauce +$0.75",
    ]
    const selection = getRandom(sauces)
    modifiers.push({
      _type: "modifierSelection",
      _key: `mod-${randomId()}`,
      groupName: "Sauce Additions",
      selections: selection,
    })
    upchargeTotal += (selection.match(/\+\$0\.75/g) || []).length * 0.75
  }

  if (Math.random() > 0.8) {
    const apps = [
      { text: "Plantain (Small) +$6.98", price: 6.98 },
      { text: "Plantain (Large) +$8.98", price: 8.98 },
      { text: "Cabbage +$4.99", price: 4.99 },
    ]
    const app = getRandom(apps)
    modifiers.push({
      _type: "modifierSelection",
      _key: `mod-${randomId()}`,
      groupName: "Recommended Sides & Apps",
      selections: app.text,
    })
    upchargeTotal += app.price
  }

  return { modifiers, upchargeTotal }
}

// ── Main Execution ──────────────────────────────────────────────────────────
async function seedOrders() {
  // Hardcoded to your specific active location
  const locationId = "693176e9-a0f2-4b47-b1a1-afb3e6941f1a"

  console.log(`Starting historical generation of ${ORDER_COUNT} test orders...`)

  for (let i = 1; i <= ORDER_COUNT; i++) {
    // Generate chronological timestamps restricted to store hours
    const { createdAt, confirmedAt, startedAt, readyAt, pickedUpAt } =
      generateHistoricalTimestamps()

    const itemCount = Math.floor(Math.random() * 3) + 1
    const items = Array.from({ length: itemCount }).map((_, idx) => {
      const menuItem = getRandom(MENU_ITEMS)
      const qty = Math.floor(Math.random() * 3) + 1

      const { modifiers, upchargeTotal } = generateModifiers()
      const effectivePrice = menuItem.price + upchargeTotal

      return {
        _type: "orderItem",
        _key: `item-${randomId()}-${idx}`,
        basePrice: menuItem.price,
        effectivePrice: Number(effectivePrice.toFixed(2)),
        itemName: menuItem.name,
        menuItemRef: menuItem.ref,
        modifiers: modifiers,
        quantity: qty,
        specialInstructions: getRandom(INSTRUCTIONS),
      }
    })

    const total = items.reduce((sum, item) => sum + item.effectivePrice * item.quantity, 0)
    const grandTotal = Number((total * 1.07).toFixed(2))

    const mockOrder = {
      _type: "order",
      location: {
        _ref: locationId,
        _type: "reference",
      },
      // All historical records forced to 'completed'
      status: "completed",
      type: "pickup",
      createdAt,
      confirmedAt,
      startedAt,
      readyAt,
      pickedUpAt,

      customerName: `Test Customer ${randomId().toUpperCase()}`,
      customerEmail: `test_${randomId()}@example.com`,
      customerPhone: `555123${Math.floor(1000 + Math.random() * 9000)}`,
      notes: getRandom(INSTRUCTIONS),

      items: items,
      total: grandTotal,
      stripePaymentIntentId: `pi_test_${randomId()}${randomId()}`,
      stripeSessionId: `cs_test_${randomId()}${randomId()}`,
    }

    try {
      await client.create(mockOrder)
      console.log(
        `[${i}/${ORDER_COUNT}] Created historical order on ${createdAt.split("T")[0]} ($${mockOrder.total})`
      )
      await sleep(Math.floor(Math.random() * 100) + 50)
    } catch (error) {
      console.error(`Failed to create order ${i}:`, error.message)
    }
  }

  console.log("✅ Historical backfill complete.")
}

seedOrders()
