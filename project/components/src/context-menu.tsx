import * as React from 'react';
import { Layer, useIsoLayoutEffect, usePresence } from './core';
import { MenuEntry, MenuPanel } from './overlays';

/* ───────────────────────── ContextMenu ───────────────────────── */

const EXIT_3 = 160;

export interface ContextMenuProps {
  /** The actions on the thing. A function is called each time the menu opens. Submenus aren't offered: one floating surface at a time. */
  items: MenuEntry[] | (() => MenuEntry[]);
  /** The thing: one element. It gets the right-click, the long-press and Shift+F10 / the Menu key. */
  children: React.ReactElement<any>;
  /** Names the menu. Default "Actions". */
  'aria-label'?: string;
  onOpenChange?: (open: boolean) => void;
}
/**
 * Actions on a thing, opened where you right-click or long-press it, or at it with Shift+F10 or the Menu key. The menu
 * is DropdownMenu's, at level 3; the thing shows it's the subject with a 2px accent-ink outline, never a height, so a
 * flush row doesn't lift out of its table. Every action here must also be reachable another way.
 */
export function ContextMenu({ items, children, 'aria-label': label = 'Actions', onOpenChange }: ContextMenuProps) {
  const [at, setAt] = React.useState<{ x: number; y: number; byKey: boolean } | null>(null);
  const [list, setList] = React.useState<MenuEntry[]>([]);
  const target = React.useRef<HTMLElement | null>(null);
  const panel = React.useRef<HTMLDivElement>(null);
  const press = React.useRef<{ t: number; x: number; y: number } | undefined>(undefined);
  const id = React.useId();
  const { mounted, state } = usePresence(!!at, EXIT_3);
  // Where the menu sits once it's measured (flipped at the viewport's edges); until then, where it was opened.
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);

  const open = (x: number, y: number, byKey: boolean) => { setList(typeof items === 'function' ? items() : items); setPos(null); setAt({ x, y, byKey }); onOpenChange?.(true); };
  const close = React.useCallback((back = true) => { setAt(null); onOpenChange?.(false); if (back) target.current?.focus({ preventScroll: true }); }, [onOpenChange]);

  // Kept inside the viewport: flipped left or up when it would run off an edge. The Layer mounts a render late, so
  // this runs until the panel exists and has been placed once.
  useIsoLayoutEffect(() => {
    if (!at || !panel.current || pos) return;
    const r = panel.current.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
    setPos({ x: at.x + r.width > vw - 8 ? Math.max(8, at.x - r.width) : at.x, y: at.y + r.height > vh - 8 ? Math.max(8, at.y - r.height) : at.y });
  });
  React.useEffect(() => {
    if (!at) return;
    const outside = (e: Event) => { if (!panel.current?.contains(e.target as Node)) close(false); };
    const away = () => close(false);
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('blur', away); window.addEventListener('resize', away); window.addEventListener('scroll', away, true);
    return () => { document.removeEventListener('pointerdown', outside, true); window.removeEventListener('blur', away); window.removeEventListener('resize', away); window.removeEventListener('scroll', away, true); };
  }, [at, close]);

  const child = children;
  const trigger = React.cloneElement(child, {
    ref: (el: HTMLElement | null) => { target.current = el; const r = (child as any).ref; if (typeof r === 'function') r(el); else if (r) r.current = el; },
    'aria-haspopup': 'menu', 'aria-expanded': !!at, 'aria-controls': at ? id : undefined, 'data-context-open': at ? '' : undefined,
    onContextMenu: (e: React.MouseEvent) => { child.props.onContextMenu?.(e); if (e.defaultPrevented) return; e.preventDefault(); open(e.clientX, e.clientY, false); },
    onKeyDown: (e: React.KeyboardEvent) => {
      child.props.onKeyDown?.(e);
      if (e.defaultPrevented) return;
      if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
        e.preventDefault();
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        open(r.left + Math.min(24, r.width / 2), r.bottom, true);
      }
    },
    // A long press on touch opens it too: 500ms without moving more than 10px.
    onPointerDown: (e: React.PointerEvent) => {
      child.props.onPointerDown?.(e);
      if (e.pointerType !== 'touch') return;
      const start = { x: e.clientX, y: e.clientY };
      press.current = { t: window.setTimeout(() => open(start.x, start.y, false), 500), ...start };
    },
    onPointerMove: (e: React.PointerEvent) => { child.props.onPointerMove?.(e); const p = press.current; if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) { window.clearTimeout(p.t); press.current = undefined; } },
    onPointerUp: (e: React.PointerEvent) => { child.props.onPointerUp?.(e); if (press.current) window.clearTimeout(press.current.t); press.current = undefined; },
  });
  return <>
    {trigger}
    {mounted && <Layer>
      <div ref={panel} className="alt-context" style={{ left: (pos ?? at ?? { x: 0 }).x, top: (pos ?? at ?? { y: 0 }).y }} aria-label={label}>
        <MenuPanel items={list} id={id} state={state} className="alt-context-menu" startFirst={at?.byKey} onClose={() => close(true)} />
      </div>
    </Layer>}
  </>;
}
