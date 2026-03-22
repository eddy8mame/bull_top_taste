const reviews = [
  {
    text: "You need to shoot for the oxtail. 100% would go back and tell everyone I know.",
    author: "Robert W.",
  },
  {
    text: "Perfect authentic Jamaican Caribbean food. Lots of it and the friendliest staff. Period.",
    author: "Jill W.",
  },
  {
    text: "Had the jerk chicken with rice and beans. Extremely worth the money and great size for lunch.",
    author: "Debbie K.",
  },
  {
    text: "Food taste very delicious, everything down to the bone. Staff very professional.",
    author: "Glenford H.",
  },
]

export default function Testimonials() {
  return (
    <section className="bg-brand-dark px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-brand-gold mb-1 text-xs font-bold tracking-widest uppercase">
          What People Say
        </p>
        <h2 className="mb-3 font-serif text-4xl text-white">Our Guests Love It</h2>

        <div className="mb-8 flex items-center gap-3">
          <span className="text-brand-gold font-serif text-5xl">4.8</span>
          <div className="text-sm text-white/60">
            out of 5<br />
            339 reviews
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reviews.map(r => (
            <div key={r.author} className="rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="text-brand-gold mb-3 tracking-widest">★★★★★</p>
              <p className="mb-4 text-sm leading-relaxed text-white/80">&ldquo;{r.text}&rdquo;</p>
              <p className="text-xs font-semibold text-white/40">— {r.author}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
