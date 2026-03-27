import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { getLocationFull } from "@/lib/sanity"
import { stripe } from "@/lib/stripe"

import ClearCart from "./ClearCart"

export const metadata: Metadata = {
  formatDetection: {
    telephone: false,
  },
}

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

  const location = await getLocationFull("bull-top-taste-wpb")
  const LOCATION_PHONE = location?.phone ?? ""
  const LOCATION_PHONE_DIALPAD = location?.phoneDialable?.replace(/\D/g, "") ?? ""

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="font-serif text-xl font-bold text-gray-900">
            {location?.restaurantName ?? "Bull Top Taste"}
          </span>
          <Link
            href="/"
            className="text-sm font-bold text-gray-900 underline underline-offset-2 transition-opacity hover:opacity-70"
          >
            Return to Menu
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 pt-10 pb-16">
        {/* Celebratory header */}
        <section className="mb-10 text-center">
          <div className="mb-4 text-6xl">🎉</div>
          <h1 className="mb-4 font-serif text-5xl font-bold text-gray-900 md:text-6xl">
            {customerName ? `Thanks, ${customerName.split(" ")[0]}!` : "Order Confirmed!"}
          </h1>
          <p className="mx-auto max-w-lg text-xl leading-relaxed text-gray-500 md:text-2xl">
            {orderType === "delivery"
              ? "Your order is confirmed and on its way to you."
              : "Your order is confirmed and we're getting it ready for pickup."}
          </p>
        </section>

        <div className="space-y-8">
          {/* Order summary card */}
          {lineItems.length > 0 && (
            <section className="overflow-hidden rounded-xl bg-white shadow-[0_8px_24px_rgba(24,29,25,0.06)]">
              <div className="p-6">
                <h2 className="mb-5 border-b border-gray-100 pb-3 font-serif text-2xl font-bold text-gray-900">
                  Order Summary
                </h2>
                <div className="mb-6 space-y-4">
                  {lineItems.map(item => (
                    <div key={item.id} className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-serif text-base font-bold text-gray-900">
                          {item.description}
                        </h3>
                        <p className="mt-0.5 text-sm font-medium text-gray-500">
                          Qty: {item.quantity ?? 1}
                        </p>
                      </div>
                      <span className="shrink-0 text-base font-bold text-gray-900">
                        {" "}
                        ${((item.amount_total ?? 0) / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                {total !== null && (
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-4">
                    <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                      Total Paid
                    </span>
                    <span className="text-brand-green font-serif text-2xl font-bold">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Next steps */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl bg-gray-100 p-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-brand-green mt-0.5 h-5 w-5 shrink-0"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <div>
                <h4 className="mb-1 font-serif text-base font-bold text-gray-900">
                  Check your inbox
                </h4>
                <p className="text-sm leading-snug text-gray-500">
                  A confirmation email is on its way to you.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-gray-100 p-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-brand-green mt-0.5 h-5 w-5 shrink-0"
              >
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <div>
                <h4 className="mb-1 font-serif text-base font-bold text-gray-900">Stay updated</h4>
                <p className="text-sm leading-snug text-gray-500">
                  We&apos;ll text you at{" "}
                  <span className="font-bold text-gray-900">{customerPhone}</span> when your order
                  is ready.
                </p>
              </div>
            </div>
          </section>

          {/* CTA + contact */}
          <section className="space-y-6 pt-2 text-center">
            <Link
              href="/"
              className="bg-brand-green hover:bg-brand-green-dark block w-full rounded-xl py-5 text-base font-black tracking-widest text-white uppercase transition-all active:scale-[0.98]"
            >
              Back to Home
            </Link>
            {LOCATION_PHONE && (
              <p className="text-base text-gray-500">
                Questions?{" "}
                <a
                  href={`tel:${LOCATION_PHONE_DIALPAD}`}
                  className="text-brand-green ml-1 font-bold"
                >
                  {LOCATION_PHONE}
                </a>
              </p>
            )}
          </section>
        </div>
      </main>

      <ClearCart />
    </div>
  )
}
