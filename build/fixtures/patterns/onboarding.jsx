// Onboarding pattern (project/framework/patterns/onboarding.md): a setup checklist whose tasks are stamped done by the
// app when they actually happen (never by clicking the item), with progress as a Meter; empty regions open with their
// one action instead of a tour; a short tour only when someone asks for it; "What's new" with a count only for unseen
// items. Every surface can be dismissed and found again from Help.
// The lines between the preview markers are its "OnboardingPattern" preview (scripts/pattern-previews.mjs copies them);
// build/checks/pattern-types.mjs type-checks this file against the public declarations and fails if the two differ.
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
const TASKS = [
  { id: 'project', title: 'Create a project', about: 'Somewhere to keep your work.' },
  { id: 'invite', title: 'Invite your team', about: 'Work goes faster together.' },
  { id: 'connect', title: 'Connect a data source', about: 'Bring in what you already have.', action: 'Connect a data source' },
  { id: 'billing', title: 'Add billing details', about: 'Needed before your trial ends on 14 November.', action: 'Add billing details' },
];
function App() {
  const [done, setDone] = React.useState(/** @type {Record<string, boolean>} */ ({ project: true, invite: true }));
  const [guide, setGuide] = React.useState(true);
  const [sources, setSources] = React.useState(/** @type {string[]} */ ([]));
  const [tour, setTour] = React.useState(false);
  const [seen, setSeen] = React.useState(false);
  const count = TASKS.filter((t) => done[t.id]).length;
  const happen = (id) => setDone((d) => ({ ...d, [id]: true }));
  return (
    <main className="ob-page">
      <header className="ob-head"><h2 className="ob-h">Acme workspace</h2>
        <div className="ob-tools">
          <A.Popover aria-label="What’s new" align="end" onOpenChange={(o) => { if (o) setSeen(true); }}
            trigger={<A.Button size="sm" variant="ghost" id="ob-new">What’s new{!seen && <A.Badge variant="count" aria-label="2 unseen">2</A.Badge>}</A.Button>}>
            <div className="ob-news"><A.Timeline aria-label="Recent changes" groupBy="none" locale="en-IE">
              <A.TimelineItem key="n1" time="2026-10-28T09:00:00Z" isNew={!seen}>Saved views: keep a filter and come back to it</A.TimelineItem>
              <A.TimelineItem key="n2" time="2026-10-21T09:00:00Z" isNew={!seen}>The sidebar now groups projects by team</A.TimelineItem>
              <A.TimelineItem key="n3" time="2026-10-07T09:00:00Z">Export any table as CSV</A.TimelineItem>
            </A.Timeline></div>
          </A.Popover>
          <A.Button size="sm" variant="ghost" id="ob-help" onClick={() => setGuide(true)}>Help: setup guide</A.Button>
        </div>
      </header>
      {guide && <A.Card className="ob-guide" aria-labelledby="ob-guide-h">
        <div className="ob-row"><h3 id="ob-guide-h" className="ob-sub">Set up your workspace</h3>
          <A.Button size="sm" variant="ghost" onClick={() => setGuide(false)}>{count === TASKS.length ? 'Hide setup guide' : 'Skip for now'}</A.Button></div>
        <A.Meter label="Setup" value={count} max={TASKS.length} format={(v) => `${v}`} />
        <p className="ob-note">Tasks are checked off when you do them, wherever you do them.</p>
        <ol className="ob-tasks">{TASKS.map((t) => <li key={t.id} className="ob-task" data-done={done[t.id] ? '' : undefined}>
          <div><div className="ob-title">{t.title}</div><div className="ob-note">{t.about}</div></div>
          {done[t.id] ? <A.Badge tone="positive">Done</A.Badge> : t.action ? <A.Button size="sm" onClick={() => document.getElementById('ob-' + t.id)?.scrollIntoView({ block: 'center' })}>{t.action}</A.Button> : null}
        </li>)}</ol>
      </A.Card>}
      {!guide && <p className="ob-note" role="status">Setup guide hidden. Open it again any time from Help.</p>}
      <section className="ob-section" aria-labelledby="ob-sources-h" id="ob-connect">
        <h3 id="ob-sources-h" className="ob-sub">Data sources</h3>
        {sources.length ? <ul className="ob-list">{sources.map((s) => <li key={s}>{s}</li>)}</ul>
          : <A.EmptyState size="sm" title="No data sources yet" description="Connect a database or a spreadsheet and its tables appear here."
              action={<A.Button variant="primary" onClick={() => { setSources(['Sales database']); happen('connect'); }}>Connect a data source</A.Button>} />}
      </section>
      <section className="ob-section" aria-labelledby="ob-billing-h" id="ob-billing">
        <h3 id="ob-billing-h" className="ob-sub">Billing</h3>
        {done.billing ? <p className="ob-note">Card ending 4242 on file.</p> : <div><A.Button onClick={() => happen('billing')}>Add billing details</A.Button></div>}
      </section>
      <nav aria-label="Projects" className="ob-nav" id="ob-sidebar"><span className="ob-note">Design team</span><A.Link href="#/p/1">Website refresh</A.Link><A.Link href="#/p/2">Brand kit</A.Link></nav>
      <div><A.Button size="sm" variant="ghost" onClick={() => setTour(true)}>Show me what changed in the sidebar</A.Button></div>
      <A.Tour open={tour} onOpenChange={setTour} steps={[
        { target: '#ob-sidebar', title: 'Projects are grouped by team', body: 'Each team’s projects sit under its name. Drag a project to move it.' },
        { target: '#ob-new', title: 'Find changes here', body: 'What’s new lists every change, so you can come back to this later.' },
      ]} />
    </main>
  );
}
// preview:end
export default App;
