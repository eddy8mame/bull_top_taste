const reviews = [
  { text: "You need to shoot for the oxtail. 100% would go back and tell everyone I know.", author: "Robert W." },
  { text: "Perfect authentic Jamaican Caribbean food. Lots of it and the friendliest staff. Period.", author: "Jill W." },
  { text: "Had the jerk chicken with rice and beans. Extremely worth the money and great size for lunch.", author: "Debbie K." },
  { text: "Food taste very delicious, everything down to the bone. Staff very professional.", author: "Glenford H." },
]

export default function Testimonials() {
  return (
    <section className="bg-brand-dark py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <p className="text-brand-gold text-xs font-bold tracking-widest uppercase mb-1">What People Say</p>
        <h2 className="font-serif text-4xl text-white mb-3">Our Guests Love It</h2>

        <div className="flex items-center gap-3 mb-8">
          <span className="font-serif text-5xl text-brand-gold">4.8</span>
          <div className="text-white/60 text-sm">out of 5<br/>339 reviews</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reviews.map(r => (
            <div key={r.author}
                 className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-brand-gold tracking-widest mb-3">★★★★★</p>
              <p className="text-white/80 text-sm leading-relaxed mb-4">&ldquo;{r.text}&rdquo;</p>
              <p className="text-white/40 text-xs font-semibold">— {r.author}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
