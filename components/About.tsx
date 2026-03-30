// components/About.tsx
import Image from "next/image"

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

  const paragraphs = about?.body ? about.body.split(/\n\n+/).filter(Boolean) : DEFAULTS.body

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

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
        {/* Text */}
        <div>
          <p className="text-brand-green mb-2 text-xs font-black tracking-widest uppercase">
            {subheading}
          </p>
          <h2 className="mb-8 font-serif text-5xl leading-tight font-bold text-gray-900 md:text-6xl">
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
          <div className="bg-brand-green/5 absolute inset-0 -z-10 scale-105 -rotate-3 rounded-3xl" />
          <div className="relative aspect-4/5 overflow-hidden rounded-2xl border-8 border-white shadow-2xl">
            {" "}
            {imageUrl ? (
              <Image src={imageUrl} alt={heading} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gray-100 p-8 text-center">
                <span className="text-5xl">📸</span>
                <span className="font-serif text-xl font-bold text-gray-400">Restaurant Photo</span>
                <span className="text-sm text-gray-400">Add an image in Sanity Studio</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
