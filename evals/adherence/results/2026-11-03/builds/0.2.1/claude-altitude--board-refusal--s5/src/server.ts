// A simulated ticket server. It keeps its own authoritative copy of the board, handles one request at a
// time (in the order they were sent), takes a little while to answer, and can refuse a move.
import { applyMove, cloneColumns, COLUMNS, INITIAL_COLUMNS, locate, TICKETS, WIP_LIMIT, type Columns, type Place } from './data';

export type MoveResult =
  | { ok: true; columns: Columns }
  | { ok: false; reason: string; columns: Columns };

let state: Columns = cloneColumns(INITIAL_COLUMNS);
let queue: Promise<unknown> = Promise.resolve();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const titleOf = (id: string) => COLUMNS.find((c) => c.id === id)?.title ?? id;

function validate(cardId: string, to: Place): string | null {
  const from = locate(state, cardId);
  if (!from) return 'This ticket no longer exists.';
  if (from.column === to.column) return null; // reordering within a column is always allowed
  if (to.column === 'doing') {
    if (state.doing.length >= WIP_LIMIT) {
      return `${titleOf('doing')} is full (${WIP_LIMIT} of ${WIP_LIMIT}). Finish or move a ticket out first.`;
    }
    if (!TICKETS[cardId]?.assignee) return 'Unassigned tickets can’t be started. Assign someone first.';
  }
  if (from.column === 'done' && to.column === 'todo') {
    return 'Closed tickets can’t go straight back to To do. Reopen it into In progress instead.';
  }
  return null;
}

export function moveCard(cardId: string, to: Place, opts: { flaky: boolean }): Promise<MoveResult> {
  const run = async (): Promise<MoveResult> => {
    await sleep(500 + Math.random() * 600);
    if (opts.flaky && Math.random() < 0.3) {
      return { ok: false, reason: 'The server didn’t respond in time. Try again.', columns: cloneColumns(state) };
    }
    const reason = validate(cardId, to);
    if (reason) return { ok: false, reason, columns: cloneColumns(state) };
    state = applyMove(state, cardId, to);
    return { ok: true, columns: cloneColumns(state) };
  };
  const result = queue.then(run);
  queue = result.catch(() => undefined);
  return result;
}
