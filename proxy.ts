import { NextRequest, NextResponse } from "next/server"

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ─── Office routes — management only ────────────────────────────────────────
  if (pathname.startsWith("/admin/office") && !pathname.startsWith("/admin/office/login")) {
    const token = req.cookies.get("office_token")?.value
    if (token !== process.env.OFFICE_SECRET) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = "/admin/office/login"
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // ─── Staff routes — kitchen + floor ─────────────────────────────────────────
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = req.cookies.get("admin_token")?.value
    if (token !== process.env.ADMIN_SECRET) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = "/admin/login"
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
