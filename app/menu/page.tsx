import { getMenuItems, getActiveSpecials } from "@/lib/sanity"
import Nav      from "@/components/Nav"
import Cart     from "@/components/Cart"
import MenuPage from "@/components/MenuPage"

export const revalidate = 3600

export const metadata = {
  title:       "Menu | Bull Top Taste Jamaican Restaurant",
  description: "Browse our full menu of authentic Jamaican dishes — jerk chicken, oxtail, curried goat, fish, patties, and more.",
}

export default async function MenuRoute() {
  const [items, specials] = await Promise.all([
    getMenuItems(),
    getActiveSpecials(),
  ])

  return (
    <>
      <Nav  location={null} />
      <Cart location={null} />

      <main className="bg-brand-light min-h-screen pt-16">
        {/* Page header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <p className="text-brand-green text-xs font-bold tracking-widest uppercase mb-1">
              Bull Top Taste
            </p>
            <h1 className="font-serif text-4xl">Our Menu</h1>
            <p className="text-brand-muted mt-1 text-sm max-w-lg leading-relaxed">
              Authentic Jamaican flavours — bold spices, slow-cooked meats, and island sides made fresh daily.
            </p>
          </div>
        </div>

        <MenuPage items={items} specials={specials} />
      </main>
    </>
  )
}
