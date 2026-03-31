//components/Nav.tsx

"use client"

import { useEffect, useState } from "react";



import Link from "next/link";
import { usePathname } from "next/navigation";



import type { LocationFull } from "@/lib/sanity";



import { useCart } from "@/context/CartContext";


























































































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
          <ul className="hidden list-none gap-12 md:flex">
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
                    className="group relative text-xs font-black tracking-widest uppercase transition-colors"
                    style={{ color: isActive ? "#1A803C" : undefined }}
                  >
                    <span className={isActive ? "" : "hover:text-brand-green text-gray-700"}>
                      {label}
                    </span>
                    {/* Active underline — solid green */}
                    {isActive && (
                      <span
                        className="absolute right-0 -bottom-1 left-0 h-0.5 rounded-full"
                        style={{ backgroundColor: "#1A803C" }}
                      />
                    )}
                    {/* Hover underline — lighter, only when not active */}
                    {!isActive && (
                      <span className="bg-brand-green/30 absolute right-0 -bottom-1 left-0 h-0.5 rounded-full opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                    )}
                  </a>
                </li>
              )
            })}
          </ul>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-3">
            {/* Cart icon — desktop only, visible when items in cart */}
            {isMounted && count > 0 && (
              <button
                onClick={() => setIsOpen(true)}
                aria-label={`View cart — ${count} item${count !== 1 ? "s" : ""}`}
                className="relative hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-gray-100 md:flex"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-brand-green h-5 w-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="bg-brand-cart-badge absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white">
                  {count}
                </span>
              </button>
            )}
            <button
              onClick={() => setIsOpen(true)}
              className="from-brand-green to-brand-green-dark relative flex items-center gap-2 rounded-md bg-linear-to-r px-5 py-2.5 text-xs font-black tracking-widest text-white uppercase shadow-md transition-opacity hover:opacity-90 active:scale-95"
            >
              Order Online
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
