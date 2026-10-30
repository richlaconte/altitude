import * as React from 'react';
import { cx, Icons, useControllable, useIsoLayoutEffect } from './core';
import { Button } from './controls';
import { Tooltip } from './overlays';
import { Sheet, SheetHeader, SheetTitle } from './sheet';

/* ───────────────────────── AppShell and Sidebar ───────────────────────── */

type SidebarCtxT = { collapsed: boolean; setCollapsed: (c: boolean) => void; mobile: boolean; drawer: boolean; setDrawer: (o: boolean) => void; toggle: () => void };
const SidebarCtx = React.createContext<SidebarCtxT | null>(null);
/** The sidebar's state: collapsed to a rail (desktop) or open as a drawer (narrow screens), and how to toggle it. */
export const useSidebar = () => {
  const c = React.useContext(SidebarCtx);
  if (!c) throw new Error('useSidebar: put it inside a SidebarProvider (AppShell includes one).');
  return c;
};

const useMedia = (q: string) => {
  const [m, setM] = React.useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches);
  React.useEffect(() => {
    const mq = window.matchMedia?.(q);
    if (!mq) return;
    const f = () => setM(mq.matches);
    f(); mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [q]);
  return m;
};

export interface SidebarProviderProps {
  /** Collapsed to a rail of icons. Persisting it (a cookie, localStorage) is up to your app. */
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Below this width the sidebar becomes a drawer. Default 640, the compact breakpoint (`breakpoint-compact`). */
  mobileBreakpoint?: number;
  children: React.ReactNode;
}
/** Holds the sidebar's state, and toggles it with ⌘B / Ctrl+B. */
export function SidebarProvider({ collapsed, defaultCollapsed = false, onCollapsedChange, mobileBreakpoint = 640, children }: SidebarProviderProps) {
  const [c, setCollapsed] = useControllable(collapsed, defaultCollapsed, onCollapsedChange);
  const mobile = useMedia(`(max-width: ${mobileBreakpoint - 0.02}px)`);
  const [drawer, setDrawer] = React.useState(false);
  const toggle = React.useCallback(() => (mobile ? setDrawer((o) => !o) : setCollapsed(!c)), [mobile, c, setCollapsed]);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'b') { e.preventDefault(); toggle(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);
  React.useEffect(() => { if (!mobile) setDrawer(false); }, [mobile]);
  return <SidebarCtx.Provider value={{ collapsed: c && !mobile, setCollapsed, mobile, drawer, setDrawer, toggle }}>{children}</SidebarCtx.Provider>;
}

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  /** 'icon' (default) collapses to a rail of icons; 'none' never collapses. */
  collapsible?: 'icon' | 'none';
  /** The navigation landmark's name. Default "Main". */
  'aria-label'?: string;
}
/**
 * Where you are is part of the record, so the frame lies on the ground: the sidebar is a nav on surface-ground divided
 * from the page by a line. Only what's in it acts. On narrow screens it moves into a Sheet drawer.
 */
export function Sidebar({ collapsible = 'icon', className, children, 'aria-label': label = 'Main', ...rest }: SidebarProps) {
  const s = useSidebar();
  const rail = s.collapsed && collapsible === 'icon';
  const body = <SidebarRail.Provider value={rail}>{children}</SidebarRail.Provider>;
  if (s.mobile) return (
    <Sheet open={s.drawer} onOpenChange={s.setDrawer} side="left" size="sm" className="alt-sidebar-drawer">
      <SheetHeader><SheetTitle>Navigation</SheetTitle></SheetHeader>
      <nav className={cx('alt-sidebar', className)} aria-label={label} {...rest}>{body}</nav>
    </Sheet>
  );
  return <nav className={cx('alt-sidebar', className)} aria-label={label} data-rail={rail ? '' : undefined} {...rest}>{body}</nav>;
}
const SidebarRail = React.createContext(false);

export function SidebarHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cx('alt-sidebar-header', className)} {...rest} />; }
export function SidebarFooter({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cx('alt-sidebar-footer', className)} {...rest} />; }

/** The scrolling middle. The current item's raised pill glides here from item to item, as segmented Tabs' does. */
export function SidebarContent({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  const box = React.useRef<HTMLDivElement>(null);
  const [pill, setPill] = React.useState({ y: 0, x: 0, w: 0, h: 0, ready: false });
  const measure = React.useCallback(() => {
    const el = box.current?.querySelector<HTMLElement>('.alt-sidebar-item [aria-current="page"]');
    // Measured after every render (the current item may have moved), so an unchanged pill keeps its state.
    if (!el || !box.current || !el.offsetParent) { setPill((p) => (p.h === 0 ? p : { ...p, h: 0 })); return; }
    const b = box.current.getBoundingClientRect(), r = el.getBoundingClientRect();
    const next = { y: r.top - b.top + box.current.scrollTop, x: r.left - b.left, w: r.width, h: r.height };
    setPill((p) => (p.y === next.y && p.x === next.x && p.w === next.w && p.h === next.h ? p : { ...next, ready: p.h > 0 || p.ready }));
  }, []);
  // Measured when the current destination changes (aria-current moves) or the sidebar changes size (a rail).
  useIsoLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    measure();
    const mo = new MutationObserver(measure);
    mo.observe(el, { subtree: true, attributes: true, attributeFilter: ['aria-current'], childList: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { mo.disconnect(); ro.disconnect(); };
  }, [measure]);
  return (
    <div ref={box} className={cx('alt-sidebar-content', className)} {...rest}>
      <span className="alt-sidebar-pill" aria-hidden="true" data-ready={pill.ready ? '' : undefined}
        style={{ transform: `translate(${pill.x}px, ${pill.y}px)`, width: pill.w, height: pill.h, opacity: pill.h ? 1 : 0 }} />
      {children}
    </div>
  );
}

export interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The group's name, shown above it. */
  label?: React.ReactNode;
  /** The label is a disclosure button that shows and hides the group. */
  collapsible?: boolean;
  defaultOpen?: boolean;
}
/** Destinations that belong together, under a label in ink-muted. A collapsible group is a disclosure. */
export function SidebarGroup({ label, collapsible, defaultOpen = true, className, children, ...rest }: SidebarGroupProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const id = React.useId();
  return (
    <div role="group" aria-labelledby={label ? `${id}-l` : undefined} className={cx('alt-sidebar-group', className)} {...rest}>
      {label && (collapsible
        ? <button type="button" id={`${id}-l`} className="alt-sidebar-label" aria-expanded={open} aria-controls={`${id}-c`} onClick={() => setOpen(!open)}>
            {label}<Icons.ChevronDown className="alt-sidebar-chev" size={14} /></button>
        : <SidebarGroupLabel id={`${id}-l`}>{label}</SidebarGroupLabel>)}
      <div id={`${id}-c`} hidden={collapsible && !open}>{children}</div>
    </div>
  );
}
export function SidebarGroupLabel({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cx('alt-sidebar-label', className)} {...rest} />; }
export function SidebarMenu({ className, ...rest }: React.HTMLAttributes<HTMLUListElement>) { return <ul className={cx('alt-sidebar-menu', className)} {...rest} />; }

const ItemCtx = React.createContext<{ setCount: (c: string) => void } | null>(null);
/** One destination. A SidebarMenuBadge inside it is said as part of the button's name. */
export function SidebarMenuItem({ className, children, ...rest }: React.LiHTMLAttributes<HTMLLIElement>) {
  const [count, setCount] = React.useState('');
  return <li className={cx('alt-sidebar-item', className)} {...rest}><ItemCtx.Provider value={{ setCount }}><CountCtx.Provider value={count}>{children}</CountCtx.Provider></ItemCtx.Provider></li>;
}
const CountCtx = React.createContext('');

export interface SidebarMenuButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** The page you're on: aria-current="page", and the raised pill. */
  current?: boolean;
  icon?: React.ReactNode;
  /** Styles your own link element (a router's Link). Pass exactly one element; its children are the label. */
  asChild?: boolean;
}
/** A destination: flush at rest, lifts one level when pointed at; the current one sits on the raised pill. */
export const SidebarMenuButton = React.forwardRef<HTMLAnchorElement, SidebarMenuButtonProps>(function SidebarMenuButton(
  { current, icon, asChild, className, children, ...rest }, ref) {
  const rail = React.useContext(SidebarRail);
  const count = React.useContext(CountCtx);
  const s = React.useContext(SidebarCtx);
  const childEl = asChild && React.isValidElement(children) ? (children as React.ReactElement<{ children?: React.ReactNode; className?: string }>) : null;
  const text = childEl ? childEl.props.children : children;
  const name = typeof text === 'string' ? text : undefined;
  const inner = <>
    {icon && <span className="alt-sidebar-icon" aria-hidden="true">{icon}</span>}
    <span className="alt-sidebar-text">{text}</span>
    {count && <span className="alt-sr">, {count}</span>}
  </>;
  const props = {
    ...rest, ref, className: cx('alt-sidebar-button', className, childEl?.props.className), 'aria-current': current ? ('page' as const) : undefined,
    // In the rail the label is hidden, so it's the link's name (and its tooltip).
    'aria-label': rail && name ? `${name}${count ? `, ${count}` : ''}` : rest['aria-label'],
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => { rest.onClick?.(e); if (s?.mobile) s.setDrawer(false); },
  };
  const el = childEl ? React.cloneElement(childEl, props as any, inner) : <a {...props}>{inner}</a>;
  return rail && name ? <Tooltip content={name} side="right">{el}</Tooltip> : el;
});

export interface SidebarMenuBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  /** What the count is, for its name: "4 unread". Default: the number alone. */
  label?: string;
}
/** A count on a destination. Only a count floats (Badge variant="count"); it's part of the destination's name. */
export function SidebarMenuBadge({ label, className, children, ...rest }: SidebarMenuBadgeProps) {
  const item = React.useContext(ItemCtx);
  const said = label ?? (typeof children === 'string' || typeof children === 'number' ? String(children) : '');
  React.useEffect(() => { item?.setCount(said); return () => item?.setCount(''); }, [said]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span className={cx('alt-badge', 'alt-sidebar-badge', className)} data-variant="count" aria-hidden="true" {...rest}>{children}</span>;
}

/** Collapses the sidebar to a rail (desktop) or opens the drawer (narrow screens). ⌘B / Ctrl+B does the same. */
export function SidebarTrigger({ className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const s = useSidebar();
  const label = s.mobile ? 'Open navigation' : s.collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  return <Button variant="ghost" square size="sm" className={cx('alt-sidebar-trigger', className)} aria-label={label} aria-expanded={s.mobile ? s.drawer : !s.collapsed}
    aria-keyshortcuts="Meta+B Control+B" onClick={s.toggle} {...rest}><Icons.PanelLeft /></Button>;
}

/** The page beside the sidebar: the main landmark, with --alt-page-pad set for PageHeader. */
export function SidebarInset({ className, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return <main id="alt-main" tabIndex={-1} className={cx('alt-inset', className)} {...rest} />;
}

export interface AppShellProps extends Omit<SidebarProviderProps, 'children'> {
  sidebar: React.ReactNode;
  /** The top bar's contents (search, the user's menu). A SidebarTrigger comes first by itself. */
  topBar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}
/**
 * The frame of an app: a sidebar of destinations, a top bar and the page, all on the ground and divided by lines.
 * The top bar rises when content passes under it. A skip link jumps to the page.
 */
export function AppShell({ sidebar, topBar, children, className, ...provider }: AppShellProps) {
  const sentinel = React.useRef<HTMLSpanElement>(null);
  const scroller = React.useRef<HTMLDivElement>(null);
  const [under, setUnder] = React.useState(false);
  React.useEffect(() => {
    if (!sentinel.current) return;
    const io = new IntersectionObserver(([e]) => setUnder(!e.isIntersecting), { root: scroller.current, threshold: 0 });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, []);
  return (
    <SidebarProvider {...provider}>
      <div className={cx('alt-shell', className)}>
        <a className="alt-skip" href="#alt-main" onClick={(e) => { e.preventDefault(); document.getElementById('alt-main')?.focus(); }}>Skip to content</a>
        {sidebar}
        <div ref={scroller} className="alt-shell-page">
          <header className="alt-topbar" data-under={under ? '' : undefined}><SidebarTrigger />{topBar}</header>
          <span ref={sentinel} className="alt-shell-sentinel" aria-hidden="true" />
          <SidebarInset>{children}</SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
