import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (password !== process.env.OFFICE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set("office_token", process.env.OFFICE_SECRET ?? "", {
    httpOnly: true,
    sameSite: "lax",
    maxAge:   60 * 60 * 8,  // 8 hours
    path:     "/",
  })
  return res
}
