import { applyMove, columnOf, IN_PROGRESS_LIMIT, Layout, Move, Ticket } from './model';

/** The server said no. `message` is written for the person who made the move. */
export class Refused extends Error {}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const latency = () => 500 + Math.random() * 600;

/**
 * A pretend backend. It keeps its own copy of the board (the source of truth), handles one request
 * at a time in the order they arrive, and checks every move against its own state, not the client's.
 */
export function createServer(initialLayout: Layout, tickets: Ticket[]) {
  let layout: Layout = structuredClone(initialLayout);
  const assignees = new Map(tickets.map((t) => [t.id, t.assignee]));
  let flaky = false;
  let queue: Promise<unknown> = Promise.resolve();

  function serial<T>(handler: () => T): Promise<T> {
    const result = queue.then(() => wait(latency())).then(handler);
    queue = result.catch(() => undefined);
    return result;
  }

  function checkNetwork() {
    if (flaky && Math.random() < 0.35) throw new Refused('The server didn’t respond in time. Try the move again.');
  }

  return {
    setFlaky(on: boolean) {
      flaky = on;
    },

    move(move: Move): Promise<Layout> {
      return serial(() => {
        checkNetwork();
        const from = columnOf(layout, move.cardId);
        if (!from) throw new Refused('This ticket no longer exists.');
        const to = move.to.column;
        if (to !== 'todo' && !assignees.get(move.cardId)) {
          throw new Refused('Unassigned tickets can’t leave To do. Assign someone first.');
        }
        if (to === 'doing' && from !== 'doing' && layout.doing.length >= IN_PROGRESS_LIMIT) {
          throw new Refused(`In progress is full (${IN_PROGRESS_LIMIT} of ${IN_PROGRESS_LIMIT}). Finish or move a ticket out of it first.`);
        }
        layout = applyMove(layout, move);
        return structuredClone(layout);
      });
    },

    assign(cardId: string, name: string): Promise<void> {
      return serial(() => {
        checkNetwork();
        assignees.set(cardId, name);
      });
    },
  };
}
