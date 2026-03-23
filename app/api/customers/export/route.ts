// app/api/customers/export/route.ts

import { NextResponse } from "next/server"

import type { AdminOrder } from "@/types"

import { getSanityReadClient } from "@/lib/sanity"

// GET /api/customers/export — all customers derived from order history, as CSV.
// Customers are identified by email address. One row per unique customer,
// sorted by total lifetime spend descending.

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

  // Derive customers — same logic as office/page.tsx deriveCustomers()
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

  const customers = Array.from(map.values()).sort((a, b) => b.spend - a.spend)

  const header = ["Name", "Email", "Phone", "Orders", "Total Spend", "Last Order"].join(",")

  const rows = customers.map(c => {
    const cols = [
      c.name,
      c.email,
      c.phone,
      String(c.orders),
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
      "Content-Disposition": `attachment; filename="customers-${date}.csv"`,
    },
  })
}
