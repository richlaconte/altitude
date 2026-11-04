export type ColumnId = 'todo' | 'doing' | 'done';

export const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'In progress' },
  { id: 'done', title: 'Done' },
];

export const IN_PROGRESS_LIMIT = 3;

export const columnTitle = (id: ColumnId) => COLUMNS.find((c) => c.id === id)!.title;

export interface Ticket {
  id: string;
  title: string;
  customer: string;
  priority: 'Urgent' | 'High' | 'Normal';
  assignee: string | null;
}

/** Card ids per column, in order. */
export type Layout = Record<ColumnId, string[]>;

export interface Move {
  cardId: string;
  to: { column: ColumnId; index: number };
}

export function columnOf(layout: Layout, cardId: string): ColumnId | undefined {
  return COLUMNS.find((c) => layout[c.id].includes(cardId))?.id;
}

/** Take the card out of wherever it is, then insert it at `to.index` (clamped) in `to.column`. */
export function applyMove(layout: Layout, { cardId, to }: Move): Layout {
  if (!columnOf(layout, cardId)) return layout;
  const next = {} as Layout;
  for (const c of COLUMNS) next[c.id] = layout[c.id].filter((id) => id !== cardId);
  const list = next[to.column];
  list.splice(Math.max(0, Math.min(to.index, list.length)), 0, cardId);
  return next;
}

export const sameLayout = (a: Layout, b: Layout) =>
  COLUMNS.every((c) => a[c.id].length === b[c.id].length && a[c.id].every((id, i) => b[c.id][i] === id));

export const ME = 'Alex Kim';

export const INITIAL_TICKETS: Ticket[] = [
  { id: 'T-1042', title: 'Refund not received after cancellation', customer: 'Northwind Traders', priority: 'Urgent', assignee: 'Priya Shah' },
  { id: 'T-1043', title: 'SSO login loops back to sign-in page', customer: 'Contoso', priority: 'High', assignee: 'Marcus Lee' },
  { id: 'T-1044', title: 'Invoice PDF shows the wrong VAT number', customer: 'Fabrikam', priority: 'Normal', assignee: null },
  { id: 'T-1045', title: 'Export to CSV times out for large reports', customer: 'Tailspin Toys', priority: 'High', assignee: 'Jo Okafor' },
  { id: 'T-1046', title: 'Add a second admin to the workspace', customer: 'Adventure Works', priority: 'Normal', assignee: ME },
  { id: 'T-1039', title: 'Webhook retries are firing twice', customer: 'Litware', priority: 'High', assignee: 'Priya Shah' },
  { id: 'T-1040', title: 'Password reset email lands in spam', customer: 'Wingtip', priority: 'Normal', assignee: 'Jo Okafor' },
  { id: 'T-1031', title: 'Change billing contact email', customer: 'Proseware', priority: 'Normal', assignee: 'Marcus Lee' },
];

export const INITIAL_LAYOUT: Layout = {
  todo: ['T-1042', 'T-1043', 'T-1044', 'T-1045', 'T-1046'],
  doing: ['T-1039', 'T-1040'],
  done: ['T-1031'],
};
