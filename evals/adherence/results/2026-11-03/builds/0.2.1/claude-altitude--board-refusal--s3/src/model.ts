export type ColumnId = 'todo' | 'doing' | 'done';

export const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'In progress' },
  { id: 'done', title: 'Done' },
];

export const WIP_LIMIT = 3;

export const columnTitle = (id: string) => COLUMNS.find((c) => c.id === id)?.title ?? id;

export interface Ticket {
  id: string;
  title: string;
  customer: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  assignee?: string;
  /** Waiting on the customer: it can't be closed until they reply. */
  waiting?: boolean;
}

/** Which cards sit in which column, in order. */
export type Layout = Record<ColumnId, string[]>;

export interface Place {
  column: string;
  index: number;
}

export const TICKETS: Record<string, Ticket> = Object.fromEntries(
  (
    [
      { id: 'SUP-1042', title: 'Password reset email never arrives', customer: 'Northwind Studio', priority: 'urgent' },
      { id: 'SUP-1043', title: 'Invoice shows the wrong VAT rate', customer: 'Fabrikam', priority: 'high', assignee: 'Priya Natarajan' },
      { id: 'SUP-1045', title: 'CSV export cuts off at 10,000 rows', customer: 'Contoso', priority: 'normal' },
      { id: 'SUP-1047', title: 'Request to add a second admin', customer: 'Tailspin Toys', priority: 'low' },
      { id: 'SUP-1048', title: 'SSO login loops back to the sign-in page', customer: 'Adatum', priority: 'urgent', assignee: 'Marcus Webb' },
      { id: 'SUP-1038', title: 'Webhook retries flood the endpoint', customer: 'Litware', priority: 'high', assignee: 'Priya Natarajan' },
      { id: 'SUP-1039', title: 'Refund for a duplicate charge', customer: 'Woodgrove Bank', priority: 'normal', assignee: 'Sam Okafor', waiting: true },
      { id: 'SUP-1031', title: 'Dark mode toggle missing on mobile', customer: 'Proseware', priority: 'low', assignee: 'Marcus Webb' },
      { id: 'SUP-1029', title: 'Change the billing contact', customer: 'Fabrikam', priority: 'normal', assignee: 'Sam Okafor' },
    ] satisfies Ticket[]
  ).map((t) => [t.id, t]),
);

export const INITIAL_LAYOUT: Layout = {
  todo: ['SUP-1042', 'SUP-1043', 'SUP-1045', 'SUP-1047', 'SUP-1048'],
  doing: ['SUP-1038', 'SUP-1039'],
  done: ['SUP-1031', 'SUP-1029'],
};

export const columnOf = (layout: Layout, cardId: string): ColumnId | undefined =>
  (Object.keys(layout) as ColumnId[]).find((c) => layout[c].includes(cardId));

/** Take the card out of wherever it is and insert it at `to` (the index counts the other cards). */
export function applyMove(layout: Layout, cardId: string, to: Place): Layout {
  if (!(to.column in layout)) return layout;
  const next = { todo: [...layout.todo], doing: [...layout.doing], done: [...layout.done] };
  const from = columnOf(next, cardId);
  if (from) next[from] = next[from].filter((id) => id !== cardId);
  const list = next[to.column as ColumnId];
  list.splice(Math.max(0, Math.min(to.index, list.length)), 0, cardId);
  return next;
}

export const placeOf = (layout: Layout, cardId: string): Place | null => {
  const column = columnOf(layout, cardId);
  return column ? { column, index: layout[column].indexOf(cardId) } : null;
};
