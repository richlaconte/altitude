// A simulated support-desk server. There is no backend: this module keeps its own copy of the board (the truth),
// applies moves one at a time in the order they arrive, after a network-like delay, and can refuse them.

export type ColumnId = 'todo' | 'doing' | 'done';

export interface Ticket {
  id: string;
  title: string;
  customer: string;
  assignee?: string;
}

export type Columns = Record<ColumnId, Ticket[]>;

export type MoveResult =
  | { ok: true }
  | { ok: false; code: 'wip-limit' | 'needs-assignee' | 'unknown-card' | 'unreachable'; reason: string };

export const COLUMN_TITLES: Record<ColumnId, string> = {
  todo: 'To do',
  doing: 'In progress',
  done: 'Done',
};

export const IN_PROGRESS_LIMIT = 3;

const copy = (c: Columns): Columns => ({ todo: c.todo.slice(), doing: c.doing.slice(), done: c.done.slice() });

export function locate(cols: Columns, id: string): { column: ColumnId; index: number } | null {
  for (const column of Object.keys(cols) as ColumnId[]) {
    const index = cols[column].findIndex(t => t.id === id);
    if (index >= 0) return { column, index };
  }
  return null;
}

export function createServer(initial: Columns) {
  let truth = copy(initial);
  let queue: Promise<unknown> = Promise.resolve();
  let dropNext = false;

  const delay = () => new Promise(r => setTimeout(r, 450 + Math.random() * 450));

  function apply(id: string, to: ColumnId, toIndex: number): MoveResult {
    if (dropNext) {
      dropNext = false;
      return { ok: false, code: 'unreachable', reason: 'We couldn’t reach the server. Try the move again.' };
    }
    const at = locate(truth, id);
    if (!at) return { ok: false, code: 'unknown-card', reason: 'This ticket no longer exists on the server.' };
    const ticket = truth[at.column][at.index];
    if (to === 'doing' && at.column !== 'doing' && truth.doing.length >= IN_PROGRESS_LIMIT) {
      return {
        ok: false,
        code: 'wip-limit',
        reason: `In progress is full at ${IN_PROGRESS_LIMIT} tickets. Finish or move one out first.`,
      };
    }
    if (to === 'done' && at.column !== 'done' && !ticket.assignee) {
      return { ok: false, code: 'needs-assignee', reason: 'Nobody is assigned. Assign someone before closing it.' };
    }
    const next = copy(truth);
    next[at.column].splice(at.index, 1);
    next[to].splice(Math.min(toIndex, next[to].length), 0, ticket);
    truth = next;
    return { ok: true };
  }

  return {
    /** Move a ticket. Requests are applied in the order they were sent. */
    move(id: string, to: ColumnId, toIndex: number): Promise<MoveResult> {
      const run = queue.then(async () => {
        await delay();
        return apply(id, to, toIndex);
      });
      queue = run.catch(() => undefined);
      return run;
    },
    /** Where the server says a ticket is right now. */
    locate(id: string) {
      return locate(truth, id);
    },
    /** Test fixture: lose the next request's response as if the network dropped. */
    dropNextRequest(on: boolean) {
      dropNext = on;
    },
  };
}
