import { Resend }  from "resend"
import twilio      from "twilio"
import type { Order } from "@/types"

const resend       = new Resend(process.env.RESEND_API_KEY)
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

// In dev/test: use Resend's shared onboarding@resend.dev sender — no domain
// verification required, but delivery is restricted to your Resend account email.
// In production: set RESEND_FROM_EMAIL to an address on your verified domain
// e.g. "orders@bulltoptaste.com"
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"

// ─── Email to restaurant ──────────────────────────────────────────────────────

export async function notifyRestaurantByEmail(order: Order) {
  const itemsList = order.items
    .map(i => `${i.quantity}x ${i.name} — $${((i.price ?? 0) * i.quantity).toFixed(2)}`)
    .join("\n")

  await resend.emails.send({
    from:    FROM_EMAIL,
    to:      process.env.RESTAURANT_EMAIL ?? "",
    subject: `New Order #${order.id} — $${order.total.toFixed(2)}`,
    text: `
New order received!

Customer: ${order.customerName}
Phone:    ${order.customerPhone}
Email:    ${order.customerEmail}
Type:     ${order.type}
${order.notes ? `Notes:    ${order.notes}` : ""}

Items:
${itemsList}

Total: $${order.total.toFixed(2)}
    `.trim(),
  })
}

// ─── SMS to restaurant ────────────────────────────────────────────────────────

export async function notifyRestaurantBySMS(order: Order) {
  const itemsSummary = order.items
    .map(i => `${i.quantity}x ${i.name}`)
    .join(", ")

  await twilioClient.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER ?? "",
    to:   process.env.RESTAURANT_PHONE    ?? "",
    body: `New order from ${order.customerName}: ${itemsSummary}. Total: $${order.total.toFixed(2)}. Type: ${order.type}.`,
  })
}

// ─── Order confirmation to customer ──────────────────────────────────────────

export async function confirmOrderToCustomer(order: Order) {
  const itemsList = order.items
    .map(i => `${i.quantity}x ${i.name}`)
    .join(", ")

  await resend.emails.send({
    from:    FROM_EMAIL,
    to:      order.customerEmail,
    subject: `Your order at Bull Top Taste is confirmed!`,
    text: `
Hi ${order.customerName},

Thanks for your order! We're getting it ready now.

Order summary: ${itemsList}
Total: $${order.total.toFixed(2)}
Type: ${order.type}
${order.notes ? `Notes: ${order.notes}` : ""}

Questions? Call us at 561.795.8440 or email info@bulltoptaste.com

— Bull Top Taste
    `.trim(),
  })
}


// ─── "Order ready for pickup" SMS to customer ────────────────────────────────

export async function notifyCustomerOrderReady(order: Order) {
  if (!order.customerPhone) return

  await twilioClient.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER ?? "",
    to:   order.customerPhone,
    body: `Hi ${order.customerName}! Your order at Bull Top Taste is ready for pickup. See you soon! Questions? Call 561.795.8440.`,
  })
}

// ─── Post-order review request (call after a delay, e.g. 30 min) ─────────────

export async function sendReviewRequest(order: Order) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: order.customerEmail,
    subject: "How was your Bull Top Taste experience?",
    text: `
Hi ${order.customerName},

We hope you enjoyed your meal! If you have a moment, we'd love to hear your feedback.

Leave us a review on Google: https://g.page/r/ChIJbTWzXsEu2YgRSoCd7mPQPu8/review

Thanks for supporting Bull Top Taste!
    `.trim(),
  })
}
