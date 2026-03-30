"use client"

import { useCart } from "@/context/CartContext"

export default function CartFab() {
  const { count, isOpen, setIsOpen } = useCart()

  if (count === 0 || isOpen) return null

  return (
    <button
      onClick={() => setIsOpen(true)}
      aria-label={`View cart — ${count} item${count !== 1 ? "s" : ""}`}
      className="bg-brand-green fixed right-6 bottom-6 z-50 flex h-20 w-20 flex-col items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-105 active:scale-95"
    >
      {/* Badge */}
      <span className="bg-brand-cart-badge absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white">
        {count}
      </span>

      {/* Bag icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-8 w-8 text-white"
      >
        <path
          fillRule="evenodd"
          d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z"
          clipRule="evenodd"
        />
      </svg>

      <span className="mt-1 text-[10px] font-black tracking-widest text-white uppercase">
        View Cart
      </span>
    </button>
  )
}
