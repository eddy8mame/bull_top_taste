// components/Location.tsx
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
    <section id="location" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-12">
          <p className="text-brand-green mb-1 text-xs font-bold tracking-widest uppercase">
            Find Us
          </p>
          <h2 className="font-serif text-5xl font-bold text-gray-900 md:text-6xl">Come Visit Us</h2>
        </div>

        {/* Map — full width with overlaid address card */}
        <div
          className="relative w-full overflow-hidden rounded-3xl"
          style={{
            height: "450px",
            boxShadow: "0 8px 24px rgba(24,29,25,0.06)",
            border: "8px solid white",
          }}
        >
          <iframe
            title={`Map — ${name}`}
            src={embedSrc}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />

          {/* Overlaid address card */}
          <div
            className="absolute bottom-6 left-6 rounded-xl border border-gray-100 bg-white p-6 shadow-lg"
            style={{ maxWidth: "280px" }}
          >
            <h3 className="text-brand-green mb-1 font-serif text-xl font-bold">{name}</h3>
            <p className="mb-4 text-sm leading-relaxed text-gray-500">{address}</p>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-green flex items-center gap-1.5 text-xs font-black tracking-widest uppercase hover:underline"
            >
              Get Directions
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>

        {/* Hours + Contact row */}
        <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3">
          {/* Hours */}
          <div className="md:col-span-2">
            <p className="mb-4 text-xs font-black tracking-widest text-gray-400 uppercase">
              Hours of Operation
            </p>
            <div className="space-y-2">
              {hours.map(({ days, time }) => (
                <div key={days} className="flex justify-between gap-4 text-sm">
                  <span className="text-gray-500">{days}</span>
                  <span className="text-right font-semibold text-gray-900">{time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact + Social */}
          <div>
            <p className="mb-4 text-xs font-black tracking-widest text-gray-400 uppercase">
              Contact
            </p>
            <div className="mb-6 space-y-2 text-sm">
              <a
                href={`tel:${phoneDialable}`}
                className="hover:text-brand-green flex items-center gap-2 font-medium text-gray-700 transition-colors"
              >
                {phone}
              </a>
              <a
                href={`mailto:${email}`}
                className="hover:text-brand-green flex items-center gap-2 font-medium text-gray-700 transition-colors"
              >
                {email}
              </a>
            </div>

            <p className="mb-3 text-xs font-black tracking-widest text-gray-400 uppercase">
              Follow Us
            </p>
            <div className="flex gap-3">
              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="hover:border-brand-green hover:text-brand-green flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold transition-colors"
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
                  className="hover:border-brand-green hover:text-brand-green flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold transition-colors"
                >
                  <FacebookIcon /> Facebook
                </a>
              )}
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
      width="14"
      height="14"
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}
