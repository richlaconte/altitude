import { applyMove, columnOf, columnTitle, INITIAL_LAYOUT, Layout, Place, TICKETS, WIP_LIMIT } from './model';

export type MoveResult =
  | { ok: true; layout: Layout }
  | { ok: false; reason: string; layout: Layout };

export interface ServerOptions {
  /** Share of moves that fail as if the network dropped them, 0 to 1. */
  failureRate: number;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Stands in for the backend. It owns the real layout, takes one request at a time after some latency,
 * and enforces the team's rules. Every answer carries its layout so the client can resync.
 */
export class SimulatedServer {
  private layout: Layout = INITIAL_LAYOUT;
  private queue: Promise<unknown> = Promise.resolve();
  options: ServerOptions = { failureRate: 0 };

  move(cardId: string, to: Place): Promise<MoveResult> {
    const run = async (): Promise<MoveResult> => {
      await wait(450 + Math.random() * 500);
      const reason = this.check(cardId, to);
      if (reason) return { ok: false, reason, layout: this.layout };
      this.layout = applyMove(this.layout, cardId, to);
      return { ok: true, layout: this.layout };
    };
    const result = this.queue.then(run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private check(cardId: string, to: Place): string | null {
    const ticket = TICKETS[cardId];
    const from = columnOf(this.layout, cardId);
    if (!ticket || !from) return 'This ticket no longer exists.';
    if (Math.random() < this.options.failureRate) return 'The server didn’t respond in time. Try again.';
    if (from === to.column) return null; // reordering within a column is always fine
    if (to.column === 'doing' && this.layout.doing.length >= WIP_LIMIT)
      return `${columnTitle('doing')} is full: it holds at most ${WIP_LIMIT} tickets. Finish or move one out first.`;
    if (to.column === 'done' && from === 'todo')
      return `A ticket has to be worked in ${columnTitle('doing')} before it can be closed.`;
    if (to.column === 'done' && ticket.waiting)
      return 'It’s waiting on a reply from the customer, so it can’t be closed yet.';
    return null;
  }
}
