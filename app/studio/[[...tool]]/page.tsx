"use client"

import { NextStudio } from "next-sanity/studio"
import config from "@/sanity.config"

// Tell Next.js this page is dynamic — the Studio manages its own routing
export const dynamic = "force-dynamic"

export default function StudioPage() {
  return <NextStudio config={config} />
}
