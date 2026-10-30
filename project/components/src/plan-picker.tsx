import * as React from 'react';
import { cx, Icons, useControllable, useIsoLayoutEffect } from './core';
import { Badge } from './controls';
import { FormattedNumber, formatNumber } from './formatted-number';
import { ToggleGroup, ToggleGroupItem } from './toggle';
import { useRoving } from './roving';

/* ───────────────────────── PlanPicker ───────────────────────── */

export interface Plan {
  id: string;
  name: string;
  description?: React.ReactNode;
  /** In minor units (cents), per period; a single number is the same for both. Null: no price (Contact sales). */
  price: { month: number; year: number } | number | null;
  /** ISO 4217. Default 'USD'. */
  currency?: string;
  /** What the price is for ("per seat"). */
  unit?: string;
  features?: string[];
  /** Why it can't be chosen ("Contact sales for more than 500 seats"). */
  unavailable?: string;
}
export interface PlanPickerProps {
  plans: Plan[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** The plan they're on now: a "Current plan" plate. */
  current?: string;
  /** A plan you suggest: a "Recommended" plate, never extra height. */
  recommended?: string;
  /** The billing period, with a Monthly / Annually switch when onPeriodChange is given. Annual prices are per month, billed yearly. */
  period?: 'month' | 'year';
  onPeriodChange?: (period: 'month' | 'year') => void;
  locale?: string;
  'aria-label'?: string;
  className?: string;
}
/**
 * Choose a plan. The plans are positions in one choice, so the cards lie flush and one raised mark travels to the chosen
 * one, as RadioGroup's thumb does. "Current plan" and "Recommended" are plates, not height: marketing emphasis isn't
 * importance. The only level-2 slab is your Continue button, outside it.
 */
export function PlanPicker({ plans, value, defaultValue, onValueChange, current, recommended, period = 'month', onPeriodChange, locale, 'aria-label': label = 'Plans', className }: PlanPickerProps) {
  const [v, setV] = useControllable(value, defaultValue ?? current ?? plans[0]?.id, onValueChange);
  const roving = useRoving<HTMLDivElement>({
    onMove: (el) => { const id = el.dataset.plan; if (id && !el.hasAttribute('aria-disabled')) setV(id); },
    initial: (box) => box.querySelector<HTMLElement>('[aria-checked="true"]'),
  });
  const [mark, setMark] = React.useState({ x: 0, y: 0, on: false, ready: false });
  const place = React.useCallback(() => {
    const el = roving.ref.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    setMark((m) => (el ? { x: el.offsetLeft + el.offsetWidth - 22, y: el.offsetTop + 22, on: true, ready: m.on || m.ready } : { ...m, on: false }));
  }, [roving.ref]);
  useIsoLayoutEffect(() => { place(); }, [v, place, plans.length]);
  React.useEffect(() => {
    if (!roving.ref.current) return;
    const ro = new ResizeObserver(place); ro.observe(roving.ref.current);
    return () => ro.disconnect();
  }, [place, roving.ref]);

  const priceOf = (p: Plan) => (p.price === null ? null : typeof p.price === 'number' ? p.price : p.price[period]);
  const spoken = (p: Plan) => {
    const amount = priceOf(p);
    if (amount === null) return 'price on request';
    return `${formatNumber(amount, { format: 'currency', currency: p.currency ?? 'USD', locale })}${p.unit ? ` ${p.unit}` : ''} per month${period === 'year' ? ', billed annually' : ''}`;
  };
  return (
    <div className={cx('alt-plans', className)}>
      {onPeriodChange && (
        <ToggleGroup type="single" value={period} onValueChange={(p) => p && onPeriodChange(p as 'month' | 'year')} aria-label="Billing period" className="alt-plans-period">
          <ToggleGroupItem value="month">Monthly</ToggleGroupItem>
          <ToggleGroupItem value="year">Annually</ToggleGroupItem>
        </ToggleGroup>
      )}
      <div {...roving} role="radiogroup" aria-label={label} className="alt-plans-grid">
        {plans.map((p) => {
          const on = p.id === v, amount = priceOf(p);
          const id = `alt-plan-${p.id}`;
          return (
            <div key={p.id} role="radio" aria-checked={on} aria-disabled={p.unavailable ? true : undefined} data-roving-item="" data-plan={p.id}
              aria-label={`${p.name}, ${spoken(p)}${p.id === current ? ', current plan' : ''}${p.id === recommended ? ', recommended' : ''}`} aria-describedby={`${id}-d`}
              className="alt-plan" data-chosen={on ? '' : undefined} onClick={() => { if (!p.unavailable) setV(p.id); }}>
              <div className="alt-plan-head">
                <span className="alt-plan-name">{p.name}</span>
                <span className="alt-plan-plates" aria-hidden="true">
                  {p.id === current && <Badge tone="neutral">Current plan</Badge>}
                  {p.id === recommended && <Badge tone="accent" lamp={false}>Recommended</Badge>}
                </span>
              </div>
              <div className="alt-plan-price" aria-hidden="true">
                {amount === null ? <span className="alt-plan-amount">Contact sales</span>
                  : <><span className="alt-plan-amount"><FormattedNumber value={amount} format="currency" currency={p.currency ?? 'USD'} locale={locale} maximumFractionDigits={amount % 100 ? 2 : 0} minimumFractionDigits={amount % 100 ? 2 : 0} /></span>
                    <span className="alt-plan-per">{p.unit ? `${p.unit} ` : ''}/ month{period === 'year' ? ', billed annually' : ''}</span></>}
              </div>
              <div id={`${id}-d`} className="alt-plan-desc">
                {p.description && <p>{p.description}</p>}
                {p.features && <ul>{p.features.map((f) => <li key={f}><Icons.Check size={14} aria-hidden="true" />{f}</li>)}</ul>}
                {p.unavailable && <p className="alt-plan-why">{p.unavailable}</p>}
              </div>
            </div>
          );
        })}
        <span className="alt-plans-mark" aria-hidden="true" data-ready={mark.ready ? '' : undefined} style={{ transform: `translate(${mark.x}px, ${mark.y}px)`, opacity: mark.on ? 1 : 0 }} />
      </div>
    </div>
  );
}
