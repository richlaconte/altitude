import * as React from 'react';
import { cx, Icons, useDepth } from './core';
import { Accordion, Button } from './controls';
import { CodeBlock } from './code-block';

/* ───────────────────────── Trace ───────────────────────── */

export type TraceStepStatus = 'planned' | 'running' | 'done' | 'failed' | 'awaiting-approval';
interface TraceCtxT { announce: (text: string, urgent?: boolean) => void; mounted: React.MutableRefObject<boolean> }
const TraceCtx = React.createContext<TraceCtxT | null>(null);

export interface TraceProps extends React.OlHTMLAttributes<HTMLOListElement> {
  'aria-label': string;
}
/**
 * The steps an agent takes, drawn as a vertical Stepper: done steps are flush in the record with a stamped check, the
 * running step stands raised on its wall, planned steps are imprints. No spinners. A failed step drops to a trench with
 * Retry; one waiting for approval holds a Confirmation. Steps that start without a plan arrive with the afterglow.
 */
export function Trace(props: TraceProps) {
  const parent = React.useContext(TraceCtx);
  return parent ? <NestedTrace {...props} parent={parent} /> : <RootTrace {...props} />;
}

// What a set of steps adds up to: statuses read from the element tree (TraceSteps, TraceParallels, nested Traces).
function statusesOf(children: React.ReactNode, deep = false): TraceStepStatus[] {
  const out: TraceStepStatus[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as { status?: TraceStepStatus | 'auto'; children?: React.ReactNode };
    if (child.type === TraceStep) out.push(props.status === 'auto' || !props.status ? derive(props.children) : props.status);
    else if (child.type === TraceParallel || child.type === React.Fragment || (deep && child.type === Trace)) out.push(...statusesOf(props.children, deep));
  });
  return out;
}
function derive(children: React.ReactNode): TraceStepStatus {
  const all: TraceStepStatus[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as { status?: TraceStepStatus | 'auto'; children?: React.ReactNode };
    if (child.type === Trace || child.type === TraceParallel || child.type === React.Fragment) all.push(...statusesOf(props.children, true));
  });
  if (!all.length) return 'planned';
  // Still going while anything in it is: a failed subagent fails the step only once the others have stopped.
  if (all.includes('awaiting-approval')) return 'awaiting-approval';
  if (all.includes('running')) return 'running';
  if (all.includes('failed')) return 'failed';
  if (all.every((x) => x === 'done')) return 'done';
  if (all.every((x) => x === 'planned')) return 'planned';
  return 'running';
}
const summary = (list: TraceStepStatus[]) => {
  const n = (k: TraceStepStatus) => list.filter((x) => x === k).length;
  const parts = [`${list.length} step${list.length === 1 ? '' : 's'}`];
  if (n('running')) parts.push(`${n('running')} running`);
  if (n('awaiting-approval')) parts.push(`${n('awaiting-approval')} waiting for approval`);
  if (n('failed')) parts.push(`${n('failed')} failed`);
  if (!n('running') && !n('failed') && !n('awaiting-approval') && n('done') === list.length) parts.push('all done');
  return parts.join(' · ');
};

// A Trace inside a TraceStep is a nested run (a subagent): a nested list behind a lid that says how it's going, closed
// unless something in it is running, waiting or failed. Its steps announce through the outer Trace, with its name.
function NestedTrace({ className, children, 'aria-label': label, parent, ...rest }: TraceProps & { parent: TraceCtxT }) {
  const list = statusesOf(children);
  const live = list.some((x) => x === 'running' || x === 'failed' || x === 'awaiting-approval');
  const announce = React.useCallback((text: string, urgent?: boolean) => parent.announce(`${text} (${label})`, urgent), [parent, label]);
  return (
    <TraceCtx.Provider value={{ announce, mounted: parent.mounted }}>
      <Accordion className="alt-trace-acc alt-trace-nested" defaultValue={live ? ['n'] : []} items={[{ value: 'n',
        title: <span className="alt-trace-nested-title"><span>{label}</span><span className="alt-trace-nested-sum">{summary(list)}</span></span>,
        content: <ol className={cx('alt-stepper alt-trace', className)} data-orientation="vertical" aria-label={label} {...rest}>{children}</ol> }]} />
    </TraceCtx.Provider>
  );
}

export interface TraceParallelProps {
  /** What runs at once: "Subagents". */
  label: string;
  /** TraceSteps that run at the same time. */
  children: React.ReactNode;
  className?: string;
}
/**
 * Steps that run at once (#278), in a labelled group with a 1px bracket: "Subagents · 3 in parallel · 2 of 3 done".
 * Several steps can be raised at once here, each because it's in play; the words carry the count.
 */
export function TraceParallel({ label, children, className }: TraceParallelProps) {
  const list = statusesOf(children);
  const done = list.filter((x) => x === 'done').length, failed = list.filter((x) => x === 'failed').length;
  const sum = `${list.length} in parallel · ${done} of ${list.length} done${failed ? ` · ${failed} failed` : ''}`;
  return (
    <div className={cx('alt-trace-parallel', className)} role="group" aria-label={`${label}: ${sum}`}>
      <p className="alt-trace-parallel-head" aria-hidden="true"><span>{label}</span><span>{sum}</span></p>
      <ol className="alt-stepper alt-trace" data-orientation="vertical">{children}</ol>
    </div>
  );
}

function RootTrace({ className, children, 'aria-label': label, ...rest }: TraceProps) {
  const [said, setSaid] = React.useState({ polite: '', urgent: '' });
  const mounted = React.useRef(false);
  React.useEffect(() => { mounted.current = true; }, []);
  const queue = React.useRef<{ t: ReturnType<typeof setTimeout> | null; last: string }>({ t: null, last: '' });
  // Step changes are said politely and throttled (an agent can finish several steps a second); failures at once.
  const announce = React.useCallback((text: string, urgent = false) => {
    if (urgent) { setSaid((s) => ({ ...s, urgent: text })); return; }
    queue.current.last = text;
    if (queue.current.t) return;
    queue.current.t = setTimeout(() => { queue.current.t = null; setSaid((s) => ({ ...s, polite: queue.current.last })); }, 700);
  }, []);
  React.useEffect(() => () => { if (queue.current.t) clearTimeout(queue.current.t); }, []);
  return (
    <TraceCtx.Provider value={{ announce, mounted }}>
      <ol className={cx('alt-stepper alt-trace', className)} data-orientation="vertical" aria-label={label} {...rest}>{children}</ol>
      <span className="alt-sr" aria-live="polite">{said.polite}</span>
      <span className="alt-sr" aria-live="assertive">{said.urgent}</span>
    </TraceCtx.Provider>
  );
}

const Tick = () => (
  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.5 8.5l3 3 6-6.5" pathLength={16} />
  </svg>
);
export const formatDuration = (ms: number) => ms < 1000 ? `${Math.round(ms)}ms` : ms < 60000 ? `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s` : `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
const words: Record<TraceStepStatus, string> = { planned: 'Planned', running: 'Running', done: 'Done', failed: 'Failed', 'awaiting-approval': 'Waiting for your approval' };

export interface TraceStepProps {
  title: string;
  /** 'auto': derived from the steps inside it (a nested Trace or TraceParallel): done only when they all are. */
  status: TraceStepStatus | 'auto';
  /** Milliseconds it took (done or failed) or has taken so far. */
  duration?: number;
  /** Why it failed. */
  error?: React.ReactNode;
  onRetry?: () => void;
  /** Tool calls, reasoning, a Confirmation. */
  children?: React.ReactNode;
  className?: string;
}
export function TraceStep({ title, status: given, duration, error, onRetry, children, className }: TraceStepProps) {
  const c = React.useContext(TraceCtx);
  const status = given === 'auto' ? derive(children) : given;
  const arrived = React.useRef(c?.mounted.current ?? false);
  const { style, ...depth } = useDepth({ settle: arrived.current && status !== 'planned' ? true : undefined });
  const last = React.useRef(status);
  React.useEffect(() => {
    if (last.current !== status) {
      if (status === 'failed') c?.announce(`Failed: ${title}`, true);
      else if (status === 'done') c?.announce(`Done: ${title}`);
      else if (status === 'running') c?.announce(title);
      else if (status === 'awaiting-approval') c?.announce(`${title}: waiting for your approval`, true);
    } else if (arrived.current && status === 'running') c?.announce(title);
    last.current = status;
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  const plate = status === 'done' ? 'done' : status === 'planned' ? 'upcoming' : status === 'failed' ? 'failed' : 'current';
  return (
    <li className={cx('alt-step-item alt-trace-item', className)} data-state={plate} data-trace={status} aria-current={status === 'running' || status === 'awaiting-approval' ? 'step' : undefined}>
      <div className="alt-step" data-state={plate} {...depth} style={style}>
        <span className="alt-step-mark">{status === 'done' ? <Tick /> : status === 'failed' ? <Icons.X size={13} aria-hidden="true" /> : status === 'running' ? <span className="alt-trace-live" aria-hidden="true" /> : null}</span>
        <span className="alt-step-text">
          <span className="alt-step-title">{title}</span>
          <span className="alt-step-desc">{words[status]}{duration !== undefined && status !== 'planned' ? ` · ${formatDuration(duration)}` : ''}</span>
          {status === 'failed' && (error || onRetry) && (
            <span className="alt-trace-error">{error}{onRetry && <Button size="sm" variant="secondary" onClick={onRetry}><Icons.Refresh size={13} />Retry</Button>}</span>
          )}
        </span>
      </div>
      {children && status !== 'planned' && <div className="alt-trace-detail">{children}</div>}
      <span className="alt-step-line" aria-hidden="true" data-done={status === 'done' ? '' : undefined} />
    </li>
  );
}

const show = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2));
export interface TraceToolCallProps {
  /** The tool's name ("search_documents"). */
  name: string;
  input?: unknown;
  output?: unknown;
  /** Open to begin with. Default false. */
  defaultOpen?: boolean;
}
/** A tool call's input and output, behind an Accordion lid named by the tool. */
export function TraceToolCall({ name, input, output, defaultOpen = false }: TraceToolCallProps) {
  return <Accordion className="alt-trace-acc" defaultValue={defaultOpen ? ['t'] : []} items={[{ value: 't', title: <span className="alt-trace-tool"><code>{name}</code></span>, content: (
    <div className="alt-trace-io">
      {input !== undefined && <CodeBlock title="Input" language="json" code={show(input)} />}
      {output !== undefined ? <CodeBlock title="Output" language="json" code={show(output)} /> : <p className="alt-trace-wait">No output yet.</p>}
    </div>
  ) }]} />;
}

export interface TraceReasoningProps {
  /** How long it thought, in milliseconds: "Thought for 12s". Said once, when it's known; never a ticking counter. */
  duration?: number;
  /**
   * 'streaming': the lid says "Thinking…" and, opened, the text follows its end as it arrives; 'complete' (default):
   * "Thought for 12s"; 'redacted': "Reasoning hidden by the provider", with nothing to open.
   */
  status?: 'streaming' | 'complete' | 'redacted';
  /** While streaming and open, keep the newest text in view (until the person scrolls up). Default true. */
  followWhileOpen?: boolean;
  children?: React.ReactNode;
}
/**
 * The model's reasoning, closed by default. While it streams it isn't the record yet: "Thinking…" on the lid and a
 * dashed rule down the open compartment, never a shimmer or pulsing dots. Done, it's "Thought for 12s".
 */
export function TraceReasoning({ duration, status = 'complete', followWhileOpen = true, children }: TraceReasoningProps) {
  const box = React.useRef<HTMLDivElement>(null);
  const pinned = React.useRef(true);
  React.useLayoutEffect(() => {
    const el = box.current;
    if (el && status === 'streaming' && followWhileOpen && pinned.current) el.scrollTop = el.scrollHeight;
  });
  if (status === 'redacted') return <p className="alt-trace-reasoning-hidden">Reasoning hidden by the provider</p>;
  const title = status === 'streaming' ? 'Thinking…' : duration !== undefined ? `Thought for ${formatDuration(duration)}` : 'Reasoning';
  return (
    <div className="alt-trace-thought" data-status={status} aria-busy={status === 'streaming' || undefined}>
      <Accordion className="alt-trace-acc" items={[{ value: 'r', title: <span key={status} className="alt-trace-thought-title">{title}</span>, content: (
        <div ref={box} className="alt-trace-reasoning" onScroll={(e) => { const el = e.currentTarget; pinned.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 8; }}>{children}</div>
      ) }]} />
    </div>
  );
}
