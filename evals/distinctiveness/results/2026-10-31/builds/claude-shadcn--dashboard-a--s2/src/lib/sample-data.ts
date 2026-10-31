// Sample metrics for the last twelve complete months. There is no backend:
// monthly new/cancelled counts and average revenue per subscription are the
// inputs, and every other figure is derived from them so the numbers agree.

export type MonthlyMetrics = {
  /** ISO month, e.g. "2026-09" */
  month: string
  /** Short axis label, e.g. "Sep" */
  label: string
  /** Long label, e.g. "Sep 2026" */
  fullLabel: string
  mrr: number
  newSubscriptions: number
  cancelledSubscriptions: number
  netSubscriptions: number
  activeSubscriptions: number
  /** Cancelled ÷ active at start of month, as a percentage */
  churnRate: number
}

const OPENING_ACTIVE_SUBSCRIPTIONS = 4180

const inputs: Array<{
  month: string
  newSubscriptions: number
  cancelledSubscriptions: number
  arpa: number
}> = [
  { month: "2025-10", newSubscriptions: 312, cancelledSubscriptions: 118, arpa: 96.4 },
  { month: "2025-11", newSubscriptions: 298, cancelledSubscriptions: 124, arpa: 96.9 },
  { month: "2025-12", newSubscriptions: 265, cancelledSubscriptions: 141, arpa: 97.2 },
  { month: "2026-01", newSubscriptions: 341, cancelledSubscriptions: 152, arpa: 98.6 },
  { month: "2026-02", newSubscriptions: 356, cancelledSubscriptions: 127, arpa: 99.1 },
  { month: "2026-03", newSubscriptions: 389, cancelledSubscriptions: 119, arpa: 99.8 },
  { month: "2026-04", newSubscriptions: 372, cancelledSubscriptions: 128, arpa: 100.4 },
  { month: "2026-05", newSubscriptions: 401, cancelledSubscriptions: 122, arpa: 101.0 },
  { month: "2026-06", newSubscriptions: 384, cancelledSubscriptions: 131, arpa: 101.7 },
  { month: "2026-07", newSubscriptions: 367, cancelledSubscriptions: 139, arpa: 102.3 },
  { month: "2026-08", newSubscriptions: 418, cancelledSubscriptions: 126, arpa: 103.1 },
  { month: "2026-09", newSubscriptions: 436, cancelledSubscriptions: 121, arpa: 103.8 },
]

const shortMonth = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" })
const longMonth = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

function buildMetrics(): MonthlyMetrics[] {
  let active = OPENING_ACTIVE_SUBSCRIPTIONS
  return inputs.map(({ month, newSubscriptions, cancelledSubscriptions, arpa }) => {
    const date = new Date(`${month}-01T00:00:00Z`)
    const opening = active
    active = opening + newSubscriptions - cancelledSubscriptions
    return {
      month,
      label: shortMonth.format(date),
      fullLabel: longMonth.format(date),
      mrr: Math.round(active * arpa),
      newSubscriptions,
      cancelledSubscriptions,
      netSubscriptions: newSubscriptions - cancelledSubscriptions,
      activeSubscriptions: active,
      churnRate: Math.round((cancelledSubscriptions / opening) * 10000) / 100,
    }
  })
}

export const monthlyMetrics = buildMetrics()
