"use client"

import Image                              from "next/image"
import { useState, useRef, useEffect }    from "react"
import { useCart }                        from "@/context/CartContext"
import ModifierModal                      from "@/components/ModifierModal"
import type { MenuItem, Special, CartItem } from "@/types"

interface Props {
  items:    MenuItem[]
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
      <div className="relative w-full h-36 rounded-t-xl overflow-hidden shrink-0">
        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
      </div>
    )
  }
  return (
    <div className="w-full h-36 rounded-t-xl bg-gradient-to-br from-brand-green/10 to-brand-green-dark/20 flex items-center justify-center shrink-0">
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
  item:        MenuItem
  onOpen:      (item: MenuItem) => void
  kitchenOpen: boolean
}) {
  const { addItem } = useCart()

  function handleClick() {
    if (!kitchenOpen) return
    if (hasModifiers(item)) { onOpen(item); return }
    if (item.price == null) return
    const cartItem: CartItem = {
      ...item,
      cartItemId:     `${item._id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      quantity:       1,
      effectivePrice: item.price,
    }
    addItem(cartItem)
  }

  const canOrder = (item.price != null || hasModifiers(item)) && kitchenOpen

  return (
    <div className="bg-white rounded-xl border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col overflow-hidden">
      <ItemPhoto item={item} />
      <div className="p-4 flex-1 flex flex-col">
        {item.tag && (
          <span className="inline-block text-brand-green text-[10px] font-bold tracking-widest uppercase mb-1">
            {item.tag}
          </span>
        )}
        <h3 className="font-serif text-lg leading-snug mb-1">{item.name}</h3>
        {item.description && (
          <p className="text-brand-muted text-sm leading-relaxed flex-1 mb-3 line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto">
          <span className="font-bold text-brand-green text-sm">{priceLabel(item)}</span>
          {(item.price != null || hasModifiers(item)) && (
            <button
              onClick={handleClick}
              disabled={!kitchenOpen}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                kitchenOpen
                  ? "bg-brand-green text-white hover:bg-brand-green-dark"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
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
  const sectionRefs                   = useRef<Record<string, HTMLElement | null>>({})
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
      const cKey = item.category ?? ""   // empty string = no sub-category
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
      entries => { entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id) }) },
      { rootMargin: "-40% 0px -55% 0px" }
    )
    Object.values(sectionRefs.current).forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [sections])

  function scrollTo(id: string) {
    const el = sectionRefs.current[id]
    if (!el) return
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: "smooth" })
  }

  const sectionNames = sections.map(([name]) => name)

  return (
    <>
      {modalItem && <ModifierModal item={modalItem} onClose={() => setModalItem(null)} />}

      {/* Kitchen closed banner */}
      {!kitchenOpen && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center">
          <p className="text-amber-800 font-semibold text-sm">
            🔴 Kitchen is currently closed — online ordering unavailable.
          </p>
        </div>
      )}

      {/* Sticky section nav — one pill per top-level section */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-1 py-3 min-w-max">
            {mostOrdered.length > 0 && (
              <button onClick={() => scrollTo("most-ordered")}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeSection === "most-ordered" ? "bg-brand-green text-white" : "text-brand-muted hover:text-brand-green"}`}>
                Most Ordered
              </button>
            )}
            {sectionNames.map(name => (
              <button key={name} onClick={() => scrollTo(name)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeSection === name ? "bg-brand-green text-white" : "text-brand-muted hover:text-brand-green"}`}>
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Page body */}
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-16">

        {/* Specials banner */}
        {specials.length > 0 && (
          <div className="bg-gradient-to-r from-brand-green to-brand-green-dark rounded-2xl p-6 flex flex-wrap items-center gap-6">
            <span className="text-4xl">🌟</span>
            <div className="text-white">
              <h4 className="font-serif text-xl font-bold">Daily Lunch Specials</h4>
              <p className="text-white/70 text-sm">Available {specials[0]?.hours}</p>
            </div>
            <div className="ml-auto flex flex-wrap gap-3">
              {specials.map(s => (
                <div key={s._id} className="bg-brand-gold text-brand-dark rounded-xl px-5 py-3 text-center min-w-[120px]">
                  <span className="font-bold text-lg">${s.price.toFixed(2)}</span>
                  <span className="block text-xs mt-0.5 leading-snug">{s.items.join(" · ")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Most Ordered */}
        {mostOrdered.length > 0 && (
          <section id="most-ordered" ref={el => { sectionRefs.current["most-ordered"] = el }}>
            <SectionHeader label="Fan Favourites" title="Most Ordered" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mostOrdered.map(item => (
                <ItemCard key={item._id} item={item} onOpen={setModalItem} kitchenOpen={kitchenOpen} />
              ))}
            </div>
          </section>
        )}

        {/* Sections → Categories → Items */}
        {sections.map(([sectionName, categoryMap]) => (
          <section
            key={sectionName}
            id={sectionName}
            ref={el => { sectionRefs.current[sectionName] = el }}
          >
            {/* Section header — large, acts as the nav anchor */}
            <SectionHeader title={sectionName} />

            <div className="space-y-10">
              {Array.from(categoryMap).map(([categoryName, categoryItems]) => (
                <div key={categoryName || "_uncategorised"}>
                  {/* Category sub-header — only shown when a category name exists */}
                  {categoryName && (
                    <h3 className="text-sm font-bold uppercase tracking-widest text-brand-muted mb-4 pb-1 border-b border-gray-100">
                      {categoryName}
                    </h3>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryItems.map(item => (
                      <ItemCard key={item._id} item={item} onOpen={setModalItem} kitchenOpen={kitchenOpen} />
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
      {label && <p className="text-brand-green text-xs font-bold tracking-widest uppercase mb-1">{label}</p>}
      <h2 className="font-serif text-3xl">{title}</h2>
      <div className="mt-2 h-0.5 w-12 bg-brand-green rounded" />
    </div>
  )
}
