import { NextRequest, NextResponse } from "next/server"
import { stripe }                   from "@/lib/stripe"
import { orderStore }               from "@/lib/orderStore"
import type { CartItem, Order }     from "@/types"

interface CheckoutBody {
  items:    CartItem[]
  total:    number
  customer: {
    name:  string
    email: string
    phone: string
    type:  "pickup" | "delivery"
    notes: string
  }
}

export async function POST(req: NextRequest) {
  const { items, customer }: CheckoutBody = await req.json()

  // ── 1. Pre-create order in the store ────────────────────────────────────────
  // We do this before Stripe so the kitchen dashboard receives the order the
  // moment payment succeeds (via the success_url redirect) without needing a
  // webhook. The order is stored in full with all modifier data.

  const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const order: Order = {
    id:            orderId,
    items,
    total:         items.reduce((sum, i) => sum + i.effectivePrice * i.quantity, 0),
    customerName:  customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    type:          customer.type,
    notes:         customer.notes || undefined,
    createdAt:     new Date().toISOString(),
  }
  orderStore.add(order)

  // ── 2. Build Stripe line items ───────────────────────────────────────────────
  // Use effectivePrice (base + modifier upcharges) so the customer is charged
  // the correct amount. Show modifier selections in the product description.

  const lineItems = items.map(item => {
    const modSummary = item.selectedModifiers
      ?.flatMap(g => g.selections.map(s => s.name))
      .join(", ")

    return {
      price_data: {
        currency:     "usd",
        unit_amount:  Math.round(item.effectivePrice * 100),
        product_data: {
          name:        item.name,
          ...(modSummary ? { description: modSummary.slice(0, 500) } : {}),
        },
      },
      quantity: item.quantity,
    }
  })

  // ── 3. Stripe metadata — keep all values under 500 chars ────────────────────
  // Never serialize full CartItem objects here; pass orderId as reference.
  // The brief itemsSummary is for human readability in the Stripe dashboard.

  const itemsSummary = items
    .map(i => `${i.quantity}× ${i.name}`)
    .join(", ")
    .slice(0, 490)

  const session = await stripe.checkout.sessions.create({
    line_items:     lineItems,
    mode:           "payment",
    customer_email: customer.email,
    metadata: {
      orderId,
      customerName:  customer.name,
      customerPhone: customer.phone,
      orderType:     customer.type,
      notes:         (customer.notes ?? "").slice(0, 500),
      items:         itemsSummary,
    },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${process.env.NEXT_PUBLIC_BASE_URL}/#menu`,
  })

  return NextResponse.json({ url: session.url })
}
