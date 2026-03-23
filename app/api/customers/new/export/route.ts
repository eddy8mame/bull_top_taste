// app/api/customers/new/export/route.ts

import { NextResponse } from "next/server"

import type { AdminOrder } from "@/types"

import { getSanityReadClient } from "@/lib/sanity"

// GET /api/customers/new/export — first-time customers only, as CSV.
// A first-time customer is one whose email appears in exactly one order.
// Sorted by most recent order date descending.

const LOCATION_ID = process.env.SANITY_LOCATION_ID

export async function GET() {
  const client = getSanityReadClient()

  let orders: AdminOrder[] = []

  if (client) {
    const filter = LOCATION_ID
      ? `_type == "order" && location._ref == $locationId`
      : `_type == "order"`

    const params = LOCATION_ID ? { locationId: LOCATION_ID } : {}

    orders = await client.fetch<AdminOrder[]>(
      `*[${filter}] | order(createdAt desc) {
        _id,
        customerName,
        customerEmail,
        customerPhone,
        total,
        createdAt
      }`,
      params
    )
  }

  // Same derivation as customers export, then filter to orders === 1
  const map = new Map<
    string,
    {
      name: string
      email: string
      phone: string
      orders: number
      spend: number
      lastDate: Date
    }
  >()

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
        phone: isNewer ? (o.customerPhone ?? prev.phone) : prev.phone,
      })
    }
  }

  const newCustomers = Array.from(map.values())
    .filter(c => c.orders === 1)
    .sort((a, b) => b.lastDate.getTime() - a.lastDate.getTime())

  const header = ["Name", "Email", "Phone", "Spend", "Order Date"].join(",")

  const rows = newCustomers.map(c => {
    const cols = [
      c.name,
      c.email,
      c.phone,
      `$${c.spend.toFixed(2)}`,
      c.lastDate.toLocaleString("en-US", { timeZone: "America/New_York" }),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`)
    return cols.join(",")
  })

  const csv = [header, ...rows].join("\n")
  const date = new Date().toISOString().split("T")[0]

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="customers-new-${date}.csv"`,
    },
  })
}
