// components/ModifierModal.tsx

"use client"

import { useEffect, useMemo, useState } from "react";



import Image from "next/image";



import type { CartItem, MenuItem, ModifierGroup, SelectedModifier } from "@/types";



import { useCart } from "@/context/CartContext";































interface Props {
  item: MenuItem
  onClose: () => void
  existingItem?: CartItem
}

type Selections = Record<string, Set<string>>
type SubSelections = Record<string, Record<string, Selections>>

function inputMode(g: ModifierGroup): "radio" | "stepper" | "checkbox" {
  if (!g.required) return g.max === 1 ? "radio" : "checkbox"
  return g.max === 1 ? "radio" : "stepper"
}

function safeKey(obj: { _id?: string; name: string }, prefix: string) {
  return obj._id && obj._id !== "null" ? obj._id : `${prefix}-${obj.name}`
}

function groupKey(g: ModifierGroup, gi: number) {
  return safeKey(g, `g${gi}`)
}

// ── Sub-modifier groups (reference screenshot treatment) ──────────────────────
function SubGroups({
  groups,
  parentGroupId,
  optionId,
  subSel,
  onSubToggle,
  onSubRadio,
}: {
  groups: ModifierGroup[]
  parentGroupId: string
  optionId: string
  subSel: SubSelections
  onSubToggle: (pgId: string, optId: string, sgId: string, soId: string, max: number) => void
  onSubRadio: (pgId: string, optId: string, sgId: string, soId: string) => void
}) {
  return (
    <div className="space-y-4 bg-gray-50 px-5 py-4">
      {groups.map((sg, sgi) => {
        const sgKey = safeKey(sg, `sg${sgi}`)
        const selMap = subSel[parentGroupId]?.[optionId]?.[sgKey] ?? new Set<string>()
        const mode = inputMode(sg)
        const metMin = selMap.size >= sg.min

        return (
          <div key={sgKey}>
            {/* Sub-group header */}
            <div className="mb-3 flex items-center justify-between pl-4">
              <p className="text-brand-green font-serif text-lg font-semibold">{sg.name}</p>
              {sg.required && (
                <span
                  className={`rounded border px-2 py-0.5 text-xs font-bold tracking-wider uppercase ${
                    metMin ? "border-brand-green text-brand-green" : "border-gray-300 text-gray-500"
                  }`}
                >
                  {metMin ? "✓" : "Required"}
                </span>
              )}
            </div>

            {/* Sub-group options */}
            <div className="space-y-1 pl-4">
              {sg.options.map((so, soi) => {
                const soKey = safeKey(so, `${sgKey}-o${soi}`)
                const isSelected = selMap.has(soKey)
                return (
                  <button
                    key={soKey}
                    type="button"
                    onClick={() =>
                      mode === "radio"
                        ? onSubRadio(parentGroupId, optionId, sgKey, soKey)
                        : onSubToggle(parentGroupId, optionId, sgKey, soKey, sg.max)
                    }
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        isSelected ? "border-brand-green" : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <span className="bg-brand-green block h-2.5 w-2.5 rounded-full" />
                      )}
                    </span>
                    <span className="flex-1 text-base text-gray-800">{so.name}</span>
                    {so.priceAdjustment > 0 && (
                      <span className="text-brand-green shrink-0 text-sm font-semibold">
                        +${so.priceAdjustment.toFixed(2)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Sub-group validation error */}
            {sg.required && !metMin && (
              <p className="mt-2 flex items-center gap-1 pl-4 text-sm font-medium text-red-500">
                <span className="text-base">●</span> Selection Required
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ModifierModal({ item, onClose, existingItem }: Props) {
  const { addItem, replaceItem } = useCart()
  const groups = item.modifierGroups ?? []

  // ── Scroll lock ────────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  // ── Selections ─────────────────────────────────────────────────────────────
  const [selections, setSelections] = useState<Selections>(() => {
    const empty = Object.fromEntries(groups.map((g, gi) => [groupKey(g, gi), new Set<string>()]))
    if (!existingItem?.selectedModifiers) return empty
    const result = { ...empty }
    existingItem.selectedModifiers.forEach(mod => {
      if (mod.parentOptionId) return
      if (result[mod.groupId] !== undefined) {
        result[mod.groupId] = new Set(mod.selections.map(s => s.optionId))
      }
    })
    return result
  })

  const [subSel, setSubSel] = useState<SubSelections>(() => {
    if (!existingItem?.selectedModifiers) return {}
    const result: SubSelections = {}
    const subMods = existingItem.selectedModifiers.filter(m => m.parentOptionId)
    subMods.forEach(mod => {
      let parentGroupId: string | undefined
      groups.forEach((g, gi) => {
        const gKey = groupKey(g, gi)
        g.options.forEach((o, oi) => {
          if (safeKey(o, `${gKey}-o${oi}`) === mod.parentOptionId) parentGroupId = gKey
        })
      })
      if (!parentGroupId || !mod.parentOptionId) return
      result[parentGroupId] ??= {}
      result[parentGroupId][mod.parentOptionId] ??= {}
      result[parentGroupId][mod.parentOptionId][mod.groupId] = new Set(
        mod.selections.map(s => s.optionId)
      )
    })
    return result
  })

  // ── Optional group expanded state ──────────────────────────────────────────
  const [expandedOptional, setExpandedOptional] = useState<Set<string>>(
    () => new Set(groups.flatMap((g, gi) => (!g.required ? [groupKey(g, gi)] : [])))
  )
  function toggleOptional(gKey: string) {
    setExpandedOptional(prev => {
      const next = new Set(prev)
      if (next.has(gKey)) {
        next.delete(gKey)
      } else {
        next.add(gKey)
      }
      return next
    })
  }

  const [specialInstructions, setSpecialInstructions] = useState(
    existingItem?.specialInstructions ?? ""
  )

  // ── Validation & CTA Label ─────────────────────────────────────────────────
  const missingCount = useMemo(() => {
    let count = 0

    groups.forEach((g, gi) => {
      const gKey = groupKey(g, gi)
      const selCount = selections[gKey]?.size ?? 0

      // 1. Check top-level group
      if (g.required && selCount < g.min) {
        count += g.min - selCount
      }

      // 2. Check sub-groups for currently selected options
      for (const optKey of selections[gKey] ?? new Set()) {
        const opt = g.options.find((o, oi) => safeKey(o, `${gKey}-o${oi}`) === optKey)
        if (!opt) continue
        ;(opt.subModifierGroups ?? []).forEach((sg, sgi) => {
          if (!sg.required) return
          const sgKey = safeKey(sg, `sg${sgi}`)
          const subCount = subSel[gKey]?.[optKey]?.[sgKey]?.size ?? 0

          if (subCount < sg.min) {
            count += sg.min - subCount
          }
        })
      }
    })

    return count
  }, [groups, selections, subSel])

  const isValid = missingCount === 0
  const remaining = missingCount

  // ── Price ──────────────────────────────────────────────────────────────────
  const effectivePrice = useMemo(() => {
    let total = item.price ?? 0
    groups.forEach((g, gi) => {
      const gKey = groupKey(g, gi)
      for (const optKey of selections[gKey] ?? new Set()) {
        const opt = g.options.find((o, oi) => safeKey(o, `${gKey}-o${oi}`) === optKey)
        if (!opt) continue
        total += opt.priceAdjustment
        ;(opt.subModifierGroups ?? []).forEach((sg, sgi) => {
          const sgKey = safeKey(sg, `sg${sgi}`)
          for (const soKey of subSel[gKey]?.[optKey]?.[sgKey] ?? new Set()) {
            const so = sg.options.find((o, soi) => safeKey(o, `${sgKey}-o${soi}`) === soKey)
            if (so) total += so.priceAdjustment
          }
        })
      }
    })
    return total
  }, [item.price, groups, selections, subSel])

  // ── Handlers ───────────────────────────────────────────────────────────────
  function selectRadio(gKey: string, optKey: string) {
    setSelections(prev => ({ ...prev, [gKey]: new Set([optKey]) }))
  }

  function toggleStepper(gKey: string, optKey: string, max: number) {
    setSelections(prev => {
      const cur = new Set(prev[gKey])
      cur.has(optKey) ? cur.delete(optKey) : cur.size < max && cur.add(optKey)
      return { ...prev, [gKey]: cur }
    })
  }

  function toggleCheckbox(gKey: string, optKey: string, max: number) {
    setSelections(prev => {
      const cur = new Set(prev[gKey])
      cur.has(optKey) ? cur.delete(optKey) : cur.size < max && cur.add(optKey)
      return { ...prev, [gKey]: cur }
    })
  }

  function subRadio(pgKey: string, optKey: string, sgKey: string, soKey: string) {
    setSubSel(prev => ({
      ...prev,
      [pgKey]: {
        ...(prev[pgKey] ?? {}),
        [optKey]: { ...(prev[pgKey]?.[optKey] ?? {}), [sgKey]: new Set([soKey]) },
      },
    }))
  }

  function subToggle(pgKey: string, optKey: string, sgKey: string, soKey: string, max: number) {
    setSubSel(prev => {
      const cur = new Set(prev[pgKey]?.[optKey]?.[sgKey] ?? [])
      cur.has(soKey) ? cur.delete(soKey) : cur.size < max && cur.add(soKey)
      return {
        ...prev,
        [pgKey]: {
          ...(prev[pgKey] ?? {}),
          [optKey]: { ...(prev[pgKey]?.[optKey] ?? {}), [sgKey]: cur },
        },
      }
    })
  }

  // ── Add to cart ────────────────────────────────────────────────────────────
  function handleAdd() {
    if (!isValid) return
    const selectedModifiers: SelectedModifier[] = []
    groups.forEach((g, gi) => {
      const gKey = groupKey(g, gi)
      const optKeys = Array.from(selections[gKey] ?? [])
      if (!optKeys.length) return
      selectedModifiers.push({
        groupId: gKey,
        groupName: g.name,
        selections: optKeys.map(optKey => {
          const opt = g.options.find((o, oi) => safeKey(o, `${gKey}-o${oi}`) === optKey)!
          return { optionId: optKey, name: opt.name, priceAdjustment: opt.priceAdjustment }
        }),
      })
      for (const optKey of optKeys) {
        const opt = g.options.find((o, oi) => safeKey(o, `${gKey}-o${oi}`) === optKey)
        ;(opt?.subModifierGroups ?? []).forEach((sg, sgi) => {
          const sgKey = safeKey(sg, `sg${sgi}`)
          const soKeys = Array.from(subSel[gKey]?.[optKey]?.[sgKey] ?? [])
          if (!soKeys.length) return
          selectedModifiers.push({
            groupId: sgKey,
            groupName: sg.name,
            parentOptionId: optKey,
            selections: soKeys.map(soKey => {
              const so = sg.options.find((o, soi) => safeKey(o, `${sgKey}-o${soi}`) === soKey)!
              return { optionId: soKey, name: so.name, priceAdjustment: so.priceAdjustment }
            }),
          })
        })
      }
    })
    const cartItem: CartItem = {
      ...item,
      cartItemId:
        existingItem?.cartItemId ??
        `${item._id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      quantity: existingItem?.quantity ?? 1,
      effectivePrice,
      selectedModifiers: selectedModifiers.length ? selectedModifiers : undefined,
      specialInstructions: specialInstructions.trim() || undefined,
    }
    if (existingItem) {
      replaceItem(existingItem.cartItemId, cartItem)
    } else {
      addItem(cartItem)
    }
    onClose()
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center">
        <div className="pointer-events-auto flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl md:max-h-[85vh] md:max-w-lg md:rounded-2xl">
          {" "}
          {/* ── Persistent frosted header ─────────────────────────────────── */}
          <header className="flex shrink-0 items-center px-4 py-4 shadow-sm backdrop-blur-xl">
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>
          {/* ── Scrollable body ──────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">
            {/* Hero image with overlay */}
            <div className="relative h-[280px] w-full shrink-0 overflow-hidden md:h-[320px]">
              {" "}
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.name} fill priority className="object-cover" />
              ) : (
                <div className="from-brand-green/30 to-brand-green-dark/50 flex h-full w-full items-center justify-center bg-gradient-to-br">
                  {" "}
                  <span className="text-6xl">🍽️</span>
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />{" "}
              {/* Close button removed from hero — now in floating header */}
              {/* Item name + description overlaid */}
              <div className="absolute right-0 bottom-0 left-0 px-6 pb-6">
                <h2 className="font-serif text-3xl leading-tight font-bold text-white">
                  {item.name}
                </h2>
                {item.description && (
                  <p className="mt-1 text-sm leading-relaxed text-white/80">{item.description}</p>
                )}
              </div>
            </div>

            {/* Modifier groups */}
            {groups.map((group, gi) => {
              const gKey = groupKey(group, gi)
              const selected = selections[gKey] ?? new Set()
              const metMin = selected.size >= group.min
              const mode = inputMode(group)
              const isOptional = !group.required
              const isExpanded = !isOptional || expandedOptional.has(gKey)

              // Summary of selected options for collapsed optional groups
              const selectedNames = isOptional
                ? Array.from(selected)
                    .map(optKey => {
                      const opt = group.options.find(
                        (o, oi) => safeKey(o, `${gKey}-o${oi}`) === optKey
                      )
                      return opt?.name ?? ""
                    })
                    .filter(Boolean)
                : []

              return (
                <div key={gKey} className="border-b border-gray-100">
                  {/* Group header */}
                  <div
                    className={`flex items-start justify-between px-6 py-5 ${isOptional ? "cursor-pointer transition-colors hover:bg-gray-50" : ""}`}
                    onClick={isOptional ? () => toggleOptional(gKey) : undefined}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-brand-green font-serif text-xl font-semibold">
                        {group.name}
                      </p>
                      {/* Required hint */}
                      {group.required && group.min > 1 && (
                        <p className="mt-0.5 text-sm font-medium text-gray-500">
                          Select {group.min}
                        </p>
                      )}
                      {/* Optional summary */}
                      {isOptional && selectedNames.length > 0 && (
                        <p className="text-brand-green mt-1 text-sm font-medium">
                          {selectedNames.join(", ")}
                        </p>
                      )}
                      {isOptional && selectedNames.length === 0 && (
                        <p className="mt-0.5 text-sm font-medium text-gray-400">Optional</p>
                      )}
                    </div>

                    {/* Required badge */}
                    {group.required && (
                      <span
                        className={`ml-4 shrink-0 self-start rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase ${
                          metMin ? "bg-brand-green text-white" : "bg-brand-green text-white"
                        }`}
                      >
                        {metMin ? "✓ Done" : "Required"}
                      </span>
                    )}
                  </div>

                  {/* Options — only shown when expanded */}
                  {isExpanded && (
                    <div className="mx-6 mb-5 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                      {group.options.map((opt, oi) => {
                        const optKey = safeKey(opt, `${gKey}-o${oi}`)
                        const isSelected = selected.has(optKey)
                        const atMax = selected.size >= group.max && !isSelected
                        const hasSub = (opt.subModifierGroups?.length ?? 0) > 0

                        return (
                          <div key={optKey}>
                            {/* ── Radio (required max 1, or optional max 1) ── */}
                            {mode === "radio" && (
                              <button
                                type="button"
                                onClick={() => selectRadio(gKey, optKey)}
                                className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-gray-50"
                              >
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                    isSelected ? "border-brand-green" : "border-gray-300"
                                  }`}
                                >
                                  {isSelected && (
                                    <span className="bg-brand-green block h-3 w-3 rounded-full" />
                                  )}
                                </span>
                                <span className="flex-1 text-base font-medium text-gray-800">
                                  {opt.name}
                                </span>
                                {opt.priceAdjustment > 0 && (
                                  <span className="text-brand-green shrink-0 text-base font-bold">
                                    +${opt.priceAdjustment.toFixed(2)}
                                  </span>
                                )}
                              </button>
                            )}

                            {/* ── Stepper (required max > 1) ── */}
                            {mode === "stepper" && (
                              <div className="flex items-center gap-4 px-6 py-4">
                                <span className="flex-1 text-base font-medium text-gray-800">
                                  {opt.name}
                                </span>
                                {opt.priceAdjustment > 0 && (
                                  <span className="text-brand-green shrink-0 text-base font-bold">
                                    +${opt.priceAdjustment.toFixed(2)}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => toggleStepper(gKey, optKey, group.max)}
                                  disabled={atMax}
                                  aria-label={isSelected ? `Remove ${opt.name}` : `Add ${opt.name}`}
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                    isSelected
                                      ? "border-brand-green bg-brand-green text-white"
                                      : atMax
                                        ? "cursor-not-allowed border-gray-200 text-gray-300"
                                        : "hover:border-brand-green hover:text-brand-green border-gray-400 text-gray-600"
                                  }`}
                                >
                                  <span className="text-lg leading-none font-light">
                                    {isSelected ? "−" : "+"}
                                  </span>
                                </button>
                              </div>
                            )}

                            {/* ── Checkbox (optional max > 1) ── */}
                            {mode === "checkbox" && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!atMax || isSelected) toggleCheckbox(gKey, optKey, group.max)
                                }}
                                disabled={atMax && !isSelected}
                                className={`flex w-full items-center gap-4 px-6 py-4 text-left transition-colors ${
                                  atMax && !isSelected
                                    ? "cursor-not-allowed opacity-40"
                                    : "hover:bg-gray-50"
                                }`}
                              >
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                                    isSelected
                                      ? "border-brand-green bg-brand-green"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {isSelected && (
                                    <span className="text-xs leading-none font-bold text-white">
                                      ✓
                                    </span>
                                  )}
                                </span>
                                <span className="flex-1 text-base font-medium text-gray-800">
                                  {opt.name}
                                </span>
                                {opt.priceAdjustment > 0 && (
                                  <span className="text-brand-green shrink-0 text-base font-bold">
                                    +${opt.priceAdjustment.toFixed(2)}
                                  </span>
                                )}
                              </button>
                            )}

                            {/* Sub-modifiers */}
                            {hasSub && isSelected && (
                              <SubGroups
                                groups={opt.subModifierGroups!}
                                parentGroupId={gKey}
                                optionId={optKey}
                                subSel={subSel}
                                onSubToggle={subToggle}
                                onSubRadio={subRadio}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Required group unmet error */}
                  {group.required && !metMin && selected.size > 0 && (
                    <p className="flex items-center gap-1 px-6 pb-4 text-sm font-medium text-red-500">
                      <span className="text-base">●</span> Please complete this selection
                    </p>
                  )}
                </div>
              )
            })}

            {/* Special Instructions */}
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="mb-4">
                <label
                  htmlFor="special-instructions"
                  className="text-brand-green block font-serif text-xl font-semibold"
                >
                  Special Instructions
                </label>
                <p className="mt-0.5 text-sm font-medium text-gray-400">Optional</p>
              </div>
              <textarea
                id="special-instructions"
                placeholder="e.g. extra spicy, no onions…"
                value={specialInstructions}
                onChange={e => setSpecialInstructions(e.target.value)}
                rows={3}
                className="focus:ring-brand-green w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base focus:ring-2 focus:outline-none"
              />
            </div>
          </div>
          {/* ── Sticky CTA ─────────────────────────────────────────────────── */}
          <div className="shrink-0 border-t border-gray-100 px-5 py-4">
            <button
              onClick={handleAdd}
              disabled={!isValid}
              className={`w-full rounded-2xl py-5 font-bold transition-all active:scale-[.98] ${
                isValid
                  ? "bg-brand-green hover:bg-brand-green-dark text-white"
                  : "cursor-not-allowed bg-gray-100"
              }`}
            >
              {isValid ? (
                <span className="text-base font-black tracking-widest uppercase">
                  Add to Order — ${effectivePrice.toFixed(2)}
                </span>
              ) : (
                <span className="flex flex-col items-center gap-0.5">
                  <span className="text-brand-green text-sm font-bold tracking-widest uppercase">
                    Make {remaining} more required selection{remaining !== 1 ? "s" : ""}
                  </span>
                  <span className="text-base text-gray-500">
                    to Add to Order — ${effectivePrice.toFixed(2)}
                  </span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
