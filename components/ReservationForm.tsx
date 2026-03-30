// components/ReservationForm.tsx

"use client"

import { FormEvent, useState } from "react"

type Status = "idle" | "sending" | "sent" | "error"

const INQUIRY_TYPES = [
  "Catering — Corporate Event",
  "Catering — Private Party",
  "Catering — Wedding",
  "Group Dining",
  "General Inquiry",
  "Other",
]

export default function ReservationForm() {
  const [status, setStatus] = useState<Status>("idle")

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus("sending")
    await new Promise(r => setTimeout(r, 800))
    setStatus("sent")
    setTimeout(() => setStatus("idle"), 3000)
  }

  return (
    <div id="contact">
      <div>
        {/* Form card */}
        <div
          className="rounded-2xl bg-white p-8"
          style={{ boxShadow: "0 8px 24px rgba(24,29,25,0.06)" }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Name row */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="First Name" id="fname" type="text" placeholder="Marcus" required />
              <Field label="Last Name" id="lname" type="text" placeholder="Brown" />
            </div>

            {/* Contact row */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Phone" id="phone" type="tel" placeholder="(561) 000-0000" required />
              <Field label="Email" id="email" type="email" placeholder="you@example.com" required />
            </div>

            {/* Inquiry type */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="inquiry"
                className="text-xs font-black tracking-widest text-gray-500 uppercase"
              >
                Type of Inquiry
              </label>
              <select
                id="inquiry"
                className="focus:ring-brand-green/20 w-full rounded-lg bg-gray-50 px-4 py-3.5 text-base text-gray-900 transition-all focus:ring-2 focus:outline-none"
              >
                <option value="">Select…</option>
                {INQUIRY_TYPES.map(o => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>

            {/* Date + guests row */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Preferred Date" id="date" type="date" />
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="guests"
                  className="text-xs font-black tracking-widest text-gray-500 uppercase"
                >
                  Number of Guests
                </label>
                <select
                  id="guests"
                  className="focus:ring-brand-green/20 w-full rounded-lg bg-gray-50 px-4 py-3.5 text-base text-gray-900 transition-all focus:ring-2 focus:outline-none"
                >
                  <option value="">Select…</option>
                  {["1–2", "3–5", "6–10", "11–20", "20+"].map(o => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Message */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="message"
                className="text-xs font-black tracking-widest text-gray-500 uppercase"
              >
                Message
              </label>
              <textarea
                id="message"
                rows={4}
                placeholder="Tell us about your event, dietary needs, or any questions…"
                className="focus:ring-brand-green/20 w-full resize-none rounded-lg bg-gray-50 px-4 py-3.5 text-base text-gray-900 transition-all focus:ring-2 focus:outline-none"
              />
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100" />

            {/* CTA */}
            <button
              type="submit"
              disabled={status !== "idle"}
              className="from-brand-green to-brand-green-dark w-full rounded-xl bg-linear-to-r py-5 text-sm font-black tracking-widest text-white uppercase shadow-md transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {status === "sending"
                ? "Sending…"
                : status === "sent"
                  ? "✓ Message Sent!"
                  : "Send Inquiry"}
            </button>

            <p className="text-center text-xs text-gray-400">
              We typically respond within 24 hours.
            </p>
          </form>
        </div>
      </div>
    </div>
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
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-black tracking-widest text-gray-500 uppercase">
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        required={required}
        className="focus:ring-brand-green/20 w-full rounded-lg bg-gray-50 px-4 py-3.5 text-base text-gray-900 transition-all focus:ring-2 focus:outline-none"
      />
    </div>
  )
}
