import * as React from 'react';
import { cx, Icons, Surface } from './core';
import { Badge, Button } from './controls';

/* ───────────────────────── shared ───────────────────────── */

/**
 * Where an agent is in its run. Needing you is one state with three reasons (`needs`); failed also waits on you, since
 * nothing happens until someone retries or stops it. Stalled is a suspicion, not a request: the agent is still working
 * but has made no progress, or keeps retrying the same thing.
 */
export type AgentState = 'queued' | 'working' | 'needs-input' | 'blocked' | 'stalled' | 'failed' | 'done' | 'stopped';
export type AgentNeeds = 'approval' | 'question' | 'review';
type Time = Date | string | number;
const ms = (t: Time) => new Date(t).getTime();

/** "under a minute", "4 min", "1 h 5 min": a span in words, never a ticking counter. */
export function formatSpan(span: number): string {
  const m = Math.floor(Math.max(0, span) / 60000);
  if (m < 1) return 'under a minute';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** The clock everything here reads: `now` when you pass one (a replay, a test), otherwise the time, every 30 seconds. */
function useNow(now?: Time) {
  const [tick, setTick] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (now !== undefined) return;
    const t = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, [now]);
  return now !== undefined ? ms(now) : tick;
}

const NEEDS_WORD: Record<AgentNeeds, string> = { approval: 'Needs approval', question: 'Has a question', review: 'Ready for review' };
const NEEDS_SAID: Record<AgentNeeds, string> = { approval: 'needs your approval', question: 'has a question for you', review: 'is ready for your review' };

/** Whether a state is waiting on a person: these lead the fleet and fill the requests. */
export const needsYou = (state: AgentState) => state === 'needs-input' || state === 'failed';

/* ───────────────────────── AgentFleet ───────────────────────── */

interface FleetCtx { now: number; announce: (text: string) => void; mounted: React.MutableRefObject<boolean> }
const FleetContext = React.createContext<FleetCtx | null>(null);
const DepthContext = React.createContext(0);

export interface AgentFleetProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Names the fleet: "Agents". */
  'aria-label'?: string;
  /** The time the rows measure waits and runs from. Default: now, refreshed every 30 seconds. */
  now?: Time;
  /** The counts in words above the groups: "2 need you · 3 working · 4 done" (`summarizeFleet` writes it). */
  summary?: React.ReactNode;
  /** AgentFleetGroups. */
  children: React.ReactNode;
}
/**
 * Every agent in a run of work, grouped by what they need from you: the ones waiting on you first,
 * longest wait at the top, then the ones working, then the finished ones folded away. Rows are the record, flush, each
 * saying its state in words with a lamp that only repeats it; the one open beside the fleet is selected (tinted and
 * raised a level, as a table's selected row). An agent that starts needing you is announced once.
 */
export function AgentFleet({ 'aria-label': label = 'Agents', now, summary, className, children, ...rest }: AgentFleetProps) {
  const clock = useNow(now);
  const [said, setSaid] = React.useState('');
  const mounted = React.useRef(false);
  React.useEffect(() => { mounted.current = true; }, []);
  const root = React.useRef<HTMLDivElement>(null);
  // Up and Down move between rows, across groups; Home and End go to the first and last.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) || !(e.target as Element).classList.contains('alt-agent-row')) return;
    const rows = [...(root.current?.querySelectorAll<HTMLElement>('.alt-agent-row') ?? [])].filter((r) => r.offsetParent !== null);
    const i = rows.indexOf(e.target as HTMLElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : i + (e.key === 'ArrowDown' ? 1 : -1);
    if (rows[next]) { e.preventDefault(); rows[next].focus(); }
  };
  return (
    <FleetContext.Provider value={{ now: clock, announce: setSaid, mounted }}>
      <div ref={root} role="region" aria-label={label} className={cx('alt-fleet', className)} onKeyDown={onKeyDown} {...rest}>
        {summary && <p className="alt-fleet-summary">{summary}</p>}
        {children}
        <span className="alt-sr alt-fleet-said" role="status" aria-live="polite">{said}</span>
      </div>
    </FleetContext.Provider>
  );
}

export interface AgentFleetGroupProps {
  /** "Needs you", "Working", "Done". */
  label: string;
  /** Shown after the label and in its name; default: the number of rows in it. null: no count (a group of one, like a lead agent). */
  count?: number | null;
  /** Folds the group under its heading, a lid that opens it: for finished agents. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** What to say when the group is empty: "Nothing needs you." Without it an empty group isn't drawn. */
  empty?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}
/** A run of agents under a heading, with its count. */
export function AgentFleetGroup({ label, count, collapsible = false, defaultOpen = true, empty, children, className }: AgentFleetGroupProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const id = React.useId();
  const n = count ?? React.Children.toArray(children).length;
  const shown = count !== null;
  if (!n && !empty) return null;
  const head = <><span className="alt-fleet-group-label">{label}</span>{shown && <span className="alt-fleet-group-count">{n}</span>}</>;
  return (
    <div className={cx('alt-fleet-group', className)} data-open={open ? '' : undefined}>
      {collapsible
        ? <button type="button" className="alt-fleet-group-head" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
            <Icons.ChevronDown size={14} aria-hidden="true" className="alt-fleet-chevron" />{head}</button>
        : <div className="alt-fleet-group-head" id={id + '-h'}>{head}</div>}
      {n === 0
        ? <p className="alt-fleet-empty">{empty}</p>
        : <ul id={id} className="alt-fleet-list" aria-label={shown ? `${label}, ${n}` : label} hidden={collapsible && !open}>{children}</ul>}
    </div>
  );
}

export interface AgentFleetItemProps {
  name: string;
  state: AgentState;
  /** For 'needs-input': what it needs. Default 'approval'. */
  needs?: AgentNeeds;
  /** One line: what it's doing now, the question it's asking, or what it finished with. */
  activity?: React.ReactNode;
  /** When it entered this state: how long it's been waiting on you, stalled or blocked. */
  since?: Time;
  /** When it started: how long it's been running (or took, once done). */
  startedAt?: Time;
  /** When it finished, for "took 9 min". */
  endedAt?: Time;
  /** Where it is in its plan: "Step 3 of 5". */
  step?: { current: number; total: number };
  /** For 'blocked': who or what it's waiting on. "Billing API". */
  blockedBy?: string;
  /** Another agent is changing the same file: said on the row, so the clash is caught before either merges. */
  conflict?: { file: string; with: string };
  /** For 'stalled': why. Default "No progress for <since>". */
  stalledReason?: string;
  /** Spend so far, already formatted: "$0.42" or "38k tokens". */
  cost?: string;
  /** What it produced: a pull request plate, a link. */
  output?: React.ReactNode;
  /** Open beside the fleet. */
  selected?: boolean;
  onSelect?: () => void;
  /** Agents it started, as AgentFleetItems: a bracketed list under it. */
  children?: React.ReactNode;
  className?: string;
}

type Plate = { word: string; tone: 'accent' | 'caution' | 'critical' | 'positive' | 'neutral'; lamp: boolean };
function plateFor(p: AgentFleetItemProps, now: number): Plate {
  const waited = p.since !== undefined ? formatSpan(now - ms(p.since)) : '';
  switch (p.state) {
    case 'queued': return { word: 'Queued', tone: 'neutral', lamp: false };
    case 'working': return { word: 'Working', tone: 'accent', lamp: true };
    case 'needs-input': return { word: NEEDS_WORD[p.needs ?? 'approval'], tone: 'caution', lamp: true };
    case 'blocked': return { word: p.blockedBy ? `Waiting on ${p.blockedBy}` : 'Blocked', tone: 'neutral', lamp: false };
    case 'stalled': return { word: p.stalledReason ?? (waited ? `No progress for ${waited}` : 'No progress'), tone: 'caution', lamp: false };
    case 'failed': return { word: "Couldn't finish", tone: 'critical', lamp: false };
    case 'done': return { word: 'Done', tone: 'positive', lamp: false };
    case 'stopped': return { word: 'Stopped', tone: 'neutral', lamp: false };
  }
}
/** The time a row shows: a wait while it waits on you, otherwise how long it's run or took. */
function timeFor(p: AgentFleetItemProps, now: number): string {
  if (needsYou(p.state) && p.since !== undefined) return `waiting ${formatSpan(now - ms(p.since))}`;
  if ((p.state === 'done' || p.state === 'stopped') && p.startedAt !== undefined && p.endedAt !== undefined) return `took ${formatSpan(ms(p.endedAt) - ms(p.startedAt))}`;
  if (p.state === 'queued' || p.startedAt === undefined) return '';
  return formatSpan(now - ms(p.startedAt));
}

/** One agent: its name, its state in words, what it's doing, how long, and anything about to go wrong. */
export function AgentFleetItem(props: AgentFleetItemProps) {
  const { name, state, needs = 'approval', activity, step, conflict, cost, output, selected = false, onSelect, children, className } = props;
  const c = React.useContext(FleetContext);
  const depth = React.useContext(DepthContext);
  const now = c?.now ?? Date.now();
  const plate = plateFor(props, now);
  const time = timeFor(props, now);
  // An agent that starts needing you is said once (a failure too); finishing, starting and stalling aren't.
  const last = React.useRef(state);
  React.useEffect(() => {
    if (c?.mounted.current && needsYou(state) && !needsYou(last.current) && !selected) c.announce(state === 'failed' ? `${name} couldn't finish` : `${name} ${NEEDS_SAID[needs]}`);
    last.current = state;
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const kids = React.Children.toArray(children);
  const inner = (
    <>
      <span className="alt-agent-head">
        <span className="alt-agent-mark" aria-hidden="true">{state === 'done' ? <Icons.Check size={14} /> : state === 'failed' ? <Icons.AlertCircle size={14} /> : state === 'stalled' ? <Icons.Clock size={14} /> : <i />}</span>
        <span className="alt-agent-name">{name}</span>
        {time && <span className="alt-agent-time"><span className="alt-sr">, </span>{time}</span>}
      </span>
      {activity && <span className="alt-agent-activity"><span className="alt-sr">, </span>{activity}</span>}
      <span className="alt-agent-meta">
        <span className="alt-sr">, </span><Badge tone={plate.tone} variant={plate.tone === 'neutral' ? 'plate' : 'soft'} lamp={plate.lamp}>{plate.word}</Badge>
        {step && <span className="alt-agent-step"><span className="alt-sr">, </span>Step {step.current} of {step.total}</span>}
        {cost && <span className="alt-agent-cost"><span className="alt-sr">, spent </span>{cost}</span>}
      </span>
      {conflict && (
        <span className="alt-agent-conflict"><Icons.AlertTriangle size={13} aria-hidden="true" /><span className="alt-sr">, </span>
          <span>Also changing <code>{conflict.file}</code>: {conflict.with}</span></span>
      )}
    </>
  );
  return (
    <li className={cx('alt-agent', className)} data-agent-state={state} data-selected={selected ? '' : undefined} data-depth={depth || undefined}>
      <div className="alt-agent-line">
        {onSelect
          ? <button type="button" className="alt-agent-row" aria-current={selected ? 'true' : undefined} onClick={onSelect}>{inner}</button>
          : <div className="alt-agent-row">{inner}</div>}
        {output && <span className="alt-agent-output">{output}</span>}
      </div>
      {kids.length > 0 && (
        <DepthContext.Provider value={depth + 1}>
          <ul className="alt-agent-children" aria-label={`Started by ${name}, ${kids.length}`}>{children}</ul>
        </DepthContext.Provider>
      )}
    </li>
  );
}

/** "2 need you · 3 working · 1 stalled · 4 done": the fleet in words, for its summary, a page title or a tab. */
export function summarizeFleet(states: AgentState[]): string {
  const n = (f: (s: AgentState) => boolean) => states.filter(f).length;
  const parts: [number, string][] = [
    [n(needsYou), 'need you'], [n((s) => s === 'working'), 'working'], [n((s) => s === 'stalled'), 'stalled'],
    [n((s) => s === 'blocked' || s === 'queued'), 'waiting to start'], [n((s) => s === 'done'), 'done'], [n((s) => s === 'stopped'), 'stopped'],
  ];
  const said = parts.filter(([k]) => k > 0).map(([k, w]) => (w === 'need you' && k === 1 ? '1 needs you' : `${k} ${w}`));
  return said.length ? said.join(' · ') : 'No agents';
}

/**
 * Sorts agents into the fleet's three groups: needs you (longest wait first), working (stalled first, then running,
 * then blocked and queued), and finished (newest first).
 */
export function groupAgents<T>(agents: T[], get: (a: T) => { state: AgentState; since?: Time; endedAt?: Time }): { needsYou: T[]; working: T[]; finished: T[] } {
  const rank: Partial<Record<AgentState, number>> = { stalled: 0, working: 1, blocked: 2, queued: 3 };
  const at = (t?: Time) => (t === undefined ? 0 : ms(t));
  return {
    needsYou: agents.filter((a) => needsYou(get(a).state)).sort((a, b) => at(get(a).since) - at(get(b).since)),
    working: agents.filter((a) => get(a).state in rank).sort((a, b) => rank[get(a).state]! - rank[get(b).state]!),
    finished: agents.filter((a) => get(a).state === 'done' || get(a).state === 'stopped').sort((a, b) => at(get(b).endedAt) - at(get(a).endedAt)),
  };
}

/* ───────────────────────── AgentRequests ───────────────────────── */

export interface AgentRequestsProps extends React.HTMLAttributes<HTMLElement> {
  /** Default "Needs you". */
  title?: string;
  now?: Time;
  /** Said when nothing is waiting. Default "Nothing needs you. Agents ask here when they need a decision." */
  empty?: React.ReactNode;
  /** AgentRequests, in any order: they're shown longest wait first. */
  children?: React.ReactNode;
}
/**
 * Every decision your agents are waiting on, in one queue, so you can answer them without opening
 * each agent: oldest first, because a wait costs the most the longer it runs. Each request asks for action, so it's a
 * raised card that arrives lifted and settles; nothing in it has been dispatched. A new one is announced once.
 */
export function AgentRequests({ title = 'Needs you', now, empty = 'Nothing needs you. Agents ask here when they need a decision.', className, children, ...rest }: AgentRequestsProps) {
  const clock = useNow(now);
  const items = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<AgentRequestProps>[];
  const sorted = [...items].sort((a, b) => ms(a.props.since) - ms(b.props.since));
  const oldest = sorted[0] ? formatSpan(clock - ms(sorted[0].props.since)) : '';
  const [said, setSaid] = React.useState('');
  const seen = React.useRef<Set<React.Key> | null>(null);
  React.useEffect(() => {
    const keys = new Set(items.map((i) => i.key!));
    if (seen.current) {
      const fresh = items.filter((i) => !seen.current!.has(i.key!));
      if (fresh.length) setSaid(fresh.map((i) => `${i.props.agent}: ${i.props.title}`).join('. '));
    }
    seen.current = keys;
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const id = React.useId();
  return (
    <section className={cx('alt-requests', className)} aria-labelledby={id} {...rest}>
      <div className="alt-requests-head">
        <h3 className="alt-requests-title" id={id}>{title}</h3>
        {items.length > 0 && <Badge variant="count" tone="caution" aria-label={`${items.length} waiting`}>{items.length}</Badge>}
        {oldest && <span className="alt-requests-oldest">{items.length > 1 ? 'oldest' : ''} waiting {oldest}</span>}
      </div>
      {items.length === 0
        ? <p className="alt-requests-empty"><Icons.CircleCheck size={16} aria-hidden="true" />{empty}</p>
        : <ol className="alt-requests-list">{sorted.map((el) => <li key={el.key}><RequestClock.Provider value={clock}>{el}</RequestClock.Provider></li>)}</ol>}
      <span className="alt-sr" role="status" aria-live="polite">{said}</span>
    </section>
  );
}
const RequestClock = React.createContext<number | null>(null);

export interface AgentRequestProps {
  /** Which agent is asking. */
  agent: string;
  /** 'failed' is an agent that stopped on an error and waits for Retry or Stop. */
  kind: AgentNeeds | 'failed';
  /** The ask in a sentence: "Run the migration on staging?" */
  title: React.ReactNode;
  /** What happens if you say yes, or what went wrong. */
  detail?: React.ReactNode;
  /** When it started waiting. */
  since: Time;
  /** The answers you can give here: Buttons, secondary and ghost (the view's one primary stays where it is). */
  actions?: React.ReactNode;
  /** Opens the agent beside the queue, for anything that needs more than the actions. */
  onOpen?: () => void;
  className?: string;
}
/** One decision an agent is waiting on: who's asking, what, for how long, and the answers you can give in place. */
export function AgentRequest({ agent, kind, title, detail, since, actions, onOpen, className }: AgentRequestProps) {
  const now = React.useContext(RequestClock) ?? Date.now();
  const id = React.useId();
  const word = kind === 'failed' ? "Couldn't finish" : NEEDS_WORD[kind];
  return (
    <Surface as="article" level={1} settle className={cx('alt-request', className)} data-kind={kind} aria-labelledby={id + '-t'} aria-describedby={id + '-m'}>
      <div className="alt-request-meta" id={id + '-m'}>
        <Badge tone={kind === 'failed' ? 'critical' : 'caution'} variant="soft" lamp={kind !== 'failed'}>{word}</Badge>
        <span className="alt-request-agent">{agent}</span>
        <span className="alt-request-time">waiting {formatSpan(now - ms(since))}</span>
      </div>
      <p className="alt-request-title" id={id + '-t'}>{title}</p>
      {detail && <p className="alt-request-detail">{detail}</p>}
      {(actions || onOpen) && (
        <div className="alt-request-actions">
          {actions}
          {onOpen && <Button size="sm" variant="ghost" onClick={onOpen} aria-label={`Open ${agent}`}>Open</Button>}
        </div>
      )}
    </Surface>
  );
}

/* ───────────────────────── AgentLanes ───────────────────────── */

/** What a stretch of an agent's time was spent on. 'waiting' is waiting on you; 'blocked' is waiting on another agent. */
export type AgentLaneState = 'working' | 'waiting' | 'blocked' | 'failed';
export interface AgentLane {
  id: string;
  name: string;
  /** Stretches of time; one without `to` runs to now. Gaps are time it wasn't running (queued, or finished). */
  segments: { from: Time; to?: Time; state: AgentLaneState }[];
}
export interface AgentLanesProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onSelect'> {
  lanes: AgentLane[];
  /** Where the axis starts. Default: the earliest segment. */
  start?: Time;
  now?: Time;
  /** The sentence above the lanes. Default: how long agents waited on you, and the longest wait. */
  takeaway?: React.ReactNode;
  /** Names the figure. Default "Where the agents' time went". */
  'aria-label'?: string;
  selected?: string;
  onSelect?: (id: string) => void;
}
const LANE_WORD: Record<AgentLaneState, string> = { working: 'Working', waiting: 'Waiting on you', blocked: 'Waiting on another agent', failed: 'Failed' };

/**
 * Where each agent's time went, one lane per agent on a shared clock: the time they spent waiting on
 * you is the bottleneck a fleet hides, so the takeaway says it first. A chart, so its marks are flat (Charts): the
 * stretches are equal-height bars on each lane's ground line, told apart by fill and pattern (waiting is hatched,
 * blocked an outline) and named in a legend in words; a 1px "Now" rule ends the record. A table says the same.
 */
export function AgentLanes({ lanes, start, now, takeaway, 'aria-label': label = "Where the agents' time went", selected, onSelect, className, ...rest }: AgentLanesProps) {
  const clock = useNow(now);
  const t0 = start !== undefined ? ms(start) : Math.min(clock, ...lanes.flatMap((l) => l.segments.map((s) => ms(s.from))));
  const span = Math.max(60000, clock - t0);
  const pos = (t: number) => `${((Math.min(Math.max(t, t0), clock) - t0) / span) * 100}%`;
  const totals = lanes.map((l) => {
    const sum: Record<AgentLaneState, number> = { working: 0, waiting: 0, blocked: 0, failed: 0 };
    let longest = 0;
    for (const s of l.segments) { const d = (s.to !== undefined ? ms(s.to) : clock) - ms(s.from); sum[s.state] += d; if (s.state === 'waiting' || s.state === 'failed') longest = Math.max(longest, d); }
    return { lane: l, sum, longest };
  });
  // A failed agent waits on you too: nothing happens until someone retries or stops it.
  const waited = totals.reduce((a, t) => a + t.sum.waiting + t.sum.failed, 0);
  const worst = totals.reduce((a, t) => (t.longest > a.longest ? t : a), totals[0] ?? { longest: 0, lane: null as AgentLane | null });
  const said = takeaway ?? (waited < 60000
    ? 'No agent has waited on you.'
    : `Agents have waited on you for ${formatSpan(waited)} in all; the longest wait was ${worst.lane?.name}, ${formatSpan(worst.longest)}.`);
  const ticks = [0, 0.5, 1].map((f) => ({ f, word: f === 1 ? 'Now' : `${formatSpan(span * (1 - f))} ago` }));
  const id = React.useId();
  return (
    <figure className={cx('alt-lanes', className)} aria-labelledby={id} {...rest}>
      <figcaption className="alt-lanes-takeaway" id={id}><span className="alt-sr">{label}. </span>{said}</figcaption>
      <ul className="alt-lanes-legend" aria-label="Key">
        {(['working', 'waiting', 'blocked', 'failed'] as const).map((s) => <li key={s}><i className="alt-lane-swatch" data-lane={s} aria-hidden="true" />{LANE_WORD[s]}</li>)}
      </ul>
      <div className="alt-lanes-plot">
        {lanes.map((l) => (
          <div key={l.id} className="alt-lane" data-selected={selected === l.id ? '' : undefined}>
            {onSelect
              ? <button type="button" className="alt-lane-name" aria-pressed={selected === l.id} onClick={() => onSelect(l.id)}>{l.name}</button>
              : <span className="alt-lane-name" aria-hidden="true">{l.name}</span>}
            <span className="alt-lane-track" aria-hidden="true">
              {l.segments.map((s, i) => {
                const a = ms(s.from), b = s.to !== undefined ? ms(s.to) : clock;
                return <i key={i} className="alt-lane-bar" data-lane={s.state} style={{ left: pos(a), width: `calc(${pos(b)} - ${pos(a)})` }} title={`${l.name}: ${LANE_WORD[s.state]}, ${formatSpan(b - a)}`} />;
              })}
            </span>
          </div>
        ))}
        <div className="alt-lanes-axis" aria-hidden="true"><span />
          <span className="alt-lanes-ticks">{ticks.map((t) => <span key={t.f} style={{ left: `${t.f * 100}%` }} data-edge={t.f === 0 ? 'start' : t.f === 1 ? 'end' : undefined}>{t.word}</span>)}</span>
        </div>
        <span className="alt-lanes-now" aria-hidden="true" />
      </div>
      {/* A table ignores the 1px clip, so the visually hidden wrapper is a div around it. */}
      <div className="alt-sr"><table>
        <caption>{label}, by agent</caption>
        <thead><tr><th scope="col">Agent</th>{(['working', 'waiting', 'blocked', 'failed'] as const).map((s) => <th key={s} scope="col">{LANE_WORD[s]}</th>)}</tr></thead>
        <tbody>{totals.map((t) => (
          <tr key={t.lane.id}>
            <th scope="row">{t.lane.name}</th>
            {(['working', 'waiting', 'blocked', 'failed'] as const).map((s) => <td key={s}>{t.sum[s] ? formatSpan(t.sum[s]) : '—'}</td>)}
          </tr>
        ))}</tbody>
      </table></div>
    </figure>
  );
}
