// app/api/orders/export/route.ts

import { NextResponse } from "next/server"

import type { AdminOrder, AdminOrderItem } from "@/types"

import { getSanityReadClient } from "@/lib/sanity"

// GET /api/orders/export — full order history as CSV, sourced from Sanity.
// One row per order; modifiers are pre-formatted strings stored in Sanity
// (collapsed from SelectedModifier[] at order-write time).

const LOCATION_ID = process.env.SANITY_LOCATION_ID

export async function GET() {
  const client = getSanityReadClient()
  if (!client) {
    console.warn("[export] Sanity read client unavailable — exporting empty CSV")
  }

  let orders: AdminOrder[] = []

  if (client) {
    const filter = LOCATION_ID
      ? `_type == "order" && location._ref == $locationId`
      : `_type == "order"`

    const params = LOCATION_ID ? { locationId: LOCATION_ID } : {}

    orders = await client.fetch<AdminOrder[]>(
      `*[${filter}] | order(createdAt desc) {
        _id,
        status,
        type,
        customerName,
        customerEmail,
        customerPhone,
        notes,
        total,
        createdAt,
        readyAt,
        pickedUpAt,
        items[] {
          _key,
          itemName,
          quantity,
          basePrice,
          effectivePrice,
          modifiers[] { _key, groupName, selections },
          specialInstructions
        }
      }`,
      params
    )
  }

  const header = [
    "Order ID",
    "Date",
    "Status",
    "Customer Name",
    "Email",
    "Phone",
    "Type",
    "Items",
    "Modifiers",
    "Total",
    "Notes",
    "Ready At",
    "Picked Up At",
    "Lag (min)",
  ].join(",")

  const rows = orders.map(o => {
    // Items: "2x Jerk Chicken; 1x Festival"
    const itemsStr = o.items.map((i: AdminOrderItem) => `${i.quantity}x ${i.itemName}`).join("; ")

    // Modifiers: each item's groups on one line.
    // selections is already a pre-formatted string (e.g. "Large +$3.50, Rice & Peas")
    const modifiersStr = o.items
      .map((i: AdminOrderItem) => {
        if (!i.modifiers?.length && !i.specialInstructions) return ""
        const mods = (i.modifiers ?? []).map(m => `[${m.groupName}: ${m.selections}]`).join(" ")
        const note = i.specialInstructions ? ` [Note: ${i.specialInstructions}]` : ""
        return `${i.itemName}: ${mods}${note}`
      })
      .filter(Boolean)
      .join("; ")

    // Timestamps in ET
    const readyAt = o.readyAt
      ? new Date(o.readyAt).toLocaleString("en-US", { timeZone: "America/New_York" })
      : ""
    const pickedUpAt = o.pickedUpAt
      ? new Date(o.pickedUpAt).toLocaleString("en-US", { timeZone: "America/New_York" })
      : ""

    // Lag = minutes from order placed to pickup
const lag =
  o.readyAt && o.pickedUpAt
    ? String(Math.round((new Date(o.pickedUpAt).getTime() - new Date(o.readyAt).getTime()) / 60000))
    : ""

    const cols = [
      o._id,
      new Date(o.createdAt).toLocaleString("en-US", { timeZone: "America/New_York" }),
      o.status,
      o.customerName,
      o.customerEmail,
      o.customerPhone,
      o.type,
      itemsStr,
      modifiersStr,
      `$${o.total.toFixed(2)}`,
      o.notes ?? "",
      readyAt,
      pickedUpAt,
      lag,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`)

    return cols.join(",")
  })

  const csv = [header, ...rows].join("\n")
  const date = new Date().toISOString().split("T")[0]

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="orders-${date}.csv"`,
    },
  })
}
