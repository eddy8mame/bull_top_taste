"use client"

import { useCallback, useEffect, useState } from "react"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import type { AdminOrder, AdminOrderItem } from "@/types"

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
    const date = o.createdAt.split("T")[0]
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
  const active = allOrders.filter(o => o.status !== "completed").length

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

  return { rev, avg, active, avgLag, count: slice.length }
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

// ─── Location list ────────────────────────────────────────────────────────────
// Simulated — for demo purposes only.
// TODO: Replace with a server-side fetch of `location` documents from Sanity,
// filtered by the current user's permitted locationIds. Each entry maps
// `location._id → location.restaurantName`. The `active` flag becomes
// whether the tenant env var resolves to that document.
const LOCATIONS = [
  { id: "rpb", label: "Royal Palm Beach, FL", active: true },
  { id: "wpb", label: "West Palm Beach, FL", active: false },
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
    setKitchenOpen(data.kitchenOpen)
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
      setKitchenOpen(data.kitchenOpen)
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
            ← Dashboard
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
                { label: "Revenue — month", value: `$${monthKpi.rev.toFixed(2)}` },
                { label: "Orders — month", value: monthKpi.count },
                { label: "Avg order", value: `$${monthKpi.avg.toFixed(2)}` },
                { label: "Avg pickup lag", value: lifeKpi.avgLag },
              ].map(({ label, value }) => (
                <div key={label} className="o-metric-card">
                  <div className="o-metric-label">{label}</div>
                  <div className="o-metric-value">{value}</div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="o-charts-row">
              {/* Revenue by day */}
              <div className="o-chart-card">
                <div className="o-chart-title">
                  Revenue by day <span className="o-chart-sub">this month</span>
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
                <div className="o-chart-title">
                  Active orders <span className="o-chart-sub">right now</span>
                </div>
                <div className="o-active-num">{monthKpi.active}</div>
                <div className="o-active-label">orders in queue</div>
                <ul className="o-active-breakdown">
                  <li>{orders.filter(o => o.status === "pending").length} pending</li>
                  <li>{orders.filter(o => o.status === "kitchen").length} in kitchen</li>
                  <li>{orders.filter(o => o.status === "floor").length} ready for pickup</li>
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
                        <th className="o-th-center">Lag</th>
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
                <div className="o-section-card-title">Top items by revenue</div>
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
                <div className="o-section-card-title">Top items by order frequency</div>
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

            {/* Add-on uptake placeholder */}
            <div className="o-section-card">
              <div className="o-section-card-title">
                Add-on uptake
                <span className="o-chart-sub" style={{ marginLeft: 8 }}>
                  % of orders including each add-on
                </span>
              </div>
              <p className="o-empty" style={{ paddingBlock: "24px" }}>
                Modifier-level analytics will appear here in a future update.
              </p>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            CUSTOMERS
        ════════════════════════════════════════════════════════════════ */}
        {activeSection === "customers" && (
          <>
            <div className="o-cust-grid">
              <div className="o-metric-card">
                <div className="o-metric-label">Total customers</div>
                <div className="o-metric-value">{totalCustomers}</div>
              </div>
              <div className="o-metric-card">
                <div className="o-metric-label">Repeat rate</div>
                <div className="o-metric-value">{repeatRate}%</div>
              </div>
              <div className="o-metric-card">
                <div className="o-metric-label">Avg lifetime spend</div>
                <div className="o-metric-value">${avgLTV.toFixed(2)}</div>
              </div>
            </div>

            {/* Top customers by spend */}
            <div className="o-section-card">
              <div className="o-section-card-title">Top customers by spend</div>
              {topCustomers.length === 0 ? (
                <p className="o-empty">No data yet.</p>
              ) : (
                <table className="o-cust-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Phone</th>
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
                          <div className="o-log-contact">{c.email}</div>
                        </td>
                        <td className="o-log-contact o-nowrap">{c.phone || "—"}</td>
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
              <div className="o-section-card-title">Recent first-time customers</div>
              {newCustomers.length === 0 ? (
                <p className="o-empty">No first-time customers in this dataset.</p>
              ) : (
                <table className="o-cust-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>First order</th>
                      <th className="o-th-right">Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newCustomers.map(c => (
                      <tr key={c.email}>
                        <td>
                          <div className="o-cust-name">{c.name}</div>
                          <div className="o-log-contact">{c.email}</div>
                        </td>
                        <td className="o-log-contact o-nowrap">{c.phone || "—"}</td>
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
