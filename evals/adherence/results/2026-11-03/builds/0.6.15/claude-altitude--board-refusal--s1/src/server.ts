// A simulated support-desk server. There is no backend: this module owns the authoritative ticket order,
// answers after a delay, and refuses moves that break the desk's rules. The client never trusts its own copy
// over this one; when a move is refused it puts the card back where this server says it is.

export type ColumnId = 'todo' | 'doing' | 'done';

export interface Ticket {
  id: string;
  title: string;
  customer: string;
  priority: 'Urgent' | 'Normal' | 'Low';
  /** Unassigned tickets can't be closed. */
  assignee?: string;
}

export type Columns = Record<ColumnId, Ticket[]>;

export interface Place {
  column: ColumnId;
  index: number;
}

export type MoveResult =
  | { ok: true; at: Place }
  | { ok: false; reason: string; at: Place };

export const COLUMN_ORDER: ColumnId[] = ['todo', 'doing', 'done'];
export const COLUMN_TITLES: Record<ColumnId, string> = { todo: 'To do', doing: 'In progress', done: 'Done' };
export const IN_PROGRESS_LIMIT = 3;

export const initialColumns: Columns = {
  todo: [
    { id: 't-1042', title: 'Invoice PDF shows the wrong VAT number', customer: 'Fenwick Freight', priority: 'Urgent', assignee: 'Priya' },
    { id: 't-1047', title: 'Reset two-factor for the clinic manager', customer: 'Marlow Street Dental', priority: 'Normal' },
    { id: 't-1051', title: 'Export of March bookings times out', customer: 'Two Oaks Studio', priority: 'Normal', assignee: 'Tomás' },
    { id: 't-1053', title: 'Question about seat pricing for 40 users', customer: 'Kestrel Ridge School', priority: 'Low', assignee: 'Dee' },
  ],
  doing: [
    { id: 't-1031', title: 'SMS reminders not sending since Tuesday', customer: 'Marlow Street Dental', priority: 'Urgent', assignee: 'Kwame' },
    { id: 't-1036', title: 'Merge duplicate customer records', customer: 'Fenwick Freight', priority: 'Normal', assignee: 'Priya' },
    { id: 't-1039', title: 'Calendar sync drops recurring events', customer: 'Two Oaks Studio', priority: 'Normal', assignee: 'Dee' },
  ],
  done: [
    { id: 't-1018', title: 'Password reset email lands in spam', customer: 'Kestrel Ridge School', priority: 'Normal', assignee: 'Tomás' },
    { id: 't-1024', title: 'Add a second billing contact', customer: 'Fenwick Freight', priority: 'Low', assignee: 'Kwame' },
  ],
};

const clone = (c: Columns): Columns => ({ todo: [...c.todo], doing: [...c.doing], done: [...c.done] });
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export function locate(cols: Columns, id: string): Place | null {
  for (const column of COLUMN_ORDER) {
    const index = cols[column].findIndex(t => t.id === id);
    if (index >= 0) return { column, index };
  }
  return null;
}

/** Fixtures for trying the failure paths by hand. */
export interface ServerFixtures {
  /** The next move gets no answer: a network failure rather than a rule. */
  dropNextMove: boolean;
  /** Milliseconds before the server answers. */
  latency: number;
}

export class SupportDeskServer {
  private cols: Columns;
  private queue: Promise<unknown> = Promise.resolve();
  fixtures: ServerFixtures = { dropNextMove: false, latency: 800 };

  constructor(start: Columns) {
    this.cols = clone(start);
  }

  /** Moves are applied one at a time, in the order they arrive, as a real server would serialise writes. */
  moveTicket(ticketId: string, to: Place): Promise<MoveResult> {
    const run = this.queue.then(() => this.applyMove(ticketId, to));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async applyMove(ticketId: string, to: Place): Promise<MoveResult> {
    await wait(this.fixtures.latency);
    const at = locate(this.cols, ticketId);
    if (!at) throw new Error(`Unknown ticket ${ticketId}`);
    const ticket = this.cols[at.column][at.index];

    if (this.fixtures.dropNextMove) {
      this.fixtures.dropNextMove = false;
      return { ok: false, reason: 'We couldn’t reach the server. Try the move again.', at };
    }
    if (to.column === 'doing' && at.column !== 'doing' && this.cols.doing.length >= IN_PROGRESS_LIMIT) {
      return {
        ok: false,
        reason: `In progress is full (${IN_PROGRESS_LIMIT} of ${IN_PROGRESS_LIMIT}). Finish or move back a ticket first.`,
        at,
      };
    }
    if (to.column === 'done' && at.column !== 'done' && !ticket.assignee) {
      return { ok: false, reason: 'Assign someone to this ticket before closing it.', at };
    }

    const next = clone(this.cols);
    next[at.column].splice(at.index, 1);
    const index = Math.max(0, Math.min(to.index, next[to.column].length));
    next[to.column].splice(index, 0, ticket);
    this.cols = next;
    return { ok: true, at: { column: to.column, index } };
  }
}
