import type { LocationFull } from "@/lib/sanity"

const DEFAULTS = {
  heading:    "About Us",
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
  const about      = location?.aboutSection
  const heading    = about?.heading    ?? DEFAULTS.heading
  const subheading = about?.subheading ?? DEFAULTS.subheading
  const imageUrl   = about?.imageUrl
  const bgUrl      = about?.backgroundUrl

  // Sanity body is a single text block; split on double-newlines for paragraphs.
  // Falls back to the hardcoded default paragraphs.
  const paragraphs = about?.body
    ? about.body.split(/\n\n+/).filter(Boolean)
    : DEFAULTS.body

  return (
    <section
      id="about"
      className="py-20 px-6 relative"
      style={{
        backgroundColor: bgUrl ? undefined : "white",
        ...(bgUrl
          ? { backgroundImage: `url(${bgUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : {}),
      }}
    >
      {bgUrl && <div className="absolute inset-0 bg-white/90 pointer-events-none" />}

      <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Text */}
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-brand-muted mb-1">
            {subheading}
          </p>
          <div className="w-10 h-0.5 bg-brand-green mb-4" />
          <h2 className="font-serif text-4xl text-brand-green mb-6">{heading}</h2>

          {paragraphs.map((p, i) => (
            <p key={i} className={`text-gray-700 leading-relaxed ${i < paragraphs.length - 1 ? "mb-4" : ""}`}>
              {p}
            </p>
          ))}
        </div>

        {/* Photo — Sanity image or placeholder */}
        <div className="rounded-2xl overflow-hidden shadow-lg bg-gray-100 aspect-[4/3] relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={heading}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-charcoal/90 text-white/60 text-sm text-center p-6 gap-2">
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
