import { defineField, defineType, defineArrayMember } from "sanity"

// ── Inline object: a single modifier option (e.g. "Large +$3.50") ─────────────
const modifierOptionDef = defineArrayMember({
  type:   "object",
  name:   "modifierOption",
  title:  "Option",
  fields: [
    defineField({
      name:       "name",
      title:      "Option Name",
      type:       "string",
      description: 'e.g. "Small", "Rice & Peas", "Jerk Sauce"',
      validation: r => r.required(),
    }),
    defineField({
      name:        "priceAdjustment",
      title:       "Price Adjustment ($)",
      type:        "number",
      description: "0 = included in base price. Positive number = upcharge.",
      initialValue: 0,
      validation: r => r.min(0),
    }),
    defineField({
      name:        "subModifierGroups",
      title:       "Sub-Modifier Groups",
      type:        "array",
      description: "Optional nested choices shown when this option is selected (e.g. Plantain → Small / Large).",
      of: [{
        type:   "object",
        name:   "subModifierGroup",
        title:  "Sub-Group",
        fields: [
          defineField({ name: "name",     title: "Group Name", type: "string", validation: r => r.required() }),
          defineField({ name: "required", title: "Required?",  type: "boolean", initialValue: false }),
          defineField({ name: "min",      title: "Min",        type: "number",  initialValue: 0 }),
          defineField({ name: "max",      title: "Max",        type: "number",  initialValue: 1 }),
          defineField({
            name: "options", title: "Options", type: "array",
            of: [{
              type: "object", name: "subOption",
              fields: [
                defineField({ name: "name",            title: "Name",             type: "string", validation: r => r.required() }),
                defineField({ name: "priceAdjustment", title: "Price Adj. ($)",   type: "number", initialValue: 0 }),
              ],
            }],
          }),
        ],
      }],
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "priceAdjustment" },
    prepare({ title, subtitle }) {
      return {
        title,
        subtitle: (subtitle as number) > 0 ? `+$${(subtitle as number).toFixed(2)}` : "Included",
      }
    },
  },
})

// ── Inline object: a modifier group (e.g. "Side Choice — Required, Select 2") ─
const modifierGroupDef = defineArrayMember({
  type:   "object",
  name:   "modifierGroup",
  title:  "Modifier Group",
  fields: [
    defineField({
      name:       "name",
      title:      "Group Name",
      type:       "string",
      description: 'e.g. "Size Choice", "Side Choice", "Sauce Additions"',
      validation: r => r.required(),
    }),
    defineField({
      name:        "required",
      title:       "Required?",
      type:        "boolean",
      description: "If on, the customer must make a selection before adding to cart.",
      initialValue: false,
    }),
    defineField({
      name:        "min",
      title:       "Minimum Selections",
      type:        "number",
      description: "Minimum the customer must choose (usually 1 if required, 0 if optional).",
      initialValue: 0,
      validation: r => r.min(0).integer(),
    }),
    defineField({
      name:        "max",
      title:       "Maximum Selections",
      type:        "number",
      description: "Maximum the customer can choose. 1 = single-select (radio). 2+ = multi-select.",
      initialValue: 1,
      validation: r => r.min(1).integer(),
    }),
    defineField({
      name:    "options",
      title:   "Options",
      type:    "array",
      of:      [modifierOptionDef],
      validation: r => r.min(1),
    }),
  ],
  preview: {
    select: {
      title:    "name",
      required: "required",
      min:      "min",
      max:      "max",
    },
    prepare({ title, required, min, max }) {
      const req = required ? "Required" : "Optional"
      const sel = (max as number) === 1 ? "Select 1" : `Select ${min}–${max}`
      return { title, subtitle: `${req} · ${sel}` }
    },
  },
})

// ── Menu Item document ────────────────────────────────────────────────────────
export const menuItemSchema = defineType({
  name:  "menuItem",
  title: "Menu Item",
  type:  "document",
  groups: [
    { name: "basics",    title: "Basics",    default: true },
    { name: "modifiers", title: "Modifiers"               },
    { name: "meta",      title: "Meta"                    },
  ],
  fields: [
    // ── Basics ──────────────────────────────────────────────────────────────
    defineField({
      name:       "name",
      title:      "Item Name",
      type:       "string",
      group:      "basics",
      validation: r => r.required(),
    }),
    defineField({
      name:  "description",
      title: "Description",
      type:  "text",
      rows:  3,
      group: "basics",
    }),
    defineField({
      name:        "price",
      title:       "Base Price ($)",
      type:        "number",
      group:       "basics",
      description: "Leave blank for Market Price items.",
      validation:  r => r.min(0),
    }),
    defineField({
      name:    "section",
      title:   "Section",
      type:    "string",
      group:   "basics",
      description:
        "Top-level tab on the menu page. Customers navigate between sections. " +
        'e.g. "Mains", "Fish", "Starters". Keep this broad.',
      validation: r => r.required(),
    }),
    defineField({
      name:    "category",
      title:   "Category",
      type:    "string",
      group:   "basics",
      description:
        "Sub-grouping within a section. Items in the same section are clustered by category. " +
        'e.g. Section "Mains" → Category "Weekly Specials" or "Lunch Plates". ' +
        "Leave blank if all items in this section belong to the same group.",
    }),
    defineField({
      name:        "tag",
      title:       "Badge Label",
      type:        "string",
      group:       "basics",
      description: 'Short label shown on the card, e.g. "Fan Favourite", "Most Ordered", "New".',
    }),
    defineField({
      name:         "available",
      title:        "Available for Order",
      type:         "boolean",
      group:        "basics",
      initialValue: true,
      description:  "Toggle off to 86 this item without deleting it.",
    }),
    defineField({
      name:        "image",
      title:       "Item Photo",
      type:        "image",
      group:       "basics",
      description: "Displayed on the menu card and in the order modal. Recommended: square crop, min 600×600px.",
      options:     { hotspot: true },
    }),

    // ── Modifiers ────────────────────────────────────────────────────────────
    defineField({
      name:  "modifierGroups",
      title: "Modifier Groups",
      type:  "array",
      group: "modifiers",
      description:
        "Add groups of choices the customer sees when they tap Customize. " +
        "Required groups must be completed before they can add to cart.",
      of: [modifierGroupDef],
    }),

    // ── Meta ─────────────────────────────────────────────────────────────────
    defineField({
      name:        "orderCount",
      title:       "Order Count",
      type:        "number",
      group:       "meta",
      description: "Total times this item has been ordered. Used to rank the Most Ordered section. Can be set manually or synced from order data.",
      initialValue: 0,
      validation:  r => r.min(0).integer(),
    }),
  ],

  preview: {
    select: {
      title:    "name",
      section:  "section",
      price:    "price",
      available: "available",
    },
    prepare({ title, section, price, available }) {
      const priceStr = price != null ? `$${(price as number).toFixed(2)}` : "Market Price"
      const avail    = available === false ? " · 86'd" : ""
      return {
        title,
        subtitle: [section, priceStr + avail].filter(Boolean).join(" · "),
      }
    },
  },
})
