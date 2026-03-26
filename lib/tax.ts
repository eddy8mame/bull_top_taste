// lib/tax.ts
import type { CartItem } from "@/types"

// Default fallback — Palm Beach County, FL
// Override per location via location.taxRate in Sanity
export const DEFAULT_TAX_RATE = 0.065

export function calculateTotals(items: CartItem[], taxRate: number = DEFAULT_TAX_RATE) {
  const subtotal = items.reduce((sum, item) => sum + item.effectivePrice * item.quantity, 0)
  const tax = Math.round(subtotal * taxRate * 100) / 100
  const total = Math.round((subtotal + tax) * 100) / 100

  return {
    subtotal,
    tax,
    total,
    taxRateLabel: `${(taxRate * 100).toFixed(2).replace(/\.00$/, "")}%`,
  }
}