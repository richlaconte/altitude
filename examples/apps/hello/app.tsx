// Example: Team notes. The smallest app on the shared simulated service (#400), proving the path every example app takes.
//   Task: a team member adds a note to the team's list and sees that it was saved.
//   Lead: the list of notes. Primary action: Add note. Next: the note, saved, at the top of the list.
// It handles every mode the fixtures drawer offers: a pending note hovers until it lands; a failed one drops into a
// trench with Try again; a lost response is reconciled by reading the list back before anything is retried, and adds
// are idempotent by id, so a retry never makes a duplicate; a teammate's note arrives and settles.
import * as React from 'react';
import { Alert, Button, Card, EmptyState, Field, Input, PageHeader, PageHeaderDescription, PageHeaderTitle, RelativeTime } from 'altitude-design';
import { createDemoService, reject, useDemoService, DemoError } from '../shared/react';

export interface Note { id: string; text: string; author: string; at: number }
interface Store { notes: Note[] }

const T0 = Date.UTC(2026, 10, 2, 9, 0);
const seed = (): Store => ({
  notes: [
    { id: 'n-2', text: 'Retro moved to Thursday at 15:00.', author: 'Priya', at: T0 - 3_600_000 },
    { id: 'n-1', text: 'The staging database is read-only until noon.', author: 'Tomás', at: T0 - 7_200_000 },
  ],
});

export const service = createDemoService<Store>({
  name: 'hello',
  seed,
  persist: true,
  handlers: {
    'notes.list': { read: (s) => s.notes },
    'notes.add': {
      write: (s, input: Note) => {
        if (!input.text.trim()) reject('invalid', 'Write the note first.', { field: 'text' });
        // Idempotent by id: retrying an add that was saved returns the saved note.
        const existing = s.notes.find((n) => n.id === input.id);
        if (existing) return { state: s, result: existing };
        return { state: { notes: [input, ...s.notes] }, result: input };
      },
      current: (s) => s.notes,
    },
  },
});

export const events = [{
  label: 'A teammate adds a note',
  run: () => service.external('Priya adds a note', (s) => ({ notes: [{ id: `n-ext-${s.notes.length + 1}`, text: 'Deploy freeze starts Friday at 17:00.', author: 'Priya', at: Date.now() }, ...s.notes] })),
}];

type Row = Note & { status?: 'pending' | 'committed' | 'failed'; error?: string; arrived?: number };
let counter = 0;
const newId = () => `n-${Date.now().toString(36)}-${++counter}`;

export function App() {
  const snap = useDemoService(service);
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [loadError, setLoadError] = React.useState('');
  const [text, setText] = React.useState('');
  const [fieldError, setFieldError] = React.useState('');
  const [arrival, setArrival] = React.useState('');
  const input = React.useRef<HTMLInputElement>(null);

  // Read the list from the server, keeping notes still in flight or failed, which the server doesn't have.
  const load = React.useCallback(async () => {
    setLoadError('');
    try {
      const notes = await service.request<Note[]>('notes.list');
      setRows((prev) => {
        const local = (prev ?? []).filter((r) => (r.status === 'pending' || r.status === 'failed') && !notes.some((n) => n.id === r.id));
        // A note this list hasn't shown before arrives lifted and settles; the first load is simply there.
        const now = Date.now();
        return [...local, ...notes.map((n): Row => {
          const before = prev?.find((r) => r.id === n.id);
          return { ...n, status: before?.status === 'committed' ? 'committed' : undefined, arrived: prev && !before ? now : before?.arrived };
        })];
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  // Reset starts over: notes still in flight or failed belong to the old data, so they go too.
  React.useEffect(() => { if (snap.resetRevision) { setRows(null); setText(''); setFieldError(''); setArrival(''); } }, [snap.resetRevision]);
  React.useEffect(() => { void load(); }, [load, snap.externalRevision, snap.resetRevision]);

  const send = async (note: Note) => {
    setRows((prev) => [{ ...note, status: 'pending' }, ...(prev ?? []).filter((r) => r.id !== note.id)]);
    const mark = (patch: Partial<Row>) => setRows((prev) => (prev ?? []).map((r) => (r.id === note.id ? { ...r, ...patch } : r)));
    try {
      await service.request('notes.add', note);
      mark({ status: 'committed', error: undefined });
    } catch (e) {
      const err = e instanceof DemoError ? e : new DemoError('failed', String(e));
      if (err.kind === 'lost-response') {
        // Don't guess: read the list back and see whether it was saved.
        try {
          const notes = await service.request<Note[]>('notes.list');
          if (notes.some((n) => n.id === note.id)) { mark({ status: 'committed', error: undefined }); return; }
          mark({ status: 'failed', error: 'It wasn’t saved. Try again.' });
        } catch {
          mark({ status: 'failed', error: 'We couldn’t check whether it was saved. Try again: it won’t be added twice.' });
        }
        return;
      }
      mark({ status: 'failed', error: err.message });
    }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) { setFieldError('Write the note first.'); input.current?.focus(); return; }
    setFieldError('');
    void send({ id: newId(), text: text.trim(), author: 'You', at: Date.now() });
    setText('');
  };

  // Say who added a note from elsewhere, politely; never move focus for it.
  React.useEffect(() => {
    if (!snap.externalRevision) return;
    const latest = snap.log.find((e) => e.status === 'external');
    if (latest) setArrival(`${latest.op}.`);
  }, [snap.externalRevision]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="hello">
      <PageHeader>
        <PageHeaderTitle>Team notes</PageHeaderTitle>
        <PageHeaderDescription>Short notes for everyone on the team, newest first.</PageHeaderDescription>
      </PageHeader>
      <form className="hello-add" onSubmit={add} noValidate>
        <Field label="New note" error={fieldError || undefined}>
          <Input ref={input} value={text} onChange={(e) => { setText(e.target.value); if (fieldError) setFieldError(''); }} placeholder="The office is closed on Monday." />
        </Field>
        <Button type="submit" variant="primary">Add note</Button>
      </form>
      {loadError && rows === null && (
        <Alert tone="critical" title="We couldn’t load the notes" action={<Button size="sm" onClick={() => void load()}>Try again</Button>}>{loadError}</Alert>
      )}
      {rows === null && !loadError && <p className="hello-loading" role="status">Loading notes…</p>}
      {rows !== null && rows.length === 0 && <EmptyState title="No notes yet" description="Notes you and your team add appear here." headingLevel={2} />}
      {rows !== null && rows.length > 0 && (
        <ul className="hello-list" aria-label="Notes">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="hello-note" status={r.status} settle={r.arrived}>
                <p className="hello-text">{r.text}</p>
                <p className="hello-meta">
                  {r.author} · <RelativeTime date={r.at} />
                  {r.status === 'pending' && <> · <span>Saving…</span></>}
                  {r.status === 'failed' && <> · <span className="hello-failed">Not saved</span></>}
                </p>
                {r.status === 'failed' && (
                  <div className="hello-retry">
                    <span className="hello-meta">{r.error}</span>
                    <Button size="sm" onClick={() => void send(r)}>Try again</Button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <span className="hello-sr" role="status">{arrival}</span>
    </main>
  );
}
