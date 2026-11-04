import * as React from 'react';
import { Badge } from 'altitude-design';
import { fmtPct } from './data';

/** Year-on-year change: an arrow, a sign and a tone, so direction never relies on colour alone. */
export function Change({ value, size = 'sm' }: { value: number | null; size?: 'sm' | 'lg' }) {
  if (value === null) {
    return (
      <Badge tone="neutral" variant="tinted" lamp={false} className={`change change-${size}`}>
        n/a
      </Badge>
    );
  }
  const flat = Math.abs(value) < 0.0005;
  const up = value > 0;
  const tone = flat ? 'neutral' : up ? 'positive' : 'critical';
  const arrow = flat ? '→' : up ? '▲' : '▼';
  const label = flat ? 'No change' : `${up ? 'Up' : 'Down'} ${fmtPct(value)}`;
  return (
    <Badge tone={tone} variant="tinted" lamp={false} className={`change change-${size}`} aria-label={label}>
      <span aria-hidden="true">
        {arrow} {flat ? '0.0%' : `${up ? '+' : '−'}${fmtPct(value)}`}
      </span>
    </Badge>
  );
}
