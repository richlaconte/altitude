// Sample data for a mid-sized B2B SaaS business, Nov 2025 – Oct 2026 (complete months only).
// Everything derived (active count, MRR, churn) is computed from the monthly flows below so the numbers agree.

export interface Month {
  key: string; // "2026-10"
  short: string; // "Oct"
  long: string; // "October 2026"
  label: string; // "Oct 2026"
  newSubs: number;
  cancelled: number;
  net: number;
  activeStart: number;
  activeEnd: number;
  arpa: number; // average revenue per subscription, USD / month
  mrr: number;
  mrrChange: number;
  churnRate: number; // cancelled / active at start of month
}

const ACTIVE_AT_START = 4520; // active subscriptions on 1 Nov 2025
const MRR_BEFORE = 389_300; // MRR at the end of Oct 2025
const NEW = [268, 251, 302, 315, 289, 336, 322, 307, 281, 344, 362, 351];
const CANCELLED = [152, 178, 169, 158, 163, 149, 171, 186, 161, 157, 166, 160];
// Slow price-mix drift upward (annual plans, seat expansion), with a little noise.
const ARPA = [86.42, 86.71, 87.18, 87.44, 87.96, 88.31, 88.62, 89.05, 89.37, 89.88, 90.41, 91.02];

export const MONTHS: Month[] = (() => {
  const out: Month[] = [];
  let active = ACTIVE_AT_START;
  let prevMrr = MRR_BEFORE;
  for (let i = 0; i < NEW.length; i++) {
    const d = new Date(Date.UTC(2025, 10 + i, 1));
    const net = NEW[i] - CANCELLED[i];
    const activeEnd = active + net;
    const mrr = Math.round((activeEnd * ARPA[i]) / 100) * 100;
    out.push({
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      short: d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
      long: d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      label: d.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      newSubs: NEW[i],
      cancelled: CANCELLED[i],
      net,
      activeStart: active,
      activeEnd,
      arpa: ARPA[i],
      mrr,
      mrrChange: mrr - prevMrr,
      churnRate: CANCELLED[i] / active,
    });
    active = activeEnd;
    prevMrr = mrr;
  }
  return out;
})();

// ---- formatting -------------------------------------------------------------

const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const int = new Intl.NumberFormat('en-US');

export const fmtUsd = (v: number) => usd0.format(v);
export const fmtInt = (v: number) => int.format(v);
export const fmtPct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
export const fmtSigned = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${int.format(Math.abs(v))}`;
export const fmtSignedUsd = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${usd0.format(Math.abs(v))}`;
export const fmtSignedPct = (v: number, digits = 1) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v * 100).toFixed(digits)}%`;

/** $553K, $1.2M, 6,078 */
export function fmtCompactUsd(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 2)}M`;
  if (Math.abs(v) >= 10_000) return `$${Math.round(v / 1000)}K`;
  return usd0.format(v);
}
