import type { Metadata }           from "next"
import { Inter, Playfair_Display } from "next/font/google"
import { CartProvider }             from "@/context/CartContext"
import { getSiteSettings }          from "@/lib/sanity"
import "./globals.css"

const inter = Inter({
  subsets:  ["latin"],
  variable: "--font-inter",
})

const playfair = Playfair_Display({
  subsets:  ["latin"],
  variable: "--font-playfair",
  weight:   ["400", "700"],
})

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  return {
    title: s?.metaTitle
      ?? "Bull Top Taste – Authentic Jamaican Restaurant | Royal Palm Beach",
    description: s?.metaDescription
      ?? "Royal Palm Beach's best Jamaican restaurant. Authentic jerk chicken, oxtail, ackee & saltfish, and more. Order online for pickup.",
    keywords: ["Jamaican restaurant", "Royal Palm Beach", "jerk chicken", "oxtail", "authentic Caribbean food"],
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Build CSS that overrides Tailwind's @theme inline utilities at runtime.
// Because @theme inline bakes color values into utility classes, we inject
// explicit class rules AFTER the stylesheet so they win the cascade.
// We prefix with `html` to ensure higher specificity than Tailwind's rules.
function buildColorCss(primary?: string, dark?: string, accent?: string): string {
  const rules: string[] = []

  if (primary) {
    rules.push(
      `html .bg-brand-green { background-color: ${primary}; }`,
      `html .text-brand-green { color: ${primary}; }`,
      `html .border-brand-green { border-color: ${primary}; }`,
      `html .from-brand-green { --tw-gradient-from: ${primary}; }`,
      `html .via-brand-green { --tw-gradient-via: ${primary}; }`,
      `html .hover\\:bg-brand-green:hover { background-color: ${primary}; }`,
      `html .hover\\:border-brand-green:hover { border-color: ${primary}; }`,
      `html .focus\\:border-brand-green:focus { border-color: ${primary}; }`,
    )
  }

  if (dark) {
    rules.push(
      `html .bg-brand-green-dark { background-color: ${dark}; }`,
      `html .from-brand-green-dark { --tw-gradient-from: ${dark}; }`,
      `html .via-brand-green-dark { --tw-gradient-via: ${dark}; }`,
      `html .to-brand-green-dark { --tw-gradient-to: ${dark}; }`,
      `html .hover\\:bg-brand-green-dark:hover { background-color: ${dark}; }`,
    )
  }

  if (accent) {
    rules.push(
      `html .bg-brand-gold { background-color: ${accent}; }`,
      `html .text-brand-gold { color: ${accent}; }`,
      `html .border-brand-gold { border-color: ${accent}; }`,
      `html .border-b-2.border-brand-gold { border-bottom-color: ${accent}; }`,
      `html .hover\\:bg-brand-gold:hover { background-color: ${accent}; }`,
    )
  }

  return rules.join("\n")
}

// Fonts: Tailwind's font utilities reference CSS custom properties via var(),
// so we can override --font-inter / --font-playfair in :root and it propagates.
function buildFontCss(serifFont?: string, sansFont?: string): string {
  const rules: string[] = []
  if (serifFont) rules.push(`  --font-playfair: '${serifFont}', serif;`)
  if (sansFont)  rules.push(`  --font-inter: '${sansFont}', sans-serif;`)
  return rules.length ? `:root {\n${rules.join("\n")}\n}` : ""
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSiteSettings()

  const colorCss = buildColorCss(s?.primaryColor, s?.primaryDarkColor, s?.accentColor)
  const fontCss  = buildFontCss(s?.serifFont, s?.sansFont)
  const customCss = [colorCss, fontCss].filter(Boolean).join("\n")

  // Google Fonts for client-specified custom fonts
  const fontFamilies: string[] = []
  if (s?.serifFont) fontFamilies.push(`family=${encodeURIComponent(s.serifFont)}:ital,wght@0,400;0,700;1,400`)
  if (s?.sansFont)  fontFamilies.push(`family=${encodeURIComponent(s.sansFont)}:wght@400;500;600`)
  const googleFontsUrl = fontFamilies.length > 0
    ? `https://fonts.googleapis.com/css2?${fontFamilies.join("&")}&display=swap`
    : null

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        {googleFontsUrl && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="stylesheet" href={googleFontsUrl} />
          </>
        )}
        {customCss && (
          <style dangerouslySetInnerHTML={{ __html: customCss }} />
        )}
      </head>
      <body className="antialiased">
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  )
}
