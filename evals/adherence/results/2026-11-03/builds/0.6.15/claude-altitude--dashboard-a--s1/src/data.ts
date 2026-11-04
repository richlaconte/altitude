// Sample data. There is no backend: these figures are illustrative, for "Rotawell", scheduling software sold to
// veterinary practices on a monthly plan. Twelve complete months, November 2025 to October 2026 (November 2026 has
// only just begun, so it is left out rather than shown as a partial month).
//
// Story in the numbers: a list-price change from $94 to $99 a month took effect for every account on 1 April 2026;
// cancellations peaked in January, when practices review their annual budgets; signups dipped over the holidays and
// rose sharply from August after the booking-reminders release.

export interface MonthRow {
  month: string; // ISO date of the month's first day
  label: string; // "Oct 2026"
  newSubs: number;
  cancelled: number;
  startSubs: number; // active subscriptions on the first day of the month
  endSubs: number; // active subscriptions on the last day of the month
  mrr: number; // monthly recurring revenue at month end, USD
  churnRate: number; // cancelled / startSubs
}

const OPENING_SUBSCRIPTIONS = 1180; // active on 1 November 2025
const NEW = [118, 104, 141, 132, 127, 139, 146, 121, 113, 158, 171, 164];
const CANCELLED = [52, 61, 74, 49, 55, 47, 51, 58, 63, 54, 49, 46];
const PRICE_CHANGE_INDEX = 5; // April 2026
const priceFor = (i: number) => (i < PRICE_CHANGE_INDEX ? 94 : 99);

const monthName = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

export const MONTHS: MonthRow[] = (() => {
  let active = OPENING_SUBSCRIPTIONS;
  return NEW.map((newSubs, i) => {
    const date = new Date(Date.UTC(2025, 10 + i, 1));
    const cancelled = CANCELLED[i];
    const startSubs = active;
    active = startSubs + newSubs - cancelled;
    return {
      month: date.toISOString().slice(0, 10),
      label: monthName.format(date),
      newSubs,
      cancelled,
      startSubs,
      endSubs: active,
      mrr: active * priceFor(i),
      churnRate: cancelled / startSubs,
    };
  });
})();

export const PRICE_CHANGE_MONTH = MONTHS[PRICE_CHANGE_INDEX].month;

export const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const usdCompact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
export const count = new Intl.NumberFormat('en-US');
export const percent = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
