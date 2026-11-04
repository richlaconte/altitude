import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Badge,
  Board,
  BoardCard,
  BoardColumn,
  Kbd,
  Spinner,
  Switch,
  Toaster,
  toast,
} from 'altitude-design';
import type { BoardMove } from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import {
  COLUMNS,
  INITIAL_LAYOUT,
  IN_PROGRESS_LIMIT,
  TICKETS,
  MoveRefused,
  columnTitle,
  requestMove,
  setFlakyNetwork,
} from './server';
import type { ColumnId, Layout } from './server';

interface Place {
  column: ColumnId;
  index: number;
}

interface Refusal {
  reason: string;
  /** Bumped on every refusal so the card settles again when it is put back. */
  n: number;
}

/** Moves a card to a place in a copy of the layout. */
function place(layout: Layout, cardId: string, to: Place): Layout {
  const next: Layout = { todo: [...layout.todo], doing: [...layout.doing], done: [...layout.done] };
  for (const c of COLUMNS) next[c.id] = next[c.id].filter((id) => id !== cardId);
  const list = next[to.column];
  list.splice(Math.max(0, Math.min(to.index, list.length)), 0, cardId);
  return next;
}

function locate(layout: Layout, cardId: string): Place | null {
  for (const c of COLUMNS) {
    const index = layout[c.id].indexOf(cardId);
    if (index >= 0) return { column: c.id, index };
  }
  return null;
}

const samePlace = (a: Place, b: Place) => a.column === b.column && a.index === b.index;

const priorityTone = {
  Low: 'neutral',
  Normal: 'neutral',
  High: 'caution',
  Urgent: 'critical',
} as const;

function App() {
  const [layout, setLayoutState] = React.useState<Layout>(INITIAL_LAYOUT);
  const layoutRef = React.useRef(layout);
  const setLayout = (next: Layout) => {
    layoutRef.current = next;
    setLayoutState(next);
  };

  // Cards whose move is waiting on the server. They can't be picked up meanwhile.
  const [pending, setPending] = React.useState<Record<string, true>>({});
  const pendingRef = React.useRef(pending);
  pendingRef.current = pending;

  const [refused, setRefused] = React.useState<Record<string, Refusal>>({});
  const [announcement, setAnnouncement] = React.useState('');
  const [flaky, setFlaky] = React.useState(false);

  // A card picked up with the keyboard: arrow-key steps are local until it is dropped.
  const hold = React.useRef<{ cardId: string; origin: Place } | null>(null);

  const say = (text: string) => {
    // Clear first so repeating the same sentence is still announced.
    setAnnouncement('');
    requestAnimationFrame(() => setAnnouncement(text));
  };

  /** Shows the card at `to` straight away and asks the server to record it; puts it back at `origin` if refused. */
  const commit = (cardId: string, origin: Place, to: Place) => {
    const ticket = TICKETS[cardId];
    if (!samePlace(locate(layoutRef.current, cardId)!, to)) setLayout(place(layoutRef.current, cardId, to));
    setPending((p) => ({ ...p, [cardId]: true }));
    setRefused(({ [cardId]: _, ...rest }) => rest);

    requestMove(cardId, to.column, to.index).then(
      () => {
        setPending(({ [cardId]: _, ...rest }) => rest);
        if (origin.column !== to.column) say(`${ticket.id} saved in ${columnTitle(to.column)}.`);
      },
      (err: unknown) => {
        const reason = err instanceof MoveRefused ? err.reason : 'Something went wrong saving the move.';
        setPending(({ [cardId]: _, ...rest }) => rest);
        setLayout(place(layoutRef.current, cardId, origin));
        setRefused((r) => ({ ...r, [cardId]: { reason, n: (r[cardId]?.n ?? 0) + 1 } }));
        const where = origin.column === to.column ? 'move' : `move to ${columnTitle(to.column)}`;
        toast({
          tone: 'critical',
          title: `Couldn't ${where}: ${ticket.id}`,
          description: `${reason} It's back in ${columnTitle(origin.column)}.`,
          duration: 7000,
          action: {
            label: 'Try again',
            onClick: () => {
              const now = locate(layoutRef.current, cardId);
              if (now && !pendingRef.current[cardId]) commit(cardId, now, to);
            },
          },
        });
        say(`Move refused. ${reason} ${ticket.id} is back in ${columnTitle(origin.column)}, position ${origin.index + 1}.`);
      },
    );
  };

  const onMove = (move: BoardMove) => {
    const { cardId } = move;
    const from = move.from as Place;
    const to = move.to as Place;
    if (pendingRef.current[cardId]) return;
    if (hold.current?.cardId === cardId) {
      // A keyboard step (or Escape putting it back): local only, committed on drop.
      setLayout(place(layoutRef.current, cardId, to));
      return;
    }
    // A pointer drop.
    commit(cardId, from, to);
  };

  const dropHeld = () => {
    const h = hold.current;
    hold.current = null;
    if (!h) return;
    const at = locate(layoutRef.current, h.cardId);
    if (at && !samePlace(at, h.origin)) commit(h.cardId, h.origin, at);
  };

  const cardIdOf = (target: EventTarget) =>
    (target as HTMLElement).closest?.<HTMLElement>('[data-board-card]')?.dataset.boardCard;

  const blockIfPending = (e: React.SyntheticEvent, cardId: string) => {
    if (!pendingRef.current[cardId]) return false;
    e.preventDefault();
    e.stopPropagation(); // keeps the Board from picking it up
    say(`${cardId} is still saving. Try again in a moment.`);
    return true;
  };

  // Captured before the Board's own handlers, to learn where keyboard moves start and end.
  const onKeyDownCapture = (e: React.KeyboardEvent) => {
    const el = e.target as HTMLElement;
    const cardId = el.dataset?.boardCard;
    if (!cardId) return;
    const holding = el.getAttribute('aria-pressed') === 'true';
    if (e.key === ' ' || e.key === 'Enter') {
      if (holding) {
        dropHeld();
      } else if (!blockIfPending(e, cardId)) {
        const origin = locate(layoutRef.current, cardId);
        if (origin) hold.current = { cardId, origin };
      }
    } else if (e.key === 'Escape' && holding) {
      // The Board moves it back to its origin through onMove; then the hold ends.
      setTimeout(() => {
        if (hold.current?.cardId === cardId) hold.current = null;
      });
    }
  };

  const onPointerDownCapture = (e: React.PointerEvent) => {
    const cardId = cardIdOf(e.target);
    if (cardId) blockIfPending(e, cardId);
  };

  // Focus leaving a held card drops it where it is (the Board stops holding it too).
  const onBlurCapture = (e: React.FocusEvent) => {
    const cardId = cardIdOf(e.target);
    if (!cardId || hold.current?.cardId !== cardId) return;
    setTimeout(() => {
      if (hold.current?.cardId !== cardId) return;
      const el = document.querySelector<HTMLElement>(`[data-board-card="${CSS.escape(cardId)}"]`);
      if (el && (document.activeElement === el || el.getAttribute('aria-pressed') === 'true')) return;
      dropHeld();
    }, 150);
  };

  React.useEffect(() => setFlakyNetwork(flaky), [flaky]);

  const inProgress = layout.doing.length;

  return (
    <main className="desk">
      <header className="desk-head">
        <div>
          <h1>Support queue</h1>
          <p className="desk-sub">
            Drag tickets between columns, or focus one and press <Kbd>Space</Kbd>, move it with the arrow keys and
            press <Kbd>Space</Kbd> again to drop it (<Kbd>Esc</Kbd> cancels).
          </p>
        </div>
        <Switch label="Simulate flaky network" checked={flaky} onCheckedChange={setFlaky} />
      </header>

      <ul className="desk-rules" aria-label="Rules the server enforces">
        <li>
          In progress holds at most {IN_PROGRESS_LIMIT} tickets.
        </li>
        <li>A ticket needs an assignee before it can move to Done.</li>
      </ul>

      <Board
        aria-label="Support tickets"
        className="desk-board"
        onMove={onMove}
        onKeyDownCapture={onKeyDownCapture}
        onPointerDownCapture={onPointerDownCapture}
        onBlurCapture={onBlurCapture}
      >
        {COLUMNS.map((col) => (
          <BoardColumn
            key={col.id}
            id={col.id}
            aria-label={col.title}
            title={
              col.id === 'doing' ? (
                <span className="desk-coltitle">
                  {col.title}
                  <Badge
                    tone={inProgress >= IN_PROGRESS_LIMIT ? 'caution' : 'neutral'}
                    variant="outline"
                    aria-label={`limit ${IN_PROGRESS_LIMIT}${inProgress >= IN_PROGRESS_LIMIT ? ', full' : ''}`}
                  >
                    {inProgress >= IN_PROGRESS_LIMIT ? `Full · max ${IN_PROGRESS_LIMIT}` : `max ${IN_PROGRESS_LIMIT}`}
                  </Badge>
                </span>
              ) : (
                col.title
              )
            }
          >
            {layout[col.id].map((id) => {
              const t = TICKETS[id];
              const r = refused[id];
              const saving = !!pending[id];
              return (
                <BoardCard
                  key={id}
                  id={id}
                  label={`${t.id}, ${t.title}`}
                  settle={r?.n}
                  className="desk-card"
                  data-saving={saving ? '' : undefined}
                  data-refused={r ? '' : undefined}
                  aria-busy={saving || undefined}
                >
                  <div className="desk-card-top">
                    <span className="desk-id">{t.id}</span>
                    <Badge tone={priorityTone[t.priority]} variant="tinted">
                      {t.priority}
                    </Badge>
                  </div>
                  <div className="desk-title">{t.title}</div>
                  <small>
                    {t.customer} · {t.assignee ?? <em>Unassigned</em>}
                  </small>
                  {saving && (
                    <div className="desk-status">
                      <Spinner size={12} /> Saving…
                    </div>
                  )}
                  {r && !saving && (
                    <div className="desk-refused">
                      <strong>Move refused.</strong> {r.reason}
                    </div>
                  )}
                </BoardCard>
              );
            })}
          </BoardColumn>
        ))}
      </Board>

      <div className="alt-sr" aria-live="polite">
        {announcement}
      </div>
      <Toaster />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
  </AltitudeProvider>,
);
