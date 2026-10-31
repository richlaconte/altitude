// Sample data: twelve complete months for a B2B subscription product, October 2025 to September 2026.
// There is no backend; the figures are consistent with each other (active subscriptions roll forward from new and
// cancelled, and MRR is active subscriptions times the average revenue per subscription).

export interface Month {
  /** First day of the month, ISO. */
  month: string;
  mrr: number;
  newSubs: number;
  cancelled: number;
  active: number;
}

const START = '2025-10';
const ACTIVE_BEFORE = 2410;
const NEW = [212, 198, 176, 241, 229, 264, 251, 238, 226, 219, 247, 283];
const CANCELLED = [88, 94, 121, 97, 92, 101, 96, 104, 99, 112, 108, 103];
// Average monthly revenue per subscription, in USD: list prices rose in February and annual upgrades add a little each month.
const ARPU = [118.2, 118.4, 118.1, 118.6, 121.3, 121.7, 122.0, 122.4, 122.9, 123.1, 123.8, 124.5];

function monthIso(offset: number) {
  const [y, m] = START.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  return d.toISOString().slice(0, 10);
}

export const MONTHS: Month[] = (() => {
  let active = ACTIVE_BEFORE;
  return NEW.map((newSubs, i) => {
    active += newSubs - CANCELLED[i];
    return { month: monthIso(i), mrr: Math.round(active * ARPU[i]), newSubs, cancelled: CANCELLED[i], active };
  });
})();

export const LOCALE = 'en-US';

const usd = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usdCompact = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
const monthShort = new Intl.DateTimeFormat(LOCALE, { month: 'short', year: '2-digit', timeZone: 'UTC' });
const monthLong = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' });
const pct = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 1 });

export const formatUsd = (v: number) => usd.format(v);
export const formatUsdCompact = (v: number) => usdCompact.format(v);
export const formatPct = (v: number) => pct.format(v);
export const formatMonth = (v: unknown) => monthShort.format(new Date(typeof v === 'number' ? v : String(v)));
export const formatMonthLong = (v: unknown) => monthLong.format(new Date(typeof v === 'number' ? v : String(v)));

/** Monthly churn: cancellations as a share of subscriptions active at the start of the month. */
export function churn(i: number) {
  const startActive = i === 0 ? ACTIVE_BEFORE : MONTHS[i - 1].active;
  return MONTHS[i].cancelled / startActive;
}

export function toCsv(rows: Month[]) {
  const head = 'Month,MRR (USD),New subscriptions,Cancelled subscriptions,Active subscriptions';
  return [head, ...rows.map((r) => [r.month.slice(0, 7), r.mrr, r.newSubs, r.cancelled, r.active].join(','))].join('\n');
}
