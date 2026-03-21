import type { LocationImage } from "@/lib/sanity"

// Emoji placeholders used when no gallery images are in Sanity yet.
const PLACEHOLDER_SLOTS = [
  { label: "Jerk Chicken",     emoji: "🍗" },
  { label: "Curry Goat",       emoji: "🍲" },
  { label: "Ackee & Saltfish", emoji: "🍳" },
  { label: "Oxtail",           emoji: "🥩" },
  { label: "Festival",         emoji: "🫓" },
  { label: "Rice & Peas",      emoji: "🍚" },
  { label: "The Team",         emoji: "👨‍🍳" },
  { label: "Our Kitchen",      emoji: "🔥" },
  { label: "The Restaurant",   emoji: "🏠" },
]

interface Props {
  images?:    LocationImage[]
  instagram?: string
}

export default function Gallery({ images, instagram }: Props) {
  const hasImages  = images && images.length > 0
  const igUrl      = instagram ?? "https://www.instagram.com/bulltoptasterestaurant/"

  return (
    <section id="gallery" className="bg-brand-green py-20 px-6">
      <div className="max-w-6xl mx-auto">

        <h2 className="font-serif text-4xl text-white text-center mb-10">Gallery</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hasImages
            ? images.map((img, i) => (
                <div key={i} className="rounded-xl overflow-hidden aspect-[4/3] bg-white/10 relative group">
                  <img
                    src={img.url}
                    alt={img.alt ?? `Gallery photo ${i + 1}`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {img.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                      <span className="text-white text-sm font-medium">{img.caption}</span>
                    </div>
                  )}
                </div>
              ))
            : PLACEHOLDER_SLOTS.map(({ label, emoji }) => (
                <div key={label}
                  className="rounded-xl overflow-hidden aspect-[4/3] bg-white/10 flex flex-col items-center justify-center gap-2 text-white/70">
                  <span className="text-4xl">{emoji}</span>
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-white/40">Photo placeholder</span>
                </div>
              ))
          }
        </div>

        <div className="text-center mt-10">
          <a href={igUrl} target="_blank" rel="noopener noreferrer"
            className="inline-block border-2 border-white text-white font-bold text-sm tracking-widest uppercase px-8 py-3 rounded hover:bg-white hover:text-brand-green transition-all">
            Feast Your Eyes →
          </a>
        </div>

      </div>
    </section>
  )
}
