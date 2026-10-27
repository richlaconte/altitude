# Actions in place

Finish a small task where it starts. Use [InlineEdit](components/InlineEdit/README.md) for one editable value, act immediately when the application provides real recovery, and ask for a focused decision when the consequence cannot reliably be undone. The ground remains the committed record. Deciding or typing is not a pending write; dispatched persistence is.

The application chooses that policy from its domain. A danger button does not imply irreversibility, and the word “Archive” does not establish a recovery guarantee. Sending a message, publishing externally, and permanent deletion do not belong in the recovery recipe unless the application can actually reverse their effects.

## Try the same example in two views

- [Focused recovery preview](components/ActionsInPlace/preview.html) — archive, Undo, and restore later from Archived.
- [Complete Files example](components/ActionsInPlace/preview.html#files) — rename with the exported InlineEdit, archive, recover, and permanently delete from Archived.
- [InlineEdit comparison](components/InlineEdit/preview.html) and [Dialog presentation comparison](components/Dialog/preview.html).
- Generated Storybook stories: `Patterns/ActionsInPlace`, `Inputs/InlineEdit`, and `Overlays/Dialog`.

Both Files views use the same source and service in [`build/previews.txt`](../build/previews.txt). The default has no fixture toolbar in the product. Expand “Example fixtures and source” below the scene to select the deterministic service behavior, reset records/counters, simulate an external change, or inspect accepted requests. “Connection interrupted after save” commits at 100 ms and loses its response at 1,200 ms; the UI must reconcile that result before offering recovery or retry.

## Act and recover

Archive immediately removes the selected record from Files, updates the location count, and names the pending action. Undo is offered only after the server confirms the archive and its new revision. Undo is a new restore request against that revision; it changes that record’s archive state, never a stored snapshot of the entire list.

A raised neutral [Alert](components/Alert/README.md) says the file *is archived* and offers Undo. That is an ongoing recoverable condition with an action. Generic completion messages continue to use a quiet settle or [Toast](components/Toaster/README.md). Restore and permanent deletion update a quiet local status region that is present from the initial render; starting a later rename clears the old completion. The example sends no duplicate toast. Archived remains visible, and its Restore action works after the recovery Alert is dismissed or replaced.

Every Alert is keyed by the operation ID. Its delayed dismissal clears state only if that ID is still current. Dismissing A while B completes therefore leaves B present and actionable. Only the most recently initiated feedback can replace the current region, even when independent records complete out of order. An older failure stays actionable beside its record (or below the list when that record is outside the current view), without replacing the newer recovery.

One mutation per record may be in flight; other records and search remain available. Optimistic removal and server acknowledgement are separate. A known rejection reconciles only the affected authoritative record and offers a safe retry. A conflict reconciles the latest version and explains why the old Undo is unavailable. A deleted record is a tombstone and cannot be resurrected by an old response.

## Confirm a concrete consequence

Permanent deletion is available only in Archived in this example. That restriction is application policy. The [Dialog](components/Dialog/README.md) uses `size="sm"`, `background="stationary"`, `focusSelector="[data-cancel]"`, and a lazy `returnFocus` heading fallback. The exact filename and folder stay inside the accessible dialog, and Cancel receives initial focus.

Capture the target’s immutable ID, name, folder, revision, invoking element, and a presentation session ID when opening. Keep this snapshot through the exit animation; do not recalculate it from a changing row index. Opening, Cancel, and Escape before dispatch perform no mutation. Revalidate the expected revision on the server at dispatch. If the target changed, show the changed identity and require a fresh explicit confirmation.

Once dispatched, deletion belongs to the application, outside the dialog’s presentation lifecycle. The button says “Deleting…”, and Cancel becomes Close beside “Deletion is in progress. Closing this dialog won’t cancel it.” Close, Escape, and the close icon dismiss the presentation without pretending to cancel the write. A known failure stays inside its matching open session and offers Retry deletion. A closed session reports failure in the originating context. An uncertain response is reconciled before success, failure, or retry is claimed.

A successful operation closes only the presentation session that dispatched it. Confirm A → Close → open B → A settles cannot close B or show A’s error in B. Success removes only A. If focus still belongs to A’s removed row or closing dialog, use the nearest surviving action or list heading; if focus moved elsewhere, leave it there. Closing during a pending write and returning focus to its Delete trigger still needs this check when that trigger is eventually removed.

Keep one summit. A command-palette action must close its owning palette and transfer ownership through the modal lifecycle before admitting confirmation in the originating page. Do not nest a confirmation or substitute an arbitrary delay for ownership transfer.

## Persistence contract

The copyable example below uses a fictional application service. Replace it with your authenticated API; these guarantees remain the application’s responsibility:

| Boundary | Required guarantee |
| --- | --- |
| Mutation | Accept `{ id, expectedRevision, operationId }`; apply the intended operation to that ID only and return the authoritative versioned record. |
| Concurrency | Reject stale revisions and deleted targets. Maintain monotonically increasing revisions, including tombstones. Authorization and concurrency checks happen on the server. |
| Idempotency | A logical operation keeps its ID across uncertain retries. Deduplicate both overlapping requests and completed operations. A deliberate inverse uses a new ID. |
| Uncertain result | Reconcile the operation ID or idempotently retry it before declaring failure/success. A transport timeout is not proof of rejection. |
| Recovery | Persist Archived and implement Restore. Define any expiry or invalidation policy explicitly; never infer it from a UI timer. |
| Rename | `onSave` performs the sole write and returns the canonical string. `onValueChange` publishes that value synchronously and makes no network request. |
| Navigation/unmount | Dispatched requests remain application-owned. Late callbacks do not announce, focus, or mutate an unmounted view; the next view loads the current authoritative records. |

The local `FileName` wrapper tracks whether that editor is still mounted and clears old quiet completion on entry; InlineEdit retains all editing, keyboard, and focus behavior. A mounted editor publishes through `onValueChange`. If navigation unmounted it, the application adapter reconciles the confirmed result itself, so returning to Files does not show stale data. Known newer revisions invalidate an offered Undo immediately, including when an older receipt arrives afterward.

The fixture’s `reconcile(operationId)` stands in for an operation-status endpoint. Its response is an acknowledged operation result, not a guess based on matching visible values. For an API that cannot establish the outcome, retain an explicit unknown state and provide reconciliation; do not offer a new unsafe retry. In production, generate operation IDs with an appropriate unique scheme rather than the example’s local counter.

## Complete copyable application recipe

This code composes public Altitude APIs. It is application code, not a new Altitude action framework. The runnable preview and Storybook are generated from the canonical source; the check asserts that the recipe body below matches that source. Import the following style block as `actions-in-place.css` alongside the library stylesheet.

```jsx
import * as React from 'react';
import * as A from 'altitude-design';
import 'altitude-design/altitude.css';
import './actions-in-place.css';
```

<!-- recipe-source:start -->
```jsx
const FILES_SEED = Object.freeze([
  Object.freeze({ id: 'file-brand', name: 'Brand guidelines.pdf', folder: 'Brand', size: '2.4 MB', revision: 1, archived: false, deleted: false, position: 0 }),
  Object.freeze({ id: 'file-brand-draft', name: 'Brand guidelines draft.pdf', folder: 'Brand', size: '1.8 MB', revision: 1, archived: false, deleted: false, position: 1 }),
  Object.freeze({ id: 'file-launch', name: 'Launch checklist.md', folder: 'Launch', size: '12 KB', revision: 1, archived: false, deleted: false, position: 2 }),
]);
function createFilesService(fixture = 'success-100', wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))) {
  const records = new Map(FILES_SEED.map(record => [record.id, { ...record }]));
  const accepted = [], requests = [], receipts = new Map(), flights = new Map();
  let failedOnce = false;
  const read = id => records.has(id) ? { ...records.get(id) } : null;
  const error = (code, message) => Object.assign(new Error(message), { code });
  const change = (id, patch) => { const old = records.get(id); if (old) records.set(id, { ...old, ...patch, id, revision: old.revision + 1 }); };
  const apply = request => {
    const old = records.get(request.id);
    if (!old || old.deleted) throw error('missing', 'This file was removed. It cannot be restored.');
    if (old.revision !== request.expectedRevision) throw error('conflict', 'This file changed. Review its current version before trying again.');
    if (request.kind === 'delete' && !old.archived) throw error('conflict', 'This file is no longer in Archived. Review its current location.');
    const record = { ...old, revision: old.revision + 1 };
    if (request.kind === 'rename') record.name = request.name.trim();
    else if (request.kind === 'delete') record.deleted = true;
    else record.archived = request.kind === 'archive';
    records.set(record.id, record);
    accepted.push({ ...request, revision: record.revision });
    receipts.set(request.operationId, { ...record });
    return { ...record };
  };
  const mutate = request => {
    // Same logical request must not be submitted twice, even if the response was lost.
    if (receipts.has(request.operationId)) return Promise.resolve({ ...receipts.get(request.operationId) });
    if (flights.has(request.operationId)) return flights.get(request.operationId);
    requests.push({ ...request });
    const mode = fixture;
    const flight = (async () => {
      if (mode === 'interrupted-after-save') {
        await wait(100); apply(request); await wait(1100);
        throw error('uncertain', 'Connection interrupted after save.');
      }
      const reject = mode === 'fail-once' && !failedOnce;
      if (reject) failedOnce = true;
      await wait(mode === 'success-1200' || reject || mode === 'conflict' ? 1200 : 100);
      if (reject) throw error('rejected', 'We could not save this change. Try again.');
      if (mode === 'conflict') change(request.id, { name: read(request.id).name.replace(/(\.[^.]+)$/, ' updated$1') });
      return apply(request);
    })();
    flights.set(request.operationId, flight);
    flight.then(() => flights.delete(request.operationId), () => flights.delete(request.operationId));
    return flight;
  };
  return { read, list: () => [...records.values()].map(record => ({ ...record })), accepted, requests, mutate,
    reconcile: async operationId => receipts.has(operationId) ? { ...receipts.get(operationId) } : null,
    change, setFixture: value => { fixture = value; },
  };
}
// END FILES SERVICE
// This wrapper reports mount ownership and entry; InlineEdit owns every editing interaction.
function FileName({ onSave, onBeginEdit, ...props }) {
  const mounted = React.useRef(false);
  React.useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  return <div onClickCapture={event => {
    if (event.target instanceof Element && event.target.closest('button') && !event.currentTarget.querySelector('input')) onBeginEdit?.();
  }}><A.InlineEdit {...props} onSave={(draft, context) => onSave(draft, context, () => mounted.current)} /></div>;
}
function FilesExample({ service, full }) {
  const [records, setRecords] = React.useState(() => service.list());
  const recordsRef = React.useRef(records), alive = React.useRef(true);
  const [location, setLocation] = React.useState('active'), [query, setQuery] = React.useState('');
  const [busy, setBusy] = React.useState({}), flights = React.useRef(new Map());
  const [rowErrors, setRowErrors] = React.useState({});
  const [notice, setNotice] = React.useState(null), lastNotice = React.useRef(0), sequence = React.useRef(0);
  const [target, setTarget] = React.useState(null), targetRef = React.useRef(null);
  const [confirmationOpen, setConfirmationOpen] = React.useState(false), openRef = React.useRef(false);
  const [deleteError, setDeleteError] = React.useState(null), [staleIntent, setStaleIntent] = React.useState(false);
  const sessionSequence = React.useRef(0), heading = React.useRef(null), renameResults = React.useRef(new Map());
  const recoveryAtCurrentRevision = (message, record) => {
    if (!message?.undo || !record || message.record.id !== record.id || (message.record.revision === record.revision && record.archived && !record.deleted)) return message;
    return { ...message, record, undo: false, tone: 'critical', route: !record.deleted, routeLocation: record.archived ? 'archived' : 'active',
      title: record.deleted ? 'This file was removed.' : 'This file changed after it was archived.',
      body: record.deleted ? 'It cannot be restored.' : `“${record.name}” is current. Review it in ${record.archived ? 'Archived' : 'Files'}.` };
  };
  const publishRecords = next => { recordsRef.current = next; setRecords(next); };
  const reconcileRecord = record => {
    if (!alive.current || !record) return;
    publishRecords(recordsRef.current.map(old => old.id === record.id && old.revision <= record.revision ? record : old));
    setNotice(current => recoveryAtCurrentRevision(current, recordsRef.current.find(item => item.id === record.id)));
  };
  const announce = message => {
    if (!alive.current || message.sequence < lastNotice.current) return;
    lastNotice.current = message.sequence; setNotice(recoveryAtCurrentRevision(message, recordsRef.current.find(record => record.id === message.id)));
  };
  const reportFailure = message => {
    if (!alive.current) return;
    // Preserve newer recovery without silently dropping an older record's failure.
    if (message.sequence < lastNotice.current) setRowErrors(errors => ({ ...errors, [message.id]: message }));
    else announce(message);
  };
  const clearRowError = id => setRowErrors(errors => { const next = { ...errors }; delete next[id]; return next; });
  const setOpen = open => { openRef.current = open; setConfirmationOpen(open); };
  const nextOperation = (kind, record, session) => {
    const seq = ++sequence.current;
    return { kind, id: record.id, expectedRevision: record.revision, operationId: `files-${seq}`, sequence: seq, session };
  };
  const setFlight = (id, operation) => {
    if (operation) flights.current.set(id, operation); else flights.current.delete(id);
    if (alive.current) setBusy(Object.fromEntries(flights.current));
  };
  // Repair only focus that belonged to the removed row. Async completion cannot reclaim it later.
  const repairFocus = (id, kind, before = document.activeElement) => {
    const row = before?.closest?.('[data-file-id]');
    if (!row || row.dataset.fileId !== id) return;
    const all = [...document.querySelectorAll(`[data-action="${kind}"]`)];
    const index = all.findIndex(el => el.closest('[data-file-id]') === row), candidates = [...all.slice(index + 1), ...all.slice(0, index).reverse()];
    requestAnimationFrame(() => {
      if (!alive.current || (document.activeElement !== before && !(document.activeElement === document.body && !before.isConnected))) return;
      const next = candidates.find(el => el.isConnected && !el.disabled && !el.closest('[inert]'));
      (next || heading.current)?.focus({ preventScroll: true });
    });
  };
  const authoritativeResult = async operation => {
    for (;;) {
      try { return await service.mutate(operation); }
      catch (error) {
        if (error.code !== 'uncertain') throw error;
        // A timeout is not failure. Reconcile, or retry this same idempotent operation.
        // Never return a retryable failure to InlineEdit while the outcome is unknown.
        const result = await service.reconcile(operation.operationId);
        if (result) return result;
      }
    }
  };
  const move = async (kind, record, undo = false) => {
    if (flights.current.has(record.id)) return;
    const operation = nextOperation(kind, record);
    const current = service.read(record.id);
    if (!current || current.deleted || current.revision !== record.revision) {
      reconcileRecord(current);
      announce({ ...operation, tone: 'critical', title: current?.deleted ? 'This file was removed.' : 'This file changed after it was archived.', body: current?.deleted ? 'It cannot be restored.' : 'Review it in Archived.', route: true });
      return;
    }
    clearRowError(record.id); setFlight(record.id, operation);
    repairFocus(record.id, kind === 'archive' ? 'archive' : 'restore');
    publishRecords(recordsRef.current.map(old => old.id === record.id ? { ...old, archived: kind === 'archive' } : old));
    announce({ ...operation, pending: true, title: `${kind === 'archive' ? 'Archiving' : 'Restoring'} “${record.name}”…` });
    try {
      const result = await authoritativeResult(operation);
      if (!alive.current) return;
      reconcileRecord(result);
      announce({ ...operation, title: `${result.name} is ${kind === 'archive' ? 'archived' : 'restored'}.`, record: result, undo: kind === 'archive', route: kind === 'archive', quiet: kind === 'restore' });
    } catch (error) {
      if (!alive.current) return;
      reconcileRecord(service.read(record.id));
      reportFailure({ ...operation, tone: 'critical', title: kind === 'archive' ? `Could not archive ${record.name}.` : `Could not restore ${record.name}.`,
        body: error.message, retry: error.code === 'rejected' ? { kind, record: service.read(record.id) } : null, route: true });
    } finally { setFlight(record.id, null); }
  };
  const beginDelete = record => {
    if (flights.current.has(record.id)) return;
    const next = { ...record, session: ++sessionSequence.current, invoker: document.activeElement };
    targetRef.current = next; setTarget(next); setDeleteError(null); setStaleIntent(false); setOpen(true);
  };
  const deleteFile = async () => {
    const captured = targetRef.current;
    if (!captured || flights.current.has(captured.id) || staleIntent) return;
    const current = service.read(captured.id);
    if (!current || current.deleted || current.revision !== captured.revision || !current.archived) {
      reconcileRecord(current); setStaleIntent(true);
      setDeleteError(current?.deleted ? 'This file was removed. Close and review Archived.' : `This file is now “${current?.name || captured.name}”. Review the current file in Archived, then confirm again.`);
      return;
    }
    clearRowError(captured.id);
    const operation = nextOperation('delete', captured, captured.session);
    setFlight(captured.id, operation); setDeleteError(null);
    try {
      const result = await authoritativeResult(operation);
      if (!alive.current) return;
      // If Close returned focus to the soon-to-disappear Delete button, repair that focus too.
      repairFocus(captured.id, 'delete'); reconcileRecord(result);
      announce({ ...operation, quiet: true, title: `${captured.name} was permanently deleted.` });
      if (openRef.current && targetRef.current?.session === operation.session) setOpen(false);
    } catch (error) {
      if (!alive.current) return;
      reconcileRecord(service.read(captured.id));
      if (openRef.current && targetRef.current?.session === operation.session) {
        setDeleteError(error.message); setStaleIntent(error.code !== 'rejected');
      } else reportFailure({ ...operation, tone: 'critical', title: `Could not delete ${captured.name}.`, body: error.message, route: true });
    } finally { setFlight(captured.id, null); }
  };
  const rename = async (record, draft, previousValue, isEditorMounted) => {
    const current = recordsRef.current.find(item => item.id === record.id);
    if (!current || current.name !== previousValue || flights.current.has(record.id)) return { ok: false, error: 'This file changed. Review its current value.' };
    const operation = { ...nextOperation('rename', current), name: draft };
    setFlight(record.id, operation);
    try {
      const result = await authoritativeResult(operation);
      // A mounted editor publishes via onValueChange. After navigation the application
      // must still reconcile the write; InlineEdit correctly suppresses its late callback.
      if (isEditorMounted()) renameResults.current.set(record.id, result);
      else reconcileRecord(result);
      return { ok: true, value: result.name };
    } catch (error) {
      if (error.code !== 'rejected') reconcileRecord(service.read(record.id));
      return { ok: false, error: error.message };
    } finally { setFlight(record.id, null); }
  };
  React.useEffect(() => {
    alive.current = true;
    const debug = { service, snapshot: () => ({ records: recordsRef.current, accepted: service.accepted, requests: service.requests }), sync: id => reconcileRecord(service.read(id)) };
    window.__filesDemo = debug;
    return () => { alive.current = false; if (window.__filesDemo === debug) delete window.__filesDemo; };
  }, [service]);
  const shown = records.filter(record => !record.deleted && record.archived === (location === 'archived') && record.name.toLowerCase().includes(query.toLowerCase()));
  const count = archived => records.filter(record => !record.deleted && record.archived === archived).length;
  const deleting = target && busy[target.id]?.kind === 'delete' && busy[target.id]?.session === target.session;
  const recordError = error => error && <A.Alert key={error.operationId} tone="critical" title={error.title} data-file-error={error.id}
    action={error.retry ? <A.Button size="sm" onClick={() => move(error.retry.kind, error.retry.record)}>Retry {error.retry.kind}</A.Button> : undefined}
    onDismiss={() => setRowErrors(errors => errors[error.id]?.operationId === error.operationId ? Object.fromEntries(Object.entries(errors).filter(([id]) => id !== error.id)) : errors)}>{error.body}</A.Alert>;
  return <main className="aip-product" data-product="files">
    <header className="aip-header"><div><p className="aip-eyebrow">Northstar Studio</p><h2>Files</h2></div><span className="aip-meta">Team library</span></header>
    <div className="aip-toolbar"><nav aria-label="File locations">
      <A.Button variant={location === 'active' ? 'secondary' : 'ghost'} aria-pressed={location === 'active'} onClick={() => setLocation('active')}>Files ({count(false)})</A.Button>
      <A.Button variant={location === 'archived' ? 'secondary' : 'ghost'} aria-pressed={location === 'archived'} onClick={() => setLocation('archived')}>Archived ({count(true)})</A.Button>
    </nav><A.Input aria-label="Search files" placeholder="Search files" value={query} onChange={event => setQuery(event.target.value)} /></div>
    <h3 ref={heading} tabIndex={-1} data-list-heading>{location === 'active' ? 'All files' : 'Archived files'}</h3>
    <ul className="aip-list" aria-label={location === 'active' ? 'All files' : 'Archived files'}>
      {shown.map(record => <li key={record.id} data-file-id={record.id}>
        <div className="aip-file"><div className="aip-name">{full ? <FileName label={`File name: ${record.name}`} editLabel="Rename" value={record.name} required maxLength={160} disabled={!!busy[record.id] && busy[record.id].kind !== 'rename'}
          validate={draft => !draft.trim() ? 'Enter a file name.' : recordsRef.current.some(other => other.id !== record.id && !other.deleted && other.name === draft.trim()) ? 'A file already has that name.' : undefined}
          onBeginEdit={() => setNotice(current => current?.quiet ? null : current)}
          onSave={(draft, context, isMounted) => rename(record, draft, context.previousValue, isMounted)}
          onValueChange={name => { const result = renameResults.current.get(record.id); if (result) { reconcileRecord({ ...result, name }); renameResults.current.delete(record.id); } }}
          focusFallback={() => heading.current} /> : <strong>{record.name}</strong>}</div>
          <p className="aip-meta">{record.folder} · {record.size}</p>{recordError(rowErrors[record.id])}</div>
        <div className="aip-row-actions">{record.archived ? <>
          <A.Button size="sm" data-action="restore" data-id={record.id} aria-label={`Restore ${record.name}`} disabled={!!busy[record.id]} onClick={() => move('restore', record)}>Restore</A.Button>
          {full && <A.Button size="sm" variant="ghost" data-action="delete" data-id={record.id} aria-label={`Delete ${record.name} permanently`} aria-disabled={!!busy[record.id]} onClick={() => beginDelete(record)}>Delete permanently</A.Button>}
        </> : <A.Button size="sm" variant="ghost" data-action="archive" data-id={record.id} aria-label={`Archive ${record.name}`} disabled={!!busy[record.id]} onClick={() => move('archive', record)}>Archive</A.Button>}</div>
      </li>)}
    </ul>
    {Object.values(rowErrors).filter(error => !shown.some(record => record.id === error.id)).map(recordError)}
    {!shown.length && <p className="aip-empty">{query ? 'No files match your search.' : location === 'archived' ? 'No archived files.' : 'No files here. Restore a file from Archived.'}</p>}
    <p className="aip-completion" role="status" aria-live="polite" aria-atomic="true" data-recovery={notice?.quiet ? '' : undefined}>{notice?.quiet && <><A.Icons.Check size={16} aria-hidden="true" />{notice.title}</>}</p>
    {notice && !notice.quiet && <A.Surface className="aip-recovery" level={0} status={notice.pending ? 'pending' : undefined} data-recovery>
      <A.Alert key={notice.operationId} variant={notice.undo || notice.retry || notice.route ? 'raised' : 'flat'} tone={notice.tone || 'neutral'} title={notice.title}
        onDismiss={notice.pending ? undefined : () => setNotice(current => current?.operationId === notice.operationId ? null : current)}
        action={<>{notice.undo && <A.Button size="sm" aria-label={`Undo archive of ${notice.record.name}`} onClick={() => move('restore', notice.record, true)}>Undo</A.Button>}
          {notice.retry && <A.Button size="sm" onClick={() => move(notice.retry.kind, notice.retry.record)}>Retry {notice.retry.kind}</A.Button>}
          {notice.route && <A.Button size="sm" variant="ghost" onClick={() => { setQuery(''); setLocation(notice.routeLocation || 'archived'); }}>View {notice.routeLocation === 'active' ? 'Files' : 'Archived'}</A.Button>}</>}>
        {notice.body}
      </A.Alert>
    </A.Surface>}
    <A.Dialog open={confirmationOpen} onOpenChange={setOpen} size="sm" background="stationary" title="Delete this file permanently?"
      description={`“${target?.name || ''}” will be removed. You won’t be able to restore it.`} focusSelector="[data-cancel]" returnFocus={() => heading.current}
      footer={<><A.Button variant="ghost" data-cancel onClick={() => setOpen(false)}>{deleting ? 'Close' : 'Cancel'}</A.Button><A.Button variant="danger" disabled={staleIntent} loading={!!deleting} onClick={deleteFile}>{deleting ? 'Deleting…' : deleteError && !staleIntent ? 'Retry deletion' : 'Delete permanently'}</A.Button></>}>
      <p className="aip-target"><strong>{target?.name}</strong><span>{target?.folder} · {target?.size}</span></p>
      {deleting && <p role="status">Deletion is in progress. Closing this dialog won’t cancel it.</p>}
      {deleteError && <A.Alert tone="critical" title={deleteError} />}
    </A.Dialog>
  </main>;
}
```
<!-- recipe-source:end -->

Mount it with the normal provider:

```jsx
export default function FilesApp() {
  const [service] = React.useState(() => createFilesService('success-100'));
  return (
    <A.AltitudeProvider>
      <div className="aip">
        <FilesExample service={service} full />
      </div>
    </A.AltitudeProvider>
  );
}
```

<!-- recipe-css:start -->
```css
.aip { max-width: 880px; margin: 0 auto; }
.aip-product { color: var(--ink); overflow-wrap: anywhere; }
.aip-header { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); margin-bottom: var(--space-5); }
.aip-header h2 { font: 600 24px/30px var(--font-sans); margin: var(--space-1) 0 0; }
.aip-eyebrow { font: 400 12.5px/17px var(--font-sans); margin: 0; color: var(--ink-muted); }
.aip-meta { font: 400 12.5px/17px var(--font-sans); color: var(--ink-muted); margin: var(--space-1) 0 0; }
.aip-toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--space-3); }
.aip-toolbar nav { display: flex; gap: var(--space-1); }
.aip-toolbar > .alt-input { flex: 1 1 170px; max-width: 260px; }
.aip-product h3 { font: 600 19px/26px var(--font-sans); margin: var(--space-6) 0 var(--space-2); }
.aip-product h3:focus { outline: 2px solid var(--accent-ink); outline-offset: 4px; }
.aip-list { list-style: none; margin: 0; padding: 0; }
.aip-list > li { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4) 0; border-bottom: 1px solid var(--line); }
.aip-file { flex: 1; min-width: 0; }
.aip-name { font: 400 15px/23px var(--font-sans); }
.aip-name strong { font-weight: 500; }
.aip-row-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
.aip-file > .alt-alert { margin-top: var(--space-3); }
.aip-recovery { margin-top: var(--space-5); }
.aip-completion { display: flex; align-items: center; gap: var(--space-2); margin: var(--space-5) 0 0; color: var(--ink-muted); font: 400 13.5px/20px var(--font-sans); }
.aip-completion svg { flex: none; }
.aip-completion:empty { margin: 0; }
.aip-recovery .alt-alert-action { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.aip-empty { padding: var(--space-6) var(--space-3); background: var(--surface-well); border: 1px dashed var(--line-control); border-radius: var(--radius-md); }
.aip-target { margin: 0; display: grid; gap: var(--space-2); overflow-wrap: anywhere; }
.aip-target span { color: var(--ink-muted); font: 400 12.5px/17px var(--font-sans); }
.aip-documentation { margin-top: var(--space-6); border-top: 1px solid var(--line); padding-top: var(--space-4); font: 400 12.5px/17px var(--font-sans); }
.aip a { color: var(--accent-ink); }
.aip-harness { margin-top: var(--space-4); color: var(--ink-muted); }
.aip-harness summary { cursor: pointer; }
.aip-harness label { display: grid; gap: var(--space-2); }
.aip-harness select { max-width: 100%; font: inherit; padding: var(--space-2); background: var(--surface-well); color: var(--ink); border: 1px solid var(--line-control); border-radius: var(--radius-sm); }
.aip-harness-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-3); }
.aip-harness pre { overflow: auto; max-height: 220px; font: 12px/1.5 var(--font-mono); }
@media (max-width: 600px) { #root { padding: 16px; } .aip-list > li { align-items: stretch; flex-direction: column; gap: var(--space-2); } .aip-row-actions { align-self: flex-start; } .aip-toolbar > .alt-input { max-width: none; } .aip-header > .aip-meta { display: none; } .aip-recovery .alt-alert-inner, .aip-file .alt-alert-inner { flex-wrap: wrap; } .aip-recovery .alt-alert-body, .aip-file .alt-alert-body { flex-basis: calc(100% - 60px); } .aip-recovery .alt-alert-action, .aip-file .alt-alert-action { width: 100%; } }
```
<!-- recipe-css:end -->

## Focus and accessible state

Row removal captures focus before changing the list and restores it only if focus still belongs to that row. It prefers the next corresponding action, then the previous action, then the list heading, using `preventScroll`. Asynchronous responses never reclaim focus after someone moves to search or another control. Pointer/touch actions do not send focus to the recovery region.

The Alert’s existing live role provides one result announcement. Pending text is outside busy controls, so `aria-busy` does not suppress the only progress announcement. The page remains usable while an ordinary write is pending. A modal makes recovery controls behind it inert regardless of their visual paint order. InlineEdit supplies retained input, validation/error associations, IME handling, and local keyboard behavior; the application does not reimplement them.

Every state has text or an ARIA equivalent when motion and shadows are absent. No new depth tier, timer-driven Undo expiry, preview stage, draft queue, hold gesture, or typed-name challenge is introduced.

## Verification and scope

[`build/checks/actions-in-place.mjs`](../build/checks/actions-in-place.mjs) exercises the canonical fixture model and browser interactions under React 18 and 19: duplicate requests, revision conflicts, uncertain outcomes, ordered feedback, dismissed/replaced recovery, targeted deletion, pending Close, old/new dialog sessions, focus recovery, reduced motion, increased contrast, forced colors, and narrow layouts. [The validation record](ActionsInPlaceValidation.md) distinguishes engineering evidence from remaining assistive-technology and participant gates.

[EditRegion](components/EditRegion/README.md) now edits several fields of one record in place with this guide's session rules (issue #12 proposed ItemGroup, PropertyList, DataTable row expansion and Board card editing as its multi-field consumers). ConfirmAction and a shared action hook remain deferred. These demos do not establish two independent real application needs for those abstractions, and they do not establish a measured usability benefit. Structural activation counts and proposed design intent are not participant results.
