"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import type { StoredOrder, OrderStatus } from "@/lib/orderStore"
import { FALLBACK_MENU }                 from "@/lib/sanity"

type Mode = "kitchen" | "floor"

// ─── Urgency helpers ──────────────────────────────────────────────────────────

function ageMinutes(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
}

function urgencyStyle(order: StoredOrder) {
  if (order.status !== "pending") return "border-white/10"
  const age = ageMinutes(order.createdAt)
  if (age < 5)  return "border-green-500"
  if (age < 10) return "border-yellow-400"
  if (age < 15) return "border-orange-500"
  return "border-red-500 animate-pulse"
}

function urgencyBadge(order: StoredOrder) {
  if (order.status !== "pending") return null
  const age = ageMinutes(order.createdAt)
  if (age < 5)  return { label: `${age}m`,  cls: "bg-green-500/20  text-green-300"  }
  if (age < 10) return { label: `${age}m`,  cls: "bg-yellow-500/20 text-yellow-300" }
  if (age < 15) return { label: `${age}m`,  cls: "bg-orange-500/20 text-orange-300" }
  return           { label: `${age}m ⚠`,   cls: "bg-red-500/20    text-red-300"    }
}

// ─── Audio alert ──────────────────────────────────────────────────────────────

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
  } catch { /* blocked without prior user gesture */ }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [mode,        setMode]        = useState<Mode>("kitchen")
  const [orders,      setOrders]      = useState<StoredOrder[]>([])
  const [unavail,     setUnavail]     = useState<string[]>([])
  const [loading,     setLoading]     = useState(true)
  const [kitchenOpen, setKitchenOpen] = useState(true)
  const prevPendingRef                = useRef(0)

  const fetchOrders = useCallback(async () => {
    const res  = await fetch("/api/orders")
    const data: StoredOrder[] = await res.json()
    const pendingCount = data.filter(o => o.status === "pending").length
    if (pendingCount > prevPendingRef.current) playNewOrderChime()
    prevPendingRef.current = pendingCount
    setOrders(data)
    setLoading(false)
  }, [])

  const fetchUnavail = useCallback(async () => {
    const res  = await fetch("/api/menu/86")
    const data = await res.json()
    setUnavail(data.unavailable ?? [])
  }, [])

  useEffect(() => {
    fetchOrders()
    fetchUnavail()
    // Fetch initial kitchen status
    fetch("/api/kitchen").then(r => r.json()).then((d: { open: boolean }) => setKitchenOpen(d.open)).catch(() => {})
    const interval = setInterval(fetchOrders, 15_000)
    return () => clearInterval(interval)
  }, [fetchOrders, fetchUnavail])

  async function markStatus(id: string, status: OrderStatus) {
    const endpoint = status === "ready"
      ? `/api/orders/${id}/ready`
      : `/api/orders/${id}/status`
    await fetch(endpoint, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    status !== "ready" ? JSON.stringify({ status }) : undefined,
    })
    fetchOrders()
  }

  async function markPickedUp(id: string) {
    await fetch(`/api/orders/${id}/pickedup`, { method: "POST" })
    fetchOrders()
  }

  async function toggleKitchen() {
    const res  = await fetch("/api/kitchen", { method: "POST" })
    const data: { open: boolean } = await res.json()
    setKitchenOpen(data.open)
  }

  async function toggle86(itemId: string) {
    await fetch("/api/menu/86", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ itemId }),
    })
    fetchUnavail()
  }

  return (
    <main className="p-4 md:p-6">
      {/* Mode toggle + kitchen open/close */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {(["kitchen", "floor"] as Mode[]).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors
              ${mode === m
                ? "bg-brand-gold text-brand-dark"
                : "bg-white/5 text-white/50 hover:text-white"}`}>
            {m === "kitchen" ? "🍳 Kitchen" : "🍽 Floor"}
          </button>
        ))}

        {/* Kitchen open/close toggle */}
        <button
          onClick={toggleKitchen}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
            kitchenOpen
              ? "border-brand-green/40 bg-brand-green/10 text-brand-green hover:bg-brand-green/20"
              : "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${kitchenOpen ? "bg-brand-green" : "bg-red-500"}`} />
          Kitchen {kitchenOpen ? "Open" : "Closed"}
        </button>

        <button onClick={fetchOrders}
          className="ml-auto text-white/30 hover:text-white text-sm transition-colors">
          ↻ Refresh
        </button>
      </div>

      {mode === "kitchen"
        ? <KitchenMode orders={orders} unavail={unavail} loading={loading}
            onMarkStatus={markStatus} onToggle86={toggle86} />
        : <FloorMode orders={orders} loading={loading} onMarkPickedUp={markPickedUp} />
      }
    </main>
  )
}

// ─── Kitchen Mode ─────────────────────────────────────────────────────────────
// Kitchen staff manage the full prep pipeline: pending → preparing → ready.
// They do not mark orders as picked up — that belongs to floor staff.

const KITCHEN_COLS: { status: OrderStatus; label: string }[] = [
  { status: "pending",   label: "Incoming"  },
  { status: "preparing", label: "Preparing" },
  { status: "ready",     label: "Ready"     },
]

function KitchenMode({ orders, unavail, loading, onMarkStatus, onToggle86 }: {
  orders:       StoredOrder[]
  unavail:      string[]
  loading:      boolean
  onMarkStatus: (id: string, status: OrderStatus) => void
  onToggle86:   (itemId: string) => void
}) {
  const active = orders.filter(o => o.status !== "completed")
  const byStatus = (s: OrderStatus) => active.filter(o => o.status === s)

  return (
    <>
      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Active",    value: active.length               },
          { label: "Pending",   value: byStatus("pending").length   },
          { label: "Preparing", value: byStatus("preparing").length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">{label}</p>
            <p className="font-serif text-3xl text-brand-gold">{value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-white/30">Loading…</div>
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-white/30 gap-2">
          <span className="text-5xl">🍳</span>
          <p>No active orders — standing by.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {KITCHEN_COLS.map(col => (
            <div key={col.status}>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-3 text-white/40">
                {col.label} ({byStatus(col.status).length})
              </h2>
              <div className="flex flex-col gap-3">
                {byStatus(col.status).map(order => (
                  <KitchenCard key={order.id} order={order} onMarkStatus={onMarkStatus} />
                ))}
                {byStatus(col.status).length === 0 && (
                  <p className="text-white/20 text-xs italic">Empty</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 86 Panel */}
      <div className="border-t border-white/10 pt-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">
          Menu Kill-Switch (86)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {FALLBACK_MENU.map(item => {
            const is86d = unavail.includes(item._id)
            return (
              <button key={item._id} onClick={() => onToggle86(item._id)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium border transition-all
                  ${is86d
                    ? "bg-red-500/10 border-red-500/40 text-red-300"
                    : "bg-white/5 border-white/10 text-white/70 hover:border-white/30"}`}>
                <span className="truncate">{item.name}</span>
                <span className={`ml-2 text-xs font-bold flex-shrink-0 ${is86d ? "text-red-400" : "text-white/20"}`}>
                  {is86d ? "86'd" : "ON"}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ─── Kitchen Card ─────────────────────────────────────────────────────────────

function KitchenCard({ order, onMarkStatus }: {
  order:        StoredOrder
  onMarkStatus: (id: string, status: OrderStatus) => void
}) {
  const badge = urgencyBadge(order)

  return (
    <div className={`bg-white/5 border-l-4 rounded-xl p-4 ${urgencyStyle(order)}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold text-sm">{order.customerName}</p>
          <p className="text-white/40 text-xs">{order.customerPhone}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            order.type === "delivery"
              ? "bg-blue-500/20 text-blue-300"
              : "bg-brand-gold/20 text-brand-gold"
          }`}>
            {order.type}
          </span>
          {badge && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
              {badge.label}
            </span>
          )}
        </div>
      </div>

      <ul className="mb-2 divide-y divide-white/5">
        {order.items.map(item => (
          <li key={item.cartItemId ?? item._id} className="py-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-white/80">
                <span className="font-bold text-white">{item.quantity}×</span> {item.name}
              </span>
              <span className="text-white/30 text-xs shrink-0 ml-2">
                ${(item.effectivePrice * item.quantity).toFixed(2)}
              </span>
            </div>
            {/* Modifier selections */}
            {item.selectedModifiers && item.selectedModifiers.length > 0 && (
              <ul className="mt-0.5 space-y-0.5 pl-4">
                {item.selectedModifiers.map(mod => (
                  <li key={mod.groupId} className="text-white/40 text-xs">
                    <span className="text-white/30">{mod.groupName}:</span>{" "}
                    {mod.selections.map(s =>
                      s.priceAdjustment > 0 ? `${s.name} (+$${s.priceAdjustment.toFixed(2)})` : s.name
                    ).join(", ")}
                  </li>
                ))}
              </ul>
            )}
            {item.specialInstructions && (
              <p className="mt-0.5 pl-4 text-amber-300/70 text-xs italic">"{item.specialInstructions}"</p>
            )}
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="text-yellow-300/80 text-xs bg-yellow-500/10 rounded px-2 py-1 mb-2">
          📝 {order.notes}
        </p>
      )}

      <div className="flex items-center justify-between mt-1">
        <span className="font-bold text-brand-gold text-sm">${order.total.toFixed(2)}</span>
        <div className="flex gap-2">
          {order.status === "pending" && (
            <button onClick={() => onMarkStatus(order.id, "preparing")}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors">
              Start
            </button>
          )}
          {order.status === "preparing" && (
            <button onClick={() => onMarkStatus(order.id, "ready")}
              className="text-xs bg-brand-green hover:bg-brand-green-dark text-white font-semibold px-3 py-1.5 rounded-lg transition-colors">
              Mark Ready ✓
            </button>
          )}
          {order.status === "ready" && (
            <span className="text-xs text-white/30 italic px-3 py-1.5">
              Awaiting pickup
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Floor Mode ───────────────────────────────────────────────────────────────
// Front-of-house staff see only orders that are ready for pickup.
// Their sole action is confirming the order has been picked up.

function FloorMode({ orders, loading, onMarkPickedUp }: {
  orders:         StoredOrder[]
  loading:        boolean
  onMarkPickedUp: (id: string) => void
}) {
  const ready = orders.filter(o => o.status === "ready")

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Ready for Pickup</p>
          <p className="font-serif text-3xl text-brand-gold">{ready.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-white/30">Loading…</div>
      ) : ready.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-white/30 gap-2">
          <span className="text-5xl">🍽️</span>
          <p>No orders ready yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {ready.map(order => (
            <FloorCard key={order.id} order={order} onMarkPickedUp={onMarkPickedUp} />
          ))}
        </div>
      )}
    </>
  )
}

// ─── Floor Card ───────────────────────────────────────────────────────────────

function FloorCard({ order, onMarkPickedUp }: {
  order:          StoredOrder
  onMarkPickedUp: (id: string) => void
}) {
  return (
    <div className="bg-white/5 border-l-4 border-brand-gold rounded-xl p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold text-sm">{order.customerName}</p>
          <p className="text-white/40 text-xs">{order.customerPhone}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          order.type === "delivery"
            ? "bg-blue-500/20 text-blue-300"
            : "bg-brand-gold/20 text-brand-gold"
        }`}>
          {order.type}
        </span>
      </div>

      <ul className="mb-2 divide-y divide-white/5">
        {order.items.map(item => (
          <li key={item._id} className="py-1 flex justify-between text-sm">
            <span className="text-white/80">
              <span className="font-bold text-white">{item.quantity}×</span> {item.name}
            </span>
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="text-yellow-300/80 text-xs bg-yellow-500/10 rounded px-2 py-1 mb-2">
          📝 {order.notes}
        </p>
      )}

      {order.readyAt && (
        <p className="text-white/30 text-xs mb-3">
          Ready at {new Date(order.readyAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}

      <div className="flex items-center justify-between mt-1">
        <span className="font-bold text-brand-gold text-sm">${order.total.toFixed(2)}</span>
        <button onClick={() => onMarkPickedUp(order.id)}
          className="text-xs bg-brand-green hover:bg-brand-green-dark text-white font-semibold px-3 py-1.5 rounded-lg transition-colors">
          Picked Up ✓
        </button>
      </div>
    </div>
  )
}
