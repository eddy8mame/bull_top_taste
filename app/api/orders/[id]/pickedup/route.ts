import { NextRequest, NextResponse } from "next/server"
import { orderStore }               from "@/lib/orderStore"

// POST /api/orders/[id]/pickedup — floor staff marks order as picked up
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const order  = orderStore.markPickedUp(id)

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  return NextResponse.json(order)
}
