import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider, Avatar, Badge, Board, BoardCard, BoardColumn, Icons, Kbd, Spinner, Switch, Toaster, toast,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import {
  COLUMN_ORDER, COLUMN_TITLES, IN_PROGRESS_LIMIT, MoveRefused, TICKETS, locate, moveTicket, settings, snapshot,
  type ColumnId, type Columns,
} from './server';

type BoardMove = Parameters<React.ComponentProps<typeof Board>['onMove']>[0];

const clone = (c: Columns): Columns => ({ todo: [...c.todo], doing: [...c.doing], done: [...c.done] });

function place(cols: Columns, id: string, column: ColumnId, index: number): Columns {
  const next = clone(cols);
  const at = locate(next, id);
  if (at) next[at.column].splice(at.index, 1);
  next[column].splice(Math.max(0, Math.min(index, next[column].length)), 0, id);
  return next;
}

const cardEl = (id: string) => document.querySelector<HTMLElement>(`[data-board-card="${CSS.escape(id)}"]`);
const isHeld = (id: string) => cardEl(id)?.getAttribute('aria-pressed') === 'true';

function App() {
  const [board, setBoardState] = React.useState<Columns>(snapshot);
  const boardRef = React.useRef(board);
  const confirmed = React.useRef<Columns>(snapshot());
  const [pending, setPending] = React.useState<Set<string>>(() => new Set());
  const [failed, setFailed] = React.useState<Record<string, string>>({});
  const [landed, setLanded] = React.useState<Record<string, number>>({});
  const [flaky, setFlaky] = React.useState(settings.flaky);
  const input = React.useRef<'pointer' | 'keyboard'>('pointer');
  const failTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const setBoard = (next: Columns) => {
    boardRef.current = next;
    setBoardState(next);
  };

  const clearFailure = (id: string) => {
    clearTimeout(failTimers.current[id]);
    setFailed((f) => {
      if (!(id in f)) return f;
      const { [id]: _, ...rest } = f;
      return rest;
    });
  };

  /** Send the card's current (optimistic) place to the server, if it differs from what the server last confirmed. */
  const commit = (id: string) => {
    const local = locate(boardRef.current, id);
    const server = locate(confirmed.current, id);
    if (!local || !server || (local.column === server.column && local.index === server.index)) return;
    clearFailure(id);
    setPending((p) => new Set(p).add(id));
    const done = () => setPending((p) => { const n = new Set(p); n.delete(id); return n; });

    moveTicket(id, local.column, local.index).then(
      (serverBoard) => {
        confirmed.current = serverBoard;
        done();
        setLanded((s) => ({ ...s, [id]: (s[id] ?? 0) + 1 }));
      },
      (err: unknown) => {
        const reason = err instanceof MoveRefused ? err.message : 'Something went wrong. Nothing was changed.';
        if (err instanceof MoveRefused) confirmed.current = err.board;
        const back = locate(confirmed.current, id) ?? server;
        const hadFocus = document.activeElement === cardEl(id);
        setBoard(place(boardRef.current, id, back.column, back.index));
        done();
        setFailed((f) => ({ ...f, [id]: reason }));
        failTimers.current[id] = setTimeout(() => clearFailure(id), 8000);
        toast({
          tone: 'critical',
          title: `Couldn’t move ${id} to ${COLUMN_TITLES[local.column]}`,
          description: `${reason} It’s back in ${COLUMN_TITLES[back.column]}.`,
          duration: 7000,
        });
        // The card is re-rendered in its old column; keep keyboard focus on it.
        if (hadFocus || document.activeElement === document.body) requestAnimationFrame(() => cardEl(id)?.focus({ preventScroll: true }));
      },
    );
  };

  const onMove = ({ cardId, to }: BoardMove) => {
    setBoard(place(boardRef.current, cardId, to.column as ColumnId, to.index));
    // A pointer drop is final. Keyboard steps are provisional until the card is dropped (Space/Enter) or let go (blur).
    if (input.current === 'pointer') commit(cardId);
  };

  const cardFrom = (e: React.SyntheticEvent) => (e.target as HTMLElement).closest<HTMLElement>('[data-board-card]');

  const onKeyDownCapture = (e: React.KeyboardEvent) => {
    input.current = 'keyboard';
    const card = cardFrom(e);
    if (!card || card !== e.target) return;
    const id = card.dataset.boardCard!;
    if ((e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') && isHeld(id)) setTimeout(() => commit(id), 0);
  };

  const onBlurCapture = (e: React.FocusEvent) => {
    const card = cardFrom(e);
    if (!card || card !== e.target) return;
    const id = card.dataset.boardCard!;
    if (!isHeld(id)) return;
    // The board lets go of a card when focus leaves it; whatever place it reached then is the move.
    setTimeout(() => { if (!isHeld(id)) commit(id); }, 150);
  };

  // While the server is deciding, the card can't be picked up again.
  const lock = (id: string) => ({
    onPointerDownCapture: (e: React.PointerEvent) => { if (pending.has(id)) e.stopPropagation(); },
    onKeyDownCapture: (e: React.KeyboardEvent) => {
      if (pending.has(id) && [' ', 'Enter'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); }
    },
  });

  const toggleFlaky = (v: boolean) => { settings.flaky = v; setFlaky(v); };

  return (
    <main className="kb-page">
      <header className="kb-head">
        <div>
          <p className="kb-eyebrow">Support · Tier 1 queue</p>
          <h1>Ticket board</h1>
          <p className="kb-lede">
            Drag a card to move it, or focus it and press <Kbd>Space</Kbd>, move with the arrow keys and press <Kbd>Space</Kbd> again
            to drop (<Kbd>Esc</Kbd> cancels). Every move is checked by the helpdesk server; if it says no, the card goes back.
          </p>
        </div>
        <div className="kb-rules">
          <h2>Server rules</h2>
          <ul>
            <li>In progress holds at most {IN_PROGRESS_LIMIT} tickets.</li>
            <li>Unassigned tickets can’t be started.</li>
          </ul>
          <Switch label="Simulate an unreliable network" checked={flaky} onCheckedChange={toggleFlaky} />
        </div>
      </header>

      <Board aria-label="Support tickets" onMove={onMove} onPointerDownCapture={() => { input.current = 'pointer'; }}
        onKeyDownCapture={onKeyDownCapture} onBlurCapture={onBlurCapture} className="kb-board">
        {COLUMN_ORDER.map((col) => (
          <BoardColumn
            key={col}
            id={col}
            aria-label={COLUMN_TITLES[col]}
            title={col === 'doing'
              ? <span className="kb-coltitle">{COLUMN_TITLES[col]} <Badge variant="outline" tone={board.doing.length >= IN_PROGRESS_LIMIT ? 'caution' : 'neutral'}>limit {IN_PROGRESS_LIMIT}</Badge></span>
              : COLUMN_TITLES[col]}
            className="kb-col"
          >
            {board[col].map((id) => {
              const t = TICKETS[id];
              const isPending = pending.has(id);
              const failure = failed[id];
              const status = isPending ? 'pending' : failure ? 'failed' : undefined;
              return (
                <BoardCard
                  key={id}
                  id={id}
                  label={`${id}: ${t.title}`}
                  settle={landed[id]}
                  data-status={status}
                  aria-busy={isPending || undefined}
                  className="kb-card"
                  {...lock(id)}
                >
                  <div className="kb-card-top">
                    <span className="kb-id">{id}</span>
                    {t.priority !== 'normal' && (
                      <Badge tone={t.priority === 'high' ? 'critical' : 'neutral'} variant="tinted">{t.priority === 'high' ? 'High' : 'Low'}</Badge>
                    )}
                  </div>
                  <strong className="kb-title">{t.title}</strong>
                  <small>{t.requester}</small>
                  <div className="kb-card-foot">
                    {t.assignee
                      ? <span className="kb-assignee"><Avatar name={t.assignee} size={20} />{t.assignee}</span>
                      : <Badge tone="caution" variant="outline">Unassigned</Badge>}
                  </div>
                  {isPending && (
                    <p className="kb-msg kb-msg-pending"><Spinner size={12} /> Saving…</p>
                  )}
                  {failure && !isPending && (
                    <p className="kb-msg kb-msg-failed">
                      <Icons.AlertCircle size={14} aria-hidden="true" />
                      <span><b>Move refused.</b> {failure}</span>
                    </p>
                  )}
                </BoardCard>
              );
            })}
          </BoardColumn>
        ))}
      </Board>
      <Toaster />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<AltitudeProvider><App /></AltitudeProvider>);
