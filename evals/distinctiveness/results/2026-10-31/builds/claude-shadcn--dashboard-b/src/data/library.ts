// Sample data for the Riverton Public Library service. There is no backend:
// figures are generated deterministically so every load shows the same numbers.

export type MetricKey = "loans" | "members" | "visits"

export const METRICS: Record<
  MetricKey,
  { label: string; short: string; description: string }
> = {
  loans: {
    label: "Loans",
    short: "Loans",
    description: "Physical and digital items issued, including renewals",
  },
  members: {
    label: "New members",
    short: "New members",
    description: "Library cards issued to first-time members",
  },
  visits: {
    label: "Visits",
    short: "Visits",
    description: "Door-counter entries across opening hours",
  },
}

export const METRIC_KEYS: MetricKey[] = ["loans", "members", "visits"]

type Branch = {
  id: string
  name: string
  base: Record<MetricKey, number>
  /** Year-on-year growth multiplier, applied smoothly month by month. */
  growth: Record<MetricKey, number>
  /** Optional per-month override, e.g. a closure or a new service. */
  adjust?: (month: string) => Partial<Record<MetricKey, number>>
}

const BRANCHES: Branch[] = [
  {
    id: "central",
    name: "Central Library",
    base: { loans: 41800, members: 510, visits: 37200 },
    growth: { loans: 1.012, members: 1.04, visits: 1.02 },
  },
  {
    id: "northgate",
    name: "Northgate",
    base: { loans: 17900, members: 205, visits: 12600 },
    growth: { loans: 1.03, members: 1.05, visits: 1.025 },
  },
  {
    id: "eastside",
    name: "Eastside",
    base: { loans: 14600, members: 180, visits: 11300 },
    growth: { loans: 1.04, members: 1.08, visits: 1.03 },
    // Makerspace opened in May 2026 and draws extra footfall.
    adjust: (m) => (m >= "2026-05" ? { visits: 1.14, members: 1.18 } : {}),
  },
  {
    id: "harbour",
    name: "Harbour View",
    base: { loans: 11200, members: 132, visits: 9100 },
    growth: { loans: 0.965, members: 0.96, visits: 0.97 },
  },
  {
    id: "millbrook",
    name: "Millbrook",
    base: { loans: 9300, members: 118, visits: 7800 },
    growth: { loans: 1.02, members: 1.03, visits: 1.02 },
    // Closed for refurbishment Jan–Mar 2026; a pop-up desk kept some loans going.
    adjust: (m) =>
      m >= "2026-01" && m <= "2026-03"
        ? { loans: 0.14, members: 0.2, visits: 0.06 }
        : m >= "2026-04"
          ? { loans: 1.08, members: 1.25, visits: 1.1 }
          : {},
  },
  {
    id: "westfield",
    name: "Westfield",
    base: { loans: 7200, members: 104, visits: 5900 },
    // New housing estates nearby.
    growth: { loans: 1.13, members: 1.22, visits: 1.12 },
  },
]

export const BRANCH_OPTIONS = BRANCHES.map(({ id, name }) => ({ id, name }))

export const CLOSURE = {
  branchId: "millbrook",
  from: "2026-01",
  to: "2026-03",
  label: "Millbrook closed for refurbishment",
}

// Calendar-month seasonality (Jan = index 0).
const SEASON: Record<MetricKey, number[]> = {
  loans: [1.05, 1.0, 1.02, 0.98, 0.95, 0.97, 1.18, 1.22, 0.98, 1.0, 0.98, 0.82],
  members: [1.1, 0.95, 0.95, 0.9, 0.85, 0.9, 1.35, 1.2, 1.42, 1.0, 0.86, 0.6],
  visits: [1.02, 1.0, 1.03, 0.98, 0.95, 0.94, 1.12, 1.15, 1.0, 1.02, 0.99, 0.8],
}

// 24 months: Nov 2024 – Oct 2026. The last 12 are the reporting period.
export const MONTHS: string[] = Array.from({ length: 24 }, (_, i) => {
  const d = new Date(Date.UTC(2024, 10 + i, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
})

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Row = { branchId: string; month: string } & Record<MetricKey, number>

const ROWS: Row[] = (() => {
  const rand = mulberry32(20261030)
  const rows: Row[] = []
  for (const branch of BRANCHES) {
    MONTHS.forEach((month, t) => {
      const calendarMonth = Number(month.slice(5)) - 1
      const adj = branch.adjust?.(month) ?? {}
      const row = { branchId: branch.id, month } as Row
      for (const key of METRIC_KEYS) {
        const noise = 1 + (rand() - 0.5) * 0.08
        const trend = Math.pow(branch.growth[key], (t - 12) / 12)
        row[key] = Math.round(
          branch.base[key] *
            SEASON[key][calendarMonth] *
            trend *
            noise *
            (adj[key] ?? 1)
        )
      }
      rows.push(row)
    })
  }
  return rows
})()

export type MonthlyPoint = {
  month: string
  label: string
  fullLabel: string
  current: number
  previous: number
}

const shortMonth = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  timeZone: "UTC",
})
const longMonth = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})
const toDate = (month: string) => new Date(`${month}-01T00:00:00Z`)

export const monthLabel = (month: string) => shortMonth.format(toDate(month))
export const monthLongLabel = (month: string) =>
  longMonth.format(toDate(month))

export const PERIOD = {
  current: { from: MONTHS[12], to: MONTHS[23] },
  previous: { from: MONTHS[0], to: MONTHS[11] },
}

function sumFor(branchId: string | "all", metric: MetricKey, month: string) {
  return ROWS.filter(
    (r) => r.month === month && (branchId === "all" || r.branchId === branchId)
  ).reduce((acc, r) => acc + r[metric], 0)
}

/** Last 12 months, each paired with the same month a year earlier. */
export function monthlySeries(
  branchId: string | "all",
  metric: MetricKey
): MonthlyPoint[] {
  return MONTHS.slice(12).map((month, i) => ({
    month,
    label: monthLabel(month),
    fullLabel: monthLongLabel(month),
    current: sumFor(branchId, metric, month),
    previous: sumFor(branchId, metric, MONTHS[i]),
  }))
}

export type Summary = {
  current: number
  previous: number
  change: number
  latest: number
  latestPrevYear: number
  latestChange: number
}

export function summary(branchId: string | "all", metric: MetricKey): Summary {
  const series = monthlySeries(branchId, metric)
  const current = series.reduce((a, p) => a + p.current, 0)
  const previous = series.reduce((a, p) => a + p.previous, 0)
  const last = series[series.length - 1]
  return {
    current,
    previous,
    change: current / previous - 1,
    latest: last.current,
    latestPrevYear: last.previous,
    latestChange: last.current / last.previous - 1,
  }
}

export type BranchSummary = {
  id: string
  name: string
} & Record<MetricKey, Summary>

export function branchSummaries(): BranchSummary[] {
  return BRANCHES.map(({ id, name }) => ({
    id,
    name,
    loans: summary(id, "loans"),
    members: summary(id, "members"),
    visits: summary(id, "visits"),
  }))
}
