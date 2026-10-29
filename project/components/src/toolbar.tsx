import * as React from 'react';
import { cx, Icons, useIsoLayoutEffect } from './core';
import { Button, ButtonProps } from './controls';
import { DropdownMenu, MenuEntry } from './overlays';
import { Separator } from './separator';
import { InToolbar, Toggle, ToggleProps } from './toggle';
import { nameOf, OverflowCtx, OverflowEntry, RovingCtx, useMergedRef, useOverflowEntry, useRoving } from './roving';

/* ───────────────────────── Toolbar ───────────────────────── */

declare const process: { env: { NODE_ENV?: string } } | undefined;
const dev = () => typeof process === 'undefined' || process?.env.NODE_ENV !== 'production';

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Names the toolbar ("Formatting"). Required: a toolbar is a landmark-like group. */
  'aria-label': string;
  orientation?: 'horizontal' | 'vertical';
  /**
   * When the tools don't fit: 'wrap' (default) onto another row; 'menu' moves the ones that don't fit, from the end,
   * into a "More tools" menu, where toggles keep their state as checkable items.
   */
  overflow?: 'wrap' | 'menu';
  /** A line rim around the bar. Default false. */
  bordered?: boolean;
}
/**
 * A row of tools with one tab stop. The bar lies on the ground; its tools are ghosts that lift when pointed at, and
 * latched tools are Toggles. Arrow keys move between tools, Home and End jump, and returning lands where you left.
 */
export function Toolbar({ orientation = 'horizontal', overflow = 'wrap', bordered, className, children, ...rest }: ToolbarProps) {
  const roving = useRoving<HTMLDivElement>({ orientation });
  const registry = React.useRef(new Map<HTMLElement, OverflowEntry>());
  const more = React.useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = React.useState(0);
  const menuMode = overflow === 'menu' && orientation === 'horizontal';

  // Which top-level children fit: every one is shown and measured, then the ones past the edge are hidden, all before
  // paint. The "More" button's width is kept free once anything overflows.
  const fit = React.useCallback(() => {
    const bar = roving.ref.current;
    if (!bar || !menuMode) return;
    const kids = [...bar.children].filter((el) => el !== more.current) as HTMLElement[];
    kids.forEach((el) => el.removeAttribute('data-overflowed'));
    const gap = parseFloat(getComputedStyle(bar).columnGap) || 0;
    const room = bar.clientWidth - parseFloat(getComputedStyle(bar).paddingLeft) - parseFloat(getComputedStyle(bar).paddingRight);
    const widths = kids.map((el) => el.getBoundingClientRect().width);
    const total = widths.reduce((t, w) => t + w, 0) + gap * Math.max(0, kids.length - 1);
    let shown = kids.length;
    if (total > room + 0.5) {
      const reserve = (more.current?.getBoundingClientRect().width || 36) + gap;
      let used = 0; shown = 0;
      for (const w of widths) { if (used + w + (shown ? gap : 0) + reserve > room + 0.5) break; used += w + (shown ? gap : 0); shown++; }
      // A separator never ends the visible row.
      while (shown > 0 && kids[shown - 1].matches('.alt-sep')) shown--;
    }
    kids.forEach((el, i) => el.toggleAttribute('data-overflowed', i >= shown));
    setHidden(kids.length - shown);
  }, [menuMode, roving.ref]);
  // The menu's entries are read after every render: a parent's layout effect runs after its children's, so each
  // control has registered its current state (a toggle's checked) by now.
  const [menu, setMenu] = React.useState<MenuEntry[]>([]);
  useIsoLayoutEffect(() => {
    fit();
    const next = entries();
    const key = (m: MenuEntry[]) => JSON.stringify(m.map((e: any) => [e.type, e.label, e.checked, e.disabled]));
    setMenu((prev) => (key(prev) === key(next) ? prev : next));
  });
  React.useEffect(() => {
    if (!menuMode || !roving.ref.current) return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(roving.ref.current);
    return () => ro.disconnect();
  }, [menuMode, fit, roving.ref]);

  // The menu: the registered controls inside hidden children, in page order, with a separator where one was hidden.
  const entries = (): MenuEntry[] => {
    const bar = roving.ref.current;
    if (!bar) return [];
    const out: MenuEntry[] = [];
    bar.querySelectorAll<HTMLElement>(':scope > [data-overflowed]').forEach((kid) => {
      if (kid.matches('.alt-sep')) { if (out.length) out.push({ type: 'separator' }); return; }
      [...registry.current.entries()].filter(([el]) => kid === el || kid.contains(el))
        .sort(([a], [b]) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
        .forEach(([el, e]) => out.push({ label: e.label ?? nameOf(el), onSelect: e.onSelect, checked: e.checked, disabled: e.disabled }));
    });
    return out;
  };

  return (
    <InToolbar.Provider value={true}>
      <RovingCtx.Provider value={true}>
        <OverflowCtx.Provider value={menuMode ? registry : null}>
          <div {...roving} role="toolbar" className={cx('alt-toolbar', className)} data-orientation={orientation} data-overflow={overflow}
            data-bordered={bordered ? '' : undefined} {...rest}>
            {children}
            {menuMode && (
              <div ref={more} className="alt-toolbar-more" hidden={!hidden}>
                <DropdownMenu align="end" items={menu}
                  trigger={<Button variant="ghost" square aria-label="More tools" data-roving-item={hidden ? '' : undefined} tabIndex={-1}><Icons.More /></Button>} />
              </div>
            )}
          </div>
        </OverflowCtx.Provider>
      </RovingCtx.Provider>
    </InToolbar.Provider>
  );
}

/** Tools that belong together, parted from the next group by a ToolbarSeparator. */
export function ToolbarGroup({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="group" className={cx('alt-toolbar-group', className)} {...rest} />;
}

/** A decorative 1px line between groups: the toolbar already says what's grouped. */
export function ToolbarSeparator({ className }: { className?: string }) {
  return <Separator orientation="vertical" decorative className={cx('alt-toolbar-sep', className)} />;
}

export interface ToolbarButtonProps extends Omit<ButtonProps, 'variant'> {}
/** A ghost tool. Icon-only tools need an aria-label (a development warning says so). */
export const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(function ToolbarButton({ className, ...rest }, ref) {
  const [own, setRef] = useMergedRef(ref);
  useOverflowEntry(own, { onSelect: () => own.current?.click(), disabled: rest.disabled });
  useUnnamedWarning(own);
  return <Button ref={setRef} variant="ghost" className={cx('alt-toolbar-btn', className)} data-roving-item="" {...rest} />;
});

export interface ToolbarToggleProps extends Omit<ToggleProps, 'variant'> {}
/** A latched tool: a ghost Toggle. */
export const ToolbarToggle = React.forwardRef<HTMLButtonElement, ToolbarToggleProps>(function ToolbarToggle({ className, ...rest }, ref) {
  const [own, setRef] = useMergedRef(ref);
  useUnnamedWarning(own);
  return <Toggle ref={setRef} variant="ghost" className={cx('alt-toolbar-btn', className)} {...rest} />;
});

function useUnnamedWarning(el: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    if (dev() && el.current && !nameOf(el.current)) console.warn('Toolbar: a tool has no name. Give an icon-only ToolbarButton or ToolbarToggle an aria-label.');
  }, [el]);
}
