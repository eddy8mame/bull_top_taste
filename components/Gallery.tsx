import type { LocationImage } from "@/lib/sanity"

// Emoji placeholders used when no gallery images are in Sanity yet.
const PLACEHOLDER_SLOTS = [
  { label: "Jerk Chicken", emoji: "🍗" },
  { label: "Curry Goat", emoji: "🍲" },
  { label: "Ackee & Saltfish", emoji: "🍳" },
  { label: "Oxtail", emoji: "🥩" },
  { label: "Festival", emoji: "🫓" },
  { label: "Rice & Peas", emoji: "🍚" },
  { label: "The Team", emoji: "👨‍🍳" },
  { label: "Our Kitchen", emoji: "🔥" },
  { label: "The Restaurant", emoji: "🏠" },
]

interface Props {
  images?: LocationImage[]
  instagram?: string
}

export default function Gallery({ images, instagram }: Props) {
  const hasImages = images && images.length > 0
  const igUrl = instagram ?? "https://www.instagram.com/bulltoptasterestaurant/"

  return (
    <section id="gallery" className="bg-brand-green px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-10 text-center font-serif text-4xl text-white">Gallery</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hasImages
            ? images.map((img, i) => (
                <div
                  key={i}
                  className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-white/10"
                >
                  <img
                    src={img.url}
                    alt={img.alt ?? `Gallery photo ${i + 1}`}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {img.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                      <span className="text-sm font-medium text-white">{img.caption}</span>
                    </div>
                  )}
                </div>
              ))
            : PLACEHOLDER_SLOTS.map(({ label, emoji }) => (
                <div
                  key={label}
                  className="flex aspect-[4/3] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-white/10 text-white/70"
                >
                  <span className="text-4xl">{emoji}</span>
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-white/40">Photo placeholder</span>
                </div>
              ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href={igUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-green inline-block rounded border-2 border-white px-8 py-3 text-sm font-bold tracking-widest text-white uppercase transition-all hover:bg-white"
          >
            Feast Your Eyes →
          </a>
        </div>
      </div>
    </section>
  )
}
