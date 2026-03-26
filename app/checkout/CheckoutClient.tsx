"use client"

import { useState } from "react"

import Image from "next/image"
import { useRouter } from "next/navigation"

import type { CartItem, SelectedModifier } from "@/types"

import type { LocationFull } from "@/lib/sanity"
import { DEFAULT_TAX_RATE, calculateTotals } from "@/lib/tax"

import { useCart } from "@/context/CartContext"

interface Props {
  location?: LocationFull | null
}

// ── Modifier descriptor (mirrors Cart.tsx logic) ──────────────────────────────
function buildModifierDescriptor(selectedModifiers: SelectedModifier[]) {
  const specs: string[] = []
  const addons: { name: string; price: number }[] = []

  const subSelsByParent = new Map<string, { name: string; price: number }[]>()
  selectedModifiers.forEach(mod => {
    if (mod.parentOptionId) {
      const existing = subSelsByParent.get(mod.parentOptionId) ?? []
      mod.selections.forEach(s => existing.push({ name: s.name, price: s.priceAdjustment }))
      subSelsByParent.set(mod.parentOptionId, existing)
    }
  })

  selectedModifiers.forEach(mod => {
    if (mod.parentOptionId) return
    mod.selections.forEach(sel => {
      const subs = subSelsByParent.get(sel.optionId) ?? []
      const subPrice = subs.reduce((sum, s) => sum + s.price, 0)
      const subLabel = subs.map(s => s.name).join(", ")

      if (mod.groupName === "Size Choice" || (sel.priceAdjustment === 0 && subPrice === 0)) {
        specs.push(sel.name)
      } else {
        const finalName = subLabel ? `${sel.name} (${subLabel})` : sel.name
        const finalPrice = sel.priceAdjustment + subPrice
        addons.push({ name: finalName, price: finalPrice })
      }
    })
  })

  return { specs, addons }
}

// ── Order item row ────────────────────────────────────────────────────────────
function OrderItemRow({ item }: { item: CartItem }) {
  const { specs, addons } = item.selectedModifiers
    ? buildModifierDescriptor(item.selectedModifiers)
    : { specs: [], addons: [] }

  return (
    <div className="flex gap-3 border-b border-gray-100 py-3 last:border-0">
      {item.imageUrl && (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">
            {item.quantity > 1 && <span className="text-brand-green mr-1">{item.quantity}×</span>}
            {item.name}
          </p>
          <p className="shrink-0 text-sm font-semibold">
            ${(item.effectivePrice * item.quantity).toFixed(2)}
          </p>
        </div>
        {specs.length > 0 && <p className="text-brand-muted mt-0.5 text-xs">{specs.join(", ")}</p>}
        {addons.map((addon, i) => (
          <div key={i} className="mt-1 flex justify-between text-xs">
            <span className="flex items-center gap-1 text-gray-500">
              <span className="text-gray-300">↳</span> {addon.name}
            </span>
            <span className="text-brand-green font-medium">+${addon.price.toFixed(2)}</span>
          </div>
        ))}
        {item.specialInstructions && (
          <p className="mt-1 rounded bg-yellow-50 px-1.5 py-0.5 text-xs text-yellow-700 italic">
            &quot;{item.specialInstructions}&quot;
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CheckoutClient({ location }: Props) {
  const router = useRouter()
  const { items } = useCart()
  const {
    subtotal,
    tax,
    total: grandTotal,
    taxRateLabel,
  } = calculateTotals(items, location?.taxRate ?? DEFAULT_TAX_RATE)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pickupWait = location?.pickupWaitTime ?? "15–20 min"

  // ── Checkout handler ──────────────────────────────────────────────────────
  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          grandTotal,
          customer: { ...formData, type: "pickup" },
        }),
      })
      if (!res.ok) throw new Error("Checkout failed")
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  // ── Empty cart state ──────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <span className="mb-4 text-6xl">🛒</span>
        <h2 className="mb-2 font-serif text-2xl">Your cart is empty</h2>
        <p className="mb-6 text-gray-500">Looks like you haven&apos;t added any items yet.</p>
        <button
          onClick={() => router.push("/")}
          className="bg-brand-green hover:bg-brand-green-dark rounded-lg px-6 py-3 font-semibold text-white transition-colors"
        >
          Return to menu
        </button>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-100 bg-white px-6 py-4">
        <button
          onClick={() => router.back()}
          className="text-brand-green flex items-center gap-1 text-sm font-medium hover:underline"
        >
          ← Back
        </button>
        <h1 className="font-serif text-xl">Checkout</h1>
      </div>

      {/* 🚨 DEMO MODE BANNER */}
      {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
        <div className="flex items-center justify-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3 text-center">
          <span className="shrink-0 text-lg text-amber-600">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Test mode — do not enter real card details
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              Use Stripe test card <span className="font-mono font-bold">4242 4242 4242 4242</span>{" "}
              · any future expiry · any CVC
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-4 py-8 md:grid-cols-2">
        {/* ── Left column — Order summary ──────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Delivery upsell */}
          {location?.doorDashUrl && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-center">
              <p className="mb-1 text-sm font-medium text-red-900">Want delivery instead?</p>
              <p className="mb-3 text-xs text-red-700">
                Order through DoorDash and we&apos;ll bring it to you.
              </p>
              <a
                href={location.doorDashUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg bg-[#FF3008] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
              >
                Order on DoorDash
              </a>
            </div>
          )}

          {/* Pickup location */}
          {location && (
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <p className="text-brand-muted mb-2 text-xs font-semibold tracking-wide uppercase">
                Pickup at
              </p>
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-lg">🏪</span>
                <div>
                  <p className="text-brand-green text-sm font-semibold">
                    {location.restaurantName}
                  </p>
                  {location.address && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-tertiary text-xs hover:underline"
                    >
                      {location.address}
                    </a>
                  )}
                  <p className="text-brand-muted mt-0.5 text-xs">Ready in {pickupWait}</p>
                </div>
              </div>
            </div>
          )}

          {/* Order items */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-brand-muted mb-3 text-xs font-semibold tracking-wide uppercase">
              Order summary
            </p>
            <div className="divide-y divide-gray-50">
              {items.map(item => (
                <OrderItemRow key={item.cartItemId} item={item} />
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Sales tax ({taxRateLabel})</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900">
                <span>Total</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column — Customer details + CTA ───────────────────── */}
        <div>
          <form
            onSubmit={handleCheckout}
            className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4"
          >
            <p className="text-brand-muted text-xs font-semibold tracking-wide uppercase">
              Your details
            </p>

            <input
              required
              name="name"
              autoComplete="name"
              placeholder="Full name *"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              className="focus:border-brand-green rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none"
            />
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Email *"
              value={formData.email}
              onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              className="focus:border-brand-green rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none"
            />
            <input
              required
              type="tel"
              name="tel"
              autoComplete="tel"
              placeholder="Phone *"
              value={formData.phone}
              onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
              className="focus:border-brand-green rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none"
            />

            {error && <p className="text-center text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="bg-brand-green hover:bg-brand-green-dark w-full rounded-xl py-4 text-sm font-semibold text-white transition-colors disabled:opacity-60"
            >
              {loading
                ? "Redirecting to payment…"
                : `Proceed to payment — $${grandTotal.toFixed(2)}`}{" "}
            </button>

            <p className="text-brand-muted text-center text-xs">Secured by Stripe · Pickup only</p>
          </form>
        </div>
      </div>
    </div>
  )
}
