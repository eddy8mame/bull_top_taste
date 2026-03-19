import { NextRequest, NextResponse } from "next/server"
import { orderStore } from "@/lib/orderStore"
import { cookies }    from "next/headers"

// Public read — menu page polls this to show "Kitchen Closed" banner
export async function GET() {
  return NextResponse.json({ open: orderStore.isKitchenOpen() })
}

// Staff-only write — requires admin_token cookie
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_token")?.value
  if (token !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  // Accept explicit { open: boolean } or just toggle
  const open = typeof body.open === "boolean"
    ? (orderStore.setKitchenOpen(body.open), body.open)
    : orderStore.toggleKitchen()

  return NextResponse.json({ open })
}
