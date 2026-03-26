//components/Nav.tsx

"use client"

import { useEffect, useState } from "react"

import Link from "next/link"

import type { LocationFull } from "@/lib/sanity"

import { useCart } from "@/context/CartContext"

interface Props {
  location?: LocationFull | null
}

export default function Nav({ location }: Props) {
  const { count, setIsOpen } = useCart()

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const restaurantName = location?.restaurantName ?? "Bull Top Taste"
  const logoUrl = location?.logoUrl

  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center justify-between gap-4 border-b border-gray-100 bg-white px-6">
      {/* Branding — Sanity logo image or text fallback */}
      <Link href="/" className="flex shrink-0 items-center gap-2">
        {logoUrl ? (
          <img src={logoUrl} alt={restaurantName} className="h-9 w-auto object-contain" />
        ) : (
          <span className="text-brand-green font-serif text-xl leading-none font-bold tracking-wide">
            {restaurantName}
          </span>
        )}
      </Link>

      {/* Nav links — Menu → Reservations → Locations → Our Story */}
      <ul className="hidden list-none gap-7 md:flex">
        {[
          { href: "#menu", label: "Menu" },
          { href: "#reservation", label: "Reservations" },
          { href: "#location", label: "Locations" },
          { href: "#about", label: "Our Story" },
        ].map(({ href, label }) => (
          <li key={label}>
            <a
              href={href}
              className="hover:text-brand-green text-sm font-medium text-gray-700 transition-colors"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>

      {/* Right side — CTAs only (social icons moved to Footer) */}
      <div className="flex shrink-0 items-center gap-3">
        {/* Order Online (primary — appears first) */}
        <button
          onClick={() => setIsOpen(true)}
          className="bg-brand-green hover:bg-brand-green-dark relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
        >
          {/* <span>🛒</span> */}
          <span>Order Online</span>
          {/* 3. Hydration fix: Only render the badge if mounted */}
          {isMounted && count > 0 && (
            <span className="bg-brand-gold text-brand-dark absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold">
              {count}
            </span>
          )}
        </button>

        {/* Delivery CTA (secondary) */}
        {/* <a
          href={uberEatsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-brand-tertiary hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 lg:inline-flex"
        >
          <span>🛵</span>
          <span>Delivery</span>
        </a> */}
      </div>
    </nav>
  )
}
