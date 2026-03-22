import { locationSchema } from "@/sanity/schema/location"
import { menuItemSchema } from "@/sanity/schema/menuItem"
import { orderSchema } from "@/sanity/schema/order"
// siteSettings is kept in schema registration for backwards compatibility with
// any existing documents, but it is no longer surfaced in the Studio sidebar.
// Migrate existing data to the new `location` document type, then remove this import.
import { siteSettingsSchema } from "@/sanity/schema/siteSettings"
import { specialSchema } from "@/sanity/schema/special"
import { defineConfig } from "sanity"
import { structureTool } from "sanity/structure"

export default defineConfig({
  name: "bulltoptaste",
  title: "Bull Top Taste — Studio",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  basePath: "/studio",

  plugins: [
    structureTool({
      structure: S =>
        S.list()
          .title("Content")
          .items([
            // ── Locations ───────────────────────────────────────────────────
            // Each document = one physical restaurant location / franchise unit.
            // The slug field determines which location the frontend loads.
            S.listItem()
              .title("Locations")
              .icon(() => "📍")
              .child(
                S.documentTypeList("location")
                  .title("Locations")
                  .defaultOrdering([{ field: "restaurantName", direction: "asc" }])
              ),

            S.divider(),

            // ── Menu ────────────────────────────────────────────────────────
            S.listItem()
              .title("Menu Items")
              .icon(() => "🍽")
              .child(
                S.documentTypeList("menuItem")
                  .title("Menu Items")
                  .defaultOrdering([{ field: "section", direction: "asc" }])
              ),

            S.listItem()
              .title("Weekly Specials")
              .icon(() => "⭐")
              .child(S.documentTypeList("special").title("Weekly Specials")),

            S.divider(),

            // ── Orders ──────────────────────────────────────────────────────
            // Split into active (pending/kitchen/floor) and completed views
            // so Studio doesn't paginate completed orders into the live board.
            S.listItem()
              .title("Orders — Active")
              .icon(() => "⏳")
              .child(
                S.documentTypeList("order")
                  .title("Active Orders")
                  .filter('_type == "order" && status in ["pending", "kitchen", "floor"]')
                  .defaultOrdering([{ field: "createdAt", direction: "desc" }])
              ),

            S.listItem()
              .title("Orders — Completed")
              .icon(() => "✅")
              .child(
                S.documentTypeList("order")
                  .title("Completed Orders")
                  .filter('_type == "order" && status == "completed"')
                  .defaultOrdering([{ field: "createdAt", direction: "desc" }])
              ),
          ]),
    }),
  ],

  schema: {
    types: [
      // Active schemas
      locationSchema,
      menuItemSchema,
      orderSchema,
      specialSchema,
      // Deprecated — kept for safe migration; remove once all siteSettings
      // documents have been re-created as location documents.
      siteSettingsSchema,
    ],
  },
})
