import { NextRequest, NextResponse }  from "next/server"
import { getSanityReadClient, getSanityWriteClient } from "@/lib/sanity"
import { cookies }                   from "next/headers"

// Kitchen open/close state is stored on the `location` Sanity document as a
// `kitchenOpen` boolean. This persists across Vercel cold starts.
//
// SANITY_LOCATION_ID must be set to the Sanity _id of the location document
// (e.g. the UUID generated when the location doc was first saved in Studio).

const LOCATION_ID = process.env.SANITY_LOCATION_ID

// GET /api/kitchen — public; polled by the menu page for the Kitchen Closed banner.
export async function GET() {
  if (!LOCATION_ID) {
    // No location configured — assume kitchen is open
    return NextResponse.json({ open: true })
  }

  const client = getSanityReadClient()
  if (!client) {
    return NextResponse.json({ open: true })
  }

  const kitchenOpen = await client.fetch<boolean | null>(
    `*[_type == "location" && _id == $id][0].kitchenOpen`,
    { id: LOCATION_ID }
  )

  // Treat null (field not yet set on the document) as open
  return NextResponse.json({ open: kitchenOpen ?? true })
}

// POST /api/kitchen — staff-only; requires admin_token cookie.
// Body: { open: boolean } for explicit set, or empty body to toggle.
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_token")?.value
  if (token !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!LOCATION_ID) {
    return NextResponse.json({ error: "SANITY_LOCATION_ID is not configured" }, { status: 500 })
  }

  const readClient  = getSanityReadClient()
  const writeClient = getSanityWriteClient()
  if (!readClient || !writeClient) {
    console.warn("[kitchen] Sanity clients unavailable — state not persisted")
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))

  let newOpen: boolean
  if (typeof body.open === "boolean") {
    newOpen = body.open
  } else {
    // Toggle: read current value then flip
    const current = await readClient.fetch<boolean | null>(
      `*[_type == "location" && _id == $id][0].kitchenOpen`,
      { id: LOCATION_ID }
    )
    newOpen = !(current ?? true)
  }

  await writeClient
    .patch(LOCATION_ID)
    .set({ kitchenOpen: newOpen })
    .commit()

  return NextResponse.json({ open: newOpen })
}
