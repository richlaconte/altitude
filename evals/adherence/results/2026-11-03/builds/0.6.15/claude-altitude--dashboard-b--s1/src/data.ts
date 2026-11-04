// Sample data for Lowmere City Libraries: six branches, monthly figures for November 2023 to October 2026.
// There is no backend; everything here is generated deterministically so the screen reads the same on every load.
// Two real-world events are written into the figures, and annotated on the charts:
//   - Ashby Green closed for roof repairs in February and March 2026 (no visits, loans or joins there).
//   - Quayside started opening on Sundays in April 2026 (loans and visits up about a fifth from then).

export type BranchId = 'central' | 'riverside' | 'northgate' | 'ashby' | 'quayside' | 'fenwick';

export interface Branch {
  id: BranchId;
  name: string;
  /** Typical month, before seasonality and growth. */
  loans: number;
  visits: number;
  members: number;
  /** Year-on-year change in the latest twelve months, as a fraction. */
  growth: number;
}

export const BRANCHES: Branch[] = [
  { id: 'central', name: 'Central Library', loans: 21400, visits: 38200, members: 410, growth: 0.04 },
  { id: 'riverside', name: 'Riverside', loans: 9800, visits: 12600, members: 190, growth: 0.07 },
  { id: 'northgate', name: 'Northgate', loans: 7300, visits: 9100, members: 150, growth: -0.03 },
  { id: 'ashby', name: 'Ashby Green', loans: 6100, visits: 7400, members: 120, growth: 0.02 },
  { id: 'quayside', name: 'Quayside', loans: 5200, visits: 8300, members: 135, growth: 0.05 },
  { id: 'fenwick', name: 'Fenwick Park', loans: 3900, visits: 4700, members: 85, growth: 0.11 },
];

export interface MonthRow {
  /** First day of the month, ISO. */
  month: string;
  loans: number;
  members: number;
  visits: number;
}

export interface MonthWithPrev extends MonthRow {
  loansPrev: number;
  membersPrev: number;
  visitsPrev: number;
}

// Seasonality by calendar month, January first. Loans and visits rise with the summer reading challenge;
// joins peak when school terms start in September and again in January.
const LOAN_SEASON = [1.05, 0.97, 1.0, 0.98, 0.95, 0.97, 1.12, 1.16, 0.98, 1.01, 0.98, 0.84];
const VISIT_SEASON = [1.02, 0.98, 1.0, 0.99, 0.96, 0.98, 1.1, 1.13, 1.0, 1.02, 0.99, 0.83];
const MEMBER_SEASON = [1.18, 0.94, 0.95, 0.9, 0.84, 0.9, 1.22, 1.17, 1.38, 1.06, 0.9, 0.62];

// A small seeded generator so the noise is stable between loads.
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x); // 0..1
}

function monthIso(year: number, monthIndex: number): string {
  const d = new Date(Date.UTC(year, monthIndex, 1));
  return d.toISOString().slice(0, 10);
}

/** 24 months: November 2024 to October 2026. The last twelve are the period shown; the first twelve are the year before. */
const MONTHS: string[] = Array.from({ length: 24 }, (_, i) => monthIso(2024, 10 + i));

function branchSeries(b: Branch, bi: number): MonthRow[] {
  return MONTHS.map((month, i) => {
    const cal = new Date(month + 'T00:00:00Z').getUTCMonth();
    const current = i >= 12;
    const growth = current ? 1 + b.growth : 1;
    let loanLift = 1;
    let visitLift = 1;
    if (b.id === 'quayside' && month >= '2026-04-01') {
      loanLift = 1.19;
      visitLift = 1.23;
    }
    const closed = b.id === 'ashby' && (month === '2026-02-01' || month === '2026-03-01');
    // Reopening months run a little hot as held reservations are collected.
    const reopened = b.id === 'ashby' && month === '2026-04-01' ? 1.18 : 1;
    const jitter = (k: number) => 0.96 + 0.08 * noise(bi * 100 + i * 7 + k);
    if (closed) return { month, loans: 0, members: 0, visits: 0 };
    return {
      month,
      loans: Math.round(b.loans * LOAN_SEASON[cal] * growth * loanLift * reopened * jitter(1)),
      visits: Math.round(b.visits * VISIT_SEASON[cal] * growth * visitLift * reopened * jitter(2)),
      members: Math.round(b.members * MEMBER_SEASON[cal] * (current ? 1 + b.growth * 1.6 : 1) * jitter(3)),
    };
  });
}

const BY_BRANCH: Record<BranchId, MonthRow[]> = Object.fromEntries(
  BRANCHES.map((b, bi) => [b.id, branchSeries(b, bi)]),
) as Record<BranchId, MonthRow[]>;

function sumRows(lists: MonthRow[][]): MonthRow[] {
  return MONTHS.map((month, i) => ({
    month,
    loans: lists.reduce((n, l) => n + l[i].loans, 0),
    members: lists.reduce((n, l) => n + l[i].members, 0),
    visits: lists.reduce((n, l) => n + l[i].visits, 0),
  }));
}

export type Scope = 'all' | BranchId;

/** The twelve months shown, each with the same month a year earlier beside it. */
export function monthsFor(scope: Scope): MonthWithPrev[] {
  const rows = scope === 'all' ? sumRows(Object.values(BY_BRANCH)) : BY_BRANCH[scope];
  return rows.slice(12).map((r, i) => ({
    ...r,
    loansPrev: rows[i].loans,
    membersPrev: rows[i].members,
    visitsPrev: rows[i].visits,
  }));
}

export interface BranchTotals {
  id: BranchId;
  name: string;
  loans: number;
  loansPrev: number;
  members: number;
  membersPrev: number;
  visits: number;
  visitsPrev: number;
}

export function branchTotals(): BranchTotals[] {
  return BRANCHES.map((b) => {
    const rows = BY_BRANCH[b.id];
    const sum = (from: number, key: keyof Omit<MonthRow, 'month'>) =>
      rows.slice(from, from + 12).reduce((n, r) => n + r[key], 0);
    return {
      id: b.id,
      name: b.name,
      loans: sum(12, 'loans'),
      loansPrev: sum(0, 'loans'),
      members: sum(12, 'members'),
      membersPrev: sum(0, 'members'),
      visits: sum(12, 'visits'),
      visitsPrev: sum(0, 'visits'),
    };
  });
}

export const PERIOD_LABEL = 'November 2025 to October 2026';
export const UPDATED = '2026-11-02';
