"use client"

import { useCart }           from "@/context/CartContext"
import type { SiteSettings } from "@/types"

interface Props {
  settings?: SiteSettings | null
}

export default function Nav({ settings }: Props) {
  const { count, setIsOpen } = useCart()

  const uberEatsUrl = settings?.uberEatsUrl ?? process.env.NEXT_PUBLIC_UBEREATS_URL ?? "https://www.ubereats.com"
  const instagram   = settings?.instagram   ?? "https://www.instagram.com/bulltoptasterestaurant/"
  const facebook    = settings?.facebook    ?? "https://www.facebook.com/bulltoptaste/"

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 flex items-center justify-between px-6 h-16 gap-4">

      {/* Logo */}
      <a href="#" className="shrink-0 flex items-center gap-2">
        <span className="font-serif text-brand-green text-xl font-bold tracking-wide leading-none">
          Bull Top Taste
        </span>
      </a>

      {/* Nav links */}
      <ul className="hidden md:flex gap-7 list-none">
        {[
          { href: "#",         label: "Home"      },
          { href: "#about",    label: "About"     },
          { href: "#gallery",  label: "Gallery"   },
          { href: "#location", label: "Locations" },
          { href: "#contact",  label: "Contact"   },
        ].map(({ href, label }) => (
          <li key={label}>
            <a href={href}
               className="text-gray-700 text-sm font-medium hover:text-brand-green transition-colors">
              {label}
            </a>
          </li>
        ))}
      </ul>

      {/* Right side — socials + CTAs */}
      <div className="flex items-center gap-3 shrink-0">

        {/* Social icons */}
        <div className="hidden sm:flex items-center gap-2">
          <a href={facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
             className="w-8 h-8 rounded-full bg-[#1877f2] text-white flex items-center justify-center hover:opacity-90 transition-opacity">
            <FacebookIcon />
          </a>
          <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
             className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] text-white flex items-center justify-center hover:opacity-90 transition-opacity">
            <InstagramIcon />
          </a>
          <a href="https://www.tiktok.com/@bulltoptaste" target="_blank" rel="noopener noreferrer" aria-label="TikTok"
             className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:opacity-80 transition-opacity">
            <TikTokIcon />
          </a>
        </div>

        {/* Delivery CTA */}
        <a href={uberEatsUrl} target="_blank" rel="noopener noreferrer"
           className="hidden lg:inline-flex items-center gap-1.5 bg-[#06C167] text-white text-sm font-semibold px-3 py-2 rounded-lg hover:opacity-90 transition-opacity">
          <span>🛵</span>
          <span>Delivery</span>
        </a>

        {/* Order pickup */}
        <button onClick={() => setIsOpen(true)}
           className="relative flex items-center gap-2 bg-brand-green text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-green-dark transition-colors">
          <span>🛒</span>
          <span>Order Pickup</span>
          {count > 0 && (
            <span className="absolute -top-2 -right-2 bg-brand-gold text-brand-dark text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {count}
            </span>
          )}
        </button>
      </div>
    </nav>
  )
}

function FacebookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
    </svg>
  )
}
