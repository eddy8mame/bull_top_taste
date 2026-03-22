import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Required for the embedded Sanity Studio
  transpilePackages: ["sanity", "next-sanity"],

  // Explicitly opt into Turbopack (Next.js 16 default)
  turbopack: {},

  // Allow next/image to serve images from Sanity's CDN
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
  },
}

export default nextConfig
