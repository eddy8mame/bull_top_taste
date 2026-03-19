"use client"

import { useState, FormEvent } from "react"

type Status = "idle" | "sending" | "sent" | "error"

export default function ReservationForm() {
  const [status, setStatus] = useState<Status>("idle")

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus("sending")
    // Wire to your preferred form backend (Resend, Formspree, etc.)
    await new Promise(r => setTimeout(r, 800)) // simulate network
    setStatus("sent")
    setTimeout(() => setStatus("idle"), 3000)
  }

  return (
    <section id="reservations" className="bg-brand-light py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <p className="text-brand-green text-xs font-bold tracking-widest uppercase mb-1">Book a Table</p>
        <h2 className="font-serif text-4xl mb-2">Reservations &amp; Enquiries</h2>
        <p className="text-brand-muted max-w-lg leading-relaxed mb-8">
          Interested in dining in, group bookings, or catering? Send us a message and we&apos;ll get back to you shortly.
        </p>

        <div className="bg-white rounded-xl border border-gray-100 p-8 max-w-2xl">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First Name *" id="fname"    type="text"  placeholder="e.g. Marcus"       required />
            <Field label="Last Name"    id="lname"    type="text"  placeholder="e.g. Brown" />
            <Field label="Phone *"      id="phone"    type="tel"   placeholder="(561) 000-0000"    required />
            <Field label="Email *"      id="email"    type="email" placeholder="you@example.com"   required />
            <Field label="Preferred Date" id="date"  type="date" />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="guests" className="text-sm font-semibold">Number of Guests</label>
              <select id="guests"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-green bg-white">
                <option value="">Select…</option>
                {["1–2", "3–5", "6–10", "11–20", "20+"].map(o => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="message" className="text-sm font-semibold">Message</label>
              <textarea id="message" rows={3} placeholder="Tell us about your reservation, event, or catering inquiry…"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-green resize-none" />
            </div>

            <div className="sm:col-span-2">
              <button type="submit" disabled={status !== "idle"}
                className="w-full bg-brand-green text-white font-semibold py-3.5 rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-60">
                {status === "sending" ? "Sending…"
                  : status === "sent"  ? "✓ Message Sent!"
                  : "Send Message"}
              </button>
              <p className="text-xs text-brand-muted mt-2 text-center">
                100% Secure. You may receive occasional messages from us. Opt out anytime.
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

function Field({ label, id, type, placeholder, required }: {
  label: string; id: string; type: string; placeholder?: string; required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      <input id={id} type={type} placeholder={placeholder} required={required}
        className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-green" />
    </div>
  )
}
