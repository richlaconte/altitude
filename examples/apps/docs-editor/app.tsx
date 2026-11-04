// Example: the travel policy, in a docs editor (#405). The whole sync pattern in one editor, and a review round.
//   Task: a team writer drafts the travel policy and sends it to a reviewer.
//   Lead: the document. Primary action: Request review, then Publish once approved. Next: the published policy.
//   Frame: focused editor (screen-layout.md): Breadcrumb back, PageHeader with the one primary, SyncIndicator as the
//   status (saving is never a second button), the document filling the column with its details beside it, narrower.
//
// One persistence model in the writing surface: autosave. Each section is a Textarea (a well) in a Surface whose status
// carries that section's write: pending hovers after dur-grace, saved lands, failed drops into a trench with Retry and
// the text kept. A write goes about 800ms after typing stops, and at once on blur. EditRegion's explicit Save is used
// only for the details beside the document, a small record edited deliberately, so the two models never share a surface.
//
// Fixtures it handles: slow (sections hover until they land); offline and back (edits are kept and wait, the indicator
// says so, and they're sent in order when the connection returns, from service.onConnectivity); a conflict when someone
// else saved the same section (both versions, theirs in their presence colour, Keep mine / Keep theirs / Keep both,
// then focus back to the section's heading); a session that ends mid-save (the write waits, a sign-in dialog opens, and
// the queue replays once you're signed in: nothing typed is lost, nothing written twice); a lost response on a section
// or on Publish (read back before anything is retried, so nothing is published twice).
//
// Not here: real-time co-editing and cursors, and rich text (out of scope in #405). A simulated save proves nothing
// about a real server.
import * as React from 'react';
import {
  Alert, Avatar, Badge, Breadcrumb, Button, CommentThread, Dialog, DiffView, EditRegion, EditRegionForm, EditRegionView, Field,
  Input, PageHeader, PageHeaderDescription, PageHeaderTitle, PrimaryScope, Select, Skeleton, Surface, SyncIndicator, Textarea, Timeline,
  TimelineItem, diffChanges, diffLines,
} from 'altitude-design';
import type { DiffDecision, SyncState, ThreadComment } from 'altitude-design';
import { DemoError, errorMessage, isDemoError, useDemoQuery, useDemoService } from '../shared/react';
import { OTHER, REVIEWER, docText, events as serverEvents, service } from './data';
import type { Details, Doc, Section } from './data';

/** The drawer's "session about to end" warning: an app-side timer in a real product, an event here. */
const warning = new EventTarget();
export const events = [
  ...serverEvents,
  { label: 'The session is about to end', run: () => warning.dispatchEvent(new Event('warn')) },
];
export { service };

type WriteState = { status: 'pending' | 'waiting' | 'failed' | 'committed' | 'conflict'; error?: string; theirs?: Section };
const DEBOUNCE = 800;

/** Merge a reviewed suggestion: accepted changes take the new lines, rejected ones keep the old. */
function merge(before: string, after: string, decisions: Record<string, DiffDecision>) {
  const ops = diffLines(before, after), changes = diffChanges(ops), out: string[] = [];
  ops.forEach((op, i) => {
    const c = changes.find((x) => i >= x.from && i < x.to);
    if (!c || op.kind === 'same') { if (op.kind === 'same') out.push(op.text); return; }
    const accepted = decisions[c.id] === 'accept';
    if ((op.kind === 'add' && accepted) || (op.kind === 'del' && !accepted)) out.push(op.text);
  });
  return out.join('\n');
}

export function App() {
  const snap = useDemoService(service);
  const query = useDemoQuery<Doc, Doc>(service, 'doc.get');
  const doc = query.data;

  // What you've typed, per section, and the server revision it's based on. Refs, so timers and replays read the latest.
  const drafts = React.useRef<Record<string, string>>({});
  const base = React.useRef<Record<string, number>>({});
  const [, render] = React.useReducer((n: number) => n + 1, 0);
  const [writes, setWrites] = React.useState<Record<string, WriteState>>({});
  const writesRef = React.useRef(writes); writesRef.current = writes;
  const [syncedAt, setSyncedAt] = React.useState<number | undefined>(undefined);
  const [online, setOnline] = React.useState(() => service.isOnline());
  const [signIn, setSignIn] = React.useState(false);
  const [warn, setWarn] = React.useState(false);
  const [said, setSaid] = React.useState('');
  const timers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const inflight = React.useRef(new Set<string>());
  const again = React.useRef(new Set<string>());
  const waiting = React.useRef<string[]>([]);
  // The ref changes at once, so a save straight after (resolving a conflict, a replay) reads the new state.
  const mark = (id: string, w: WriteState | null) => {
    const next = { ...writesRef.current }; if (w) next[id] = w; else delete next[id];
    writesRef.current = next; setWrites(next);
  };

  // Reset starts over; a fresh read adopts the server's text for every section you haven't changed.
  React.useEffect(() => {
    if (!snap.resetRevision) return;
    drafts.current = {}; base.current = {}; serverText.current = {}; waiting.current = []; setWrites({}); setSyncedAt(undefined); render();
  }, [snap.resetRevision]);
  // The server's text at the revision each draft is based on: what "unchanged" means for a section.
  const serverText = React.useRef<Record<string, string>>({});
  const dirty = (id: string) => drafts.current[id] !== undefined && drafts.current[id] !== serverText.current[id];
  // A read (first load, or someone else's change) is adopted by every section you haven't changed and aren't saving.
  React.useEffect(() => {
    if (!doc) return;
    for (const s of doc.sections) {
      const busy = inflight.current.has(s.id) || /waiting|failed|conflict|pending/.test(writesRef.current[s.id]?.status ?? '');
      if (drafts.current[s.id] === undefined || (!dirty(s.id) && !busy)) { drafts.current[s.id] = s.body; base.current[s.id] = s.rev; serverText.current[s.id] = s.body; }
    }
    render();
  }, [doc]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (id: string): Promise<void> => {
    clearTimeout(timers.current[id]);
    if (inflight.current.has(id)) { again.current.add(id); return; }
    const w = writesRef.current[id];
    if (w?.status === 'conflict') return; // nothing is sent until you choose
    if (!dirty(id)) { if (w?.status === 'failed' || w?.status === 'waiting') mark(id, null); return; }
    const body = drafts.current[id], baseRev = base.current[id];
    inflight.current.add(id);
    mark(id, { status: 'pending' });
    try {
      const s = await service.request<Section>('section.save', { id, body, baseRev });
      landed(s);
    } catch (e) {
      const err = e instanceof DemoError ? e : new DemoError('failed', errorMessage(e));
      if (err.kind === 'offline' || err.kind === 'unauthorized') {
        // Queued, not refused: it waits and goes in order once the connection or the session is back.
        if (!waiting.current.includes(id)) waiting.current.push(id);
        mark(id, { status: 'waiting' });
        if (err.kind === 'unauthorized') setSignIn(true);
      } else if (err.kind === 'conflict') {
        mark(id, { status: 'conflict', theirs: err.current as Section });
        setSaid(`${(err.current as Section)?.editedBy ?? 'Someone'} changed “${(err.current as Section)?.heading}” while you were editing. Choose which version to keep.`);
      } else if (err.kind === 'lost-response') {
        // Don't guess: read the section back. Saved means it's there at a newer revision with this text.
        try {
          const now = await service.request<Doc>('doc.get');
          const s = now.sections.find((x) => x.id === id);
          if (s && s.body === body && s.rev > baseRev) landed(s);
          else mark(id, { status: 'failed', error: 'It wasn’t saved.' });
        } catch { mark(id, { status: 'failed', error: 'We couldn’t check whether it was saved. Retry won’t save it twice.' }); }
      } else {
        mark(id, { status: 'failed', error: err.message });
      }
    } finally {
      inflight.current.delete(id);
      if (again.current.delete(id) && writesRef.current[id]?.status !== 'conflict') void save(id);
    }
  };
  const landed = (s: Section) => {
    base.current[s.id] = s.rev; serverText.current[s.id] = s.body;
    waiting.current = waiting.current.filter((x) => x !== s.id);
    query.setData((d) => d && { ...d, sections: d.sections.map((x) => (x.id === s.id ? s : x)) });
    setSyncedAt(Date.now());
    mark(s.id, dirty(s.id) ? { status: 'pending' } : { status: 'committed' });
    if (dirty(s.id)) again.current.add(s.id);
  };
  const flush = async () => { const q = [...waiting.current]; waiting.current = []; for (const id of q) await save(id); };
  const saveAll = async () => { if (doc) for (const s of doc.sections) await save(s.id); };

  React.useEffect(() => service.onConnectivity((on) => { setOnline(on); if (on) void flush(); }), []); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { const f = () => setWarn(true); warning.addEventListener('warn', f); return () => warning.removeEventListener('warn', f); }, []);

  const type = (id: string, text: string) => {
    drafts.current[id] = text; render();
    if (writesRef.current[id]?.status === 'committed') mark(id, null);
    clearTimeout(timers.current[id]);
    if (writesRef.current[id]?.status === 'waiting') return; // it goes with the queue
    timers.current[id] = setTimeout(() => void save(id), DEBOUNCE);
  };

  // Conflicts: both versions, then focus back to the section's heading.
  const resolve = (s: Section, theirs: Section, choice: 'mine' | 'theirs' | 'both') => {
    const mine = drafts.current[s.id];
    drafts.current[s.id] = choice === 'mine' ? mine : choice === 'theirs' ? theirs.body : `${mine}\n${theirs.body}`;
    base.current[s.id] = theirs.rev; serverText.current[s.id] = theirs.body;
    query.setData((d) => d && { ...d, sections: d.sections.map((x) => (x.id === s.id ? theirs : x)) });
    mark(s.id, null);
    setSaid(choice === 'theirs' ? `Kept ${theirs.editedBy ?? 'their'} version of “${s.heading}”.` : `Keeping ${choice === 'mine' ? 'your version' : 'both versions'} of “${s.heading}”; saving.`);
    requestAnimationFrame(() => document.getElementById(`de-h-${s.id}`)?.focus());
    if (choice !== 'theirs') void save(s.id);
  };

  // The review round and publishing. Each reads back on a lost response, so nothing happens twice.
  const [busy, setBusy] = React.useState<'review' | 'publish' | null>(null);
  const [roundError, setRoundError] = React.useState('');
  const round = async (op: 'review.request' | 'doc.publish', done: (d: Doc) => boolean, word: string) => {
    setBusy(op === 'review.request' ? 'review' : 'publish'); setRoundError('');
    try {
      await saveAll();
      const d = await service.request<Doc>(op);
      query.setData(() => d); setSaid(word);
    } catch (e) {
      if (isDemoError(e, 'lost-response')) {
        try { const d = await service.request<Doc>('doc.get'); if (done(d)) { query.setData(() => d); setSaid(word); } else setRoundError('It didn’t go through. Try again.'); }
        catch { setRoundError('We couldn’t check whether it went through. Trying again won’t do it twice.'); }
      } else if (isDemoError(e, 'unauthorized')) { setSignIn(true); setRoundError('Sign in again, then try again.'); }
      else setRoundError(errorMessage(e));
    } finally { setBusy(null); }
  };

  if (!doc) {
    return <main className="de"><PageHeader><PageHeaderTitle>Travel policy</PageHeaderTitle></PageHeader>
      {query.error ? <Alert tone="critical" title="We couldn’t open the document" action={<Button size="sm" onClick={() => void query.reload()}>Try again</Button>}>{errorMessage(query.error)}</Alert>
        : <div role="status" aria-label="Loading the document"><Skeleton shape="text" lines={8} /></div>}</main>;
  }

  const ids = doc.sections.map((s) => s.id);
  const conflicts = ids.filter((id) => writes[id]?.status === 'conflict');
  const failed = ids.filter((id) => writes[id]?.status === 'failed');
  const queued = ids.filter((id) => writes[id]?.status === 'waiting');
  const unsent = ids.filter((id) => dirty(id) || writes[id]?.status === 'pending');
  const notOnServer = new Set([...conflicts, ...failed, ...queued, ...unsent]);
  // "Saved" only when nothing typed is unacknowledged.
  const state: SyncState = conflicts.length ? 'conflict' : queued.length && !online ? 'offline' : failed.length ? 'failed' : notOnServer.size ? 'saving' : 'saved';
  const heading = (id: string) => doc.sections.find((s) => s.id === id)?.heading ?? id;

  const primary = doc.status === 'draft'
    ? <Button variant="primary" loading={busy === 'review'} onClick={() => void round('review.request', (d) => d.status !== 'draft', `Sent to ${doc.reviewer} for review.`)}>Request review</Button>
    : doc.status === 'approved'
      ? <Button variant="primary" loading={busy === 'publish'} onClick={() => void round('doc.publish', (d) => d.status === 'published', 'Published.')}>Publish</Button>
      : undefined;
  const plate = doc.status === 'in-review' ? <Badge tone="neutral">In review · {doc.reviewer}</Badge>
    : doc.status === 'approved' ? <Badge tone="positive">Approved by {doc.reviewer}</Badge>
      : doc.status === 'published' ? <Badge tone="positive">Published · version {doc.published}</Badge> : null;

  return (
    <main className="de">
      <PageHeader breadcrumb={<Breadcrumb items={[{ label: 'Policies', href: '#' }, { label: doc.title }]} />} primary={primary}
        actions={<>{plate}<SyncIndicator state={state} pending={notOnServer.size} conflicts={conflicts.length} lastSyncedAt={syncedAt}
          onRetry={() => failed.forEach((id) => void save(id))} onOpenConflicts={() => document.getElementById(`de-conflict-${conflicts[0]}`)?.focus()}
          queue={notOnServer.size ? <ul className="de-queue">{[...notOnServer].map((id) => <li key={id}>{heading(id)}</li>)}</ul> : undefined} /></>}>
        <PageHeaderTitle>{doc.title}</PageHeaderTitle>
        <PageHeaderDescription>
          {doc.status === 'draft' ? `Changes save as you type. Request review when it's ready for ${doc.reviewer}.`
            : doc.status === 'in-review' ? `${doc.reviewer} is reviewing it. You can keep editing; she'll see the latest.`
              : doc.status === 'approved' ? `${doc.reviewer} approved it. Publish to make it the policy everyone sees.`
                : `This version is the policy everyone sees. Changes you make now are a new draft.`}
        </PageHeaderDescription>
      </PageHeader>
      {roundError && <Alert tone="critical" title="That didn’t go through">{roundError}</Alert>}
      {!online && <p className="de-offline" role="status">You’re offline. Your changes are kept here and will be sent when you’re back.</p>}

      <div className="de-layout">
        <article className="de-doc" aria-label={doc.title}>
          {doc.sections.map((s) => {
            const w = writes[s.id];
            const surface = w?.status === 'pending' || w?.status === 'waiting' ? 'pending' : w?.status === 'failed' ? 'failed' : w?.status === 'committed' ? 'committed' : undefined;
            const words = w?.status === 'pending' ? 'Saving…' : w?.status === 'waiting' ? (online ? 'Waiting for you to sign in. Your text is kept.' : 'Waiting to sync. Your text is kept.') : w?.status === 'failed' ? `Not saved. ${w.error ?? ''}` : '';
            const sug = doc.suggestion?.section === s.id ? doc.suggestion : null;
            return (
              <section key={s.id} className="de-section" aria-labelledby={`de-h-${s.id}`}>
                <Surface level={0} status={surface} className="de-sec">
                  <h2 id={`de-h-${s.id}`} tabIndex={-1} className="de-h">{s.heading}</h2>
                  <Textarea value={drafts.current[s.id] ?? s.body} onChange={(e) => type(s.id, e.target.value)} onBlur={() => void save(s.id)}
                    aria-labelledby={`de-h-${s.id}`} aria-describedby={`de-st-${s.id}`} rows={Math.max(3, (drafts.current[s.id] ?? s.body).split('\n').length + 1)} />
                  <div className="de-st" id={`de-st-${s.id}`}>
                    {words && <span data-tone={w?.status}>{words}</span>}
                    {w?.status === 'failed' && <Button size="sm" onClick={() => void save(s.id)} aria-label={`Retry saving ${s.heading}`}>Retry</Button>}
                  </div>
                </Surface>
                {w?.status === 'conflict' && w.theirs && (
                  <Surface level={1} className="de-conflict" role="group" aria-labelledby={`de-conflict-${s.id}`}>
                    <h3 id={`de-conflict-${s.id}`} tabIndex={-1} className="de-ch">Changed by {w.theirs.editedBy ?? 'someone'} while you were editing</h3>
                    <div className="de-versions">
                      <div className="de-version"><div className="de-who">Your version</div><p>{drafts.current[s.id]}</p></div>
                      <div className="de-version" data-presence="2"><div className="de-who"><Avatar name={w.theirs.editedBy ?? OTHER} size={20} presence={2} lamp={false} /> {w.theirs.editedBy ?? 'Their'}’s version</div><p>{w.theirs.body}</p></div>
                    </div>
                    <div className="de-actions">
                      <Button onClick={() => resolve(s, w.theirs!, 'mine')}>Keep mine</Button>
                      <Button onClick={() => resolve(s, w.theirs!, 'theirs')}>Keep theirs</Button>
                      <Button onClick={() => resolve(s, w.theirs!, 'both')}>Keep both</Button>
                    </div>
                  </Surface>
                )}
                {sug && <Suggestion key={sug.after} section={s} before={sug.before} after={sug.after} by={sug.by}
                  onApply={async (text) => { drafts.current[s.id] = text; render(); await save(s.id); await service.request('suggestion.resolve').catch(() => undefined); void query.reload(); }} />}
                {(doc.comments[s.id]?.length ?? 0) > 0 && <Comments section={s} comments={doc.comments[s.id]} onAdded={(c) => query.setData((d) => d && { ...d, comments: { ...d.comments, [s.id]: [...(d.comments[s.id] ?? []).filter((x) => x.id !== c.id), c] } })} />}
              </section>
            );
          })}
        </article>
        <aside className="de-side" aria-label="Details and versions">
          <DetailsPane doc={doc} onSaved={(details, rev) => query.setData((d) => d && { ...d, details, detailsRev: rev })} />
          <Versions doc={doc} current={docText(doc.sections.map((s) => ({ heading: s.heading, body: drafts.current[s.id] ?? s.body })))} />
        </aside>
      </div>

      <Dialog open={signIn} onOpenChange={() => undefined} dismissible={false} background="stationary" size="sm" title="Sign in to keep saving"
        description="Your session ended. Everything you typed is kept here and will be saved once you're signed in."
        footer={<Button variant="primary" onClick={() => { service.signIn(); setSignIn(false); void flush(); }}>Sign in again</Button>}>
        <p className="de-dialog-note">Signed in as Sam Rivera.</p>
      </Dialog>
      <Dialog open={warn} onOpenChange={() => undefined} dismissible={false} background="stationary" size="sm" title="Your session ends in 2 minutes"
        description="Stay signed in to keep saving. Your draft is kept either way."
        footer={<Button variant="primary" onClick={() => setWarn(false)}>Stay signed in</Button>} />
      <span className="de-sr" role="status">{said}</span>
    </main>
  );
}

/** A reviewer's suggested changes to one section, decided hunk by hunk. Applying them saves the section once. */
function Suggestion({ section, before, after, by, onApply }: { section: Section; before: string; after: string; by: string; onApply: (text: string) => Promise<void> }) {
  const [decisions, setDecisions] = React.useState<Record<string, DiffDecision>>({});
  const changes = React.useMemo(() => diffChanges(diffLines(before, after)), [before, after]);
  const decided = changes.every((c) => decisions[c.id]);
  const [applying, setApplying] = React.useState(false);
  return (
    <div className="de-suggestion">
      <DiffView review before={before} after={after} caption={`${by} suggests changes to “${section.heading}”`} decisions={decisions}
        onDecide={(id, d) => setDecisions((x) => ({ ...x, [id]: d }))}
        onDecideAll={(d) => setDecisions(Object.fromEntries(changes.map((c) => [c.id, d])))} />
      <div className="de-actions">
        <span className="de-hint">{decided ? 'Every change is decided.' : `${changes.length - Object.keys(decisions).length} of ${changes.length} changes still to decide.`}</span>
        <Button variant="secondary" loading={applying} onClick={async () => { if (!decided) return; setApplying(true); await onApply(merge(before, after, decisions)); setApplying(false); }}
          aria-describedby={undefined}>{decided ? 'Apply decisions' : 'Decide every change to apply'}</Button>
      </div>
    </div>
  );
}

/** The reviewer's comments under a section; posting hovers as pending and fails into a trench with Retry. */
function Comments({ section, comments, onAdded }: { section: Section; comments: ThreadComment[]; onAdded: (c: ThreadComment) => void }) {
  const [local, setLocal] = React.useState<ThreadComment[]>([]);
  const send = async (c: ThreadComment) => {
    setLocal((l) => [...l.filter((x) => x.id !== c.id), { ...c, status: 'pending' }]);
    try {
      await service.request('comment.add', { section: section.id, comment: { ...c, status: undefined } });
      setLocal((l) => l.filter((x) => x.id !== c.id)); onAdded({ ...c, status: undefined });
    } catch { setLocal((l) => l.map((x) => (x.id === c.id ? { ...x, status: 'failed' } : x))); }
  };
  const shown = [...comments.filter((c) => !local.some((l) => l.id === c.id)), ...local];
  // The thread is its own part with its own action (Comment), so it's its own primary scope: the page's one primary
  // stays Request review or Publish (#480).
  return <PrimaryScope name={`comments on ${section.heading}`}><CommentThread aria-label={`Comments on ${section.heading}`} comments={shown}
    onPost={(body) => void send({ id: `c-${Date.now().toString(36)}`, author: { name: 'Sam Rivera' }, body, createdAt: Date.now(), mine: true })}
    onRetry={(id) => { const c = local.find((x) => x.id === id); if (c) void send(c); }} /></PrimaryScope>;
}

/** The document's details: a small record edited deliberately, so EditRegion's explicit Save fits here. */
function DetailsPane({ doc, onSaved }: { doc: Doc; onSaved: (d: Details, rev: number) => void }) {
  return (
    <section className="de-panel" aria-labelledby="de-details-h">
      <h2 id="de-details-h" className="de-panel-h">Details</h2>
      <EditRegion<Details> label="Details" value={doc.details} onValueChange={(v) => onSaved(v, doc.detailsRev + 1)}
        onSave={async (draft) => {
          try {
            const r = await service.request<{ details: Details; rev: number }>('details.save', { details: draft, baseRev: doc.detailsRev });
            onSaved(r.details, r.rev);
            return { ok: true, value: r.details };
          } catch (e) {
            if (isDemoError(e, 'lost-response')) {
              const d = await service.request<Doc>('doc.get').catch(() => null);
              if (d && JSON.stringify(d.details) === JSON.stringify(draft)) { onSaved(d.details, d.detailsRev); return { ok: true, value: d.details }; }
            }
            return { ok: false, error: errorMessage(e), fieldErrors: e instanceof DemoError && e.field ? { [e.field]: e.message } : undefined };
          }
        }}>
        <EditRegionView>
          <dl className="de-dl">
            <dt>Owner</dt><dd>{doc.details.owner}</dd>
            <dt>Next review</dt><dd>{new Date(`${doc.details.reviewDate}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
            <dt>Audience</dt><dd>{doc.details.audience}</dd>
          </dl>
        </EditRegionView>
        <EditRegionForm<Details>>
          {(field) => <>
            <Field label="Owner" required error={field.error('owner')}><Input {...field('owner')} /></Field>
            <Field label="Next review"><Input type="date" {...field('reviewDate')} /></Field>
            <Field label="Audience"><Input {...field('audience')} /></Field>
          </>}
        </EditRegionForm>
      </EditRegion>
    </section>
  );
}

/** Saved versions as a Timeline; choose two to compare them, read-only and flush. */
function Versions({ doc, current }: { doc: Doc; current: string }) {
  const items = [...doc.versions.map((v) => ({ value: String(v.n), label: `Version ${v.n}: ${v.label}` })), { value: 'now', label: 'Now (your latest)' }];
  const [a, setA] = React.useState(String(Math.max(1, doc.versions.length - 1)));
  const [b, setB] = React.useState('now');
  const text = (k: string) => (k === 'now' ? current : doc.versions.find((v) => String(v.n) === k)?.text ?? '');
  return (
    <section className="de-panel" aria-labelledby="de-versions-h">
      <h2 id="de-versions-h" className="de-panel-h">Versions</h2>
      <Timeline>
        {[...doc.versions].reverse().map((v) => <TimelineItem key={v.n} time={v.at}>Version {v.n}: {v.label}, by {v.by}</TimelineItem>)}
      </Timeline>
      <div className="de-compare">
        <Field label="Compare"><Select value={a} onValueChange={setA} items={items} size="sm" /></Field>
        <Field label="with"><Select value={b} onValueChange={setB} items={items} size="sm" /></Field>
      </div>
      {text(a) === text(b) ? <p className="de-hint">These two are the same.</p>
        : <DiffView before={text(a)} after={text(b)} caption={`${items.find((i) => i.value === a)?.label} → ${items.find((i) => i.value === b)?.label}`} context={1} />}
    </section>
  );
}

