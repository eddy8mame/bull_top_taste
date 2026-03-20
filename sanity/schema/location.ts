import { defineField, defineType, defineArrayMember } from "sanity"

// ─── Theme catalogue ──────────────────────────────────────────────────────────
// Each value maps to a data-theme="…" attribute on <html>.
// The corresponding CSS variables are defined in globals.css.
const THEME_OPTIONS = [
  { title: "🌴 Tropical  — Jamaican green & gold (default)", value: "tropical" },
  { title: "🌑 Midnight  — Deep navy & amber",               value: "midnight" },
  { title: "🌶 Spice     — Warm terracotta & cream",         value: "spice"    },
  { title: "🌊 Ocean     — Coastal teal & white",            value: "ocean"    },
]

// ─── Location document ────────────────────────────────────────────────────────
// One document per physical restaurant location / franchise unit.
// Replaces the old siteSettings singleton.
// Multiple locations can coexist in the same Sanity dataset; the frontend
// resolves the correct one via the `slug` field.

export const locationSchema = defineType({
  name:  "location",
  title: "Location",
  type:  "document",

  groups: [
    { name: "identity",  title: "Identity",       default: true },
    { name: "hero",      title: "Hero Section"                  },
    { name: "about",     title: "About Section"                 },
    { name: "catering",  title: "Catering Section"              },
    { name: "hours",     title: "Hours & Ordering"              },
    { name: "theme",     title: "Theme & Branding"              },
    { name: "seo",       title: "SEO"                           },
  ],

  fields: [

    // ── Identity ──────────────────────────────────────────────────────────────

    defineField({
      name:       "restaurantName",
      title:      "Restaurant Name",
      type:       "string",
      group:      "identity",
      validation: R => R.required(),
    }),

    defineField({
      name:  "slug",
      title: "URL Slug",
      type:  "slug",
      group: "identity",
      description:
        "Machine-readable identifier used in URLs and to resolve this location in the frontend. " +
        'Generate from the restaurant name, e.g. "bull-top-taste-royal-palm-beach".',
      options: { source: "restaurantName", maxLength: 96 },
      validation: R => R.required(),
    }),

    defineField({
      name:        "tagline",
      title:       "Tagline",
      type:        "string",
      group:       "identity",
      description: 'Short descriptor shown above section headings, e.g. "Authentic Jamaican Cuisine".',
    }),

    defineField({ name: "address",       title: "Address",                type: "string", group: "identity" }),
    defineField({
      name:        "phone",
      title:       "Phone (display)",
      type:        "string",
      group:       "identity",
      description: "Formatted for display, e.g. 561.653.1974",
    }),
    defineField({
      name:        "phoneDialable",
      title:       "Phone (digits only)",
      type:        "string",
      group:       "identity",
      description: "Digits only for tel: links, e.g. 5616531974",
    }),
    defineField({ name: "email",     title: "Email",          type: "string", group: "identity" }),
    defineField({ name: "uberEatsUrl", title: "Uber Eats URL", type: "url",  group: "identity",
      description: "Paste your Uber Eats restaurant page link here." }),
    defineField({ name: "instagram", title: "Instagram URL",  type: "url",   group: "identity" }),
    defineField({ name: "facebook",  title: "Facebook URL",   type: "url",   group: "identity" }),

    // ── Hero Section ──────────────────────────────────────────────────────────

    defineField({
      name:        "heroLabel",
      title:       "Badge Text",
      type:        "string",
      group:       "hero",
      description: 'Small pill above the headline, e.g. "West Palm\'s #1 Jamaican Restaurant".',
    }),
    defineField({ name: "heroHeadline",    title: "Headline",    type: "string", group: "hero" }),
    defineField({ name: "heroSubheadline", title: "Subheadline", type: "text",   group: "hero", rows: 2 }),
    defineField({
      name:         "heroPrimaryCtaText",
      title:        "Primary Button",
      type:         "string",
      group:        "hero",
      initialValue: "View Our Menu",
    }),
    defineField({
      name:         "heroSecondaryCtaText",
      title:        "Secondary Button",
      type:         "string",
      group:        "hero",
      initialValue: "Make a Reservation",
    }),

    // ── About Section ─────────────────────────────────────────────────────────
    // Structured sub-fields keep copy requirements explicit and avoid
    // a free-form rich-text block that would be harder to theme per-location.

    defineField({
      name:        "aboutSection",
      title:       "About Section",
      type:        "object",
      group:       "about",
      description: "Content for the About / Our Story section on the homepage.",
      fields: [
        defineField({
          name:       "heading",
          title:      "Heading",
          type:       "string",
          description: 'e.g. "Our Story"',
        }),
        defineField({
          name:        "subheading",
          title:       "Subheading",
          type:        "string",
          description: 'One-line hook below the heading.',
        }),
        defineField({
          name:        "body",
          title:       "Body",
          type:        "text",
          rows:        5,
          description: "Short paragraph — max 400 characters.",
          validation:  R => R.max(400).warning("Keep under 400 characters for best layout fit."),
        }),
        defineField({
          name:        "image",
          title:       "Section Image",
          type:        "image",
          options:     { hotspot: true },
          description: "Displayed alongside the body copy.",
        }),
      ],
    }),

    // ── Catering Section ──────────────────────────────────────────────────────

    defineField({
      name:        "cateringSection",
      title:       "Catering Section",
      type:        "object",
      group:       "catering",
      description: "Content for the Catering inquiry section.",
      fields: [
        defineField({
          name:  "heading",
          title: "Heading",
          type:  "string",
          initialValue: "Catering & Events",
        }),
        defineField({
          name:  "subheading",
          title: "Subheading",
          type:  "string",
          initialValue: "Bring the taste of Jamaica to your next event.",
        }),
        defineField({
          name:        "body",
          title:       "Body",
          type:        "text",
          rows:        4,
          description: "Short paragraph describing your catering offer — max 400 characters.",
          validation:  R => R.max(400).warning("Keep under 400 characters."),
        }),
        defineField({
          name:        "ctaText",
          title:       "CTA Button Text",
          type:        "string",
          initialValue: "Request a Quote",
        }),
        defineField({
          name:        "ctaEmail",
          title:       "CTA Email Address",
          type:        "string",
          description: "Clicking the CTA opens a mailto: link to this address.",
        }),
        defineField({
          name:        "minimumGuests",
          title:       "Minimum Guests",
          type:        "number",
          description: "Minimum headcount for catering enquiries.",
        }),
      ],
    }),

    // ── Hours & Ordering ──────────────────────────────────────────────────────

    defineField({
      name:  "hours",
      title: "Hours of Operation",
      type:  "array",
      group: "hours",
      of: [
        defineArrayMember({
          type:    "object",
          preview: { select: { title: "days", subtitle: "time" } },
          fields: [
            defineField({ name: "days", title: "Days",  type: "string", description: "e.g. Monday – Saturday" }),
            defineField({ name: "time", title: "Hours", type: "string", description: "e.g. 9:00 am – 10:00 pm" }),
          ],
        }),
      ],
    }),

    defineField({
      name:         "pickupWaitTime",
      title:        "Pickup Wait Time",
      type:         "string",
      group:        "hours",
      description:  'Shown in the cart drawer, e.g. "15–20 min".',
      initialValue: "15–20 min",
    }),

    // ── Theme & Branding ──────────────────────────────────────────────────────
    // Theme is a preset token rather than free-form hex codes.
    // This prevents per-location colour drift while still allowing visual variety.
    // The actual colour values live in globals.css under [data-theme="…"] selectors.

    defineField({
      name:        "theme",
      title:       "Theme",
      type:        "string",
      group:       "theme",
      description:
        "Visual theme applied to this location's storefront. " +
        "Each theme is a curated palette — switch themes to change all brand colours simultaneously.",
      options: {
        list:   THEME_OPTIONS,
        layout: "radio",
      },
      initialValue: "tropical",
      validation:   R => R.required(),
    }),

    // ── SEO ───────────────────────────────────────────────────────────────────

    defineField({
      name:        "metaTitle",
      title:       "Page Title",
      type:        "string",
      group:       "seo",
      description: "Appears in browser tab and Google search results.",
    }),
    defineField({
      name:        "metaDescription",
      title:       "Meta Description",
      type:        "text",
      group:       "seo",
      rows:        3,
      description: "Google search result description — aim for 150–160 characters.",
      validation:  R => R.max(160).warning("Keep under 160 characters for best Google display."),
    }),
  ],

  preview: {
    select: {
      title:    "restaurantName",
      subtitle: "slug.current",
      theme:    "theme",
    },
    prepare({ title, subtitle, theme }) {
      const themeLabel = THEME_OPTIONS.find(t => t.value === (theme as string))?.title ?? ""
      return {
        title,
        subtitle: [`/${subtitle}`, themeLabel].filter(Boolean).join("  ·  "),
      }
    },
  },
})
