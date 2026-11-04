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
import {
  COLUMN_TITLES,
  IN_PROGRESS_LIMIT,
  initialColumns,
  isFailNextArmed,
  locate,
  requestMove,
  serverPlace,
  setFailNext,
} from './server';
import type { ColumnId, Columns, Place } from './server';

type Write =
  | { status: 'pending' }
  | { status: 'committed' }
  | { status: 'failed'; reason: string };

const COLUMN_IDS = Object.keys(COLUMN_TITLES) as ColumnId[];

/** Take a card out wherever it is and put it at `to` (index clamped to the column). */
function placeCard(columns: Columns, cardId: string, to: Place): Columns {
  const from = locate(columns, cardId);
  if (!from) return columns;
  const next: Columns = { todo: columns.todo.slice(), doing: columns.doing.slice(), done: columns.done.slice() };
  const [card] = next[from.column].splice(from.index, 1);
  next[to.column].splice(Math.max(0, Math.min(to.index, next[to.column].length)), 0, card);
  return next;
}

/** Is this card still in the person's hand (picked up with the keyboard and not yet dropped)? */
function isHeld(root: HTMLElement | null, cardId: string): boolean {
  if (!root) return false;
  const card = root.querySelector(`[data-board-card="${CSS.escape(cardId)}"]`);
  return !!card?.querySelector(':scope > [aria-pressed="true"]');
}

function SupportBoard() {
  const [columns, setColumns] = React.useState<Columns>(initialColumns);
  const [writes, setWrites] = React.useState<Record<string, Write>>({});
  const [announcement, setAnnouncement] = React.useState('');
  const [failNext, setFailNextState] = React.useState(false);

  const boardRef = React.useRef<HTMLDivElement>(null);
  const columnsRef = React.useRef(columns);
  columnsRef.current = columns;
  // Cards being carried, with where each started. The keyboard reports every step (each arrow press) as a move;
  // only the place it's dropped is sent to the server, so carrying a card past a full column isn't refused.
  const carries = React.useRef(new Map<string, Place>());
  // The latest request per card: an older answer for a card that has since moved again is ignored.
  const latest = React.useRef(new Map<string, number>());

  const titleOf = (cardId: string) =>
    COLUMN_IDS.flatMap(k => columnsRef.current[k]).find(t => t.id === cardId)?.title ?? 'Ticket';

  const send = React.useCallback(async (cardId: string, origin: Place, to: Place) => {
    const n = (latest.current.get(cardId) ?? 0) + 1;
    latest.current.set(cardId, n);
    const title = titleOf(cardId);
    setWrites(w => ({ ...w, [cardId]: { status: 'pending' } }));
    const result = await requestMove(cardId, to);
    // The fixture is one-shot: the server clears it once used, so mirror that in the switch.
    setFailNextState(isFailNextArmed());
    if (latest.current.get(cardId) !== n) return;
    if (result.ok) {
      setWrites(w => ({ ...w, [cardId]: { status: 'committed' } }));
      setAnnouncement(
        origin.column === to.column
          ? `Saved: ${title} reordered in ${COLUMN_TITLES[to.column]}.`
          : `Moved: ${title} to ${COLUMN_TITLES[to.column]}.`,
      );
      return;
    }
    // Refused: put it back where the server last recorded it, which is where it came from.
    const back = serverPlace(cardId) ?? origin;
    setColumns(c => placeCard(c, cardId, back));
    setWrites(w => ({ ...w, [cardId]: { status: 'failed', reason: result.reason } }));
    setAnnouncement(`Not moved: ${title}. ${result.reason} It’s back in ${COLUMN_TITLES[back.column]}.`);
  }, []);

  /** Send every carried card that has been put down. */
  const settleCarries = React.useCallback(() => {
    for (const [cardId, origin] of carries.current) {
      if (isHeld(boardRef.current, cardId)) continue;
      carries.current.delete(cardId);
      const now = locate(columnsRef.current, cardId);
      if (!now) continue;
      if (now.column === origin.column && now.index === origin.index) {
        // Put back where it started (Escape, or carried home): nothing to send. Keep any earlier refusal visible.
        continue;
      }
      send(cardId, origin, now);
    }
  }, [send]);

  const onMove = ({ cardId, from, to }: BoardMove) => {
    const target = { column: to.column as ColumnId, index: to.index };
    setColumns(c => placeCard(c, cardId, target));
    if (!carries.current.has(cardId)) {
      carries.current.set(cardId, { column: from.column as ColumnId, index: from.index });
      // A new move clears the last refusal on this card.
      setWrites(w => (w[cardId]?.status === 'failed' ? { ...w, [cardId]: { status: 'committed' } } : w));
    }
  };

  // After each render, and whenever a card is picked up or put down, send the moves that have landed.
  React.useEffect(() => settleCarries(), [columns, settleCarries]);
  React.useEffect(() => {
    const root = boardRef.current;
    if (!root) return;
    const observer = new MutationObserver(() => settleCarries());
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-pressed'] });
    return () => observer.disconnect();
  }, [settleCarries]);

  const toggleFailNext = (v: boolean) => {
    setFailNextState(v);
    setFailNext(v);
  };

  const doingCount = columns.doing.length;

  return (
    <main className="support-page">
      <PageHeader>
        <PageHeaderTitle>Support tickets</PageHeaderTitle>
        <PageHeaderDescription>
          Move a ticket by dragging it, or focus it and press Space, use the arrow keys, then Space to drop it. In
          progress holds at most {IN_PROGRESS_LIMIT} tickets.
        </PageHeaderDescription>
      </PageHeader>

      <Board ref={boardRef} onMove={onMove} aria-label="Support tickets board" className="support-board">
        {COLUMN_IDS.map(k => (
          <BoardColumn
            key={k}
            id={k}
            title={k === 'doing' ? `${COLUMN_TITLES[k]} (${doingCount} of ${IN_PROGRESS_LIMIT})` : COLUMN_TITLES[k]}
          >
            {columns[k].map(t => {
              const write = writes[t.id];
              return (
                <BoardCard key={t.id} id={t.id} label={t.title} status={write?.status}>
                  {t.title}
                  <small>
                    {t.ref} · {t.customer} · {t.assignee}
                  </small>
                  {write?.status === 'pending' && (
                    <small className="card-note">
                      <Icons.Clock size={14} aria-hidden="true" /> Saving move…
                    </small>
                  )}
                  {write?.status === 'failed' && (
                    <small className="card-note card-note-failed">
                      <Icons.AlertCircle size={14} aria-hidden="true" /> Not moved: {write.reason}
                    </small>
                  )}
                </BoardCard>
              );
            })}
          </BoardColumn>
        ))}
      </Board>

      <p className="board-status" role="status" aria-live="polite">
        {announcement}
      </p>

      <details className="fixtures">
        <summary>Simulated server</summary>
        <p>
          There is no backend. Moves take about half a second to answer. The server refuses a move into In progress
          when it already holds {IN_PROGRESS_LIMIT} tickets.
        </p>
        <Switch label="Make the next move fail (server unreachable)" checked={failNext} onCheckedChange={toggleFailNext} />
      </details>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <SupportBoard />
  </AltitudeProvider>,
);
