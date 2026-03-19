import { NextResponse } from "next/server"
import { orderStore }  from "@/lib/orderStore"

// GET /api/orders — returns all active orders (polled by admin dashboard)
export async function GET() {
  return NextResponse.json(orderStore.getAll())
}
