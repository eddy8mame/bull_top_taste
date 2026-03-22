import type { Metadata } from "next"
import {
  Cormorant_Garamond,
  // ── Midnight ────────────────────────────────────────────────────────────────
  DM_Sans,
  // ── Tropical (default) ──────────────────────────────────────────────────────
  Inter,
  Lora,
  Merriweather,
  // ── Spice ───────────────────────────────────────────────────────────────────
  Nunito,
  // ── Ocean ───────────────────────────────────────────────────────────────────
  Outfit,
  Playfair_Display,
} from "next/font/google"

import { getLocationBySlug } from "@/lib/sanity"

import { CartProvider } from "@/context/CartContext"

import "./globals.css"

// ─── Font definitions ─────────────────────────────────────────────────────────
// All eight fonts are loaded at build time. next/font sets each one as a CSS
// custom property on whichever element receives the .variable className.
// Applying all variable classNames to <html> makes every font available to the
// [data-theme="..."] blocks in globals.css, which resolve --theme-font-sans /
// --theme-font-serif by pointing at the appropriate font variable.

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "700"],
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
})

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["300", "400", "600", "700"],
  display: "swap",
})

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
})

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  weight: ["400", "700"],
  display: "swap",
})

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
})

const merriweather = Merriweather({
  subsets: ["latin"],
  variable: "--font-merriweather",
  weight: ["400", "700"],
  display: "swap",
})

// All variable classNames combined — applied to <html> so every CSS custom
// property is registered in the cascade before [data-theme] blocks resolve.
const FONT_VARIABLES = [
  inter.variable,
  playfair.variable,
  dmSans.variable,
  cormorant.variable,
  nunito.variable,
  lora.variable,
  outfit.variable,
  merriweather.variable,
].join(" ")

// ─── Location slug ────────────────────────────────────────────────────────────
// TODO: derive this from the request hostname in a middleware-based multi-tenant
// setup. Hardcoded for local development; swap to dynamic resolution in prod.
const LOCATION_SLUG = "bull-top-taste-rpb"

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const loc = await getLocationBySlug(LOCATION_SLUG)
  return {
    title: loc?.metaTitle ?? "Bull Top Taste – Authentic Jamaican Restaurant | Royal Palm Beach",
    description:
      loc?.metaDescription ??
      "Royal Palm Beach's best Jamaican restaurant. Authentic jerk chicken, oxtail, ackee & saltfish, and more. Order online for pickup.",
    keywords: [
      "Jamaican restaurant",
      "Royal Palm Beach",
      "jerk chicken",
      "oxtail",
      "authentic Caribbean food",
    ],
  }
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const loc = await getLocationBySlug(LOCATION_SLUG)
  const theme = loc?.theme ?? "tropical"

  return (
    <html lang="en" data-theme={theme} className={FONT_VARIABLES}>
      <body className="antialiased">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  )
}
