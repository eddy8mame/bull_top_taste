import { NextRequest, NextResponse }       from "next/server"
import { stripe }                          from "@/lib/stripe"
import { getSanityWriteClient }            from "@/lib/sanity"
import type { CartItem, SanityOrderItem, SanityOrderModifier } from "@/types"

// ─── Request body ─────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Generate a short random key for Sanity's required _key fields on array items.
function sanityKey() {
  return Math.random().toString(36).slice(2, 10)
}

// Map a CartItem (rich client type) to the denormalized SanityOrderItem that
// gets stored in the Sanity order document. Modifier details are collapsed to a
// human-readable string per group so the record is self-contained even if the
// menu item is later edited in the CMS.
function toSanityItem(item: CartItem): SanityOrderItem {
  const modifiers: SanityOrderModifier[] = (item.selectedModifiers ?? []).map(mod => ({
    _key:      sanityKey(),
    groupName: mod.groupName,
    selections: mod.selections
      .map(s => s.priceAdjustment > 0 ? `${s.name} +$${s.priceAdjustment.toFixed(2)}` : s.name)
      .join(", "),
  }))

  return {
    _key:                sanityKey(),
    itemName:            item.name,
    menuItemRef:         item._id,
    quantity:            item.quantity,
    basePrice:           item.price,
    effectivePrice:      item.effectivePrice,
    modifiers:           modifiers.length ? modifiers : undefined,
    specialInstructions: item.specialInstructions,
  }
}

// ─── POST /api/checkout ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { items, customer }: CheckoutBody = await req.json()

  const total = items.reduce((sum, i) => sum + i.effectivePrice * i.quantity, 0)

  // ── 1. Build Stripe line items ─────────────────────────────────────────────
  // effectivePrice carries all modifier upcharges, so the customer is always
  // charged the correct amount. Modifier names are shown in the product
  // description for receipt clarity (capped at 500 chars per Stripe's limit).

  const lineItems = items.map(item => {
    const modSummary = item.selectedModifiers
      ?.flatMap(g => g.selections.map(s => s.name))
      .join(", ")

    return {
      price_data: {
        currency:     "usd",
        unit_amount:  Math.round(item.effectivePrice * 100),
        product_data: {
          name: item.name,
          ...(modSummary ? { description: modSummary.slice(0, 500) } : {}),
        },
      },
      quantity: item.quantity,
    }
  })

  // ── 2. Stripe metadata ────────────────────────────────────────────────────
  // Keep all values under Stripe's 500-char-per-value limit. Full order data
  // lives in Sanity; this metadata is for human readability in the dashboard
  // and as a cross-reference key (orderId).

  const orderId      = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const itemsSummary = items.map(i => `${i.quantity}× ${i.name}`).join(", ").slice(0, 490)

  // ── 3. Create Stripe Checkout Session ────────────────────────────────────

  const session = await stripe.checkout.sessions.create({
    line_items:     lineItems,
    mode:           "payment",
    customer_email: customer.email,
    metadata: {
      orderId,
      customerName:  customer.name.slice(0, 500),
      customerPhone: customer.phone.slice(0, 500),
      orderType:     customer.type,
      notes:         (customer.notes ?? "").slice(0, 500),
      items:         itemsSummary,
    },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${process.env.NEXT_PUBLIC_BASE_URL}/#menu`,
  })

  // ── 4. Persist order to Sanity ────────────────────────────────────────────
  // We write to Sanity immediately after the session is created, using orderId
  // as the Sanity document _id so the two systems stay linked via metadata.
  //
  // Timing note: this runs before the customer completes payment. An abandoned
  // checkout will leave a "pending" order in Sanity. The notify webhook
  // (app/api/notify/route.ts) handles the checkout.session.completed event and
  // can be used to confirm payment or patch the Stripe payment intent ID.
  //
  // Zero-Key safe: if the write client is unavailable (missing env vars), we
  // log the error but still return the Stripe session URL — the customer's
  // checkout is never blocked by a missing Sanity connection.

  const sanityClient = getSanityWriteClient()

  if (sanityClient) {
    try {
      const locationId = process.env.SANITY_LOCATION_ID

      await sanityClient.create({
        _type: "order",
        _id:   orderId,

        // Location reference — required by schema, gated on env variable.
        // Set SANITY_LOCATION_ID to the _id of the location document in Sanity.
        ...(locationId
          ? { location: { _type: "reference", _ref: locationId } }
          : {}
        ),

        status: "pending",
        type:   customer.type,

        customerName:  customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        notes:         customer.notes || undefined,

        items: items.map(toSanityItem),
        total,

        createdAt:       new Date().toISOString(),
        stripeSessionId: session.id,
      })
    } catch (err) {
      // Log but do not throw — a Sanity write failure must not block checkout.
      console.error("[checkout] Failed to persist order to Sanity:", err)
    }
  }

  return NextResponse.json({ url: session.url })
}
