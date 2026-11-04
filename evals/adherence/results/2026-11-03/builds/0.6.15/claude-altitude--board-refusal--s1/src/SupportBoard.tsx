import * as React from 'react';
import { Board, BoardCard, BoardColumn, PageHeader, PageHeaderDescription, PageHeaderTitle, Switch, toast } from 'altitude-design';
import type { BoardMove } from 'altitude-design';
import {
  COLUMN_ORDER, COLUMN_TITLES, IN_PROGRESS_LIMIT, SupportDeskServer, initialColumns, locate,
} from './server';
import type { ColumnId, Columns, Place, Ticket } from './server';

const server = new SupportDeskServer(initialColumns);

type Write =
  | { status: 'pending'; to: ColumnId }
  | { status: 'committed' }
  | { status: 'failed'; reason: string; backIn: ColumnId };

const samePlace = (a: Place, b: Place) => a.column === b.column && a.index === b.index;

function place(cols: Columns, from: Place, to: Place): Columns {
  const next: Columns = { todo: [...cols.todo], doing: [...cols.doing], done: [...cols.done] };
  const [card] = next[from.column].splice(from.index, 1);
  if (!card) return cols;
  next[to.column].splice(Math.min(to.index, next[to.column].length), 0, card);
  return next;
}

/** True while the board has this card in a keyboard hand (Space pressed, arrows moving it, not yet dropped). */
function inHand(id: string) {
  return !!document.querySelector(`[data-board-card="${CSS.escape(id)}"] > .alt-board-card-face[aria-pressed="true"]`);
}

// Lucide-style line icons, 24px grid, 1.75 stroke, in currentColor, so status is a word and an icon, not colour alone.
const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg className="sb-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const AlertIcon = () => <Icon><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></Icon>;
const ClockIcon = () => <Icon><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Icon>;

export function SupportBoard() {
  const [cols, setCols] = React.useState<Columns>(initialColumns);
  const colsRef = React.useRef(cols);
  const [writes, setWrites] = React.useState<Record<string, Write>>({});
  const [outcome, setOutcome] = React.useState<string>('');
  const [dropNext, setDropNext] = React.useState(false);
  const [slow, setSlow] = React.useState(false);

  // Where each card was (by the server's account) when the person started carrying it. A keyboard carry calls
  // onMove once per arrow key; we keep those steps local and send one move when the card is dropped.
  const origins = React.useRef(new Map<string, Place>());
  // The latest move sent for each card; an older answer never overrides a newer move.
  const seq = React.useRef(new Map<string, number>());

  const commitCols = (next: Columns) => { colsRef.current = next; setCols(next); };
  const setWrite = (id: string, w: Write) => setWrites(ws => ({ ...ws, [id]: w }));
  const ticketOf = (id: string) => Object.values(colsRef.current).flat().find(t => t.id === id) as Ticket;

  React.useEffect(() => { server.fixtures.dropNextMove = dropNext; }, [dropNext]);
  React.useEffect(() => { server.fixtures.latency = slow ? 3000 : 800; }, [slow]);

  const send = async (id: string, to: Place) => {
    const n = (seq.current.get(id) ?? 0) + 1;
    seq.current.set(id, n);
    const title = ticketOf(id).title;
    setWrite(id, { status: 'pending', to: to.column });
    const result = await server.moveTicket(id, to);
    setDropNext(server.fixtures.dropNextMove);
    if (seq.current.get(id) !== n) return; // a newer move for this card is in flight; its answer decides

    if (result.ok) {
      setWrite(id, { status: 'committed' });
      setOutcome(`Saved: “${title}” is in ${COLUMN_TITLES[result.at.column]}.`);
      return;
    }

    // Refused: put the card back where the server has it, and say why on the card and in a toast.
    const backIn = result.at.column;
    setWrite(id, { status: 'failed', reason: result.reason, backIn });
    const message = `Couldn’t move “${title}”. ${result.reason} It’s back in ${COLUMN_TITLES[backIn]}.`;
    setOutcome(message);
    toast({ title: `Couldn’t move “${title}”`, description: `${result.reason} It’s back in ${COLUMN_TITLES[backIn]}.`, tone: 'critical', announce: false });

    if (origins.current.has(id)) {
      // The person has picked the card up again; don't pull it out of their hand. Measure the next drop from the truth.
      origins.current.set(id, result.at);
      return;
    }
    const now = locate(colsRef.current, id);
    if (now && !samePlace(now, result.at)) commitCols(place(colsRef.current, now, result.at));
  };

  // Send the carry once the card is out of the hand. Pointer drops are already out; keyboard carries wait for Space.
  const settle = React.useCallback((id: string) => {
    const origin = origins.current.get(id);
    if (!origin || inHand(id)) return;
    origins.current.delete(id);
    const at = locate(colsRef.current, id);
    if (!at || samePlace(at, origin)) return; // dropped where it started, or Escape put it back
    void send(id, at);
  }, []);

  React.useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    // The board drops a keyboard-held card on Space, cancels on Escape, and puts it down when focus leaves (after 80ms).
    const check = () => { clearTimeout(t); t = setTimeout(() => origins.current.forEach((_, id) => settle(id)), 150); };
    document.addEventListener('keyup', check);
    document.addEventListener('focusout', check);
    document.addEventListener('pointerup', check);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keyup', check);
      document.removeEventListener('focusout', check);
      document.removeEventListener('pointerup', check);
    };
  }, [settle]);

  const onMove = ({ cardId, from, to }: BoardMove) => {
    const f = from as Place, t = to as Place;
    if (!origins.current.has(cardId)) origins.current.set(cardId, f);
    commitCols(place(colsRef.current, f, t));
    setTimeout(() => settle(cardId), 0);
  };

  const noteFor = (t: Ticket) => {
    const w = writes[t.id];
    if (w?.status === 'pending') {
      return <span className="sb-note"><ClockIcon />Moving to {COLUMN_TITLES[w.to]}…</span>;
    }
    if (w?.status === 'failed') {
      return <span className="sb-note sb-note-failed"><AlertIcon />Not moved: {w.reason} Back in {COLUMN_TITLES[w.backIn]}.</span>;
    }
    return null;
  };

  return (
    <main className="sb-page">
      <PageHeader>
        <PageHeaderTitle>Support queue</PageHeaderTitle>
        <PageHeaderDescription>
          Drag a ticket to another column, or focus it and press Space, move it with the arrow keys and press Space to drop it.
          In progress holds at most {IN_PROGRESS_LIMIT} tickets.
        </PageHeaderDescription>
      </PageHeader>

      <Board onMove={onMove} aria-label="Support tickets">
        {COLUMN_ORDER.map(col => (
          <BoardColumn key={col} id={col}
            title={col === 'doing' ? `${COLUMN_TITLES[col]} (limit ${IN_PROGRESS_LIMIT})` : COLUMN_TITLES[col]}>
            {cols[col].map(t => {
              const w = writes[t.id];
              return (
                <BoardCard key={t.id} id={t.id} label={t.title} status={w?.status}>
                  {t.title}
                  <small>{t.priority} · {t.customer} · {t.assignee ?? 'Unassigned'}</small>
                  {noteFor(t) && <small>{noteFor(t)}</small>}
                </BoardCard>
              );
            })}
          </BoardColumn>
        ))}
      </Board>

      <p className="sb-outcome" role="status">{outcome}</p>

      <details className="sb-fixtures">
        <summary>Simulated server</summary>
        <p className="sb-caption">
          There is no backend. The simulated server refuses a move into In progress when it already has {IN_PROGRESS_LIMIT} tickets,
          and refuses closing an unassigned ticket.
        </p>
        <div className="sb-switches">
          <Switch label="Lose the connection on the next move" checked={dropNext} onCheckedChange={setDropNext} />
          <Switch label="Slow server (3 seconds)" checked={slow} onCheckedChange={setSlow} />
        </div>
      </details>
    </main>
  );
}
