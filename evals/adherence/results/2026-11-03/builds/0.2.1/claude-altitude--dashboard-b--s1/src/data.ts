// Sample data for a city library service: six branches, 24 months (Nov 2024 – Oct 2026).
// Deterministic so the dashboard reads the same on every load.

export type Metric = 'loans' | 'members' | 'visits';

export const METRICS: { key: Metric; label: string; noun: string; short: string }[] = [
  { key: 'loans', label: 'Loans', noun: 'loans', short: 'Loans' },
  { key: 'members', label: 'New members', noun: 'new members', short: 'New members' },
  { key: 'visits', label: 'Visits', noun: 'visits', short: 'Visits' },
];

export interface Branch {
  id: string;
  name: string;
  note?: string;
}

export const BRANCHES: Branch[] = [
  { id: 'central', name: 'Central Library' },
  { id: 'riverside', name: 'Riverside' },
  { id: 'northgate', name: 'Northgate', note: 'Makerspace and study rooms opened March 2025' },
  { id: 'eastfield', name: 'Eastfield', note: 'Closed for refurbishment 9 February – 29 March 2026' },
  { id: 'harbour', name: 'Harbour View', note: 'Opening hours cut from six days to five in January 2025' },
  { id: 'oakwood', name: 'Oakwood' },
];

/** 24 months, oldest first. Index 0–11 is the previous year, 12–23 the latest twelve months. */
export const MONTHS = Array.from({ length: 24 }, (_, i) => {
  const d = new Date(2024, 10 + i, 1);
  return {
    index: i,
    month: d.getMonth(),
    year: d.getFullYear(),
    short: d.toLocaleString('en-GB', { month: 'short' }),
    long: d.toLocaleString('en-GB', { month: 'long', year: 'numeric' }),
  };
});

export const CURRENT = MONTHS.slice(12);
export const PERIOD_LABEL = 'Nov 2025 – Oct 2026';
export const PRIOR_LABEL = 'Nov 2024 – Oct 2025';

// Calendar-month seasonality (Jan..Dec). Loans peak with the summer reading challenge,
// sign-ups spike in January and at the start of the school year, everything dips at Christmas.
const SEASON: Record<Metric, number[]> = {
  loans: [1.03, 0.98, 1.01, 0.97, 0.94, 0.99, 1.21, 1.26, 0.96, 1.0, 0.96, 0.77],
  visits: [0.99, 0.97, 1.03, 0.98, 0.97, 1.0, 1.12, 1.1, 1.01, 1.04, 1.0, 0.76],
  members: [1.46, 1.04, 0.98, 0.9, 0.84, 0.93, 1.24, 1.12, 1.27, 0.96, 0.8, 0.58],
};

// Typical month (at the start of the window) and annual growth for each branch.
const PROFILE: Record<string, { base: Record<Metric, number>; growth: Record<Metric, number> }> = {
  central: { base: { loans: 41200, visits: 52600, members: 830 }, growth: { loans: -0.021, visits: 0.034, members: 0.046 } },
  riverside: { base: { loans: 15800, visits: 17400, members: 305 }, growth: { loans: 0.028, visits: 0.022, members: 0.031 } },
  northgate: { base: { loans: 11900, visits: 13600, members: 270 }, growth: { loans: 0.118, visits: 0.162, members: 0.19 } },
  eastfield: { base: { loans: 9700, visits: 11900, members: 205 }, growth: { loans: 0.012, visits: 0.01, members: 0.02 } },
  harbour: { base: { loans: 7600, visits: 9400, members: 168 }, growth: { loans: -0.064, visits: -0.081, members: -0.05 } },
  oakwood: { base: { loans: 5150, visits: 6350, members: 118 }, growth: { loans: 0.017, visits: 0.025, members: 0.008 } },
};

// Small deterministic noise.
function noise(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x); // 0..1
}

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function event(branch: string, i: number, metric: Metric) {
  const m = MONTHS[i];
  // Eastfield refurbishment: closed most of Feb and Mar 2026, then a reopening bump.
  if (branch === 'eastfield' && m.year === 2026) {
    const closed: Record<number, number> = { 1: 0.27, 2: 0.08 };
    const reopen: Record<number, number> = { 3: 1.24, 4: 1.15, 5: 1.08 };
    if (m.month in closed) return closed[m.month] * (metric === 'members' ? 0.6 : 1);
    if (m.month in reopen) return reopen[m.month] * (metric === 'members' ? 1.15 : 1);
  }
  // Northgate's makerspace (March 2025) lifts it in steps, then it keeps climbing.
  if (branch === 'northgate' && (m.year === 2024 || (m.year === 2025 && m.month < 2))) return 0.93;
  return 1;
}

function value(branch: string, metric: Metric, i: number) {
  const p = PROFILE[branch];
  const trend = Math.pow(1 + p.growth[metric], i / 12);
  const n = 1 + (noise(hash(branch + metric) + i) - 0.5) * 0.06;
  return Math.round(p.base[metric] * SEASON[metric][MONTHS[i].month] * trend * n * event(branch, i, metric));
}

/** series[branchId][metric] = 24 monthly values */
export const SERIES: Record<string, Record<Metric, number[]>> = Object.fromEntries(
  BRANCHES.map((b) => [
    b.id,
    {
      loans: MONTHS.map((_, i) => value(b.id, 'loans', i)),
      visits: MONTHS.map((_, i) => value(b.id, 'visits', i)),
      members: MONTHS.map((_, i) => value(b.id, 'members', i)),
    },
  ]),
);

export function seriesFor(branchId: string, metric: Metric): number[] {
  if (branchId !== 'all') return SERIES[branchId][metric];
  return MONTHS.map((_, i) => BRANCHES.reduce((s, b) => s + SERIES[b.id][metric][i], 0));
}

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function totals(branchId: string, metric: Metric) {
  const s = seriesFor(branchId, metric);
  const current = sum(s.slice(12));
  const prior = sum(s.slice(0, 12));
  return { current, prior, change: current / prior - 1, monthly: s };
}
