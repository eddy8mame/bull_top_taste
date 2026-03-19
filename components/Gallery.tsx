// Gallery photo slots — replace placeholder src values with actual images.
// In production, wire these through Sanity (a "gallery" document type works well).

const SLOTS = [
  { label: "Jerk Chicken",   emoji: "🍗" },
  { label: "Curry Goat",     emoji: "🍲" },
  { label: "Ackee & Saltfish", emoji: "🍳" },
  { label: "Oxtail",         emoji: "🥩" },
  { label: "Festival",       emoji: "🫓" },
  { label: "Rice & Peas",    emoji: "🍚" },
  { label: "The Team",       emoji: "👨‍🍳" },
  { label: "Our Kitchen",    emoji: "🔥" },
  { label: "The Restaurant", emoji: "🏠" },
]

export default function Gallery() {
  return (
    <section id="gallery" style={{ backgroundColor: "#2db82d" }} className="py-20 px-6">
      <div className="max-w-6xl mx-auto">

        <h2 className="font-serif text-4xl text-white text-center mb-10">Gallery</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SLOTS.map(({ label, emoji }) => (
            <div key={label}
              className="rounded-xl overflow-hidden aspect-[4/3] bg-white/10 flex flex-col items-center justify-center gap-2 text-white/70">
              <span className="text-4xl">{emoji}</span>
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-white/40">Photo placeholder</span>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <a href="https://www.instagram.com/bulltoptasterestaurant/" target="_blank" rel="noopener noreferrer"
            className="inline-block border-2 border-white text-white font-bold text-sm tracking-widest uppercase px-8 py-3 rounded hover:bg-white hover:text-brand-green transition-all">
            Feast Your Eyes →
          </a>
        </div>

      </div>
    </section>
  )
}
