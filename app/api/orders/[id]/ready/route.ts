import { NextRequest, NextResponse } from "next/server"
import { orderStore }               from "@/lib/orderStore"
import { notifyCustomerOrderReady } from "@/lib/notify"

// POST /api/orders/[id]/ready — marks order ready and fires customer SMS
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const order  = orderStore.updateStatus(id, "ready")

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  // Fire SMS to customer — non-blocking, don't fail the request if it errors
  notifyCustomerOrderReady(order).catch(err =>
    console.error("Failed to send ready SMS:", err)
  )

  return NextResponse.json(order)
}
