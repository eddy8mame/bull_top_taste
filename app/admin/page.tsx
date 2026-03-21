"use client"

import { useEffect, useState, useRef } from "react"
import useSWR                           from "swr"
import type { AdminOrder, AdminOrderItem, OrderStatus } from "@/types"
import { FALLBACK_MENU }                from "@/lib/sanity"

// ── Configurable age thresholds ────────────────────────────────────────────────
// Adjust here — no other changes needed. Units: minutes.
const WARNING_THRESHOLD_MINUTES  = 7
const CRITICAL_THRESHOLD_MINUTES = 15

type Mode = "kitchen" | "floor"

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ── Display helpers ────────────────────────────────────────────────────────────

// Derive a short, speakable order reference from the Stripe payment intent ID.
// Uses the last 6 characters of the pi_… string, uppercased: e.g. "#AB3F2C".
// Falls back to "——" for cash / test orders that have no payment intent.
function fmtOrderNum(stripePaymentIntentId?: string): string {
  return stripePaymentIntentId
    ? `#${stripePaymentIntentId.slice(-6).toUpperCase()}`
    : "——"
}

// Strip "+$X.XX" price annotations from a pre-formatted selections string.
// Used on kitchen cards where pricing is irrelevant to the cook.
function stripPricing(s: string): string {
  return s.replace(/\s+\+\$[\d.]+/g, "")
}

// Parse a selections string into individual options with their stored prices.
// Format written at checkout: "Name +$X.XX" (priced) or "Name" (included/spec).
// Splitting on ", " is safe here — individual modifier option names in this
// schema do not contain ", " sequences.
interface ParsedSel { name: string; price: number }
function parseSelections(selections: string): ParsedSel[] {
  return selections
    .split(", ")
    .map(part => {
      const m = part.trim().match(/^(.+?)\s+\+\$([\d.]+)$/)
      return m
        ? { name: m[1].trim(), price: parseFloat(m[2]) }
        : { name: part.trim(), price: 0 }
    })
    .filter(s => s.name.length > 0)
}

// Map Sanity modifier group names to short operational labels for kitchen cards.
// Kitchen staff need to know what to make, not what the CMS group is named.
function kitchenLabel(groupName: string): string {
  const lc = groupName.toLowerCase()
  if (/\bsize\b|\bportion\b/.test(lc))                               return "Size"
  if (/\bprotein\b/.test(lc))                                        return "Protein"
  if (/\bsauce\b/.test(lc))                                          return "Sauce"
  if (/\bside|\bsides\b/.test(lc) && !/recommend/i.test(groupName)) return "Sides"
  return "Add-on"  // "Recommend Sides and Apps" and all other upcharge groups
}


// Orphaned size suppression — content-based check.
// A modifier is an orphan when ALL THREE conditions hold:
//   1. groupName contains "Size Choice"   → it is a size selector
//   2. parentKey is absent                → it is not linked to a parent add-on
//   3. selections has no "+$"             → it carries no upcharge of its own
//      (presence of "+$" means it is a legitimate base-item size upgrade)
// Must be evaluated against the RAW selections string before stripPricing().
function isOrphanedSize(mod: {
  groupName: string
  selections: string
  parentKey?: string | null
}): boolean {
  return (
    mod.groupName.includes("Size Choice") &&
    !mod.parentKey &&
    !mod.selections.includes("+$")
  )
}

// Identifies modifier groups that should render as itemised priced add-on rows
// in the floor modal receipt. All other groups — including "Size Choice" with a
// price adjustment — render as spec descriptor text with pricing stripped.
function isAddonGroup(groupName: string): boolean {
  return (
    groupName === "Recommend Sides and Apps" ||
    groupName === "Extra Sides and Apps"
  )
}

// ── Time helpers ───────────────────────────────────────────────────────────────
// Contextual age reference:
//   pending  → createdAt   (how long since the customer placed it)
//   kitchen  → startedAt   (how long the cook has been working on it)
//   floor    → readyAt     (how long it has been sitting at the pass)
function getAgeSeconds(order: AdminOrder, now: number): number {
  const ref =
    order.status === "kitchen" ? (order.startedAt ?? order.createdAt) :
    order.status === "floor"   ? (order.readyAt   ?? order.createdAt) :
    order.createdAt
  return Math.max(0, Math.floor((now - new Date(ref).getTime()) / 1000))
}

function fmtAge(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function ageCls(seconds: number): "ok" | "warn" | "crit" {
  const m = seconds / 60
  if (m >= CRITICAL_THRESHOLD_MINUTES) return "crit"
  if (m >= WARNING_THRESHOLD_MINUTES)  return "warn"
  return "ok"
}

// ── Audio alert ────────────────────────────────────────────────────────────────
function playNewOrderChime() {
  try {
    const ctx   = new AudioContext()
    const freqs = [523, 659, 784]
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type            = "sine"
      gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4)
      osc.start(ctx.currentTime + i * 0.12)
      osc.stop(ctx.currentTime  + i * 0.12 + 0.5)
    })
  } catch { /* requires prior user gesture */ }
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [mode,        setMode]        = useState<Mode>("kitchen")
  const [kitchenOpen, setKitchenOpen] = useState(true)
  const [kitchenBusy, setKitchenBusy] = useState(false)
  const [stockOpen,   setStockOpen]   = useState(true)
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [now,         setNow]         = useState(() => Date.now())
  const prevPendingRef                = useRef(0)

  // 1-second tick — drives the live clock and all contextual age badges
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const clock = new Date(now).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })

  // ── Orders: SWR with 15-second polling ────────────────────────────────────
  const {
    data:   rawOrders,
    isLoading,
    mutate: mutateOrders,
  } = useSWR<AdminOrder[]>("/api/orders", fetcher, {
    refreshInterval: 15_000,
    onSuccess(data) {
      const pendingCount = data.filter(o => o.status === "pending").length
      if (pendingCount > prevPendingRef.current) playNewOrderChime()
      prevPendingRef.current = pendingCount
    },
  })
  const orders  = rawOrders ?? []
  const loading = isLoading

  // ── 86'd items: no auto-refresh — updates are staff-driven ───────────────
  const { data: unavailData, mutate: mutateUnavail } =
    useSWR<{ unavailable: string[] }>("/api/menu/86", fetcher)
  const unavail = unavailData?.unavailable ?? []

  // ── Kitchen open state: fetch once on mount ──────────────────────────────
  useEffect(() => {
    fetch("/api/kitchen")
      .then(r => r.json())
      .then((d: { open: boolean }) => setKitchenOpen(d.open))
      .catch(() => {})
  }, [])

  // ── Actions (all optimistic) ──────────────────────────────────────────────

  async function markStatus(id: string, status: OrderStatus) {
    const snapshot = orders
    mutateOrders(
      orders.map(o => o._id === id ? { ...o, status } : o),
      false
    )
    const endpoint = status === "floor"
      ? `/api/orders/${id}/ready`
      : `/api/orders/${id}/status`
    try {
      await fetch(endpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    status !== "floor" ? JSON.stringify({ status }) : undefined,
      })
      mutateOrders()   // revalidate to capture server timestamps (startedAt, readyAt)
    } catch {
      mutateOrders(snapshot, false)
    }
  }

  async function markPickedUp(id: string) {
    const snapshot = orders
    mutateOrders(orders.filter(o => o._id !== id), false)
    setSelectedId(null)
    try {
      await fetch(`/api/orders/${id}/pickedup`, { method: "POST" })
      mutateOrders()
    } catch {
      mutateOrders(snapshot, false)
    }
  }

  async function toggleKitchen() {
    if (kitchenBusy) return
    setKitchenBusy(true)
    try {
      const res  = await fetch("/api/kitchen", { method: "POST" })
      const data: { open: boolean } = await res.json()
      setKitchenOpen(data.open)
    } finally {
      setKitchenBusy(false)
    }
  }

  async function toggle86(itemId: string) {
    const prev     = unavail
    const isNow86d = !unavail.includes(itemId)
    mutateUnavail(
      { unavailable: isNow86d ? [...unavail, itemId] : unavail.filter(id => id !== itemId) },
      false
    )
    try {
      await fetch("/api/menu/86", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ itemId }),
      })
      mutateUnavail()
    } catch {
      mutateUnavail({ unavailable: prev }, false)
    }
  }

  const selectedOrder = selectedId ? (orders.find(o => o._id === selectedId) ?? null) : null
  const readyOrders   = orders.filter(o => o.status === "floor")

  return (
    <div className={`admin-page ${mode}`}>

      {/* ── Topbar ──────────────────────────────────────────────────────────── */}
      <div className="topbar">

        {/* Left: Kitchen / Floor pill tabs */}
        <div className="top-left">
          <button
            className={`nav-tab${mode === "kitchen" ? " active" : ""}`}
            onClick={() => setMode("kitchen")}
          >
            Kitchen
          </button>
          <button
            className={`nav-tab${mode === "floor" ? " active" : ""}`}
            onClick={() => setMode("floor")}
          >
            Floor
          </button>
        </div>

        {/* Centre: ordering open/closed status */}
        <div className="ordering-status" onClick={toggleKitchen} style={{ cursor: "pointer" }}>
          <div className={`status-dot ${kitchenOpen ? "open" : "closed"}`} />
          <span className="status-text">
            {kitchenOpen ? "Ordering open" : "Ordering closed"}
          </span>
        </div>

        {/* Right: live clock + Office cross-link */}
        <div className="top-right">
          <span className="clock">{clock}</span>
          <a href="/admin/office" className="cross-link">← Office</a>
        </div>
      </div>

      {/* ── Kitchen closed banner ─────────────────────────────────────────── */}
      {!kitchenOpen && (
        <div className="closed-banner">
          <div>
            <div className="closed-banner-text">Kitchen closed</div>
            <div className="closed-banner-sub">Online ordering is paused. New checkout attempts will be blocked.</div>
          </div>
          <button
            className="reopen-btn"
            onClick={toggleKitchen}
            disabled={kitchenBusy}
          >
            Reopen kitchen
          </button>
        </div>
      )}

      {/* ── Kitchen view ─────────────────────────────────────────────────── */}
      {mode === "kitchen" && (
        <div className="view-kitchen">

          <div className="k-pipeline">

            {/* Incoming — pending orders awaiting a cook to accept */}
            <KitchenCol
              title="Incoming"
              emptyLabel="Queue clear"
              orders={orders.filter(o => o.status === "pending")}
              loading={loading}
              now={now}
              onMarkStatus={markStatus}
            />

            {/* Preparing — orders a cook has started */}
            <KitchenCol
              title="Preparing"
              emptyLabel="Nothing in prep"
              orders={orders.filter(o => o.status === "kitchen")}
              loading={loading}
              now={now}
              onMarkStatus={markStatus}
            />
          </div>

          {/* Stock — collapsible 86 panel */}
          <div className="k-stock">
            <div className="k-stock-header" onClick={() => setStockOpen(v => !v)}>
              <span className="k-stock-title">Stock — tap to 86</span>
              <span className="k-stock-hint">{stockOpen ? "hide" : "show"}</span>
            </div>
            {stockOpen && (
              <div className="k-stock-body">
                {FALLBACK_MENU.map(item => {
                  const is86 = unavail.includes(item._id)
                  return (
                    <div
                      key={item._id}
                      className={`k-stock-item${is86 ? " out" : ""}`}
                      onClick={() => toggle86(item._id)}
                    >
                      <span className="k-stock-name">{item.name}</span>
                      <span className="k-stock-tag">{is86 ? "86'd" : "in"}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Floor view ───────────────────────────────────────────────────── */}
      {mode === "floor" && (
        <div className="view-floor">
          <div className="floor-bar">
            <span className="floor-bar-label">Ready</span>
            <span className="floor-bar-val">{readyOrders.length}</span>
          </div>

          {loading ? (
            <div className="f-empty">Loading…</div>
          ) : readyOrders.length === 0 ? (
            <div className="f-empty">All clear — nothing waiting</div>
          ) : (
            <div className="f-cards">
              {readyOrders.map(order => (
                <FloorCard
                  key={order._id}
                  order={order}
                  now={now}
                  onClick={() => setSelectedId(order._id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Floor receipt modal ───────────────────────────────────────────── */}
      {selectedOrder && (
        <FloorModal
          order={selectedOrder}
          now={now}
          onConfirm={() => markPickedUp(selectedOrder._id)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

// ── Kitchen Column ─────────────────────────────────────────────────────────────

function KitchenCol({
  title, emptyLabel, orders, loading, now, onMarkStatus,
}: {
  title:        string
  emptyLabel:   string
  orders:       AdminOrder[]
  loading:      boolean
  now:          number
  onMarkStatus: (id: string, status: OrderStatus) => void
}) {
  return (
    <div className="k-col">
      <div className="k-col-header">
        <span className="k-col-title">{title}</span>
        <span className={`k-col-count${orders.length > 0 ? " has" : ""}`}>
          {orders.length}
        </span>
      </div>
      <div className="k-col-body">
        {loading ? (
          <p className="k-empty">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="k-empty">{emptyLabel}</p>
        ) : (
          orders.map(order => (
            <KitchenCard key={order._id} order={order} now={now} onMarkStatus={onMarkStatus} />
          ))
        )}
      </div>
    </div>
  )
}

// ── Kitchen Card ───────────────────────────────────────────────────────────────
// Phone is intentionally omitted — kitchen staff have no use for it.
// Modifier pricing is stripped — the cook needs to know what to make, not cost.
// Group names are normalised to short operational labels via kitchenLabel().

function KitchenCard({
  order,
  now,
  onMarkStatus,
}: {
  order: AdminOrder
  now: number
  onMarkStatus: (id: string, status: OrderStatus) => void
}) {
  const ageS = getAgeSeconds(order, now)
  const cls = ageCls(ageS)

  return (
    <div className={`k-card${cls !== "ok" ? ` ${cls}` : ""}`}>
      <div className="k-card-top">
        <div>
          <div className="k-order-num">{fmtOrderNum(order.stripePaymentIntentId)}</div>
          <div className="k-customer">{order.customerName}</div>
        </div>
        <div className={`k-age${cls !== "ok" ? ` ${cls}` : ""}`}>{fmtAge(ageS)}</div>
      </div>

      <div className="k-items">
        {order.items.map((item: AdminOrderItem) => (
          <div key={item._key} className="k-ticket-item">
            <div className="k-item-header">
              <span className="k-qty">{item.quantity}×</span>
              <span className="k-iname">{item.itemName}</span>
            </div>

            {/* Modifier groups — Two-Pass Algorithm (Kitchen Version) */}
            {(() => {
              const allMods = item.modifiers ?? []
              if (allMods.length === 0) return null

              // ── Pass 1: Collect sub-modifiers keyed by parentKey ──
              // We strip the pricing immediately so the cooks only see the text.
              const subSelsByParent = new Map<string, string[]>()
              for (const mod of allMods) {
                if (!mod.parentKey) continue
                const cleanSub = stripPricing(mod.selections)
                if (!cleanSub) continue

                const existing = subSelsByParent.get(mod.parentKey) ?? []
                existing.push(cleanSub)
                subSelsByParent.set(mod.parentKey, existing)
              }

              // ── Pass 2: Process root modifiers and merge children ──
              const rootMods = allMods.filter(m => !m.parentKey && !isOrphanedSize(m))
              if (rootMods.length === 0) return null

              const labelMap = new Map<string, string[]>()

              for (const mod of rootMods) {
                const label = kitchenLabel(mod.groupName)
                let cleanRoot = stripPricing(mod.selections)

                // If this root item has sub-modifiers, append them in parentheses
                const subs = subSelsByParent.get(mod._key)
                if (subs && subs.length > 0) {
                  // e.g., "Plantain-Sweet (16 Oz)"
                  cleanRoot = `${cleanRoot} (${subs.join(", ")})`
                }

                const values = labelMap.get(label) ?? []
                if (cleanRoot) values.push(cleanRoot)
                labelMap.set(label, values)
              }

              return (
                <div className="k-specs">
                  {Array.from(labelMap.entries()).map(([label, values]) => (
                    <span key={label} className="k-spec">
                      <span className="k-spec-label">{label}:</span>
                      {values.join(", ")}
                    </span>
                  ))}
                </div>
              )
            })()}

            {/* Special instructions */}
            {item.specialInstructions && (
              <div className="k-specs">
                <span className="k-spec">
                  <span className="k-spec-label">Note:</span>
                  {item.specialInstructions}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Order-level notes */}
      {order.notes && (
        <div className="k-note">
          <div className="k-note-text">{order.notes}</div>
        </div>
      )}

      <div className="k-action">
        {order.status === "pending" && (
          <button className="k-btn start" onClick={() => onMarkStatus(order._id, "kitchen")}>
            Start
          </button>
        )}
        {order.status === "kitchen" && (
          <button className="k-btn ready" onClick={() => onMarkStatus(order._id, "floor")}>
            Ready ✓
          </button>
        )}
      </div>
    </div>
  )
}

// ── Floor Card ─────────────────────────────────────────────────────────────────

function FloorCard({ order, now, onClick }: {
  order:   AdminOrder
  now:     number
  onClick: () => void
}) {
  const ageS      = getAgeSeconds(order, now)
  const cls       = ageCls(ageS)
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0)

  return (
    <div
      className={`f-card${cls !== "ok" ? ` ${cls}` : ""}`}
      onClick={onClick}
    >
      <div className="f-card-header">
        <div>
          <div className="f-order-num">{fmtOrderNum(order.stripePaymentIntentId)}</div>
          <div className="f-customer">{order.customerName}</div>
        </div>
        <div className={`f-age${cls !== "ok" ? ` ${cls}` : ""}`}>
          {fmtAge(ageS)}
        </div>
      </div>

      <div className="f-card-body">
        <div className="f-item-count">
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="f-card-footer">
        <button className="f-btn-view">View &amp; confirm</button>
      </div>
    </div>
  )
}

// ── Floor Receipt Modal ────────────────────────────────────────────────────────
// Backdrop click closes without confirming.
//
// Receipt hierarchy per line item:
//   ItemName                      $basePrice × qty
//   Spec · Spec · Spec             ← included/zero-price options, single line
//     Plantain-Sweet · 16 Oz       +$11.90   ← add-on + sub-modifier collapsed
//     Jerk Sauce                   +$0.75
//
// Sub-modifier grouping: records that carry parentKey are sub-modifiers. Their
// priced selections are merged into the parent add-on row (name appended with
// " · SubName", price summed). Records without parentKey are root modifiers.
//
// Backwards compatible: old orders with no parentKey on any record fall through
// the same root-mod path and render identically to before.

function FloorModal({ order, now, onConfirm, onClose }: {
  order:     AdminOrder
  now:       number
  onConfirm: () => void
  onClose:   () => void
}) {
  const ageS = getAgeSeconds(order, now)
  const cls  = ageCls(ageS)

  return (
    <div
      className="modal-wrap open"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal">

        <div className="modal-head">
          <div>
            <div className="m-num">{fmtOrderNum(order.stripePaymentIntentId)}</div>
            <div className="m-name">{order.customerName}</div>
            {order.customerPhone && (
              <div className="m-phone">{order.customerPhone}</div>
            )}
          </div>
          <div className={`m-age ${cls}`}>{fmtAge(ageS)}</div>
        </div>

        <div className="modal-body">
          <span className="receipt-label">Order</span>

          {order.items.map((item: AdminOrderItem) => {
            const allMods = item.modifiers ?? []

            // Collect sub-modifier priced selections keyed by parent record _key.
            // Sub-modifier records carry parentKey; root records do not.
            const subSelsByParent = new Map<string, ParsedSel[]>()
            for (const mod of allMods) {
              if (!mod.parentKey) continue
              const sels = parseSelections(mod.selections).filter(s => s.price > 0)
              if (sels.length === 0) continue
              subSelsByParent.set(mod.parentKey, [
                ...(subSelsByParent.get(mod.parentKey) ?? []),
                ...sels,
              ])
            }

            // ── The New Root Modifiers Loop ──
            const rootMods = allMods.filter(m => !m.parentKey && !isOrphanedSize(m))
            const specs:  string[]                          = []
            const addons: { name: string; price: number }[] = []
            
            // We will dynamically tally the base price to include base size upgrades
            let displayBasePrice = item.basePrice ?? 0;

            for (const mod of rootMods) {
              const subSels  = subSelsByParent.get(mod._key) ?? []
              const subPrice = subSels.reduce((sum, s) => sum + s.price, 0)
              const subLabel = subSels.map(s => s.name).join(" · ")

              for (const sel of parseSelections(mod.selections)) {
                
                // Rule 1: Base Size Upgrades (e.g., Large +$3.50)
                // Add the cost to the top-line item price, but push the name to the spec line.
                if (mod.groupName === "Size Choice") {
                  displayBasePrice += sel.price;
                  specs.push(sel.name);
                } 
                // Rule 2: Any other priced item (Sauces, Extra Sides, Add-ons)
                // If it costs money, it gets its own row.
                else if (sel.price > 0 || subPrice > 0) {
                  addons.push({
                    name:  subLabel ? `${sel.name} · ${subLabel}` : sel.name,
                    price: sel.price + subPrice,
                  });
                } 
                // Rule 3: Free inclusions (Standard proteins, included sides)
                else {
                  specs.push(sel.name);
                }
              }
            }

            const specLine = specs.join(" · ")

            return (
              <div key={item._key} className="r-item">

                {/* Item name row — (dynamic base price + size upgrades) × qty */}
                <div className="r-item-row">
                  <span className="r-item-name">
                    {item.quantity > 1 ? `${item.quantity}× ` : ""}{item.itemName}
                  </span>
                  <span className="r-item-price">
                    ${(displayBasePrice * item.quantity).toFixed(2)}
                  </span>
                </div>

                {/* Spec descriptor — size, protein, included sides etc. (no price) */}
                {specLine && (
                  <div className="r-specs">{specLine}</div>
                )}

                {/* Priced add-ons — one row each, price × qty */}
                {addons.map((addon, i) => (
                  <div key={i} className="r-addon">
                    <span className="r-addon-name">{addon.name}</span>
                    <span className="r-addon-price">
                      +${(addon.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}

                {/* Special instructions */}
                {item.specialInstructions && (
                  <div className="r-specs" style={{ fontStyle: "italic" }}>
                    Note: {item.specialInstructions}
                  </div>
                )}
              </div>
            )
          })}

          <div className="r-total">
            <span className="r-total-label">Total</span>
            <span className="r-total-value">${order.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="modal-foot">
          <button className="m-btn-cancel"  onClick={onClose}>Cancel</button>
          <button className="m-btn-confirm" onClick={onConfirm}>Confirm pickup</button>
        </div>
      </div>
    </div>
  )
}
