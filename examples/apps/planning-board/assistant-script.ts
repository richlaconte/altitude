// The assistant's "model" (#408): a deterministic script, run on the simulated server so it meets the same modes as any
// request (slow, rate limited, offline, lost). It reads the board it's given and answers with events in the shape
// #286's harness plays (build/fixtures/patterns/agent-harness.jsx): each has `at`, the moment it belongs to, and a
// `type` named after the AI SDK's stream parts. Folding the events up to a moment gives everything on screen then, so
// the panel can play a turn as it streams or jump to its end.
import type { BoardData, ColumnId } from './data';

export const CAPACITY = 20;
const TITLE: Record<ColumnId, string> = { backlog: 'Backlog', sprint: 'Sprint 24', doing: 'In progress', done: 'Done' };

export type ProposalDraft =
  | { id: string; card: string; kind: 'move'; to: ColumnId; rev: number; why: string }
  | { id: string; card: string; kind: 'points'; value: number; rev: number; why: string }
  | { id: string; card: string; kind: 'assignee'; value: string; rev: number; why: string };

export type AgentEvent =
  | { at: number; type: 'reasoning-delta'; text: string }
  | { at: number; type: 'reasoning-end'; ms: number }
  | { at: number; type: 'tool-call'; id: string; name: string; input: unknown }
  | { at: number; type: 'tool-result'; id: string; output: unknown }
  | { at: number; type: 'text-delta'; text: string }
  | { at: number; type: 'proposal'; proposal: ProposalDraft }
  | { at: number; type: 'question'; id: string; title: string; options: { value: string; label: string; description: string }[] }
  | { at: number; type: 'refusal'; text: string }
  | { at: number; type: 'finish' };

export interface TurnInput { text: string; mentions?: string[]; answer?: string; turn: number }

const where = (b: BoardData, id: string) => (Object.keys(b.columns) as ColumnId[]).find((c) => b.columns[c].includes(id));
const points = (b: BoardData, cols: ColumnId[]) => cols.flatMap((c) => b.columns[c]).reduce((n, id) => n + (b.cards[id]?.points ?? 0), 0);

/** One turn: the plan for the first message, or what follows the answer to its question. */
export function script(b: BoardData, input: TurnInput): AgentEvent[] {
  const ev: AgentEvent[] = [];
  const keep = new Set(input.mentions ?? []);
  const card = (id: string) => b.cards[id];
  const n = input.turn;
  if (input.answer) {
    if (input.answer === 'move-c9' && where(b, 'c9') === 'sprint') {
      ev.push({ at: 1, type: 'text-delta', text: `Then I’ll also move **${card('c9').title}** back to the backlog. ` });
      ev.push({ at: 2, type: 'text-delta', text: 'That brings the sprint inside capacity.' });
      ev.push({ at: 2, type: 'proposal', proposal: { id: `p${n}-c9`, card: 'c9', kind: 'move', to: 'backlog', rev: card('c9').rev, why: 'Brings the sprint inside capacity.' } });
    } else {
      ev.push({ at: 1, type: 'text-delta', text: 'Understood: I’ll leave the rest of the sprint as it is. ' });
      ev.push({ at: 2, type: 'text-delta', text: `It stays over capacity, so watch **${card('c7')?.title ?? 'the biggest card'}**.` });
    }
    ev.push({ at: 3, type: 'finish' });
    return ev;
  }
  const planned = points(b, ['sprint', 'doing']);
  ev.push({ at: 1, type: 'reasoning-delta', text: `Sprint 24 and In progress hold ${planned} points; the team’s capacity is ${CAPACITY}. ` });
  ev.push({ at: 2, type: 'reasoning-delta', text: 'Cheap wins first: small cards that unblock others, and estimates on anything still unsized.' });
  ev.push({ at: 3, type: 'reasoning-end', ms: 2600 });
  ev.push({ at: 3, type: 'tool-call', id: 'read', name: 'read_board', input: { columns: ['backlog', 'sprint', 'doing'] } });
  ev.push({ at: 4, type: 'tool-result', id: 'read', output: { cards: b.columns.backlog.length + b.columns.sprint.length + b.columns.doing.length, plannedPoints: planned, capacity: CAPACITY } });

  const proposals: ProposalDraft[] = [];
  const skipped: string[] = [];
  const out = (id: string, why: string) => {
    if (where(b, id) !== 'sprint' || !card(id)) return;
    if (keep.has(id)) { skipped.push(card(id).title); return; }
    proposals.push({ id: `p${n}-${id}-out`, card: id, kind: 'move', to: 'backlog', rev: card(id).rev, why });
  };
  out('c10', 'Lowest priority in the sprint, and it frees 2 points.');
  if (where(b, 'c6') === 'backlog') proposals.push({ id: `p${n}-c6-in`, card: 'c6', kind: 'move', to: 'sprint', rev: card('c6').rev, why: 'Small, and it unblocks the onboarding work.' });
  if (card('c6') && !card('c6').assignee) proposals.push({ id: `p${n}-c6-who`, card: 'c6', kind: 'assignee', value: 'Mara Silva', rev: card('c6').rev, why: 'Mara has the most room this sprint.' });
  if (card('c8') && card('c8').points == null) proposals.push({ id: `p${n}-c8-pts`, card: 'c8', kind: 'points', value: 3, rev: card('c8').rev, why: 'Similar to “Cache plan lookups”, which was 3.' });

  ev.push({ at: 4, type: 'text-delta', text: `Sprint 24 is planned at **${planned} points** against a capacity of ${CAPACITY}. ` });
  if (!proposals.length) {
    ev.push({ at: 5, type: 'text-delta', text: 'I don’t have anything to change: the cards I’d move are already where I’d put them.' });
    ev.push({ at: 6, type: 'finish' });
    return ev;
  }
  ev.push({ at: 5, type: 'text-delta', text: `I’d make ${proposals.length} ${proposals.length === 1 ? 'change' : 'changes'}. They’re on the cards as proposals: nothing changes until you accept them.` });
  if (skipped.length) ev.push({ at: 5, type: 'text-delta', text: ` You mentioned ${skipped.map((t) => `“${t}”`).join(' and ')}, so I left ${skipped.length === 1 ? 'it' : 'them'} in the sprint.` });
  proposals.forEach((p, i) => ev.push({ at: 6 + Math.floor(i / 2), type: 'proposal', proposal: p }));
  const after = 6 + Math.ceil(proposals.length / 2);
  if (where(b, 'c9') === 'sprint' && !keep.has('c9')) {
    ev.push({ at: after, type: 'question', id: 'c9', title: `Even then, the sprint is over capacity. Move “${card('c9').title}” to the backlog too?`, options: [
      { value: 'move-c9', label: 'Move it to the backlog', description: `Frees ${card('c9').points ?? 0} points.` },
      { value: 'keep', label: 'Keep it in the sprint', description: 'The sprint stays over capacity.' },
    ] });
  }
  ev.push({ at: after, type: 'finish' });
  return ev;
}

export const describe = (p: ProposalDraft, title: string, from?: ColumnId) =>
  p.kind === 'move' ? `Move “${title}” ${from ? `from ${TITLE[from]} ` : ''}to ${TITLE[p.to]}`
    : p.kind === 'points' ? `Estimate “${title}” at ${p.value} points`
      : `Assign “${title}” to ${p.value}`;
export const short = (p: ProposalDraft) =>
  p.kind === 'move' ? `move to ${TITLE[p.to]}` : p.kind === 'points' ? `estimate ${p.value} points` : `assign to ${p.value}`;

/** Everything a turn shows at moment `k`, as the harness's stateAt does. */
export function fold(events: AgentEvent[], k: number) {
  const s = { reasoning: '', reasoningMs: undefined as number | undefined, reasoningDone: false, tool: null as null | { name: string; input: unknown; output?: unknown },
    text: '', proposals: [] as ProposalDraft[], question: null as null | Extract<AgentEvent, { type: 'question' }>, refusal: '', finished: false };
  for (const e of events) {
    if (e.at > k) break;
    switch (e.type) {
      case 'reasoning-delta': s.reasoning += e.text; break;
      case 'reasoning-end': s.reasoningDone = true; s.reasoningMs = e.ms; break;
      case 'tool-call': s.tool = { name: e.name, input: e.input }; break;
      case 'tool-result': s.tool = s.tool && { ...s.tool, output: e.output }; break;
      case 'text-delta': s.text += e.text; break;
      case 'proposal': s.proposals.push(e.proposal); break;
      case 'question': s.question = e; break;
      case 'refusal': s.refusal = e.text; break;
      case 'finish': s.finished = true; break;
    }
  }
  return s;
}
export const lastMoment = (events: AgentEvent[]) => events.reduce((m, e) => Math.max(m, e.at), 0);
