"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import MapboxMap, { Marker } from "react-map-gl/mapbox"

import ModifierModal from "@/components/ModifierModal"
import type { CartItem, MenuItem } from "@/types"

import "mapbox-gl/dist/mapbox-gl.css"

import type { LocationFull } from "@/lib/sanity"

import { useCart } from "@/context/CartContext"

interface Props {
  location?: LocationFull | null
}

export default function Cart({ location }: Props) {
  const router = useRouter()
  const { items, addItem, removeItem, updateQty, clearCart, total, isOpen, setIsOpen } = useCart()

  const [quickAddItem, setQuickAddItem] = useState<MenuItem | null>(null)
  const [editingItem, setEditingItem] = useState<CartItem | null>(null)

  const pickupWait = location?.pickupWaitTime ?? "15–20 min"

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
          <div className="flex flex-1 flex-col gap-6 px-6 py-8">
            {/* Empty state header */}
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="text-5xl">🍽️</span>
              <p className="text-brand-muted font-medium">Your cart is empty</p>
              <button
                onClick={() => setIsOpen(false)}
                className="text-brand-green text-sm font-semibold underline"
              >
                Browse the full menu
              </button>
            </div>

            {/* Quick add panel */}
            {location?.featuredItems && location.featuredItems.length > 0 && (
              <div>
                <p className="text-brand-muted mb-3 text-xs font-semibold tracking-wide uppercase">
                  Popular items
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {location.featuredItems.slice(0, 4).map(item => {
                    const hasRequired = item.modifierGroups?.some(g => g.required) ?? false
                    return (
                      <div
                        key={item._id}
                        className="flex flex-col overflow-hidden rounded-xl border border-gray-100"
                      >
                        {/* Item image */}
                        <div className="relative h-24 w-full bg-gray-50">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-2xl">
                              🍽️
                            </div>
                          )}
                        </div>

                        {/* Item info */}
                        <div className="flex flex-1 flex-col gap-1.5 p-2.5">
                          <p className="line-clamp-2 text-xs leading-snug font-semibold text-gray-900">
                            {item.name}
                          </p>
                          <p className="text-brand-muted text-xs">
                            {item.price !== null ? `$${item.price.toFixed(2)}` : "Market price"}
                          </p>

                          {/* Add button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (hasRequired) {
                                setQuickAddItem(item)
                              } else {
                                addItem({
                                  ...item,
                                  cartItemId: `${item._id}-${Date.now()}`,
                                  quantity: 1,
                                  effectivePrice: item.price ?? 0,
                                  selectedModifiers: undefined,
                                })
                              }
                            }}
                            className="bg-brand-green hover:bg-brand-green-dark mt-auto flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold text-white transition-colors"
                          >
                            {hasRequired ? "Customize" : "+ Add"}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div  className="flex flex-1 flex-col">
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
                    <MapboxMap
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
                    </MapboxMap>
                  </div>
                )}
              </div>
            )}

            {/* Cart items */}
            <ul className="shrink-0 divide-y divide-gray-50 px-6 py-4">
              {items.map(item => (
                <li key={item.cartItemId} className="flex items-start gap-3 py-3">
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => setEditingItem(item)}
                  >
                    <p className="text-sm font-medium">{item.name}</p>

                    {/* Modifier summary — Merged & Categorized */}
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <div className="mt-1">
                        {(() => {
                          const specs: string[] = []
                          const addons: React.ReactNode[] = []

                          // 1. Map sub-modifiers by parent option ID
                          const subSelsByParent = new Map<
                            string,
                            { name: string; price: number }[]
                          >()
                          item.selectedModifiers.forEach(mod => {
                            if (mod.parentOptionId) {
                              const existing = subSelsByParent.get(mod.parentOptionId) ?? []
                              mod.selections.forEach(s =>
                                existing.push({ name: s.name, price: s.priceAdjustment })
                              )
                              subSelsByParent.set(mod.parentOptionId, existing)
                            }
                          })

                          // 2. Process root modifiers
                          item.selectedModifiers.forEach(mod => {
                            if (mod.parentOptionId) return // Skip subs, handled above

                            mod.selections.forEach(sel => {
                              const subs = subSelsByParent.get(sel.optionId) ?? []
                              const subPrice = subs.reduce((sum, s) => sum + s.price, 0)
                              const subLabel = subs.map(s => s.name).join(", ")

                              // Rule 1 & 3: Base sizes and free specs
                              if (
                                mod.groupName === "Size Choice" ||
                                (sel.priceAdjustment === 0 && subPrice === 0)
                              ) {
                                specs.push(sel.name)
                              }
                              // Rule 2: Priced Add-ons
                              else {
                                // Keeping the ( ) format for vertical UI clarity
                                const finalName = subLabel ? `${sel.name} (${subLabel})` : sel.name
                                const finalPrice = sel.priceAdjustment + subPrice
                                addons.push(
                                  <li
                                    key={sel.optionId}
                                    className="mt-1.5 flex items-center justify-between text-xs"
                                  >
                                    <span className="flex items-center gap-1.5 text-gray-600">
                                      <span className="text-gray-300">↳</span> {finalName}
                                    </span>
                                    <span className="text-brand-green font-medium">
                                      +${finalPrice.toFixed(2)}
                                    </span>
                                  </li>
                                )
                              }
                            })
                          })

                          return (
                            <>
                              {specs.length > 0 && (
                                <p className="text-brand-muted text-xs leading-relaxed">
                                  {specs.join(" · ")}
                                </p>
                              )}
                              {addons.length > 0 && <ul className="mt-2">{addons}</ul>}
                            </>
                          )
                        })()}
                      </div>
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
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-sm transition-colors ${
                        item.quantity === 1
                          ? "border-red-200 text-red-400 hover:border-red-400 hover:bg-red-50"
                          : "hover:border-brand-green border-gray-200"
                      }`}
                    >
                      {item.quantity === 1 ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                      ) : (
                        "−"
                      )}
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

            <div className="mt-auto flex flex-col gap-2 px-6 pb-6">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  router.push("/checkout")
                }}
                className="bg-brand-green hover:bg-brand-green-dark w-full rounded-lg py-3.5 font-semibold text-white transition-colors"
              >
                Checkout — ${total.toFixed(2)}
              </button>
              <button
                type="button"
                onClick={clearCart}
                className="text-center text-xs text-gray-400 hover:text-red-400"
              >
                Clear cart
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Quick add modifier modal */}
      {quickAddItem && <ModifierModal item={quickAddItem} onClose={() => setQuickAddItem(null)} />}
      {editingItem && (
        <ModifierModal
          item={editingItem}
          existingItem={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </>
  )
}
