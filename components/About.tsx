export default function About() {
  return (
    <section id="about" className="bg-white py-20 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Text */}
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-brand-muted mb-1">
            Our Story
          </p>
          <div className="w-10 h-0.5 bg-brand-green mb-4" />
          <h2 className="font-serif text-4xl text-brand-green mb-6">About Us</h2>

          <p className="text-gray-700 leading-relaxed mb-4">
            Welcome to Bull Top Taste Jamaican Restaurant, our location in Royal Palm Beach,
            where the vibrant flavors of Jamaica come to life on your plate.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Immerse yourself in the true essence of the island as we take pride in serving
            real authentic Jamaican dishes. From the moment you step through our doors,
            you&apos;ll be transported to the sunny beaches and lush landscapes of Jamaica,
            with every delectable bite you take.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Our talented chefs use traditional recipes handed down through generations,
            infusing each dish with the unique blend of spices and seasonings that make
            Jamaican cuisine so irresistible. From jerk chicken and oxtail to ackee and
            saltfish — our menu is filled with mouthwatering options that will satisfy
            your cravings and awaken your taste buds.
          </p>
        </div>

        {/* Photo */}
        <div className="rounded-2xl overflow-hidden shadow-lg bg-gray-100 aspect-[4/3] relative">
          {/* Staff photo placeholder — replace src with actual staff image */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-charcoal/90 text-white/60 text-sm text-center p-6 gap-2">
            <span className="text-4xl">📸</span>
            <span className="font-semibold">Staff / Restaurant Photo</span>
            <span className="text-xs text-white/40">Replace with actual image in Sanity</span>
          </div>
        </div>

      </div>
    </section>
  )
}
