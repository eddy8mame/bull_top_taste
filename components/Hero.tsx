// components/Hero.tsx
import Image from "next/image"

import type { LocationFull } from "@/lib/sanity"

const DEFAULTS = {
  label: "Royal Palm Beach's Best Jamaican Restaurant",
  headline: "Island Flavors,\nElevated.",
}

interface Props {
  location?: LocationFull | null
}

export default function Hero({ location }: Props) {
  const label = location?.heroLabel ?? DEFAULTS.label
  const headline = location?.heroHeadline ?? DEFAULTS.headline

  return (
    <section className="relative overflow-hidden">
      {/* Asymmetrical gold gradient bleed */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: "linear-gradient(165deg, #FFE500 0%, #FEB615 100%)",
          clipPath: "polygon(0 0, 100% 0, 100% 85%, 0% 100%)",
        }}
      />

      <div className="mx-auto max-w-7xl px-6 py-16 md:py-24 lg:px-20">
        <div className="flex flex-col items-center gap-12 md:flex-row">
          {/* Left column */}
          <div className="md:w-1/2">
            <span className="bg-brand-green mb-4 inline-block rounded px-4 py-1.5 text-xs font-black tracking-[0.2em] text-white uppercase">
              {label}
            </span>
            <h1 className="mb-8 font-serif text-5xl leading-tight font-bold text-gray-900 md:text-7xl">
              {headline.split("\n").map((line, i, arr) => (
                <span key={i}>
                  {i === arr.length - 1 ? (
                    <span className="text-brand-green italic">{line}</span>
                  ) : (
                    line
                  )}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </h1>
            <a
              href="/menu"
              className="inline-block rounded-md bg-gray-900 px-10 py-4 text-sm font-black tracking-widest text-white uppercase shadow-xl transition-all hover:bg-gray-700 active:scale-95"
            >
              View Menu
            </a>
          </div>

          {/* Right column — styrofoam card placeholder */}
          <div className="flex justify-center md:w-1/2">
            <div
              className="w-full max-w-sm rotate-3 p-4 transition-transform duration-500 hover:rotate-0"
              style={{
                background: "#fdfdfd",
                boxShadow: "inset 0 0 10px rgba(0,0,0,0.03), 2px 2px 5px rgba(0,0,0,0.1)",
                border: "1px solid #eee",
                borderRadius: "8px",
              }}
            >
              <div
                className="mb-0 rounded"
                style={{
                  padding: "12px",
                  background: "#f0f0f0",
                  boxShadow: "inset 0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                {location?.heroBackgroundUrl ? (
                  <div className="relative h-80 w-full overflow-hidden rounded">
                    <Image
                      src={location.heroBackgroundUrl}
                      alt={location.restaurantName ?? "Hero image"}
                      fill
                      priority
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-80 w-full items-center justify-center rounded bg-gray-200 shadow-inner">
                    <span className="text-5xl opacity-30">🍽️</span>
                  </div>
                )}
              </div>
              <div className="p-4 text-center">
                <span className="font-serif text-2xl font-bold text-gray-900 italic">
                  Bull Top Taste
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
