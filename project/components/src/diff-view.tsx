import * as React from 'react';
import { cx, Icons } from './core';
import { Button } from './controls';

/* ───────────────────────── DiffView ───────────────────────── */

type Op = { kind: 'same' | 'add' | 'del'; text: string };
/** A longest-common-subsequence diff of two lists. Fine for documents and configs; pass `hunks` for very large inputs. */
function lcs<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean = (x, y) => x === y): { kind: 'same' | 'add' | 'del'; a?: T; b?: T }[] {
  const n = a.length, m = b.length;
  const t: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i][j] = eq(a[i], b[j]) ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const out: { kind: 'same' | 'add' | 'del'; a?: T; b?: T }[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (eq(a[i], b[j])) { out.push({ kind: 'same', a: a[i], b: b[j] }); i++; j++; }
    else if (t[i + 1][j] >= t[i][j + 1]) out.push({ kind: 'del', a: a[i++] });
    else out.push({ kind: 'add', b: b[j++] });
  }
  while (i < n) out.push({ kind: 'del', a: a[i++] });
  while (j < m) out.push({ kind: 'add', b: b[j++] });
  return out;
}
/** Line operations for two texts. */
export function diffLines(before: string, after: string): Op[] {
  return lcs(before.split('\n'), after.split('\n')).map((o) => ({ kind: o.kind, text: (o.kind === 'add' ? o.b : o.a)! }));
}
/** Word-level marks inside a changed line: the words that are new (or gone) get a stronger tint. */
function words(from: string, to: string, side: 'add' | 'del') {
  const a = from.split(/(\s+)/), b = to.split(/(\s+)/);
  return lcs(a, b).filter((o) => o.kind === 'same' || o.kind === side).map((o, i) => o.kind === 'same' ? <React.Fragment key={i}>{o.a}</React.Fragment> : <mark key={i} className="alt-diff-word">{side === 'add' ? o.b : o.a}</mark>);
}

export interface DiffField { key: string; label: string; format?: (value: unknown) => React.ReactNode }
export interface DiffViewProps {
  /** 'text' (default): lines of two texts. 'properties': fields of two records. */
  mode?: 'text' | 'properties';
  before: string | Record<string, unknown>;
  after: string | Record<string, unknown>;
  /** For mode="properties": which fields, labelled. Default every key that changed. */
  fields?: DiffField[];
  /** Unchanged lines kept around each change; longer runs fold behind a lid. Default 3. */
  context?: number;
  /** What's being compared ("Version 4 → 5"). */
  caption?: React.ReactNode;
  /** Precomputed line operations, for large inputs. */
  hunks?: Op[];
  className?: string;
}
/**
 * What changed between two versions, in signs and words. Both versions are the record, so it lies flush. Additions are
 * positive-soft with a + sign and "Added", removals critical-soft, struck through, with − and "Removed"; a changed
 * property shows the old value struck through beside the new. Long unchanged runs fold behind lids. Never colour alone.
 */
export function DiffView({ mode = 'text', before, after, fields, context = 3, caption, hunks, className }: DiffViewProps) {
  const id = React.useId();
  const body = React.useRef<HTMLDivElement>(null);
  const [at, setAt] = React.useState(-1);
  const go = (d: number) => {
    const changes = [...(body.current?.querySelectorAll<HTMLElement>('[data-change-start]') ?? [])];
    if (!changes.length) return;
    const next = (at + d + changes.length) % changes.length;
    setAt(next);
    changes[next].focus();
  };
  const onKey = (e: React.KeyboardEvent) => { if (e.target instanceof HTMLInputElement) return; if (e.key === 'n') { e.preventDefault(); go(1); } if (e.key === 'p') { e.preventDefault(); go(-1); } };

  let summary = '', content: React.ReactNode;
  if (mode === 'properties') {
    const b = before as Record<string, unknown>, a = after as Record<string, unknown>;
    const keys = fields ?? [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k])).map((k) => ({ key: k, label: k }));
    const shown = keys.filter((f) => JSON.stringify(b[f.key]) !== JSON.stringify(a[f.key]));
    const fmt = (f: DiffField, v: unknown) => (v === undefined || v === null || v === '' ? '—' : f.format ? f.format(v) : String(v));
    summary = `${shown.length} ${shown.length === 1 ? 'property' : 'properties'} changed`;
    content = (
      <dl className="alt-diff-props">
        {shown.map((f) => (
          <div key={f.key} className="alt-diff-prop" tabIndex={-1} data-change-start="">
            <dt>{f.label}</dt>
            <dd>
              {b[f.key] !== undefined && <del className="alt-diff-old"><span className="alt-sr">Removed: </span>{fmt(f, b[f.key])}</del>}
              <Icons.ChevronDown className="alt-diff-arrow" size={14} aria-hidden="true" />
              {a[f.key] !== undefined && <ins className="alt-diff-new"><span className="alt-sr">Added: </span>{fmt(f, a[f.key])}</ins>}
            </dd>
          </div>
        ))}
      </dl>
    );
  } else {
    const ops = hunks ?? diffLines(before as string, after as string);
    const adds = ops.filter((o) => o.kind === 'add').length, dels = ops.filter((o) => o.kind === 'del').length;
    summary = `${adds} ${adds === 1 ? 'addition' : 'additions'}, ${dels} ${dels === 1 ? 'removal' : 'removals'}`;
    content = <TextDiff ops={ops} context={context} />;
  }
  return (
    <figure className={cx('alt-diff', className)} aria-labelledby={`${id}-c`} onKeyDown={onKey}>
      <figcaption className="alt-diff-head" id={`${id}-c`}>
        <span className="alt-diff-caption">{caption}</span>
        <span className="alt-diff-summary">{summary}</span>
        <span className="alt-diff-nav">
          <Button size="sm" variant="ghost" onClick={() => go(-1)}>Previous change</Button>
          <Button size="sm" variant="ghost" onClick={() => go(1)}>Next change</Button>
        </span>
      </figcaption>
      <div ref={body} className="alt-diff-body">{content}</div>
    </figure>
  );
}

/** Lines with signs; a removal followed by an addition is a changed line, so their words are marked too. */
function TextDiff({ ops, context }: { ops: Op[]; context: number }) {
  const [opened, setOpened] = React.useState<Set<number>>(() => new Set());
  // Which unchanged lines are far enough from any change to fold.
  const near = ops.map((_, i) => ops.slice(Math.max(0, i - context), i + context + 1).some((o) => o.kind !== 'same'));
  // A run of removals followed by a run of additions is a block of changed lines: the nth removal pairs with the nth
  // addition, so their changed words can be marked.
  const pairs = new Map<number, string>();
  for (let k = 0; k < ops.length;) {
    if (ops[k].kind !== 'del') { k++; continue; }
    let d = k; while (d < ops.length && ops[d].kind === 'del') d++;
    let a = d; while (a < ops.length && ops[a].kind === 'add') a++;
    for (let x = 0; x < Math.min(d - k, a - d); x++) { pairs.set(k + x, ops[d + x].text); pairs.set(d + x, ops[k + x].text); }
    k = a;
  }
  const rows: React.ReactNode[] = [];
  let i = 0;
  while (i < ops.length) {
    if (ops[i].kind === 'same' && !near[i]) {
      let j = i; while (j < ops.length && ops[j].kind === 'same' && !near[j]) j++;
      const start = i, count = j - i;
      // A single line isn't worth a lid: it takes as much room as the lid would.
      if (count < 2 || opened.has(start)) for (let k = i; k < j; k++) rows.push(<Line key={k} op={ops[k]} />);
      else rows.push(<div key={'f' + start} className="alt-diff-fold"><button type="button" aria-expanded={false} onClick={() => setOpened(new Set([...opened, start]))}>
        <Icons.ChevronDown size={14} />{count} unchanged {count === 1 ? 'line' : 'lines'}</button></div>);
      i = j; continue;
    }
    const prev = ops[i - 1];
    rows.push(<Line key={i} op={ops[i]} pair={pairs.get(i)} start={ops[i].kind !== 'same' && prev?.kind !== ops[i].kind && !(ops[i].kind === 'add' && prev?.kind === 'del')} />);
    i++;
  }
  return <div className="alt-diff-lines">{rows}</div>;
}
function Line({ op, pair, start }: { op: Op; pair?: string; start?: boolean }) {
  const sign = op.kind === 'add' ? '+' : op.kind === 'del' ? '−' : ' ';
  const text = pair !== undefined && op.kind !== 'same' ? words(op.kind === 'add' ? pair : op.text, op.kind === 'add' ? op.text : pair, op.kind) : op.text || ' ';
  const Tag = op.kind === 'add' ? 'ins' : op.kind === 'del' ? 'del' : 'span';
  return (
    <div className="alt-diff-line" data-kind={op.kind} tabIndex={start ? -1 : undefined} data-change-start={start ? '' : undefined}>
      <span className="alt-diff-sign" aria-hidden="true">{sign}</span>
      <Tag className="alt-diff-text">{op.kind !== 'same' && <span className="alt-sr">{op.kind === 'add' ? 'Added: ' : 'Removed: '}</span>}{text}</Tag>
    </div>
  );
}
