import { defineField, defineType } from "sanity"

export const specialSchema = defineType({
  name:  "special",
  title: "Weekly Special",
  type:  "document",
  fields: [
    defineField({ name: "title",      title: "Title",       type: "string",   validation: r => r.required() }),
    defineField({ name: "items",      title: "Items",       type: "array",    of: [{ type: "string" }],
      description: "List of dishes included in this special" }),
    defineField({ name: "price",      title: "Price ($)",   type: "number",   validation: r => r.required() }),
    defineField({ name: "validFrom",  title: "Valid From",  type: "date",     validation: r => r.required() }),
    defineField({ name: "validUntil", title: "Valid Until", type: "date",     validation: r => r.required() }),
    defineField({ name: "hours",      title: "Hours",       type: "string",   description: "e.g. 11 am – 2 pm" }),
  ],
})
