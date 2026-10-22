import * as React from 'react';
import { cx, Icons } from './core';

export interface DrillNode {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Leaf content. A node with children lists them instead. */
  content?: React.ReactNode;
  children?: DrillNode[];
}
export interface DrilldownProps extends React.HTMLAttributes<HTMLDivElement> {
  root: DrillNode;
}

/**
 * Hierarchy as a stack. Each place you go into is laid on top of the one before: the breadcrumb
 * builds a staircase — every step stands on the same ground line and each deeper place is a taller
 * step — and the view sits on a pile whose thickness is how deep you are. Going back lifts sheets off the top.
 */
export function Drilldown({ root, className, ...rest }: DrilldownProps) {
  const [path, setPath] = React.useState<DrillNode[]>([root]);
  const [dir, setDir] = React.useState<'down' | 'up'>('down');
  const [out, setOut] = React.useState<DrillNode | null>(null);
  const view = React.useRef<HTMLDivElement>(null);
  const depth = path.length - 1;
  const current = path[depth];
  React.useEffect(() => { if (!out) return; const t = setTimeout(() => setOut(null), 220); return () => clearTimeout(t); }, [out]);
  const go = (node: DrillNode) => { setDir('down'); setOut(current); setPath([...path, node]); };
  const back = (i: number) => { if (i === depth) return; setDir('up'); setOut(current); setPath(path.slice(0, i + 1)); };
  React.useEffect(() => { view.current?.focus({ preventScroll: true }); }, [current.id]);

  const render = (node: DrillNode) => node.children?.length ? (
    <ul className="alt-drill-list">
      {node.children.map((c) => (
        <li key={c.id}>
          <button type="button" className="alt-drill-row" onClick={() => go(c)}>
            <span className="alt-drill-row-text"><span className="alt-drill-row-title">{c.title}</span>{c.description && <span className="alt-drill-row-desc">{c.description}</span>}</span>
            {c.children?.length ? <span className="alt-drill-count">{c.children.length}</span> : null}
            <Icons.ChevronDown className="alt-drill-chev" size={16} />
          </button>
        </li>
      ))}
    </ul>
  ) : <div className="alt-drill-leaf">{node.content}</div>;

  const sheets = Math.min(depth, 3);
  return (
    <div className={cx('alt-drill', className)} data-dir={dir} {...rest}>
      <nav className="alt-crumbs" aria-label="Location">
        <ol>
          {path.map((n, i) => (
            <li key={n.id} data-d={Math.min(i, 3)} style={{ ['--d' as any]: i, zIndex: i + 1 }} data-current={i === depth ? '' : undefined} data-new={i === depth && dir === 'down' && i > 0 ? '' : undefined}>
              <button type="button" onClick={() => back(i)} aria-current={i === depth ? 'location' : undefined}>{n.title}</button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="alt-pile alt-drill-pile" data-sheets={sheets}>
        {Array.from({ length: sheets }, (_, i) => <span key={i} className="alt-pile-sheet" aria-hidden="true" style={{ ['--i' as any]: i + 1 }} />)}
        <div className="alt-pile-top alt-drill-stage">
          {out && <div key={'out-' + out.id} className="alt-drill-view" data-phase="out" aria-hidden="true">{render(out)}</div>}
          <div key={current.id} ref={view} tabIndex={-1} className="alt-drill-view" data-phase="in" aria-label={typeof current.title === 'string' ? current.title : undefined}>{render(current)}</div>
        </div>
      </div>
    </div>
  );
}
