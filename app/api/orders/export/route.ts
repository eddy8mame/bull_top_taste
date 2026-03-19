import { NextResponse } from "next/server"
import { orderStore }  from "@/lib/orderStore"

// GET /api/orders/export — full order history as CSV
// Strategy: one row per order. Items expanded into separate columns
// (item name, modifiers, sub-modifiers). Timestamps in ET.
export async function GET() {
  const orders = orderStore.getAll()

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
    // Items column: "2x Jerk Chicken; 1x Festival"
    const itemsStr = o.items
      .map(i => `${i.quantity}x ${i.name}`)
      .join("; ")

    // Modifiers column: one entry per item, each entry lists all selected modifiers
    // Format: "Jerk Chicken: [Size Choice: Large +$3.50] [Side Choice: White Rice, Rice & Peas]"
    const modifiersStr = o.items
      .map(i => {
        if (!i.selectedModifiers?.length && !i.specialInstructions) return ""
        const mods = (i.selectedModifiers ?? [])
          .map(m => {
            const opts = m.selections
              .map(s => s.priceAdjustment > 0 ? `${s.name} +$${s.priceAdjustment.toFixed(2)}` : s.name)
              .join(", ")
            return `[${m.groupName}: ${opts}]`
          })
          .join(" ")
        const note = i.specialInstructions ? ` [Note: ${i.specialInstructions}]` : ""
        return `${i.name}: ${mods}${note}`
      })
      .filter(Boolean)
      .join("; ")

    // Pickup timestamps
    const readyAt    = o.readyAt    ? new Date(o.readyAt).toLocaleString("en-US",    { timeZone: "America/New_York" }) : ""
    const pickedUpAt = o.pickedUpAt ? new Date(o.pickedUpAt).toLocaleString("en-US", { timeZone: "America/New_York" }) : ""

    // Lag = time from order placed to pickup (minutes)
    const lag = (o.readyAt && o.pickedUpAt)
      ? String(Math.round((new Date(o.pickedUpAt).getTime() - new Date(o.createdAt).getTime()) / 60000))
      : ""

    const cols = [
      o.id,
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

  const csv  = [header, ...rows].join("\n")
  const date = new Date().toISOString().split("T")[0]

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv",
      "Content-Disposition": `attachment; filename="orders-${date}.csv"`,
    },
  })
}
