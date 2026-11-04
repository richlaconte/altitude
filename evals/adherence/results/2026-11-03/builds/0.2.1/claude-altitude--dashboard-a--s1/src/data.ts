// Sample data for a B2B SaaS business, Nov 2025 – Oct 2026 (last 12 complete months).
// Inputs are hand-set per month; every total is derived so the numbers reconcile.

export interface MonthRow {
  key: string;          // 2026-10
  label: string;        // Oct
  longLabel: string;    // October 2026
  startMrr: number;
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number;
  endMrr: number;
  netNewMrr: number;
  startSubs: number;
  newSubs: number;
  cancelledSubs: number;
  endSubs: number;
  churnRate: number;    // cancelled / starting subs
}

const OPENING_MRR = 214_860;
const OPENING_SUBS = 2_412;

// [year, monthIndex, newSubs, cancelledSubs, avgNewPrice, avgChurnedPrice, expansion, contraction]
const INPUTS: Array<[number, number, number, number, number, number, number, number]> = [
  [2025, 10, 168, 71, 92, 84, 3_940, 1_310],
  [2025, 11, 176, 78, 93, 83, 4_120, 1_580],
  [2026, 0, 152, 92, 94, 86, 3_210, 2_240], // January: annual-budget churn
  [2026, 1, 198, 74, 94, 85, 4_380, 1_460],
  [2026, 2, 214, 69, 95, 84, 4_760, 1_390],
  [2026, 3, 231, 81, 95, 86, 5_020, 1_720],
  [2026, 4, 207, 77, 96, 85, 4_690, 1_540],
  [2026, 5, 226, 72, 96, 87, 5_310, 1_480],
  [2026, 6, 244, 86, 97, 86, 5_580, 1_910],
  [2026, 7, 219, 79, 97, 88, 5_140, 1_660],
  [2026, 8, 252, 74, 98, 87, 5_870, 1_530],
  [2026, 9, 268, 83, 98, 88, 6_240, 1_780],
];

const SHORT = new Intl.DateTimeFormat('en-US', { month: 'short' });
const LONG = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

export const MONTHS: MonthRow[] = (() => {
  let mrr = OPENING_MRR;
  let subs = OPENING_SUBS;
  return INPUTS.map(([y, m, newSubs, cancelledSubs, newPrice, churnPrice, expansionMrr, contractionMrr]) => {
    const d = new Date(y, m, 1);
    const newMrr = newSubs * newPrice;
    const churnedMrr = cancelledSubs * churnPrice;
    const netNewMrr = newMrr + expansionMrr - contractionMrr - churnedMrr;
    const row: MonthRow = {
      key: `${y}-${String(m + 1).padStart(2, '0')}`,
      label: SHORT.format(d),
      longLabel: LONG.format(d),
      startMrr: mrr,
      newMrr,
      expansionMrr,
      contractionMrr,
      churnedMrr,
      endMrr: mrr + netNewMrr,
      netNewMrr,
      startSubs: subs,
      newSubs,
      cancelledSubs,
      endSubs: subs + newSubs - cancelledSubs,
      churnRate: cancelledSubs / subs,
    };
    mrr = row.endMrr;
    subs = row.endSubs;
    return row;
  });
})();

export const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export const moneyCompact = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const int = (n: number) => new Intl.NumberFormat('en-US').format(n);

export const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;

export const signed = (n: number, fmt: (n: number) => string) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
