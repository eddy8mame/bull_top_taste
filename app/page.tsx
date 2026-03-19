import { getMenuItems, getActiveSpecials, getSiteSettings } from "@/lib/sanity"
import Nav            from "@/components/Nav"
import Hero           from "@/components/Hero"
import About          from "@/components/About"
import Menu           from "@/components/Menu"
import Gallery        from "@/components/Gallery"
import Catering       from "@/components/Catering"
import Testimonials   from "@/components/Testimonials"
import Location       from "@/components/Location"
import ReservationForm from "@/components/ReservationForm"
import Cart           from "@/components/Cart"

export const revalidate = 3600  // ISR: revalidate CMS content every hour

export default async function Home() {
  const [items, specials, settings] = await Promise.all([
    getMenuItems(),
    getActiveSpecials(),
    getSiteSettings(),
  ])

  const restaurantName = settings?.restaurantName ?? "Bull Top Taste Jamaican Restaurant"
  const address        = settings?.address        ?? "1172 Royal Palm Beach Blvd, Royal Palm Beach, FL 33411"
  const phone          = settings?.phone          ?? "561.795.8440"
  const phoneDialable  = settings?.phoneDialable  ?? "5617958440"
  const email          = settings?.email          ?? "info@bulltoptaste.com"

  return (
    <>
      <Nav  settings={settings} />
      <Cart settings={settings} />
      <main>
        <Hero           settings={settings} />
        <About />
        <Menu           items={items} specials={specials} />
        <Gallery />
        <Catering />
        <Testimonials />
        <Location       settings={settings} />
        <ReservationForm />
      </main>
      <footer style={{ backgroundColor: "#3d3d3d" }} className="text-white/50 text-center py-8 text-sm border-t border-white/10">
        <p className="mb-2">
          <span className="text-white font-medium">{restaurantName}</span>
        </p>
        <p className="mb-1">
          {address}
          &nbsp;·&nbsp;<a href={`tel:${phoneDialable}`} className="text-brand-gold hover:underline">{phone}</a>
          &nbsp;·&nbsp;<a href={`mailto:${email}`}      className="text-brand-gold hover:underline">{email}</a>
        </p>
        <p className="mt-3 text-white/30">© {new Date().getFullYear()} {restaurantName}. All rights reserved.</p>
      </footer>
    </>
  )
}
