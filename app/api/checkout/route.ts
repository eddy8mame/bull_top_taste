import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getSanityWriteClient, getSanityReadClient } from "@/lib/sanity"
import type { CartItem, SanityOrderItem, SanityOrderModifier } from "@/types"

// ─── Request body ─────────────────────────────────────────────────────────────

interface CheckoutBody {
  items: CartItem[]
  total: number
  customer: {
    name: string
    email: string
    phone: string
    type: "pickup" | "delivery"
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
//
// Sub-modifier handling (parentKey):
//   When a modifier group contains an option that has sub-modifier groups
//   (e.g. "Plantain-Sweet" has a "Size Choice" sub-group), that parent group
//   is split into per-option records. This ensures parentKey on the sub-modifier
//   record points unambiguously to a single-option parent record — avoiding
//   the ambiguity that would arise if the parent record contained multiple priced
//   options ("Plantain-Sweet +$6.98, Jerk Sauce +$0.75") and only one of them
//   had a size choice.
function toSanityItem(item: CartItem): SanityOrderItem {
  const selectedMods = item.selectedModifiers ?? []

  // ── Intermediate representation ─────────────────────────────────────────────
  // Holds per-record data before parentKey is resolved.
  interface IntermRec {
    _key: string
    groupName: string
    selectionsStr: string
    sourceGroupId: string // the SelectedModifier.groupId this came from
    // Set when this record is a single-option split and that option has
    // sub-modifier groups — used in the second pass to populate parentKeyOf.
    ownsSubsOfOptionId?: string
    parentOptionId?: string
  }
  const recs: IntermRec[] = []

  for (const mod of selectedMods) {
    const menuGroup = item.modifierGroups?.find(g => g._id === mod.groupId)

    // Does any selection in this group have sub-modifier groups?
    const groupHasSubMods = mod.selections.some(sel => {
      const opt = menuGroup?.options.find(o => o._id === sel.optionId)
      return (opt?.subModifierGroups?.length ?? 0) > 0
    })

    if (groupHasSubMods) {
      // Split into per-selection records so parentKey is unambiguous.
      for (const sel of mod.selections) {
        const opt = menuGroup?.options.find(o => o._id === sel.optionId)
        recs.push({
          _key: sanityKey(),
          groupName: mod.groupName,
          selectionsStr:
            sel.priceAdjustment > 0 ? `${sel.name} +$${sel.priceAdjustment.toFixed(2)}` : sel.name,
          sourceGroupId: mod.groupId,
          ownsSubsOfOptionId: (opt?.subModifierGroups?.length ?? 0) > 0 ? sel.optionId : undefined,
          parentOptionId: mod.parentOptionId,
        })
      }
    } else {
      // Standard case: all selections collapsed into one record.
      recs.push({
        _key: sanityKey(),
        groupName: mod.groupName,
        selectionsStr: mod.selections
          .map(s =>
            s.priceAdjustment > 0 ? `${s.name} +$${s.priceAdjustment.toFixed(2)}` : s.name
          )
          .join(", "),
        sourceGroupId: mod.groupId,
        parentOptionId: mod.parentOptionId,
      })
    }
  }

  // ── Build parentKeyOf lookup ─────────────────────────────────────────────────
  // Maps parentOptionId (e.g., "Plantain") → _key of the specific parent record that owns it.
  const parentKeyOf = new Map<string, string>()

  for (const rec of recs) {
    if (rec.ownsSubsOfOptionId) {
      // Map the parent's Option ID to its freshly generated Sanity _key
      parentKeyOf.set(rec.ownsSubsOfOptionId, rec._key)
    }
  }

  // ── Assemble final SanityOrderModifier array ─────────────────────────────────
  const modifiers: SanityOrderModifier[] = recs.map(rec => ({
    _key: rec._key,
    groupName: rec.groupName,
    selections: rec.selectionsStr,
    ...(rec.parentOptionId && parentKeyOf.has(rec.parentOptionId)
      ? { parentKey: parentKeyOf.get(rec.parentOptionId) }
      : {}),
  }))

  return {
    _key: sanityKey(),
    itemName: item.name,
    menuItemRef: item._id,
    quantity: item.quantity,
    basePrice: item.price,
    effectivePrice: item.effectivePrice,
    modifiers: modifiers.length ? modifiers : undefined,
    specialInstructions: item.specialInstructions,
  }
}

// ─── POST /api/checkout ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { items, customer }: CheckoutBody = await req.json()

  const total = items.reduce((sum, i) => sum + i.effectivePrice * i.quantity, 0)

  // ── 0. Kitchen open/close gate ────────────────────────────────────────────
  // Checked before any Stripe or Sanity work. When the admin toggles the
  // kitchen closed via the Kitchen Display, this blocks new checkout attempts
  // at the API level, ensuring the storefront cannot process orders regardless
  // of client-side UI state. Absent SANITY_LOCATION_ID → gate is skipped
  // (dev/migration fallback — kitchen assumed open).

  const locationId = process.env.SANITY_LOCATION_ID
  if (locationId) {
    const readClient = getSanityReadClient()
    if (readClient) {
      const kitchenOpen = await readClient.fetch<boolean | null>(
        `*[_type == "location" && _id == $id][0].kitchenOpen`,
        { id: locationId }
      )
      if (kitchenOpen === false) {
        return NextResponse.json(
          {
            error: "Kitchen is currently closed — online ordering is paused.",
            code: "KITCHEN_CLOSED",
          },
          { status: 503 }
        )
      }
    }
  }

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
        currency: "usd",
        unit_amount: Math.round(item.effectivePrice * 100),
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

  const orderId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const itemsSummary = items
    .map(i => `${i.quantity}× ${i.name}`)
    .join(", ")
    .slice(0, 490)

  // ── 3. Create Stripe Checkout Session ────────────────────────────────────

  const session = await stripe.checkout.sessions.create({
    line_items: lineItems,
    mode: "payment",
    customer_email: customer.email,
    metadata: {
      orderId,
      customerName: customer.name.slice(0, 500),
      customerPhone: customer.phone.slice(0, 500),
      orderType: customer.type,
      notes: (customer.notes ?? "").slice(0, 500),
      items: itemsSummary,
    },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/#menu`,
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
        _id: orderId,

        // Location reference — required by schema, gated on env variable.
        // Set SANITY_LOCATION_ID to the _id of the location document in Sanity.
        ...(locationId ? { location: { _type: "reference", _ref: locationId } } : {}),

        status: "pending",
        type: customer.type,

        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        notes: customer.notes || undefined,

        items: items.map(toSanityItem),
        total,

        createdAt: new Date().toISOString(),
        stripeSessionId: session.id,
      })
    } catch (err) {
      // Log but do not throw — a Sanity write failure must not block checkout.
      console.error("[checkout] Failed to persist order to Sanity:", err)
    }
  }

  return NextResponse.json({ url: session.url })
}
