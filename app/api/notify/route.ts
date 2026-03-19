import { NextRequest, NextResponse } from "next/server"
import { stripe }                   from "@/lib/stripe"
import {
  notifyRestaurantByEmail,
  notifyRestaurantBySMS,
  confirmOrderToCustomer,
} from "@/lib/notify"
import { orderStore } from "@/lib/orderStore"
import type { Order } from "@/types"

// Called by Stripe webhook after successful payment
export async function POST(req: NextRequest) {
  const sig     = req.headers.get("stripe-signature") ?? ""
  const rawBody = await req.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? ""
    )
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${err}` }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object

    const order: Order = {
      id:            session.id,
      items:         JSON.parse(session.metadata?.items ?? "[]"),
      total:         (session.amount_total ?? 0) / 100,
      customerName:  session.metadata?.customerName  ?? "",
      customerEmail: session.customer_email           ?? "",
      customerPhone: session.metadata?.customerPhone  ?? "",
      type:          (session.metadata?.orderType as "pickup" | "delivery") ?? "pickup",
      notes:         session.metadata?.notes,
      createdAt:     new Date().toISOString(),
    }

    // Store the order first — this must not be blocked by notification failures
    orderStore.add(order)

    // Fire notifications independently; log failures but don't re-throw so
    // Stripe receives a 200 and won't retry the webhook endlessly.
    const notify = (label: string, fn: () => Promise<unknown>) =>
      fn().catch(err => console.error(`[notify] ${label} failed:`, err))

    await Promise.all([
      notify("restaurant-email", () => notifyRestaurantByEmail(order)),
      notify("restaurant-sms",   () => notifyRestaurantBySMS(order)),
      notify("customer-confirm", () => confirmOrderToCustomer(order)),
    ])
  }

  return NextResponse.json({ received: true })
}
