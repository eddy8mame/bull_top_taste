import { defineArrayMember, defineField, defineType } from "sanity"

// ─── Order status pipeline ────────────────────────────────────────────────────
// pending  → created at checkout, awaiting kitchen acknowledgement
// kitchen  → kitchen has started prep (replaces old "preparing" label)
// floor    → ready for pickup / handoff to front-of-house
// completed → picked up / fulfilled
const STATUS_OPTIONS = [
  { title: "⏳ Pending   — awaiting kitchen", value: "pending" },
  { title: "🍳 Kitchen   — in prep", value: "kitchen" },
  { title: "🍽  Floor     — ready for pickup", value: "floor" },
  { title: "✅ Completed — picked up", value: "completed" },
]

// ─── Modifier selection (inline, denormalised) ────────────────────────────────
// We store a human-readable snapshot of what was selected at time of order.
// This is intentionally denormalised — if a menu item's modifier is later
// changed in the CMS, historical orders remain accurate.
const modifierSelectionDef = defineArrayMember({
  type: "object",
  name: "modifierSelection",
  title: "Modifier Selection",
  fields: [
    defineField({ name: "groupName", title: "Group Name", type: "string" }),
    defineField({
      name: "selections",
      title: "Selected Options",
      type: "string",
      description: 'Comma-separated, e.g. "Large +$3.50, Rice & Peas".',
    }),
  ],
  preview: {
    select: { title: "groupName", subtitle: "selections" },
  },
})

// ─── Order line item (inline, denormalised) ───────────────────────────────────
const orderItemDef = defineArrayMember({
  type: "object",
  name: "orderItem",
  title: "Order Item",
  fields: [
    defineField({
      name: "itemName",
      title: "Item Name",
      type: "string",
      description: "Snapshot of the menu item name at time of order.",
      validation: r => r.required(),
    }),
    defineField({
      name: "menuItemRef",
      title: "Menu Item",
      type: "string",
      description: "Sanity document _id of the source menuItem (for analytics joins).",
    }),
    defineField({
      name: "quantity",
      title: "Qty",
      type: "number",
      validation: r => r.required().min(1).integer(),
    }),
    defineField({
      name: "basePrice",
      title: "Base Price ($)",
      type: "number",
      description: "Menu price at time of order, before modifier adjustments.",
      validation: r => r.min(0),
    }),
    defineField({
      name: "effectivePrice",
      title: "Effective Price ($)",
      type: "number",
      description: "Final per-unit price after all modifier upcharges.",
      validation: r => r.min(0),
    }),
    defineField({
      name: "modifiers",
      title: "Modifier Selections",
      type: "array",
      description: "One entry per modifier group selected by the customer.",
      of: [modifierSelectionDef],
    }),
    defineField({
      name: "specialInstructions",
      title: "Special Instructions",
      type: "string",
      description: 'Customer-entered note, e.g. "extra spicy, no onions".',
    }),
  ],
  preview: {
    select: {
      title: "itemName",
      qty: "quantity",
      price: "effectivePrice",
    },
    prepare({ title, qty, price }) {
      return {
        title,
        subtitle: `${qty as number}× · $${((qty as number) * (price as number)).toFixed(2)}`,
      }
    },
  },
})

// ─── Order document ───────────────────────────────────────────────────────────
export const orderSchema = defineType({
  name: "order",
  title: "Order",
  type: "document",

  // Studio groups keep the dense order data navigable at a glance
  groups: [
    { name: "status", title: "Status & Timing", default: true },
    { name: "customer", title: "Customer" },
    { name: "items", title: "Items" },
    { name: "payment", title: "Payment" },
  ],

  fields: [
    // ── Status & Timing ───────────────────────────────────────────────────────

    defineField({
      name: "location",
      title: "Location",
      type: "reference",
      to: [{ type: "location" }],
      group: "status",
      description: "Which restaurant location received this order.",
      validation: R => R.required(),
    }),

    defineField({
      name: "status",
      title: "Status",
      type: "string",
      group: "status",
      options: {
        list: STATUS_OPTIONS,
        layout: "radio",
      },
      initialValue: "pending",
      validation: R => R.required(),
    }),

    defineField({
      name: "type",
      title: "Order Type",
      type: "string",
      group: "status",
      options: {
        list: [
          { title: "Pickup", value: "pickup" },
          { title: "Delivery", value: "delivery" },
        ],
        layout: "radio",
      },
      initialValue: "pickup",
      validation: R => R.required(),
    }),

    // Explicit application-level timestamps (separate from Sanity's _createdAt
    // so they can be set by the checkout server and not subject to Studio edits).
    defineField({
      name: "createdAt",
      title: "Placed At",
      type: "datetime",
      group: "status",
      description: "Set server-side at checkout. Read-only in Studio.",
      validation: R => R.required(),
    }),

    defineField({
      name: "readyAt",
      title: "Ready At",
      type: "datetime",
      group: "status",
      description: "Set when kitchen marks order ready (status → floor).",
    }),

    defineField({
      name: "pickedUpAt",
      title: "Picked Up At",
      type: "datetime",
      group: "status",
      description: "Set when floor staff confirms pickup (status → completed).",
    }),

    // ── Customer ──────────────────────────────────────────────────────────────

    defineField({
      name: "customerName",
      title: "Name",
      type: "string",
      group: "customer",
      validation: R => R.required(),
    }),

    defineField({
      name: "customerEmail",
      title: "Email",
      type: "string",
      group: "customer",
    }),

    defineField({
      name: "customerPhone",
      title: "Phone",
      type: "string",
      group: "customer",
    }),

    defineField({
      name: "notes",
      title: "Order Notes",
      type: "text",
      group: "customer",
      rows: 2,
    }),

    // ── Items ─────────────────────────────────────────────────────────────────

    defineField({
      name: "items",
      title: "Items",
      type: "array",
      group: "items",
      of: [orderItemDef],
      validation: R => R.required().min(1),
    }),

    defineField({
      name: "total",
      title: "Order Total ($)",
      type: "number",
      group: "items",
      description: "Grand total charged, including all modifier upcharges.",
      validation: R => R.required().min(0),
    }),

    // ── Payment ───────────────────────────────────────────────────────────────

    defineField({
      name: "stripePaymentIntentId",
      title: "Stripe Payment Intent",
      type: "string",
      group: "payment",
      description: "pi_… ID from Stripe. Use this to look up the charge in the Stripe dashboard.",
    }),

    defineField({
      name: "stripeSessionId",
      title: "Stripe Session ID",
      type: "string",
      group: "payment",
      description: "cs_… ID from Stripe Checkout.",
    }),
  ],

  // Studio list preview: show name, status badge, and total at a glance
  preview: {
    select: {
      customer: "customerName",
      status: "status",
      total: "total",
      type: "type",
    },
    prepare({ customer, status, total, type }) {
      const STATUS_ICONS: Record<string, string> = {
        pending: "⏳",
        kitchen: "🍳",
        floor: "🍽",
        completed: "✅",
      }
      const icon = STATUS_ICONS[status as string] ?? "❓"
      return {
        title: `${icon} ${customer as string}`,
        subtitle: `${(type as string).toUpperCase()} · $${(total as number)?.toFixed(2) ?? "—"}`,
      }
    },
  },

  // Sort newest-first by default in the Studio document list
  orderings: [
    {
      title: "Newest first",
      name: "createdAtDesc",
      by: [{ field: "createdAt", direction: "desc" }],
    },
    {
      title: "Status",
      name: "statusAsc",
      by: [{ field: "status", direction: "asc" }],
    },
  ],
})
