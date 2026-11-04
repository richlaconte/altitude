import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider, Badge, Board, BoardCard, BoardColumn, Icons, Spinner, Switch, Toaster, toast,
  type BoardMove,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { applyMove, COLUMNS, INITIAL_COLUMNS, locate, TICKETS, WIP_LIMIT, type Columns, type Place } from './data';
import { moveCard } from './server';

interface PendingMove { reqId: number; cardId: string; to: Place }
/** A card picked up with the keyboard: its arrow-key steps are a local preview until it is dropped. */
interface Hold { cardId: string; origin: Place; to: Place | null }
interface LogEntry { id: number; time: string; text: string; ok: boolean | null }

const samePlace = (a: Place | null, b: Place | null) => !!a && !!b && a.column === b.column && a.index === b.index;
const columnTitle = (id: string) => COLUMNS.find((c) => c.id === id)?.title ?? id;
const priorityTone = { Urgent: 'critical', High: 'caution', Normal: 'neutral' } as const;
const FAILED_MS = 6000;

function App() {
  // `confirmed` mirrors what the server last told us. Moves in flight are layered on top of it, so
  // dropping a pending move (because the server refused it) puts the card back where it was.
  const [confirmed, setConfirmed] = React.useState<Columns>(INITIAL_COLUMNS);
  const [pending, setPending] = React.useState<PendingMove[]>([]);
  const [hold, setHoldState] = React.useState<Hold | null>(null);
  const [failed, setFailed] = React.useState<Record<string, { reason: string; n: number }>>({});
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const [flaky, setFlaky] = React.useState(false);

  const display = React.useMemo(() => {
    let cols = confirmed;
    for (const p of pending) cols = applyMove(cols, p.cardId, p.to);
    if (hold?.to) cols = applyMove(cols, hold.cardId, hold.to);
    return cols;
  }, [confirmed, pending, hold]);

  const displayRef = React.useRef(display);
  displayRef.current = display;
  const holdRef = React.useRef<Hold | null>(null);
  const setHold = (h: Hold | null) => { holdRef.current = h; setHoldState(h); };
  const flakyRef = React.useRef(flaky);
  flakyRef.current = flaky;
  const seq = React.useRef(0);
  const refocus = React.useRef<string | null>(null);

  // A refused card that moved back to another column is a new element; give it focus back.
  React.useLayoutEffect(() => {
    const id = refocus.current;
    if (!id) return;
    refocus.current = null;
    document.querySelector<HTMLElement>(`[data-board-card="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
  });

  const addLog = (text: string, ok: boolean | null) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLog((l) => [{ id: ++seq.current, time, text, ok }, ...l].slice(0, 8));
  };

  const clearFailed = (cardId: string) =>
    setFailed((f) => {
      if (!f[cardId]) return f;
      const { [cardId]: _, ...rest } = f;
      return rest;
    });

  const submit = (cardId: string, to: Place, from = locate(displayRef.current, cardId)) => {
    const reqId = ++seq.current;
    const title = TICKETS[cardId].title;
    const where = from && from.column !== to.column ? `to ${columnTitle(to.column)}` : `within ${columnTitle(to.column)}`;
    clearFailed(cardId);
    setPending((p) => [...p, { reqId, cardId, to }]);
    addLog(`${cardId} → ${where}: sent`, null);

    moveCard(cardId, to, { flaky: flakyRef.current }).then((res) => {
      const hadFocus = document.activeElement?.getAttribute('data-board-card') === cardId;
      setConfirmed(res.columns);
      setPending((p) => p.filter((m) => m.reqId !== reqId));
      if (res.ok) {
        addLog(`${cardId} → ${where}: saved`, true);
        return;
      }
      if (hadFocus) refocus.current = cardId;
      const n = reqId;
      setFailed((f) => ({ ...f, [cardId]: { reason: res.reason, n } }));
      setTimeout(() => setFailed((f) => (f[cardId]?.n === n ? (({ [cardId]: _, ...rest }) => rest)(f) : f)), FAILED_MS);
      addLog(`${cardId} → ${where}: refused. ${res.reason}`, false);
      toast({ tone: 'critical', title: `Couldn’t move “${title}”`, description: `${res.reason} The card is back where it was.`, duration: 7000 });
    });
  };

  const endHold = (cardId: string) => {
    const h = holdRef.current;
    if (!h || h.cardId !== cardId) return;
    setHold(null);
    if (h.to && !samePlace(h.to, h.origin)) submit(cardId, h.to, h.origin);
  };

  const onMove = (move: BoardMove) => {
    const to = move.to as Place;
    const h = holdRef.current;
    if (h && h.cardId === move.cardId) setHold({ ...h, to }); // keyboard step: preview only
    else submit(move.cardId, to); // pointer drop: ask the server
  };

  // The Board handles Space / arrows / Escape itself; these capture handlers only watch when a keyboard
  // hold starts and ends, so the move is sent to the server once, on drop, rather than at every step.
  const onKeyDownCapture = (cardId: string) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const held = e.currentTarget.getAttribute('aria-pressed') === 'true';
    if (e.key === ' ' || e.key === 'Enter') {
      if (held) {
        setTimeout(() => endHold(cardId));
      } else {
        if (holdRef.current && holdRef.current.cardId !== cardId) endHold(holdRef.current.cardId);
        const origin = locate(displayRef.current, cardId);
        if (origin) setHold({ cardId, origin, to: null });
        clearFailed(cardId);
      }
    } else if (e.key === 'Escape' && holdRef.current?.cardId === cardId) {
      setTimeout(() => endHold(cardId));
    }
  };

  // Tabbing away while holding a card drops it where it is (the Board does the same).
  const onBlurCapture = (cardId: string) => () => {
    setTimeout(() => {
      if (holdRef.current?.cardId === cardId && document.activeElement?.getAttribute('data-board-card') !== cardId) endHold(cardId);
    }, 150);
  };

  const pendingIds = new Set(pending.map((p) => p.cardId));

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Support queue</h1>
          <p className="muted">
            Drag tickets between columns, or focus one and press <kbd>Space</kbd>, move it with the arrow keys, then <kbd>Space</kbd> to drop
            (<kbd>Esc</kbd> cancels). Every move is checked by the server.
          </p>
        </div>
        <Switch checked={flaky} onCheckedChange={setFlaky} label="Unreliable network (some requests time out)" />
      </header>

      <Board onMove={onMove} aria-label="Support tickets" className="board">
        {COLUMNS.map((col) => {
          const ids = display[col.id];
          const limited = col.id === 'doing';
          const over = limited && ids.length > WIP_LIMIT;
          const full = limited && ids.length === WIP_LIMIT;
          return (
            <BoardColumn
              key={col.id}
              id={col.id}
              aria-label={col.title}
              className="column"
              title={
                <span className="col-title">
                  {col.title}
                  {limited && (
                    <Badge variant="tinted" tone={over ? 'critical' : full ? 'caution' : 'neutral'} lamp={false}>
                      {over ? `Over limit of ${WIP_LIMIT}` : full ? 'Full' : `Limit ${WIP_LIMIT}`}
                    </Badge>
                  )}
                </span>
              }
            >
              {ids.map((id) => {
                const t = TICKETS[id];
                const isPending = pendingIds.has(id);
                const fail = failed[id];
                return (
                  <BoardCard
                    key={id}
                    id={id}
                    label={t.title}
                    className="ticket"
                    data-status={isPending ? 'pending' : fail ? 'failed' : undefined}
                    aria-busy={isPending || undefined}
                    onKeyDownCapture={onKeyDownCapture(id)}
                    onBlurCapture={onBlurCapture(id)}
                  >
                    <div className="ticket-top">
                      <span className="ticket-id">{t.id}</span>
                      <Badge tone={priorityTone[t.priority]} variant="tinted">{t.priority}</Badge>
                    </div>
                    <div className="ticket-title">{t.title}</div>
                    <small>
                      {t.customer} · {t.assignee ?? <span className="unassigned">Unassigned</span>}
                    </small>
                    {isPending && (
                      <small className="ticket-note">
                        <Spinner size={12} /> Saving…
                      </small>
                    )}
                    {!isPending && fail && (
                      <small className="ticket-note ticket-error">
                        <Icons.AlertTriangle size={14} /> Move refused: {fail.reason}
                      </small>
                    )}
                  </BoardCard>
                );
              })}
            </BoardColumn>
          );
        })}
      </Board>

      <section className="below">
        <div>
          <h2>Server rules</h2>
          <ul className="rules muted">
            <li>In progress holds at most {WIP_LIMIT} tickets.</li>
            <li>Unassigned tickets can’t be started.</li>
            <li>Done tickets can’t go straight back to To do.</li>
          </ul>
        </div>
        <div>
          <h2>Server log</h2>
          {log.length === 0 ? (
            <p className="muted">No requests yet.</p>
          ) : (
            <ol className="log">
              {log.map((e) => (
                <li key={e.id} data-ok={e.ok === null ? undefined : String(e.ok)}>
                  <time>{e.time}</time> {e.text}
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
      <Toaster />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
  </AltitudeProvider>,
);
