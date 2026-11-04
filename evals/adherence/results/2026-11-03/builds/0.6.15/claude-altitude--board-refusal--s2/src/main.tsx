import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider, Board, BoardCard, BoardColumn, Icons, PageHeader, PageHeaderDescription, PageHeaderTitle,
  Switch, Toaster, toast,
} from 'altitude-design';
import type { BoardMove } from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import {
  COLUMN_IDS, COLUMN_TITLES, IN_PROGRESS_LIMIT, initialColumns, locate, moveTicket,
} from './server';
import type { ColumnId, Columns, Ticket } from './server';

type Write =
  | { status: 'pending'; to: ColumnId }
  | { status: 'committed' }
  | { status: 'failed'; note: string };

function place(cols: Columns, cardId: string, to: { column: ColumnId; index: number }): Columns {
  const next = { todo: cols.todo.slice(), doing: cols.doing.slice(), done: cols.done.slice() };
  let card: Ticket | undefined;
  for (const c of COLUMN_IDS) {
    const i = next[c].findIndex(t => t.id === cardId);
    if (i >= 0) [card] = next[c].splice(i, 1);
  }
  if (!card) return cols;
  const target = next[to.column];
  target.splice(Math.max(0, Math.min(to.index, target.length)), 0, card);
  return next;
}

function where(cols: Columns, cardId: string) {
  for (const column of COLUMN_IDS) {
    const index = cols[column].findIndex(t => t.id === cardId);
    if (index >= 0) return { column, index, ticket: cols[column][index] };
  }
  return null;
}

// The Board calls onMove for every keyboard step. A ticket still in the keyboard hand isn't saved
// until it's dropped, so one carry is one write.
const isHeld = (id: string) =>
  !!document.querySelector(`[data-board-card="${CSS.escape(id)}"] > .alt-board-card-face[aria-pressed="true"]`);

function App() {
  const [cols, setCols] = React.useState<Columns>(initialColumns);
  const colsRef = React.useRef(cols);
  const commit = (next: Columns) => { colsRef.current = next; setCols(next); };

  const [writes, setWrites] = React.useState<Record<string, Write | undefined>>({});
  const setWrite = (id: string, w: Write | undefined) => setWrites(ws => ({ ...ws, [id]: w }));
  const [said, setSaid] = React.useState('');

  // Simulated-server controls.
  const [failNext, setFailNext] = React.useState(false);
  const [slow, setSlow] = React.useState(false);
  const options = React.useRef({ failNext, slow });
  options.current = { failNext, slow };

  const seq = React.useRef<Record<string, number>>({});
  const inFlight = React.useRef<Record<string, number>>({});
  const waiting = React.useRef<Set<string>>(new Set());

  const sync = async (id: string) => {
    const here = where(colsRef.current, id);
    if (!here) return;
    const there = locate(id);
    if (!inFlight.current[id] && here.column === there.column && here.index === there.index) {
      // Carried back to where the server already has it (Escape, or a round trip): nothing to save.
      setWrite(id, undefined);
      return;
    }
    const mine = (seq.current[id] = (seq.current[id] ?? 0) + 1);
    const unreachable = options.current.failNext;
    if (unreachable) setFailNext(false);
    setWrite(id, { status: 'pending', to: here.column });
    inFlight.current[id] = (inFlight.current[id] ?? 0) + 1;
    const result = await moveTicket(id, here.column, here.index, {
      latency: options.current.slow ? 3000 : 700,
      unreachable,
    }).finally(() => { inFlight.current[id] -= 1; });
    if (seq.current[id] !== mine) return; // A later move of this ticket decides where it ends up.
    const title = here.ticket.title;
    if (result.ok) {
      setWrite(id, { status: 'committed' });
      setSaid(`Saved: ${title} is in ${COLUMN_TITLES[here.column]}.`);
      return;
    }
    // Refused: put the ticket back where the server has it, and say why.
    const back = locate(id);
    commit(place(colsRef.current, id, back));
    const note = `${result.reason} It’s back in ${COLUMN_TITLES[back.column]}.`;
    setWrite(id, { status: 'failed', note });
    setSaid(`Not moved: ${title}. ${note}`);
    toast({ tone: 'critical', title: `Couldn’t move ${here.ticket.ref}`, description: note, announce: false });
  };

  const scheduleSync = (id: string) => {
    if (waiting.current.has(id)) return;
    waiting.current.add(id);
    const check = () => {
      if (isHeld(id)) { setTimeout(check, 120); return; }
      waiting.current.delete(id);
      void sync(id);
    };
    setTimeout(check, 0);
  };

  const onMove = ({ cardId, to }: BoardMove) => {
    commit(place(colsRef.current, cardId, { column: to.column as ColumnId, index: to.index }));
    setWrites(ws => (ws[cardId]?.status === 'failed' ? { ...ws, [cardId]: undefined } : ws));
    scheduleSync(cardId);
  };

  const detail = (t: Ticket) => {
    const w = writes[t.id];
    if (w?.status === 'failed') {
      return <small className="ticket-note ticket-note-failed"><Icons.AlertCircle size={14} aria-hidden="true" /><span><strong>Not moved.</strong> {w.note}</span></small>;
    }
    if (w?.status === 'pending') {
      return <small className="ticket-note"><Icons.Refresh size={14} aria-hidden="true" /><span>Saving move to {COLUMN_TITLES[w.to]}…</span></small>;
    }
    return <small>{t.ref} · {t.queue} · {t.assignee}</small>;
  };

  return (
    <main className="page">
      <PageHeader>
        <PageHeaderTitle>Support queue</PageHeaderTitle>
        <PageHeaderDescription>
          Drag a ticket to another column, or focus it, press Space, use the arrow keys and press Space again to drop it.
          In progress holds at most {IN_PROGRESS_LIMIT} tickets.
        </PageHeaderDescription>
      </PageHeader>

      <Board onMove={onMove} aria-label="Support tickets">
        {COLUMN_IDS.map(column => (
          <BoardColumn key={column} id={column} title={COLUMN_TITLES[column]}>
            {cols[column].map(t => (
              <BoardCard key={t.id} id={t.id} label={t.title} status={writes[t.id]?.status}>
                {t.title}
                {detail(t)}
              </BoardCard>
            ))}
          </BoardColumn>
        ))}
      </Board>

      <p className="board-status" role="status">{said}</p>

      <details className="fixtures">
        <summary>Simulated server</summary>
        <p className="fixtures-hint">There’s no backend. These settings change how the simulated server answers.</p>
        <Switch label="Refuse the next move as unreachable" checked={failNext} onCheckedChange={setFailNext} />
        <Switch label="Answer slowly (3 seconds)" checked={slow} onCheckedChange={setSlow} />
      </details>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
    <Toaster />
  </AltitudeProvider>,
);
