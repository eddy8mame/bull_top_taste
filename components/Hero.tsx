import type { LocationFull } from "@/lib/sanity"

const DEFAULTS = {
  label: "Royal Palm Beach's Best Jamaican Restaurant",
  headline: "Bull Top Taste\nJamaican Restaurant",
  subheadline:
    "From our kitchen to your table — traditional recipes, real spices, and the warmth of the island in every bite.",
  primaryCta: "View Our Menu",
  secondaryCta: "Our Story",
}

interface Props {
  location?: LocationFull | null
}

export default function Hero({ location }: Props) {
  const label = location?.heroLabel ?? DEFAULTS.label
  const headline = location?.heroHeadline ?? DEFAULTS.headline
  const subheadline = location?.heroSubheadline ?? DEFAULTS.subheadline
  // const primaryCta = location?.heroPrimaryCtaText ?? DEFAULTS.primaryCta
  // const secondaryCta = location?.heroSecondaryCtaText ?? DEFAULTS.secondaryCta
  const bgUrl = location?.heroBackgroundUrl

  return (
    <section
      className="relative overflow-hidden px-6 py-12 text-center text-white md:py-24"
      style={{
        backgroundColor: "#3d3d3d",
        ...(bgUrl
          ? {
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
      }}
    >
      {/* Dark overlay when using a background image (ensures text readability) */}
      {bgUrl && <div className="pointer-events-none absolute inset-0 bg-black/50" />}

      {/* Subtle texture overlay (visible when no bg image) */}
      {!bgUrl && (
        <div
          className="pointer-events-none absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
      )}

      <div className="relative z-10 mx-auto max-w-3xl">
        <span className="text-brand-gold mb-6 inline-block text-xs font-bold tracking-widest uppercase">
          {label}
        </span>

        <h1 className="mb-4 font-serif text-5xl leading-tight whitespace-pre-line md:text-7xl">
          {headline}
        </h1>

        <p className="text-brand-gold text-lg font-semibold md:text-xl">{subheadline}</p>

        {/* <div className="flex flex-wrap justify-center gap-4">
          <a
            href="#menu"
            className="bg-brand-gold text-brand-dark rounded px-8 py-3.5 text-sm font-bold tracking-wide uppercase transition-opacity hover:opacity-90"
          >
            {primaryCta}
          </a>
          <a
            href="#about"
            className="rounded border border-white/60 px-8 py-3.5 text-sm font-bold tracking-wide text-white uppercase transition-all hover:border-white hover:bg-white/5"
          >
            {secondaryCta}
          </a>
        </div> */}

        {/* Scroll indicator */}
        {/* <div className="mt-8 animate-bounce text-xl text-white/30">↓</div> */}
      </div>
    </section>
  )
}
