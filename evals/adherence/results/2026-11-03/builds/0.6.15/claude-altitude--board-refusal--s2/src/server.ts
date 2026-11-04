// A simulated support-desk server. There is no backend: this module keeps its own copy of the board,
// applies moves one at a time in the order they arrive, and can refuse them. The client never reads
// this state directly except to learn where a refused card really is.

export type ColumnId = 'todo' | 'doing' | 'done';

export const COLUMN_IDS: ColumnId[] = ['todo', 'doing', 'done'];
export const COLUMN_TITLES: Record<ColumnId, string> = { todo: 'To do', doing: 'In progress', done: 'Done' };
export const IN_PROGRESS_LIMIT = 3;

export interface Ticket {
  id: string;
  title: string;
  ref: string;
  queue: string;
  assignee: string;
}

export type Columns = Record<ColumnId, Ticket[]>;

export const initialColumns: Columns = {
  todo: [
    { id: 't4821', title: 'Refund double charge on annual plan', ref: '#4821', queue: 'Billing', assignee: 'Priya' },
    { id: 't4824', title: 'SSO login loops back to sign-in page', ref: '#4824', queue: 'Access', assignee: 'Tomás' },
    { id: 't4830', title: 'Export to CSV drops accented names', ref: '#4830', queue: 'Data', assignee: 'Wen' },
    { id: 't4833', title: 'Change invoice address for Harbourside Dental', ref: '#4833', queue: 'Billing', assignee: 'Priya' },
  ],
  doing: [
    { id: 't4809', title: 'Webhook retries flooding customer endpoint', ref: '#4809', queue: 'Integrations', assignee: 'Okonkwo' },
    { id: 't4815', title: 'Restore deleted shared folder', ref: '#4815', queue: 'Data', assignee: 'Wen' },
  ],
  done: [
    { id: 't4790', title: 'Reset two-factor for Brightwater Freight admin', ref: '#4790', queue: 'Access', assignee: 'Tomás' },
    { id: 't4797', title: 'Explain proration on mid-cycle upgrade', ref: '#4797', queue: 'Billing', assignee: 'Priya' },
  ],
};

export type MoveResult =
  | { ok: true }
  | { ok: false; code: 'wip-limit' | 'unreachable'; reason: string };

export interface ServerOptions {
  /** Response time in milliseconds. */
  latency: number;
  /** Refuse this request as if the server couldn't be reached. */
  unreachable: boolean;
}

// The server's record: ticket ids per column.
const record: Record<ColumnId, string[]> = {
  todo: initialColumns.todo.map(t => t.id),
  doing: initialColumns.doing.map(t => t.id),
  done: initialColumns.done.map(t => t.id),
};

/** Where the server has a ticket. */
export function locate(id: string): { column: ColumnId; index: number } {
  for (const column of COLUMN_IDS) {
    const index = record[column].indexOf(id);
    if (index >= 0) return { column, index };
  }
  throw new Error(`Unknown ticket ${id}`);
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

// Requests are handled strictly in arrival order, as one queue.
let queue: Promise<unknown> = Promise.resolve();

/** Ask the server to put a ticket at `column`, position `index`. */
export function moveTicket(id: string, column: ColumnId, index: number, options: ServerOptions): Promise<MoveResult> {
  const run = async (): Promise<MoveResult> => {
    await wait(options.latency);
    if (options.unreachable) {
      return { ok: false, code: 'unreachable', reason: 'We couldn’t reach the server, so nothing was saved. Try the move again.' };
    }
    const from = locate(id);
    if (column === 'doing' && from.column !== 'doing' && record.doing.length >= IN_PROGRESS_LIMIT) {
      return {
        ok: false,
        code: 'wip-limit',
        reason: `In progress is full (${IN_PROGRESS_LIMIT} of ${IN_PROGRESS_LIMIT}). Move a ticket out of it first.`,
      };
    }
    record[from.column].splice(from.index, 1);
    const target = record[column];
    target.splice(Math.max(0, Math.min(index, target.length)), 0, id);
    return { ok: true };
  };
  const result = queue.then(run);
  queue = result.catch(() => undefined);
  return result;
}
