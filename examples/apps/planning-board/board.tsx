// The board: four columns where carrying a card opens them into wells. A move is optimistic: the card goes where you
// put it and hovers (pending) until the server accepts it, then lands. If the server refuses (In progress is full, a
// teammate is holding it, it's offline), the card goes back where it came from and says why, on the card and aloud.
// A conflict adopts the server's board. A lost response is reconciled by reading the board back.
import * as React from 'react';
import { AILabel, Board, BoardCard, BoardColumn, Button } from 'altitude-design';
import type { BoardMove } from 'altitude-design';
import type { DemoQuery } from '../shared/react';
import { errorMessage, isDemoError } from '../shared/react';
import { COLUMNS, COLUMN_TITLE, WIP_LIMIT, service } from './data';
import type { BoardData, Card, ColumnId } from './data';
import { short } from './assistant-script';
import type { Proposals } from './assistant';

type Write = { status: 'pending' | 'committed' | 'failed'; note: string };

const place = (cols: Record<ColumnId, string[]>, id: string, column: ColumnId, index: number) => {
  const next = Object.fromEntries(Object.entries(cols).map(([k, v]) => [k, v.filter((x) => x !== id)])) as Record<ColumnId, string[]>;
  next[column] = [...next[column]];
  next[column].splice(Math.max(0, Math.min(index, next[column].length)), 0, id);
  return next;
};
const meta = (k: Card) => [k.epic, k.assignee ?? 'Unassigned', k.points ? `${k.points} pts` : 'No estimate'].join(' · ');

export function BoardView({ q, onOpen, say, assistant }: { q: DemoQuery<BoardData>; onOpen: (id: string) => void; say: (s: string) => void; assistant?: Proposals }) {
  const data = q.data!;
  const [writes, setWrites] = React.useState<Record<string, Write | undefined>>({});
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({ done: true });
  const timers = React.useRef<Record<string, number>>({});
  const mark = (id: string, w: Write | undefined) => {
    window.clearTimeout(timers.current[id]);
    setWrites((s) => ({ ...s, [id]: w }));
    if (w?.status === 'committed') timers.current[id] = window.setTimeout(() => setWrites((s) => ({ ...s, [id]: undefined })), 1600);
  };
  React.useEffect(() => () => Object.values(timers.current).forEach((t) => window.clearTimeout(t)), []);

  // A card this board hasn't shown before arrives lifted and settles; the first load is simply there.
  const known = React.useRef<Set<string> | null>(null);
  const [arrived, setArrived] = React.useState<Record<string, number>>({});
  React.useEffect(() => {
    const ids = Object.keys(data.cards);
    if (known.current) {
      const fresh = ids.filter((id) => !known.current!.has(id));
      if (fresh.length) {
        const now = Date.now();
        setArrived((a) => ({ ...a, ...Object.fromEntries(fresh.map((id) => [id, now])) }));
        say(fresh.length === 1 ? `New card: ${data.cards[fresh[0]].title}.` : `${fresh.length} new cards.`);
      }
    }
    known.current = new Set(ids);
  }, [data.cards]); // eslint-disable-line react-hooks/exhaustive-deps

  // A move applies at once and is sent once the card settles: by keyboard every arrow step is a move, and Escape moves
  // it back, so the server hears one request from where the card started to where it ended, or none if it's back home.
  const latest = React.useRef(data);
  latest.current = data;
  const origins = React.useRef<Record<string, { column: ColumnId; index: number; rev: number; timer: number }>>({});
  const locate = (cols: Record<ColumnId, string[]>, id: string) => {
    const column = (Object.keys(cols) as ColumnId[]).find((c) => cols[c].includes(id))!;
    return { column, index: cols[column].indexOf(id) };
  };
  const send = async (cardId: string) => {
    const origin = origins.current[cardId];
    // Still in the hand (picked up by keyboard): wait until it's dropped.
    if (document.querySelector(`[data-board-card="${CSS.escape(cardId)}"]`)?.getAttribute('aria-pressed') === 'true') {
      origin.timer = window.setTimeout(() => void send(cardId), 400);
      return;
    }
    delete origins.current[cardId];
    const to = locate(latest.current.columns, cardId);
    if (to.column === origin.column && to.index === origin.index) { mark(cardId, undefined); return; }
    const k = latest.current.cards[cardId];
    mark(cardId, { status: 'pending', note: 'Moving…' });
    try {
      const b = await service.request<BoardData>('cards.move', { id: cardId, column: to.column, index: to.index, rev: origin.rev });
      q.setData(() => b);
      mark(cardId, { status: 'committed', note: '' });
      say(`${k.title} moved to ${COLUMN_TITLE[to.column]}.`);
    } catch (e) {
      if (isDemoError(e, 'lost-response')) {
        try {
          const b = await service.request<BoardData>('board.get');
          q.setData(() => b);
          if (b.columns[to.column].includes(cardId)) { mark(cardId, { status: 'committed', note: '' }); say(`${k.title} moved to ${COLUMN_TITLE[to.column]}.`); return; }
        } catch { /* fall through: say it wasn't moved */ }
      }
      let note: string;
      if (isDemoError(e, 'conflict')) {
        const now = e.current as BoardData | undefined;
        if (now) q.setData(() => now);
        note = `Someone else moved this card first${now ? `. It’s in ${COLUMN_TITLE[locate(now.columns, cardId).column]}` : ''}.`;
      } else {
        q.setData((d) => (d ? { ...d, columns: place(d.columns, cardId, origin.column, origin.index) } : d));
        note = `Couldn’t move it: ${errorMessage(e)} It’s back in ${COLUMN_TITLE[origin.column]}.`;
      }
      mark(cardId, { status: 'failed', note });
      say(`${k.title}: ${note}`);
    }
  };
  const move = ({ cardId, from, to }: BoardMove) => {
    if (from.column === to.column && from.index === to.index) return;
    const o = origins.current[cardId];
    if (o) window.clearTimeout(o.timer);
    else origins.current[cardId] = { column: from.column as ColumnId, index: from.index, rev: data.cards[cardId].rev, timer: 0 };
    origins.current[cardId].timer = window.setTimeout(() => void send(cardId), 400);
    q.setData((d) => (d ? { ...d, columns: place(d.columns, cardId, to.column as ColumnId, to.index) } : d));
    if (writes[cardId]?.status === 'failed') mark(cardId, undefined);
  };
  React.useEffect(() => () => Object.values(origins.current).forEach((o) => window.clearTimeout(o.timer)), []);

  const create = (column: ColumnId) => async (title: string) => {
    try {
      const k = await service.request<Card>('cards.create', { column, title });
      known.current?.add(k.id);
      q.setData((d) => (d ? { ...d, cards: { ...d.cards, [k.id]: k }, columns: { ...d.columns, [column]: [...d.columns[column], k.id] } } : d));
      return { ok: true as const, value: { id: k.id } };
    } catch (e) {
      return { ok: false as const, error: errorMessage(e) };
    }
  };

  return (
    <div className="pb-board">
      <Board onMove={move} aria-label="Sprint board">
        {COLUMNS.map((col) => {
          const ids = data.columns[col.id];
          const title = col.id === 'doing' ? `${col.title} (${ids.length} of ${WIP_LIMIT})` : col.title;
          return (
            <BoardColumn key={col.id} id={col.id} title={title} collapsible={col.id === 'backlog' || col.id === 'done'}
              collapsed={!!collapsed[col.id]} onCollapsedChange={(v) => setCollapsed((s) => ({ ...s, [col.id]: v }))}
              onCreate={col.id === 'backlog' ? create('backlog') : undefined} addLabel="Add a card to the backlog">
              {ids.map((id) => {
                const k = data.cards[id];
                const w = writes[id];
                const holder = data.held[id];
                return (
                  <BoardCard key={id} id={id} label={k.title} heldBy={holder ? { name: holder, presence: 1 } : undefined} settle={arrived[id]}
                    status={w?.status ?? (assistant?.proposals.some((p) => p.card === id && p.status === 'pending') ? 'pending' : undefined)}>
                    <span className="pb-title">{k.title}</span>
                    <small className="pb-meta">{meta(k)}</small>
                    {w?.note && <small className="pb-note" data-tone={w.status}>{w.note}</small>}
                    {assistant && <CardProposals id={id} title={k.title} assistant={assistant} />}
                    <span className="pb-open">
                      <Button size="sm" variant="ghost" aria-label={`Open ${k.title}`}
                        onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onOpen(id); }}>Details</Button>
                    </span>
                  </BoardCard>
                );
              })}
            </BoardColumn>
          );
        })}
      </Board>
      <p className="pb-hint">Drag a card, or focus one and press Space, then the arrow keys. In progress holds {WIP_LIMIT} cards.</p>
    </div>
  );
}

// The assistant's proposals for one card, in words on the card: proposed (nothing sent), applying, out of date or not
// applied, each with what to do. BoardCard has no proposed reading of its own yet (#444), so the card doesn't rise for a
// proposal; the word "Proposed" and the Accept and Reject buttons carry it. Applied changes keep an AILabel.
const stop = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation(), onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation() };
function CardProposals({ id, title, assistant }: { id: string; title: string; assistant: Proposals }) {
  const mine = assistant.proposals.filter((p) => p.card === id && p.status !== 'rejected');
  if (!mine.length) return null;
  const applied = mine.filter((p) => p.status === 'applied');
  return (
    <span className="pb-card-proposals">
      {mine.filter((p) => p.status !== 'applied').map((p) => (
        <span key={p.id} className="pb-card-proposal" data-status={p.status}>
          <small><strong>{p.status === 'proposed' ? 'Proposed' : p.status === 'pending' ? 'Applying' : p.status === 'stale' ? 'Out of date' : 'Not applied'}:</strong> {short(p)}{p.edited ? ' (edited)' : ''}</small>
          {(p.status === 'proposed' || p.status === 'failed') && (
            <span className="pb-proposal-actions">
              <Button size="sm" {...stop} onClick={(e) => { e.stopPropagation(); void assistant.apply(p.id); }} aria-label={`Accept: ${short(p)} for ${title}`}>{p.status === 'failed' ? 'Retry' : 'Accept'}</Button>
              <Button size="sm" variant="ghost" {...stop} onClick={(e) => { e.stopPropagation(); assistant.reject(p.id); }} aria-label={`Reject: ${short(p)} for ${title}`}>Reject</Button>
            </span>
          )}
          {p.note && p.status !== 'pending' && <small className="pb-note" data-tone={p.status === 'proposed' ? undefined : 'failed'}>{p.note}</small>}
        </span>
      ))}
      {applied.length > 0 && <span className="pb-card-ai"><AILabel subject={`${title}: ${applied.map(short).join(', ')}`} model="Scripted assistant (no model)" reviewedBy="you" /></span>}
    </span>
  );
}
