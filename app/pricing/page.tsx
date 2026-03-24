// app/pricing/page.tsx

import { ROIConfigurator } from "@/components/ROIConfigurator"

export const metadata = {
  title: "Pricing — Taste Engine",
  description:
    "See exactly how much you save by replacing third-party delivery apps with your own ordering engine. Configure your features and get a live ROI estimate.",
}

export default function PricingPage() {
  return (
    <main className="bg-saas-bg text-saas-text min-h-screen font-serif">
      <div className="relative overflow-hidden px-6 pt-24 pb-16 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(239,159,39,0.12)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl">
          <span className="border-saas-gold/30 text-saas-gold mb-6 inline-block rounded-sm border px-4 py-1.5 font-mono text-[0.72rem] tracking-widest uppercase">
            The Truth Machine
          </span>
          <h1 className="mb-6 text-[clamp(2.8rem,7vw,5.5rem)] leading-[1.08] font-normal tracking-tight">
            What is DoorDash
            <br />
            <em className="text-saas-gold italic">actually</em> costing you?
          </h1>
          <p className="text-saas-muted m-0 font-serif text-lg italic">
            Configure your features below. Watch the math happen in real time.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-6 pb-24">
        <ROIConfigurator />
      </div>
    </main>
  )
}
