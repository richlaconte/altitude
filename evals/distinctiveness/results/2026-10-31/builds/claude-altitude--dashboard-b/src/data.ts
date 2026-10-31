// Sample data for Halden City Libraries: seven service points, monthly, October 2024 to September 2026.
// There is no backend. Figures are generated deterministically so every build shows the same numbers.
//   Seasonality: the Summer Reading Challenge lifts July and August; December is quiet.
//   Riverside closed for refurbishment through March 2026 and reopened in April with a children's floor,
//   so its year-on-year growth starts from April.

export type Measure = 'loans' | 'members' | 'visits';

export const MEASURES: Record<Measure, { label: string; noun: string; short: string }> = {
  loans: { label: 'Loans', noun: 'loans', short: 'Loans' },
  members: { label: 'New members', noun: 'new members', short: 'New members' },
  visits: { label: 'Visits', noun: 'visits', short: 'Visits' },
};

export interface Branch {
  id: string;
  name: string;
  base: Record<Measure, number>;
  growth: Record<Measure, number>;
}

export const BRANCHES: Branch[] = [
  { id: 'central', name: 'Central Library', base: { loans: 21000, members: 420, visits: 30500 }, growth: { loans: 0.03, members: 0.05, visits: 0.02 } },
  { id: 'northgate', name: 'Northgate', base: { loans: 9600, members: 175, visits: 12400 }, growth: { loans: 0.05, members: 0.07, visits: 0.04 } },
  { id: 'riverside', name: 'Riverside', base: { loans: 8200, members: 150, visits: 9800 }, growth: { loans: 0.2, members: 0.32, visits: 0.24 } },
  { id: 'eastfield', name: 'Eastfield', base: { loans: 6800, members: 130, visits: 8900 }, growth: { loans: 0.09, members: 0.14, visits: 0.11 } },
  { id: 'westbrook', name: 'Westbrook Park', base: { loans: 5400, members: 95, visits: 6600 }, growth: { loans: -0.04, members: -0.06, visits: -0.05 } },
  { id: 'mill-lane', name: 'Mill Lane', base: { loans: 3100, members: 60, visits: 4200 }, growth: { loans: 0.01, members: 0.02, visits: 0 } },
  { id: 'mobile', name: 'Mobile Library', base: { loans: 1900, members: 25, visits: 2300 }, growth: { loans: -0.06, members: -0.1, visits: -0.07 } },
];

// By calendar month, January first.
const SEASON: Record<Measure, number[]> = {
  loans: [1.02, 0.97, 1.0, 0.98, 0.95, 0.97, 1.18, 1.15, 0.96, 1.0, 0.98, 0.84],
  members: [1.25, 0.95, 0.95, 0.9, 0.85, 0.9, 1.55, 1.35, 1.15, 0.95, 0.8, 0.6],
  visits: [1.0, 0.96, 1.0, 0.99, 0.97, 1.0, 1.16, 1.13, 0.97, 1.01, 0.97, 0.82],
};

const iso = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}-01`;
/** Twelve month starts, oldest first, ending with the given month (0-based). */
const monthsEnding = (y: number, m: number) =>
  Array.from({ length: 12 }, (_, i) => { const t = y * 12 + m - 11 + i; return { year: Math.floor(t / 12), month: t % 12 }; });

export const CURRENT = monthsEnding(2026, 8); // October 2025 – September 2026
export const PREVIOUS = monthsEnding(2025, 8); // October 2024 – September 2025
export const RIVERSIDE_CLOSED = '2026-03-01';

/** A small, repeatable wobble so months and branches don't move in lockstep. */
const wobble = (seed: number) => 1 + 0.035 * Math.sin(seed * 12.9898) + 0.02 * Math.cos(seed * 4.1414);

function value(b: Branch, bi: number, k: Measure, year: number, month: number, current: boolean): number {
  const mi = ['loans', 'members', 'visits'].indexOf(k);
  let v = b.base[k] * SEASON[k][month] * wobble(bi * 97 + mi * 31 + year * 12 + month);
  if (b.id === 'riverside') {
    const closed = year === 2026 && month === 2;
    const reopened = year * 12 + month >= 2026 * 12 + 3;
    if (closed) v *= k === 'loans' ? 0.12 : k === 'visits' ? 0.04 : 0.05; // home delivery and the book drop only
    else if (current && reopened) v *= 1 + b.growth[k];
    else if (current) v *= 0.98;
  } else if (current) v *= 1 + b.growth[k];
  return Math.round(v);
}

export interface BranchSeries {
  branch: Branch;
  current: Record<Measure, number[]>;
  previous: Record<Measure, number[]>;
}

export const SERIES: BranchSeries[] = BRANCHES.map((b, bi) => {
  const run = (months: typeof CURRENT, current: boolean) =>
    (Object.fromEntries((['loans', 'members', 'visits'] as Measure[]).map((k) => [k, months.map((m) => value(b, bi, k, m.year, m.month, current))])) as Record<Measure, number[]>);
  return { branch: b, current: run(CURRENT, true), previous: run(PREVIOUS, false) };
});

const sum = (xs: number[]) => xs.reduce((n, x) => n + x, 0);

/** The service's monthly totals for a measure, with the same month a year earlier on each record. */
export function serviceMonths(k: Measure) {
  return CURRENT.map((m, i) => ({
    month: iso(m.year, m.month),
    [k]: sum(SERIES.map((s) => s.current[k][i])),
    lastYear: sum(SERIES.map((s) => s.previous[k][i])),
  }));
}

export function totals(k: Measure) {
  const now = sum(SERIES.map((s) => sum(s.current[k])));
  const before = sum(SERIES.map((s) => sum(s.previous[k])));
  return { now, before, change: now / before - 1 };
}

export function branchRows(k: Measure) {
  const all = totals(k).now;
  return SERIES.map((s) => {
    const now = sum(s.current[k]), before = sum(s.previous[k]);
    return { id: s.branch.id, name: s.branch.name, now, before, change: now / before - 1, share: now / all, months: s.current[k] };
  }).sort((a, b) => b.now - a.now);
}
