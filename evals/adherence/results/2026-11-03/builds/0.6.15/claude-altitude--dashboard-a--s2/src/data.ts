// Sample data for Drafthall, invoicing and time tracking for independent architecture practices.
// There is no backend: these figures are illustrative, fixed at the close of October 2026.

export interface MonthRow {
  /** First day of the month, ISO. */
  month: string;
  /** Monthly recurring revenue at month end, USD. */
  mrr: number;
  /** Subscriptions started in the month. */
  started: number;
  /** Subscriptions cancelled in the month. */
  cancelled: number;
  /** Active subscriptions at month end. */
  active: number;
}

/** Active subscriptions and MRR at the end of October 2025, the month before the window. */
export const OPENING = { month: '2025-10-01', active: 2140, mrr: 122194 };

const STARTED = [168, 152, 141, 187, 176, 194, 203, 188, 172, 215, 231, 246];
const CANCELLED = [61, 74, 92, 69, 72, 66, 71, 79, 83, 74, 70, 68];
// Average revenue per subscription; list prices rose on 1 May 2026.
const ARPA = [57.2, 57.3, 57.4, 57.4, 57.6, 57.7, 59.9, 60.1, 60.2, 60.4, 60.5, 60.7];

export const MONTHS: MonthRow[] = (() => {
  let active = OPENING.active;
  return STARTED.map((started, i) => {
    const cancelled = CANCELLED[i];
    active += started - cancelled;
    const d = new Date(Date.UTC(2025, 10 + i, 1));
    return { month: d.toISOString().slice(0, 10), mrr: Math.round(active * ARPA[i]), started, cancelled, active };
  });
})();

export const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const count = new Intl.NumberFormat('en-US');
export const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
