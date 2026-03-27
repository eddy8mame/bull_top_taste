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
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md shadow-sm">
      <div className="mx-auto ">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Branding */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={restaurantName} className="h-9 w-auto object-contain" />
            ) : (
              <span className="font-serif text-xl font-bold italic text-brand-green leading-none">
                {restaurantName}
              </span>
            )}
          </Link>

          {/* Nav links */}
          <ul className="hidden list-none gap-8 md:flex">
            {[
              { href: "#menu", label: "Menu" },
              { href: "#reservation", label: "Reservations" },
              { href: "#location", label: "Locations" },
              { href: "#about", label: "Our Story" },
            ].map(({ href, label }) => (
              <li key={label}>
                <a
                  href={href}
                  className="text-xs font-black uppercase tracking-widest text-gray-700 transition-colors hover:text-brand-green"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={() => setIsOpen(true)}
              className="relative flex items-center gap-2 rounded-md bg-gradient-to-r from-brand-green to-brand-green-dark px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-md transition-opacity hover:opacity-90 active:scale-95"
            >
              <span>Order Online</span>
              {isMounted && count > 0 && (
                <span className="bg-brand-gold text-brand-dark absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
