"use client"

import { useState } from "react"
import Map, { Marker } from "react-map-gl/mapbox"

import "mapbox-gl/dist/mapbox-gl.css"

import type { LocationFull } from "@/lib/sanity"

import { useCart } from "@/context/CartContext"

interface Props {
  location?: LocationFull | null
}

export default function Cart({ location }: Props) {
  const { items, removeItem, updateQty, clearCart, total, isOpen, setIsOpen } = useCart()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    type: "pickup" as const,
    notes: "",
  })

  const pickupWait = location?.pickupWaitTime ?? "15–20 min"

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0) return
    setLoading(true)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, total, customer: formData }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (err) {
      console.error("Checkout error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setIsOpen(false)} />

      <aside className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-serif text-xl">Your Order</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-2xl leading-none text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-brand-muted flex flex-1 flex-col items-center justify-center gap-3 px-6">
            <span className="text-5xl">🍽️</span>
            <p className="font-medium">Your cart is empty</p>
            <button
              onClick={() => setIsOpen(false)}
              className="text-brand-green text-sm font-semibold underline"
            >
              Browse the menu
            </button>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="flex flex-1 flex-col">
            {/* Pickup location card */}
            {location && (
              <div className="mx-6 mt-4 overflow-hidden rounded-xl border border-gray-100">
                <div className="flex items-start gap-1.5 px-4 py-3">
                  <p className="shrink-0 text-sm font-semibold text-gray-900">Pick up at</p>
                  {location.address && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-tertiary text-sm leading-snug font-semibold hover:underline"
                    >
                      {location.address}
                    </a>
                  )}
                </div>
                {location.latitude && location.longitude && (
                  <div className="h-40 w-full">
                    <Map
                      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                      initialViewState={{
                        longitude: location.longitude,
                        latitude: location.latitude,
                        zoom: 15,
                      }}
                      style={{ width: "100%", height: "100%" }}
                      mapStyle="mapbox://styles/mapbox/streets-v12"
                      interactive={true}
                      scrollZoom={false}
                    >
                      <Marker
                        longitude={location.longitude}
                        latitude={location.latitude}
                        anchor="bottom"
                      >
                        <div className="bg-brand-green flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-md">
                          <span className="text-xs text-white">🏪</span>
                        </div>
                      </Marker>
                    </Map>
                  </div>
                )}
              </div>
            )}

            {/* Cart items */}
            <ul className="shrink-0 divide-y divide-gray-50 px-6 py-4">
              {items.map(item => (
                <li key={item.cartItemId} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.name}</p>

                    {/* Modifier summary */}
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <ul className="mt-0.5 space-y-0.5">
                        {item.selectedModifiers.map(group =>
                          group.selections.map(sel => (
                            <li key={sel.optionId} className="text-brand-muted text-xs">
                              {sel.name}
                              {sel.priceAdjustment > 0 && (
                                <span className="text-brand-green ml-1">
                                  +${sel.priceAdjustment.toFixed(2)}
                                </span>
                              )}
                            </li>
                          ))
                        )}
                      </ul>
                    )}

                    {item.specialInstructions && (
                      <p className="mt-1 rounded bg-yellow-50 px-1.5 py-0.5 text-xs text-yellow-700 italic">
                        &quot;{item.specialInstructions}&quot;
                      </p>
                    )}

                    <p className="text-brand-muted mt-1 text-xs">
                      ${item.effectivePrice.toFixed(2)} each
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQty(item.cartItemId, item.quantity - 1)}
                      className="hover:border-brand-green flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 text-sm"
                    >
                      −
                    </button>
                    <span className="w-4 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.cartItemId, item.quantity + 1)}
                      className="hover:border-brand-green flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 text-sm"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.cartItemId)}
                    className="shrink-0 text-lg leading-none text-gray-300 hover:text-red-400"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex justify-between border-y border-gray-100 bg-gray-50 px-6 py-3 font-semibold">
              <span>Total</span>
              <span className="text-brand-green">${total.toFixed(2)}</span>
            </div>

            <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-4 py-2.5">
              <span className="text-base">🏪</span>
              <div>
                <p className="text-brand-green text-xs font-semibold">Pickup order</p>
                <p className="text-brand-muted text-xs">Ready in {pickupWait}</p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 px-6 py-4">
              <h3 className="text-brand-muted text-sm font-semibold tracking-wide uppercase">
                Your Details
              </h3>
              <input
                required
                placeholder="Full Name *"
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                className="focus:border-brand-green rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none"
              />
              <input
                required
                type="email"
                placeholder="Email *"
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                className="focus:border-brand-green rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none"
              />
              <input
                required
                type="tel"
                placeholder="Phone *"
                value={formData.phone}
                onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                className="focus:border-brand-green rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none"
              />
            </div>

            <div className="mt-auto flex flex-col gap-2 px-6 pb-6">
              <button
                type="submit"
                disabled={loading}
                className="bg-brand-green hover:bg-brand-green-dark w-full rounded-lg py-3.5 font-semibold text-white transition-colors disabled:opacity-60"
              >
                {loading ? "Redirecting to payment…" : `Pay $${total.toFixed(2)}`}
              </button>
              <button
                type="button"
                onClick={clearCart}
                className="text-center text-xs text-gray-400 hover:text-red-400"
              >
                Clear cart
              </button>
            </div>
          </form>
        )}
      </aside>
    </>
  )
}
