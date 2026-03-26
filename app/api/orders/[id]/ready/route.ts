// app/api/orders/[id]/ready/route.ts
import { NextRequest, NextResponse } from "next/server";



import type { Order } from "@/types";



import { notifyCustomerOrderReady } from "@/lib/notify";
import { getSanityWriteClient } from "@/lib/sanity";






























// POST /api/orders/[id]/ready — kitchen marks order ready; patches Sanity to "floor"
// and fires a customer SMS via Twilio. The SMS is non-blocking: a Twilio failure
// will never roll back the status patch or return a non-200 to the caller.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = getSanityWriteClient()
  const now = new Date().toISOString()

  if (!client) {
    console.warn("[ready] Sanity write client unavailable — status not persisted")
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
  }

  // Fetch the fields needed to build the notification payload.
  // Using the write (non-CDN) client to guarantee we read the latest version.
  const raw = await client.fetch<{
    _id: string
    customerName: string
    customerPhone: string
    customerEmail: string
    type: string
    total: number
    createdAt: string
    notes?: string
    stripePaymentIntentId?: string
  } | null>(
    `*[_type == "order" && _id == $id][0] {
       _id, customerName, customerPhone, customerEmail,
       type, total, createdAt, notes, stripePaymentIntentId
     }`,
    { id }
  )

  if (!raw) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  // Persist the status change
  const updated = await client.patch(id).set({ status: "floor", readyAt: now }).commit()

  // Fire SMS to customer — non-blocking, never fail the request
  const order: Order = {
    id: raw._id,
    status: "floor",
    type: raw.type as "pickup" | "delivery",
    customerName: raw.customerName,
    customerEmail: raw.customerEmail,
    customerPhone: raw.customerPhone,
    notes: raw.notes,
    items: [],
    total: raw.total,
    createdAt: raw.createdAt,
    stripePaymentIntentId: raw.stripePaymentIntentId,
  }
  notifyCustomerOrderReady(order).catch(err =>
    console.error("[ready] Failed to send ready SMS:", err)
  )

  return NextResponse.json(updated)
}
