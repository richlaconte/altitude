// Screen layout pattern (project/framework/patterns/screen-layout.md), the focused editor frame.
//   Task: a product manager writes this week's release note and publishes it.
//   Lead: the note being written. Primary action: Publish. Next: the published note's place on the changelog.
// No navigation sidebar, a breadcrumb back; the draft fills the column with its details beside it, narrower and quieter;
// saving is a status in the header, not a second button. The lines between the preview markers are its
// "ScreenLayoutEditor" preview (scripts/pattern-previews.mjs copies them); build/checks/pattern-types.mjs type-checks
// this file against the public declarations and fails if the two differ.
// preview-name: ScreenLayoutEditor
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
const AUDIENCES = [{ value: 'everyone', label: 'Everyone' }, { value: 'admins', label: 'Workspace admins' }];
function App() {
  const [title, setTitle] = React.useState('Saved views, and a faster sidebar');
  const [body, setBody] = React.useState('You can now save a filtered view of any table and come back to it from the sidebar.\n\nThe sidebar also opens twice as fast in large workspaces.');
  const [audience, setAudience] = React.useState('everyone');
  const [sync, setSync] = React.useState(/** @type {A.SyncState} */ ('saved'));
  const [titleError, setTitleError] = React.useState('');
  const [phase, setPhase] = React.useState(/** @type {'draft' | 'publishing' | 'published'} */ ('draft'));
  const timer = React.useRef(0);
  const outcome = React.useRef(/** @type {HTMLParagraphElement | null} */ (null));
  const edit = (set) => (e) => { set(e.target.value); setSync('saving'); clearTimeout(timer.current); timer.current = window.setTimeout(() => setSync('saved'), 700); };
  const publish = () => {
    if (!title.trim()) { setTitleError('Give the note a title.'); document.getElementById('le-title')?.focus(); return; }
    setPhase('publishing');
    window.setTimeout(() => { setPhase('published'); requestAnimationFrame(() => outcome.current?.focus()); }, 600);
  };
  return (
    <main className="le-page">
      <A.PageHeader breadcrumb={<A.Breadcrumb items={[{ label: 'Release notes', href: '#/notes' }, { label: 'Week 44' }]} />}
        actions={<A.SyncIndicator state={sync} />}
        primary={phase === 'published' ? undefined : <A.Button variant="primary" loading={phase === 'publishing'} onClick={publish}>Publish</A.Button>}>
        <A.PageHeaderTitle>Week 44 release note</A.PageHeaderTitle>
      </A.PageHeader>
      {phase === 'published' && <p className="le-outcome" role="status" tabIndex={-1} ref={outcome}>Published. Week 44 is at the top of the changelog and in everyone’s What’s new. <A.Link href="#/changelog">View the changelog</A.Link></p>}
      <div className="le-body">
        <section className="le-draft" aria-label="Draft">
          <A.Field label="Title" error={titleError || undefined}>
            <A.Input id="le-title" value={title} readOnly={phase !== 'draft'} onChange={(e) => { setTitleError(''); edit(setTitle)(e); }} />
          </A.Field>
          <A.Field label="Note">
            <A.Textarea className="le-text" rows={14} value={body} readOnly={phase !== 'draft'} onChange={edit(setBody)} />
          </A.Field>
        </section>
        <aside className="le-side" aria-labelledby="le-side-h">
          <h2 id="le-side-h" className="le-sub">Details</h2>
          <A.Field label="Who sees it"><A.Select items={AUDIENCES} value={audience} onValueChange={(v) => setAudience(String(v))} disabled={phase !== 'draft'} /></A.Field>
          <p className="le-note">Publishing adds it to the changelog and to What’s new for {audience === 'everyone' ? 'everyone' : 'workspace admins'}.</p>
          <p className="le-note">Last week: “Export any table as CSV”.</p>
        </aside>
      </div>
    </main>
  );
}
// preview:end
export default App;
