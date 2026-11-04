// Sample figures for Calder City Libraries. There is no backend: every number here is generated
// deterministically so the screen is the same on every load. The shapes are realistic (a December dip, the
// summer reading challenge in July and August, a January and September rush of new members, Kestrel Park closed
// for refurbishment from November 2025 to February 2026), but the figures are illustrative, not real.

export type MeasureKey = 'loans' | 'members' | 'visits';

export interface Measure {
  key: MeasureKey;
  label: string;
  /** Lower-case, for use mid-sentence. */
  noun: string;
  help: string;
}

export const MEASURES: Measure[] = [
  { key: 'loans', label: 'Loans', noun: 'loans', help: 'Physical and digital items issued, including renewals.' },
  { key: 'members', label: 'New members', noun: 'new members', help: 'Library cards issued to people who had none.' },
  { key: 'visits', label: 'Visits', noun: 'visits', help: 'Entrances counted at branch doors.' },
];

export interface Branch {
  id: string;
  name: string;
  base: Record<MeasureKey, number>;
  /** Months (0 = November) this branch was closed in the current year. */
  closed?: number[];
  note?: string;
}

export const BRANCHES: Branch[] = [
  { id: 'central', name: 'Central Library', base: { loans: 21400, members: 310, visits: 26200 } },
  { id: 'harbourside', name: 'Harbourside', base: { loans: 9350, members: 128, visits: 11800 } },
  { id: 'millbrook', name: 'Millbrook', base: { loans: 7820, members: 96, visits: 8650 } },
  { id: 'st-annes', name: 'St Anne’s Road', base: { loans: 6140, members: 82, visits: 7900 } },
  { id: 'kestrel', name: 'Kestrel Park', base: { loans: 5180, members: 71, visits: 6420 }, closed: [0, 1, 2, 3], note: 'Closed for refurbishment November 2025 to February 2026; reopened 2 March 2026.' },
  { id: 'ashgrove', name: 'Ashgrove', base: { loans: 3960, members: 44, visits: 4730 } },
];

// Seasonal shape per measure, November to October.
const SEASON: Record<MeasureKey, number[]> = {
  loans: [1.0, 0.81, 1.04, 0.98, 1.02, 0.97, 0.95, 0.99, 1.19, 1.24, 0.94, 1.03],
  members: [0.86, 0.62, 1.38, 0.95, 0.92, 0.9, 0.84, 0.88, 1.42, 1.31, 1.27, 1.0],
  visits: [1.0, 0.78, 1.0, 0.99, 1.03, 0.98, 0.96, 1.0, 1.1, 1.12, 0.98, 1.04],
};

// Growth over the year before, per measure (the current year is this much above it before closures).
const GROWTH: Record<MeasureKey, number> = { loans: 1.047, members: 1.091, visits: 1.028 };

const jitter = (month: number, branch: number, k: number) => 1 + 0.035 * Math.sin(month * 12.9898 + branch * 78.233 + k * 3.71);

export const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(Date.UTC(2025, 10 + i, 1));
  return d.toISOString().slice(0, 10);
});

const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthShort = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
export const longMonth = (iso: string) => monthName.format(new Date(iso + 'T00:00:00Z'));
export const shortMonth = (iso: string) => monthShort.format(new Date(iso + 'T00:00:00Z'));

/** One branch's monthly values for a measure: `current` (Nov 2025 to Oct 2026) and `previous` (Nov 2024 to Oct 2025). */
function series(b: number, m: MeasureKey) {
  const branch = BRANCHES[b];
  const k = MEASURES.findIndex((x) => x.key === m);
  const current: number[] = [];
  const previous: number[] = [];
  for (let i = 0; i < 12; i++) {
    const base = branch.base[m] * SEASON[m][i];
    previous.push(Math.round((base / GROWTH[m]) * jitter(i, b, k + 7)));
    if (branch.closed?.includes(i)) { current.push(0); continue; }
    // A refurbished branch draws people back: more loans and sign-ups for a few months after reopening.
    const reopen = branch.closed && i > Math.max(...branch.closed) ? (m === 'members' ? 1.7 : 1.22) - 0.04 * (i - Math.max(...branch.closed) - 1) : 1;
    current.push(Math.round(base * reopen * (1 + 0.004 * i) * jitter(i, b, k)));
  }
  return { current, previous };
}

export const FIGURES: Record<string, Record<MeasureKey, { current: number[]; previous: number[] }>> = Object.fromEntries(
  BRANCHES.map((br, b) => [br.id, { loans: series(b, 'loans'), members: series(b, 'members'), visits: series(b, 'visits') }]),
);

export const ALL = 'all';

/** Monthly values for a measure, for one branch or all of them added together. */
export function monthly(branchId: string, m: MeasureKey) {
  const ids = branchId === ALL ? BRANCHES.map((b) => b.id) : [branchId];
  const sum = (key: 'current' | 'previous') => MONTHS.map((_, i) => ids.reduce((n, id) => n + FIGURES[id][m][key][i], 0));
  return { current: sum('current'), previous: sum('previous') };
}

export const total = (xs: number[]) => xs.reduce((n, x) => n + x, 0);
