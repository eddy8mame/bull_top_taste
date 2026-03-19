import type { SiteSettings, HoursEntry } from "@/types"

const DEFAULT_HOURS: HoursEntry[] = [
  { days: "Monday – Saturday", time: "9:00 am – 10:00 pm" },
  { days: "Sunday",            time: "9:00 am – 8:00 pm"  },
  { days: "Lunch Specials",    time: "11:00 am – 2:00 pm (daily)" },
]

const DEFAULTS = {
  address:      "1172 Royal Palm Beach Blvd, Royal Palm Beach, FL 33411",
  phone:        "561.795.8440",
  phoneDialable: "5617958440",
  email:        "info@bulltoptaste.com",
}

interface Props {
  settings?: SiteSettings | null
}

export default function Hours({ settings }: Props) {
  const hours        = settings?.hours?.length ? settings.hours : DEFAULT_HOURS
  const address      = settings?.address       ?? DEFAULTS.address
  const phone        = settings?.phone         ?? DEFAULTS.phone
  const phoneDialable = settings?.phoneDialable ?? DEFAULTS.phoneDialable
  const email        = settings?.email         ?? DEFAULTS.email

  return (
    <section id="contact" className="bg-white py-20 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Hours + Contact */}
        <div>
          <p className="text-brand-green text-xs font-bold tracking-widest uppercase mb-1">Find Us</p>
          <h2 className="font-serif text-4xl mb-6">Hours &amp; Contact</h2>

          <div className="mb-8">
            <h4 className="font-serif text-lg border-b-2 border-brand-gold inline-block pb-1 mb-3">
              Hours of Operation
            </h4>
            {hours.map(({ days, time }) => (
              <div key={days} className="flex justify-between py-2.5 border-b border-gray-50 text-sm">
                <span className="text-brand-muted">{days}</span>
                <span className="font-semibold">{time}</span>
              </div>
            ))}
          </div>

          <div>
            <h4 className="font-serif text-lg border-b-2 border-brand-gold inline-block pb-1 mb-3">
              Get in Touch
            </h4>
            {[
              { icon: "📍", text: address },
              { icon: "📞", text: phone, href: `tel:${phoneDialable}` },
              { icon: "✉️", text: email, href: `mailto:${email}` },
            ].map(({ icon, text, href }) => (
              <div key={text} className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center text-base shrink-0">
                  {icon}
                </div>
                {href
                  ? <a href={href} className="text-sm hover:text-brand-green transition-colors">{text}</a>
                  : <span className="text-sm">{text}</span>
                }
              </div>
            ))}
          </div>
        </div>

        {/* Catering CTA */}
        <div>
          <h4 className="font-serif text-2xl mb-3">Catering &amp; Private Events</h4>
          <p className="text-brand-muted text-sm leading-relaxed mb-5">
            Let Bull Top Taste cater your next event — from corporate gatherings to intimate celebrations.
            We&apos;ll build a custom menu tailored to your preferences and dietary needs.
          </p>
          <a href="#reservations"
             className="inline-block bg-brand-gold text-brand-dark font-semibold px-6 py-3 rounded-lg text-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
            Inquire About Catering
          </a>
        </div>
      </div>
    </section>
  )
}
