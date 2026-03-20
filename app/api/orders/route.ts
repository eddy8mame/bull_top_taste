import { NextResponse }          from "next/server"
import { getSanityReadClient }   from "@/lib/sanity"
import type { AdminOrder }       from "@/types"

// GET /api/orders — all orders for this location, newest first.
// Polled by the admin kitchen/floor dashboard (SWR, 15 s interval) and the
// office analytics page. Includes completed orders for the full-history view.
//
// Multi-tenant: filtered by SANITY_LOCATION_ID when set. If the env var is
// absent (local dev before Sanity is configured), all orders are returned.

const LOCATION_ID = process.env.SANITY_LOCATION_ID

const ORDER_PROJECTION = `{
  _id,
  status,
  type,
  customerName,
  customerEmail,
  customerPhone,
  notes,
  total,
  createdAt,
  readyAt,
  pickedUpAt,
  items[] {
    _key,
    itemName,
    quantity,
    basePrice,
    effectivePrice,
    modifiers[] { _key, groupName, selections },
    specialInstructions
  }
}`

export async function GET() {
  const client = getSanityReadClient()

  if (!client) {
    console.warn("[orders] Sanity read client unavailable — returning empty list")
    return NextResponse.json([] as AdminOrder[])
  }

  const filter = LOCATION_ID
    ? `_type == "order" && location._ref == $locationId`
    : `_type == "order"`

  const params = LOCATION_ID ? { locationId: LOCATION_ID } : {}

  const orders = await client.fetch<AdminOrder[]>(
    `*[${filter}] | order(createdAt desc) ${ORDER_PROJECTION}`,
    params
  )

  return NextResponse.json(orders)
}
