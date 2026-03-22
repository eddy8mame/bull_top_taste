"use client"

import { useMemo, useState } from "react"

import Image from "next/image"

import type { CartItem, MenuItem, ModifierGroup, ModifierOption, SelectedModifier } from "@/types"

import { useCart } from "@/context/CartContext"

interface Props {
  item: MenuItem
  onClose: () => void
}

// ── Selection state types ─────────────────────────────────────────────────────
// Top-level: groupId → Set of selected optionIds
type Selections = Record<string, Set<string>>
// Sub-level:  parentGroupId → optionId → subGroupId → Set of subOptionIds
type SubSelections = Record<string, Record<string, Selections>>

// ── Input mode per group ──────────────────────────────────────────────────────
// radio    → required, max 1   (full row clickable, radio circle left)
// stepper  → required, max > 1 (⊕ / − button on right)
// checkbox → optional          (checkbox on left)
function inputMode(g: ModifierGroup): "radio" | "stepper" | "checkbox" {
  if (!g.required) return "checkbox"
  return g.max === 1 ? "radio" : "stepper"
}

// ── Safe key: use _id with fallback to name (guards against Sanity null _key) ─
// IMPORTANT: always pass a stable prefix — use index-based prefix for groups
// so the key is consistent between useState init and render.
function safeKey(obj: { _id?: string; name: string }, prefix: string) {
  return obj._id && obj._id !== "null" ? obj._id : `${prefix}-${obj.name}`
}

// Build a stable key for a group using its index as fallback
function groupKey(g: ModifierGroup, gi: number) {
  return safeKey(g, `g${gi}`)
}

// ── Placeholder image ─────────────────────────────────────────────────────────
function ItemPhotoPlaceholder({ name }: { name: string }) {
  return (
    <div className="from-brand-green/20 to-brand-green-dark/30 flex h-44 w-full shrink-0 flex-col items-center justify-center gap-1 bg-gradient-to-br">
      <span className="text-4xl">🍽️</span>
      <span className="text-brand-green text-xs font-semibold opacity-60">{name}</span>
    </div>
  )
}

// ── Inline sub-modifier groups ────────────────────────────────────────────────
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
    <div className="border-brand-green/30 mb-2 ml-8 space-y-2 border-l-2 pl-3">
      {groups.map((sg, sgi) => {
        const sgKey = safeKey(sg, `sg${sgi}`)
        const selMap = subSel[parentGroupId]?.[optionId]?.[sgKey] ?? new Set<string>()
        const mode = inputMode(sg)
        return (
          <div key={sgKey}>
            <p className="text-brand-green mb-1 text-xs font-bold">
              {sg.name}
              {sg.required && <span className="ml-1 font-normal text-amber-600">· required</span>}
            </p>
            <div className="space-y-0.5">
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
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-gray-50"
                  >
                    {mode === "radio" ? (
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? "border-brand-green" : "border-gray-300"}`}
                      >
                        {isSelected && (
                          <span className="bg-brand-green block h-2 w-2 rounded-full" />
                        )}
                      </span>
                    ) : (
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${isSelected ? "border-brand-green bg-brand-green" : "border-gray-300"}`}
                      >
                        {isSelected && <span className="text-[9px] font-bold text-white">✓</span>}
                      </span>
                    )}
                    <span className="flex-1 text-sm">{so.name}</span>
                    {so.priceAdjustment > 0 && (
                      <span className="text-brand-muted text-xs">
                        +${so.priceAdjustment.toFixed(2)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ModifierModal({ item, onClose }: Props) {
  const { addItem } = useCart()
  const groups = item.modifierGroups ?? []

  // Use index-based prefix so keys are consistent between init and render
  // even when Sanity returns null _key values for inline array objects.
  const [selections, setSelections] = useState<Selections>(() =>
    Object.fromEntries(groups.map((g, gi) => [groupKey(g, gi), new Set<string>()]))
  )
  const [subSel, setSubSel] = useState<SubSelections>({})

  const [showInstructions, setShowInstructions] = useState(false)
  const [specialInstructions, setSpecialInstructions] = useState("")

  // ── Validation ──────────────────────────────────────────────────────────────
  // Checks both top-level required groups AND required sub-modifier groups
  // for any currently-selected parent option.

  const unmetRequired = useMemo(() => {
    const unmet: ModifierGroup[] = []

    groups.forEach((g, gi) => {
      const gKey = groupKey(g, gi)
      const selCount = selections[gKey]?.size ?? 0

      // Top-level group not satisfied
      if (g.required && selCount < g.min) {
        unmet.push(g)
        return
      }

      // Check required sub-modifier groups for each selected option
      for (const optKey of selections[gKey] ?? new Set()) {
        const opt = g.options.find((o, oi) => safeKey(o, `${gKey}-o${oi}`) === optKey)
        if (!opt) continue
        ;(opt.subModifierGroups ?? []).forEach((sg, sgi) => {
          if (!sg.required) return
          const sgKey = safeKey(sg, `sg${sgi}`)
          const subCount = subSel[gKey]?.[optKey]?.[sgKey]?.size ?? 0
          if (subCount < sg.min) {
            unmet.push(sg)
          }
        })
      }
    })

    return unmet
  }, [groups, selections, subSel])

  const isValid = unmetRequired.length === 0

  // ── Price ───────────────────────────────────────────────────────────────────

  const effectivePrice = useMemo(() => {
    let total = item.price ?? 0
    groups.forEach((g, gi) => {
      const gKey = groupKey(g, gi)
      for (const optKey of selections[gKey] ?? new Set()) {
        const opt = g.options.find((o, oi) => safeKey(o, `${gKey}-o${oi}`) === optKey)
        if (!opt) continue
        total += opt.priceAdjustment
        // Add sub-modifier adjustments
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

  // ── Top-level selection handlers ─────────────────────────────────────────────

  function selectRadio(gKey: string, optKey: string) {
    setSelections(prev => ({ ...prev, [gKey]: new Set([optKey]) }))
  }

  function toggleStepper(gKey: string, optKey: string, max: number) {
    setSelections(prev => {
      const cur = new Set(prev[gKey])
      if (cur.has(optKey)) {
        cur.delete(optKey)
      } else if (cur.size < max) {
        cur.add(optKey)
      }
      return { ...prev, [gKey]: cur }
    })
  }

  function toggleCheckbox(gKey: string, optKey: string, max: number) {
    setSelections(prev => {
      const cur = new Set(prev[gKey])
      if (cur.has(optKey)) {
        cur.delete(optKey)
      } else if (cur.size < max) {
        cur.add(optKey)
      }
      return { ...prev, [gKey]: cur }
    })
  }

  // ── Sub-modifier handlers ────────────────────────────────────────────────────

  function subRadio(pgKey: string, optKey: string, sgKey: string, soKey: string) {
    setSubSel(prev => ({
      ...prev,
      [pgKey]: {
        ...(prev[pgKey] ?? {}),
        [optKey]: {
          ...(prev[pgKey]?.[optKey] ?? {}),
          [sgKey]: new Set([soKey]),
        },
      },
    }))
  }

  function subToggle(pgKey: string, optKey: string, sgKey: string, soKey: string, max: number) {
    setSubSel(prev => {
      const cur = new Set(prev[pgKey]?.[optKey]?.[sgKey] ?? [])
      if (cur.has(soKey)) {
        cur.delete(soKey)
      } else if (cur.size < max) {
        cur.add(soKey)
      }
      return {
        ...prev,
        [pgKey]: {
          ...(prev[pgKey] ?? {}),
          [optKey]: { ...(prev[pgKey]?.[optKey] ?? {}), [sgKey]: cur },
        },
      }
    })
  }

  // ── Add to cart ─────────────────────────────────────────────────────────────

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

      // Flatten sub-modifiers as their own SelectedModifier entries
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
      cartItemId: `${item._id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      quantity: 1,
      effectivePrice,
      selectedModifiers: selectedModifiers.length ? selectedModifiers : undefined,
      specialInstructions: specialInstructions.trim() || undefined,
    }

    addItem(cartItem)
    onClose()
  }

  // ── CTA label ───────────────────────────────────────────────────────────────

  const buttonLabel = useMemo(() => {
    if (!isValid) {
      const remaining = unmetRequired.reduce(
        (n, g) => n + (g.min - (selections[safeKey(g, "g")]?.size ?? 0)),
        0
      )
      return `Make ${remaining} required selection${remaining !== 1 ? "s" : ""} — $${effectivePrice.toFixed(2)}`
    }
    return `Add to Order — $${effectivePrice.toFixed(2)}`
  }, [isValid, unmetRequired, selections, effectivePrice])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center">
        <div className="pointer-events-auto flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl md:max-h-[85vh] md:max-w-lg md:rounded-2xl">
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex shrink-0 items-start justify-between px-5 pt-5 pb-4">
            <button
              onClick={onClose}
              aria-label="Close"
              className="mt-0.5 mr-4 shrink-0 text-2xl leading-none text-gray-400 hover:text-gray-700"
            >
              ×
            </button>
            <div className="flex-1">
              <h2 className="text-xl leading-snug font-bold">{item.name}</h2>
              {item.description && (
                <p className="text-brand-muted mt-1 text-sm leading-relaxed">{item.description}</p>
              )}
            </div>
          </div>

          <div className="h-px shrink-0 bg-gray-100" />

          {/* ── Scrollable body ─────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">
            {/* Item photo */}
            {item.imageUrl ? (
              <div className="relative h-44 w-full shrink-0">
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
              </div>
            ) : (
              <ItemPhotoPlaceholder name={item.name} />
            )}

            {/* Modifier groups */}
            {groups.map((group, gi) => {
              const gKey = groupKey(group, gi)
              const selected = selections[gKey] ?? new Set()
              const metMin = selected.size >= group.min
              const mode = inputMode(group)

              return (
                <div key={gKey}>
                  {/* Group header */}
                  <div className="px-5 pt-5 pb-2">
                    <p className="text-[15px] font-bold">{group.name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {group.required ? (
                        <span
                          className={`flex items-center gap-1 text-xs font-semibold ${metMin ? "text-brand-green" : "text-amber-600"}`}
                        >
                          {metMin ? (
                            <span className="bg-brand-green flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] leading-none text-white">
                              ✓
                            </span>
                          ) : (
                            <span className="shrink-0">⚠</span>
                          )}
                          Required
                        </span>
                      ) : (
                        <span className="text-brand-muted text-xs">(Optional)</span>
                      )}
                      {group.required && group.min > 1 && (
                        <span className="text-brand-muted text-xs">· Select {group.min}</span>
                      )}
                      {!group.required && group.max > 1 && (
                        <span className="text-brand-muted text-xs">· Choose up to {group.max}</span>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  <ul className="divide-y divide-gray-100">
                    {group.options.map((opt, oi) => {
                      const optKey = safeKey(opt, `${gKey}-o${oi}`)
                      const isSelected = selected.has(optKey)
                      const atMax = selected.size >= group.max && !isSelected
                      const hasSub = (opt.subModifierGroups?.length ?? 0) > 0

                      return (
                        <li key={optKey}>
                          {/* ── Radio ────────────────────────────────────── */}
                          {mode === "radio" && (
                            <button
                              type="button"
                              onClick={() => selectRadio(gKey, optKey)}
                              className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-gray-50"
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isSelected ? "border-brand-green" : "border-gray-300"}`}
                              >
                                {isSelected && (
                                  <span className="bg-brand-green block h-2.5 w-2.5 rounded-full" />
                                )}
                              </span>
                              <span className="flex-1 text-sm">{opt.name}</span>
                              {opt.priceAdjustment > 0 && (
                                <span className="text-brand-muted shrink-0 text-sm">
                                  +${opt.priceAdjustment.toFixed(2)}
                                </span>
                              )}
                              {hasSub && <span className="shrink-0 text-sm text-gray-300">›</span>}
                            </button>
                          )}

                          {/* ── Stepper ──────────────────────────────────── */}
                          {mode === "stepper" && (
                            <div className="flex items-center gap-3 px-5 py-3.5">
                              <span className="flex-1 text-sm">{opt.name}</span>
                              {opt.priceAdjustment > 0 && (
                                <span className="text-brand-muted shrink-0 text-sm">
                                  +${opt.priceAdjustment.toFixed(2)}
                                </span>
                              )}
                              {hasSub && isSelected && (
                                <span className="text-brand-green shrink-0 text-xs font-medium">
                                  Customize ›
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleStepper(gKey, optKey, group.max)}
                                disabled={atMax}
                                aria-label={isSelected ? `Remove ${opt.name}` : `Add ${opt.name}`}
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
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

                          {/* ── Checkbox ─────────────────────────────────── */}
                          {mode === "checkbox" && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!atMax || isSelected) toggleCheckbox(gKey, optKey, group.max)
                              }}
                              disabled={atMax && !isSelected}
                              className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors ${atMax && !isSelected ? "cursor-not-allowed opacity-40" : "hover:bg-gray-50"}`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${isSelected ? "border-brand-green bg-brand-green" : "border-gray-300"}`}
                              >
                                {isSelected && (
                                  <span className="text-xs leading-none font-bold text-white">
                                    ✓
                                  </span>
                                )}
                              </span>
                              <span className="flex-1 text-sm">{opt.name}</span>
                              {opt.priceAdjustment > 0 && (
                                <span className="text-brand-muted shrink-0 text-sm">
                                  +${opt.priceAdjustment.toFixed(2)}
                                </span>
                              )}
                              {hasSub && (
                                <span
                                  className={`shrink-0 text-sm ${isSelected ? "text-brand-green font-medium" : "text-gray-300"}`}
                                >
                                  ›
                                </span>
                              )}
                            </button>
                          )}

                          {/* ── Sub-modifier inline expansion ─────────────── */}
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
                        </li>
                      )
                    })}
                  </ul>

                  <div className="mt-2 h-px bg-gray-100" />
                </div>
              )
            })}

            {/* ── Special Instructions ────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between px-5 pt-5 pb-2">
                <p className="text-[15px] font-bold">Preferences</p>
                <span className="text-brand-muted text-xs">(Optional)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(v => !v)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-gray-50"
              >
                <span className="text-sm text-gray-700">Add Special Instructions</span>
                <span
                  className={`text-lg text-gray-400 transition-transform duration-150 ${showInstructions ? "rotate-90" : ""}`}
                >
                  ›
                </span>
              </button>
              {showInstructions && (
                <div className="px-5 pb-4">
                  <textarea
                    autoFocus
                    placeholder="e.g. extra spicy, no onions…"
                    value={specialInstructions}
                    onChange={e => setSpecialInstructions(e.target.value)}
                    rows={3}
                    className="focus:border-brand-green w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none"
                  />
                </div>
              )}
              <div className="h-px bg-gray-100" />
            </div>
          </div>

          {/* ── Sticky CTA ──────────────────────────────────────────────────── */}
          <div className="shrink-0 px-5 py-4">
            <button
              onClick={handleAdd}
              disabled={!isValid}
              className={`w-full rounded-2xl py-4 text-sm font-bold transition-all ${
                isValid
                  ? "bg-[#FF3008] text-white hover:brightness-90 active:scale-[.98]"
                  : "cursor-not-allowed bg-[#FF3008]/60 text-white"
              }`}
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
