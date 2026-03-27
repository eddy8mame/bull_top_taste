// components/Cart.tsx

"use client"

import { useRef, useState } from "react"

import Image from "next/image"
import { useRouter } from "next/navigation"

import "mapbox-gl/dist/mapbox-gl.css"

import type { CartItem, MenuItem } from "@/types"

import type { LocationFull } from "@/lib/sanity"

import { useCart } from "@/context/CartContext"

import ModifierModal from "@/components/ModifierModal"

interface Props {
  location?: LocationFull | null
}

export default function Cart({ location }: Props) {
  const router = useRouter()
  const { items, addItem, removeItem, updateQty, total, isOpen, setIsOpen } = useCart()

  const [quickAddItem, setQuickAddItem] = useState<MenuItem | null>(null)
  const [editingItem, setEditingItem] = useState<CartItem | null>(null)
  const complementScrollRef = useRef<HTMLDivElement>(null)

  const PAGE_SIZE = 4

  if (!isOpen) return null

  function scrollComplement(direction: "prev" | "next") {
    const el = complementScrollRef.current
    if (!el) return
    const itemWidth = el.scrollWidth / (location?.complementItems?.length ?? 1)
    el.scrollBy({
      left: direction === "next" ? itemWidth * PAGE_SIZE : -itemWidth * PAGE_SIZE,
      behavior: "smooth",
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setIsOpen(false)} />

      <aside
        className="fixed top-0 right-0 z-50 flex h-full w-full max-w-137.5 flex-col overflow-y-auto bg-white shadow-2xl"
        style={{ boxShadow: "-8px 0 24px rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-start px-6 py-5">
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close cart"
            className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 text-gray-800"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-10 py-8 text-center">
            <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-gray-50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-brand-green h-14 w-14"
              >
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <h2 className="mb-4 font-serif text-4xl font-bold text-gray-900">Your bag is empty</h2>
            <p className="text-brand-muted mb-10 max-w-xs text-xl leading-relaxed">
              It looks like you haven&apos;t added anything to your order yet
            </p>
            <button
              onClick={() => setIsOpen(false)}
              className="bg-brand-green hover:bg-brand-green-dark w-full rounded-lg py-6 text-xl font-bold tracking-widest text-white uppercase transition-colors active:scale-[0.98]"
            >
              Browse the Menu
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            {/* Header */}
            {/* Header */}
            <div className="px-6 pt-2 pb-6">
              <p className="mb-1 text-xs font-bold tracking-widest text-gray-900 uppercase">
                Your Bag From
              </p>
              <h1 className="font-serif text-5xl font-bold text-gray-900">
                {location?.restaurantName ?? "Bull Top Taste"}
              </h1>
            </div>

            {/* Cart items */}
            <section className="flex-1 overflow-y-auto">
              {items.map((item, index) => (
                <div
                  key={item.cartItemId}
                  className={`mx-6 flex cursor-pointer items-start gap-4 border-t border-gray-100 py-4 transition-colors hover:bg-gray-50 ${
                    index === items.length - 1 ? "" : ""
                  }`}
                  onClick={() => setEditingItem(item)}
                >
                  {/* Thumbnail */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      // Placeholder for items without images
                      <div className="flex h-full w-full items-center justify-center text-2xl">
                        🍽️
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-xl leading-tight font-bold text-gray-900">
                        {item.name}
                      </h3>

                      {/* Quantity pill */}
                      <div
                        className="flex shrink-0 items-center gap-1 rounded-full border-2 border-gray-200 bg-white p-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          aria-label={`Remove ${item.name}`}
                          onClick={() => removeItem(item.cartItemId)}
                          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4 text-gray-800"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                        <span className="w-4 text-center text-base leading-none font-black text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Add another ${item.name}`}
                          onClick={() => updateQty(item.cartItemId, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-500"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4 text-gray-800"
                          >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Modifier summary — preserved exactly */}
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <div className="mt-1">
                        {(() => {
                          const specs: string[] = []
                          const addons: React.ReactNode[] = []

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

                          item.selectedModifiers.forEach(mod => {
                            if (mod.parentOptionId) return
                            mod.selections.forEach(sel => {
                              const subs = subSelsByParent.get(sel.optionId) ?? []
                              const subPrice = subs.reduce((sum, s) => sum + s.price, 0)
                              const subLabel = subs.map(s => s.name).join(", ")
                              if (
                                mod.groupName === "Size Choice" ||
                                (sel.priceAdjustment === 0 && subPrice === 0)
                              ) {
                                specs.push(sel.name)
                              } else {
                                const finalName = subLabel ? `${sel.name} (${subLabel})` : sel.name
                                const finalPrice = sel.priceAdjustment + subPrice
                                addons.push(
                                  <li
                                    key={sel.optionId}
                                    className="mt-1 flex items-center justify-between text-xs"
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
                              {addons.length > 0 && <ul className="mt-1">{addons}</ul>}
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

                    <p className="mt-2 text-base font-bold text-gray-900">
                      ${(item.effectivePrice * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </section>

            {/* Complement your cart */}
            {location?.complementItems && location.complementItems.length > 0 && (
              <div className="mt-4 border-t border-gray-100 px-6 pt-4 pb-2">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-serif text-xl font-bold text-gray-900">
                    Complement your cart
                  </h3>
                  {location.complementItems.length > PAGE_SIZE && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Scroll left"
                        onClick={() => scrollComplement("prev")}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white transition-colors hover:bg-gray-50"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4 text-gray-600"
                        >
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="Scroll right"
                        onClick={() => scrollComplement("next")}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white transition-colors hover:bg-gray-50"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4 text-gray-600"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <div
                  ref={complementScrollRef}
                  className="grid auto-cols-[calc(25%-6px)] grid-flow-col gap-3 overflow-x-auto pb-2"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {location.complementItems.map(item => {
                    const hasRequired = item.modifierGroups?.some(g => g.required) ?? false
                    return (
                      <div
                        key={item._id}
                        className="flex flex-col overflow-hidden rounded-xl border border-gray-100"
                      >
                        <div className="relative h-20 w-full bg-gray-50">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="25vw"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-2xl">
                              🍽️
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-1 p-2">
                          <p className="line-clamp-2 text-xs leading-snug font-semibold text-gray-900">
                            {item.name}
                          </p>
                          <p className="text-brand-muted text-xs">
                            {item.price !== null ? `$${item.price?.toFixed(2)}` : "Market price"}
                          </p>
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
                            className="bg-brand-green hover:bg-brand-green-dark mt-auto flex w-full items-center justify-center rounded-lg py-1.5 text-xs font-semibold text-white transition-colors"
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

            {/* Subtotal */}
            <div className="mx-6 mt-4 flex items-center justify-between border-t-2 border-gray-100 pt-6">
              <span className="text-2xl font-bold text-gray-900">Subtotal</span>
              <span className="font-serif text-3xl font-black text-gray-900">
                ${total.toFixed(2)}
              </span>
            </div>

            {/* CTA */}
            <div className="px-6 pt-4 pb-8">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  router.push("/checkout")
                }}
                className="bg-brand-green hover:bg-brand-green-dark w-full rounded-2xl py-6 text-xl font-black tracking-widest text-white uppercase transition-all active:scale-[0.98]"
              >
                Proceed to Checkout
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
