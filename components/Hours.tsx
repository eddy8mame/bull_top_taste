import type { HoursEntry, SiteSettings } from "@/types"

const DEFAULT_HOURS: HoursEntry[] = [
  { days: "Monday – Saturday", time: "9:00 am – 10:00 pm" },
  { days: "Sunday", time: "9:00 am – 8:00 pm" },
  { days: "Lunch Specials", time: "11:00 am – 2:00 pm (daily)" },
]

const DEFAULTS = {
  address: "1172 Royal Palm Beach Blvd, Royal Palm Beach, FL 33411",
  phone: "561.795.8440",
  phoneDialable: "5617958440",
  email: "info@bulltoptaste.com",
}

interface Props {
  settings?: SiteSettings | null
}

export default function Hours({ settings }: Props) {
  const hours = settings?.hours?.length ? settings.hours : DEFAULT_HOURS
  const address = settings?.address ?? DEFAULTS.address
  const phone = settings?.phone ?? DEFAULTS.phone
  const phoneDialable = settings?.phoneDialable ?? DEFAULTS.phoneDialable
  const email = settings?.email ?? DEFAULTS.email

  return (
    <section id="contact" className="bg-white px-6 py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 md:grid-cols-2">
        {/* Hours + Contact */}
        <div>
          <p className="text-brand-green mb-1 text-xs font-bold tracking-widest uppercase">
            Find Us
          </p>
          <h2 className="mb-6 font-serif text-4xl">Hours &amp; Contact</h2>

          <div className="mb-8">
            <h4 className="border-brand-gold mb-3 inline-block border-b-2 pb-1 font-serif text-lg">
              Hours of Operation
            </h4>
            {hours.map(({ days, time }) => (
              <div
                key={days}
                className="flex justify-between border-b border-gray-50 py-2.5 text-sm"
              >
                <span className="text-brand-muted">{days}</span>
                <span className="font-semibold">{time}</span>
              </div>
            ))}
          </div>

          <div>
            <h4 className="border-brand-gold mb-3 inline-block border-b-2 pb-1 font-serif text-lg">
              Get in Touch
            </h4>
            {[
              { icon: "📍", text: address },
              { icon: "📞", text: phone, href: `tel:${phoneDialable}` },
              { icon: "✉️", text: email, href: `mailto:${email}` },
            ].map(({ icon, text, href }) => (
              <div key={text} className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-base">
                  {icon}
                </div>
                {href ? (
                  <a href={href} className="hover:text-brand-green text-sm transition-colors">
                    {text}
                  </a>
                ) : (
                  <span className="text-sm">{text}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Catering CTA */}
        <div>
          <h4 className="mb-3 font-serif text-2xl">Catering &amp; Private Events</h4>
          <p className="text-brand-muted mb-5 text-sm leading-relaxed">
            Let Bull Top Taste cater your next event — from corporate gatherings to intimate
            celebrations. We&apos;ll build a custom menu tailored to your preferences and dietary
            needs.
          </p>
          <a
            href="#reservations"
            className="bg-brand-gold text-brand-dark inline-block rounded-lg px-6 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            Inquire About Catering
          </a>
        </div>
      </div>
    </section>
  )
}
