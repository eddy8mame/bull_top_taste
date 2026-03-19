import Link from "next/link"
import { stripe } from "@/lib/stripe"

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

  const customerName  = session?.metadata?.customerName ?? ""
  const orderType     = (session?.metadata?.orderType ?? "pickup") as "pickup" | "delivery"
  const customerPhone = session?.metadata?.customerPhone ?? ""
  const lineItems     = session?.line_items?.data ?? []
  const total         = session ? (session.amount_total ?? 0) / 100 : null

  // Location contact — swap to an env var or DB lookup for multi-location
  const LOCATION_PHONE         = "561.795.8440"
  const LOCATION_PHONE_DIALPAD = "5617958440"

  return (
    <main className="min-h-screen bg-brand-light flex items-center justify-center px-6 py-16">
      <div className="bg-white rounded-2xl border border-gray-100 p-10 max-w-md w-full shadow-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="font-serif text-3xl mb-2">
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
          <div className="border border-gray-100 rounded-xl overflow-hidden mb-6">
            <div className="bg-brand-light px-4 py-2.5">
              <p className="text-xs font-bold tracking-widest uppercase text-brand-muted">Order Summary</p>
            </div>
            <ul className="divide-y divide-gray-50">
              {lineItems.map(item => (
                <li key={item.id} className="px-4 py-3 flex justify-between text-sm">
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
              <div className="px-4 py-3 bg-gray-50 flex justify-between font-semibold text-sm border-t border-gray-100">
                <span>Total paid</span>
                <span className="text-brand-green">${total.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* What to expect */}
        <div className="bg-brand-light rounded-xl px-5 py-4 mb-6 text-sm text-brand-muted leading-relaxed space-y-1">
          <p>✉️ A confirmation email is on its way to you.</p>
          {customerPhone && (
            <p>📱 We&apos;ll text you at {customerPhone} when your order is ready.</p>
          )}
        </div>

        {/* Contact */}
        <p className="text-center text-sm text-brand-muted mb-6">
          Questions?{" "}
          <a href={`tel:${LOCATION_PHONE_DIALPAD}`} className="text-brand-green font-medium">
            {LOCATION_PHONE}
          </a>
        </p>

        <Link
          href="/"
          className="block w-full text-center bg-brand-green text-white font-semibold px-6 py-3 rounded-lg hover:bg-brand-green-dark transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </main>
  )
}
