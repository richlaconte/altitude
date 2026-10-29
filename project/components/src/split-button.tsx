import * as React from 'react';
import { cx, Icons } from './core';
import { Button, ButtonProps } from './controls';
import { DropdownMenu, MenuEntry } from './overlays';

/* ───────────────────────── SplitButton ───────────────────────── */

export interface SplitButtonProps extends Omit<ButtonProps, 'variant' | 'children' | 'square'> {
  /** The default action's words ("Save changes"). They also name the group. */
  label: React.ReactNode;
  /** primary (default) or secondary. */
  variant?: 'primary' | 'secondary';
  /** The alternatives, in a DropdownMenu. */
  items: MenuEntry[];
  /** The chevron's name. Default "More options". Say what for: "More save options". */
  menuLabel?: string;
  /** Names the group when label isn't plain text. */
  groupLabel?: string;
}
/**
 * One action with its alternatives: two faces on one slab, sharing one wall and parted by a line notch. Each face
 * lifts on its own when pointed at, because each does something different. Alt+Down on the action opens the menu.
 */
export const SplitButton = React.forwardRef<HTMLButtonElement, SplitButtonProps>(function SplitButton(
  { label, variant = 'primary', items, menuLabel = 'More options', groupLabel, size, disabled, className, style, onKeyDown, ...rest }, ref) {
  const chevron = React.useRef<HTMLButtonElement>(null);
  return (
    <div role="group" aria-label={groupLabel ?? (typeof label === 'string' ? label : undefined)} className={cx('alt-split', className)} data-variant={variant} style={style}>
      <Button ref={ref} variant={variant} size={size} disabled={disabled} className="alt-split-action" {...rest}
        onKeyDown={(e) => { onKeyDown?.(e); if (e.altKey && e.key === 'ArrowDown' && !e.defaultPrevented) { e.preventDefault(); chevron.current?.click(); } }}>{label}</Button>
      <DropdownMenu align="end" items={items}
        trigger={<Button ref={chevron} variant={variant} size={size} disabled={disabled} square className="alt-split-menu" aria-label={menuLabel}><Icons.ChevronDown /></Button>} />
    </div>
  );
});
