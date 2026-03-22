"use client"

import { useEffect, useRef, useState } from "react"

import Image from "next/image"

import type { CartItem, MenuItem, Special } from "@/types"

import { useCart } from "@/context/CartContext"

import ModifierModal from "@/components/ModifierModal"

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
  if (item.imageUrl) {
    return (
      <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-t-xl">
        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
      </div>
    )
  }
  return (
    <div className="from-brand-green/10 to-brand-green-dark/20 flex h-36 w-full shrink-0 items-center justify-center rounded-t-xl bg-gradient-to-br">
      <span className="text-3xl opacity-40">🍽️</span>
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
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md">
      <ItemPhoto item={item} />
      <div className="flex flex-1 flex-col p-4">
        {item.tag && (
          <span className="text-brand-green mb-1 inline-block text-[10px] font-bold tracking-widest uppercase">
            {item.tag}
          </span>
        )}
        <h3 className="mb-1 font-serif text-lg leading-snug">{item.name}</h3>
        {item.description && (
          <p className="text-brand-muted mb-3 line-clamp-2 flex-1 text-sm leading-relaxed">
            {item.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between">
          <span className="text-brand-green text-sm font-bold">{priceLabel(item)}</span>
          {(item.price != null || hasModifiers(item)) && (
            <button
              onClick={handleClick}
              disabled={!kitchenOpen}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                kitchenOpen
                  ? "bg-brand-green hover:bg-brand-green-dark text-white"
                  : "cursor-not-allowed bg-gray-200 text-gray-400"
              }`}
            >
              {kitchenOpen ? "+ Add" : "Closed"}
            </button>
          )}
        </div>
      </div>
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
      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl overflow-x-auto px-4">
          <div className="flex min-w-max gap-1 py-3">
            {mostOrdered.length > 0 && (
              <button
                onClick={() => scrollTo("most-ordered")}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${activeSection === "most-ordered" ? "bg-brand-green text-white" : "text-brand-muted hover:text-brand-green"}`}
              >
                Most Ordered
              </button>
            )}
            {sectionNames.map(name => (
              <button
                key={name}
                onClick={() => scrollTo(name)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${activeSection === name ? "bg-brand-green text-white" : "text-brand-muted hover:text-brand-green"}`}
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
          <div className="from-brand-green to-brand-green-dark flex flex-wrap items-center gap-6 rounded-2xl bg-gradient-to-r p-6">
            <span className="text-4xl">🌟</span>
            <div className="text-white">
              <h4 className="font-serif text-xl font-bold">Daily Lunch Specials</h4>
              <p className="text-sm text-white/70">Available {specials[0]?.hours}</p>
            </div>
            <div className="ml-auto flex flex-wrap gap-3">
              {specials.map(s => (
                <div
                  key={s._id}
                  className="bg-brand-gold text-brand-dark min-w-[120px] rounded-xl px-5 py-3 text-center"
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    <div className="mb-6">
      {label && (
        <p className="text-brand-green mb-1 text-xs font-bold tracking-widest uppercase">{label}</p>
      )}
      <h2 className="font-serif text-3xl">{title}</h2>
      <div className="bg-brand-green mt-2 h-0.5 w-12 rounded" />
    </div>
  )
}
