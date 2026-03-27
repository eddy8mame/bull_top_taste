// components/Menu.tsx

"use client"

import { useCallback, useState } from "react";



import Image from "next/image";
import Link from "next/link";



import type { CartItem, MenuItem, Special } from "@/types";



import { useCart } from "@/context/CartContext";



import ModifierModal from "@/components/ModifierModal";







































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

      <section id="menu" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          {/* Section header */}
          {/* <p className="text-brand-green mb-1 text-xs font-bold tracking-widest uppercase">
            Fan Favourites
          </p> */}
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="font-serif text-5xl font-bold text-gray-900 md:text-6xl">
                Most Ordered
              </h2>
              <p className="mt-2 text-xl text-gray-500">
                Our community&apos;s favorite comfort classics, packed with authentic spice.
              </p>
            </div>
            <div className="ml-8 hidden shrink-0 items-center gap-3 md:flex">
              <Link
                href="/menu"
                className="text-brand-green flex items-center gap-2 text-xs font-black tracking-widest uppercase hover:underline"
              >
                View Full Menu
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
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
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {" "}
            {featured.map((item, index) => {
              const canOrder = item.price != null || (item.modifierGroups?.length ?? 0) > 0
              return (
                <div
                  key={item._id}
                  className="relative flex flex-col rounded-lg border border-gray-200 bg-white transition-all hover:-translate-y-1 hover:shadow-lg"
                  style={{
                    boxShadow: "inset 0 0 10px rgba(0,0,0,0.03), 2px 2px 5px rgba(0,0,0,0.08)",
                  }}
                >
                  {/* Recessed image tray */}
                  <div className="m-3 rounded bg-gray-100 p-3 shadow-inner">
                    <div className="relative h-50 w-full overflow-hidden rounded shadow-inner">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          priority={index < 4}
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100">
                          <span className="text-3xl opacity-40">🍽️</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col px-4 pt-1.5 pb-8">
                    {item.tag && (
                      <p className="text-brand-green mb-1 text-[10px] font-bold tracking-widest uppercase">
                        {item.tag}
                      </p>
                    )}
                    <div className="mb-3 flex items-baseline justify-between gap-2">
                      <h3 className="font-serif text-2xl leading-snug font-bold text-gray-900">
                        {item.name}
                      </h3>
                      <span className="text-brand-green ml-2 shrink-0 font-serif text-2xl font-bold">
                        {item.price != null ? `$${item.price.toFixed(2)}` : "Market Price"}
                      </span>
                    </div>
                    <p className="text-brand-muted line-clamp-2 flex-1 text-base leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Floating add button */}
                  {canOrder && (
                    <button
                      onClick={() => handleAdd(item)}
                      aria-label={`Add ${item.name}`}
                      className="border-brand-green/20 bg-brand-green/15 text-brand-green hover:bg-brand-green/25 absolute -right-2 -bottom-4 z-10 flex h-12 w-12 items-center justify-center rounded-full border shadow-xl backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-6 w-6"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  )}
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
