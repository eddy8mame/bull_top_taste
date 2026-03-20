"use client"

import { useEffect, useState, useCallback } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts"
import type { AdminOrder, AdminOrderItem } from "@/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    month: "short", day: "numeric", year: "numeric",
  })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit",
  })
}

function fmtLag(readyAt?: string, pickedUpAt?: string): string {
  if (!readyAt || !pickedUpAt) return "—"
  const diffMs  = new Date(pickedUpAt).getTime() - new Date(readyAt).getTime()
  const mins    = Math.floor(diffMs / 60000)
  const secs    = Math.floor((diffMs % 60000) / 1000)
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
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
        count:   e.count + item.quantity,
        revenue: e.revenue + (item.basePrice ?? 0) * item.quantity,
      })
    }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OfficeDashboard() {
  const [orders,  setOrders]  = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    const res  = await fetch("/api/orders")
    const data: AdminOrder[] = await res.json()
    setOrders(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 30_000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  const totalRev  = orders.reduce((s, o) => s + o.total, 0)
  const avgOrder  = orders.length > 0 ? totalRev / orders.length : 0
  const active    = orders.filter(o => o.status !== "completed").length
  const revenueByDay = deriveRevenueByDay(orders)
  const itemSales    = deriveItemSales(orders)

  // Avg pickup lag across completed orders that have both timestamps
  const lagOrders = orders.filter(o => o.readyAt && o.pickedUpAt)
  const avgLagMs  = lagOrders.length > 0
    ? lagOrders.reduce((s, o) => s + new Date(o.pickedUpAt!).getTime() - new Date(o.readyAt!).getTime(), 0) / lagOrders.length
    : null
  const avgLagLabel = avgLagMs !== null
    ? `${Math.floor(avgLagMs / 60000)}m ${Math.floor((avgLagMs % 60000) / 1000)}s`
    : "—"

  return (
    <main className="p-4 md:p-6 space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Revenue",   value: `$${totalRev.toFixed(2)}`  },
          { label: "Total Orders",    value: orders.length               },
          { label: "Active Now",      value: active                      },
          { label: "Avg Order",       value: `$${avgOrder.toFixed(2)}`  },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/5 rounded-xl p-4">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">{label}</p>
            <p className="font-serif text-2xl text-brand-gold">{value}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white/5 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white/70 mb-4">Revenue by Day</h3>
        {revenueByDay.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-10">No order data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                formatter={(v) => [`$${Number(v).toFixed(2)}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="#f5c300" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Item sales */}
      <div className="bg-white/5 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white/70 mb-4">Item Sales</h3>
        {itemSales.length === 0 ? (
          <p className="text-white/30 text-sm">No data yet.</p>
        ) : (
          <ul className="space-y-3">
            {itemSales.slice(0, 8).map((item, i) => (
              <li key={item.name} className="flex items-center gap-3">
                <span className="text-white/30 text-xs w-4 flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/80 truncate">{item.name}</span>
                    <span className="text-white/40 ml-2 flex-shrink-0">{item.count} sold</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-gold rounded-full transition-all"
                      style={{ width: `${(item.count / (itemSales[0]?.count || 1)) * 100}%` }} />
                  </div>
                </div>
                <span className="text-brand-gold text-xs font-semibold w-14 text-right flex-shrink-0">
                  ${item.revenue.toFixed(0)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Orders table — pickup timing */}
      <div className="bg-white/5 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white/70">Order Log</h3>
            {avgLagMs !== null && (
              <p className="text-white/30 text-xs mt-0.5">
                Avg pickup lag: <span className="text-brand-gold font-semibold">{avgLagLabel}</span>
              </p>
            )}
          </div>
          <a href="/api/orders/export" download
            className="text-xs bg-brand-green hover:bg-brand-green-dark text-white font-semibold px-3 py-1.5 rounded-lg transition-colors">
            Export CSV ↓
          </a>
        </div>

        {loading ? (
          <p className="text-white/30 text-sm text-center py-6">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-6">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/30 text-xs uppercase tracking-widest border-b border-white/10">
                  <th className="text-left pb-2 pr-4">Date</th>
                  <th className="text-left pb-2 pr-4">Time</th>
                  <th className="text-left pb-2 pr-4">Customer</th>
                  <th className="text-left pb-2 pr-4">Items</th>
                  <th className="text-right pb-2 pr-4">Total</th>
                  <th className="text-center pb-2 pr-4">Ready</th>
                  <th className="text-center pb-2 pr-4">Picked Up</th>
                  <th className="text-center pb-2">Lag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map(o => (
                  <tr key={o._id}>
                    <td className="py-2.5 pr-4 text-white/50 whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                    <td className="py-2.5 pr-4 text-white/50 whitespace-nowrap">{fmtTime(o.createdAt)}</td>
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-white/80 leading-tight">{o.customerName}</p>
                      <p className="text-white/30 text-xs">{o.customerEmail}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-white/50 text-xs">
                      {o.items.map((i: AdminOrderItem) => `${i.quantity}× ${i.itemName}`).join(", ")}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-brand-gold whitespace-nowrap">
                      ${o.total.toFixed(2)}
                    </td>
                    <td className="py-2.5 pr-4 text-center text-white/50 whitespace-nowrap">
                      {o.readyAt ? fmtTime(o.readyAt) : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-center text-white/50 whitespace-nowrap">
                      {o.pickedUpAt ? fmtTime(o.pickedUpAt) : "—"}
                    </td>
                    <td className="py-2.5 text-center whitespace-nowrap">
                      <span className={`text-xs font-semibold ${o.pickedUpAt ? "text-brand-gold" : "text-white/20"}`}>
                        {fmtLag(o.readyAt, o.pickedUpAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </main>
  )
}
