// Sample data for Calder City Libraries. There is no backend: figures are generated
// deterministically from a seeded random source so they are stable between reloads.

export type MetricKey = 'loans' | 'members' | 'visits';

export const METRICS: { key: MetricKey; label: string; noun: string; description: string }[] = [
  { key: 'loans', label: 'Loans', noun: 'loans', description: 'Physical and digital items issued' },
  { key: 'members', label: 'New members', noun: 'new members', description: 'Library cards issued to new members' },
  { key: 'visits', label: 'Visits', noun: 'visits', description: 'Door-counter entries' },
];

export interface Branch {
  id: string;
  name: string;
  /** Relative size of the branch (Central = biggest). */
  size: number;
  /** Year-on-year growth per metric, applied to the latest twelve months. */
  growth: Record<MetricKey, number>;
  note?: string;
}

export const BRANCHES: Branch[] = [
  { id: 'central', name: 'Central Library', size: 3.2, growth: { loans: 0.021, members: 0.06, visits: -0.012 } },
  { id: 'riverside', name: 'Riverside', size: 1.35, growth: { loans: 0.068, members: 0.11, visits: 0.034 } },
  {
    id: 'northfield',
    name: 'Northfield',
    size: 1.1,
    growth: { loans: 0.04, members: 0.09, visits: 0.02 },
    note: 'Closed February–March 2026 for refurbishment',
  },
  { id: 'eastgate', name: 'Eastgate', size: 0.95, growth: { loans: 0.047, members: 0.05, visits: 0.008 } },
  { id: 'harbour', name: 'Harbour Point', size: 0.82, growth: { loans: -0.031, members: -0.02, visits: -0.047 } },
  { id: 'millbrook', name: 'Millbrook', size: 0.7, growth: { loans: 0.093, members: 0.18, visits: 0.061 } },
  { id: 'westhill', name: 'West Hill', size: 0.6, growth: { loans: 0.009, members: 0.03, visits: -0.018 } },
  { id: 'oakmere', name: 'Oakmere', size: 0.44, growth: { loans: -0.058, members: -0.07, visits: -0.064 } },
];

/** The latest twelve full months, oldest first: November 2025 to October 2026. */
export const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2025, 10 + i, 1);
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    short: d.toLocaleString('en-US', { month: 'short' }),
    long: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
  };
});

export const PERIOD_LABEL = 'Nov 2025 – Oct 2026';
export const PRIOR_LABEL = 'Nov 2024 – Oct 2025';

// Per-unit-size monthly baselines and calendar-month seasonality (index 0 = January).
const BASE: Record<MetricKey, number> = { loans: 15400, members: 228, visits: 10800 };
const SEASON: Record<MetricKey, number[]> = {
  // Summer reading challenge lifts July–August; December is quiet.
  loans: [1.06, 0.99, 1.01, 0.97, 0.95, 0.99, 1.21, 1.26, 0.98, 0.98, 0.96, 0.84],
  // Back-to-school sign-ups in September, New Year resolutions in January.
  members: [1.24, 0.96, 0.94, 0.9, 0.86, 0.95, 1.18, 1.14, 1.38, 1.02, 0.86, 0.62],
  visits: [0.95, 0.98, 1.02, 1.0, 0.97, 1.0, 1.13, 1.16, 1.03, 1.01, 0.98, 0.79],
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Series {
  current: number[];
  prior: number[];
}

export type BranchData = Record<MetricKey, Series>;

function generate(): Record<string, BranchData> {
  const rand = mulberry32(20261103);
  const out: Record<string, BranchData> = {};
  for (const b of BRANCHES) {
    const data = {} as BranchData;
    for (const m of METRICS) {
      const noise = m.key === 'members' ? 0.09 : 0.04;
      const make = (yearOffset: 0 | 1) =>
        MONTHS.map(({ month, year }, i) => {
          const calYear = year - (yearOffset === 0 ? 1 : 0);
          // Growth ramps in across the latest year rather than stepping up overnight.
          const g = yearOffset === 1 ? 1 + b.growth[m.key] * (0.6 + (0.8 * i) / 11) : 1;
          let v = BASE[m.key] * b.size * SEASON[m.key][month] * g * (1 + (rand() * 2 - 1) * noise);
          if (b.id === 'northfield' && calYear === 2026) {
            if (month === 1 || month === 2) v = 0; // closed
            else if (month === 0) v *= 0.82; // run-down before closure
            else if (month === 3 || month === 4) v *= 1.24; // reopening bounce
          }
          return Math.round(v);
        });
      data[m.key] = { prior: make(0), current: make(1) };
    }
    out[b.id] = data;
  }
  return out;
}

export const DATA = generate();

export function seriesFor(branchId: string, metric: MetricKey): Series {
  if (branchId !== 'all') return DATA[branchId][metric];
  const current = new Array(12).fill(0);
  const prior = new Array(12).fill(0);
  for (const b of BRANCHES) {
    const s = DATA[b.id][metric];
    for (let i = 0; i < 12; i++) {
      current[i] += s.current[i];
      prior[i] += s.prior[i];
    }
  }
  return { current, prior };
}

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Fractional change, or null when there is no baseline. */
export const change = (now: number, before: number) => (before === 0 ? null : (now - before) / before);

const full = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export const fmt = (n: number) => full.format(n);
export const fmtCompact = (n: number) => (n < 10000 ? full.format(n) : compact.format(n));
export const fmtPct = (p: number) => `${Math.abs(p * 100).toFixed(1)}%`;
