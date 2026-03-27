// components/Testimonials.tsx

const reviews = [
  {
    text: "You need to shoot for the oxtail. 100% would go back and tell everyone I know.",
    author: "Robert W.",
    label: "Loyal Regular",
  },
  {
    text: "Perfect authentic Jamaican Caribbean food. Lots of it and the friendliest staff. Period.",
    author: "Jill W.",
    label: "Community Favorite",
  },
  {
    text: "Had the jerk chicken with rice and beans. Extremely worth the money and great size for lunch.",
    author: "Debbie K.",
    label: "Lunch Enthusiast",
  },
  {
    text: "Food taste very delicious, everything down to the bone. Staff very professional.",
    author: "Glenford H.",
    label: "Longtime Guest",
  },
]

// ── Swap this data source for a Google Places API fetch in the future ─────────
// async function fetchGoogleReviews(placeId: string) {
//   const res = await fetch(
//     `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${process.env.GOOGLE_PLACES_API_KEY}`
//   )
//   const data = await res.json()
//   return data.result?.reviews ?? []
// }

export default function Testimonials() {
  return (
    <section className="bg-gray-50 px-6 py-24" id="reviews">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-brand-green mb-1 text-xs font-bold tracking-widest uppercase">
              What People Say
            </p>
            <h2 className="font-serif text-5xl font-bold text-gray-900 md:text-6xl">
              Voices from the Community
            </h2>
          </div>
          <div className="flex shrink-0 items-baseline gap-3">
            <span className="text-brand-green font-serif text-5xl font-bold">4.8</span>
            <div className="text-sm leading-snug text-gray-500">
              out of 5<br />
              339 Google reviews
            </div>
          </div>
        </div>

        {/* Review cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reviews.map(r => (
            <div
              key={r.author}
              className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-8"
              style={{ boxShadow: "0 8px 24px rgba(24,29,25,0.06)" }}
            >
              <div>
                <div className="text-brand-green mb-5 flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-5 w-5"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                </div>
                <p className="mb-6 font-serif text-xl leading-snug text-gray-900 italic">
                  &ldquo;{r.text}&rdquo;
                </p>
              </div>
              <div>
                <p className="text-brand-green text-xs font-black tracking-widest uppercase">
                  — {r.author}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">{r.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
