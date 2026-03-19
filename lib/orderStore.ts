import type { Order } from "@/types"

// ─── In-memory order store ────────────────────────────────────────────────────
// Works correctly in local development (single process).
// In production on Vercel (serverless), replace this with a persistent store
// such as Upstash Redis, Vercel KV, or Supabase.

export type OrderStatus = "pending" | "preparing" | "ready" | "completed"

export interface StoredOrder extends Order {
  status:       OrderStatus
  updatedAt:    string
  readyAt?:     string   // set when kitchen marks order ready
  pickedUpAt?:  string   // set when floor staff marks order picked up
}

// Module-level map — persists across requests within the same process
const orders           = new Map<string, StoredOrder>()
const unavailableItems = new Set<string>()   // item _ids marked "86'd"
let   kitchenOpen      = true                // kitchen open/closed toggle

export const orderStore = {
  add(order: Order): StoredOrder {
    const stored: StoredOrder = {
      ...order,
      status:    "pending",
      updatedAt: new Date().toISOString(),
    }
    orders.set(order.id, stored)
    return stored
  },

  get(id: string): StoredOrder | undefined {
    return orders.get(id)
  },

  updateStatus(id: string, status: OrderStatus): StoredOrder | null {
    const order = orders.get(id)
    if (!order) return null
    const now     = new Date().toISOString()
    const updated = {
      ...order,
      status,
      updatedAt: now,
      ...(status === "ready" ? { readyAt: now } : {}),
    }
    orders.set(id, updated)
    return updated
  },

  markPickedUp(id: string): StoredOrder | null {
    const order = orders.get(id)
    if (!order) return null
    const now     = new Date().toISOString()
    const updated = { ...order, status: "completed" as OrderStatus, updatedAt: now, pickedUpAt: now }
    orders.set(id, updated)
    return updated
  },

  // Return all orders sorted newest first
  getAll(): StoredOrder[] {
    return Array.from(orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  },

  getActive(): StoredOrder[] {
    return this.getAll().filter(o => o.status !== "completed")
  },

  // ─── Analytics helpers ──────────────────────────────────────────────────────

  // Revenue grouped by date string (YYYY-MM-DD)
  revenueByDay(): { date: string; revenue: number; orders: number }[] {
    const map = new Map<string, { revenue: number; orders: number }>()
    for (const order of orders.values()) {
      const date = order.createdAt.split("T")[0]
      const existing = map.get(date) ?? { revenue: 0, orders: 0 }
      map.set(date, {
        revenue: existing.revenue + order.total,
        orders:  existing.orders + 1,
      })
    }
    return Array.from(map.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date))
  },

  // Item sales counts
  itemSales(): { name: string; count: number; revenue: number }[] {
    const map = new Map<string, { count: number; revenue: number }>()
    for (const order of orders.values()) {
      for (const item of order.items) {
        const existing = map.get(item.name) ?? { count: 0, revenue: 0 }
        map.set(item.name, {
          count:   existing.count + item.quantity,
          revenue: existing.revenue + (item.price ?? 0) * item.quantity,
        })
      }
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
  },

  // Customer lifetime value
  customerLTV(): { name: string; email: string; phone: string; orders: number; total: number }[] {
    const map = new Map<string, { name: string; email: string; phone: string; orders: number; total: number }>()
    for (const order of orders.values()) {
      const key      = order.customerEmail
      const existing = map.get(key) ?? {
        name: order.customerName, email: order.customerEmail,
        phone: order.customerPhone, orders: 0, total: 0,
      }
      map.set(key, {
        ...existing,
        orders: existing.orders + 1,
        total:  existing.total + order.total,
      })
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  },

  // ─── 86 toggle ──────────────────────────────────────────────────────────────

  toggle86(itemId: string): boolean {
    if (unavailableItems.has(itemId)) {
      unavailableItems.delete(itemId)
      return false
    }
    unavailableItems.add(itemId)
    return true
  },

  getUnavailable(): string[] {
    return Array.from(unavailableItems)
  },

  is86d(itemId: string): boolean {
    return unavailableItems.has(itemId)
  },

  // ─── Kitchen open/close ──────────────────────────────────────────────────────

  isKitchenOpen(): boolean {
    return kitchenOpen
  },

  setKitchenOpen(open: boolean): void {
    kitchenOpen = open
  },

  toggleKitchen(): boolean {
    kitchenOpen = !kitchenOpen
    return kitchenOpen
  },
}
