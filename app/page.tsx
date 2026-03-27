import { getActiveSpecials, getLocationFull, getMenuItems } from "@/lib/sanity"

import About from "@/components/About"
import Cart from "@/components/Cart"
import Catering from "@/components/Catering"
import Footer from "@/components/Footer"
import Gallery from "@/components/Gallery"
import Hero from "@/components/Hero"
import Location from "@/components/Location"
import Menu from "@/components/Menu"
import Nav from "@/components/Nav"
import ReservationForm from "@/components/ReservationForm"
import Testimonials from "@/components/Testimonials"

export const revalidate = 3600 // ISR: revalidate CMS content every hour

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
      <Nav location={location} />
      <Cart location={location} />
      <main>
        {/* Hero → Menu → Reviews -> Location & Hours → Catering → About */}
        <Hero location={location} />
        <Menu items={items} specials={specials} />
        <Location location={location} />
        <About location={location} />
        {/* <Gallery images={location?.gallery} instagram={location?.instagram} /> */}
        <Catering />
        <Testimonials />
        <ReservationForm />
      </main>
      <Footer location={location} />
    </>
  )
}
