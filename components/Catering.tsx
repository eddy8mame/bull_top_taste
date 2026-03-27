// components/Catering.tsx

const CATERING_EMAIL = "info@bulltoptaste.com"
const CATERING_PHONE = "5617958440"
const CATERING_PHONE_DISPLAY = "561.795.8440"

const FEATURES = [
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
      >
        <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3" />
        <rect x="9" y="11" width="14" height="10" rx="2" />
        <circle cx="16" cy="16" r="1" />
      </svg>
    ),
    title: "Islandwide Delivery",
    body:
      "From office gatherings to family reunions, we bring the heat to your doorstep with care.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: "Heritage Service",
    body:
      "Our team handles every event with the same secret spices passed down through generations.",
  },
]

export default function Catering() {
  return (
    <section id="catering" className="overflow-hidden bg-gray-50 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 items-start">

          {/* Left — heading, features, CTAs */}
          <div>
            <p className="text-brand-green mb-2 text-xs font-black uppercase tracking-widest">
              Catering & Events
            </p>
            <h2 className="font-serif text-5xl font-bold text-gray-900 mb-10 leading-tight md:text-6xl">
              Catering with<br />Authenticity.
            </h2>

            <div className="space-y-8 mb-12">
              {FEATURES.map(f => (
                <div key={f.title} className="flex items-start gap-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-gold to-[#FEB615] text-gray-900 shadow-md">
                    {f.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-1">
                      {f.title}
                    </h4>
                    <p className="text-gray-500 leading-relaxed">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <a
                href={`mailto:${CATERING_EMAIL}`}
                className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-brand-green to-brand-green-dark px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-md transition-opacity hover:opacity-90 active:scale-95"
              >
                Email Us
              </a>
              <a
                href={`tel:${CATERING_PHONE}`}
                className="inline-flex items-center gap-2 rounded-md border-2 border-brand-green px-6 py-3.5 text-xs font-black uppercase tracking-widest text-brand-green transition-colors hover:bg-brand-green hover:text-white active:scale-95"
              >
                {CATERING_PHONE_DISPLAY}
              </a>
            </div>
          </div>

          {/* Right — decorative image with "Since 2011" badge */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/20 to-brand-green/10 -skew-x-3 scale-105 rounded-2xl -z-10" />
            <div className="aspect-[4/5] overflow-hidden rounded-2xl shadow-2xl relative">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-green/80 to-brand-green-dark/90 flex items-center justify-center">
                <div className="text-center text-white px-8">
                  <span className="font-serif italic text-3xl leading-snug block opacity-90">
                    &ldquo;Bringing the taste of Jamaica to every table since 2011.&rdquo;
                  </span>
                </div>
              </div>
            </div>

            {/* Since 2011 badge */}
            <div className="absolute -top-6 -right-6 z-20 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-gold to-[#FEB615] shadow-xl">
              <span className="text-center text-xs font-black uppercase leading-tight tracking-tighter text-gray-900">
                Since<br />2011
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}