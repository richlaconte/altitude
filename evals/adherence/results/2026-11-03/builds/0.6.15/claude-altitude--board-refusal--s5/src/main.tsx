import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Board,
  BoardCard,
  BoardColumn,
  Icons,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  Switch,
} from 'altitude-design';
import type { BoardMove } from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { COLUMN_TITLES, IN_PROGRESS_LIMIT, createServer, locate } from './server';
import type { ColumnId, Columns, Ticket } from './server';

const START: Columns = {
  todo: [
    { id: 't1', title: 'Refund double charge on March invoice', customer: 'Harbourline Freight', assignee: 'Priya' },
    { id: 't2', title: 'Password reset emails not arriving', customer: 'Ostrava Dental Group' },
    { id: 't3', title: 'CSV export fails over 5,000 rows', customer: 'Kettle & Pine Café', assignee: 'Tomás' },
    { id: 't4', title: 'Add a second admin to the account', customer: 'Fenwick Joinery' },
  ],
  doing: [
    { id: 't5', title: 'Calendar sync drops recurring appointments', customer: 'Bramble Physio', assignee: 'Wen' },
    { id: 't6', title: 'SMS reminders sent in the wrong time zone', customer: 'Quarry Lane Vets', assignee: 'Priya' },
  ],
  done: [{ id: 't7', title: 'Invoice PDF shows the old VAT number', customer: 'Saltmarsh Bakery', assignee: 'Tomás' }],
};

const server = createServer(START);
const COLUMN_IDS = Object.keys(COLUMN_TITLES) as ColumnId[];

type Write = { status: 'pending' | 'committed' | 'failed'; note?: string };
type Outcome = { tone: 'ok' | 'refused'; text: string } | null;

function place(cols: Columns, cardId: string, to: ColumnId, toIndex: number): Columns {
  const at = locate(cols, cardId);
  if (!at) return cols;
  const next: Columns = { todo: cols.todo.slice(), doing: cols.doing.slice(), done: cols.done.slice() };
  const [card] = next[at.column].splice(at.index, 1);
  next[to].splice(Math.min(toIndex, next[to].length), 0, card);
  return next;
}

// The board's keyboard path calls onMove for every step while a card is in the hand. A move is only sent to the server
// once the card is put down, so carrying a card past In progress doesn't ask the server about In progress.
function isInHand(cardId: string) {
  return !!document.querySelector(
    `[data-board-card="${CSS.escape(cardId)}"] > .alt-board-card-face[aria-pressed="true"]`,
  );
}

function SupportBoard() {
  const [cols, setCols] = React.useState<Columns>(START);
  const [writes, setWrites] = React.useState<Record<string, Write | undefined>>({});
  const [outcome, setOutcome] = React.useState<Outcome>(null);
  const [dropNext, setDropNext] = React.useState(false);

  const colsRef = React.useRef(cols);
  colsRef.current = cols;
  const seq = React.useRef<Record<string, number>>({});
  const timers = React.useRef<Record<string, number>>({});

  const setWrite = (id: string, w: Write | undefined) => setWrites(all => ({ ...all, [id]: w }));
  const titleOf = (id: string) => {
    const at = locate(colsRef.current, id);
    return at ? colsRef.current[at.column][at.index].title : 'Ticket';
  };

  async function send(cardId: string) {
    const here = locate(colsRef.current, cardId);
    const there = server.locate(cardId);
    if (!here) return;
    // Put back where it started (Escape, or dropped in place): nothing to send.
    if (there && there.column === here.column && there.index === here.index) {
      setWrite(cardId, undefined);
      return;
    }
    const mine = (seq.current[cardId] ?? 0) + 1;
    seq.current[cardId] = mine;
    setWrite(cardId, { status: 'pending' });

    const result = await server.move(cardId, here.column, here.index);
    // A newer move of this card was sent after this one; its answer decides what the card shows.
    if (seq.current[cardId] !== mine) return;

    const title = titleOf(cardId);
    if (result.ok) {
      setWrite(cardId, { status: 'committed' });
      setOutcome({ tone: 'ok', text: `Moved “${title}” to ${COLUMN_TITLES[here.column]}.` });
      return;
    }
    // The connection fixture is used up once the server has dropped a request.
    if (result.code === 'unreachable') setDropNext(false);
    // Refused: the card goes back to where the server says it is.
    const back = server.locate(cardId);
    if (back) setCols(c => place(c, cardId, back.column, back.index));
    const where = back ? ` It’s back in ${COLUMN_TITLES[back.column]}.` : '';
    setWrite(cardId, { status: 'failed', note: result.reason });
    setOutcome({
      tone: 'refused',
      text: `Couldn’t move “${title}” to ${COLUMN_TITLES[here.column]}: ${result.reason}${where}`,
    });
  }

  function scheduleSend(cardId: string) {
    window.clearTimeout(timers.current[cardId]);
    const check = () => {
      if (isInHand(cardId)) timers.current[cardId] = window.setTimeout(check, 150);
      else void send(cardId);
    };
    // Let the board finish the step (and update aria-pressed) before looking.
    timers.current[cardId] = window.setTimeout(check, 0);
  }

  function onMove({ cardId, to }: BoardMove) {
    setCols(c => {
      const next = place(c, cardId, to.column as ColumnId, to.index);
      colsRef.current = next;
      return next;
    });
    // A new move clears the last refusal on this card; pending begins only when it's sent.
    setWrites(all => (all[cardId]?.status === 'pending' ? all : { ...all, [cardId]: undefined }));
    scheduleSend(cardId);
  }

  React.useEffect(() => () => Object.values(timers.current).forEach(t => window.clearTimeout(t)), []);

  const toggleDrop = (on: boolean) => {
    setDropNext(on);
    server.dropNextRequest(on);
  };
  const renderNote = (t: Ticket) => {
    const w = writes[t.id];
    if (w?.status === 'failed')
      return (
        <small className="ticket-note ticket-note--failed">
          <Icons.AlertCircle size={14} aria-hidden="true" />
          <span>Not moved: {w.note}</span>
        </small>
      );
    if (w?.status === 'pending')
      return (
        <small className="ticket-note">
          <Icons.Clock size={14} aria-hidden="true" />
          <span>Saving move…</span>
        </small>
      );
    return null;
  };

  return (
    <main className="desk">
      <PageHeader>
        <PageHeaderTitle>Support queue</PageHeaderTitle>
        <PageHeaderDescription>
          Drag a ticket to another column, or focus it and press Space, move it with the arrow keys, and press Space
          to put it down. In progress holds up to {IN_PROGRESS_LIMIT} tickets, and a ticket needs someone assigned
          before it can be closed.
        </PageHeaderDescription>
      </PageHeader>

      <Board onMove={onMove} aria-label="Support queue">
        {COLUMN_IDS.map(k => (
          <BoardColumn
            key={k}
            id={k}
            title={k === 'doing' ? `${COLUMN_TITLES[k]} (limit ${IN_PROGRESS_LIMIT})` : COLUMN_TITLES[k]}
          >
            {cols[k].map(t => (
              <BoardCard
                key={t.id}
                id={t.id}
                label={t.title}
                status={writes[t.id]?.status}
                aria-busy={writes[t.id]?.status === 'pending' || undefined}
              >
                {t.title}
                <small className="ticket-meta">
                  {t.customer} · {t.assignee ?? 'Unassigned'}
                </small>
                {renderNote(t)}
              </BoardCard>
            ))}
          </BoardColumn>
        ))}
      </Board>

      <p className="desk-outcome" role="status">
        {outcome?.tone === 'ok' ? (
          <>
            <Icons.CircleCheck size={16} aria-hidden="true" />
            <span>{outcome.text}</span>
          </>
        ) : null}
      </p>
      <p className="desk-outcome" role="alert">
        {outcome?.tone === 'refused' ? (
          <>
            <Icons.AlertCircle size={16} aria-hidden="true" />
            <span>{outcome.text}</span>
          </>
        ) : null}
      </p>

      <details className="desk-fixtures">
        <summary>Simulated server</summary>
        <Switch label="Lose the connection on the next move" checked={dropNext} onCheckedChange={toggleDrop} />
      </details>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <SupportBoard />
  </AltitudeProvider>,
);
