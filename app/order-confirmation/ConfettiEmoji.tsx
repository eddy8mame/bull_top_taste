// app/confirmation/ConfettiEmoji.tsx (or wherever your page.tsx lives)
"use client"

import { useEffect, useRef } from "react"

import confetti from "canvas-confetti"

export default function ConfettiEmoji() {
  const emojiRef = useRef<HTMLDivElement>(null)

  const fireConfetti = () => {
    if (!emojiRef.current) return

    // Find the exact screen coordinates of the emoji
    const rect = emojiRef.current.getBoundingClientRect()

    // canvas-confetti expects origin values between 0 and 1 (percentages of viewport)
    const x = (rect.left + rect.width / 2) / window.innerWidth
    const y = (rect.top + rect.height / 2) / window.innerHeight

    // Fire the confetti upward from that exact coordinate
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { x, y },
      startVelocity: 45, // Shoots it high
      gravity: 0.8, // Pulls it down all over the screen
      zIndex: 100, // Ensures it renders over your navbar
      colors: ["#EF9F27", "#22c55e", "#3b82f6", "#ec4899", "#f43f5e"], // Your brand gold/green + accents
    })
  }

  // Fire automatically when the page loads
  useEffect(() => {
    // Add a tiny delay so the page settles before firing
    const timer = setTimeout(fireConfetti, 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      ref={emojiRef}
      onClick={fireConfetti} // Delight feature: tapping it again fires more!
      className="mb-4 inline-block cursor-pointer text-center text-6xl transition-transform hover:scale-110 active:scale-95"
      title="Click for more confetti!"
    >
      🎉
    </div>
  )
}
