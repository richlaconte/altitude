import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider, Avatar, Badge, Board, BoardCard, BoardColumn, Button, Icons, Kbd, Switch, Toaster, toast,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import {
  applyMove, columnOf, columnTitle, COLUMNS, ColumnId, IN_PROGRESS_LIMIT, INITIAL_LAYOUT, INITIAL_TICKETS,
  Layout, ME, Move, sameLayout, Ticket,
} from './model';
import { createServer, Refused } from './server';

type BoardMove = Parameters<React.ComponentProps<typeof Board>['onMove']>[0];

const server = createServer(INITIAL_LAYOUT, INITIAL_TICKETS);

type Pending = { reqId: number; move: Move };
const FAILED_MS = 5000;

function App() {
  const [tickets, setTickets] = React.useState<Record<string, Ticket>>(
    () => Object.fromEntries(INITIAL_TICKETS.map((t) => [t.id, t])),
  );
  /** What the server has confirmed. */
  const [confirmed, setConfirmed] = React.useState<Layout>(INITIAL_LAYOUT);
  /** Moves sent and awaiting an answer, shown optimistically on top of `confirmed`. */
  const [pending, setPending] = React.useState<Pending[]>([]);
  /** A card being carried with the keyboard: shown where it is, sent only when it's dropped. */
  const [draft, setDraft] = React.useState<Move | null>(null);
  const [failed, setFailed] = React.useState<Record<string, string>>({});
  const [assigning, setAssigning] = React.useState<Set<string>>(new Set());
  const [flaky, setFlaky] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState('');

  const base = React.useMemo(() => pending.reduce((l, p) => applyMove(l, p.move), confirmed), [confirmed, pending]);
  const layout = React.useMemo(() => (draft ? applyMove(base, draft) : base), [base, draft]);

  // Latest values for handlers that run outside render (promise callbacks, key handlers).
  const latest = React.useRef({ base, draft, tickets, confirmed, pending });
  latest.current = { base, draft, tickets, confirmed, pending };
  const keyboardCarry = React.useRef<string | null>(null);
  const ignoreMove = React.useRef<string | null>(null);
  const reqSeq = React.useRef(0);
  const failTimers = React.useRef(new Map<string, number>());

  const clearFailed = (cardId: string) => {
    clearTimeout(failTimers.current.get(cardId));
    setFailed((f) => {
      if (!(cardId in f)) return f;
      const { [cardId]: _, ...rest } = f;
      return rest;
    });
  };

  const showFailure = (cardId: string, reason: string) => {
    setFailed((f) => ({ ...f, [cardId]: reason }));
    clearTimeout(failTimers.current.get(cardId));
    failTimers.current.set(cardId, window.setTimeout(() => clearFailed(cardId), FAILED_MS));
  };

  const commit = (move: Move) => {
    const before = latest.current.base;
    if (sameLayout(applyMove(before, move), before)) return; // dropped where it already was
    const reqId = ++reqSeq.current;
    clearFailed(move.cardId);
    setPending((p) => [...p, { reqId, move }]);

    server.move(move).then(
      (serverLayout) => {
        setConfirmed(serverLayout);
        setPending((p) => p.filter((x) => x.reqId !== reqId));
      },
      (err: unknown) => {
        const reason = err instanceof Refused ? err.message : 'Something went wrong on the server.';
        // Where the card ends up once this move is dropped from the optimistic stack.
        const { confirmed: c, pending: p } = latest.current;
        const back = p.filter((x) => x.reqId !== reqId).reduce((l, x) => applyMove(l, x.move), c);
        const where = columnOf(back, move.cardId);
        const title = latest.current.tickets[move.cardId]?.title ?? move.cardId;
        setPending((list) => list.filter((x) => x.reqId !== reqId));
        showFailure(move.cardId, reason);
        const backText = where ? `It’s back in ${columnTitle(where)}.` : '';
        toast({ tone: 'critical', title: `Couldn’t move “${title}”`, description: `${reason} ${backText}`, duration: 7000 });
        setAnnouncement(`Move failed. ${title}: ${reason} ${backText}`);
      },
    );
  };

  const onMove = (m: BoardMove) => {
    if (ignoreMove.current === m.cardId) return;
    const move: Move = { cardId: m.cardId, to: { column: m.to.column as ColumnId, index: m.to.index } };
    if (keyboardCarry.current === m.cardId) {
      // Each arrow key is a step; the move is sent when the card is dropped.
      setDraft(move);
      return;
    }
    commit(move);
  };

  const dropKeyboardCarry = () => {
    const d = latest.current.draft;
    keyboardCarry.current = null;
    setDraft(null);
    if (d) commit(d);
  };

  // Watch the board's own keyboard handling so we know when a keyboard carry starts, ends or is cancelled.
  const onKeyDownCapture = (e: React.KeyboardEvent) => {
    const el = e.target as HTMLElement;
    const id = el.dataset?.boardCard;
    if (!id) return;
    if (e.key === ' ' || e.key === 'Enter') {
      if (el.getAttribute('aria-pressed') === 'true') dropKeyboardCarry();
      else if (!el.dataset.heldBy) {
        keyboardCarry.current = id;
        clearFailed(id);
      }
    } else if (e.key === 'Escape' && keyboardCarry.current === id) {
      // The board moves the card back to where it started; that's local only, nothing to send.
      keyboardCarry.current = null;
      setDraft(null);
      ignoreMove.current = id;
      setTimeout(() => { ignoreMove.current = null; }, 0);
    }
  };

  // Tabbing or clicking away while carrying drops the card where it is (the board does the same).
  const onBlurCapture = (e: React.FocusEvent) => {
    const id = (e.target as HTMLElement).dataset?.boardCard;
    if (!id || keyboardCarry.current !== id) return;
    setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      if (keyboardCarry.current === id && active?.dataset?.boardCard !== id) dropKeyboardCarry();
    }, 120);
  };

  const assignToMe = (cardId: string) => {
    setAssigning((s) => new Set(s).add(cardId));
    const done = () => setAssigning((s) => { const n = new Set(s); n.delete(cardId); return n; });
    server.assign(cardId, ME).then(
      () => {
        done();
        clearFailed(cardId);
        setTickets((t) => ({ ...t, [cardId]: { ...t[cardId], assignee: ME } }));
      },
      (err: unknown) => {
        done();
        const reason = err instanceof Refused ? err.message : 'Something went wrong on the server.';
        toast({ tone: 'critical', title: 'Couldn’t assign the ticket', description: reason });
        setAnnouncement(`Assigning failed. ${reason}`);
      },
    );
  };

  const isPending = (id: string) => pending.some((p) => p.move.cardId === id);
  const doingCount = layout.doing.length;

  return (
    <main className="app">
      <header className="app-head">
        <div>
          <h1>Support queue</h1>
          <p className="app-help">
            Drag tickets between columns, or focus one and press <Kbd>Space</Kbd> to pick it up, the arrow keys to
            move it, <Kbd>Space</Kbd> to drop it and <Kbd>Esc</Kbd> to cancel. In progress holds at most {IN_PROGRESS_LIMIT}
            {' '}tickets, and unassigned tickets stay in To do.
          </p>
        </div>
        <Switch
          label="Simulate an unreliable network"
          checked={flaky}
          onCheckedChange={(on) => { setFlaky(on); server.setFlaky(on); }}
        />
      </header>

      <Board aria-label="Support tickets" className="app-board" onMove={onMove} onKeyDownCapture={onKeyDownCapture} onBlurCapture={onBlurCapture}>
        {COLUMNS.map((col) => (
          <BoardColumn
            key={col.id}
            id={col.id}
            aria-label={col.title}
            title={
              col.id === 'doing' ? (
                <span className="col-title">
                  {col.title}
                  <Badge tone={doingCount >= IN_PROGRESS_LIMIT ? 'caution' : 'neutral'} variant="tinted">
                    {`limit ${IN_PROGRESS_LIMIT}`}
                  </Badge>
                </span>
              ) : col.title
            }
          >
            {layout[col.id].map((id) => {
              const t = tickets[id];
              const reason = failed[id];
              const busy = isPending(id);
              return (
                <BoardCard
                  key={id}
                  id={id}
                  label={t.title}
                  data-status={busy ? 'pending' : reason ? 'failed' : undefined}
                  aria-busy={busy || undefined}
                  className="ticket"
                >
                  <div className="ticket-top">
                    <span className="ticket-id">{t.id}</span>
                    {t.priority !== 'Normal' && (
                      <Badge tone={t.priority === 'Urgent' ? 'critical' : 'caution'} variant="tinted">{t.priority}</Badge>
                    )}
                  </div>
                  <div className="ticket-title">{t.title}</div>
                  <div className="ticket-meta">
                    <small>{t.customer}</small>
                    {t.assignee ? (
                      <span className="ticket-assignee">
                        <Avatar name={t.assignee} size={22} />
                        <small>{t.assignee === ME ? 'You' : t.assignee.split(' ')[0]}</small>
                      </span>
                    ) : (
                      <Button size="sm" variant="secondary" loading={assigning.has(id)} onClick={() => assignToMe(id)}>
                        Assign to me
                      </Button>
                    )}
                  </div>
                  {busy && <small className="ticket-state">Saving…</small>}
                  {!busy && reason && (
                    <small className="ticket-state ticket-error" role="note">
                      <Icons.AlertCircle size={14} aria-hidden="true" />
                      <span>Move failed: {reason}</span>
                    </small>
                  )}
                </BoardCard>
              );
            })}
          </BoardColumn>
        ))}
      </Board>

      <div className="alt-sr" aria-live="polite">{announcement}</div>
      <Toaster />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
  </AltitudeProvider>,
);
