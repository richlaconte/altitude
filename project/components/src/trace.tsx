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
export function Trace({ className, children, 'aria-label': label, ...rest }: TraceProps) {
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
  status: TraceStepStatus;
  /** Milliseconds it took (done or failed) or has taken so far. */
  duration?: number;
  /** Why it failed. */
  error?: React.ReactNode;
  onRetry?: () => void;
  /** Tool calls, reasoning, a Confirmation. */
  children?: React.ReactNode;
  className?: string;
}
export function TraceStep({ title, status, duration, error, onRetry, children, className }: TraceStepProps) {
  const c = React.useContext(TraceCtx);
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
  /** How long it thought, in milliseconds: "Thought for 12s". */
  duration?: number;
  children: React.ReactNode;
}
/** The model's reasoning, closed by default behind "Thought for 12s". */
export function TraceReasoning({ duration, children }: TraceReasoningProps) {
  return <Accordion className="alt-trace-acc" items={[{ value: 'r', title: duration !== undefined ? `Thought for ${formatDuration(duration)}` : 'Reasoning', content: <div className="alt-trace-reasoning">{children}</div> }]} />;
}
