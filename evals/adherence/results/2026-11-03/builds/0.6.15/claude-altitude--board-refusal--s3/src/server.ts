// A simulated support-desk server. There is no backend: this module holds the authoritative board,
// answers after a delay, and refuses moves that break its rules. The UI never reads this state
// directly except to put a refused card back where the server says it is.

export type ColumnId = 'todo' | 'doing' | 'done';

export interface Ticket {
  id: string;
  title: string;
  ref: string;
  customer: string;
  assignee: string;
}

export type Columns = Record<ColumnId, Ticket[]>;

export const COLUMN_TITLES: Record<ColumnId, string> = {
  todo: 'To do',
  doing: 'In progress',
  done: 'Done',
};

export const IN_PROGRESS_LIMIT = 3;

export const initialColumns: Columns = {
  todo: [
    { id: 't4830', title: 'Invoice PDF shows the wrong VAT number', ref: '#4830', customer: 'Harbourside Dental', assignee: 'Priya' },
    { id: 't4827', title: 'Can’t add a second clinic location', ref: '#4827', customer: 'Fenwick & Oduya Physio', assignee: 'Tomás' },
    { id: 't4825', title: 'Password reset email lands in spam', ref: '#4825', customer: 'Marlow Freight', assignee: 'Unassigned' },
    { id: 't4822', title: 'Export appointments to CSV', ref: '#4822', customer: 'Brightwater Vets', assignee: 'Keiko' },
  ],
  doing: [
    { id: 't4819', title: 'Card payment declined at checkout', ref: '#4819', customer: 'Quarry Lane Vets', assignee: 'Priya' },
    { id: 't4816', title: 'SMS reminders sent twice', ref: '#4816', customer: 'Okafor Orthodontics', assignee: 'Dmitri' },
  ],
  done: [
    { id: 't4811', title: 'Change the billing contact', ref: '#4811', customer: 'Two Rivers Studio', assignee: 'Keiko' },
    { id: 't4808', title: 'Calendar sync stopped overnight', ref: '#4808', customer: 'Harbourside Dental', assignee: 'Tomás' },
  ],
};

export type MoveResult = { ok: true } | { ok: false; reason: string };

export interface Place {
  column: ColumnId;
  index: number;
}

const clone = (c: Columns): Columns => ({ todo: c.todo.slice(), doing: c.doing.slice(), done: c.done.slice() });

let state: Columns = clone(initialColumns);
let queue: Promise<unknown> = Promise.resolve();
let failNext = false;

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export function locate(columns: Columns, cardId: string): Place | null {
  for (const column of Object.keys(columns) as ColumnId[]) {
    const index = columns[column].findIndex(t => t.id === cardId);
    if (index >= 0) return { column, index };
  }
  return null;
}

/** Where the server last recorded this card. */
export function serverPlace(cardId: string): Place | null {
  return locate(state, cardId);
}

/** Fixture: make the next move fail as if the server were unreachable. */
export function setFailNext(value: boolean) {
  failNext = value;
}

export function isFailNextArmed() {
  return failNext;
}

/**
 * Ask the server to move a card. Requests are handled one at a time, in the order sent, so rules are
 * always checked against what the server has actually committed.
 */
export function requestMove(cardId: string, to: Place): Promise<MoveResult> {
  const run = async (): Promise<MoveResult> => {
    await wait(500 + Math.random() * 500);
    if (failNext) {
      failNext = false;
      return { ok: false, reason: 'We couldn’t reach the server. Try the move again.' };
    }
    const from = locate(state, cardId);
    if (!from) return { ok: false, reason: 'This ticket no longer exists on the board.' };
    if (to.column === 'doing' && from.column !== 'doing' && state.doing.length >= IN_PROGRESS_LIMIT) {
      return {
        ok: false,
        reason: `In progress is full (${IN_PROGRESS_LIMIT} of ${IN_PROGRESS_LIMIT}). Finish or move back a ticket first.`,
      };
    }
    const next = clone(state);
    const [card] = next[from.column].splice(from.index, 1);
    const index = Math.max(0, Math.min(to.index, next[to.column].length));
    next[to.column].splice(index, 0, card);
    state = next;
    return { ok: true };
  };
  const result = queue.then(run);
  queue = result.catch(() => undefined);
  return result;
}
