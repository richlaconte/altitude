// Agent orchestration: the view for many agents at once. One lead agent splits "Launch annual pricing" into six tasks
// and runs them in parallel; the person supervises. Built from what supervising several agents asks of a person: see
// who needs you first (management by exception, longest wait at the top), answer in place without opening each agent,
// catch trouble before it lands (two agents changing one file, an agent making no progress), see what each is doing in
// a line, open one to steer it, and see where the time went, above all the time agents spent waiting on you.
// The roster sits on the left, needing you first; the decisions waiting on you lead the main column, above the agent
// that's open, so you can answer them in a row without opening each one. On a phone the regions are three panes (Needs
// you, Agents, Timeline) shown one at a time: each moment opens the pane its change is in, and opening an agent shows it
// in place of the roster, with a way back.
// Like the agent harness, the run is a script: each agent's history is a list of state changes at minutes from the
// start, and a moment is the fold of every history up to its minute, so every state is reachable on demand and is the
// same every time. The site's agent page, the "AgentOrchestration" story and its render in CI all use this file.
// The lines between the preview markers are the "AgentOrchestration" preview (scripts/pattern-previews.mjs copies them);
// build/checks/pattern-types.mjs type-checks this file against the public declarations.
// preview-name: AgentOrchestration
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
/** Minute 0 of the run, fixed so every render is identical. */
const T0 = Date.UTC(2026, 9, 31, 14, 0);
const at = (/** @type {number} */ m) => T0 + m * 60000;
/** The moments the rail can jump to: the minute each happens at, why the view looks as it does, and (on a phone) the pane it shows. */
const MOMENTS = [
  { id: 'planned', name: 'Planned', t: 1, pane: 'agents', note: 'The lead agent reads the brief and splits the launch into tasks. One agent, working: a lamp plate says so, never a spinner.' },
  { id: 'fanned', name: 'Fanned out', t: 4, pane: 'agents', note: 'Four agents work at once. Working never hovers: a lamp plate says it. QA waits on two others, and says which.' },
  { id: 'asking', name: 'Two need you', t: 9, pane: 'needs', note: 'Decisions gather in one queue, oldest first, each a raised card you can answer in place. The fleet leads with the same agents.' },
  { id: 'overlap', name: 'Overlap', t: 12, pane: 'agents', note: 'Two agents are changing the same file. The row says so before either merges, so you can steer one away early.' },
  { id: 'stalled', name: 'Stalled', t: 17, pane: 'agents', note: 'An agent still running but making no progress is a suspicion, not a request: a caution plate in the working group, not a card.' },
  { id: 'failed', name: 'Failed', t: 22, pane: 'needs', note: 'A failed agent waits on you like a question does: it joins the queue with Retry. A finished pull request asks for review.' },
  { id: 'reviewing', name: 'Reviewed', t: 26, pane: 'agents', note: 'Answered requests leave the queue; finished agents fold away, stamped with a check and how long they took.' },
  { id: 'done', name: 'All done', t: 31, pane: 'time', note: 'The lanes show where the time went. The takeaway leads with the time agents spent waiting on you.' },
];
/**
 * Each agent: its plan (the steps the detail shows) and its history, [minute, change] pairs folded in order.
 * @type {{ id: string; name: string; task: string; parent?: string; plan: string[]; history: [number, any][] }[]}
 */
const AGENTS = [
  { id: 'lead', name: 'Lead', task: 'Launch annual pricing: split the work, hand it out, check it fits together.', plan: ['Read the brief', 'Split into tasks', 'Hand out the tasks', 'Check the pieces fit'],
    history: [[0, { state: 'working', step: 1, activity: 'Reading the brief and the pricing code' }], [1, { step: 2, activity: 'Splitting the launch into 6 tasks' }],
      [3, { step: 3, activity: 'Handing out 6 tasks' }], [5, { step: 4, activity: 'Watching 6 agents; will check the pieces fit' }],
      [30, { activity: 'Checking the pieces fit together' }], [31, { state: 'done', activity: 'Annual pricing is ready to ship: 2 pull requests, docs and the changelog.' }]] },
  { id: 'pricing', name: 'Pricing page', parent: 'lead', task: 'Add an annual toggle to the pricing page, 2 months free.', plan: ['Read the pricing code', 'Write the toggle', 'Run the tests', 'Open a pull request'],
    history: [[3, { state: 'working', step: 1, activity: 'Reading plans.ts and Pricing.tsx', cost: 0.12 }], [6, { step: 2, activity: 'Writing the annual toggle in Pricing.tsx', cost: 0.41 }],
      [14, { step: 3, activity: 'Running the tests: 13 of 13 pass', cost: 0.63 }], [18, { step: 4, activity: 'Opening a pull request', cost: 0.71 }],
      [20, { state: 'needs-input', needs: 'review', step: 4, activity: 'Pull request #412 is ready: 2 files, checks pass.', pr: 412, cost: 0.74 }],
      [25, { state: 'done', activity: 'Merged #412: the toggle defaults to annual.', cost: 0.74 }]] },
  { id: 'api', name: 'Billing API', parent: 'lead', task: 'Add annual prices to the billing API and migrate the plans table.', plan: ['Add annual prices', 'Write the migration', 'Migrate staging', 'Open a pull request'],
    history: [[3, { state: 'working', step: 1, activity: 'Adding annual price IDs to the plans', cost: 0.09 }], [5, { step: 2, activity: 'Writing the plans-table migration', cost: 0.33 }],
      [7, { state: 'needs-input', needs: 'approval', step: 3, activity: 'Wants to run the migration on staging', cost: 0.38 }],
      [10, { state: 'working', step: 3, activity: 'Migrating staging: 4 of 4 plans', cost: 0.44 }], [15, { step: 4, activity: 'Opening a pull request', cost: 0.52 }],
      [19, { state: 'done', activity: 'Opened #413: annual prices and the migration. Checks pass.', pr: 413, cost: 0.55 }]] },
  { id: 'emails', name: 'Renewal emails', parent: 'lead', task: 'Write the email offering annual billing to monthly customers.', plan: ['Draft the email', 'Choose who gets it', 'Schedule it'],
    history: [[3, { state: 'working', step: 1, activity: 'Drafting the annual offer email', cost: 0.06 }],
      [8, { state: 'needs-input', needs: 'question', step: 2, activity: 'Send the offer to every monthly customer, or only to the active ones?', cost: 0.21 }],
      [13, { state: 'working', step: 3, activity: 'Scheduling for active monthly customers (1,240)', cost: 0.24 }],
      [25, { state: 'done', activity: 'Scheduled for Tuesday 9:00 to 1,240 active customers.', cost: 0.29 }]] },
  { id: 'docs', name: 'Docs', parent: 'lead', task: 'Update the pricing docs and the plan comparison table.', plan: ['Update the pricing page copy', 'Update the comparison table', 'Check the links'],
    history: [[3, { state: 'working', step: 1, activity: 'Rewriting the pricing copy', cost: 0.05 }],
      [10, { step: 2, activity: 'Updating the plan comparison', conflict: { file: 'src/content/pricing.ts', with: 'Pricing page' }, cost: 0.19 }],
      [13, { activity: 'Moved its copy into docs/pricing.md', conflict: null, cost: 0.22 }],
      [14, { step: 3, activity: 'Checking 38 links', cost: 0.25 }],
      [15, { state: 'stalled', since: 15, activity: 'Link check timed out on /enterprise; retrying', stalledReason: 'Retried the same step 3 times', cost: 0.31 }],
      [18, { state: 'working', activity: 'Skipping /enterprise as you asked; checking the rest', stalledReason: undefined, cost: 0.33 }],
      [24, { state: 'done', activity: 'Docs updated; 37 of 38 links checked (/enterprise skipped).', cost: 0.36 }]] },
  { id: 'qa', name: 'QA', parent: 'lead', task: 'Run the end-to-end checkout tests once the page and the API are in.', plan: ['Wait for the page and API', 'Run the checkout tests', 'Report'],
    history: [[3, { state: 'blocked', blockedBy: 'Pricing page and Billing API', step: 1 }],
      [19, { state: 'working', step: 2, activity: 'Running 14 checkout tests', blockedBy: undefined, cost: 0.04 }],
      [21, { state: 'failed', step: 2, activity: '2 of 14 checkout tests failed: annual total shows $290/yr, expected $290/year.', cost: 0.11 }],
      [23, { state: 'working', step: 2, activity: 'Running 14 checkout tests again', cost: 0.13 }],
      [29, { state: 'done', step: 3, activity: '14 of 14 checkout tests pass.', cost: 0.18 }]] },
  { id: 'changelog', name: 'Changelog', parent: 'lead', task: 'Write the changelog entry once everything else is in.', plan: ['Wait for the others', 'Write the entry'],
    history: [[3, { state: 'queued', step: 1 }], [27, { state: 'working', step: 2, activity: 'Writing the changelog entry', cost: 0.03 }], [30, { state: 'done', activity: 'Added "Annual billing, 2 months free" to the changelog.', cost: 0.05 }]] },
];

/** Every agent at minute `t`: its latest state and fields, when it entered that state, and its lanes so far. */
function fleetAt(t) {
  return AGENTS.filter((a) => a.history[0][0] <= t).map((a) => {
    /** @type {any} */
    const s = { ...a, state: 'queued', startedAt: undefined, endedAt: undefined, segments: [] };
    let laneFrom = 0, lane = /** @type {string | null} */ (null);
    for (const [m, change] of a.history) {
      if (m > t) break;
      const before = s.state;
      Object.assign(s, change);
      if (change.state && change.state !== before) {
        s.since = at(change.since ?? m);
        if (change.state === 'working' && s.startedAt === undefined) s.startedAt = at(m);
        if (change.state === 'done') s.endedAt = at(m);
      }
      const next = { working: 'working', stalled: 'working', 'needs-input': 'waiting', blocked: 'blocked', failed: 'failed' }[s.state] ?? null;
      if (next !== lane) {
        if (lane) s.segments.push({ from: at(laneFrom), to: at(m), state: lane });
        lane = next; laneFrom = m;
      }
    }
    if (lane) s.segments.push({ from: at(laneFrom), state: lane });
    return s;
  });
}
const money = (/** @type {number} */ n) => '$' + n.toFixed(2);

/** One agent opened beside the fleet: its task, its plan as a Trace, what it made, and a way to steer it. */
function Detail({ agent, onStop }) {
  const step = agent.step ?? 1;
  const status = (/** @type {number} */ i) => agent.state === 'done' || i + 1 < step ? 'done' : i + 1 > step || agent.state === 'queued' || agent.state === 'blocked' ? 'planned'
    : agent.state === 'failed' ? 'failed' : agent.state === 'needs-input' && agent.needs === 'approval' ? 'awaiting-approval' : 'running';
  return (
    <section className="ao-detail" aria-labelledby="ao-detail-title">
      <div className="ao-detail-head">
        <h3 id="ao-detail-title" tabIndex={-1}>{agent.name}</h3>
        {agent.state !== 'done' && agent.state !== 'stopped' && <A.Button size="sm" variant="ghost" onClick={onStop}>Stop {agent.name}</A.Button>}
      </div>
      <p className="ao-task">{agent.task}</p>
      <A.Trace aria-label={`${agent.name}'s plan`}>
        {agent.plan.map((title, i) => (
          <A.TraceStep key={title} title={title} status={/** @type {any} */ (status(i))} error={status(i) === 'failed' ? agent.activity : undefined} onRetry={status(i) === 'failed' ? () => {} : undefined} />
        ))}
      </A.Trace>
      <dl className="ao-facts">
        <dt>Now</dt><dd>{agent.activity ?? (agent.blockedBy ? `Waiting on ${agent.blockedBy}` : 'Not started')}</dd>
        {agent.pr && <><dt>Made</dt><dd><A.Link href={'#pr-' + agent.pr}>Pull request #{agent.pr}</A.Link></dd></>}
        <dt>Spent</dt><dd>{agent.cost ? money(agent.cost) : '—'}</dd>
      </dl>
      <A.PromptInput status="ready" onSubmit={() => {}} aria-label={`Message ${agent.name}`}>
        <A.PromptInputTextarea placeholder={`Steer ${agent.name}: say what to change, where, and why`} />
        <A.PromptInputToolbar><A.PromptInputSubmit /></A.PromptInputToolbar>
      </A.PromptInput>
    </section>
  );
}

const NARROW = '(max-width: 760px)';
const narrowQuery = typeof matchMedia === 'function' ? matchMedia(NARROW) : null;
const subscribeNarrow = (/** @type {() => void} */ change) => { narrowQuery?.addEventListener('change', change); return () => narrowQuery?.removeEventListener('change', change); };
/** True on a phone-width screen; false wherever there's no window to ask. */
function useNarrow() {
  return React.useSyncExternalStore(subscribeNarrow, () => narrowQuery?.matches ?? false, () => false);
}

/** The orchestration view at moment `k`. */
function Orchestration({ k }) {
  const t = MOMENTS[k].t, now = at(t);
  const fleet = fleetAt(t);
  const [picked, setPicked] = React.useState('pricing');
  // On a phone the three regions are panes, one at a time: each moment opens the pane where its change is, and opening
  // an agent shows it in place of the roster, with a way back.
  const narrow = useNarrow();
  const [pane, setPane] = React.useState(MOMENTS[k].pane);
  const [opened, setOpened] = React.useState(false);
  const [seen, setSeen] = React.useState(k);
  if (seen !== k) { setSeen(k); setPane(MOMENTS[k].pane); setOpened(false); }
  // Opening or leaving an agent on a phone replaces what was pressed, so focus goes where the person is now: to the
  // agent's name on the way in, and back to its row on the way out.
  const focusNext = React.useRef(/** @type {'detail' | 'row' | null} */ (null));
  const frame = React.useRef(/** @type {HTMLDivElement | null} */ (null));
  React.useEffect(() => {
    const to = focusNext.current; focusNext.current = null;
    if (to === 'detail') document.getElementById('ao-detail-title')?.focus();
    else if (to === 'row') /** @type {HTMLElement | null | undefined} */ (frame.current?.querySelector('.alt-agent-row[aria-current]'))?.focus();
  });
  const open = (/** @type {string} */ id) => { setPicked(id); if (narrow) { setOpened(true); setPane('agents'); focusNext.current = 'detail'; } };
  const back = () => { setOpened(false); focusNext.current = 'row'; };
  const agent = fleet.find((a) => a.id === picked) ?? fleet[0];
  const g = A.groupAgents(fleet.filter((a) => a.parent), (a) => a);
  const lead = fleet.find((a) => a.id === 'lead');
  const spent = fleet.reduce((sum, a) => sum + (a.cost ?? 0), 0);
  const row = (a) => (
    <A.AgentFleetItem key={a.id} name={a.name} state={a.state} needs={a.needs} activity={a.activity} since={a.since} startedAt={a.startedAt} endedAt={a.endedAt}
      step={a.step && !['done', 'queued', 'blocked'].includes(a.state) ? { current: a.step, total: a.plan.length } : undefined} blockedBy={a.blockedBy} conflict={a.conflict ?? undefined}
      stalledReason={a.stalledReason} cost={a.cost ? money(a.cost) : undefined} output={a.pr ? <A.Badge tone={a.state === 'done' ? 'positive' : 'caution'} variant="soft">#{a.pr}</A.Badge> : undefined}
      selected={a.id === agent?.id} onSelect={() => open(a.id)} />
  );
  const requests = g.needsYou.map((a) => (
    <A.AgentRequest key={a.id + a.since} agent={a.name} kind={a.state === 'failed' ? 'failed' : a.needs} since={a.since} onOpen={() => open(a.id)}
      title={a.state === 'failed' ? 'Checkout tests failed' : a.needs === 'approval' ? 'Run the plans-table migration on staging?' : a.needs === 'review' ? `Review pull request #${a.pr}` : a.activity}
      detail={a.state === 'failed' ? a.activity : a.needs === 'approval' ? 'Adds annual price columns to 4 plans on staging. Production isn\'t touched.' : a.needs === 'review' ? a.activity : undefined}
      actions={a.state === 'failed' ? <A.Button size="sm" variant="secondary">Retry</A.Button>
        : a.needs === 'approval' ? <><A.Button size="sm" variant="secondary">Run migration</A.Button><A.Button size="sm" variant="ghost">Don't run</A.Button></>
        : a.needs === 'question' ? <><A.Button size="sm" variant="secondary">Active only</A.Button><A.Button size="sm" variant="secondary">Everyone</A.Button></>
        : <A.Button size="sm" variant="secondary">Review changes</A.Button>} />
  ));
  const header = (
    <A.PageHeader actions={<A.Button size="sm" variant="secondary">Start an agent</A.Button>} overflow={[{ label: 'Stop every agent', tone: 'critical', onSelect: () => {} }]}>
      <A.PageHeaderTitle>Launch annual pricing</A.PageHeaderTitle>
      <A.PageHeaderDescription>{A.summarizeFleet(fleet.map((a) => a.state))}</A.PageHeaderDescription>
    </A.PageHeader>
  );
  const roster = (
    <A.AgentFleet now={now} aria-label="Agents on this launch">
      {lead && <A.AgentFleetGroup label="Lead agent" count={null}><A.AgentFleetItem name={lead.name} state={lead.state} activity={lead.activity} startedAt={lead.startedAt} endedAt={lead.endedAt}
        step={lead.state !== 'done' ? { current: lead.step, total: lead.plan.length } : undefined} selected={lead.id === agent?.id} onSelect={() => open('lead')} /></A.AgentFleetGroup>}
      <A.AgentFleetGroup label="Needs you">{g.needsYou.map(row)}</A.AgentFleetGroup>
      <A.AgentFleetGroup label="Working">{g.working.map(row)}</A.AgentFleetGroup>
      <A.AgentFleetGroup label="Done" collapsible defaultOpen={false}>{g.finished.map(row)}</A.AgentFleetGroup>
    </A.AgentFleet>
  );
  const meter = <A.Meter label="Spent on this launch" value={spent} max={5} high={4} format={money} />;
  const lanes = <A.AgentLanes now={now} start={T0} lanes={fleet.filter((a) => a.segments.length).map((a) => ({ id: a.id, name: a.name, segments: a.segments }))} selected={agent?.id} onSelect={open} />;
  if (narrow) return (
    <div className="ao" ref={frame}>
      {header}
      <A.Tabs variant="segmented" className="ao-panes" value={pane} onValueChange={setPane}>
        <A.TabsList aria-label="Show">
          <A.TabsTrigger value="needs">{g.needsYou.length ? `Needs you (${g.needsYou.length})` : 'Needs you'}</A.TabsTrigger>
          <A.TabsTrigger value="agents">Agents</A.TabsTrigger>
          <A.TabsTrigger value="time">Timeline</A.TabsTrigger>
        </A.TabsList>
        <A.TabsContent value="needs"><A.AgentRequests now={now} title="Waiting on you">{requests}</A.AgentRequests></A.TabsContent>
        <A.TabsContent value="agents">
          {opened && agent
            ? <div className="ao-opened"><A.Button size="sm" variant="ghost" className="ao-back" onClick={back}>← All agents</A.Button><Detail agent={agent} onStop={() => {}} /></div>
            : roster}
        </A.TabsContent>
        <A.TabsContent value="time"><div className="ao-time">{lanes}{meter}</div></A.TabsContent>
      </A.Tabs>
    </div>
  );
  return (
    <div className="ao">
      {header}
      <div className="ao-body">
        <div className="ao-side">{roster}{meter}</div>
        <div className="ao-main">
          <A.AgentRequests now={now}>{requests}</A.AgentRequests>
          <A.Separator />
          {agent && <Detail agent={agent} onStop={() => {}} />}
        </div>
      </div>
      {lanes}
    </div>
  );
}

const CSS = `.aoh{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;max-width:1100px}.aoh-frame{border:1px solid var(--line);border-radius:var(--radius-lg);padding:16px;background:var(--surface-ground)}
.ao{display:flex;flex-direction:column;gap:16px}.ao .alt-page-header{padding:0}
.ao-body{display:grid;grid-template-columns:minmax(260px,340px) 1fr;gap:20px;align-items:start}
.ao-side{display:flex;flex-direction:column;gap:16px;min-width:0}.ao-main{display:flex;flex-direction:column;gap:16px;min-width:0;padding-left:20px;border-left:1px solid var(--line)}
.ao-detail{display:flex;flex-direction:column;gap:14px}.ao-detail-head{display:flex;align-items:center;gap:8px;justify-content:space-between}
.ao-facts{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:0;font:400 14px/20px var(--font-sans)}.ao-facts dt{color:var(--ink-muted)}.ao-facts dd{margin:0}
.ao-detail-head h3{margin:0;font:600 16px/22px var(--font-sans)}.ao-task{margin:0;color:var(--ink-muted);font:400 14px/20px var(--font-sans)}
@media (max-width:760px){.ao-body{grid-template-columns:minmax(0,1fr)}.ao-main{padding-left:0;border-left:0;padding-top:16px;border-top:1px solid var(--line)}}
.ao-panes>.alt-tabs-list{align-self:stretch}.ao-panes .alt-tabs-trigger{flex:1 0 auto}
.ao-opened,.ao-time{display:flex;flex-direction:column;gap:16px}.ao-back{align-self:flex-start;margin-left:-8px}
.aoh-rail{display:flex;align-items:center;gap:8px 12px}.aoh-moments{position:relative;display:flex;flex-wrap:wrap;flex:1;min-width:0;gap:2px;margin:0;padding:2px;list-style:none;border-radius:var(--radius-md);background:var(--surface-well);box-shadow:var(--well)}
.aoh-rail>.alt-switch-row{flex:none}
.aoh-moment{height:28px;padding:0 10px;border:0;border-radius:var(--radius-sm);background:none;color:var(--ink-muted);font:500 12.5px/1 var(--font-sans);white-space:nowrap;cursor:pointer}
.aoh-moment[aria-current]{background:var(--surface-raised);box-shadow:var(--elev-1);color:var(--ink)}.aoh-moment:focus-visible{outline:2px solid var(--accent-ink);outline-offset:-2px}
@media (max-width:760px){
.aoh-rail{position:sticky;top:var(--demo-sticky-top,0px);z-index:3;margin:-6px 0;padding:6px 0;background:var(--surface-ground)}
.aoh-moments{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;overscroll-behavior-x:contain;scroll-padding:0 24px}.aoh-moments::-webkit-scrollbar{display:none}
.aoh-moment{height:32px}
.aoh-moments[data-more-end]{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 28px),transparent)}
.aoh-moments[data-more-start]{-webkit-mask-image:linear-gradient(to left,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(to left,#000 calc(100% - 28px),transparent)}
.aoh-moments[data-more-start][data-more-end]{-webkit-mask-image:linear-gradient(to right,transparent,#000 28px,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(to right,transparent,#000 28px,#000 calc(100% - 28px),transparent)}.aoh-frame{padding:12px}}`;
/** On a phone the rail scrolls sideways: keep the current moment in view (without scrolling the page) and fade the edge
 * that has more, as a narrow TabsList does. */
function useRail(k) {
  const rail = React.useRef(/** @type {HTMLOListElement | null} */ (null));
  const [edges, setEdges] = React.useState({ start: false, end: false });
  const scan = React.useCallback(() => {
    const l = rail.current;
    if (!l) return;
    const more = l.scrollWidth - l.clientWidth > 1, n = { start: more && l.scrollLeft > 1, end: more && l.scrollLeft < l.scrollWidth - l.clientWidth - 1 };
    setEdges((p) => (p.start === n.start && p.end === n.end ? p : n));
  }, []);
  React.useLayoutEffect(() => {
    const l = rail.current, el = /** @type {HTMLElement | null | undefined} */ (l?.children[k]);
    if (l && el && l.scrollWidth > l.clientWidth + 1) {
      const left = el.offsetLeft - 28, right = el.offsetLeft + el.offsetWidth + 28 - l.clientWidth;
      if (l.scrollLeft > left) l.scrollLeft = Math.max(0, left); else if (l.scrollLeft < right) l.scrollLeft = right;
    }
    scan();
  }, [k, scan]);
  React.useEffect(() => {
    const l = rail.current;
    if (!l) return;
    const ro = new ResizeObserver(scan); ro.observe(l);
    return () => ro.disconnect();
  }, [scan]);
  return { ref: rail, onScroll: scan, 'data-more-start': edges.start ? '' : undefined, 'data-more-end': edges.end ? '' : undefined };
}
/** The rail of moments above the view, and the note for the moment shown. */
function App({ start = 2 }) {
  const [k, setK] = React.useState(start);
  const [notes, setNotes] = React.useState(true);
  const [said, setSaid] = React.useState('');
  const rail = useRail(k);
  const root = React.useRef(/** @type {HTMLDivElement | null} */ (null));
  const go = (/** @type {number} */ i) => {
    setK(i); setSaid(`${MOMENTS[i].name}: ${MOMENTS[i].note}`);
    // With the rail stuck to the top of a phone, the moment's change can be scrolled away above it: bring it back.
    requestAnimationFrame(() => {
      const r = root.current, rail = r?.querySelector('.aoh-rail'), next = r?.querySelector('.aoh-note') ?? r?.querySelector('.aoh-frame');
      if (!rail || !next) return;
      const gap = next.getBoundingClientRect().top - rail.getBoundingClientRect().bottom;
      if (gap < 0) scrollBy({ top: gap - 12, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  };
  return (
    <div className="aoh" ref={root}>
      <style>{CSS}</style>
      <nav className="aoh-rail" aria-label="Moments in the launch">
        <ol className="aoh-moments" {...rail}>
          {MOMENTS.map((m, i) => (
            <li key={m.id}><button type="button" className="aoh-moment" aria-current={i === k ? 'step' : undefined} onClick={() => go(i)}>{m.name}</button></li>
          ))}
        </ol>
        <A.Switch checked={notes} onCheckedChange={setNotes} label="Notes" />
      </nav>
      {notes && <A.Alert className="aoh-note" role="note" title={MOMENTS[k].name}>{MOMENTS[k].note}</A.Alert>}
      <div className="aoh-frame"><Orchestration k={k} /></div>
      <span className="alt-sr" role="status">{said}</span>
    </div>
  );
}
// preview:end
export { MOMENTS, AGENTS, fleetAt, Orchestration, App };
export default App;
