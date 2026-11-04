import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider, Badge, Board, BoardCard, BoardColumn, Icons, PageHeader, PageHeaderDescription, PageHeaderTitle, Switch,
} from 'altitude-design';
import type { BoardMove, BoardPlace } from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { COLUMN_ORDER, COLUMN_TITLES, Columns, ColumnId, DOING_LIMIT, INITIAL, moveCard, setFailNext } from './server';

type Write = { status: 'pending' | 'committed' | 'failed'; note?: string };

const place = (c: Columns, from: BoardPlace, to: BoardPlace): Columns => {
  const next: Columns = { todo: c.todo.slice(), doing: c.doing.slice(), done: c.done.slice() };
  const [card] = next[from.column as ColumnId].splice(from.index, 1);
  if (!card) return c;
  const col = next[to.column as ColumnId];
  col.splice(Math.max(0, Math.min(to.index, col.length)), 0, card);
  return next;
};

const findCard = (c: Columns, id: string): BoardPlace | null => {
  for (const column of COLUMN_ORDER) {
    const index = c[column].findIndex(t => t.id === id);
    if (index >= 0) return { column, index };
  }
  return null;
};

function SupportBoard() {
  const [cols, setCols] = React.useState<Columns>(INITIAL);
  const colsRef = React.useRef(cols);
  colsRef.current = cols;
  const [writes, setWrites] = React.useState<Record<string, Write>>({});
  const [announcement, setAnnouncement] = React.useState('');
  const [failNext, setFailNextState] = React.useState(false);
  // Moves still waiting on the server, per card. Only the last answer decides where the card ends up, so a card
  // carried through a full column on its way somewhere else isn't snapped back by the intermediate step.
  const inFlight = React.useRef<Record<string, number>>({});

  const toggleFail = (v: boolean) => { setFailNextState(v); setFailNext(v); };

  const onMove = async ({ cardId, from, to }: BoardMove) => {
    const ticket = Object.values(colsRef.current).flat().find(t => t.id === cardId);
    if (!ticket) return;
    setCols(c => place(c, from, to));
    setWrites(w => ({ ...w, [cardId]: { status: 'pending' } }));
    inFlight.current[cardId] = (inFlight.current[cardId] ?? 0) + 1;

    const result = await moveCard({ cardId, to: { column: to.column as ColumnId, index: to.index } });
    setFailNextState(false); // the server consumes the fixture on the first request it answers
    const remaining = --inFlight.current[cardId];
    if (remaining > 0) return; // a later move for this card is still in flight; its answer decides

    if (result.ok) {
      const now = findCard(colsRef.current, cardId);
      const where = COLUMN_TITLES[(now?.column ?? to.column) as ColumnId];
      setWrites(w => ({ ...w, [cardId]: { status: 'committed' } }));
      setAnnouncement(`Moved “${ticket.title}” to ${where}.`);
    } else {
      const back = COLUMN_TITLES[result.at.column];
      setCols(c => {
        const here = findCard(c, cardId);
        return here ? place(c, here, result.at) : c;
      });
      const note = `${result.reason} It’s back in ${back}.`;
      setWrites(w => ({ ...w, [cardId]: { status: 'failed', note } }));
      setAnnouncement(`Couldn’t move “${ticket.title}”: ${note}`);
    }
  };

  return (
    <div className="support-page">
      <PageHeader>
        <PageHeaderTitle>Support queue</PageHeaderTitle>
        <PageHeaderDescription>
          Move tickets as you work them. In progress holds at most {DOING_LIMIT}.
        </PageHeaderDescription>
      </PageHeader>

      <Board onMove={onMove} aria-label="Support tickets" className="support-board">
        {COLUMN_ORDER.map(k => (
          <BoardColumn
            key={k}
            id={k}
            title={k === 'doing' ? `${COLUMN_TITLES[k]} · limit ${DOING_LIMIT}` : COLUMN_TITLES[k]}
          >
            {cols[k].map(t => {
              const w = writes[t.id];
              return (
                <BoardCard key={t.id} id={t.id} label={t.title} status={w?.status}>
                  {t.title}
                  {w?.status === 'failed' ? (
                    <small className="move-refused">
                      <Badge tone="critical">
                        <Icons.AlertCircle size={14} aria-hidden="true" /> Move refused
                      </Badge>
                      <span>{w.note}</span>
                    </small>
                  ) : w?.status === 'pending' ? (
                    <small>
                      <Icons.Clock size={14} aria-hidden="true" /> Saving move… · {t.customer}
                    </small>
                  ) : (
                    <small>{t.customer} · {t.assignee}</small>
                  )}
                </BoardCard>
              );
            })}
          </BoardColumn>
        ))}
      </Board>

      <p className="support-status" role="status" aria-live="polite">
        {announcement || 'Drag a ticket, or focus one and press Space, then the arrow keys; Space drops it and Escape puts it back.'}
      </p>

      <details className="support-fixtures">
        <summary>Simulated server</summary>
        <Switch label="Make the next move fail (server unavailable)" checked={failNext} onCheckedChange={toggleFail} />
      </details>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <SupportBoard />
  </AltitudeProvider>,
);
