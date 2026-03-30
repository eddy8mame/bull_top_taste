//components/Nav.tsx

"use client"

import { useEffect, useState } from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"

import type { LocationFull } from "@/lib/sanity"

import { useCart } from "@/context/CartContext"

interface Props {
  location?: LocationFull | null
}

export default function Nav({ location }: Props) {
  const { count, setIsOpen } = useCart()

  const [isMounted, setIsMounted] = useState(false)
  const [activeSection, setActiveSection] = useState<string>("")
  const pathname = usePathname()
  const isHome = pathname === "/"

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const sectionIds = ["menu", "location", "catering", "about"]
    const observers: IntersectionObserver[] = []

    sectionIds.forEach(id => {
      const el = document.getElementById(id)
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id)
        },
        { rootMargin: "-40% 0px -55% 0px" }
      )
      observer.observe(el)
      observers.push(observer)
    })

    return () => observers.forEach(o => o.disconnect())
  }, [])

  const restaurantName = location?.restaurantName ?? "Bull Top Taste"
  const logoUrl = location?.logoUrl

  return (
    <nav
      className="sticky top-0 z-50 border-b border-gray-100 shadow-sm backdrop-blur-md"
      style={{ backgroundColor: "rgba(250, 250, 247, 0.9)" }}
    >
      {" "}
      <div className="mx-auto">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Branding */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={restaurantName} className="h-9 w-auto object-contain" />
            ) : (
              <span className="text-brand-green font-serif text-xl leading-none font-bold italic">
                {restaurantName}
              </span>
            )}
          </Link>

          {/* Nav links */}
          <ul className="hidden list-none gap-8 md:flex">
            {[
              { hash: "menu", label: "Menu", id: "menu" },
              { hash: "location", label: "Location", id: "location" },
              { hash: "catering", label: "Catering", id: "catering" },
              { hash: "about", label: "Our Story", id: "about" },
            ].map(({ hash, label, id }) => {
              const href = isHome ? `#${hash}` : `/#${hash}`
              const isActive = isHome && activeSection === id
              return (
                <li key={label}>
                  <a
                    href={href}
                    className="relative text-xs font-black tracking-widest uppercase transition-colors"
                    style={{ color: isActive ? "#1A803C" : undefined }}
                  >
                    <span className={isActive ? "" : "hover:text-brand-green text-gray-700"}>
                      {label}
                    </span>
                    {isActive && (
                      <span
                        className="absolute right-0 -bottom-1 left-0 h-0.5 rounded-full"
                        style={{ backgroundColor: "#1A803C" }}
                      />
                    )}
                  </a>
                </li>
              )
            })}
          </ul>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={() => setIsOpen(true)}
              className="from-brand-green to-brand-green-dark relative flex items-center gap-2 rounded-md bg-linear-to-r px-5 py-2.5 text-xs font-black tracking-widest text-white uppercase shadow-md transition-opacity hover:opacity-90 active:scale-95"
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
