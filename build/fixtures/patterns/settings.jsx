// Settings pattern (project/framework/patterns/settings.md): a workspace settings page. General fields are saved
// together as one draft with a SaveBar; notification switches apply immediately, each reporting its own write; billing
// is read-only for this person, with the reason in words; the danger zone deletes through a typed confirmation.
// The lines between the preview markers are its "SettingsPattern" preview (scripts/pattern-previews.mjs copies them);
// build/checks/pattern-types.mjs type-checks this file against the public declarations and fails if the two differ.
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function App() {
  const [failNext, setFailNext] = React.useState(false);
  const fail = React.useRef(false); fail.current = failNext;
  const [saved, setSaved] = React.useState({ name: 'Acme', url: 'acme' });
  const general = A.useEditRecord({
    initialValue: saved, validationMode: 'submit',
    validate: (d) => ({ ...(d.name.trim() ? {} : { name: 'Enter a workspace name.' }), ...(/^[a-z0-9-]+$/.test(d.url) ? {} : { url: 'Use lowercase letters, numbers and hyphens.' }) }),
    save: async (draft) => { await wait(800); if (fail.current) return { ok: false, error: 'We couldn’t reach the server. Your changes are still here.' }; setSaved(draft); return { ok: true, value: draft }; },
  });
  const [prefs, setPrefs] = React.useState({ digest: true, mentions: true });
  const [writes, setWrites] = React.useState({ digest: undefined, mentions: undefined });
  const apply = async (key, value) => {
    setPrefs((p) => ({ ...p, [key]: value })); setWrites((w) => ({ ...w, [key]: 'pending' }));
    await wait(900);
    if (fail.current) { setPrefs((p) => ({ ...p, [key]: !value })); setWrites((w) => ({ ...w, [key]: 'failed' })); }
    else setWrites((w) => ({ ...w, [key]: 'committed' }));
  };
  const [deleted, setDeleted] = React.useState(false);
  const [typed, setTyped] = React.useState('');
  const heading = React.useRef(null);
  const remove = A.useConsequentialAction({
    target: 'Acme workspace', consequence: 'Delete Acme, its 12 projects and 1,204 files for all 8 members. This can’t be undone.',
    requiresConfirmation: true, focusFallback: () => heading.current,
    execute: async () => { await wait(900); if (fail.current) return { ok: false, error: 'We couldn’t delete the workspace. Nothing was removed. Try again.' }; setDeleted(true); return { ok: true, value: 'acme' }; },
    messages: { pending: 'Deleting Acme workspace', succeeded: 'Acme workspace deleted' },
  });
  const confirming = ['confirming', 'pending', 'failed'].includes(remove.phase);
  const field = (key, label, hint) => <A.Field label={label} hint={hint} error={general.errors[key]}><A.Input id={'ws-' + key} value={general.draft[key]} onChange={(e) => general.setField(key, e.target.value)} /></A.Field>;
  if (deleted) return <main className="st-page"><h2 ref={heading} tabIndex={-1} className="st-h">Workspace deleted</h2><p>Acme and everything in it were deleted.</p><A.WorkflowStatus>{remove.status}</A.WorkflowStatus></main>;
  return (
    <main className="st-page">
      <h2 ref={heading} tabIndex={-1} className="st-h">Workspace settings</h2>
      <nav aria-label="Settings sections" className="st-nav"><a href="#st-general">General</a><a href="#st-notify">Notifications</a><a href="#st-billing">Billing</a><a href="#st-danger">Danger zone</a></nav>
      <A.Switch label="Make the next change fail" checked={failNext} onCheckedChange={setFailNext} />
      <A.SettingsSection id="st-general" title="General" description="Saved together: change what you need, then save once.">
        <form className="st-form" noValidate onSubmit={(e) => { e.preventDefault(); void general.submit(); }}>
          <A.ErrorSummary errors={Object.entries(general.errors).map(([k, message]) => ({ id: 'ws-' + k, label: k === 'name' ? 'Workspace name' : 'Workspace URL', message }))} focusKey={general.submitCount} />
          {field('name', 'Workspace name', 'Shown to everyone in the workspace.')}
          {field('url', 'Workspace URL', 'altitude.app/' + general.draft.url)}
        </form>
      </A.SettingsSection>
      <A.SettingsSection id="st-notify" title="Notifications" description="Each change applies as soon as you make it.">
        <A.SettingsRow label="Weekly digest" description="A summary of activity every Monday." status={writes.digest}><A.Switch checked={prefs.digest} onCheckedChange={(v) => apply('digest', v)} /></A.SettingsRow>
        <A.SettingsRow label="Mentions" description="Email me when someone mentions me." status={writes.mentions}><A.Switch checked={prefs.mentions} onCheckedChange={(v) => apply('mentions', v)} /></A.SettingsRow>
      </A.SettingsSection>
      <A.SettingsSection id="st-billing" title="Billing" readOnlyReason="Only workspace owners can change billing details. Ask Maya Chen.">
        <A.SettingsRow label="Billing email" description="Invoices and receipts go here."><A.Input defaultValue="finance@acme.dev" /></A.SettingsRow>
      </A.SettingsSection>
      <A.SettingsSection id="st-danger" title="Danger zone" tone="critical">
        <A.SettingsRow label="Delete workspace" description={remove.consequence}><A.Button variant="danger" onClick={remove.request}>Delete workspace</A.Button></A.SettingsRow>
      </A.SettingsSection>
      <A.WorkflowStatus>{general.status || remove.status}</A.WorkflowStatus>
      <A.SaveBar record={general} />
      <A.Dialog open={confirming} background="stationary" dismissible={remove.phase !== 'pending'} onOpenChange={(o) => { if (!o) { remove.cancel(); setTyped(''); } }} returnFocus={() => heading.current}
        title="Delete Acme workspace?" description={remove.consequence}
        footer={<><A.Button disabled={remove.phase === 'pending'} onClick={() => { remove.cancel(); setTyped(''); }}>Keep workspace</A.Button><A.Button variant="danger" disabled={typed !== 'Acme' || remove.phase === 'pending'} onClick={remove.phase === 'failed' ? remove.retry : remove.confirm}>{remove.phase === 'pending' ? 'Deleting workspace' : remove.phase === 'failed' ? 'Try deleting again' : 'Delete workspace'}</A.Button></>}>
        <A.Field label="Type Acme to confirm"><A.Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" /></A.Field>
        {remove.error && <p role="alert">{remove.error}</p>}
      </A.Dialog>
    </main>
  );
}
// preview:end
export default App;
