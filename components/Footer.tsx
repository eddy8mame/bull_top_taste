import type { LocationFull } from "@/lib/sanity"

interface Props {
  location?: LocationFull | null
}

export default function Footer({ location }: Props) {
  const restaurantName = location?.restaurantName ?? "Bull Top Taste Jamaican Restaurant"
  const address = location?.address ?? "1172 Royal Palm Beach Blvd, Royal Palm Beach, FL 33411"
  const phone = location?.phone ?? "561.795.8440"
  const phoneDialable = location?.phoneDialable ?? "5617958440"
  const email = location?.email ?? "info@bulltoptaste.com"
  const instagram = location?.instagram ?? "https://www.instagram.com/bulltoptasterestaurant/"
  const facebook = location?.facebook ?? "https://www.facebook.com/bulltoptaste/"

  return (
    <footer className="border-t border-white/10 bg-[#031109] px-6 py-12 text-white/50">
      <div className="mx-auto max-w-5xl space-y-5 text-center">
        {/* Brand name */}
        <p className="font-serif text-lg font-medium text-white">{restaurantName}</p>

        {/* Contact info */}
        <p className="text-sm">
          {address}
          &nbsp;·&nbsp;
          <a href={`tel:${phoneDialable}`} className="text-brand-gold hover:underline">
            {phone}
          </a>
          &nbsp;·&nbsp;
          <a href={`mailto:${email}`} className="text-brand-gold hover:underline">
            {email}
          </a>
        </p>

        {/* Social icons */}
        <div className="flex items-center justify-center gap-3">
          <a
            href={facebook}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20"
          >
            <FacebookIcon />
          </a>
          <a
            href={instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20"
          >
            <InstagramIcon />
          </a>
          <a
            href="https://www.tiktok.com/@bulltoptaste"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20"
          >
            <TikTokIcon />
          </a>
        </div>

        {/* Copyright */}
        <p className="text-xs text-white/30">
          © {new Date().getFullYear()} {restaurantName}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

// ─── Social SVG icons (moved from Nav.tsx) ──────────────────────────────────

function FacebookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
    </svg>
  )
}
