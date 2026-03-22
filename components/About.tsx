import type { LocationFull } from "@/lib/sanity"

const DEFAULTS = {
  heading: "About Us",
  subheading: "Our Story",
  body: [
    "Welcome to Bull Top Taste Jamaican Restaurant, our location in Royal Palm Beach, where the vibrant flavors of Jamaica come to life on your plate.",
    "Immerse yourself in the true essence of the island as we take pride in serving real authentic Jamaican dishes. From the moment you step through our doors, you\u2019ll be transported to the sunny beaches and lush landscapes of Jamaica, with every delectable bite you take.",
    "Our talented chefs use traditional recipes handed down through generations, infusing each dish with the unique blend of spices and seasonings that make Jamaican cuisine so irresistible. From jerk chicken and oxtail to ackee and saltfish \u2014 our menu is filled with mouthwatering options that will satisfy your cravings and awaken your taste buds.",
  ],
}

interface Props {
  location?: LocationFull | null
}

export default function About({ location }: Props) {
  const about = location?.aboutSection
  const heading = about?.heading ?? DEFAULTS.heading
  const subheading = about?.subheading ?? DEFAULTS.subheading
  const imageUrl = about?.imageUrl
  const bgUrl = about?.backgroundUrl

  // Sanity body is a single text block; split on double-newlines for paragraphs.
  // Falls back to the hardcoded default paragraphs.
  const paragraphs = about?.body ? about.body.split(/\n\n+/).filter(Boolean) : DEFAULTS.body

  return (
    <section
      id="about"
      className="relative px-6 py-20"
      style={{
        backgroundColor: bgUrl ? undefined : "white",
        ...(bgUrl
          ? {
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
      }}
    >
      {bgUrl && <div className="pointer-events-none absolute inset-0 bg-white/90" />}

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        {/* Text */}
        <div>
          <p className="text-brand-muted mb-1 text-xs font-bold tracking-widest uppercase">
            {subheading}
          </p>
          <div className="bg-brand-green mb-4 h-0.5 w-10" />
          <h2 className="text-brand-green mb-6 font-serif text-4xl">{heading}</h2>

          {paragraphs.map((p, i) => (
            <p
              key={i}
              className={`leading-relaxed text-gray-700 ${i < paragraphs.length - 1 ? "mb-4" : ""}`}
            >
              {p}
            </p>
          ))}
        </div>

        {/* Photo — Sanity image or placeholder */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 shadow-lg">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={heading}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="bg-brand-charcoal/90 absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white/60">
              <span className="text-4xl">📸</span>
              <span className="font-semibold">Staff / Restaurant Photo</span>
              <span className="text-xs text-white/40">Replace with actual image in Sanity</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
