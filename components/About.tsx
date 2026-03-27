// components/About.tsx

import type { LocationFull } from "@/lib/sanity"

const DEFAULTS = {
  heading: "About Us",
  subheading: "Our Story",
  body: [
    "Welcome to Bull Top Taste Jamaican Restaurant, our location in Royal Palm Beach, where the vibrant flavors of Jamaica come to life on your plate.",
    "Immerse yourself in the true essence of the island as we take pride in serving real authentic Jamaican dishes. From the moment you step through our doors, you'll be transported to the sunny beaches and lush landscapes of Jamaica, with every delectable bite you take.",
    "Our talented chefs use traditional recipes handed down through generations, infusing each dish with the unique blend of spices and seasonings that make Jamaican cuisine so irresistible. From jerk chicken and oxtail to ackee and saltfish — our menu is filled with mouthwatering options that will satisfy your cravings and awaken your taste buds.",
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

  const paragraphs = about?.body
    ? about.body.split(/\n\n+/).filter(Boolean)
    : DEFAULTS.body

  return (
    <section
      id="about"
      className="relative overflow-hidden px-6 py-24"
      style={
        bgUrl
          ? {
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { backgroundColor: "white" }
      }
    >
      {bgUrl && <div className="pointer-events-none absolute inset-0 bg-white/90" />}

      <div className="relative mx-auto max-w-6xl grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        {/* Text */}
        <div>
          <p className="text-brand-green mb-2 text-xs font-black uppercase tracking-widest">
            {subheading}
          </p>
          <h2 className="font-serif text-5xl font-bold text-gray-900 mb-8 leading-tight md:text-6xl">
            {heading}
          </h2>
          <div className="space-y-5">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-lg leading-relaxed text-gray-600">
                {p}
              </p>
            ))}
          </div>
        </div>

        {/* Image */}
        <div className="relative">
          <div className="absolute inset-0 bg-brand-green/5 -rotate-3 scale-105 rounded-3xl -z-10" />
          <div className="aspect-[4/5] overflow-hidden rounded-2xl shadow-2xl border-8 border-white">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={heading}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gray-100 text-center p-8">
                <span className="text-5xl">📸</span>
                <span className="font-serif text-xl font-bold text-gray-400">
                  Restaurant Photo
                </span>
                <span className="text-sm text-gray-400">
                  Add an image in Sanity Studio
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
