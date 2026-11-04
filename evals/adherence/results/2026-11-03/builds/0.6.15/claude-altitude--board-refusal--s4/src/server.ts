// A simulated support-board server. There is no backend: this module holds the authoritative board and answers
// move requests after a delay, one at a time in the order they arrive, the way a real API would serialise writes.
// It can refuse a move; the client must then put the card back where the server still has it.

export type ColumnId = 'todo' | 'doing' | 'done';

export interface Ticket {
  id: string;
  title: string;
  customer: string;
  assignee: string;
}

export type Columns = Record<ColumnId, Ticket[]>;

export const COLUMN_ORDER: ColumnId[] = ['todo', 'doing', 'done'];
export const COLUMN_TITLES: Record<ColumnId, string> = { todo: 'To do', doing: 'In progress', done: 'Done' };
/** Work-in-progress limit the server enforces on In progress. */
export const DOING_LIMIT = 3;

export const INITIAL: Columns = {
  todo: [
    { id: 't1', title: 'Refund double charge', customer: 'Quarry Lane Vets', assignee: 'Ivy' },
    { id: 't2', title: 'SSO login loop', customer: 'Northwind', assignee: 'Jon' },
    { id: 't3', title: 'Export stuck at 90%', customer: 'Bramble & Co', assignee: 'Lena' },
    { id: 't4', title: 'Change billing email', customer: 'Fieldnote', assignee: 'Ada' },
  ],
  doing: [
    { id: 't5', title: 'Webhook retries failing', customer: 'Harbor Freight Labs', assignee: 'Mara' },
    { id: 't6', title: 'Invoice shows wrong VAT', customer: 'Kestrel GmbH', assignee: 'Ivy' },
  ],
  done: [
    { id: 't7', title: 'Reset 2FA for admin', customer: 'Lumen Dental', assignee: 'Jon' },
  ],
};

export interface MoveRequest {
  cardId: string;
  to: { column: ColumnId; index: number };
}

export type MoveResult =
  | { ok: true }
  | { ok: false; reason: string; /** Where the server still has the card. */ at: { column: ColumnId; index: number } };

const clone = (c: Columns): Columns => ({ todo: c.todo.slice(), doing: c.doing.slice(), done: c.done.slice() });

let db: Columns = clone(INITIAL);
let queue: Promise<unknown> = Promise.resolve();
let failNext = false;

/** Test fixture: the next request fails as if the server were unavailable. */
export function setFailNext(v: boolean) { failNext = v; }

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

function locate(cardId: string) {
  for (const column of COLUMN_ORDER) {
    const index = db[column].findIndex(t => t.id === cardId);
    if (index >= 0) return { column, index };
  }
  return null;
}

export function moveCard(req: MoveRequest): Promise<MoveResult> {
  const run = async (): Promise<MoveResult> => {
    await wait(500 + Math.random() * 400);
    const at = locate(req.cardId);
    if (!at) return { ok: false, reason: 'This ticket no longer exists.', at: { column: 'todo', index: 0 } };
    if (failNext) {
      failNext = false;
      return { ok: false, reason: 'The server didn’t respond. Nothing was changed.', at };
    }
    if (req.to.column === 'doing' && at.column !== 'doing' && db.doing.length >= DOING_LIMIT) {
      return { ok: false, reason: `In progress is full (${DOING_LIMIT} of ${DOING_LIMIT}). Finish or move a ticket out first.`, at };
    }
    const next = clone(db);
    const [card] = next[at.column].splice(at.index, 1);
    const index = Math.max(0, Math.min(req.to.index, next[req.to.column].length));
    next[req.to.column].splice(index, 0, card);
    db = next;
    return { ok: true };
  };
  const p = queue.then(run);
  queue = p.catch(() => undefined);
  return p;
}
