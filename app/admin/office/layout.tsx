// Transparent passthrough — all chrome is provided by app/admin/layout.tsx.
// The separate header that was here duplicated the brand bar on the Office page.
export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
