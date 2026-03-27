// components/MenuPage.tsx

"use client"

import { useEffect, useRef, useState } from "react";



import Image from "next/image";



import type { CartItem, MenuItem, Special } from "@/types";



import { useCart } from "@/context/CartContext";



import ModifierModal from "@/components/ModifierModal";









































































































































































interface Props {
  items: MenuItem[]
  specials: Special[]
}

const MOST_ORDERED_COUNT = 6

// ── Helpers ───────────────────────────────────────────────────────────────────

function priceLabel(item: MenuItem) {
  if (item.price == null) return "Market Price"
  return `$${item.price.toFixed(2)}`
}

function hasModifiers(item: MenuItem) {
  return (item.modifierGroups?.length ?? 0) > 0
}

// ── Item photo / placeholder ──────────────────────────────────────────────────

function ItemPhoto({ item }: { item: MenuItem }) {
  return (
    <div className="m-3 rounded bg-gray-100 p-3 shadow-inner">
      <div className="relative h-40 w-full overflow-hidden rounded shadow-inner">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100">
            <span className="text-3xl opacity-40">🍽️</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Item card ─────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  onOpen,
  kitchenOpen,
}: {
  item: MenuItem
  onOpen: (item: MenuItem) => void
  kitchenOpen: boolean
}) {
  const { addItem } = useCart()

  function handleClick() {
    if (!kitchenOpen) return
    if (hasModifiers(item)) {
      onOpen(item)
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
  }

  const canOrder = (item.price != null || hasModifiers(item)) && kitchenOpen

  return (
    <div
      className="relative flex flex-col rounded-lg border border-gray-200 bg-white transition-all hover:-translate-y-1 hover:shadow-lg"
      style={{
        boxShadow: "inset 0 0 10px rgba(0,0,0,0.03), 2px 2px 5px rgba(0,0,0,0.08)",
      }}
    >
      <ItemPhoto item={item} />
      <div className="flex flex-1 flex-col px-5 pt-2 pb-8">
        {item.tag && (
          <span className="text-brand-green mb-1 inline-block text-[10px] font-bold tracking-widest uppercase">
            {item.tag}
          </span>
        )}
        <h3 className="font-serif text-2xl leading-snug font-bold text-gray-900">{item.name}</h3>
        {item.description && (
          <p className="text-brand-muted mt-1 line-clamp-2 flex-1 text-base leading-relaxed">
            {item.description}
          </p>
        )}
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-brand-green font-serif text-2xl font-bold">{priceLabel(item)}</span>
        </div>
      </div>

      {/* Floating add button */}
      {canOrder && (
        <button
          onClick={handleClick}
          disabled={!kitchenOpen}
          aria-label={`Add ${item.name}`}
          className={`absolute -right-2 -bottom-4 z-10 flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-all hover:scale-110 active:scale-95 ${
            kitchenOpen
              ? "bg-brand-green/15 border-brand-green/20 text-brand-green hover:bg-brand-green/25 border backdrop-blur-sm"
              : "cursor-not-allowed bg-gray-100 text-gray-400"
          }`}
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
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MenuPage({ items, specials }: Props) {
  const [modalItem, setModalItem] = useState<MenuItem | null>(null)
  const [kitchenOpen, setKitchenOpen] = useState(true)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const [activeSection, setActiveSection] = useState<string>("")

  // Fetch kitchen status on mount
  useEffect(() => {
    fetch("/api/kitchen")
      .then(r => r.json())
      .then((d: { open: boolean }) => setKitchenOpen(d.open))
      .catch(() => {})
  }, [])

  // Group items: section → category → items
  // Preserves insertion order so the menu stays in the sequence Sanity returns
  const sections = Array.from(
    items.reduce((sMap, item) => {
      const sKey = item.section ?? "Menu"
      if (!sMap.has(sKey)) sMap.set(sKey, new Map<string, MenuItem[]>())
      const cMap = sMap.get(sKey)!
      const cKey = item.category ?? "" // empty string = no sub-category
      if (!cMap.has(cKey)) cMap.set(cKey, [])
      cMap.get(cKey)!.push(item)
      return sMap
    }, new Map<string, Map<string, MenuItem[]>>())
  )

  const mostOrdered = [...items]
    .filter(i => (i.orderCount ?? 0) > 0)
    .sort((a, b) => (b.orderCount ?? 0) - (a.orderCount ?? 0))
    .slice(0, MOST_ORDERED_COUNT)

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) setActiveSection(e.target.id)
        })
      },
      { rootMargin: "-40% 0px -55% 0px" }
    )
    Object.values(sectionRefs.current).forEach(el => {
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  function scrollTo(id: string) {
    const el = sectionRefs.current[id]
    if (!el) return
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 120,
      behavior: "smooth",
    })
  }

  const sectionNames = sections.map(([name]) => name)

  return (
    <>
      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
      {modalItem && <ModifierModal item={modalItem} onClose={() => setModalItem(null)} />}

      {/* Kitchen closed banner */}
      {!kitchenOpen && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-amber-800">
            🔴 Kitchen is currently closed — online ordering unavailable.
          </p>
        </div>
      )}

      {/* Sticky section nav — one pill per top-level section */}
      <div className="sticky top-[65px] z-30 border-b border-gray-100 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="hide-scrollbar mx-auto max-w-6xl overflow-x-auto px-4">
          <div className="flex min-w-max gap-3 py-4">
            {mostOrdered.length > 0 && (
              <button
                onClick={() => scrollTo("most-ordered")}
                className={`rounded-full px-6 py-2.5 text-sm font-black tracking-widest whitespace-nowrap uppercase shadow-sm transition-all ${
                  activeSection === "most-ordered"
                    ? "from-brand-gold to-brand-primary bg-gradient-to-r text-gray-900 shadow-md"
                    : "border border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Most Ordered
              </button>
            )}
            {sectionNames.map(name => (
              <button
                key={name}
                onClick={() => scrollTo(name)}
                className={`rounded-full px-6 py-2.5 text-sm font-black tracking-widest whitespace-nowrap uppercase shadow-sm transition-all ${
                  activeSection === name
                    ? "from-brand-gold to-brand-primary bg-gradient-to-r text-gray-900 shadow-md"
                    : "border border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Page body */}
      <div className="mx-auto max-w-6xl space-y-16 px-4 py-10">
        {/* Specials banner */}
        {specials.length > 0 && (
          <div className="from-brand-green to-brand-green-dark flex flex-wrap items-center gap-6 rounded-2xl bg-linear-to-r p-6">
            <span className="text-4xl">🌟</span>
            <div className="text-white">
              <h4 className="font-serif text-xl font-bold">Daily Lunch Specials</h4>
              <p className="text-sm text-white/70">Available {specials[0]?.hours}</p>
            </div>
            <div className="ml-auto flex flex-wrap gap-3">
              {specials.map(s => (
                <div
                  key={s._id}
                  className="bg-brand-gold text-brand-dark min-w-30 rounded-xl px-5 py-3 text-center"
                >
                  <span className="text-lg font-bold">${s.price.toFixed(2)}</span>
                  <span className="mt-0.5 block text-xs leading-snug">{s.items.join(" · ")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Most Ordered */}
        {mostOrdered.length > 0 && (
          <section
            id="most-ordered"
            ref={el => {
              sectionRefs.current["most-ordered"] = el
            }}
          >
            <SectionHeader label="Fan Favourites" title="Most Ordered" />
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {mostOrdered.map(item => (
                <ItemCard
                  key={item._id}
                  item={item}
                  onOpen={setModalItem}
                  kitchenOpen={kitchenOpen}
                />
              ))}
            </div>
          </section>
        )}

        {/* Sections → Categories → Items */}
        {sections.map(([sectionName, categoryMap]) => (
          <section
            key={sectionName}
            id={sectionName}
            ref={el => {
              sectionRefs.current[sectionName] = el
            }}
          >
            {/* Section header — large, acts as the nav anchor */}
            <SectionHeader title={sectionName} />

            <div className="space-y-10">
              {Array.from(categoryMap).map(([categoryName, categoryItems]) => (
                <div key={categoryName || "_uncategorised"}>
                  {/* Category sub-header — only shown when a category name exists */}
                  {categoryName && (
                    <h3 className="text-brand-muted mb-4 border-b border-gray-100 pb-1 text-sm font-bold tracking-widest uppercase">
                      {categoryName}
                    </h3>
                  )}
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {categoryItems.map(item => (
                      <ItemCard
                        key={item._id}
                        item={item}
                        onOpen={setModalItem}
                        kitchenOpen={kitchenOpen}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}

function SectionHeader({ label, title }: { label?: string; title: string }) {
  return (
    <div className="mb-8">
      {label && (
        <p className="text-brand-green mb-1 text-xs font-bold tracking-widest uppercase">{label}</p>
      )}
      <h2 className="border-brand-green inline-block border-b-4 pb-2 font-serif text-4xl font-bold text-gray-900">
        {title}
      </h2>
    </div>
  )
}
