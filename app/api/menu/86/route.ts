import { NextRequest, NextResponse }  from "next/server"
import { getSanityReadClient, getSanityWriteClient } from "@/lib/sanity"

// GET  /api/menu/86 — returns _id list of menuItem documents currently marked unavailable.
// POST /api/menu/86 — toggles the `available` boolean on the given menuItem document.
//
// Note: the admin 86 panel displays items from FALLBACK_MENU and passes their
// `_id` values here. This works correctly when the Sanity menuItem _ids match
// those hardcoded values. As a future improvement, the panel should load live
// menu items from Sanity so the _ids are always in sync.

export async function GET() {
  const client = getSanityReadClient()
  if (!client) {
    console.warn("[86] Sanity read client unavailable — returning empty unavailable list")
    return NextResponse.json({ unavailable: [] as string[] })
  }

  const unavailable = await client.fetch<string[]>(
    `*[_type == "menuItem" && available == false]._id`
  )

  return NextResponse.json({ unavailable: unavailable ?? [] })
}

export async function POST(req: NextRequest) {
  const { itemId }: { itemId: string } = await req.json()

  const readClient  = getSanityReadClient()
  const writeClient = getSanityWriteClient()

  if (!readClient || !writeClient) {
    console.warn("[86] Sanity client unavailable — toggle not persisted")
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
  }

  // Fetch the current availability so we can flip it
  const current = await readClient.fetch<boolean | null>(
    `*[_type == "menuItem" && _id == $itemId][0].available`,
    { itemId }
  )

  // If the item doesn't exist in Sanity yet, default to treating it as available
  // and mark it unavailable (i.e. "86 it" on first press).
  const newAvailable = current === false   // false → true (un-86), anything else → false (86)

  await writeClient
    .patch(itemId)
    .set({ available: newAvailable })
    .commit()

  return NextResponse.json({ itemId, unavailable: !newAvailable })
}
