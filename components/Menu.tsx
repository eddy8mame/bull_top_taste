"use client"

import { useState, useCallback } from "react"

import Image from "next/image"
import Link from "next/link"

import type { CartItem, MenuItem, Special } from "@/types"

import { useCart } from "@/context/CartContext"

import ModifierModal from "@/components/ModifierModal"

interface Props {
  items: MenuItem[]
  specials: Special[]
}

const TEASER_COUNT = 6

export default function Menu({ items, specials }: Props) {
  const { addItem } = useCart()
  const [modalItem, setModalItem] = useState<MenuItem | null>(null)

  // Show top-ordered items first; fall back to natural order
  const featured = [...items]
    .sort((a, b) => (b.orderCount ?? 0) - (a.orderCount ?? 0))
    .slice(0, TEASER_COUNT)

const handleAdd = useCallback(
  (item: MenuItem) => {
    if ((item.modifierGroups?.length ?? 0) > 0) {
      setModalItem(item)
      return
    }
    if (item.price == null) return
    const cartItem: CartItem = {
      ...item,
      cartItemId: `${item._id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      quantity: 1,
      effectivePrice: item.price,
    }
    addItem(cartItem)
  },
  [addItem]
)

  return (
    <>
      {modalItem && <ModifierModal item={modalItem} onClose={() => setModalItem(null)} />}

      <section id="menu" className="bg-brand-light px-6 py-10">
        <div className="mx-auto max-w-6xl">
          {/* Section header */}
          {/* <p className="text-brand-green mb-1 text-xs font-bold tracking-widest uppercase">
            Fan Favourites
          </p> */}
          <div className="mb-2 flex items-end justify-between">
            <h2 className="font-serif text-4xl">Most Ordered</h2>
            <Link
              href="/menu"
              className="text-brand-green hidden text-sm font-semibold hover:underline sm:block"
            >
              View full menu →
            </Link>
          </div>
          {/* <p className="text-brand-muted mb-8 max-w-lg leading-relaxed">
            The dishes our customers keep coming back for — bold Jamaican flavours made fresh daily.
          </p> */}

          {/* Specials banner */}
          {specials.length > 0 && (
            <div className="from-brand-green to-brand-green-dark mb-8 flex flex-wrap items-center gap-4 rounded-xl bg-gradient-to-r p-5">
              <span className="text-3xl">🌟</span>
              <div className="text-white">
                <h4 className="font-serif text-lg font-bold">Daily Lunch Specials</h4>
                <p className="text-sm text-white/75">Available {specials[0]?.hours} daily</p>
              </div>
              <div className="ml-auto flex flex-wrap gap-3">
                {specials.map(s => (
                  <div
                    key={s._id}
                    className="bg-brand-gold text-brand-dark rounded-lg px-4 py-2 text-center"
                  >
                    <span className="font-bold">${s.price.toFixed(2)}</span>
                    <span className="mt-0.5 block text-xs">{s.items.join(" · ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Featured grid */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((item, index) => {
              const canOrder = item.price != null || (item.modifierGroups?.length ?? 0) > 0
              return (
                <div
                  key={item._id}
                  className="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Photo */}
                  {item.imageUrl ? (
                    <div className="relative h-36 w-full shrink-0">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        priority={index <4}
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                      />{" "}
                    </div>
                  ) : (
                    <div className="from-brand-green/10 to-brand-green-dark/20 flex h-36 w-full shrink-0 items-center justify-center bg-linear-to-br">
                      <span className="text-3xl opacity-40">🍽️</span>
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-4">
                    {item.tag && (
                      <p className="text-brand-green mb-1 text-xs font-bold tracking-widest uppercase">
                        {item.tag}
                      </p>
                    )}
                    <h3 className="mb-1 font-serif text-xl">{item.name}</h3>
                    <p className="text-brand-muted mb-3 line-clamp-2 flex-1 text-sm leading-relaxed">
                      {item.description}
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-brand-green font-bold">
                        {item.price != null ? `$${item.price.toFixed(2)}` : "Market Price"}
                      </span>
                      {canOrder && (
                        <button
                          onClick={() => handleAdd(item)}
                          className="bg-brand-green hover:bg-brand-green-dark rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-colors"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mobile CTA */}
          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/menu"
              className="border-brand-green text-brand-green hover:bg-brand-green inline-block rounded-xl border-2 px-6 py-3 font-bold transition-colors hover:text-white"
            >
              View Full Menu
            </Link>
          </div>

          {/* Desktop CTA row */}
          <div className="mt-8 hidden text-center sm:block">
            <Link
              href="/menu"
              className="border-brand-green text-brand-green hover:bg-brand-green inline-block rounded-xl border-2 px-8 py-3 font-bold transition-colors hover:text-white"
            >
              View Full Menu →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
