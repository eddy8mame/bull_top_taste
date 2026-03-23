// app/api/orders/[id]/status/route.ts

import { NextRequest, NextResponse } from "next/server"

import type { OrderStatus } from "@/types"

import { getSanityWriteClient } from "@/lib/sanity"

// POST /api/orders/[id]/status — generic status update (pending, kitchen, completed).
// The "floor" transition goes through /api/orders/[id]/ready instead, since that
// route also fires the customer-ready SMS.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status }: { status: OrderStatus } = await req.json()
  const client = getSanityWriteClient()

  if (!client) {
    console.warn("[status] Sanity write client unavailable — status not persisted")
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
  }

  // Verify the order exists before patching
  const exists = await client.fetch<string | null>(`*[_type == "order" && _id == $id][0]._id`, {
    id,
  })
  if (!exists) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  // When an order is accepted into the kitchen, stamp startedAt so the
  // contextual age timer on the kitchen display counts from that moment.
  // Note: "pending" here means payment-confirmed and awaiting kitchen acceptance —
  // "awaiting_payment" orders are never surfaced in the kitchen view.
  const patch: Record<string, unknown> = { status }
  if (status === "kitchen") patch.startedAt = new Date().toISOString()

  const updated = await client.patch(id).set(patch).commit()

  return NextResponse.json(updated)
}
