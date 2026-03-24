//app/admin/office/page.tsx

"use client"

import { useCallback, useEffect, useState } from "react"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import type { AdminOrder, AdminOrderItem } from "@/types"

import { InfoIcon } from "@/components/admin/InfoIcon"

// ─── Constants ────────────────────────────────────────────────────────────────

const LAG_WARN_MINUTES = 7
const LAG_CRIT_MINUTES = 15

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = "overview" | "menu" | "customers" | "settings"

type DerivedCustomer = {
  name: string
  email: string
  phone: string
  orders: number
  spend: number
  lastDate: Date
}

// ─── Helpers (preserved exactly) ──────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function fmtLag(readyAt?: string, pickedUpAt?: string): string {
  if (!readyAt || !pickedUpAt) return "—"
  const diffMs = new Date(pickedUpAt).getTime() - new Date(readyAt).getTime()
  const mins = Math.floor(diffMs / 60000)
  const secs = Math.floor((diffMs % 60000) / 1000)
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

function deriveRevenueByDay(orders: AdminOrder[]) {
  const map = new Map<string, number>()
  for (const o of orders) {
    // Anchor to confirmedAt so an order started at 11:58 PM but paid at 12:01 AM
    // is attributed to the correct day. Falls back to createdAt for pre-migration records.
    const anchor = o.confirmedAt ?? o.createdAt
    const date = anchor.split("T")[0]
    map.set(date, (map.get(date) ?? 0) + o.total)
  }
  return Array.from(map.entries())
    .map(([date, revenue]) => ({ date, revenue: parseFloat(revenue.toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function deriveItemSales(orders: AdminOrder[]) {
  const map = new Map<string, { count: number; revenue: number }>()
  for (const o of orders)
    for (const item of o.items as AdminOrderItem[]) {
      const e = map.get(item.itemName) ?? { count: 0, revenue: 0 }
      map.set(item.itemName, {
        count: e.count + item.quantity,
        revenue: e.revenue + (item.basePrice ?? 0) * item.quantity,
      })
    }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count)
}

function kpis(slice: AdminOrder[], allOrders: AdminOrder[]) {
  const rev = slice.reduce((s, o) => s + o.total, 0)
  const avg = slice.length > 0 ? rev / slice.length : 0

  // Exclude awaiting_payment from active count — those are not real orders yet
  const active = allOrders.filter(
    o => o.status !== "completed" && o.status !== "awaiting_payment"
  ).length

  // Pickup lag: readyAt → pickedUpAt (how long order sat at the pass)
  const lagOrders = slice.filter(o => o.readyAt && o.pickedUpAt)
  const avgLagMs =
    lagOrders.length > 0
      ? lagOrders.reduce(
          (s, o) => s + new Date(o.pickedUpAt!).getTime() - new Date(o.readyAt!).getTime(),
          0
        ) / lagOrders.length
      : null
  const avgLag =
    avgLagMs !== null
      ? `${Math.floor(avgLagMs / 60000)}m ${Math.floor((avgLagMs % 60000) / 1000)}s`
      : "—"

  // Queue wait time: confirmedAt → startedAt (how long ticket sat before cook engaged)
  // Active prep time: startedAt → readyAt (how long cook spent making the order)
  // Both require all three timestamps — orders where Start was skipped are excluded.
  const fullFlowOrders = slice.filter(o => o.confirmedAt && o.startedAt && o.readyAt)

  const avgQueueMs =
    fullFlowOrders.length > 0
      ? fullFlowOrders.reduce(
          (s, o) => s + new Date(o.startedAt!).getTime() - new Date(o.confirmedAt!).getTime(),
          0
        ) / fullFlowOrders.length
      : null

  const avgPrepMs =
    fullFlowOrders.length > 0
      ? fullFlowOrders.reduce(
          (s, o) => s + new Date(o.readyAt!).getTime() - new Date(o.startedAt!).getTime(),
          0
        ) / fullFlowOrders.length
      : null

  const fmt = (ms: number | null) =>
    ms !== null ? `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s` : "—"

  return {
    rev,
    avg,
    active,
    avgLag,
    avgQueueTime: fmt(avgQueueMs),
    avgPrepTime: fmt(avgPrepMs),
    count: slice.length,
  }
}

// ─── New helpers (UI layer only) ──────────────────────────────────────────────

function lagMinutes(readyAt?: string, pickedUpAt?: string): number | null {
  if (!readyAt || !pickedUpAt) return null
  return (new Date(pickedUpAt).getTime() - new Date(readyAt).getTime()) / 60000
}

function lagCls(mins: number | null): "ok" | "warn" | "crit" {
  if (mins === null) return "ok"
  if (mins >= LAG_CRIT_MINUTES) return "crit"
  if (mins >= LAG_WARN_MINUTES) return "warn"
  return "ok"
}

function fmtRelative(date: Date): string {
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  return `${diffDays}d ago`
}

function deriveCustomers(orders: AdminOrder[]): DerivedCustomer[] {
  const map = new Map<string, DerivedCustomer>()
  for (const o of orders) {
    if (!o.customerEmail) continue
    const date = new Date(o.createdAt)
    const prev = map.get(o.customerEmail)
    if (!prev) {
      map.set(o.customerEmail, {
        name: o.customerName,
        email: o.customerEmail,
        phone: o.customerPhone ?? "",
        orders: 1,
        spend: o.total,
        lastDate: date,
      })
    } else {
      const isNewer = date > prev.lastDate
      map.set(o.customerEmail, {
        ...prev,
        orders: prev.orders + 1,
        spend: prev.spend + o.total,
        lastDate: isNewer ? date : prev.lastDate,
        // Keep phone from the most recent order so stale numbers self-correct
        phone: isNewer ? (o.customerPhone ?? prev.phone) : prev.phone,
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.spend - a.spend)
}

// ── Add-on uptake helpers ──────────────────────────────────────────────────────

// Controls which modifier groups count toward add-on uptake analytics.
// Currently name-based — when the Sanity menu schema gains an `isUpsellTracked`
// boolean on modifier groups, replace the body of this function with a lookup
// on that field. Add new group names here as the menu expands.
function isUpsellGroup(groupName: string): boolean {
  return groupName === "Recommend Sides and Apps" || groupName === "Extra Sides and Apps"
}

// Strips the price suffix from a single parsed selection token.
// "Plantain-Sweet +$6.98" → "Plantain-Sweet"
// "Jerk Sauce +$0.75"     → "Jerk Sauce"
// "Festival"              → "Festival" (no-op when no suffix present)
function normalizeAddonName(raw: string): string {
  return raw.replace(/\s+\+\$[\d.]+$/, "").trim()
}

interface AddonUptakeRow {
  name: string // normalized add-on name
  orderCount: number // distinct orders that included this add-on at least once
  attachRate: number // orderCount / totalOrders as a 0–100 integer percentage
}

// Ticket attach rate: for each known upsell add-on, what percentage of
// confirmed orders included it at least once?
//
// Uses a Set per add-on to enforce uniqueness — if one order has three
// entrees and two of them include Plantain, that still counts as one
// order successfully upsold on Plantain.
//
// Scoped to confirmed orders only (excludes awaiting_payment) so abandoned
// checkouts don't dilute the denominator.
function deriveAddonUptake(orders: AdminOrder[]): AddonUptakeRow[] {
  const confirmed = orders.filter(o => o.status !== "awaiting_payment")
  const totalOrders = confirmed.length
  if (totalOrders === 0) return []

  const ordersByAddon = new Map<string, Set<string>>()

  for (const order of confirmed) {
    for (const item of order.items) {
      for (const mod of item.modifiers ?? []) {
        if (!isUpsellGroup(mod.groupName)) continue
        if (!mod.selections) continue

        const names = mod.selections.split(", ").map(normalizeAddonName).filter(Boolean)

        for (const name of names) {
          if (!ordersByAddon.has(name)) ordersByAddon.set(name, new Set())
          ordersByAddon.get(name)!.add(order._id)
        }
      }
    }
  }

  return Array.from(ordersByAddon.entries())
    .map(([name, orderSet]) => ({
      name,
      orderCount: orderSet.size,
      attachRate: Math.round((orderSet.size / totalOrders) * 100),
    }))
    .sort((a, b) => b.attachRate - a.attachRate)
}

// ─── Location list ────────────────────────────────────────────────────────────
// Simulated — for demo purposes only.
// TODO: Replace with a server-side fetch of `location` documents from Sanity,
// filtered by the current user's permitted locationIds. Each entry maps
// `location._id → location.restaurantName`. The `active` flag becomes
// whether the tenant env var resolves to that document.
const LOCATIONS = [
  { id: "wpb", label: "West Palm Beach, FL", active: true },
  { id: "rpb", label: "Royal Palm Beach, FL", active: false },
  { id: "all", label: "All Locations", active: false },
]

const TABS: { id: Section; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "menu", label: "Menu" },
  { id: "customers", label: "Customers" },
  { id: "settings", label: "Settings" },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OfficeDashboard() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState("rpb")
  const [activeSection, setActiveSection] = useState<Section>("overview")
  const [kitchenOpen, setKitchenOpen] = useState<boolean | null>(null)
  const [togglingKitchen, setTogglingKitchen] = useState(false)

  // ── Preserved fetch logic ────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/orders")
    const data: AdminOrder[] = await res.json()
    setOrders(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 30_000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  // ── Kitchen open/close state (for Settings tab) ──────────────────────────
  const fetchKitchen = useCallback(async () => {
    const res = await fetch("/api/kitchen")
    const data = await res.json()
    setKitchenOpen(data.open)
  }, [])

  useEffect(() => {
    fetchKitchen()
  }, [fetchKitchen])

  const toggleKitchen = async () => {
    if (togglingKitchen || kitchenOpen === null) return
    setTogglingKitchen(true)
    const prev = kitchenOpen
    setKitchenOpen(!prev)
    try {
      const res = await fetch("/api/kitchen", { method: "POST" })
      const data = await res.json()
      setKitchenOpen(data.open)
    } catch {
      setKitchenOpen(prev)
    } finally {
      setTogglingKitchen(false)
    }
  }

  // ── Derived data (preserved exactly) ────────────────────────────────────
  const monthStart = startOfMonth()
  const thisMonth = orders.filter(o => o.createdAt >= monthStart)
  const lifetime = orders

  const monthKpi = kpis(thisMonth, orders)
  const lifeKpi = kpis(lifetime, orders)

  const revenueByDay = deriveRevenueByDay(thisMonth)
  const itemSales = deriveItemSales(lifetime)

  const selectedLoc = LOCATIONS.find(l => l.id === selectedLocation) ?? LOCATIONS[0]

  // ── New derived data (UI layer only) ─────────────────────────────────────
  const customers = deriveCustomers(orders)
  const itemsByRevenue = [...itemSales].sort((a, b) => b.revenue - a.revenue)
  const itemsByFreq = itemSales // already sorted by count
  const addonUptake = deriveAddonUptake(orders)

  const totalCustomers = customers.length
  const repeatRate =
    totalCustomers > 0
      ? Math.round((customers.filter(c => c.orders > 1).length / totalCustomers) * 100)
      : 0
  const avgLTV =
    totalCustomers > 0 ? customers.reduce((s, c) => s + c.spend, 0) / totalCustomers : 0

  const topCustomers = customers.slice(0, 8)
  const newCustomers = customers
    .filter(c => c.orders === 1)
    .sort((a, b) => b.lastDate.getTime() - a.lastDate.getTime())
    .slice(0, 8)

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="admin-page office">
      {/* ── Topbar ──────────────────────────────────────────────────────── */}
      <header className="o-topbar">
        <div>
          <div className="o-brand-name">Bull Top Taste</div>
          <div className="o-brand-sub">Admin Dashboard</div>
        </div>

        <nav className="o-top-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`o-tab${activeSection === tab.id ? "active" : ""}`}
              onClick={() => setActiveSection(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="o-top-right">
          <select
            className="o-loc-select"
            value={selectedLocation}
            onChange={e => setSelectedLocation(e.target.value)}
          >
            {LOCATIONS.map(loc => (
              <option key={loc.id} value={loc.id} disabled={!loc.active}>
                {loc.label}
                {loc.active ? "" : " ✦ Coming Soon"}
              </option>
            ))}
          </select>
          <a href="/admin" className="o-cross-link">
            Dashboard
          </a>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="o-main">
        {/* ════════════════════════════════════════════════════════════════
            OVERVIEW
        ════════════════════════════════════════════════════════════════ */}
        {activeSection === "overview" && (
          <>
            {/* 4 KPI cards */}
            <div className="o-metrics-grid">
              {[
                {
                  label: "Revenue — month",
                  value: `$${monthKpi.rev.toFixed(2)}`,
                  tip: "Total revenue from completed and active orders this month, based on when payment was confirmed.",
                },
                {
                  label: "Orders — month",
                  value: monthKpi.count,
                  tip: "Total orders this month, counting from the moment payment was confirmed.",
                },
                {
                  label: "Avg order",
                  value: `$${monthKpi.avg.toFixed(2)}`,
                  tip: "Average order value this month (total revenue divided by number of orders).",
                },
                {
                  label: "Avg pickup lag",
                  value: lifeKpi.avgLag,
                  tip: "How long orders sit at the counter after being marked ready before the customer picks them up.",
                },
                {
                  label: "Avg queue time",
                  value: monthKpi.avgQueueTime,
                  tip: "How long orders wait on the board before preparation begins. Measured from payment confirmation to when the kitchen taps Start.",
                },
                {
                  label: "Avg prep time",
                  value: monthKpi.avgPrepTime,
                  tip: "How long the kitchen spends actively making the order. Measured from when the kitchen taps Start to when the food is marked ready.",
                },
              ].map(({ label, value, tip }) => (
                <div key={label} className="o-metric-card">
                  <div className="o-metric-label" style={{ display: "flex", alignItems: "center" }}>
                    {label}
                    <InfoIcon tip={tip} />
                  </div>
                  <div className="o-metric-value">{value}</div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="o-charts-row">
              {/* Revenue by day */}
              <div className="o-chart-card">
                <div className="o-chart-title" style={{ display: "flex", alignItems: "center" }}>
                  Revenue by day{" "}
                  <span className="o-chart-sub" style={{ marginLeft: 6 }}>
                    this month
                  </span>
                  <InfoIcon tip="Daily revenue this month. Each bar represents the total value of orders confirmed on that day." />
                </div>
                {revenueByDay.length === 0 ? (
                  <p className="o-empty">No orders this month yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={revenueByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: "#b0b0aa", fontSize: 10 }} />
                      <YAxis
                        tick={{ fill: "#b0b0aa", fontSize: 10 }}
                        tickFormatter={v => `$${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#ffffff",
                          border: "0.5px solid rgba(0,0,0,0.08)",
                          borderRadius: 8,
                        }}
                        labelStyle={{ color: "#6b6b66" }}
                        formatter={v => [`$${Number(v).toFixed(2)}`, "Revenue"]}
                      />
                      <Bar dataKey="revenue" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Active orders snapshot */}
              <div className="o-chart-card">
                <div className="o-chart-title" style={{ display: "flex", alignItems: "center" }}>
                  Active orders{" "}
                  <span className="o-chart-sub" style={{ marginLeft: 6 }}>
                    right now
                  </span>
                  <InfoIcon tip="A live snapshot of orders currently in the kitchen or waiting for pickup. Excludes abandoned checkouts." />
                </div>
                <div className="o-active-num">{monthKpi.active}</div>
                <div className="o-active-label">orders in queue</div>
                <ul className="o-active-breakdown">
                  <ul className="o-active-breakdown">
                    <li>
                      {orders.filter(o => o.status === "awaiting_payment").length} awaiting payment
                    </li>
                    <li>{orders.filter(o => o.status === "pending").length} confirmed, queue</li>
                    <li>{orders.filter(o => o.status === "kitchen").length} in kitchen</li>
                    <li>{orders.filter(o => o.status === "floor").length} ready for pickup</li>
                  </ul>
                </ul>
              </div>
            </div>

            {/* Order log */}
            <div className="o-section-card">
              <div className="o-log-header">
                <div>
                  <div className="o-log-title">Order log</div>
                  {lifeKpi.avgLag !== "—" && (
                    <div className="o-log-meta">
                      Avg pickup lag: <strong>{lifeKpi.avgLag}</strong>
                    </div>
                  )}
                </div>
                <a href="/api/orders/export" download className="o-export-btn">
                  Export CSV ↓
                </a>
              </div>

              {loading ? (
                <p className="o-empty">Loading…</p>
              ) : orders.length === 0 ? (
                <p className="o-empty">No orders yet.</p>
              ) : (
                <div className="o-table-wrap">
                  <table className="o-log-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th className="o-th-right">Total</th>
                        <th className="o-th-center">Ready</th>
                        <th className="o-th-center">Picked up</th>
                        <th className="o-th-center" style={{ whiteSpace: "nowrap" }}>
                          Lag
                          <InfoIcon tip="Time between an order being marked ready and customer pickup. Green: <7 min. Amber: 7–15 min. Red: >15 min." />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => {
                        const lagMins = lagMinutes(o.readyAt, o.pickedUpAt)
                        const cls = lagCls(lagMins)
                        return (
                          <tr key={o._id}>
                            <td className="o-nowrap">{fmtDate(o.createdAt)}</td>
                            <td className="o-nowrap">{fmtTime(o.createdAt)}</td>
                            <td>
                              <div className="o-log-customer">{o.customerName}</div>
                              <div className="o-log-contact">{o.customerEmail}</div>
                              {o.customerPhone && (
                                <div className="o-log-contact">{o.customerPhone}</div>
                              )}
                            </td>
                            <td className="o-items-cell">
                              {o.items
                                .map((i: AdminOrderItem) => `${i.quantity}× ${i.itemName}`)
                                .join(", ")}
                            </td>
                            <td className="o-total-cell">${o.total.toFixed(2)}</td>
                            <td className="o-center-cell o-nowrap">
                              {o.readyAt ? fmtTime(o.readyAt) : "—"}
                            </td>
                            <td className="o-center-cell o-nowrap">
                              {o.pickedUpAt ? fmtTime(o.pickedUpAt) : "—"}
                            </td>
                            <td className="o-center-cell">
                              {o.pickedUpAt ? (
                                <span className={`o-lag-pill o-lag-${cls}`}>
                                  {fmtLag(o.readyAt, o.pickedUpAt)}
                                </span>
                              ) : (
                                <span className="o-lag-pill o-lag-pending">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            MENU
        ════════════════════════════════════════════════════════════════ */}
        {activeSection === "menu" && (
          <>
            <div className="o-menu-grid">
              {/* Top by revenue */}
              <div className="o-section-card" style={{ marginBottom: 0 }}>
                <div
                  className="o-section-card-title"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  Top items by revenue
                  <InfoIcon tip="Items ranked by total revenue generated across all orders, all time." />
                </div>
                {itemsByRevenue.length === 0 ? (
                  <p className="o-empty">No data yet.</p>
                ) : (
                  itemsByRevenue.slice(0, 8).map((item, i) => (
                    <div key={item.name} className="o-item-row">
                      <span className="o-item-rank">{i + 1}</span>
                      <span className="o-item-name">{item.name}</span>
                      <div className="o-item-bar-wrap">
                        <div className="o-item-bar-bg">
                          <div
                            className="o-item-bar-fill"
                            style={{
                              width: `${(item.revenue / (itemsByRevenue[0]?.revenue || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="o-item-val">${item.revenue.toFixed(0)}</span>
                      <span className="o-item-orders">{item.count} sold</span>
                    </div>
                  ))
                )}
              </div>

              {/* Top by frequency */}
              <div className="o-section-card" style={{ marginBottom: 0 }}>
                <div
                  className="o-section-card-title"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  Top items by order frequency
                  <InfoIcon tip="Items ranked by how often they are ordered. High frequency + low revenue often indicates a popular low-margin item." />
                </div>
                {itemsByFreq.length === 0 ? (
                  <p className="o-empty">No data yet.</p>
                ) : (
                  itemsByFreq.slice(0, 8).map((item, i) => (
                    <div key={item.name} className="o-item-row">
                      <span className="o-item-rank">{i + 1}</span>
                      <span className="o-item-name">{item.name}</span>
                      <div className="o-item-bar-wrap">
                        <div className="o-item-bar-bg">
                          <div
                            className="o-item-bar-fill"
                            style={{
                              width: `${(item.count / (itemsByFreq[0]?.count || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="o-item-orders">{item.count} sold</span>
                      <span className="o-item-val">${item.revenue.toFixed(0)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add-on uptake — ticket attach rate per upsell add-on */}
            <div className="o-section-card">
              <div
                className="o-section-card-title"
                style={{ display: "flex", alignItems: "center" }}
              >
                Add-on uptake
                <span className="o-chart-sub" style={{ marginLeft: 8 }}>
                  % of orders including each add-on
                </span>
                <InfoIcon tip="Percentage of confirmed orders that included each add-on at least once. Multiple add-ons in a single order each count once per ticket." />
              </div>

              {addonUptake.length === 0 ? (
                <p className="o-empty" style={{ paddingBlock: "24px" }}>
                  No add-on data yet. This panel will populate as orders come in.
                </p>
              ) : (
                <div style={{ marginTop: 12 }}>
                  {/* Column headers */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 2fr 56px 64px",
                      gap: "0 12px",
                      padding: "0 0 8px",
                      borderBottom: "0.5px solid rgba(0,0,0,0.08)",
                      marginBottom: 10,
                    }}
                  >
                    {["Add-on", "Attach rate", "Orders", "%"].map(h => (
                      <span
                        key={h}
                        style={{
                          fontSize: "0.7rem",
                          color: "#9b9b96",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          fontWeight: 600,
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>

                  {/* Rows */}
                  {addonUptake.map(row => (
                    <div
                      key={row.name}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 2fr 56px 64px",
                        gap: "0 12px",
                        alignItems: "center",
                        padding: "7px 0",
                        borderBottom: "0.5px solid rgba(0,0,0,0.04)",
                      }}
                    >
                      {/* Add-on name */}
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "#2e2e2c",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {row.name}
                      </span>

                      {/* Bar — absolute width reflects true attach rate */}
                      <div
                        style={{
                          height: 8,
                          borderRadius: 4,
                          background: "rgba(0,0,0,0.06)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${row.attachRate}%`,
                            borderRadius: 4,
                            background: "#EF9F27",
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>

                      {/* Order count */}
                      <span
                        style={{
                          fontSize: "0.82rem",
                          color: "#6b6b66",
                          textAlign: "right",
                        }}
                      >
                        {row.orderCount}
                      </span>

                      {/* Attach rate percentage */}
                      <span
                        style={{
                          fontSize: "0.82rem",
                          color: "#2e2e2c",
                          fontWeight: 600,
                          textAlign: "right",
                        }}
                      >
                        {row.attachRate}%
                      </span>
                    </div>
                  ))}

                  {/* Footer — total confirmed orders used as denominator */}
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: "0.72rem",
                      color: "#9b9b96",
                    }}
                  >
                    Based on {orders.filter(o => o.status !== "awaiting_payment").length} confirmed
                    orders
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            CUSTOMERS
        ════════════════════════════════════════════════════════════════ */}
        {activeSection === "customers" && (
          <>
            <div className="o-cust-grid">
              {[
                {
                  label: "Total customers",
                  value: totalCustomers,
                  tip: "Unique customers, identified by email address, across all time.",
                },
                {
                  label: "Repeat rate",
                  value: `${repeatRate}%`,
                  tip: "Percentage of customers who have placed two or more orders.",
                },
                {
                  label: "Avg lifetime spend",
                  value: `$${avgLTV.toFixed(2)}`,
                  tip: "Average total amount spent per customer across their entire history.",
                },
              ].map(({ label, value, tip }) => (
                <div key={label} className="o-metric-card">
                  <div className="o-metric-label" style={{ display: "flex", alignItems: "center" }}>
                    {label}
                    <InfoIcon tip={tip} />
                  </div>
                  <div className="o-metric-value">{value}</div>
                </div>
              ))}
            </div>

            {/* Top customers by spend */}
            <div className="o-section-card">
              <div className="o-log-header">
                <div
                  className="o-section-card-title"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  Top customers by spend
                  <InfoIcon tip="Your highest-value customers ranked by total lifetime spend." />
                </div>
                <a href="/api/customers/export" download className="o-export-btn">
                  Export CSV ↓
                </a>
              </div>
              {topCustomers.length === 0 ? (
                <p className="o-empty">No data yet.</p>
              ) : (
                <table className="o-cust-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Orders</th>
                      <th className="o-th-right">Total spend</th>
                      <th>Last order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.map(c => (
                      <tr key={c.email}>
                        <td>
                          <div className="o-cust-name">{c.name}</div>
                        </td>
                        <td>
                          <div className="o-log-contact">{c.email}</div>
                          <div className="o-log-contact o-nowrap">{c.phone || "—"}</div>
                        </td>
                        <td>{c.orders}</td>
                        <td className="o-total-cell">${c.spend.toFixed(2)}</td>
                        <td className="o-nowrap">{fmtRelative(c.lastDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Recent first-time customers */}
            <div className="o-section-card">
              <div className="o-log-header">
                <div
                  className="o-section-card-title"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  Recent first-time customers
                  <InfoIcon tip="Customers who have placed exactly one order, showing the most recent first." />
                </div>
                <a href="/api/customers/new/export" download className="o-export-btn">
                  Export CSV ↓
                </a>
              </div>
              {newCustomers.length === 0 ? (
                <p className="o-empty">No first-time customers in this dataset.</p>
              ) : (
                <table className="o-cust-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>First order</th>
                      <th className="o-th-right">Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newCustomers.map(c => (
                      <tr key={c.email}>
                        <td>
                          <div className="o-cust-name">{c.name}</div>
                        </td>
                        <td>
                          <div className="o-log-contact">{c.email}</div>
                          <div className="o-log-contact o-nowrap">{c.phone || "—"}</div>
                        </td>
                        <td className="o-nowrap">{fmtRelative(c.lastDate)}</td>
                        <td className="o-total-cell">${c.spend.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            SETTINGS
        ════════════════════════════════════════════════════════════════ */}
        {activeSection === "settings" && (
          <div className="o-settings-grid">
            {/* Online ordering toggle */}
            <div className="o-settings-card">
              <div className="o-settings-title">
                Online ordering
                <span className="o-future-badge">manual override</span>
              </div>
              <div className="o-settings-sub">
                Toggle online ordering for this location. Scheduling controls coming soon.
              </div>

              {kitchenOpen === null ? (
                <p className="o-empty">Loading…</p>
              ) : (
                <div className="o-loc-setting-row">
                  <div>
                    <div className="o-loc-setting-name">{selectedLoc.label}</div>
                    <div className="o-loc-setting-sub">
                      {kitchenOpen ? "Accepting online orders" : "Online ordering paused"}
                    </div>
                  </div>
                  <div className="o-toggle-wrap">
                    <span className={`o-toggle-label ${kitchenOpen ? "open" : "closed"}`}>
                      {kitchenOpen ? "Open" : "Closed"}
                    </span>
                    <label className="o-toggle">
                      <input
                        type="checkbox"
                        checked={kitchenOpen}
                        disabled={togglingKitchen}
                        onChange={toggleKitchen}
                      />
                      <span className="o-toggle-track" />
                      <span className="o-toggle-thumb" />
                    </label>
                  </div>
                </div>
              )}

              <p className="o-override-note">
                Changes take effect immediately.{" "}
                <strong>Closing ordering will prevent new orders from being placed</strong> but will
                not affect orders already in the kitchen queue.
              </p>
            </div>

            {/* Scheduled hours — coming soon */}
            <div className="o-settings-card">
              <div className="o-settings-title">
                Scheduled hours
                <span className="o-future-badge">coming soon</span>
              </div>
              <div className="o-settings-sub">
                Set recurring open and close times per day of week. Manual override will remain
                available.
              </div>
              <div className="o-coming-soon-body">Weekly schedule builder will appear here</div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
