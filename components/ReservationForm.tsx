"use client"

import { FormEvent, useState } from "react"

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
    <section id="reservations" className="bg-brand-light px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-brand-green mb-1 text-xs font-bold tracking-widest uppercase">
          Book a Table
        </p>
        <h2 className="mb-2 font-serif text-4xl">Reservations &amp; Enquiries</h2>
        <p className="text-brand-muted mb-8 max-w-lg leading-relaxed">
          Interested in dining in, group bookings, or catering? Send us a message and we&apos;ll get
          back to you shortly.
        </p>

        <div className="max-w-2xl rounded-xl border border-gray-100 bg-white p-8">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First Name *" id="fname" type="text" placeholder="e.g. Marcus" required />
            <Field label="Last Name" id="lname" type="text" placeholder="e.g. Brown" />
            <Field label="Phone *" id="phone" type="tel" placeholder="(561) 000-0000" required />
            <Field label="Email *" id="email" type="email" placeholder="you@example.com" required />
            <Field label="Preferred Date" id="date" type="date" />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="guests" className="text-sm font-semibold">
                Number of Guests
              </label>
              <select
                id="guests"
                className="focus:border-brand-green rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none"
              >
                <option value="">Select…</option>
                {["1–2", "3–5", "6–10", "11–20", "20+"].map(o => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="message" className="text-sm font-semibold">
                Message
              </label>
              <textarea
                id="message"
                rows={3}
                placeholder="Tell us about your reservation, event, or catering inquiry…"
                className="focus:border-brand-green resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={status !== "idle"}
                className="bg-brand-green hover:bg-brand-green-dark w-full rounded-lg py-3.5 font-semibold text-white transition-colors disabled:opacity-60"
              >
                {status === "sending"
                  ? "Sending…"
                  : status === "sent"
                    ? "✓ Message Sent!"
                    : "Send Message"}
              </button>
              <p className="text-brand-muted mt-2 text-center text-xs">
                100% Secure. You may receive occasional messages from us. Opt out anytime.
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

function Field({
  label,
  id,
  type,
  placeholder,
  required,
}: {
  label: string
  id: string
  type: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        required={required}
        className="focus:border-brand-green rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none"
      />
    </div>
  )
}
