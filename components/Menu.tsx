"use client"

import Link                           from "next/link"
import Image                          from "next/image"
import { useState }                   from "react"
import { useCart }                    from "@/context/CartContext"
import ModifierModal                  from "@/components/ModifierModal"
import type { MenuItem, Special, CartItem } from "@/types"

interface Props {
  items:    MenuItem[]
  specials: Special[]
}

const TEASER_COUNT = 6

export default function Menu({ items, specials }: Props) {
  const { addItem }               = useCart()
  const [modalItem, setModalItem] = useState<MenuItem | null>(null)

  // Show top-ordered items first; fall back to natural order
  const featured = [...items]
    .sort((a, b) => (b.orderCount ?? 0) - (a.orderCount ?? 0))
    .slice(0, TEASER_COUNT)

  function handleAdd(item: MenuItem) {
    if ((item.modifierGroups?.length ?? 0) > 0) {
      setModalItem(item)
      return
    }
    if (item.price == null) return
    const cartItem: CartItem = {
      ...item,
      cartItemId:     `${item._id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      quantity:       1,
      effectivePrice: item.price,
    }
    addItem(cartItem)
  }

  return (
    <>
      {modalItem && (
        <ModifierModal item={modalItem} onClose={() => setModalItem(null)} />
      )}

      <section id="menu" className="bg-brand-light py-20 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Section header */}
          <p className="text-brand-green text-xs font-bold tracking-widest uppercase mb-1">
            Fan Favourites
          </p>
          <div className="flex items-end justify-between mb-2">
            <h2 className="font-serif text-4xl">Most Ordered</h2>
            <Link
              href="/menu"
              className="text-brand-green font-semibold text-sm hover:underline hidden sm:block"
            >
              View full menu →
            </Link>
          </div>
          <p className="text-brand-muted max-w-lg leading-relaxed mb-8">
            The dishes our customers keep coming back for — bold Jamaican flavours made fresh daily.
          </p>

          {/* Specials banner */}
          {specials.length > 0 && (
            <div className="bg-gradient-to-r from-brand-green to-brand-green-dark rounded-xl p-5 mb-8 flex flex-wrap items-center gap-4">
              <span className="text-3xl">🌟</span>
              <div className="text-white">
                <h4 className="font-serif text-lg font-bold">Daily Lunch Specials</h4>
                <p className="text-white/75 text-sm">Available {specials[0]?.hours} daily</p>
              </div>
              <div className="ml-auto flex flex-wrap gap-3">
                {specials.map(s => (
                  <div key={s._id} className="bg-brand-gold text-brand-dark rounded-lg px-4 py-2 text-center">
                    <span className="font-bold">${s.price.toFixed(2)}</span>
                    <span className="block text-xs mt-0.5">{s.items.join(" · ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Featured grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map(item => {
              const canOrder = item.price != null || (item.modifierGroups?.length ?? 0) > 0
              return (
                <div
                  key={item._id}
                  className="bg-white rounded-xl border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col overflow-hidden"
                >
                  {/* Photo */}
                  {item.imageUrl ? (
                    <div className="relative w-full h-36 shrink-0">
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-36 bg-gradient-to-br from-brand-green/10 to-brand-green-dark/20 flex items-center justify-center shrink-0">
                      <span className="text-3xl opacity-40">🍽️</span>
                    </div>
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    {item.tag && (
                      <p className="text-brand-green text-xs font-bold tracking-widest uppercase mb-1">
                        {item.tag}
                      </p>
                    )}
                    <h3 className="font-serif text-xl mb-1">{item.name}</h3>
                    <p className="text-brand-muted text-sm leading-relaxed flex-1 mb-3 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="font-bold text-brand-green">
                        {item.price != null ? `$${item.price.toFixed(2)}` : "Market Price"}
                      </span>
                      {canOrder && (
                        <button
                          onClick={() => handleAdd(item)}
                          className="bg-brand-green text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-brand-green-dark transition-colors"
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
              className="inline-block border-2 border-brand-green text-brand-green font-bold px-6 py-3 rounded-xl hover:bg-brand-green hover:text-white transition-colors"
            >
              View Full Menu
            </Link>
          </div>

          {/* Desktop CTA row */}
          <div className="mt-8 text-center hidden sm:block">
            <Link
              href="/menu"
              className="inline-block border-2 border-brand-green text-brand-green font-bold px-8 py-3 rounded-xl hover:bg-brand-green hover:text-white transition-colors"
            >
              View Full Menu →
            </Link>
          </div>

        </div>
      </section>
    </>
  )
}
