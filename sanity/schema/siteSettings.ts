import { defineArrayMember, defineField, defineType } from "sanity"
import type { StringRule } from "sanity"

// Validation helper — warns if value doesn't look like a valid hex color
const hexColor = (R: StringRule) =>
  R.custom((val: unknown) => {
    if (!val) return true // optional field
    if (typeof val === "string" && /^#[0-9A-Fa-f]{6}$/.test(val)) return true
    return "Enter a 6-digit hex color code, e.g. #1a7a3b"
  })

export const siteSettingsSchema = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",

  // Groups keep the Studio UI organised — one panel per concern
  groups: [
    { name: "business", title: "Business Info", default: true },
    { name: "hero", title: "Hero Section" },
    { name: "hours", title: "Hours & Ordering" },
    { name: "branding", title: "Branding" },
    { name: "seo", title: "SEO" },
  ],

  fields: [
    // ─── Business Info ─────────────────────────────────────────────────────────

    defineField({
      name: "restaurantName",
      title: "Restaurant Name",
      type: "string",
      group: "business",
      validation: R => R.required(),
    }),

    defineField({
      name: "tagline",
      title: "Tagline",
      type: "string",
      group: "business",
      description: "Short line used above section headings, e.g. 'Authentic Jamaican Cuisine'",
    }),

    defineField({ name: "address", title: "Address", type: "string", group: "business" }),
    defineField({
      name: "phone",
      title: "Phone (display)",
      type: "string",
      group: "business",
      description: "Formatted for display, e.g. 561.653.1974",
    }),
    defineField({
      name: "phoneDialable",
      title: "Phone (digits only)",
      type: "string",
      group: "business",
      description: "Digits only for tel: links, e.g. 5616531974",
    }),
    defineField({ name: "email", title: "Email", type: "string", group: "business" }),

    defineField({
      name: "uberEatsUrl",
      title: "Uber Eats Storefront URL",
      type: "url",
      group: "business",
      description: "Paste your Uber Eats restaurant page link here",
    }),

    defineField({ name: "instagram", title: "Instagram URL", type: "url", group: "business" }),
    defineField({ name: "facebook", title: "Facebook URL", type: "url", group: "business" }),

    // ─── Hero Section ──────────────────────────────────────────────────────────

    defineField({
      name: "heroLabel",
      title: "Badge Text",
      type: "string",
      group: "hero",
      description:
        'Small pill badge above the headline, e.g. "West Palm\'s #1 Jamaican Restaurant"',
    }),

    defineField({ name: "heroHeadline", title: "Headline", type: "string", group: "hero" }),
    defineField({
      name: "heroSubheadline",
      title: "Subheadline",
      type: "text",
      group: "hero",
      rows: 2,
    }),

    defineField({
      name: "heroPrimaryCtaText",
      title: "Primary Button",
      type: "string",
      group: "hero",
      initialValue: "View Our Menu",
    }),

    defineField({
      name: "heroSecondaryCtaText",
      title: "Secondary Button",
      type: "string",
      group: "hero",
      initialValue: "Make a Reservation",
    }),

    // ─── Hours & Ordering ──────────────────────────────────────────────────────

    defineField({
      name: "hours",
      title: "Hours of Operation",
      type: "array",
      group: "hours",
      of: [
        defineArrayMember({
          type: "object",
          preview: { select: { title: "days", subtitle: "time" } },
          fields: [
            defineField({
              name: "days",
              title: "Days",
              type: "string",
              description: "e.g. Monday – Saturday",
            }),
            defineField({
              name: "time",
              title: "Hours",
              type: "string",
              description: "e.g. 9:00 am – 10:00 pm",
            }),
          ],
        }),
      ],
    }),

    defineField({
      name: "pickupWaitTime",
      title: "Pickup Wait Time",
      type: "string",
      group: "hours",
      description: 'Shown in the cart drawer, e.g. "15–20 min"',
      initialValue: "15–20 min",
    }),

    // ─── Branding ──────────────────────────────────────────────────────────────

    defineField({
      name: "primaryColor",
      title: "Primary Color",
      type: "string",
      group: "branding",
      description: "Main brand color for buttons and accents. Hex code, e.g. #1a7a3b",
      validation: hexColor,
    }),

    defineField({
      name: "primaryDarkColor",
      title: "Primary Dark (hover shade)",
      type: "string",
      group: "branding",
      description: "Darker version of primary for hover states, e.g. #0d4f24",
      validation: hexColor,
    }),

    defineField({
      name: "accentColor",
      title: "Accent Color",
      type: "string",
      group: "branding",
      description: "Used for price tags, gold highlights, and secondary buttons, e.g. #f5c300",
      validation: hexColor,
    }),

    defineField({
      name: "serifFont",
      title: "Heading Font",
      type: "string",
      group: "branding",
      description:
        "Google Fonts name for headings and display text. Examples: Playfair Display · Lora · Cormorant Garamond · Merriweather · EB Garamond",
    }),

    defineField({
      name: "sansFont",
      title: "Body Font",
      type: "string",
      group: "branding",
      description:
        "Google Fonts name for body copy and UI text. Examples: Inter · Lato · Nunito · DM Sans · Open Sans · Outfit",
    }),

    // ─── SEO ───────────────────────────────────────────────────────────────────

    defineField({
      name: "metaTitle",
      title: "Page Title",
      type: "string",
      group: "seo",
      description: "Appears in browser tab and Google search results",
    }),

    defineField({
      name: "metaDescription",
      title: "Meta Description",
      type: "text",
      group: "seo",
      rows: 3,
      description: "Google search result description — aim for 150–160 characters",
      validation: R => R.max(160).warning("Keep under 160 characters for best Google display"),
    }),
  ],
})
