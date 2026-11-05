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

const STYLES = `.ah-views{display:grid;gap:12px;max-width:1100px}.ah-views>.alt-tabs{justify-self:start}
.ah-phone{width:min(100%,440px);height:640px;border:1px solid var(--line);border-radius:var(--radius-lg);overflow:hidden;display:flex;background:var(--surface-ground)}
.cs{display:flex;flex-direction:column;flex:1;min-width:0;padding:8px 12px 6px;gap:8px}
.cs-head{display:flex;align-items:center;gap:2px}.cs-title{flex:1;min-width:0;padding:0 6px}
.cs-title h2{margin:0;font:600 15px/20px var(--font-sans);color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-title p{margin:0;font:400 12px/16px var(--font-mono);color:var(--ink-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs .alt-convo{flex:1;min-height:0}
.cs-time{margin:2px 0 0;text-align:end;font:400 12px/16px var(--font-sans);color:var(--ink-muted)}
.cs-grow{flex:1}.cs-model{width:auto;min-width:0}
.cs-context{display:flex;align-items:center;gap:14px;padding:2px 4px 0;font:400 12.5px/17px var(--font-mono);color:var(--ink-muted)}
.cs-context>span{display:inline-flex;align-items:center;gap:6px}.cs-context>.alt-btn{margin-inline-start:-8px}
.cs-status{display:flex;gap:8px;margin:0;padding:0 4px;font:400 12px/16px var(--font-mono);color:var(--ink-muted)}
@media (max-width:480px){.cs-wide{display:none}}
.ah{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;max-width:1100px}.ah-frame{height:640px;border:1px solid var(--line);border-radius:var(--radius-lg);overflow:hidden}
.ah-frame .alt-shell-page{display:flex;flex-direction:column;overflow:hidden}.ah-frame .alt-inset{flex:1;min-height:0;display:flex;flex-direction:column}
.ah-main{display:flex;flex-direction:column;gap:12px;flex:1;padding:12px 0;min-height:0}.ah-main .alt-convo{flex:1;min-height:0;margin:0 -12px 0 0}
.ah-rail{display:flex;align-items:center;gap:8px 12px}.ah-moments{position:relative;display:flex;flex-wrap:wrap;flex:1;min-width:0;gap:2px;margin:0;padding:2px;list-style:none;border-radius:var(--radius-md);background:var(--surface-well);box-shadow:var(--well)}
.ah-rail>.alt-switch-row{flex:none}
.ah-moment{height:28px;padding:0 10px;border:0;border-radius:var(--radius-sm);background:none;color:var(--ink-muted);font:500 12.5px/1 var(--font-sans);white-space:nowrap;cursor:pointer}
.ah-moment[aria-current]{background:var(--surface-raised);box-shadow:var(--elev-1);color:var(--ink)}.ah-moment:focus-visible{outline:2px solid var(--accent-ink);outline-offset:-2px}
@media (max-width:760px){
.ah-rail{position:sticky;top:var(--demo-sticky-top,0px);z-index:3;margin:-6px 0;padding:6px 0;background:var(--surface-ground)}
.ah-moments{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;overscroll-behavior-x:contain;scroll-padding:0 24px}.ah-moments::-webkit-scrollbar{display:none}
.ah-moment{height:32px}
.ah-moments[data-more-end]{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 28px),transparent)}
.ah-moments[data-more-start]{-webkit-mask-image:linear-gradient(to left,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(to left,#000 calc(100% - 28px),transparent)}
.ah-moments[data-more-start][data-more-end]{-webkit-mask-image:linear-gradient(to right,transparent,#000 28px,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(to right,transparent,#000 28px,#000 calc(100% - 28px),transparent)}
.ah-frame{height:clamp(460px,calc(100svh - var(--demo-sticky-top,0px) - 200px),640px)}}`;
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
/** A coding session on a phone: one finished turn, folded the way a coding agent folds it, built only from the parts above. */
const TURN_EDIT = { before: 'export function indexOf() {\n  const entered = new Map()\n}', after: 'export function indexOf() {\n  const entered = new Map();\n  const turns = new Map();\n}' };
const TURN_WRITE = 'export function turnStepsOf() {\n  return [];\n}';
/** A new file is all additions: drop the empty line diffLines reads as removed from "nothing". */
const NEW_FILE = A.diffLines('', TURN_WRITE).filter((o) => o.kind !== 'del');
const ANSWER = 'Done — the fold counts steps now.\n\n```ts\nexport function turnStepsOf(turn) {\n  return turn.steps.filter((s) => s.kind !== \'reasoning\');\n}\n```\n\nThe fold now says what the turn did and counts its steps, and I saved what a turn fold is to memory: forget anything that\'s wrong.';
/** @type {import('altitude-design').PromptMention[]} */
const FILES = [{ id: 'f1', label: 'web/turns.ts', kind: 'file' }, { id: 'f2', label: 'web/turn-count.ts', kind: 'file' }];
const MODELS = [{ value: 'beam-low', label: 'Beam · low' }, { value: 'beam-high', label: 'Beam · high' }, { value: 'arc', label: 'Arc' }];
const at = (h, m) => new Date(2026, 10, 5, h, m).getTime();
const clock = (t) => new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(t);
const Glyph = ({ d }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const SEARCH = 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4', GRID = 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', FOLDER = 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', BRANCH = 'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9';

/** What "remember what a turn fold is" wrote: two new memories and one it corrected. */
const MEMORIES = [
  { id: 'm1', text: 'A turn fold groups one turn\'s tool steps under a single summary line.' },
  { id: 'm2', text: 'The fold counts steps, not tool calls.', change: 'updated', previous: 'The fold counts tool calls.' },
  { id: 'm3', text: 'A fold opens by itself when a step fails or waits for approval.' },
];

function CodingSession() {
  const [memories, setMemories] = React.useState(/** @type {import('altitude-design').TraceMemoryItem[]} */ (MEMORIES));
  const setForgotten = (/** @type {string} */ id, /** @type {boolean} */ forgotten) => setMemories((ms) => ms.map((m) => (m.id === id ? { ...m, forgotten } : m)));
  const main = React.useRef(/** @type {HTMLDivElement | null} */ (null));
  // Open where the screenshot is: the latest turn's fold in view, scrolled up from the end, so "Jump to latest" shows.
  React.useEffect(() => {
    const el = main.current?.querySelector('.alt-convo-scroll'), turn = main.current?.querySelector('.cs-turn');
    if (el && turn) el.scrollTop = /** @type {HTMLElement} */ (turn).offsetTop - 12;
  }, []);
  return (
    <div className="cs" ref={main}>
      <header className="cs-head">
        <A.Button variant="ghost" size="sm" square aria-label="Show sessions"><A.Icons.PanelLeft /></A.Button>
        <div className="cs-title">
          <h2>Is the demo build still running?</h2>
          <p>scratch/lab-demo on cachyos-x8664</p>
        </div>
        <A.Button variant="ghost" size="sm" square aria-label="Sessions" className="cs-wide"><Glyph d={GRID} /></A.Button>
        <A.Button variant="ghost" size="sm" square aria-label="Notifications"><A.Icons.Bell /></A.Button>
        <A.Button variant="ghost" size="sm" square aria-label="Search" className="cs-wide"><Glyph d={SEARCH} /></A.Button>
        <A.Button variant="ghost" size="sm" square aria-label="More"><A.Icons.More /></A.Button>
      </header>
      <A.Conversation aria-label="Is the demo build still running?">
        <A.ConversationContent>
          <A.Message from="user">
            <A.MessageContent>Is the demo build still running?</A.MessageContent>
            <A.MessageActions onCopy onEdit={() => {}} />
          </A.Message>
          <A.Message from="assistant">
            <A.MessageContent><A.Markdown>{'Yes: `lab-demo` has been building for 6 minutes and is on the last step.'}</A.Markdown></A.MessageContent>
            <A.MessageActions onCopy onRegenerate={() => {}} />
          </A.Message>
          <A.ConversationCheckpoint label="Before the fold change" at={at(8, 46)} locale="en" consequence="Files changed after this point go back to how they were. The later turns are kept as a branch." onRestore={() => {}} onReturn={() => {}} />
          <A.Message from="user" className="cs-turn">
            <A.MessageContent>Change the fold to count steps, and remember what a turn fold is.</A.MessageContent>
            <p className="cs-time"><time dateTime={new Date(at(8, 47)).toISOString()}>{clock(at(8, 47))}</time></p>
            <A.MessageActions onCopy onEdit={() => {}} />
          </A.Message>
          <A.Message from="assistant">
            {/* One fold for the turn (the screenshot nests the same fold twice). Its lid is worked out from the steps,
                and names the memory writes, which outlive the session. Open here because it's the turn just finished. */}
            <A.Trace aria-label="Change the fold to count steps" collapsible defaultOpen>
              <A.TraceStep tool="edit" title="web/turns.ts" detail="2 edits" changes={{ added: 2, removed: 1 }} status="done" duration={140} result="2 edits applied to web/turns.ts">
                <A.DiffView caption="web/turns.ts" before={TURN_EDIT.before} after={TURN_EDIT.after} />
              </A.TraceStep>
              <A.TraceStep tool="write" title="web/turn-count.ts" detail="new file · 3 lines" changes={{ added: 3, removed: 0 }} status="done" duration={90} result="Wrote web/turn-count.ts">
                <A.DiffView caption="web/turn-count.ts · new file" before="" after={TURN_WRITE} hunks={NEW_FILE} />
              </A.TraceStep>
              <A.TraceStep tool="memory" title={`${memories.length} memories`} status="done" duration={60}>
                <A.TraceMemory items={memories} onForget={(id) => setForgotten(id, true)} onRestore={(id) => setForgotten(id, false)} />
              </A.TraceStep>
              <A.TraceStep tool="dream" title="close the chapter" status="done" duration={1800}
                result="Chapter closed at an ending: the turn-fold work is the chapter, and it ended with the lab screenshots." />
            </A.Trace>
            <A.MessageContent><A.Markdown>{ANSWER}</A.Markdown></A.MessageContent>
            <A.MessageActions onCopy onRegenerate={() => {}} onFeedback={() => {}} />
          </A.Message>
        </A.ConversationContent>
        <A.ConversationScrollButton />
      </A.Conversation>
      <A.PromptInput onSubmit={() => {}} onAttach={() => {}} accept="image/*,text/*"
        mentionable={(q) => FILES.filter((f) => f.label.includes(q))}
        commands={[{ name: 'review', description: 'Review the changes' }, { name: 'compact', description: 'Summarise the session so far' }]}>
        <A.PromptInputTextarea placeholder="Message… @ files, / commands, $ skills, # prompts" aria-label="Message" />
        <A.PromptInputToolbar>
          <A.PromptInputAttach label="Add files" />
          <A.Select size="sm" aria-label="Model" items={MODELS} defaultValue="beam-low" className="cs-model" />
          <span className="cs-grow" />
          <A.PromptInputDictate />
          <A.PromptInputSubmit />
        </A.PromptInputToolbar>
        <div className="cs-context">
          <span><Glyph d={FOLDER} />lab-demo</span>
          <span><Glyph d={BRANCH} />ape/aaac99cb</span>
          <A.Button variant="ghost" size="sm" square aria-label="Session history"><A.Icons.Clock /></A.Button>
        </div>
      </A.PromptInput>
      <p className="cs-status"><span>project</span><span aria-label="0 tokens per second">↓0 tok/s</span></p>
    </div>
  );
}

/** The rail of moments above the harness, and the note for the moment shown. */
function Run({ start = 3 }) {
  const [k, setK] = React.useState(start);
  const [notes, setNotes] = React.useState(true);
  const [said, setSaid] = React.useState('');
  const rail = useRail(k);
  const root = React.useRef(/** @type {HTMLDivElement | null} */ (null));
  const go = (/** @type {number} */ i) => {
    setK(i); setSaid(`${MOMENTS[i].name}: ${MOMENTS[i].note}`);
    // With the rail stuck to the top of a phone, the moment's change can be scrolled away above it: bring it back.
    requestAnimationFrame(() => {
      const r = root.current, rail = r?.querySelector('.ah-rail'), next = r?.querySelector('.ah-note') ?? r?.querySelector('.ah-frame');
      if (!rail || !next) return;
      const gap = next.getBoundingClientRect().top - rail.getBoundingClientRect().bottom;
      if (gap < 0) scrollBy({ top: gap - 12, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  };
  return (
    <div className="ah" ref={root}>
      <style>{STYLES}</style>
      <nav className="ah-rail" aria-label="Moments in the run">
        <ol className="ah-moments" {...rail}>
          {MOMENTS.map((m, i) => (
            <li key={m.id}><button type="button" className="ah-moment" aria-current={i === k ? 'step' : undefined} onClick={() => go(i)}>{m.name}</button></li>
          ))}
        </ol>
        <A.Switch checked={notes} onCheckedChange={setNotes} label="Notes" />
      </nav>
      {notes && <A.Alert className="ah-note" role="note" title={MOMENTS[k].name}>{MOMENTS[k].note}</A.Alert>}
      <div className="ah-frame"><Harness k={k} /></div>
      <span className="alt-sr" role="status">{said}</span>
    </div>
  );
}
/** Two views: every state of a scripted run, and one finished turn of a coding session on a phone. */
function App({ start = 3 }) {
  const [view, setView] = React.useState('run');
  return (
    <div className="ah-views">
      <A.Tabs variant="segmented" value={view} onValueChange={setView}>
        <A.TabsList aria-label="Harness view">
          <A.TabsTrigger value="run">Every state</A.TabsTrigger>
          <A.TabsTrigger value="session">Coding session</A.TabsTrigger>
        </A.TabsList>
      </A.Tabs>
      {view === 'run' ? <Run start={start} /> : <div className="ah-phone"><style>{STYLES}</style><CodingSession /></div>}
    </div>
  );
}
// preview:end
export { MOMENTS, EVENTS, stateAt, Harness, CodingSession, Run, App };
export default App;
