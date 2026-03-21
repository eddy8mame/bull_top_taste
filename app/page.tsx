import { getMenuItems, getActiveSpecials, getLocationFull } from "@/lib/sanity"
import Nav            from "@/components/Nav"
import Hero           from "@/components/Hero"
import Menu           from "@/components/Menu"
import Location       from "@/components/Location"
import About          from "@/components/About"
import Gallery        from "@/components/Gallery"
import Catering       from "@/components/Catering"
import Testimonials   from "@/components/Testimonials"
import ReservationForm from "@/components/ReservationForm"
import Footer         from "@/components/Footer"
import Cart           from "@/components/Cart"

export const revalidate = 3600  // ISR: revalidate CMS content every hour

// Default slug — single-location fallback. In multi-tenant mode, this would
// come from the URL or a middleware-injected header.
const DEFAULT_SLUG = process.env.SANITY_LOCATION_SLUG ?? "bull-top-taste-royal-palm-beach"

export default async function Home() {
  const [items, specials, location] = await Promise.all([
    getMenuItems(),
    getActiveSpecials(),
    getLocationFull(DEFAULT_SLUG),
  ])

  return (
    <>
      <Nav  location={location} />
      <Cart location={location} />
      <main>
        {/* Hero → Menu → Location & Hours → About → Gallery → Catering → Testimonials → Reservation */}
        <Hero           location={location} />
        <Menu           items={items} specials={specials} />
        <Location       location={location} />
        <About          location={location} />
        <Gallery        images={location?.gallery} instagram={location?.instagram} />
        <Catering />
        <Testimonials />
        <ReservationForm />
      </main>
      <Footer location={location} />
    </>
  )
}
