import { NextRequest, NextResponse } from "next/server"
import { orderStore }               from "@/lib/orderStore"
import type { OrderStatus }         from "@/lib/orderStore"

// POST /api/orders/[id]/status — update order status (preparing, completed)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }                  = await params
  const { status }: { status: OrderStatus } = await req.json()
  const order = orderStore.updateStatus(id, status)

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  return NextResponse.json(order)
}
