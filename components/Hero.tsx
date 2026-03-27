// components/Hero.tsx

import type { LocationFull } from "@/lib/sanity"

const DEFAULTS = {
  label: "Royal Palm Beach's Best Jamaican Restaurant",
  headline: "Island Flavors,\nElevated.",
  subheadline:
    "Experience the heritage of Jamaica through our chef-curated traditional dishes, prepared with patience and passion.",
  primaryCta: "View the Menu",
  quote: "The taste of Jamaica, right here in Royal Palm Beach.",
}

interface Props {
  location?: LocationFull | null
}

export default function Hero({ location }: Props) {
  const label = location?.heroLabel ?? DEFAULTS.label
  const headline = location?.heroHeadline ?? DEFAULTS.headline
  const subheadline = location?.heroSubheadline ?? DEFAULTS.subheadline
  const bgUrl = location?.heroBackgroundUrl
  const quote = location?.tagline ?? DEFAULTS.quote

  return (
    <section className="relative overflow-hidden bg-white px-6 py-16 lg:py-0">
      <div className="mx-auto max-w-7xl grid grid-cols-12 gap-8 items-center lg:min-h-[870px]">

        {/* Left column — text */}
        <div className="col-span-12 lg:col-span-6 z-10 py-16">
          <span className="inline-block py-2 px-4 bg-gradient-to-r from-brand-gold to-[#FEB615] text-gray-900 font-black text-xs tracking-widest uppercase mb-6 rounded-sm shadow-md">
            {label}
          </span>

          <h1 className="font-serif text-7xl md:text-8xl lg:text-9xl text-brand-green leading-[0.9] mb-8 font-bold whitespace-pre-line">
            {headline.split("\\n").map((line, i, arr) => (
              <span key={i}>
                {i === arr.length - 1 ? (
                  <span className="italic font-normal text-gray-900">{line}</span>
                ) : (
                  line
                )}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </h1>

          <p className="text-xl md:text-2xl text-gray-500 max-w-lg mb-12 leading-relaxed">
            {subheadline}
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="#menu"
              className="inline-block rounded-md bg-gradient-to-r from-brand-green to-brand-green-dark px-10 py-5 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-opacity hover:opacity-90 active:scale-95"
            >
              View the Menu
            </a>
            <a
              href="#about"
              className="inline-block rounded-md border-2 border-brand-green px-10 py-5 text-sm font-black uppercase tracking-widest text-brand-green transition-all hover:bg-brand-green hover:text-white active:scale-95"
            >
              Our Story
            </a>
          </div>
        </div>

        {/* Right column — hero image */}
        <div className="col-span-12 lg:col-span-6 relative min-h-[400px] lg:min-h-[600px]">
          {/* Rotated accent */}
          <div className="absolute inset-0 bg-brand-green/5 rounded-3xl -rotate-3 translate-x-4 translate-y-4" />

          {/* Image */}
          <div className="relative z-10 w-full h-full min-h-[400px] lg:min-h-[600px] rounded-3xl overflow-hidden shadow-2xl border-[12px] border-white">
            {bgUrl ? (
              <img
                src={bgUrl}
                alt={headline}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-brand-green/20 to-brand-green-dark/40 flex items-center justify-center">
                <span className="text-6xl opacity-40">🍽️</span>
              </div>
            )}
          </div>

          {/* Floating quote card */}
          <div className="absolute -bottom-8 -left-8 z-20 bg-gradient-to-br from-brand-gold to-[#FEB615] p-6 rounded-xl shadow-xl max-w-[240px]">
            <p className="font-serif italic text-xl text-gray-900 leading-snug">
              &ldquo;{quote}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}