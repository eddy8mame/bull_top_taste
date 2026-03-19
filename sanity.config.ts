import { defineConfig }       from "sanity"
import { structureTool }      from "sanity/structure"
import { menuItemSchema }     from "@/sanity/schema/menuItem"
import { specialSchema }      from "@/sanity/schema/special"
import { siteSettingsSchema } from "@/sanity/schema/siteSettings"

export default defineConfig({
  name:      "bulltoptaste",
  title:     "Bull Top Taste",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset:   process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  basePath:  "/studio",

  plugins: [
    structureTool({
      structure: S =>
        S.list()
          .title("Content")
          .items([
            // Singleton — fixed documentId means only one can ever exist
            S.listItem()
              .title("Site Settings")
              .id("siteSettings")
              .child(
                S.document()
                  .schemaType("siteSettings")
                  .documentId("siteSettings")
              ),

            S.divider(),

            S.listItem()
              .title("Menu Items")
              .child(S.documentTypeList("menuItem").title("Menu Items")),

            S.listItem()
              .title("Weekly Specials")
              .child(S.documentTypeList("special").title("Weekly Specials")),
          ]),
    }),
  ],

  schema: {
    types: [siteSettingsSchema, menuItemSchema, specialSchema],
  },
})
