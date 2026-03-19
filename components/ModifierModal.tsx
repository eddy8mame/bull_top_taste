"use client"

import Image            from "next/image"
import { useState, useMemo } from "react"
import { useCart }           from "@/context/CartContext"
import type { MenuItem, CartItem, SelectedModifier, ModifierGroup, ModifierOption } from "@/types"

interface Props {
  item:    MenuItem
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
    <div className="w-full h-44 bg-gradient-to-br from-brand-green/20 to-brand-green-dark/30 flex flex-col items-center justify-center gap-1 shrink-0">
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
  groups:          ModifierGroup[]
  parentGroupId:   string
  optionId:        string
  subSel:          SubSelections
  onSubToggle:     (pgId: string, optId: string, sgId: string, soId: string, max: number) => void
  onSubRadio:      (pgId: string, optId: string, sgId: string, soId: string) => void
}) {
  return (
    <div className="ml-8 mb-2 border-l-2 border-brand-green/30 pl-3 space-y-2">
      {groups.map((sg, sgi) => {
        const sgKey  = safeKey(sg, `sg${sgi}`)
        const selMap = subSel[parentGroupId]?.[optionId]?.[sgKey] ?? new Set<string>()
        const mode   = inputMode(sg)
        return (
          <div key={sgKey}>
            <p className="text-xs font-bold text-brand-green mb-1">
              {sg.name}
              {sg.required && <span className="ml-1 text-amber-600 font-normal">· required</span>}
            </p>
            <div className="space-y-0.5">
              {sg.options.map((so, soi) => {
                const soKey      = safeKey(so, `${sgKey}-o${soi}`)
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
                    className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg text-left hover:bg-gray-50 transition-colors"
                  >
                    {mode === "radio" ? (
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-brand-green" : "border-gray-300"}`}>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-brand-green block" />}
                      </span>
                    ) : (
                      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-brand-green bg-brand-green" : "border-gray-300"}`}>
                        {isSelected && <span className="text-white text-[9px] font-bold">✓</span>}
                      </span>
                    )}
                    <span className="flex-1 text-sm">{so.name}</span>
                    {so.priceAdjustment > 0 && (
                      <span className="text-xs text-brand-muted">+${so.priceAdjustment.toFixed(2)}</span>
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
  const groups      = item.modifierGroups ?? []

  // Use index-based prefix so keys are consistent between init and render
  // even when Sanity returns null _key values for inline array objects.
  const [selections, setSelections] = useState<Selections>(() =>
    Object.fromEntries(groups.map((g, gi) => [groupKey(g, gi), new Set<string>()]))
  )
  const [subSel, setSubSel] = useState<SubSelections>({})

  const [showInstructions, setShowInstructions]   = useState(false)
  const [specialInstructions, setSpecialInstructions] = useState("")

  // ── Validation ──────────────────────────────────────────────────────────────
  // Checks both top-level required groups AND required sub-modifier groups
  // for any currently-selected parent option.

  const unmetRequired = useMemo(() => {
    const unmet: ModifierGroup[] = []

    groups.forEach((g, gi) => {
      const gKey      = groupKey(g, gi)
      const selCount  = selections[gKey]?.size ?? 0

      // Top-level group not satisfied
      if (g.required && selCount < g.min) {
        unmet.push(g)
        return
      }

      // Check required sub-modifier groups for each selected option
      for (const optKey of (selections[gKey] ?? new Set())) {
        const opt = g.options.find((o, oi) => safeKey(o, `${gKey}-o${oi}`) === optKey)
        if (!opt) continue
        ;(opt.subModifierGroups ?? []).forEach((sg, sgi) => {
          if (!sg.required) return
          const sgKey    = safeKey(sg, `sg${sgi}`)
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
      for (const optKey of (selections[gKey] ?? new Set())) {
        const opt = g.options.find((o, oi) => safeKey(o, `${gKey}-o${oi}`) === optKey)
        if (!opt) continue
        total += opt.priceAdjustment
        // Add sub-modifier adjustments
        ;(opt.subModifierGroups ?? []).forEach((sg, sgi) => {
          const sgKey = safeKey(sg, `sg${sgi}`)
          for (const soKey of (subSel[gKey]?.[optKey]?.[sgKey] ?? new Set())) {
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
      if (cur.has(optKey)) { cur.delete(optKey) }
      else if (cur.size < max) { cur.add(optKey) }
      return { ...prev, [gKey]: cur }
    })
  }

  function toggleCheckbox(gKey: string, optKey: string, max: number) {
    setSelections(prev => {
      const cur = new Set(prev[gKey])
      if (cur.has(optKey)) { cur.delete(optKey) }
      else if (cur.size < max) { cur.add(optKey) }
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
      if (cur.has(soKey)) { cur.delete(soKey) }
      else if (cur.size < max) { cur.add(soKey) }
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
      const gKey    = groupKey(g, gi)
      const optKeys = Array.from(selections[gKey] ?? [])
      if (!optKeys.length) return

      selectedModifiers.push({
        groupId:   gKey,
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
          const sgKey  = safeKey(sg, `sg${sgi}`)
          const soKeys = Array.from(subSel[gKey]?.[optKey]?.[sgKey] ?? [])
          if (!soKeys.length) return
          selectedModifiers.push({
            groupId:   `${gKey}__${optKey}__${sgKey}`,
            groupName: sg.name,
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
      cartItemId:          `${item._id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      quantity:            1,
      effectivePrice,
      selectedModifiers:   selectedModifiers.length ? selectedModifiers : undefined,
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
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50 pointer-events-none">
        <div className="pointer-events-auto w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] md:max-h-[85vh] overflow-hidden">

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between px-5 pt-5 pb-4 shrink-0">
            <button onClick={onClose} aria-label="Close"
              className="text-gray-400 hover:text-gray-700 text-2xl leading-none mr-4 mt-0.5 shrink-0">×</button>
            <div className="flex-1">
              <h2 className="font-bold text-xl leading-snug">{item.name}</h2>
              {item.description && (
                <p className="text-brand-muted text-sm mt-1 leading-relaxed">{item.description}</p>
              )}
            </div>
          </div>

          <div className="h-px bg-gray-100 shrink-0" />

          {/* ── Scrollable body ─────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">

            {/* Item photo */}
            {item.imageUrl ? (
              <div className="relative w-full h-44 shrink-0">
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
              </div>
            ) : (
              <ItemPhotoPlaceholder name={item.name} />
            )}

            {/* Modifier groups */}
            {groups.map((group, gi) => {
              const gKey     = groupKey(group, gi)
              const selected = selections[gKey] ?? new Set()
              const metMin   = selected.size >= group.min
              const mode     = inputMode(group)

              return (
                <div key={gKey}>
                  {/* Group header */}
                  <div className="px-5 pt-5 pb-2">
                    <p className="font-bold text-[15px]">{group.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {group.required ? (
                        <span className={`flex items-center gap-1 text-xs font-semibold ${metMin ? "text-brand-green" : "text-amber-600"}`}>
                          {metMin ? (
                            <span className="flex w-3.5 h-3.5 rounded-full bg-brand-green text-white items-center justify-center text-[9px] leading-none shrink-0">✓</span>
                          ) : (
                            <span className="shrink-0">⚠</span>
                          )}
                          Required
                        </span>
                      ) : (
                        <span className="text-xs text-brand-muted">(Optional)</span>
                      )}
                      {group.required && group.min > 1 && (
                        <span className="text-xs text-brand-muted">· Select {group.min}</span>
                      )}
                      {!group.required && group.max > 1 && (
                        <span className="text-xs text-brand-muted">· Choose up to {group.max}</span>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  <ul className="divide-y divide-gray-100">
                    {group.options.map((opt, oi) => {
                      const optKey     = safeKey(opt, `${gKey}-o${oi}`)
                      const isSelected = selected.has(optKey)
                      const atMax      = selected.size >= group.max && !isSelected
                      const hasSub     = (opt.subModifierGroups?.length ?? 0) > 0

                      return (
                        <li key={optKey}>
                          {/* ── Radio ────────────────────────────────────── */}
                          {mode === "radio" && (
                            <button type="button"
                              onClick={() => selectRadio(gKey, optKey)}
                              className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors">
                              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "border-brand-green" : "border-gray-300"}`}>
                                {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-brand-green block" />}
                              </span>
                              <span className="flex-1 text-sm">{opt.name}</span>
                              {opt.priceAdjustment > 0 && (
                                <span className="text-sm text-brand-muted shrink-0">+${opt.priceAdjustment.toFixed(2)}</span>
                              )}
                              {hasSub && <span className="text-gray-300 text-sm shrink-0">›</span>}
                            </button>
                          )}

                          {/* ── Stepper ──────────────────────────────────── */}
                          {mode === "stepper" && (
                            <div className="flex items-center gap-3 px-5 py-3.5">
                              <span className="flex-1 text-sm">{opt.name}</span>
                              {opt.priceAdjustment > 0 && (
                                <span className="text-sm text-brand-muted shrink-0">+${opt.priceAdjustment.toFixed(2)}</span>
                              )}
                              {hasSub && isSelected && (
                                <span className="text-xs text-brand-green font-medium shrink-0">Customize ›</span>
                              )}
                              <button type="button"
                                onClick={() => toggleStepper(gKey, optKey, group.max)}
                                disabled={atMax}
                                aria-label={isSelected ? `Remove ${opt.name}` : `Add ${opt.name}`}
                                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? "border-brand-green bg-brand-green text-white"
                                    : atMax
                                      ? "border-gray-200 text-gray-300 cursor-not-allowed"
                                      : "border-gray-400 text-gray-600 hover:border-brand-green hover:text-brand-green"
                                }`}>
                                <span className="text-lg leading-none font-light">{isSelected ? "−" : "+"}</span>
                              </button>
                            </div>
                          )}

                          {/* ── Checkbox ─────────────────────────────────── */}
                          {mode === "checkbox" && (
                            <button type="button"
                              onClick={() => { if (!atMax || isSelected) toggleCheckbox(gKey, optKey, group.max) }}
                              disabled={atMax && !isSelected}
                              className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${atMax && !isSelected ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"}`}>
                              <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "border-brand-green bg-brand-green" : "border-gray-300"}`}>
                                {isSelected && <span className="text-white text-xs font-bold leading-none">✓</span>}
                              </span>
                              <span className="flex-1 text-sm">{opt.name}</span>
                              {opt.priceAdjustment > 0 && (
                                <span className="text-sm text-brand-muted shrink-0">+${opt.priceAdjustment.toFixed(2)}</span>
                              )}
                              {hasSub && (
                                <span className={`text-sm shrink-0 ${isSelected ? "text-brand-green font-medium" : "text-gray-300"}`}>›</span>
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

                  <div className="h-px bg-gray-100 mt-2" />
                </div>
              )
            })}

            {/* ── Special Instructions ────────────────────────────────────── */}
            <div>
              <div className="px-5 pt-5 pb-2 flex items-center justify-between">
                <p className="font-bold text-[15px]">Preferences</p>
                <span className="text-xs text-brand-muted">(Optional)</span>
              </div>
              <button type="button"
                onClick={() => setShowInstructions(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors">
                <span className="text-sm text-gray-700">Add Special Instructions</span>
                <span className={`text-gray-400 text-lg transition-transform duration-150 ${showInstructions ? "rotate-90" : ""}`}>›</span>
              </button>
              {showInstructions && (
                <div className="px-5 pb-4">
                  <textarea
                    autoFocus
                    placeholder="e.g. extra spicy, no onions…"
                    value={specialInstructions}
                    onChange={e => setSpecialInstructions(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-green resize-none"
                  />
                </div>
              )}
              <div className="h-px bg-gray-100" />
            </div>

          </div>

          {/* ── Sticky CTA ──────────────────────────────────────────────────── */}
          <div className="px-5 py-4 shrink-0">
            <button onClick={handleAdd} disabled={!isValid}
              className={`w-full font-bold py-4 rounded-2xl text-sm transition-all ${
                isValid
                  ? "bg-[#FF3008] text-white hover:brightness-90 active:scale-[.98]"
                  : "bg-[#FF3008]/60 text-white cursor-not-allowed"
              }`}>
              {buttonLabel}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
