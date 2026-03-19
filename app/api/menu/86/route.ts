import { NextRequest, NextResponse } from "next/server"
import { orderStore }               from "@/lib/orderStore"

// GET  /api/menu/86 — returns list of currently 86'd item IDs
export async function GET() {
  return NextResponse.json({ unavailable: orderStore.getUnavailable() })
}

// POST /api/menu/86 — toggle an item's availability
export async function POST(req: NextRequest) {
  const { itemId }: { itemId: string } = await req.json()
  const isNow86d = orderStore.toggle86(itemId)
  return NextResponse.json({ itemId, unavailable: isNow86d })
}
