// A simulated helpdesk server. It owns the real state of the board; the UI only
// ever shows its own optimistic copy until the server confirms or refuses a move.

export type ColumnId = 'todo' | 'doing' | 'done';
export type Columns = Record<ColumnId, string[]>;

export interface Ticket {
  id: string;
  title: string;
  requester: string;
  assignee: string | null;
  priority: 'low' | 'normal' | 'high';
}

export const COLUMN_TITLES: Record<ColumnId, string> = { todo: 'To do', doing: 'In progress', done: 'Done' };
export const COLUMN_ORDER: ColumnId[] = ['todo', 'doing', 'done'];
export const IN_PROGRESS_LIMIT = 3;

export const TICKETS: Record<string, Ticket> = Object.fromEntries(
  ([
    { id: 'SUP-1042', title: 'Password reset email never arrives', requester: 'Northwind Studio', assignee: 'Priya Natarajan', priority: 'high' },
    { id: 'SUP-1043', title: 'Invoice shows the wrong VAT number', requester: 'Halden & Co', assignee: 'Marco Bellini', priority: 'normal' },
    { id: 'SUP-1044', title: 'Export to CSV drops accented characters', requester: 'Lumen Labs', assignee: null, priority: 'normal' },
    { id: 'SUP-1045', title: 'Cannot add a second admin', requester: 'Brightpath', assignee: 'Sam Okafor', priority: 'low' },
    { id: 'SUP-1046', title: 'SSO login loops back to sign-in page', requester: 'Corvid Health', assignee: 'Priya Natarajan', priority: 'high' },
    { id: 'SUP-1047', title: 'Webhook retries flood our endpoint', requester: 'Tessellate', assignee: 'Marco Bellini', priority: 'high' },
    { id: 'SUP-1048', title: 'Mobile app crashes when attaching photos', requester: 'Fieldwise', assignee: 'Sam Okafor', priority: 'normal' },
    { id: 'SUP-1049', title: 'Request to delete a closed account', requester: 'J. Moreau', assignee: 'Ana Costa', priority: 'low' },
    { id: 'SUP-1050', title: 'Dashboard timezone is off by an hour', requester: 'Oakline', assignee: 'Ana Costa', priority: 'normal' },
  ] as Ticket[]).map((t) => [t.id, t]),
);

let db: Columns = {
  todo: ['SUP-1042', 'SUP-1043', 'SUP-1044', 'SUP-1045'],
  doing: ['SUP-1046', 'SUP-1047'],
  done: ['SUP-1048', 'SUP-1049', 'SUP-1050'],
};

export const snapshot = (): Columns => ({ todo: [...db.todo], doing: [...db.doing], done: [...db.done] });

export function locate(cols: Columns, id: string): { column: ColumnId; index: number } | null {
  for (const column of COLUMN_ORDER) {
    const index = cols[column].indexOf(id);
    if (index >= 0) return { column, index };
  }
  return null;
}

export class MoveRefused extends Error {
  constructor(message: string, readonly board: Columns) {
    super(message);
  }
}

export const settings = { flaky: false };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** PATCH /tickets/:id/position. Resolves with the server's board, or rejects with MoveRefused (reason + server's board). */
export async function moveTicket(id: string, to: ColumnId, index: number): Promise<Columns> {
  await wait(500 + Math.random() * 500);
  const from = locate(db, id);
  const ticket = TICKETS[id];
  if (!from || !ticket) throw new MoveRefused('This ticket no longer exists.', snapshot());

  if (settings.flaky && Math.random() < 0.35) {
    throw new MoveRefused('The server didn’t respond in time. Nothing was changed; try again.', snapshot());
  }
  if (to === 'doing' && from.column !== 'doing') {
    if (!ticket.assignee) {
      throw new MoveRefused('Unassigned tickets can’t be started. Assign someone first.', snapshot());
    }
    if (db.doing.length >= IN_PROGRESS_LIMIT) {
      throw new MoveRefused(`In progress is full (${IN_PROGRESS_LIMIT} of ${IN_PROGRESS_LIMIT}). Finish or return a ticket first.`, snapshot());
    }
  }

  const next = snapshot();
  next[from.column].splice(from.index, 1);
  next[to].splice(Math.max(0, Math.min(index, next[to].length)), 0, id);
  db = next;
  return snapshot();
}
