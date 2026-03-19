"use client"

import { useState }          from "react"
import { useCart }           from "@/context/CartContext"
import type { SiteSettings } from "@/types"

const DOORDASH_URL = "https://www.doordash.com/store/top-taste-restaurant-royal-palm-beach-824119/1164804/"

interface Props {
  settings?: SiteSettings | null
}

export default function Cart({ settings }: Props) {
  const { items, removeItem, updateQty, clearCart, total, isOpen, setIsOpen } = useCart()
  const [loading,  setLoading]  = useState(false)
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", type: "pickup" as "pickup", notes: "",
  })

  const pickupWait = settings?.pickupWaitTime ?? "15–20 min"

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0) return
    setLoading(true)
    try {
      const res = await fetch("/api/checkout", {
        method:  "POST",
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
      <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />

      <aside className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 flex flex-col shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-serif text-xl">Your Order</h2>
          <button onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-brand-muted gap-3 px-6">
            <span className="text-5xl">🍽️</span>
            <p className="font-medium">Your cart is empty</p>
            <button onClick={() => setIsOpen(false)}
              className="text-brand-green font-semibold text-sm underline">
              Browse the menu
            </button>
            <div className="mt-4 w-full bg-red-50 border border-red-100 rounded-xl p-4 text-center">
              <p className="text-sm font-medium text-red-900 mb-1">Want delivery?</p>
              <p className="text-xs text-red-700 mb-3">Order through DoorDash and we&apos;ll bring it to you.</p>
              <a href={DOORDASH_URL} target="_blank" rel="noopener noreferrer"
                className="inline-block bg-[#FF3008] text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                Order on DoorDash
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="flex flex-col flex-1">

            {/* Cart items */}
            <ul className="px-6 py-4 divide-y divide-gray-50 shrink-0">
              {items.map(item => (
                <li key={item.cartItemId} className="py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.name}</p>

                    {/* Modifier summary */}
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <ul className="mt-0.5 space-y-0.5">
                        {item.selectedModifiers.map(group =>
                          group.selections.map(sel => (
                            <li key={sel.optionId} className="text-xs text-brand-muted">
                              {sel.name}
                              {sel.priceAdjustment > 0 && (
                                <span className="text-brand-green ml-1">+${sel.priceAdjustment.toFixed(2)}</span>
                              )}
                            </li>
                          ))
                        )}
                      </ul>
                    )}

                    {item.specialInstructions && (
                      <p className="text-xs text-yellow-700 bg-yellow-50 rounded px-1.5 py-0.5 mt-1 italic">
                        "{item.specialInstructions}"
                      </p>
                    )}

                    <p className="text-brand-muted text-xs mt-1">
                      ${item.effectivePrice.toFixed(2)} each
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button"
                      onClick={() => updateQty(item.cartItemId, item.quantity - 1)}
                      className="w-6 h-6 rounded-full border border-gray-200 text-sm flex items-center justify-center hover:border-brand-green">
                      −
                    </button>
                    <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
                    <button type="button"
                      onClick={() => updateQty(item.cartItemId, item.quantity + 1)}
                      className="w-6 h-6 rounded-full border border-gray-200 text-sm flex items-center justify-center hover:border-brand-green">
                      +
                    </button>
                  </div>

                  <button type="button" onClick={() => removeItem(item.cartItemId)}
                    className="text-gray-300 hover:text-red-400 text-lg leading-none shrink-0">×</button>
                </li>
              ))}
            </ul>

            <div className="px-6 py-3 bg-gray-50 border-y border-gray-100 flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-brand-green">${total.toFixed(2)}</span>
            </div>

            <div className="mx-6 mt-4 bg-green-50 border border-green-100 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <span className="text-base">🏪</span>
              <div>
                <p className="text-xs font-semibold text-brand-green">Pickup order</p>
                <p className="text-xs text-brand-muted">
                  Ready in {pickupWait} ·{" "}
                  <a href={DOORDASH_URL} target="_blank" rel="noopener noreferrer"
                    className="underline hover:text-red-600">
                    Need delivery? Use DoorDash
                  </a>
                </p>
              </div>
            </div>

            <div className="px-6 py-4 flex flex-col gap-3 shrink-0">
              <h3 className="font-semibold text-sm text-brand-muted uppercase tracking-wide">Your Details</h3>
              <input required placeholder="Full Name *" value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-green" />
              <input required type="email" placeholder="Email *" value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-green" />
              <input required type="tel" placeholder="Phone *" value={formData.phone}
                onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-green" />
            </div>

            <div className="px-6 pb-6 flex flex-col gap-2 mt-auto">
              <button type="submit" disabled={loading}
                className="w-full bg-brand-green text-white font-semibold py-3.5 rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-60">
                {loading ? "Redirecting to payment…" : `Pay $${total.toFixed(2)}`}
              </button>
              <button type="button" onClick={clearCart}
                className="text-xs text-gray-400 hover:text-red-400 text-center">
                Clear cart
              </button>
            </div>
          </form>
        )}
      </aside>
    </>
  )
}
