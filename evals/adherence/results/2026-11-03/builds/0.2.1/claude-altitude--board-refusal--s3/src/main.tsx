import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Avatar,
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
import 'altitude-design/altitude.css';
import './app.css';
import {
  applyMove,
  columnOf,
  COLUMNS,
  columnTitle,
  INITIAL_LAYOUT,
  Layout,
  Place,
  placeOf,
  Ticket,
  TICKETS,
  WIP_LIMIT,
} from './model';
import { SimulatedServer } from './server';

/** A move the server hasn't answered yet. It is shown optimistically until it does. */
interface Op {
  id: number;
  cardId: string;
  from: string;
  to: Place;
  via: 'pointer' | 'keyboard';
}

/** A card picked up with the keyboard: its steps stay local until it's dropped. */
interface Session {
  cardId: string;
  origin: Place;
  place: Place;
}

interface Failure {
  key: number;
  message: string;
}

interface LogEntry {
  id: number;
  text: string;
  outcome: 'pending' | 'accepted' | 'refused';
  reason?: string;
}

type BoardMove = Parameters<React.ComponentProps<typeof Board>['onMove']>[0];

const samePlace =(a: Place, b: Place) => a.column === b.column && a.index === b.index;
const FAILURE_SHOWN_MS = 10000;

function SupportBoard() {
  const server = React.useMemo(() => new SimulatedServer(), []);
  const [known, setKnown] = React.useState<Layout>(INITIAL_LAYOUT);
  const [pending, setPending] = React.useState<Op[]>([]);
  const [session, setSessionState] = React.useState<Session | null>(null);
  const [failures, setFailures] = React.useState<Record<string, Failure>>({});
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const [flaky, setFlaky] = React.useState(false);

  const sessionRef = React.useRef<Session | null>(null);
  const setSession = (s: Session | null) => {
    sessionRef.current = s;
    setSessionState(s);
  };
  const ignoreMoveOf = React.useRef<string | null>(null);
  const refocusId = React.useRef<string | null>(null);
  const boardRef = React.useRef<HTMLDivElement>(null);
  const nextId = React.useRef(1);

  // What's on screen: the server's last word, plus moves still in flight, plus a card being carried by keyboard.
  const layout = React.useMemo(() => {
    let l = known;
    for (const op of pending) l = applyMove(l, op.cardId, op.to);
    if (session) l = applyMove(l, session.cardId, session.place);
    return l;
  }, [known, pending, session]);
  const layoutRef = React.useRef(layout);
  layoutRef.current = layout;

  // A card put back after a refused keyboard move moves to another column and loses focus; give it back.
  React.useEffect(() => {
    const id = refocusId.current;
    if (!id) return;
    refocusId.current = null;
    const active = document.activeElement;
    if (active && active !== document.body && active.getAttribute('data-board-card') !== id) return;
    boardRef.current?.querySelector<HTMLElement>(`[data-board-card="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
  }, [known]);

  const send = (cardId: string, to: Place, via: Op['via']) => {
    const from = columnOf(layoutRef.current, cardId) ?? to.column;
    const op: Op = { id: nextId.current++, cardId, from, to, via };
    const ticket = TICKETS[cardId];
    const moveText = from === to.column ? `${cardId} reordered in ${columnTitle(to.column)}` : `${cardId} → ${columnTitle(to.column)}`;
    setPending((p) => [...p, op]);
    setFailures(({ [cardId]: _, ...rest }) => rest);
    setLog((l) => [{ id: op.id, text: moveText, outcome: 'pending' as const }, ...l].slice(0, 6));

    server.move(cardId, to).then((res) => {
      setKnown(res.layout);
      setPending((p) => p.filter((o) => o.id !== op.id));
      setLog((l) =>
        l.map((e) => (e.id === op.id ? { ...e, outcome: res.ok ? 'accepted' : 'refused', reason: res.ok ? undefined : res.reason } : e)),
      );
      if (res.ok) return;

      const backIn = columnTitle(columnOf(res.layout, cardId) ?? from);
      const title = from === to.column ? `Couldn’t reorder “${ticket.title}”` : `Couldn’t move “${ticket.title}” to ${columnTitle(to.column)}`;
      toast({ tone: 'critical', title, description: `${res.reason} It’s back in ${backIn}.`, duration: 8000 });
      setFailures((f) => ({
        ...f,
        [cardId]: { key: op.id, message: from === to.column ? `Reorder failed: ${res.reason}` : `Move to ${columnTitle(to.column)} failed: ${res.reason}` },
      }));
      setTimeout(
        () => setFailures((f) => (f[cardId]?.key === op.id ? (({ [cardId]: _, ...rest }) => rest)(f) : f)),
        FAILURE_SHOWN_MS,
      );
      if (via === 'keyboard') refocusId.current = cardId;
    });
  };

  const onMove = (move: BoardMove) => {
    if (ignoreMoveOf.current === move.cardId) {
      // Escape: the board moves the card back to where it was picked up; we already dropped the local steps.
      ignoreMoveOf.current = null;
      return;
    }
    const s = sessionRef.current;
    if (s && s.cardId === move.cardId) {
      setSession({ ...s, place: move.to });
      return;
    }
    send(move.cardId, move.to, 'pointer');
  };

  // The board's own keyboard handling runs after this, on the card. We only watch it to know when a
  // card is picked up, dropped (send the move once) or cancelled (send nothing).
  const onKeyDownCapture = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const cardId = target.getAttribute('data-board-card');
    if (!cardId) return;
    const s = sessionRef.current;
    if (e.key === ' ' || e.key === 'Enter') {
      if (!s) {
        const origin = placeOf(layoutRef.current, cardId);
        if (origin) setSession({ cardId, origin, place: origin });
      } else if (s.cardId === cardId) {
        setSession(null);
        if (!samePlace(s.place, s.origin)) send(cardId, s.place, 'keyboard');
      }
    } else if (e.key === 'Escape' && s?.cardId === cardId) {
      setSession(null);
      ignoreMoveOf.current = cardId;
      setTimeout(() => {
        if (ignoreMoveOf.current === cardId) ignoreMoveOf.current = null;
      }, 0);
    }
  };

  // If focus leaves a carried card the board lets go of it without a drop. Nothing was sent, so put it back.
  const onBlurCapture = () => {
    setTimeout(() => {
      const s = sessionRef.current;
      if (!s || boardRef.current?.querySelector('[data-board-card][aria-pressed="true"]')) return;
      setSession(null);
      if (!samePlace(s.place, s.origin))
        toast({
          title: `“${TICKETS[s.cardId].title}” wasn’t moved`,
          description: 'Focus left the card before it was dropped, so it went back. Press Space or Enter to drop a card.',
        });
    }, 150);
  };

  const saving = new Set(pending.map((o) => o.cardId));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Support queue</h1>
          <p className="muted">
            Drag a ticket to another column, or focus it and press <Kbd>Space</Kbd>, move it with the arrow keys and press{' '}
            <Kbd>Space</Kbd> again to drop it (<Kbd>Esc</Kbd> cancels).
          </p>
        </div>
        <div className="page-status">
          {pending.length > 0 && (
            <span className="saving">
              <Spinner size={14} /> Saving {pending.length} {pending.length === 1 ? 'move' : 'moves'}…
            </span>
          )}
        </div>
      </header>

      <Board ref={boardRef} aria-label="Support tickets" onMove={onMove} onKeyDownCapture={onKeyDownCapture} onBlurCapture={onBlurCapture}>
        {COLUMNS.map((col) => {
          const ids = layout[col.id];
          const full = col.id === 'doing' && ids.length >= WIP_LIMIT;
          return (
            <BoardColumn
              key={col.id}
              id={col.id}
              aria-label={col.title}
              title={
                col.id === 'doing' ? (
                  <span className="col-title">
                    {col.title}
                    <Badge tone={full ? 'caution' : 'neutral'} variant="outline" lamp={full}>
                      {full ? 'Full' : `Limit ${WIP_LIMIT}`}
                    </Badge>
                  </span>
                ) : (
                  col.title
                )
              }
              className="col"
            >
              {ids.map((id) => (
                <TicketCard key={id} ticket={TICKETS[id]} saving={saving.has(id)} failure={failures[id]} />
              ))}
            </BoardColumn>
          );
        })}
      </Board>

      <section className="panel" aria-labelledby="server-title">
        <div className="panel-head">
          <h2 id="server-title">Simulated server</h2>
          <Switch
            checked={flaky}
            onCheckedChange={(v) => {
              setFlaky(v);
              server.options.failureRate = v ? 0.25 : 0;
            }}
            label="Flaky network (1 in 4 moves fails)"
          />
        </div>
        <ul className="rules">
          <li>{columnTitle('doing')} holds at most {WIP_LIMIT} tickets.</li>
          <li>A ticket can’t go to {columnTitle('done')} straight from {columnTitle('todo')}.</li>
          <li>A ticket waiting on the customer can’t be closed.</li>
        </ul>
        <h3 className="log-title">Recent requests</h3>
        {log.length === 0 ? (
          <p className="muted">No moves yet.</p>
        ) : (
          <ol className="log">
            {log.map((e) => (
              <li key={e.id}>
                <span className="log-move">{e.text}</span>
                {e.outcome === 'pending' && <Badge lamp="pulse">Waiting</Badge>}
                {e.outcome === 'accepted' && <Badge tone="positive">Accepted</Badge>}
                {e.outcome === 'refused' && (
                  <>
                    <Badge tone="critical">Refused</Badge>
                    <span className="log-reason">{e.reason}</span>
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

const PRIORITY: Record<Ticket['priority'], { label: string; tone: 'critical' | 'caution' | 'neutral' }> = {
  urgent: { label: 'Urgent', tone: 'critical' },
  high: { label: 'High', tone: 'caution' },
  normal: { label: 'Normal', tone: 'neutral' },
  low: { label: 'Low', tone: 'neutral' },
};

function TicketCard({ ticket, saving, failure }: { ticket: Ticket; saving: boolean; failure?: Failure }) {
  const p = PRIORITY[ticket.priority];
  return (
    <BoardCard
      id={ticket.id}
      label={ticket.title}
      settle={failure?.key}
      aria-busy={saving || undefined}
      className="ticket"
      data-failed={failure ? '' : undefined}
    >
      <div className="ticket-top">
        <span className="ticket-id">{ticket.id}</span>
        <Badge tone={p.tone} variant="tinted" lamp={false}>
          {p.label}
        </Badge>
      </div>
      <div className="ticket-title">{ticket.title}</div>
      <small>{ticket.customer}</small>
      <div className="ticket-foot">
        {ticket.assignee ? (
          <span className="ticket-person">
            <Avatar name={ticket.assignee} size={20} />
            {ticket.assignee}
          </span>
        ) : (
          <span className="ticket-person muted">Unassigned</span>
        )}
        {ticket.waiting && (
          <Badge tone="caution" variant="tinted">
            Waiting on customer
          </Badge>
        )}
      </div>
      {saving && (
        <div className="ticket-saving">
          <Spinner size={12} /> Saving…
        </div>
      )}
      {failure && <div className="ticket-error">{failure.message}</div>}
    </BoardCard>
  );
}

function App() {
  return (
    <>
      <SupportBoard />
      <Toaster />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
  </AltitudeProvider>,
);
