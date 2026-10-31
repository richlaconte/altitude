// Sample data for the last twelve months (Nov 2025 – Oct 2026).
// Raw monthly inputs are hard-coded; derived figures (active count, MRR,
// churn) are computed so every number on the dashboard stays consistent.

export type MonthlyMetrics = {
  month: string
  label: string
  newSubs: number
  cancelledSubs: number
  netSubs: number
  activeSubs: number
  arpu: number
  mrr: number
  mrrChange: number
  churnRate: number
}

// Active subscriptions and ARPU at the end of Oct 2025, the baseline month.
const STARTING_ACTIVE = 9800
const STARTING_ARPU = 88.2

// A list-price increase in March 2026 lifts ARPU and briefly spikes churn;
// December is seasonally slow for sign-ups, January is the strongest.
const RAW = [
  { month: "2025-11", label: "Nov 2025", newSubs: 412, cancelledSubs: 148, arpu: 88.4 },
  { month: "2025-12", label: "Dec 2025", newSubs: 356, cancelledSubs: 161, arpu: 88.6 },
  { month: "2026-01", label: "Jan 2026", newSubs: 538, cancelledSubs: 189, arpu: 88.9 },
  { month: "2026-02", label: "Feb 2026", newSubs: 497, cancelledSubs: 152, arpu: 89.1 },
  { month: "2026-03", label: "Mar 2026", newSubs: 471, cancelledSubs: 214, arpu: 91.8 },
  { month: "2026-04", label: "Apr 2026", newSubs: 455, cancelledSubs: 171, arpu: 92.0 },
  { month: "2026-05", label: "May 2026", newSubs: 489, cancelledSubs: 158, arpu: 92.2 },
  { month: "2026-06", label: "Jun 2026", newSubs: 433, cancelledSubs: 149, arpu: 92.3 },
  { month: "2026-07", label: "Jul 2026", newSubs: 418, cancelledSubs: 163, arpu: 92.5 },
  { month: "2026-08", label: "Aug 2026", newSubs: 462, cancelledSubs: 155, arpu: 92.6 },
  { month: "2026-09", label: "Sep 2026", newSubs: 521, cancelledSubs: 167, arpu: 92.8 },
  { month: "2026-10", label: "Oct 2026", newSubs: 547, cancelledSubs: 172, arpu: 93.1 },
]

export const baseline = {
  activeSubs: STARTING_ACTIVE,
  mrr: Math.round(STARTING_ACTIVE * STARTING_ARPU),
}

export const monthlyMetrics: MonthlyMetrics[] = (() => {
  let prevActive = baseline.activeSubs
  let prevMrr = baseline.mrr
  return RAW.map((m) => {
    const netSubs = m.newSubs - m.cancelledSubs
    const activeSubs = prevActive + netSubs
    const mrr = Math.round(activeSubs * m.arpu)
    const row: MonthlyMetrics = {
      ...m,
      netSubs,
      activeSubs,
      mrr,
      mrrChange: mrr - prevMrr,
      churnRate: m.cancelledSubs / prevActive,
    }
    prevActive = activeSubs
    prevMrr = mrr
    return row
  })
})()

export const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

export const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
})

export const number = new Intl.NumberFormat("en-US")

export const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function pctChange(current: number, previous: number) {
  return previous === 0 ? 0 : (current - previous) / previous
}
