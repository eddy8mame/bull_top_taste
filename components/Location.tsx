import type { SiteSettings, HoursEntry } from "@/types"

const DEFAULT_HOURS: HoursEntry[] = [
  { days: "Monday – Saturday", time: "9:00 am – 10:00 pm" },
  { days: "Sunday",            time: "9:00 am – 8:00 pm"  },
  { days: "Lunch Specials",    time: "11:00 am – 2:00 pm (daily)" },
]

const DEFAULTS = {
  name:         "Bull Top Taste Jamaican Restaurant",
  address:      "1172 Royal Palm Beach Blvd, Royal Palm Beach, FL 33411",
  mapsQuery:    "1172 Royal Palm Beach Blvd Royal Palm Beach FL 33411",
  phone:        "561.795.8440",
  phoneDialable: "5617958440",
  email:        "info@bulltoptaste.com",
  instagram:    "https://www.instagram.com/bulltoptasterestaurant/",
  facebook:     "https://www.facebook.com/bulltoptaste/",
}

interface Props {
  settings?: SiteSettings | null
}

export default function Location({ settings }: Props) {
  const name         = settings?.restaurantName ?? DEFAULTS.name
  const address      = settings?.address        ?? DEFAULTS.address
  const phone        = settings?.phone          ?? DEFAULTS.phone
  const phoneDialable = settings?.phoneDialable  ?? DEFAULTS.phoneDialable
  const email        = settings?.email          ?? DEFAULTS.email
  const instagram    = settings?.instagram      ?? DEFAULTS.instagram
  const facebook     = settings?.facebook       ?? DEFAULTS.facebook
  const hours        = settings?.hours?.length  ? settings.hours : DEFAULT_HOURS

  const mapsQuery  = encodeURIComponent(address || DEFAULTS.mapsQuery)
  const embedSrc   = `https://maps.google.com/maps?q=${mapsQuery}&output=embed&z=15`
  const directionsUrl = `https://maps.google.com/?q=${mapsQuery}`

  return (
    <section id="location" className="bg-white py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <p className="text-brand-green text-xs font-bold tracking-widest uppercase mb-1">Find Us</p>
        <h2 className="font-serif text-4xl mb-2">Location</h2>
        <p className="text-brand-muted max-w-lg leading-relaxed mb-10">
          Dine in, carry out, or order online — we&apos;re right in Royal Palm Beach.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* Map embed */}
          <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm aspect-video lg:aspect-auto lg:h-80">
            <iframe
              title={`Map — ${name}`}
              src={embedSrc}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* Details */}
          <div className="flex flex-col gap-6">

            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-muted mb-1">Address</p>
              <p className="font-serif text-lg">{name}</p>
              <p className="text-brand-muted text-sm">{address}</p>
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
                 className="text-brand-green text-sm font-semibold mt-1 inline-block hover:underline">
                Get Directions →
              </a>
            </div>

            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-muted mb-2">Hours</p>
              <div className="space-y-1">
                {hours.map(({ days, time }) => (
                  <div key={days} className="flex justify-between text-sm gap-4">
                    <span className="text-brand-muted">{days}</span>
                    <span className="font-medium text-right">{time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-muted mb-2">Contact</p>
              <div className="space-y-1 text-sm">
                <p><a href={`tel:${phoneDialable}`} className="hover:text-brand-green transition-colors">📞 {phone}</a></p>
                <p><a href={`mailto:${email}`}      className="hover:text-brand-green transition-colors">✉️ {email}</a></p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-muted mb-3">Follow Us</p>
              <div className="flex gap-3">
                {instagram && (
                  <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                     className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-brand-green hover:text-brand-green transition-colors">
                    <InstagramIcon /> Instagram
                  </a>
                )}
                {facebook && (
                  <a href={facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                     className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-brand-green hover:text-brand-green transition-colors">
                    <FacebookIcon /> Facebook
                  </a>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}
