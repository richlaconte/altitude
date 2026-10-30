import * as React from 'react';
import { cx, Icons, useDepth } from './core';
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
  /**
   * Review each change (#282, text mode): a change awaiting a decision is a proposal, so it's raised, with Accept and
   * Reject; once decided it's the record again (accepted flush with one afterglow, rejected collapsed to a line). The
   * header gets Accept all, Reject all and "3 of 7 changes reviewed"; n and p (or ] and [) move between undecided ones.
   */
  review?: boolean;
  /** Decisions so far, by change id ("change-1", in order). Your app owns applying them. */
  decisions?: Record<string, DiffDecision>;
  onDecide?: (changeId: string, decision: DiffDecision) => void;
  onDecideAll?: (decision: DiffDecision) => void;
  className?: string;
}
export type DiffDecision = 'accept' | 'reject';
type Change = { id: string; n: number; from: number; to: number; label: string };
/** The changes in a list of line operations: each maximal run of removals and additions, with its lines named. */
export function diffChanges(ops: Op[]): Change[] {
  const out: Change[] = [];
  let before = 0, after = 0;
  for (let i = 0; i < ops.length;) {
    if (ops[i].kind === 'same') { before++; after++; i++; continue; }
    let j = i, dels = 0, adds = 0;
    while (j < ops.length && ops[j].kind !== 'same') { if (ops[j].kind === 'del') dels++; else adds++; j++; }
    const [a, b] = adds ? [after + 1, after + adds] : [before + 1, before + dels];
    out.push({ id: `change-${out.length + 1}`, n: out.length + 1, from: i, to: j, label: a === b ? `line ${a}` : `lines ${a} to ${b}` });
    before += dels; after += adds; i = j;
  }
  return out;
}
/**
 * What changed between two versions, in signs and words. Both versions are the record, so it lies flush. Additions are
 * positive-soft with a + sign and "Added", removals critical-soft, struck through, with − and "Removed"; a changed
 * property shows the old value struck through beside the new. Long unchanged runs fold behind lids. Never colour alone.
 */
export function DiffView({ mode = 'text', before, after, fields, context = 3, caption, hunks, review = false, decisions = {}, onDecide, onDecideAll, className }: DiffViewProps) {
  const id = React.useId();
  const body = React.useRef<HTMLDivElement>(null);
  const [at, setAt] = React.useState(-1);
  const go = (d: number) => {
    // Reviewing, only the changes still waiting for a decision.
    const changes = [...(body.current?.querySelectorAll<HTMLElement>(review ? '.alt-diff-hunk:not([data-decision]) [data-change-start]' : '[data-change-start]') ?? [])];
    if (!changes.length) return;
    const next = (at + d + changes.length) % changes.length;
    setAt(next);
    changes[next].focus();
  };
  const onKey = (e: React.KeyboardEvent) => { if (e.target instanceof HTMLInputElement) return; if (e.key === 'n' || e.key === ']') { e.preventDefault(); go(1); } if (e.key === 'p' || e.key === '[') { e.preventDefault(); go(-1); } };
  const [said, setSaid] = React.useState('');

  let summary = '', content: React.ReactNode, reviewTools: React.ReactNode = null;
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
    const changes = review ? diffChanges(ops) : [];
    const decided = changes.filter((c) => decisions[c.id]).length;
    if (review) summary = `${decided} of ${changes.length} ${changes.length === 1 ? 'change' : 'changes'} reviewed`;
    const decide = (c: Change, d: DiffDecision) => {
      onDecide?.(c.id, d);
      const left = changes.filter((x) => x.id !== c.id && !decisions[x.id]).length;
      setSaid(`Change ${c.n} ${d === 'accept' ? 'accepted' : 'rejected'}. ${left ? `${left} left.` : 'All reviewed.'}`);
    };
    content = <TextDiff ops={ops} context={context} review={review ? { changes, decisions, decide } : undefined} />;
    if (review) reviewTools = changes.length - decided > 0 && (
      <>
        <Button size="sm" variant="ghost" onClick={() => { onDecideAll?.('reject'); setSaid(`${changes.length - decided} changes rejected.`); }}>Reject all</Button>
        <Button size="sm" variant="secondary" onClick={() => { onDecideAll?.('accept'); setSaid(`${changes.length - decided} changes accepted.`); }}>Accept all</Button>
      </>
    );
  }
  return (
    <figure className={cx('alt-diff', className)} aria-labelledby={`${id}-c`} onKeyDown={onKey}>
      <figcaption className="alt-diff-head" id={`${id}-c`}>
        <span className="alt-diff-caption">{caption}</span>
        <span className="alt-diff-summary">{summary}</span>
        <span className="alt-diff-nav">
          <Button size="sm" variant="ghost" onClick={() => go(-1)}>Previous change</Button>
          <Button size="sm" variant="ghost" onClick={() => go(1)}>Next change</Button>
          {reviewTools}
        </span>
      </figcaption>
      <div ref={body} className="alt-diff-body">{content}</div>
      {review && <span className="alt-sr" role="status">{said}</span>}
    </figure>
  );
}

/** Lines with signs; a removal followed by an addition is a changed line, so their words are marked too. */
type Review = { changes: Change[]; decisions: Record<string, DiffDecision>; decide: (c: Change, d: DiffDecision) => void };
function TextDiff({ ops, context, review }: { ops: Op[]; context: number; review?: Review }) {
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
    const change = review?.changes.find((c) => c.from === i);
    if (change) {
      // Reviewing: the change's lines in one group with its decision.
      const lines = [];
      for (let k = change.from; k < change.to; k++) lines.push(<Line key={k} op={ops[k]} pair={pairs.get(k)} start={k === change.from} />);
      rows.push(<Hunk key={change.id} change={change} total={review!.changes.length} decision={review!.decisions[change.id]} onDecide={(d) => review!.decide(change, d)}>{lines}</Hunk>);
      i = change.to; continue;
    }
    const prev = ops[i - 1];
    rows.push(<Line key={i} op={ops[i]} pair={pairs.get(i)} start={ops[i].kind !== 'same' && prev?.kind !== ops[i].kind && !(ops[i].kind === 'add' && prev?.kind === 'del')} />);
    i++;
  }
  return <div className="alt-diff-lines">{rows}</div>;
}
// A change under review: raised while it waits for a decision (it's a proposal), the record again once decided:
// accepted lands flush with one afterglow, rejected collapses to one muted line after dur-linger ("Rejected · show").
function Hunk({ change, total, decision, onDecide, children }: { change: Change; total: number; decision?: DiffDecision; onDecide: (d: DiffDecision) => void; children: React.ReactNode }) {
  const { style, 'aria-busy': _b, ...depth } = useDepth({ settle: decision === 'accept' ? decision : undefined });
  const [folded, setFolded] = React.useState(false);
  const self = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (decision !== 'reject') { setFolded(false); return; }
    const el = self.current;
    const cs = el ? getComputedStyle(el) : null;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const linger = reduce ? 0 : parseFloat(cs?.getPropertyValue('--dur-linger') || '2000') || 2000;
    const t = window.setTimeout(() => setFolded(true), linger);
    return () => window.clearTimeout(t);
  }, [decision]);
  const name = `Change ${change.n} of ${total}, ${change.label}`;
  return (
    <div ref={self} className="alt-diff-hunk" role="group" aria-label={name} data-decision={decision} data-folded={folded ? '' : undefined} {...depth} style={style}>
      {folded
        ? <button type="button" className="alt-diff-hunk-folded" onClick={() => setFolded(false)}>Rejected · show <span className="alt-sr">change {change.n}</span></button>
        : children}
      {!folded && (
        <div className="alt-diff-hunk-bar">
          {decision
            ? <span className="alt-diff-hunk-state">{decision === 'accept' ? <><Icons.CircleCheck size={13} aria-hidden="true" />Accepted</> : 'Rejected'}</span>
            : <>
              <span className="alt-diff-hunk-state">Proposed change</span>
              <Button size="sm" variant="ghost" aria-label={`Reject change ${change.n}`} onClick={() => onDecide('reject')}><Icons.X size={13} aria-hidden="true" />Reject</Button>
              <Button size="sm" variant="ghost" aria-label={`Accept change ${change.n}`} onClick={() => onDecide('accept')}><Icons.Check size={13} aria-hidden="true" />Accept</Button>
            </>}
        </div>
      )}
    </div>
  );
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
