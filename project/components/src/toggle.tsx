import * as React from 'react';
import { cx, useControllable, useIsoLayoutEffect } from './core';
import { Button, ButtonProps } from './controls';
import { RovingCtx, useRoving } from './roving';

/* ───────────────────────── Toggle ───────────────────────── */

export interface ToggleProps extends Omit<ButtonProps, 'variant' | 'onChange'> {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  /** ghost (default): flush at rest, as in a toolbar. secondary: a raised slab at rest. */
  variant?: 'ghost' | 'secondary';
}
/**
 * A button that stays on. On is a choice, so it's built like the Switch, not like a held press: the face is cut into a
 * shallow well with accent-soft poured in and the label in accent-ink. Its name never changes; aria-pressed says it.
 */
export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { pressed, defaultPressed = false, onPressedChange, variant = 'ghost', className, onClick, ...rest }, ref) {
  const [on, setOn] = useControllable(pressed, defaultPressed, onPressedChange);
  const roving = React.useContext(RovingCtx);
  return <Button ref={ref} variant={variant} className={cx('alt-toggle', className)} aria-pressed={on} data-roving-item={roving ? '' : undefined}
    {...rest} onClick={(e) => { onClick?.(e); if (!e.defaultPrevented) setOn(!on); }} />;
});

/* ───────────────────────── ToggleGroup ───────────────────────── */

type ToggleGroupCtxT = { type: 'single' | 'multiple'; values: string[]; toggle: (v: string) => void; variant: 'ghost' | 'secondary'; size?: ButtonProps['size']; disabled?: boolean };
const ToggleGroupCtx = React.createContext<ToggleGroupCtxT | null>(null);
/** Set by Toolbar: a ToggleGroup inside one leaves the arrow keys to it, so the whole bar is one tab stop. */
export const InToolbar = React.createContext(false);

interface ToggleGroupBase extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  /** For type="multiple": ghost (default) or secondary toggles. type="single" is always the segmented build. */
  variant?: 'ghost' | 'secondary';
  size?: ButtonProps['size'];
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
}
export interface ToggleGroupSingleProps extends ToggleGroupBase {
  /** One choice: the options sit in a well and one raised pill glides between them, as segmented Tabs. A radio group. */
  type: 'single';
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}
export interface ToggleGroupMultipleProps extends ToggleGroupBase {
  /** Any number on: a row of Toggles, each with aria-pressed. */
  type: 'multiple';
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
}
export type ToggleGroupProps = ToggleGroupSingleProps | ToggleGroupMultipleProps;

export function ToggleGroup(props: ToggleGroupProps) {
  const { type, value, defaultValue, onValueChange, variant = 'ghost', size, orientation = 'horizontal', disabled, className, children, ...rest } = props;
  const inToolbar = React.useContext(InToolbar);
  const [v, setV] = useControllable<string | string[]>(value, defaultValue ?? (type === 'single' ? '' : []), onValueChange as (v: string | string[]) => void);
  const values = type === 'single' ? (v ? [v as string] : []) : (v as string[]);
  const toggle = (item: string) => {
    if (type === 'single') setV(item);
    else setV(values.includes(item) ? values.filter((x) => x !== item) : [...values, item]);
  };
  const roving = useRoving<HTMLDivElement>({
    orientation, enabled: !inToolbar,
    // In a radio group, moving chooses.
    onMove: type === 'single' ? (el) => { const val = el.dataset.value; if (val) toggle(val); } : undefined,
    initial: (box) => box.querySelector<HTMLElement>('[aria-checked="true"], [aria-pressed="true"]'),
  });
  const single = type === 'single';

  // The pill: measured from the chosen item, as segmented Tabs' indicator is.
  const [pill, setPill] = React.useState({ x: 0, y: 0, w: 0, h: 0, ready: false });
  const measure = React.useCallback(() => {
    if (!single) return;
    const el = roving.ref.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    setPill((p) => el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, ready: p.w > 0 || p.ready } : { ...p, w: 0 });
  }, [single, roving.ref]);
  useIsoLayoutEffect(() => { measure(); }, [measure, values.join('\u0000')]);
  React.useEffect(() => {
    if (!single || !roving.ref.current) return;
    const ro = new ResizeObserver(measure);
    ro.observe(roving.ref.current);
    return () => ro.disconnect();
  }, [single, measure, roving.ref]);

  return (
    <ToggleGroupCtx.Provider value={{ type, values, toggle, variant, size, disabled }}>
      <div {...roving} role={single ? 'radiogroup' : 'group'} aria-disabled={disabled || undefined}
        className={cx('alt-tgroup', single && 'alt-tabs-list', className)} data-type={type} data-orientation={orientation} {...rest}>
        {single && <span className="alt-tabs-indicator" aria-hidden="true" data-ready={pill.ready ? '' : undefined}
          style={{ transform: `translateX(${pill.x}px)`, top: pill.y, width: pill.w, height: pill.h, bottom: 'auto', opacity: pill.w ? 1 : 0 }} />}
        {children}
      </div>
    </ToggleGroupCtx.Provider>
  );
}

export interface ToggleGroupItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string;
  /** type="multiple" only: an icon-only square toggle. */
  square?: boolean;
}
export const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(function ToggleGroupItem(
  { value, square, className, children, onClick, ...rest }, ref) {
  const g = React.useContext(ToggleGroupCtx)!;
  const on = g.values.includes(value);
  if (g.type === 'single') {
    return <button ref={ref} type="button" role="radio" aria-checked={on} data-value={value} data-roving-item="" disabled={g.disabled || rest.disabled}
      className={cx('alt-tabs-trigger', 'alt-tgroup-item', className)} {...rest}
      onClick={(e) => { onClick?.(e); if (!e.defaultPrevented) g.toggle(value); }}>{children}</button>;
  }
  return <Button ref={ref} variant={g.variant} size={g.size} square={square} className={cx('alt-toggle', 'alt-tgroup-item', className)} aria-pressed={on} data-value={value} data-roving-item=""
    {...rest} disabled={g.disabled || rest.disabled} onClick={(e) => { onClick?.(e); if (!e.defaultPrevented) g.toggle(value); }}>{children}</Button>;
});
