// Sample data: there is no backend. Twelve complete months, October 2025 to September 2026 (October 2026 is still
// being counted on 30 October, so it's left out rather than compared half-finished against September).
// Every figure below is derived from three inputs per month, so the numbers on the screen agree with each other.

export interface Month {
  /** First day of the month, ISO. */
  month: string;
  /** Active subscriptions at the end of the month. */
  active: number;
  /** Monthly recurring revenue at the end of the month, in US dollars. */
  mrr: number;
  newSubs: number;
  cancelled: number;
  /** Cancelled ÷ active at the start of the month. */
  churn: number;
  /** Average revenue per subscription, in US dollars. */
  arpa: number;
}

const ACTIVE_AT_START = 2480; // active on 30 September 2025

// month, new subscriptions, cancellations, average revenue per subscription
const INPUTS: Array<[string, number, number, number]> = [
  ['2025-10-01', 212, 118, 74.1],
  ['2025-11-01', 238, 124, 74.3],
  ['2025-12-01', 196, 141, 74.2],
  ['2026-01-01', 251, 133, 74.8],
  ['2026-02-01', 263, 129, 75.2],
  ['2026-03-01', 289, 137, 75.6],
  ['2026-04-01', 274, 146, 77.9], // Team plan price rise on 1 April
  ['2026-05-01', 301, 139, 78.4],
  ['2026-06-01', 318, 152, 78.7],
  ['2026-07-01', 296, 171, 79.0],
  ['2026-08-01', 284, 163, 79.3],
  ['2026-09-01', 342, 158, 79.8],
];

export const MONTHS: Month[] = (() => {
  let active = ACTIVE_AT_START;
  return INPUTS.map(([month, newSubs, cancelled, arpa]) => {
    const churn = cancelled / active;
    active += newSubs - cancelled;
    return { month, active, mrr: Math.round(active * arpa), newSubs, cancelled, churn, arpa };
  });
})();

export const MRR_AT_START = Math.round(ACTIVE_AT_START * 73.9);
