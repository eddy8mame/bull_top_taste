// components/ROIConfigurator.tsx

"use client"

import { useMemo, useState } from "react"

// ─── Pricing constants ────────────────────────────────────────────────────────
const PRICING_CONFIG = {
  tiers: {
    essential: {
      name: "Essential",
      monthlyBase: 79,
      setupFee: 1500,
      description: "Simple menus, Stripe checkout, mobile storefront",
    },
    relational: {
      name: "Relational",
      monthlyBase: 149,
      setupFee: 3000,
      description: "Complex menus, sub-modifier pipeline, itemized receipts",
    },
    operator: {
      name: "Operator",
      monthlyBase: 249,
      setupFee: 5000,
      description: "86 system, admin dashboard, kitchen display, analytics",
    },
  },
  fees: {
    platformTransactionRate: 0.015,
    paymentProcessingPercent: 0.029,
    paymentProcessingFlat: 0.3,
  },
} as const

type TierKey = keyof typeof PRICING_CONFIG.tiers

const FEATURES: { id: string; name: string; description: string; tier: TierKey }[] = [
  {
    id: "sub_modifiers",
    name: "Sub-modifier Engine",
    description: "Nested customization — sides with their own size choices",
    tier: "relational",
  },
  {
    id: "cart_persistence",
    name: "Cart Persistence",
    description: "Cart survives page refresh and browser close",
    tier: "relational",
  },
  {
    id: "inventory_86",
    name: "86 / Inventory System",
    description: "Real-time item availability toggles from the kitchen",
    tier: "operator",
  },
  {
    id: "admin_dash",
    name: "Kitchen & Floor Dashboard",
    description: "Live order pipeline with kitchen display system",
    tier: "operator",
  },
  {
    id: "analytics",
    name: "Advanced Analytics",
    description: "Revenue, throughput, customer, and add-on uptake reporting",
    tier: "operator",
  },
]

const TIER_RANK: Record<TierKey, number> = { essential: 0, relational: 1, operator: 2 }

// ─── Slider ───────────────────────────────────────────────────────────────────

function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  minLabel,
  maxLabel,
  onChange,
}: {
  label: string
  value: number
  display: string
  min: number
  max: number
  step: number
  minLabel: string
  maxLabel: string
  onChange: (v: number) => void
}) {
  return (
    <div className="mb-7">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="text-saas-text/80 font-serif text-sm">{label}</span>
        <span className="text-saas-text font-mono text-base font-semibold">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="roi-slider w-full"
      />
      <div className="text-saas-subtle mt-1.5 flex justify-between font-mono text-[0.65rem]">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ROIConfigurator() {
  const [revenue, setRevenue] = useState(30000)
  const [aov, setAov] = useState(25)
  const [commission, setCommission] = useState(25)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])

  const calc = useMemo(() => {
    let activeTier: TierKey = "essential"
    for (const fid of selectedFeatures) {
      const feature = FEATURES.find(f => f.id === fid)
      if (!feature) continue
      if (TIER_RANK[feature.tier] > TIER_RANK[activeTier]) activeTier = feature.tier
    }

    const tier = PRICING_CONFIG.tiers[activeTier]
    const { platformTransactionRate, paymentProcessingPercent, paymentProcessingFlat } =
      PRICING_CONFIG.fees

    const estimatedOrders = aov > 0 ? revenue / aov : 0
    const paymentProcessingCost =
      revenue * paymentProcessingPercent + estimatedOrders * paymentProcessingFlat
    const platformFee = revenue * platformTransactionRate
    const monthlyCost = tier.monthlyBase + paymentProcessingCost + platformFee
    const marketplaceCost = revenue * (commission / 100)
    const monthlySavings = marketplaceCost - monthlyCost
    const annualSavings = monthlySavings * 12
    const paybackMonths = monthlySavings > 0 ? tier.setupFee / monthlySavings : null

    return {
      activeTier,
      tier,
      estimatedOrders: Math.round(estimatedOrders),
      paymentProcessingCost,
      platformFee,
      monthlyCost,
      marketplaceCost,
      monthlySavings,
      annualSavings,
      paybackMonths,
    }
  }, [revenue, aov, commission, selectedFeatures])

  const toggleFeature = (id: string) =>
    setSelectedFeatures(prev => (prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]))

  const positive = calc.monthlySavings > 0

  return (
    <>
      <div className="border-saas-border bg-saas-border grid grid-cols-1 overflow-hidden rounded-xl border lg:grid-cols-2">
        {/* ── Left: Configurator ──────────────────────────────────────── */}
        <div className="bg-saas-surface px-9 py-10">
          <p className="text-saas-gold mb-6 font-mono text-[0.68rem] tracking-[0.18em] uppercase">
            Your numbers
          </p>

          <Slider
            label="Monthly digital revenue"
            value={revenue}
            display={`$${revenue.toLocaleString()}`}
            min={5000}
            max={100000}
            step={1000}
            minLabel="$5k"
            maxLabel="$100k"
            onChange={setRevenue}
          />
          <Slider
            label="Average order value"
            value={aov}
            display={`$${aov}`}
            min={5}
            max={150}
            step={1}
            minLabel="$5"
            maxLabel="$150"
            onChange={setAov}
          />
          <Slider
            label="Marketplace commission rate"
            value={commission}
            display={`${commission}%`}
            min={5}
            max={35}
            step={1}
            minLabel="5%"
            maxLabel="35%"
            onChange={setCommission}
          />

          <p className="text-saas-gold mt-8 mb-4 font-mono text-[0.68rem] tracking-[0.18em] uppercase">
            Features you need
          </p>

          <div className="flex flex-col gap-2">
            {FEATURES.map(f => {
              const checked = selectedFeatures.includes(f.id)
              return (
                <label
                  key={f.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border px-4 py-3.5 transition-colors duration-150 ${
                    checked
                      ? "border-saas-gold/30 bg-saas-gold/7"
                      : "border-white/6 bg-white/3 hover:bg-white/6"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-saas-text/90 font-serif text-sm">{f.name}</span>
                    <span className="text-saas-subtle text-[0.7rem] italic">{f.description}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[0.6rem] tracking-wider uppercase ${
                        checked ? "bg-saas-gold/10 text-saas-gold" : "text-saas-muted bg-white/6"
                      }`}
                    >
                      {PRICING_CONFIG.tiers[f.tier].name}
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFeature(f.id)}
                      className="accent-saas-gold h-4.5 w-4.5"
                    />
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* ── Right: Live quote ──────────────────────────────────────── */}
        <div className="bg-saas-light flex flex-col gap-6 px-9 py-10">
          {/* Tier */}
          <div className="border-b border-black/8 pb-5">
            <p className="text-saas-green mb-1 font-mono text-[0.65rem] tracking-[0.18em] uppercase">
              Target tier
            </p>
            <p className="text-saas-light-text font-serif text-[2rem] leading-none font-bold">
              {calc.tier.name}
            </p>
            <p className="text-saas-subtle mt-1 text-[0.78rem] italic">{calc.tier.description}</p>
          </div>

          {/* Cost breakdown */}
          <div>
            <p className="text-saas-muted mb-3 font-mono text-[0.65rem] tracking-[0.18em] uppercase">
              Your monthly cost
            </p>
            {[
              { label: "Monthly base", value: `$${calc.tier.monthlyBase}`, muted: false },
              {
                label: "Platform fee (1.5%)",
                value: `$${calc.platformFee.toFixed(2)}`,
                muted: false,
              },
              {
                label: "Est. payment processing (~2.9% + 30¢)",
                value: `$${calc.paymentProcessingCost.toFixed(2)}`,
                muted: true,
              },
            ].map(row => (
              <div
                key={row.label}
                className={`flex items-baseline justify-between border-b border-black/6 py-2 text-sm ${
                  row.muted ? "text-saas-muted" : "text-saas-light-text/80"
                }`}
              >
                <span>{row.label}</span>
                <span className="font-mono">{row.value}</span>
              </div>
            ))}
            <div className="text-saas-light-text flex items-baseline justify-between py-3 text-base font-bold">
              <span>Total monthly</span>
              <span className="font-mono">${calc.monthlyCost.toFixed(2)}</span>
            </div>

            {/* Marketplace comparison */}
            <div className="border-saas-orange bg-saas-orange/6 mt-3 rounded-md border-l-[3px] px-3.5 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-saas-orange text-sm font-medium">
                  vs. marketplace ({commission}%)
                </span>
                <span className="text-saas-orange font-mono text-sm font-bold">
                  ${calc.marketplaceCost.toFixed(2)}/mo
                </span>
              </div>
              <p className="text-saas-muted mt-1 text-[0.7rem]">
                ≈ {calc.estimatedOrders} orders/month at ${aov} AOV
              </p>
            </div>
          </div>

          {/* Savings */}
          <div
            className={`rounded-lg p-6 ${
              positive ? "bg-saas-green text-white" : "text-saas-muted bg-black/6"
            }`}
          >
            {positive ? (
              <>
                <p className="mb-1 font-mono text-[0.65rem] tracking-[0.18em] uppercase opacity-75">
                  Annual estimated savings
                </p>
                <p className="font-serif text-5xl leading-none font-extrabold tracking-tight">
                  ${calc.annualSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="mt-1.5 text-sm opacity-80">
                  ${calc.monthlySavings.toFixed(2)} per month
                </p>
                {calc.paybackMonths !== null && (
                  <p className="mt-3 border-t border-white/20 pt-3 text-[0.8rem] opacity-75">
                    Setup fee paid back in{" "}
                    <strong className="opacity-100">{calc.paybackMonths.toFixed(1)} months</strong>
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mb-1 font-mono text-[0.65rem] tracking-[0.18em] uppercase">
                  At this revenue level
                </p>
                <p className="text-base font-semibold">
                  Marketplace fees are lower than platform cost.
                </p>
                <p className="mt-1 text-[0.78rem] italic">
                  Try increasing monthly revenue or commission rate.
                </p>
              </>
            )}
          </div>

          {/* Setup fee */}
          <div className="flex items-baseline justify-between rounded-md border border-black/6 bg-black/4 px-4 py-3.5">
            <span className="text-saas-subtle text-sm">One-time setup</span>
            <span className="text-saas-light-text font-mono text-base font-bold">
              ${calc.tier.setupFee.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .roi-slider {
          width: 100%;
          height: 3px;
          appearance: none;
          background: rgba(255,255,255,0.12);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .roi-slider::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #EF9F27;
          cursor: pointer;
          border: 2px solid #111110;
          box-shadow: 0 0 0 3px rgba(239,159,39,0.2);
          transition: box-shadow 0.15s;
        }
        .roi-slider::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 5px rgba(239,159,39,0.25);
        }
      `}</style>
    </>
  )
}
