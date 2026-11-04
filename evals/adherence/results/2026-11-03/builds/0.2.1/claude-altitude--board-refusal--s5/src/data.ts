export type ColumnId = 'todo' | 'doing' | 'done';
export type Columns = Record<ColumnId, string[]>;
export interface Place { column: ColumnId; index: number }

export interface Ticket {
  id: string;
  title: string;
  customer: string;
  priority: 'Urgent' | 'High' | 'Normal';
  assignee: string | null;
}

export const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'In progress' },
  { id: 'done', title: 'Done' },
];

export const WIP_LIMIT = 3;

export const TICKETS: Record<string, Ticket> = Object.fromEntries(
  ([
    { id: 'T-1042', title: 'Refund not received after cancellation', customer: 'Harbor Goods', priority: 'Urgent', assignee: 'Priya' },
    { id: 'T-1043', title: 'Cannot reset password from mobile app', customer: 'Lumen Health', priority: 'High', assignee: null },
    { id: 'T-1044', title: 'Invoice shows wrong VAT number', customer: 'Oakline Studio', priority: 'Normal', assignee: 'Marco' },
    { id: 'T-1045', title: 'CSV export times out on large accounts', customer: 'Northwind', priority: 'High', assignee: 'Sam' },
    { id: 'T-1046', title: 'Request to add a second admin', customer: 'Pebble & Co', priority: 'Normal', assignee: null },
    { id: 'T-1037', title: 'SSO login loops back to sign-in page', customer: 'Brightwave', priority: 'Urgent', assignee: 'Priya' },
    { id: 'T-1038', title: 'Webhook deliveries delayed by an hour', customer: 'Tandem Labs', priority: 'High', assignee: 'Marco' },
    { id: 'T-1039', title: 'Update billing contact email', customer: 'Fieldstone', priority: 'Normal', assignee: 'Sam' },
    { id: 'T-1031', title: 'Two-factor codes not arriving by SMS', customer: 'Cobalt Freight', priority: 'High', assignee: 'Priya' },
    { id: 'T-1033', title: 'Typo in welcome email template', customer: 'Juniper', priority: 'Normal', assignee: 'Sam' },
  ] as Ticket[]).map((t) => [t.id, t]),
);

export const INITIAL_COLUMNS: Columns = {
  todo: ['T-1042', 'T-1043', 'T-1044', 'T-1045', 'T-1046'],
  doing: ['T-1037', 'T-1038', 'T-1039'],
  done: ['T-1031', 'T-1033'],
};

export const cloneColumns = (c: Columns): Columns => ({ todo: [...c.todo], doing: [...c.doing], done: [...c.done] });

export function locate(cols: Columns, cardId: string): Place | null {
  for (const column of Object.keys(cols) as ColumnId[]) {
    const index = cols[column].indexOf(cardId);
    if (index >= 0) return { column, index };
  }
  return null;
}

/** Remove the card from wherever it is, then insert it at `to` (index clamped). */
export function applyMove(cols: Columns, cardId: string, to: Place): Columns {
  const next = cloneColumns(cols);
  const from = locate(next, cardId);
  if (from) next[from.column].splice(from.index, 1);
  const list = next[to.column];
  list.splice(Math.max(0, Math.min(to.index, list.length)), 0, cardId);
  return next;
}
