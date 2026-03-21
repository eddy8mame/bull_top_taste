"use client"

import Link              from "next/link"
import { useCart }       from "@/context/CartContext"
import type { LocationFull } from "@/lib/sanity"

interface Props {
  location?: LocationFull | null
}

export default function Nav({ location }: Props) {
  const { count, setIsOpen } = useCart()

  const uberEatsUrl      = location?.uberEatsUrl ?? process.env.NEXT_PUBLIC_UBEREATS_URL ?? "https://www.ubereats.com"
  const restaurantName   = location?.restaurantName ?? "Bull Top Taste"
  const logoUrl          = location?.logoUrl

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 flex items-center justify-between px-6 h-16 gap-4">

      {/* Branding — Sanity logo image or text fallback */}
      <Link href="/" className="shrink-0 flex items-center gap-2">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={restaurantName}
            className="h-9 w-auto object-contain"
          />
        ) : (
          <span className="font-serif text-brand-green text-xl font-bold tracking-wide leading-none">
            {restaurantName}
          </span>
        )}
      </Link>

      {/* Nav links — Menu → Reservations → Locations → Our Story */}
      <ul className="hidden md:flex gap-7 list-none">
        {[
          { href: "#menu",        label: "Menu"         },
          { href: "#reservation", label: "Reservations" },
          { href: "#location",    label: "Locations"    },
          { href: "#about",       label: "Our Story"    },
        ].map(({ href, label }) => (
          <li key={label}>
            <a href={href}
               className="text-gray-700 text-sm font-medium hover:text-brand-green transition-colors">
              {label}
            </a>
          </li>
        ))}
      </ul>

      {/* Right side — CTAs only (social icons moved to Footer) */}
      <div className="flex items-center gap-3 shrink-0">

        {/* Order Online (primary — appears first) */}
        <button onClick={() => setIsOpen(true)}
           className="relative flex items-center gap-2 bg-brand-green text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-green-dark transition-colors">
          <span>🛒</span>
          <span>Order Online</span>
          {count > 0 && (
            <span className="absolute -top-2 -right-2 bg-brand-gold text-brand-dark text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {count}
            </span>
          )}
        </button>

        {/* Delivery CTA (secondary) */}
        <a href={uberEatsUrl} target="_blank" rel="noopener noreferrer"
           className="hidden lg:inline-flex items-center gap-1.5 bg-brand-tertiary text-white text-sm font-semibold px-3 py-2 rounded-lg hover:opacity-90 transition-opacity">
          <span>🛵</span>
          <span>Delivery</span>
        </a>
      </div>
    </nav>
  )
}
