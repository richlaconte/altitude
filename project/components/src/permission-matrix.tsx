import * as React from 'react';
import { cx, Icons, useDepth } from './core';

/* ───────────────────────── PermissionMatrix ───────────────────────── */

export interface MatrixRole { id: string; name: string; /** Every permission is always granted (an owner). */ locked?: boolean }
export interface MatrixPermission { id: string; name: string; /** Rows with the same group sit under its heading. */ group?: string }
export interface MatrixInherited { granted: boolean; /** Where it comes from ("Admin"). */ from: string }

export interface PermissionMatrixProps {
  roles: MatrixRole[];
  permissions: MatrixPermission[];
  /** Grants you can change: value[roleId][permissionId]. */
  value: Record<string, Record<string, boolean>>;
  /** A grant decided elsewhere (a parent role, a group): shown as a stamped mark, not a choice. */
  inherited?: (roleId: string, permissionId: string) => MatrixInherited | undefined;
  /** Called when a choice is toggled. Return a promise and the cell hovers as pending until it settles; a rejection reverts it. */
  onChange?: (roleId: string, permissionId: string, granted: boolean) => void | Promise<unknown>;
  /** Names the grid ("Role permissions"). */
  'aria-label'?: string;
  className?: string;
}

type Cell = { r: number; c: number };
/**
 * Roles against permissions. The grid is settled (the record of who can do what). An editable grant is a choice, built
 * like a Checkbox (a trench the accent pours into); an inherited or fixed grant is already decided, so it's a flush
 * stamped check, not a disabled box. The active cell is a ring, never a height. A grid: arrows move, Space toggles.
 */
export function PermissionMatrix({ roles, permissions, value, inherited, onChange, 'aria-label': label = 'Permissions', className }: PermissionMatrixProps) {
  const [active, setActive] = React.useState<Cell>({ r: 0, c: 0 });
  const [pending, setPending] = React.useState<Record<string, boolean>>({});
  const [optimistic, setOptimistic] = React.useState<Record<string, boolean>>({});
  const [settled, setSettled] = React.useState<Record<string, number>>({});
  const [said, setSaid] = React.useState('');
  const grid = React.useRef<HTMLTableElement>(null);
  const key = (role: string, perm: string) => `${role}\u0000${perm}`;

  const stateOf = (role: MatrixRole, perm: MatrixPermission): { granted: boolean; fixed: false | string } => {
    if (role.locked) return { granted: true, fixed: `Always granted to ${role.name}` };
    const inh = inherited?.(role.id, perm.id);
    if (inh) return { granted: inh.granted, fixed: `${inh.granted ? 'Granted' : 'Not granted'}, inherited from ${inh.from}` };
    const k = key(role.id, perm.id);
    return { granted: k in optimistic ? optimistic[k] : !!value[role.id]?.[perm.id], fixed: false };
  };
  const toggle = (role: MatrixRole, perm: MatrixPermission) => {
    const st = stateOf(role, perm);
    if (st.fixed) { setSaid(`${perm.name}, ${role.name}: ${st.fixed}. It can't be changed here.`); return; }
    const k = key(role.id, perm.id), next = !st.granted;
    setOptimistic((o) => ({ ...o, [k]: next }));
    const out = onChange?.(role.id, perm.id, next);
    const done = (ok: boolean) => {
      setPending((p) => { const n = { ...p }; delete n[k]; return n; });
      setOptimistic((o) => { const n = { ...o }; delete n[k]; return n; });
      if (ok) setSettled((s) => ({ ...s, [k]: (s[k] ?? 0) + 1 }));
      setSaid(ok ? `${perm.name} ${next ? 'granted to' : 'removed from'} ${role.name}.` : `Couldn't change ${perm.name} for ${role.name}.`);
    };
    if (out && typeof (out as Promise<unknown>).then === 'function') { setPending((p) => ({ ...p, [k]: true })); (out as Promise<unknown>).then(() => done(true), () => done(false)); }
    else done(true);
  };

  const focus = (cell: Cell) => { setActive(cell); grid.current?.querySelector<HTMLElement>(`[data-cell="${cell.r}-${cell.c}"]`)?.focus(); };
  const onKey = (e: React.KeyboardEvent) => {
    const { r, c } = active, R = permissions.length - 1, C = roles.length - 1;
    const to = e.key === 'ArrowRight' ? { r, c: Math.min(C, c + 1) } : e.key === 'ArrowLeft' ? { r, c: Math.max(0, c - 1) }
      : e.key === 'ArrowDown' ? { r: Math.min(R, r + 1), c } : e.key === 'ArrowUp' ? { r: Math.max(0, r - 1), c }
      : e.key === 'Home' ? (e.ctrlKey ? { r: 0, c: 0 } : { r, c: 0 }) : e.key === 'End' ? (e.ctrlKey ? { r: R, c: C } : { r, c: C }) : null;
    if (to) { e.preventDefault(); focus(to); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(roles[active.c], permissions[active.r]); }
  };

  let lastGroup: string | undefined;
  return (
    <div className={cx('alt-matrix', className)}>
      <table ref={grid} role="grid" aria-label={label} className="alt-matrix-grid" onKeyDown={onKey}>
        <thead><tr><th scope="col"><span className="alt-sr">Permission</span></th>{roles.map((r) => <th key={r.id} scope="col">{r.name}</th>)}</tr></thead>
        <tbody>
          {permissions.map((p, ri) => {
            const head = p.group && p.group !== lastGroup ? <tr key={'g' + p.group} className="alt-matrix-group"><th colSpan={roles.length + 1} scope="colgroup">{p.group}</th></tr> : null;
            lastGroup = p.group ?? lastGroup;
            return (
              <React.Fragment key={p.id}>
                {head}
                <tr>
                  <th scope="row" className="alt-matrix-perm">{p.name}</th>
                  {roles.map((role, ci) => {
                    const st = stateOf(role, p), k = key(role.id, p.id);
                    return <MatrixCell key={role.id} r={ri} c={ci} active={active.r === ri && active.c === ci} granted={st.granted} fixed={st.fixed}
                      pending={!!pending[k]} settle={settled[k]} name={`${p.name}, ${role.name}`} onFocus={() => setActive({ r: ri, c: ci })} onToggle={() => { setActive({ r: ri, c: ci }); toggle(role, p); }} />;
                  })}
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      <span className="alt-sr" aria-live="polite">{said}</span>
    </div>
  );
}

function MatrixCell({ r, c, active, granted, fixed, pending, settle, name, onFocus, onToggle }: {
  r: number; c: number; active: boolean; granted: boolean; fixed: false | string; pending: boolean; settle?: number; name: string; onFocus: () => void; onToggle: () => void;
}) {
  const { style, ...depth } = useDepth({ status: pending ? 'pending' : undefined, settle });
  return (
    <td role="gridcell" className="alt-matrix-cell" {...depth} style={style}>
      <span role="checkbox" aria-checked={granted} aria-readonly={fixed ? true : undefined} aria-label={name} aria-description={fixed || undefined}
        tabIndex={active ? 0 : -1} data-cell={`${r}-${c}`} className="alt-matrix-box" data-fixed={fixed ? '' : undefined} data-on={granted ? '' : undefined}
        title={fixed || undefined} onFocus={onFocus} onClick={onToggle}>
        {fixed
          ? <span className="alt-matrix-stamp" aria-hidden="true">{granted ? <Icons.Check size={14} /> : <span className="alt-matrix-dash" />}</span>
          : <span className="alt-check-track" aria-hidden="true">
              <span className="alt-check-fill" />
              <svg className="alt-check-mark" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <path className="alt-check-tick" d="M3.5 8.5l3 3 6-6.5" pathLength={16} />
              </svg>
            </span>}
      </span>
    </td>
  );
}
