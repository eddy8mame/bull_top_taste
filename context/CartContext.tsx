"use client"

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import type { CartItem, CartState } from "@/types"

const CartContext = createContext<CartState | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem("btt-cart")
      return stored ? (JSON.parse(stored) as CartItem[]) : []
    } catch {
      return []
    }
  })
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem("btt-cart", JSON.stringify(items))
    } catch {
      // localStorage unavailable or quota exceeded — fail silently
    }
  }, [items])

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.cartItemId === item.cartItemId)
      if (existing) {
        return prev.map(i =>
          i.cartItemId === item.cartItemId ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, item]
    })
    setIsOpen(true)
  }, [])

  const removeItem = useCallback((cartItemId: string) => {
    setItems(prev => prev.filter(i => i.cartItemId !== cartItemId))
  }, [])

  const updateQty = useCallback((cartItemId: string, qty: number) => {
    if (qty < 1) {
      setItems(prev => prev.filter(i => i.cartItemId !== cartItemId))
    } else {
      setItems(prev => prev.map(i => (i.cartItemId === cartItemId ? { ...i, quantity: qty } : i)))
    }
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    try {
      localStorage.removeItem("btt-cart")
    } catch {
      // fail silently
    }
  }, [])

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.effectivePrice * i.quantity, 0),
    [items]
  )

  const count = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, clearCart, total, count, isOpen, setIsOpen }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartState {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within <CartProvider>")
  return ctx
}
