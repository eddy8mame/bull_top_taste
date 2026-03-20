import { NextRequest, NextResponse }  from "next/server"
import { getSanityWriteClient }       from "@/lib/sanity"
import { sendReviewRequest }          from "@/lib/notify"
import type { Order }                 from "@/types"

// POST /api/orders/[id]/pickedup — floor staff marks order picked up.
// Patches Sanity to "completed", stamps pickedUpAt, and fires a post-order
// review-request email to the customer via Resend. Non-blocking.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }    = await params
  const client    = getSanityWriteClient()
  const now       = new Date().toISOString()

  if (!client) {
    console.warn("[pickedup] Sanity write client unavailable — status not persisted")
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
  }

  // Fetch fields needed for the review-request email
  const raw = await client.fetch<{
    _id:           string
    customerName:  string
    customerPhone: string
    customerEmail: string
    type:          string
    total:         number
    createdAt:     string
    notes?:        string
  } | null>(
    `*[_type == "order" && _id == $id][0] {
       _id, customerName, customerPhone, customerEmail,
       type, total, createdAt, notes
     }`,
    { id }
  )

  if (!raw) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  // Persist the completed state
  const updated = await client
    .patch(id)
    .set({ status: "completed", pickedUpAt: now })
    .commit()

  // Fire review request email — non-blocking, never fail the request
  const order: Order = {
    id:            raw._id,
    status:        "completed",
    type:          raw.type as "pickup" | "delivery",
    customerName:  raw.customerName,
    customerEmail: raw.customerEmail,
    customerPhone: raw.customerPhone,
    notes:         raw.notes,
    items:         [],   // notification body doesn't need line items
    total:         raw.total,
    createdAt:     raw.createdAt,
  }
  sendReviewRequest(order).catch(err =>
    console.error("[pickedup] Failed to send review request:", err)
  )

  return NextResponse.json(updated)
}
