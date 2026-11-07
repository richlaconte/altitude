export const COLUMN_TITLES = { next: 'Next', doing: 'In progress', done: 'Done' } as const;
export type ColumnId = keyof typeof COLUMN_TITLES;
export type Task = { id: string; title: string; code: string; owner: string };
export type Columns = Record<ColumnId, Task[]>;

export function placeTask(columns: Columns, cardId: string, to: { column: string; index: number }): Columns {
  if (!Object.prototype.hasOwnProperty.call(COLUMN_TITLES, to.column)) return columns;
  const source = (Object.keys(COLUMN_TITLES) as ColumnId[]).find(column => columns[column].some(card => card.id === cardId));
  if (!source) return columns;
  const destination = to.column as ColumnId;
  const sourceIndex = columns[source].findIndex(card => card.id === cardId);
  const next = { next: [...columns.next], doing: [...columns.doing], done: [...columns.done] };
  const [card] = next[source].splice(sourceIndex, 1);
  const index = Number.isFinite(to.index) ? Math.max(0, Math.min(Math.trunc(to.index), next[destination].length)) : next[destination].length;
  if (source === destination && sourceIndex === index) return columns;
  next[destination].splice(index, 0, card);
  return next;
}
