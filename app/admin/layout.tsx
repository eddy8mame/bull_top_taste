// Admin layout — minimal shell.
// The topbar is rendered inside page.tsx (and office/page.tsx) so that each
// view controls its own background, nav state, and clock independently.
// This file's only job is to import the isolated CSS layer and provide the
// .admin-shell scope that all admin CSS rules are scoped to.
import "./admin.css"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      {children}
    </div>
  )
}
