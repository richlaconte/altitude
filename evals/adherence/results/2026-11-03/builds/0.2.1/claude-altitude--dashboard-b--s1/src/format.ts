const compactFmt = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });
const fullFmt = new Intl.NumberFormat('en-GB');

/** 1,284 / 12.9K / 1.2M — full under 10,000. */
export const compact = (n: number) => (Math.abs(n) < 10000 ? fullFmt.format(n) : compactFmt.format(n));
export const full = (n: number) => fullFmt.format(Math.round(n));

export const pct = (x: number, digits = 1) => {
  const v = x * 100;
  const s = Math.abs(v).toFixed(digits);
  if (Number(s) === 0) return `0${digits ? '.' + '0'.repeat(digits) : ''}%`;
  return `${v > 0 ? '+' : '−'}${s}%`;
};

/** Round an axis max up to a clean step; returns ticks. */
export function niceTicks(max: number, count = 4) {
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
  return ticks;
}

/** Axis tick label: full under 10,000, compact on an axis that reaches it. */
export function axisFormatter(top: number) {
  return top >= 10000 ? (n: number) => compactFmt.format(n) : (n: number) => fullFmt.format(n);
}
