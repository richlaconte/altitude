// Agent harness (#286): one scripted, deterministic agent run ("Add annual pricing to the pricing page") played through
// a complete harness: ThreadList, Conversation with Markdown, attachments and Suggestions, a Trace with reasoning, tool
// calls, a Terminal and parallel subagents, a Confirmation, a Question, a queued follow-up, a DiffView to review, and a
// checkpoint to rewind to. The run is a list of events in the shape an AI SDK stream produces; seeking to a moment folds
// the events up to it, so every state can be reached directly. The site's agent page, the "AgentHarness" story and its
// render in CI all use this file.
// The lines between the preview markers are the "AgentHarness" preview (scripts/pattern-previews.mjs copies them);
// build/checks/pattern-types.mjs type-checks this file against the public declarations.
// preview-name: AgentHarness
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
/** The moments the rail can jump to, each with the Elevation rule behind what you see. */
const MOMENTS = [
  { id: 'asked', name: 'Asked', note: 'The person\'s message is in the log at once, with what they attached; the composer\'s Send is the view\'s one primary.' },
  { id: 'thinking', name: 'Thinking', note: 'Reasoning still arriving isn\'t the record: "Thinking…" on the lid and a dashed rule, no shimmer.' },
  { id: 'searching', name: 'Searching', note: 'Subagents run in parallel: several steps raised at once, each because it\'s in play; the count is in words.' },
  { id: 'writing', name: 'Writing', note: 'A streaming answer rests on the ground on a dashed rule. It isn\'t pending: nothing you sent is in flight.' },
  { id: 'approval', name: 'Approval needed', note: 'A proposal is raised, not pending: nothing has been dispatched until it\'s approved.' },
  { id: 'question', name: 'Question', note: 'Asking for an answer reads like a proposal: raised, no default, nothing focused for you.' },
  { id: 'failed', name: 'Test failed', note: 'A failed step sinks into a trench with Retry; the command\'s exit is said in words.' },
  { id: 'retried', name: 'Retried', note: 'Retrying runs the step again; when it passes, the step lands and the exit is "Exited with 0".' },
  { id: 'queued', name: 'Queued follow-up', note: 'A message written while the agent works is queued: written, not dispatched, so it doesn\'t hover.' },
  { id: 'review', name: 'Reviewing changes', note: 'A change awaiting a decision is a proposal, raised around its lines; decided, it\'s the record again.' },
  { id: 'rewound', name: 'Rewound', note: 'Restoring a checkpoint sets later turns aside, with a way back; nothing is deleted.' },
  { id: 'done', name: 'Done', note: 'The answer settles once, solid, and offers follow-ups that cross-fade in rather than rise.' },
];
/** The run, as AI-SDK-shaped events; `at` is the moment each belongs to. @type {any[]} */
const EVENTS = [
  { at: 0, type: 'user', text: 'Add annual pricing to the pricing page, 2 months free.', files: [{ name: 'pricing-mockup.png', type: 'image/svg+xml' }] },
  { at: 1, type: 'reasoning-delta', text: 'The pricing page lists monthly plans only. I need the plan data, the page component and its tests. ' },
  { at: 1, type: 'reasoning-delta', text: 'Annual is 10× monthly (two months free).' },
  { at: 2, type: 'reasoning-end', ms: 4200 },
  { at: 2, type: 'tool-call', id: 'search', name: 'search_code', input: { query: 'monthly price' } },
  { at: 2, type: 'subagent', id: 'plans', title: 'Read plans.ts', status: 'done' },
  { at: 2, type: 'subagent', id: 'page', title: 'Read Pricing.tsx', status: 'running' },
  { at: 2, type: 'subagent', id: 'tests', title: 'Read pricing.test.ts', status: 'running' },
  { at: 3, type: 'subagent', id: 'page', status: 'done' },
  { at: 3, type: 'subagent', id: 'tests', status: 'done' },
  { at: 3, type: 'tool-result', id: 'search', output: { files: 3 } },
  { at: 3, type: 'text-delta', text: '## Annual pricing\n\nI\'ll add an **annual** toggle to the pricing page. Each plan bills ' },
  { at: 4, type: 'text-delta', text: '10× its monthly price, two months free:\n\n| Plan | Monthly | Annual |\n| --- | ---: | ---: |\n| Starter | $9 | $90 |\n| Pro | $29 | $290 |\n\n' },
  { at: 4, type: 'approval', id: 'write', title: 'Write 2 files', consequence: 'src/plans.ts and src/Pricing.tsx will be changed in your working tree.' },
  { at: 5, type: 'approval-result', id: 'write', state: 'done' },
  { at: 5, type: 'question', id: 'default', title: 'Which billing period should the page show first?' },
  { at: 6, type: 'question-answer', id: 'default', values: ['annual'] },
  { at: 6, type: 'command', id: 'test', command: 'npm test', output: '> vitest run\n\n ✓ src/plans.test.ts (8 tests)\n ✗ src/pricing.test.ts > shows the annual price\n', stderr: '   expected "$290/yr" to be "$290/year"\n', status: 'exited', exitCode: 1, ms: 3800 },
  { at: 7, type: 'command', id: 'test', output: '> vitest run\n\n ✓ src/plans.test.ts (8 tests)\n ✓ src/pricing.test.ts (5 tests)\n', stderr: '', status: 'exited', exitCode: 0, ms: 3600 },
  { at: 8, type: 'queued', text: 'Also update the changelog' },
  { at: 9, type: 'review', before: 'export const plans = {\n  starter: { monthly: 9 },\n  pro: { monthly: 29 },\n};', after: 'export const plans = {\n  starter: { monthly: 9, annual: 90 },\n  pro: { monthly: 29, annual: 290 },\n};' },
  { at: 10, type: 'rewind', label: 'Before the changelog' },
  { at: 11, type: 'text-delta', text: 'Done: the toggle defaults to **annual**, both tests pass, and the changelog says so.' },
  { at: 11, type: 'finish' },
];

/** Folds the run up to moment `k`: the props every part of the harness needs. Seeking is just a different `k`. */
function stateAt(k) {
  /** @type {any} */
  const s = { user: null, reasoning: '', reasoningMs: undefined, reasoningDone: false, tool: null, subagents: {}, text: '', approval: null, question: null, command: null, queued: [], review: null, rewound: null, finished: false };
  for (const e of EVENTS) {
    if (e.at > k) break;
    switch (e.type) {
      case 'user': s.user = e; break;
      case 'reasoning-delta': s.reasoning += e.text; break;
      case 'reasoning-end': s.reasoningDone = true; s.reasoningMs = e.ms; break;
      case 'tool-call': s.tool = { ...e, output: undefined }; break;
      case 'tool-result': s.tool = { ...s.tool, output: e.output }; break;
      case 'subagent': s.subagents[e.id] = { ...s.subagents[e.id], ...e }; break;
      case 'text-delta': s.text += e.text; break;
      case 'approval': s.approval = { ...e, state: 'requested' }; break;
      case 'approval-result': s.approval = { ...s.approval, state: e.state }; break;
      case 'question': s.question = { ...e, state: 'asking' }; break;
      case 'question-answer': s.question = { ...s.question, state: 'answered', answer: { values: e.values } }; break;
      case 'command': s.command = { ...s.command, ...e }; break;
      case 'queued': s.queued = [{ id: 'q1', text: e.text }]; break;
      case 'review': s.review = e; s.queued = []; break;
      case 'rewind': s.rewound = e; break;
      case 'finish': s.finished = true; break;
    }
  }
  return s;
}

const THREADS = [
  { id: 't1', title: 'Annual pricing for the pricing page', status: 'working' },
  { id: 't2', title: 'Rotate the staging API keys', status: 'needs-input' },
  { id: 't3', title: 'Summarise last week\'s incidents', status: 'idle', unread: true },
];
const MOCKUP = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='64'%3E%3Crect width='96' height='64' fill='%23e8edf5'/%3E%3Crect x='10' y='14' width='22' height='36' rx='3' fill='%23c9d3e6'/%3E%3Crect x='37' y='10' width='22' height='44' rx='3' fill='%233b6fd8'/%3E%3Crect x='64' y='14' width='22' height='36' rx='3' fill='%23c9d3e6'/%3E%3C/svg%3E";

/** The harness at moment `k`. */
function Harness({ k }) {
  const s = stateAt(k);
  // Seeking shows the newest part of the run, as a live conversation would have followed it.
  const main = React.useRef(/** @type {HTMLDivElement | null} */ (null));
  React.useEffect(() => { const el = main.current?.querySelector('.alt-convo-scroll'); if (el) el.scrollTop = el.scrollHeight; }, [k]);
  const working = !s.finished;
  const sub = (id) => s.subagents[id]?.status ?? 'planned';
  const testStatus = !s.command ? 'planned' : s.command.exitCode === 0 ? 'done' : 'failed';
  return (
    <A.AppShell sidebar={
      <A.Sidebar aria-label="Conversations">
        <A.SidebarHeader><A.ThreadListNew /></A.SidebarHeader>
        <A.SidebarContent>
          <A.ThreadList>
            <A.ThreadListGroup label="Today">
              {THREADS.map((t, i) => <A.ThreadListItem key={t.id} href={'#' + t.id} title={t.title} updatedAt={Date.now() - (i + 1) * 4 * 60000}
                status={/** @type {any} */ (i === 0 && s.finished ? 'idle' : t.status)} unread={t.unread} current={i === 0} onSelect={(e) => e.preventDefault()} />)}
            </A.ThreadListGroup>
          </A.ThreadList>
        </A.SidebarContent>
      </A.Sidebar>
    }>
      <div className="ah-main" ref={main}>
        <A.Conversation aria-label="Annual pricing for the pricing page">
          <A.ConversationContent>
            {s.user && (
              <A.Message from="user">
                <A.MessageAttachments items={[{ name: 'pricing-mockup.png', type: 'image/svg+xml', url: MOCKUP }]} />
                <A.MessageContent>{s.user.text}</A.MessageContent>
              </A.Message>
            )}
            {s.rewound && <A.ConversationCheckpoint label={s.rewound.label} at={Date.now() - 2 * 60000} consequence="The messages after this will be set aside. You can return to them." onRestore={() => {}} onReturn={() => {}} />}
            {k >= 1 && (
              <A.Message from="assistant" status={s.finished ? 'complete' : 'streaming'}>
                <A.Trace aria-label="Agent run">
                  <A.TraceStep title="Think it through" status={s.reasoningDone ? 'done' : 'running'} duration={s.reasoningMs}>
                    <A.TraceReasoning status={s.reasoningDone ? 'complete' : 'streaming'} duration={s.reasoningMs}>{s.reasoning}</A.TraceReasoning>
                  </A.TraceStep>
                  <A.TraceStep title="Read the pricing code" status={k < 2 ? 'planned' : 'auto'}>
                    {s.tool && <A.TraceToolCall name={s.tool.name} input={s.tool.input} output={s.tool.output} />}
                    <A.TraceParallel label="Subagents">
                      <A.TraceStep title="Read plans.ts" status={/** @type {any} */ (sub('plans'))} />
                      <A.TraceStep title="Read Pricing.tsx" status={/** @type {any} */ (sub('page'))} />
                      <A.TraceStep title="Read pricing.test.ts" status={/** @type {any} */ (sub('tests'))} />
                    </A.TraceParallel>
                  </A.TraceStep>
                  <A.TraceStep title="Write the changes" status={!s.approval ? 'planned' : s.approval.state === 'done' ? 'done' : 'awaiting-approval'}>
                    {s.approval && <A.Confirmation state={s.approval.state} title={s.approval.title} consequence={s.approval.consequence} approveLabel="Write 2 files" rejectLabel="Don't write"
                      doneLabel="Written" resolvedBy="you" scopes={[{ value: 'session', label: 'Allow writes for this session' }]} onApprove={() => {}} onReject={() => {}} />}
                  </A.TraceStep>
                  <A.TraceStep title="Run the tests" status={/** @type {any} */ (testStatus)}
                    error={testStatus === 'failed' ? 'One test expects "/year".' : undefined} onRetry={testStatus === 'failed' ? () => {} : undefined}>
                    {s.command && <A.Terminal command={s.command.command} output={[{ text: s.command.output }, ...(s.command.stderr ? [{ text: s.command.stderr, stream: /** @type {'stderr'} */ ('stderr') }] : [])]}
                      status="exited" exitCode={s.command.exitCode} duration={s.command.ms} />}
                  </A.TraceStep>
                </A.Trace>
                {s.question && (
                  <A.Question title={s.question.title} state={s.question.state} answer={s.question.answer} answerLabel="Use this">
                    <A.QuestionOption value="annual" label="Annual" description="Shows the saving first." />
                    <A.QuestionOption value="monthly" label="Monthly" description="Keeps today's default." />
                  </A.Question>
                )}
                {s.text && <A.MessageContent><A.Markdown streaming={!s.finished}>{s.text}</A.Markdown></A.MessageContent>}
                {s.review && <A.DiffView caption="src/plans.ts · proposed" before={s.review.before} after={s.review.after} review decisions={k >= 10 ? { 'change-1': 'accept' } : {}} onDecide={() => {}} onDecideAll={() => {}} />}
                {s.finished && (
                  <A.Suggestions aria-label="Suggested follow-ups" mode="send" onChoose={() => {}}>
                    <A.Suggestion>Add a yearly badge</A.Suggestion>
                    <A.Suggestion>Open a pull request</A.Suggestion>
                  </A.Suggestions>
                )}
              </A.Message>
            )}
          </A.ConversationContent>
        </A.Conversation>
        <A.ConversationQueue items={s.queued} onSendNow={() => {}} onEdit={() => {}} onRemove={() => {}} />
        <A.PromptInput status={working && k >= 1 ? 'streaming' : 'ready'} onSubmit={() => {}} onStop={() => {}} onQueue={() => {}}>
          <A.PromptInputTextarea placeholder="Ask the agent" />
          <A.PromptInputToolbar><A.PromptInputSubmit /></A.PromptInputToolbar>
        </A.PromptInput>
      </div>
    </A.AppShell>
  );
}

const CSS = `.ah{display:grid;gap:12px;max-width:1100px}.ah-frame{height:640px;border:1px solid var(--line);border-radius:var(--radius-lg);overflow:hidden}
.ah-frame .alt-shell-page{display:flex;flex-direction:column;overflow:hidden}.ah-frame .alt-inset{flex:1;min-height:0;display:flex;flex-direction:column}
.ah-main{display:flex;flex-direction:column;gap:12px;flex:1;padding:12px 0;min-height:0}.ah-main .alt-convo{flex:1;min-height:0;margin:0 -12px 0 0}
.ah-rail{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.ah-moments{display:flex;flex-wrap:wrap;gap:2px;margin:0;padding:2px;list-style:none;border-radius:var(--radius-md);background:var(--surface-well);box-shadow:var(--well)}
.ah-moment{height:28px;padding:0 10px;border:0;border-radius:var(--radius-sm);background:none;color:var(--ink-muted);font:500 12.5px/1 var(--font-sans);cursor:pointer}
.ah-moment[aria-current]{background:var(--surface-raised);box-shadow:var(--elev-1);color:var(--ink)}.ah-moment:focus-visible{outline:2px solid var(--accent-ink);outline-offset:1px}`;
/** The rail of moments, Play / Pause, and the note for the moment shown. */
function App({ start = 3 }) {
  const [k, setK] = React.useState(start);
  const [playing, setPlaying] = React.useState(false);
  const [notes, setNotes] = React.useState(true);
  const [said, setSaid] = React.useState('');
  React.useEffect(() => {
    if (!playing) return;
    if (k >= MOMENTS.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setK(k + 1), 2400);
    return () => clearTimeout(t);
  }, [playing, k]);
  const go = (/** @type {number} */ i) => { setK(i); setSaid(`${MOMENTS[i].name}: ${MOMENTS[i].note}`); };
  return (
    <div className="ah">
      <style>{CSS}</style>
      <div className="ah-frame"><Harness k={k} /></div>
      <nav className="ah-rail" aria-label="Moments in the run">
        <A.Button size="sm" variant="secondary" onClick={() => { if (k >= MOMENTS.length - 1) setK(0); setPlaying(!playing); }}>{playing ? 'Pause' : 'Play'}</A.Button>
        <ol className="ah-moments">
          {MOMENTS.map((m, i) => (
            <li key={m.id}><button type="button" className="ah-moment" aria-current={i === k ? 'step' : undefined} onClick={() => { setPlaying(false); go(i); }}>{m.name}</button></li>
          ))}
        </ol>
        <A.Switch checked={notes} onCheckedChange={setNotes} label="Notes" />
      </nav>
      {notes && <A.Alert className="ah-note" role="note" title={MOMENTS[k].name}>{MOMENTS[k].note}</A.Alert>}
      <span className="alt-sr" role="status">{said}</span>
    </div>
  );
}
// preview:end
export { MOMENTS, EVENTS, stateAt, Harness, App };
export default App;
