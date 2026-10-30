// Agent action pattern (project/framework/patterns/agent-action.md): a person asks, the agent shows its steps, and each
// step's state maps to one reading: planned is an imprint, running is raised, awaiting approval is Proposed (raised, not
// pending), approved and executing hovers as pending, done lands, failed sinks with Retry, rejected lies flush. A
// reversible step runs without asking and offers Undo; sending email asks; deleting for good asks in a stationary
// dialog. Everything the agent changed carries provenance.
// The lines between the preview markers are its "AgentActionPattern" preview (scripts/pattern-previews.mjs copies them);
// build/checks/pattern-types.mjs type-checks this file against the public declarations and fails if the two differ.
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function App() {
  const [failNext, setFailNext] = React.useState(false);
  const fail = React.useRef(false); fail.current = failNext;
  const [search, setSearch] = React.useState(/** @type {'running' | 'done' | 'failed'} */ ('running'));
  const [archive, setArchive] = React.useState(/** @type {'planned' | 'running' | 'done'} */ ('planned'));
  const [undone, setUndone] = React.useState(false);
  const [email, setEmail] = React.useState(/** @type {A.ConfirmationState} */ ('requested'));
  const [purge, setPurge] = React.useState(/** @type {A.ConfirmationState} */ ('requested'));
  const runSearch = async () => { setSearch('running'); await wait(900); if (fail.current) { setFailNext(false); setSearch('failed'); return; } setSearch('done'); setArchive('running'); await wait(800); setArchive('done'); };
  const restart = () => { setArchive('planned'); setUndone(false); setEmail('requested'); setPurge('requested'); void runSearch(); };
  React.useEffect(() => { void runSearch(); }, []);
  const resolve = async (set, ok) => { set('running'); await wait(900); set(ok ? 'done' : 'failed'); };
  const stepFor = (c) => (c === 'requested' ? 'awaiting-approval' : c === 'running' || c === 'approved' ? 'running' : c === 'failed' ? 'failed' : 'done');
  const ready = archive === 'done';
  return (
    <main className="ag-page">
      <div className="ag-ask"><span className="ag-who">You asked</span><p>Clean up leads nobody has touched since July, and tell their owners.</p></div>
      <div className="ag-demo"><A.Switch label="Make the next step fail" checked={failNext} onCheckedChange={setFailNext} /><A.Button size="sm" onClick={restart}>Run again</A.Button></div>
      <A.Trace aria-label="Assistant run: clean up stale leads">
        <A.TraceStep title="Find leads untouched since July" status={search} duration={search === 'done' ? 900 : undefined}
          error={search === 'failed' ? 'The CRM didn’t answer in time. Nothing was changed.' : undefined} onRetry={search === 'failed' ? runSearch : undefined}>
          <A.TraceToolCall name="search_leads" input={{ untouchedSince: '2026-07-01', limit: 50 }} output={search === 'done' ? { found: 4 } : undefined} />
        </A.TraceStep>
        <A.TraceStep title="Archive 4 stale leads" status={archive}>
          {archive === 'done' && <div className="ag-receipt"><span role="status">{undone ? 'Archive undone. The 4 leads are back.' : '4 leads archived. You can undo this for 30 days.'}</span>
            {!undone && <A.Button size="sm" variant="ghost" onClick={() => setUndone(true)}>Undo archive</A.Button>}</div>}
        </A.TraceStep>
        <A.TraceStep title={email === 'rejected' ? 'Didn’t email the lead owners' : 'Email 3 lead owners'} status={ready ? stepFor(email) : 'planned'}>
          {ready && <A.Confirmation state={email} title="Email 3 lead owners" requestedBy="The assistant" resolvedBy="Maya Chen"
            consequence="Theo Marsh, Ines Duarte and Sam Okafor will get an email listing the leads that were archived."
            approveLabel="Send 3 emails" rejectLabel="Don’t send" runningLabel="Sending…" doneLabel="3 emails sent" failedLabel="The emails weren’t sent."
            onApprove={() => resolve(setEmail, !fail.current)} onReject={() => setEmail('rejected')} onRetry={() => resolve(setEmail, true)} />}
        </A.TraceStep>
        <A.TraceStep title="Delete the “Summer import” list for good" status={ready && email !== 'requested' ? stepFor(purge) : 'planned'}>
          {ready && email !== 'requested' && <A.Confirmation state={purge} escalate="dialog" title="Delete the “Summer import” list" resolvedBy="Maya Chen"
            consequence="The list and its 212 rows are deleted permanently. Leads in it stay; only the list goes."
            approveLabel="Delete list" rejectLabel="Keep the list" runningLabel="Deleting…" doneLabel="List deleted"
            onApprove={() => resolve(setPurge, true)} onReject={() => setPurge('rejected')} />}
        </A.TraceStep>
      </A.Trace>
      {email === 'done' && <section className="ag-record" aria-labelledby="ag-rec-h"><h3 id="ag-rec-h" className="ag-sub">Northwind Traders</h3>
        <p className="ag-line">Status: Archived <A.AILabel subject="Change" model="Opus 5.5" reviewedBy="Maya Chen" generatedAt="2026-10-30T09:00:00Z" /></p>
        <p className="ag-muted">Archived by the assistant, approved by Maya Chen.</p>
      </section>}
    </main>
  );
}
// preview:end
export default App;
