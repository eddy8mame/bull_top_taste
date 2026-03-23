// app/api/notify/route.ts

import { NextRequest, NextResponse } from "next/server"

import type { Order } from "@/types"

import {
  confirmOrderToCustomer,
  notifyRestaurantByEmail,
  notifyRestaurantBySMS,
} from "@/lib/notify"
import { getSanityWriteClient } from "@/lib/sanity"
import { stripe } from "@/lib/stripe"

// POST /api/notify — Stripe webhook receiver.
// Stripe calls this after a checkout.session.completed event (i.e., after the
// customer's payment is confirmed). At this point the order document already
// exists in Sanity (created by /api/checkout when the session was generated).
// This handler's responsibilities are:
//   1. Verify the Stripe webhook signature so only legitimate events are processed.
//   2. Patch the Sanity order with the confirmed stripePaymentIntentId.
//   3. Fire restaurant and customer notification emails / SMS.
//
// Zero-Key safe: notification failures and Sanity patch failures are caught and
// logged individually — none of them can bubble up and cause Stripe to receive
// a non-200 response, which would trigger endless retries.

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature") ?? ""
  const rawBody = await req.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET ?? "")
  } catch (err) {
    // Signature mismatch — reject and let Stripe retry with the correct secret.
    return NextResponse.json({ error: `Webhook signature error: ${err}` }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object

    // The orderId embedded in Stripe metadata is the Sanity document _id,
    // set by /api/checkout at session creation time.
    const orderId = session.metadata?.orderId
    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : undefined

    // ── Patch Sanity order with confirmed payment intent ─────────────────────
    // This is the authoritative "payment received" signal. We patch rather than
    // create so we don't produce a duplicate; the order document was pre-created
    // in /api/checkout.
if (orderId) {
  const sanityClient = getSanityWriteClient()
  if (sanityClient && paymentIntentId) {
    try {
      await sanityClient
        .patch(orderId)
        .set({
          stripePaymentIntentId: paymentIntentId,
          status: "pending",
          confirmedAt: new Date().toISOString(),
        })
        .commit()
    } catch (err) {
      // Log but do not propagate — Stripe must receive 200.
      console.error(`[notify] Failed to patch order ${orderId} in Sanity:`, err)
    }
  }
}

    // ── Build a minimal Order object for the notification functions ──────────
    // The notification helpers (email / SMS) expect an Order-shaped object.
    // We reconstruct it from Stripe session metadata. Note: items are an
    // abbreviated summary (name + quantity only) because full modifier data
    // is not stored in Stripe metadata. Full data is in Sanity.
    const order: Order = {
      id: orderId ?? session.id,
      status: "pending",
      type: (session.metadata?.orderType as "pickup" | "delivery") ?? "pickup",
      customerName: session.metadata?.customerName ?? "",
      customerEmail: session.customer_email ?? "",
      customerPhone: session.metadata?.customerPhone ?? "",
      notes: session.metadata?.notes || undefined,
      items: [], // abbreviated — full detail is in Sanity
      total: (session.amount_total ?? 0) / 100,
      createdAt: new Date().toISOString(),
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
    }

    // ── Fire notifications ───────────────────────────────────────────────────
    // Each notification is wrapped so its failure is isolated: one failing
    // provider cannot block the others or cause Stripe to retry the webhook.
    const notify = (label: string, fn: () => Promise<unknown>) =>
      fn().catch(err => console.error(`[notify] ${label} failed:`, err))

    await Promise.all([
      notify("restaurant-email", () => notifyRestaurantByEmail(order)),
      notify("restaurant-sms", () => notifyRestaurantBySMS(order)),
      notify("customer-confirm", () => confirmOrderToCustomer(order)),
    ])
  }

  // Always return 200 so Stripe does not retry the webhook.
  return NextResponse.json({ received: true })
}
