import { NextRequest, NextResponse }  from "next/server"
import { getSanityWriteClient }       from "@/lib/sanity"
import type { OrderStatus }           from "@/types"

// POST /api/orders/[id]/status — generic status update (pending, kitchen, completed).
// The "floor" transition goes through /api/orders/[id]/ready instead, since that
// route also fires the customer-ready SMS.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }                          = await params
  const { status }: { status: OrderStatus } = await req.json()
  const client                          = getSanityWriteClient()

  if (!client) {
    console.warn("[status] Sanity write client unavailable — status not persisted")
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
  }

  // Verify the order exists before patching
  const exists = await client.fetch<string | null>(
    `*[_type == "order" && _id == $id][0]._id`,
    { id }
  )
  if (!exists) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  const updated = await client
    .patch(id)
    .set({ status })
    .commit()

  return NextResponse.json(updated)
}
