// A simulated support-desk API. There is no backend: this module keeps its own
// copy of the board, which is the record. The client moves cards optimistically
// and asks this "server" to commit each move; the server may refuse.

export type ColumnId = 'todo' | 'doing' | 'done';

export interface Ticket {
  id: string;
  title: string;
  customer: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  assignee?: string;
}

export type Layout = Record<ColumnId, string[]>;

export const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'In progress' },
  { id: 'done', title: 'Done' },
];

export const IN_PROGRESS_LIMIT = 3;

export const TICKETS: Record<string, Ticket> = Object.fromEntries(
  ([
    { id: 'SUP-101', title: 'Password reset email never arrives', customer: 'Northwind Studio', priority: 'High', assignee: 'Priya' },
    { id: 'SUP-102', title: 'Invoice shows the wrong VAT rate', customer: 'Bluebird Bakery', priority: 'Normal', assignee: 'Marco' },
    { id: 'SUP-103', title: 'CSV export times out over 10k rows', customer: 'Atlas Freight', priority: 'Urgent', assignee: 'Sam' },
    { id: 'SUP-104', title: 'Add a second admin to the account', customer: 'Fern & Co', priority: 'Low' },
    { id: 'SUP-105', title: 'SSO login loops back to sign-in', customer: 'Helix Labs', priority: 'Urgent', assignee: 'Priya' },
    { id: 'SUP-106', title: 'Webhook retries are firing twice', customer: 'Orbit Payments', priority: 'High', assignee: 'Jun' },
    { id: 'SUP-107', title: 'Cancel subscription at end of term', customer: 'Quill Press', priority: 'Normal', assignee: 'Marco' },
    { id: 'SUP-108', title: 'Mobile app crashes on photo upload', customer: 'Tandem Cycles', priority: 'High' },
    { id: 'SUP-109', title: 'Change billing contact email', customer: 'Lumen Dental', priority: 'Low', assignee: 'Sam' },
  ] as Ticket[]).map((t) => [t.id, t]),
);

export const INITIAL_LAYOUT: Layout = {
  todo: ['SUP-104', 'SUP-108', 'SUP-106', 'SUP-107'],
  doing: ['SUP-101', 'SUP-105', 'SUP-103'],
  done: ['SUP-109', 'SUP-102'],
};

export class MoveRefused extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = 'MoveRefused';
  }
}

const copy = (l: Layout): Layout => ({ todo: [...l.todo], doing: [...l.doing], done: [...l.done] });

let record: Layout = copy(INITIAL_LAYOUT);
let flaky = false;

export function setFlakyNetwork(on: boolean) {
  flaky = on;
}

export const columnTitle = (c: ColumnId) => COLUMNS.find((x) => x.id === c)!.title;

function columnOf(l: Layout, cardId: string): ColumnId | undefined {
  return (Object.keys(l) as ColumnId[]).find((c) => l[c].includes(cardId));
}

/** Checks a move against the record. Returns the reason it is refused, or null. */
function refusal(cardId: string, to: ColumnId): string | null {
  const ticket = TICKETS[cardId];
  const from = columnOf(record, cardId);
  if (!ticket || !from) return 'This ticket no longer exists.';
  if (to === 'doing' && from !== 'doing' && record.doing.length >= IN_PROGRESS_LIMIT) {
    return `In progress is full (${IN_PROGRESS_LIMIT} of ${IN_PROGRESS_LIMIT}). Finish or move a ticket out first.`;
  }
  if (to === 'done' && from !== 'done' && !ticket.assignee) {
    return 'A ticket needs an assignee before it can be closed.';
  }
  if (flaky && Math.random() < 0.35) {
    return 'The server did not respond in time. Try the move again.';
  }
  return null;
}

/**
 * Asks the server to put a card at `index` in `to`. Resolves when the move is
 * recorded, rejects with MoveRefused when the server refuses it.
 */
export function requestMove(cardId: string, to: ColumnId, index: number): Promise<void> {
  const latency = 450 + Math.random() * 650;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Evaluated on arrival, against whatever the record holds by then.
      const reason = refusal(cardId, to);
      if (reason) {
        reject(new MoveRefused(reason));
        return;
      }
      const next = copy(record);
      const from = columnOf(next, cardId)!;
      next[from] = next[from].filter((id) => id !== cardId);
      next[to].splice(Math.max(0, Math.min(index, next[to].length)), 0, cardId);
      record = next;
      resolve();
    }, latency);
  });
}
