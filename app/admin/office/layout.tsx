export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-brand-dark border-b border-white/10 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
          <span className="font-serif text-brand-gold text-lg">Bull Top Taste</span>
          <span className="text-white/30 text-sm">Office</span>
        </div>
        <a href="/" className="text-white/40 text-xs hover:text-white/70 transition-colors">
          ← Back to site
        </a>
      </header>
      {children}
    </div>
  )
}
