import type { HoursEntry } from "@/types"

import type { LocationFull } from "@/lib/sanity"

const DEFAULT_HOURS: HoursEntry[] = [
  { days: "Monday – Saturday", time: "9:00 am – 10:00 pm" },
  { days: "Sunday", time: "9:00 am – 8:00 pm" },
  { days: "Lunch Specials", time: "11:00 am – 2:00 pm (daily)" },
]

const DEFAULTS = {
  name: "Bull Top Taste Jamaican Restaurant",
  address: "1172 Royal Palm Beach Blvd, Royal Palm Beach, FL 33411",
  mapsQuery: "1172 Royal Palm Beach Blvd Royal Palm Beach FL 33411",
  phone: "561.795.8440",
  phoneDialable: "5617958440",
  email: "info@bulltoptaste.com",
  instagram: "https://www.instagram.com/bulltoptasterestaurant/",
  facebook: "https://www.facebook.com/bulltoptaste/",
}

interface Props {
  location?: LocationFull | null
}

export default function Location({ location }: Props) {
  const name = location?.restaurantName ?? DEFAULTS.name
  const address = location?.address ?? DEFAULTS.address
  const phone = location?.phone ?? DEFAULTS.phone
  const phoneDialable = location?.phoneDialable ?? DEFAULTS.phoneDialable
  const email = location?.email ?? DEFAULTS.email
  const instagram = location?.instagram ?? DEFAULTS.instagram
  const facebook = location?.facebook ?? DEFAULTS.facebook
  const hours = location?.hours?.length ? location.hours : DEFAULT_HOURS

  const mapsQuery = encodeURIComponent(address || DEFAULTS.mapsQuery)
  const embedSrc = `https://maps.google.com/maps?q=${mapsQuery}&output=embed&z=15`
  const directionsUrl = `https://maps.google.com/?q=${mapsQuery}`

  return (
    <section id="location" className="bg-white px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <p className="text-brand-green mb-1 text-xs font-bold tracking-widest uppercase">Find Us</p>
        <h2 className="mb-2 font-serif text-4xl">Location</h2>
        <p className="text-brand-muted mb-10 max-w-lg leading-relaxed">
          Dine in, carry out, or order online — we&apos;re right in Royal Palm Beach.
        </p>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          {/* Map embed */}
          <div className="aspect-video overflow-hidden rounded-xl border border-gray-100 shadow-sm lg:aspect-auto lg:h-80">
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
              <p className="text-brand-muted mb-1 text-xs font-bold tracking-widest uppercase">
                Address
              </p>
              <p className="font-serif text-lg">{name}</p>
              <p className="text-brand-muted text-sm">{address}</p>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-green mt-1 inline-block text-sm font-semibold hover:underline"
              >
                Get Directions →
              </a>
            </div>

            <div>
              <p className="text-brand-muted mb-2 text-xs font-bold tracking-widest uppercase">
                Hours
              </p>
              <div className="space-y-1">
                {hours.map(({ days, time }) => (
                  <div key={days} className="flex justify-between gap-4 text-sm">
                    <span className="text-brand-muted">{days}</span>
                    <span className="text-right font-medium">{time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-brand-muted mb-2 text-xs font-bold tracking-widest uppercase">
                Contact
              </p>
              <div className="space-y-1 text-sm">
                <p>
                  <a
                    href={`tel:${phoneDialable}`}
                    className="hover:text-brand-green transition-colors"
                  >
                    📞 {phone}
                  </a>
                </p>
                <p>
                  <a href={`mailto:${email}`} className="hover:text-brand-green transition-colors">
                    ✉️ {email}
                  </a>
                </p>
              </div>
            </div>

            <div>
              <p className="text-brand-muted mb-3 text-xs font-bold tracking-widest uppercase">
                Follow Us
              </p>
              <div className="flex gap-3">
                {instagram && (
                  <a
                    href={instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="hover:border-brand-green hover:text-brand-green flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium transition-colors"
                  >
                    <InstagramIcon /> Instagram
                  </a>
                )}
                {facebook && (
                  <a
                    href={facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="hover:border-brand-green hover:text-brand-green flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium transition-colors"
                  >
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
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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
