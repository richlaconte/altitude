// Screen layout pattern (project/framework/patterns/screen-layout.md), the decision frame.
//   Task: a billing lead decides whether to refund a customer's October invoice.
//   Lead: the choice and its consequence. Primary action: Approve refund. Next: the next request in the queue.
// The question is the title; the consequence in words and the two choices sit straight under it, before the evidence.
// Declining asks for its reason in place; Cancel returns focus to Decline. Once decided, the outcome replaces the choice
// and takes focus. The lines between the preview markers are its "ScreenLayoutDecision" preview
// (scripts/pattern-previews.mjs copies them); build/checks/pattern-types.mjs type-checks this file against the public
// declarations and fails if the two differ.
// preview-name: ScreenLayoutDecision
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
function App() {
  const [phase, setPhase] = React.useState(/** @type {'deciding' | 'declining' | 'sending' | 'approved' | 'declined'} */ ('deciding'));
  const [reason, setReason] = React.useState('');
  const [reasonError, setReasonError] = React.useState('');
  const declineRef = React.useRef(/** @type {HTMLButtonElement | null} */ (null));
  const outcome = React.useRef(/** @type {HTMLDivElement | null} */ (null));
  const [sending, setSending] = React.useState(/** @type {'approved' | 'declined' | null} */ (null));
  const decide = (result) => {
    if (result === 'declined' && !reason.trim()) { setReasonError('Say why, so Support can tell Northwind.'); document.getElementById('ld-reason')?.focus(); return; }
    setSending(result); setPhase('sending');
    window.setTimeout(() => { setPhase(result); requestAnimationFrame(() => outcome.current?.focus()); }, 600);
  };
  const cancel = () => { setPhase('deciding'); setReasonError(''); requestAnimationFrame(() => declineRef.current?.focus()); };
  const done = phase === 'approved' || phase === 'declined';
  return (
    <main className="ld-page">
      <A.PageHeader breadcrumb={<A.Breadcrumb items={[{ label: 'Refund requests', href: '#/refunds' }, { label: 'R-1042' }]} />}>
        <A.PageHeaderTitle>Refund €420 to Northwind?</A.PageHeaderTitle>
        <A.PageHeaderDescription>Asked by Jon Park in Support, today at 09:12.</A.PageHeaderDescription>
      </A.PageHeader>
      {done ? (
        <div className="ld-choice" role="status" tabIndex={-1} ref={outcome}>
          <p className="ld-consequence">{phase === 'approved' ? 'Refund approved. €420 goes back to the card ending 4242 in 5–10 days, and the October invoice is marked refunded.' : 'Refund declined. Jon has your reason to send to Northwind.'}</p>
          <div><A.Link href="#/refunds/R-1043">Next request: Halcyon, €96 (2 more waiting)</A.Link></div>
        </div>
      ) : (
        <section className="ld-choice" aria-labelledby="ld-choice-h">
          <h2 id="ld-choice-h" className="ld-sr">Your decision</h2>
          <p className="ld-consequence">Approving sends €420 back to Northwind’s card ending 4242 in 5–10 days and marks their October invoice refunded. A refund can’t be taken back once it’s sent.</p>
          {phase === 'declining' || (phase === 'sending' && sending === 'declined') ? <>
            <A.Field label="Why decline?" hint="Jon sends this to Northwind." error={reasonError || undefined}>
              <A.Textarea id="ld-reason" rows={3} value={reason} onChange={(e) => { setReason(e.target.value); setReasonError(''); }}
                onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }} />
            </A.Field>
            <div className="ld-actions">
              <A.Button variant="primary" loading={phase === 'sending'} onClick={() => decide('declined')}>Send decline</A.Button>
              <A.Button variant="ghost" onClick={cancel} disabled={phase === 'sending'}>Cancel</A.Button>
            </div>
          </> : (
            <div className="ld-actions">
              <A.Button variant="primary" loading={phase === 'sending'} onClick={() => decide('approved')}>Approve refund</A.Button>
              <A.Button ref={declineRef} onClick={() => { setPhase('declining'); requestAnimationFrame(() => document.getElementById('ld-reason')?.focus()); }} disabled={phase === 'sending'}>Decline</A.Button>
            </div>
          )}
        </section>
      )}
      <section className="ld-evidence" aria-labelledby="ld-why-h">
        <h2 id="ld-why-h" className="ld-sub">Why they’re asking</h2>
        <blockquote className="ld-quote">“We moved to annual billing on 2 October, but the monthly invoice still went out. We were charged twice for October.”</blockquote>
        <A.PropertyList layout="inline" aria-label="The invoice">
          <A.PropertyListItem label="Invoice" value="INV-2026-1017, 1 October" />
          <A.PropertyListItem label="Amount" value="€420.00" />
          <A.PropertyListItem label="Annual plan" value="Started 2 October, paid €4,536" />
          <A.PropertyListItem label="Customer since" value="March 2023" />
          <A.PropertyListItem label="Refunds before" value="None" />
        </A.PropertyList>
      </section>
    </main>
  );
}
// preview:end
export default App;
