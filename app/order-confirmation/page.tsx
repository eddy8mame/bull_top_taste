import Link from "next/link"

import { stripe } from "@/lib/stripe"

import ClearCart from "./ClearCart"

interface Props {
  searchParams: Promise<{ session_id?: string }>
}

export default async function OrderConfirmation({ searchParams }: Props) {
  const { session_id } = await searchParams

  // Attempt to retrieve session from Stripe — gives us reliable order data
  // regardless of webhook timing
  let session = null
  if (session_id) {
    try {
      session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["line_items"],
      })
    } catch {
      // Invalid or expired session_id — fall back to generic confirmation
    }
  }

  const customerName = session?.metadata?.customerName ?? ""
  const orderType = (session?.metadata?.orderType ?? "pickup") as "pickup" | "delivery"
  const customerPhone = session?.metadata?.customerPhone ?? ""
  const lineItems = session?.line_items?.data ?? []
  const total = session ? (session.amount_total ?? 0) / 100 : null

  // Location contact — swap to an env var or DB lookup for multi-location
  const LOCATION_PHONE = "561.795.8440"
  const LOCATION_PHONE_DIALPAD = "5617958440"

  return (
    <main className="bg-brand-light flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 text-6xl">🎉</div>
          <h1 className="mb-2 font-serif text-3xl">
            {customerName ? `Thanks, ${customerName.split(" ")[0]}!` : "Order Confirmed!"}
          </h1>
          <p className="text-brand-muted leading-relaxed">
            {orderType === "delivery"
              ? "Your order is confirmed and on its way to you."
              : "Your order is confirmed and we're getting it ready for pickup."}
          </p>
        </div>

        {/* Order summary */}
        {lineItems.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-xl border border-gray-100">
            <div className="bg-brand-light px-4 py-2.5">
              <p className="text-brand-muted text-xs font-bold tracking-widest uppercase">
                Order Summary
              </p>
            </div>
            <ul className="divide-y divide-gray-50">
              {lineItems.map(item => (
                <li key={item.id} className="flex justify-between px-4 py-3 text-sm">
                  <span className="font-medium">
                    {item.quantity && item.quantity > 1 ? `${item.quantity}× ` : ""}
                    {item.description}
                  </span>
                  <span className="text-brand-muted">
                    ${((item.amount_total ?? 0) / 100).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            {total !== null && (
              <div className="flex justify-between border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold">
                <span>Total paid</span>
                <span className="text-brand-green">${total.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* What to expect */}
        <div className="bg-brand-light text-brand-muted mb-6 space-y-1 rounded-xl px-5 py-4 text-sm leading-relaxed">
          <p>✉️ A confirmation email is on its way to you.</p>
          {customerPhone && (
            <p>📱 We&apos;ll text you at {customerPhone} when your order is ready.</p>
          )}
        </div>

        {/* Contact */}
        <p className="text-brand-muted mb-6 text-center text-sm">
          Questions?{" "}
          <a href={`tel:${LOCATION_PHONE_DIALPAD}`} className="text-brand-green font-medium">
            {LOCATION_PHONE}
          </a>
        </p>

        <Link
          href="/"
          className="bg-brand-green hover:bg-brand-green-dark block w-full rounded-lg px-6 py-3 text-center font-semibold text-white transition-colors"
        >
          Back to Home
        </Link>
      </div>

      <ClearCart />
    </main>
  )
}
