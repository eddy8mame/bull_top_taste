import type { Metadata } from "next"

import { getLocationFull } from "@/lib/sanity"

import CheckoutClient from "./CheckoutClient"

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
}

export default async function CheckoutPage() {
  const location = await getLocationFull("")
  return <CheckoutClient location={location} />
}
