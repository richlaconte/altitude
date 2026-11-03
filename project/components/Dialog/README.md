# Dialog

Asks for a decision or a focused task at level 5, the summit. The page waits while the dialog is open and through its exit.

By default the app scales back 1.5% and desaturates, the scrim fades in with a 3px blur, and the dialog rises 16px from 96% scale while its shadow grows from `elev-1` to `elev-5` (`dur-travel-5`). It closes faster than it opened, sinking. `background="stationary"` keeps the background in place and removes backdrop blur, including a modal Sheet underneath. Dimming and the dialog's own elevation and motion stay the same. `AltitudeProvider recede={false}` suppresses stage recession for either mode; the default scrim still blurs.

**Where focus lands.** A form starts at its first eligible field by default. A readable structured surface can use `initialFocus="title"`; Tab then reaches the first control and Shift+Tab the last. `focusSelector` selects a different initial target. `initialFocus={false}` focuses the panel as a safe containment fallback until the application moves focus inside. Hidden, disabled, inert and negative-tabindex controls are excluded from Tab traversal. Composition Escape does not dismiss.

**Where focus returns.** Closing retains native background isolation, scroll locking and focus containment through the exit. The captured invoker receives focus afterward when it remains available. If an action removes it, supply a lazy `returnFocus={() => headingRef.current}`; the returned element must be connected, visible, non-inert and in the same document. A static heading needs `tabIndex={-1}`. The surviving provider stage is the final neutral fallback. An older close does not take focus from a newer modal or a valid application completion destination.

**On a phone.** It sizes to the visible viewport, not the largest one: with the on-screen keyboard open it shrinks to the part you can see, so its footer and the focused field stay in reach.

**You provide:** `title`, `description`, optional body, `footer`, `open`/`onOpenChange` or a `trigger`, and `size`. `dismissible={false}` disables Escape, scrim dismissal and the close affordance. `background` defaults to `'recede'`. `returnFocus` is optional for unchanged invokers.

```tsx
const listHeading = React.useRef<HTMLHeadingElement>(null);
<Dialog open={open} onOpenChange={setOpen} size="sm"
  background="stationary" title="Delete this file permanently?"
  description={`“${target.name}” will be removed. You won’t be able to restore it.`}
  focusSelector="[data-cancel]" returnFocus={() => listHeading.current}
  footer={<><Button data-cancel variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    <Button variant="danger" onClick={confirmDelete}>Delete permanently</Button></>} />
```

This fragment shows presentation only. Use the executable [confirmation recipe](../../ActionsInPlace.md) for target/revision capture, duplicate suppression, retained errors, pending Close, uncertain outcomes and session-safe completion. The application owns dispatched work; closing a Dialog never implies that a write was cancelled.

- Name the action in the confirm button, such as “Delete permanently”. For irreversible actions, initially focus Cancel.
- Keep essential errors and progress inside the dialog. Background toast actions are temporarily inert; notification text is routed into its live region.
- Keep one summit. A Dialog may temporarily suspend a modal Sheet. Competing Dialog/CommandPalette requests are rejected, warn in development, and require `open=false` before a fresh attempt. They never queue. A palette command may close the palette and open a Dialog in the same callback.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Dialog` as first used in its preview:

```tsx
import { Alert, Button, Dialog } from 'altitude-design';

<Dialog open={open} onOpenChange={setOpen} background={background} size="sm" title="Delete this file permanently?"
  description={`“${target?.name || ''}” will be removed. You won’t be able to restore it.`} focusSelector="[data-cancel]" returnFocus={() => heading.current}
  footer={<><Button data-cancel variant="ghost" onClick={() => setOpen(false)}>{busy ? 'Close' : 'Cancel'}</Button>
    <Button data-confirm variant="danger" disabled={busy || operation?.state === 'conflict'} onClick={confirm}>{busy ? operation?.state === 'checking' ? 'Checking deletion…' : 'Deleting…' : failed ? 'Try deleting again' : 'Delete permanently'}</Button></>}>
  <p className="body dialog-target">{target?.name}<br /><span className="cap">{target?.folder}</span></p>
  {busy && <p role="status">Deletion is in progress. Closing this dialog won’t cancel it.</p>}
  {failed && <Alert tone="critical" title="File not deleted">{operation.message}{operation.state === 'conflict' && <p>Latest file: {operation.current?.name || 'No longer available'}</p>}</Alert>}
</Dialog>
```

The full preview, as rendered in Storybook and checked in CI (`dialog-demo`, `cap`, `body`, `dialog-file`, `dialog-target`, `row` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Alert, AltitudeProvider, Button, CommandPalette, Dialog, Input, Sheet, SheetHeader, SheetTitle, Toaster, toast, useAltitude } from 'altitude-design';

const dialogFiles = [
  { id: 'file-brand', name: 'Brand guidelines.pdf', folder: 'Brand', revision: 1 },
  { id: 'file-brand-draft', name: 'Brand guidelines draft.pdf', folder: 'Brand', revision: 1 },
  { id: 'file-launch', name: 'Launch checklist.md', folder: 'Launch', revision: 1 },
];
function ModalFrameFixture() {
  const [open, setOpen] = React.useState(false), [sheet, setSheet] = React.useState(false);
  React.useEffect(() => { window.altitudeModalFrameFixture = { setOpen, setSheet }; return () => { delete window.altitudeModalFrameFixture; }; }, []);
  return <AltitudeProvider><p>Independent document fixture</p><Button data-frame-trigger onClick={() => setOpen(true)}>Open frame palette</Button>
    <CommandPalette open={open} onOpenChange={setOpen} items={[{ items: [{ label: 'Frame command' }] }]} />
    <Sheet open={sheet} onOpenChange={setSheet}><SheetHeader><SheetTitle>Frame sheet</SheetTitle></SheetHeader><Input aria-label="Frame input" /></Sheet>
  </AltitudeProvider>;
}
export default function App() {
  const altitude = useAltitude();
  const releaseLegacy = React.useRef(null);
  const [rows, setRows] = React.useState(dialogFiles);
  const server = React.useRef(dialogFiles.map(file => ({ ...file })));
  const heading = React.useRef(null);
  const [target, setTarget] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  const opened = React.useRef(false); opened.current = open;
  const [background, setBackground] = React.useState('stationary');
  const [fixture, setFixture] = React.useState(new URLSearchParams(window.location.search).get('fixture') || 'success-100');
  const [operation, setOperation] = React.useState(null);
  const [outcome, setOutcome] = React.useState('');
  const [present, setPresent] = React.useState(true);
  const session = React.useRef(0), sequence = React.useRef(0), pending = React.useRef(new Set());
  const failUsed = React.useRef(false), accepted = React.useRef([]);
  const invocation = React.useRef(null), mounted = React.useRef(false), epoch = React.useRef(0);
  const [frame, setFrame] = React.useState(false);
  const frameRoot = React.useRef(null);
  const [mode, setMode] = React.useState('');
  const [sheet, setSheet] = React.useState(false), [nonmodal, setNonmodal] = React.useState(false);
  const [palette, setPalette] = React.useState(false), [competing, setCompeting] = React.useState(false);
  const [controls, setControls] = React.useState(true), [inserted, setInserted] = React.useState(false);
  const [nestedPresent, setNestedPresent] = React.useState(true);
  const [nested, setNested] = React.useState(false), [toastActions, setToastActions] = React.useState(0);
  const latest = React.useRef({});
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; epoch.current++; }; }, []);
  const begin = (file, invoker) => {
    if (pending.current.has(file.id)) { setOutcome(`Deletion is already in progress for “${file.name}”.`); return; }
    session.current++; invocation.current = invoker || document.activeElement;
    setTarget({ ...file, session: session.current }); setOperation(null); setOpen(true); setPresent(true);
  };
  const finish = (captured, id, result, ownEpoch) => {
    pending.current.delete(captured.id);
    if (!mounted.current || ownEpoch !== epoch.current) return;
    const matching = session.current === captured.session;
    if (result === 'success') {
      const restoreRemoved = !opened.current && document.activeElement === invocation.current && matching;
      setRows(server.current.map(file => ({ ...file })));
      setOutcome(`Deleted “${captured.name}”.`);
      if (matching) { setOperation({ id, session: captured.session, state: 'done' }); setOpen(false); }
      if (restoreRemoved) requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
    } else {
      const message = result === 'conflict' ? 'This file changed. Close this dialog and review the latest file before deleting.' : 'The file was not deleted. Try again.';
      if (matching && opened.current) setOperation({ id, session: captured.session, state: result, message, current: server.current.find(file => file.id === captured.id) });
      else setOutcome(`“${captured.name}”: ${message}`);
    }
  };
  const confirm = async () => {
    if (!target || pending.current.has(target.id)) return;
    const captured = { ...target }, id = `delete-${++sequence.current}`, ownEpoch = epoch.current, behavior = fixture;
    pending.current.add(captured.id); setOperation({ id, session: captured.session, state: 'pending' });
    const request = { id: captured.id, expectedRevision: captured.revision, operationId: id, outcome: 'pending' };
    accepted.current.push(request);
    const reject = behavior === 'fail-once' && !failUsed.current;
    if (reject) failUsed.current = true;
    if (behavior === 'unmount') setTimeout(() => { if (epoch.current === ownEpoch && mounted.current) { setPresent(false); setOpen(false); } }, 50);
    if (behavior === 'interrupted-after-save') {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (ownEpoch !== epoch.current) return;
      const record = server.current.find(file => file.id === captured.id);
      if (record?.revision === captured.revision) server.current = server.current.filter(file => file.id !== captured.id);
      await new Promise(resolve => setTimeout(resolve, 1100));
    } else await new Promise(resolve => setTimeout(resolve, behavior === 'success-1200' || reject || behavior === 'conflict' ? 1200 : 100));
    if (ownEpoch !== epoch.current) return;
    if (behavior === 'conflict') { server.current = server.current.map(file => file.id === captured.id ? { ...file, name: 'Brand guidelines revised.pdf', revision: file.revision + 1 } : file); setRows(server.current); }
    const current = server.current.find(file => file.id === captured.id);
    let result = !current || current.revision !== captured.revision ? 'conflict' : reject || behavior === 'interrupted-before-save' ? 'failure' : 'success';
    if (result === 'success') server.current = server.current.filter(file => file.id !== captured.id);
    if (behavior.startsWith('interrupted')) {
      if (mounted.current && session.current === captured.session && opened.current) setOperation({ id, session: captured.session, state: 'checking' });
      await new Promise(resolve => setTimeout(resolve, 200));
      result = server.current.some(file => file.id === captured.id) ? 'failure' : 'success';
    }
    request.outcome = result;
    finish(captured, id, result, ownEpoch);
  };
  const reset = () => {
    epoch.current++; sequence.current = 0; failUsed.current = false; accepted.current = []; pending.current.clear(); server.current = dialogFiles.map(file => ({ ...file }));
    setRows(server.current); setOpen(false); setOutcome(''); setOperation(null); setPresent(true); setMode(''); setSheet(false); setNonmodal(false); setPalette(false); setCompeting(false); setNested(false);
  };
  latest.current = { legacyVote: () => { releaseLegacy.current = altitude.pushLayer(); }, legacyRelease: () => releaseLegacy.current?.(), begin, reset, setFrame, setMode, setSheet, setNonmodal, setPalette, setCompeting, setNested, setNestedPresent, setControls, setInserted, setPresent, setBackground, setFixture,
    close: () => setOpen(false), confirm, openFirst: () => begin(server.current[0]),
    changeTarget: () => { server.current = server.current.map(file => file.id === target?.id ? { ...file, name: file.name.replace('.pdf', ' revised.pdf'), revision: file.revision + 1 } : file); setRows(server.current); },
    notify: () => toast({ title: 'Background update', duration: 1200, action: { label: 'Undo background change', onClick: () => setToastActions(n => n + 1) } }),
    snapshot: () => ({ rows, operation, requests: sequence.current, accepted: accepted.current, toastActions, session: session.current, open }) };
  React.useEffect(() => {
    window.altitudeModalFixture = new Proxy({}, { get: (_, key) => latest.current[key] });
    return () => { delete window.altitudeModalFixture; };
  }, []);
  const busy = operation?.session === target?.session && ['pending', 'checking'].includes(operation?.state);
  const failed = operation?.session === target?.session && ['failure', 'conflict'].includes(operation?.state);
  return <div className="dialog-demo">
    <header><p className="cap">Files / Archived</p><h1 ref={heading} tabIndex={-1}>Archived files</h1></header>
    <p className="body">Archived files can be restored. Permanently deleted files cannot.</p>
    <section aria-label="Archived files">{rows.map(file => <div className="dialog-file" key={file.id}>
      <div><strong>{file.name}</strong><p className="cap">{file.folder}</p></div>
      <Button data-file={file.id} onClick={event => begin(file, event.currentTarget)}>Delete permanently</Button>
    </div>)}</section>
    <p role="status" data-outcome>{outcome}</p>
    {present && <Dialog open={open} onOpenChange={setOpen} background={background} size="sm" title="Delete this file permanently?"
      description={`“${target?.name || ''}” will be removed. You won’t be able to restore it.`} focusSelector="[data-cancel]" returnFocus={() => heading.current}
      footer={<><Button data-cancel variant="ghost" onClick={() => setOpen(false)}>{busy ? 'Close' : 'Cancel'}</Button>
        <Button data-confirm variant="danger" disabled={busy || operation?.state === 'conflict'} onClick={confirm}>{busy ? operation?.state === 'checking' ? 'Checking deletion…' : 'Deleting…' : failed ? 'Try deleting again' : 'Delete permanently'}</Button></>}>
      <p className="body dialog-target">{target?.name}<br /><span className="cap">{target?.folder}</span></p>
      {busy && <p role="status">Deletion is in progress. Closing this dialog won’t cancel it.</p>}
      {failed && <Alert tone="critical" title="File not deleted">{operation.message}{operation.state === 'conflict' && <p>Latest file: {operation.current?.name || 'No longer available'}</p>}</Alert>}
    </Dialog>}
    <details><summary>Demo controls</summary>
      <div className="row"><label>Background <select aria-label="Dialog background" value={background} onChange={event => setBackground(event.target.value)}><option value="stationary">Stationary</option><option value="recede">Default recession</option></select></label>
      <label>Service fixture <select aria-label="Service fixture" value={fixture} onChange={event => setFixture(event.target.value)}><option value="success-100">Success · 100 ms</option><option value="success-1200">Slow success · 1,200 ms</option><option value="fail-once">Fail once, then retry</option><option value="conflict">Record changes before save</option><option value="interrupted-after-save">Connection interrupted after save</option><option value="interrupted-before-save">Connection interrupted before save</option><option value="unmount">Unmount presentation during write</option></select></label>
      <Button onClick={reset}>Reset fixtures</Button></div>
      <div className="row"><Button onClick={() => { setControls(true); setMode('title'); }}>Read a structured dialog</Button><Button onClick={() => setMode('field')}>Edit in a dialog</Button><Button onClick={() => setMode('panel')}>Panel-only dialog</Button><Button onClick={() => setSheet(true)}>Open modal sheet</Button><Button onClick={() => setNonmodal(true)}>Open nonmodal sheet</Button><Button onClick={() => setPalette(true)}>Open command palette</Button><Button onClick={() => setNested(true)}>Open nested-provider dialog</Button></div>
      <p className="cap">Requests: {sequence.current}. Accepted operation log: <output data-operation-log>{JSON.stringify(accepted.current)}</output></p>
      <p className="cap">Deterministic fictional data. Pending close, failure, conflict, unmount and ownership cases are exercised by the canonical regression harness. <a href="https://github.com/richlaconte/altitude/blob/main/build/previews.txt">Example source</a> · <a href="../../ActionsInPlace.md">Actions in place recipe</a></p>
    <button data-background-control onClick={() => setOutcome('Background action')}>Background control</button>
    {inserted && <button data-late-background>New background control</button>}
      {frame && <iframe srcDoc="<!doctype html><html><head></head><body></body></html>" title="Independent document" style={{ width: '100%', height: 360 }} onLoad={event => {
        const doc = event.currentTarget.contentDocument;
        for (const style of document.querySelectorAll('style')) doc.head.append(style.cloneNode(true));
        frameRoot.current = ReactDOM.createRoot(doc.body); frameRoot.current.render(<ModalFrameFixture />);
      }} />}
    </details>
    <Dialog open={!!mode} onOpenChange={value => { if (!value) setMode(''); }} title="Modal focus fixture" initialFocus={mode === 'title' ? 'title' : mode === 'panel' ? false : 'first-field'} dismissible={mode !== 'panel'} background={background}
      footer={mode !== 'panel' && controls ? <><button data-first>First control</button><button data-last>Last control</button></> : null}>
      {mode === 'field' && controls && <Input aria-label="Fixture field" />}<button hidden>Hidden control</button><button disabled>Disabled control</button>
    </Dialog>
    <Dialog open={competing} onOpenChange={setCompeting} title="Competing summit" />
    <Sheet open={sheet} onOpenChange={setSheet}><SheetHeader><SheetTitle>File details</SheetTitle></SheetHeader><Button data-sheet-dialog onClick={() => setMode('title')}>Read details in dialog</Button></Sheet>
    <Sheet open={nonmodal} onOpenChange={setNonmodal} modal={false}><SheetHeader><SheetTitle>File filters</SheetTitle></SheetHeader><Button data-nonmodal-close onClick={() => setNonmodal(false)}>Close filters</Button></Sheet>
    <CommandPalette open={palette} onOpenChange={setPalette} items={[{ items: [{ label: 'Read file details', onSelect: () => setMode('title') }] }]} />
    {nestedPresent && <AltitudeProvider scheme="nightfall" recede={false}><div data-nested-background hidden>Nested workspace</div><Dialog open={nested} onOpenChange={setNested} title="Nested dialog" initialFocus="title" /></AltitudeProvider>}
    <Toaster />
  </div>;
}
```
<!-- /example -->
