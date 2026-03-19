"use client"

import { useState, FormEvent } from "react"
import { useRouter }           from "next/navigation"

export default function OfficeLogin() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/admin/office/login/auth", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push("/admin/office")
    } else {
      setError("Incorrect password.")
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
        <h1 className="font-serif text-2xl mb-1">Office</h1>
        <p className="text-brand-muted text-sm mb-6">Bull Top Taste — Management Access</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoFocus
            className="border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-green"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-green text-white font-semibold py-3 rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  )
}
