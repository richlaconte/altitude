// The planning board's simulated server (#402). Cards live in four columns; a move is a write the server can refuse
// (In progress holds three cards; a card someone else is holding can't be moved), and every card carries a version, so
// a move made against an old one is a conflict. Meetings live on a two-week schedule and can't overlap in the team room.
import { createDemoService, reject } from '../shared/service';
import { script } from './assistant-script';
import type { TurnInput } from './assistant-script';

export type ColumnId = 'backlog' | 'sprint' | 'doing' | 'done';
export const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: 'backlog', title: 'Backlog' }, { id: 'sprint', title: 'Sprint 24' }, { id: 'doing', title: 'In progress' }, { id: 'done', title: 'Done' },
];
export const COLUMN_TITLE = Object.fromEntries(COLUMNS.map((c) => [c.id, c.title])) as Record<ColumnId, string>;
export const WIP_LIMIT = 3;
export const POINTS = [1, 2, 3, 5, 8, 13];
export const PEOPLE = ['Ada Okoro', 'Lena Park', 'Theo Marsh', 'Mara Silva', 'Jon Reyes'];
export const EPICS = ['Billing', 'Onboarding', 'Performance'];
export const SPRINT_START = '2026-11-09';
export const SPRINT_END = '2026-11-20';

export interface Card { id: string; title: string; epic: string; assignee: string | null; points: number | null; tags: string[]; due: string | null; rev: number }
export interface Meeting { id: string; title: string; start: string; end: string; rev: number }
export interface BoardData { cards: Record<string, Card>; columns: Record<ColumnId, string[]>; held: Record<string, string>; started: boolean }
/** The assistant's model, as the fixtures can bend it: refuse the next request, or have the conversation fill its context. */
export interface Store extends BoardData { meetings: Meeting[]; seq: number; assistant: { refuse: boolean; full: boolean } }

const c = (id: string, title: string, epic: string, assignee: string | null, points: number | null, tags: string[] = [], due: string | null = null): Card => ({ id, title, epic, assignee, points, tags, due, rev: 1 });

export const seed = (): Store => ({
  cards: Object.fromEntries([
    c('c1', 'Annual billing toggle', 'Billing', 'Ada Okoro', 5, ['frontend']),
    c('c2', 'Prorate plan changes', 'Billing', 'Theo Marsh', 8, ['backend']),
    c('c3', 'Invoice PDF redesign', 'Billing', null, null, ['design']),
    c('c4', 'Welcome checklist', 'Onboarding', 'Mara Silva', 3, ['frontend'], '2026-11-13'),
    c('c5', 'Import from CSV', 'Onboarding', 'Lena Park', 8, ['backend']),
    c('c6', 'Empty states for projects', 'Onboarding', null, 2, ['design']),
    c('c7', 'Cold-start under 1 s', 'Performance', 'Jon Reyes', 13, ['backend']),
    c('c8', 'Lazy-load the sidebar', 'Performance', null, null, ['frontend']),
    c('c9', 'Cache plan lookups', 'Performance', 'Theo Marsh', 3, ['backend']),
    c('c10', 'Billing emails in Spanish', 'Billing', 'Ada Okoro', 2, ['content']),
    c('c11', 'Team invite link', 'Onboarding', 'Lena Park', 3, ['frontend']),
    ...Array.from({ length: 6 }, (_, i) => c(`d${i + 1}`, ['Dark mode for charts', 'Faster search', 'SSO for Pro', 'Usage meters', 'Audit log export', 'Keyboard shortcuts'][i], EPICS[i % 3], PEOPLE[i % 5], [2, 3, 5][i % 3])),
  ].map((x) => [x.id, x])),
  columns: { backlog: ['c3', 'c6', 'c8', 'c2', 'c5'], sprint: ['c1', 'c10', 'c9'], doing: ['c4', 'c7'], done: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'] },
  held: {},
  started: false,
  meetings: [
    { id: 'm1', title: 'Sprint planning', start: '2026-11-09T10:00', end: '2026-11-09T11:00', rev: 1 },
    { id: 'm2', title: 'Design review', start: '2026-11-11T14:00', end: '2026-11-11T15:00', rev: 1 },
    { id: 'm3', title: 'Sprint review', start: '2026-11-20T15:00', end: '2026-11-20T16:00', rev: 1 },
    { id: 'm4', title: 'Retro', start: '2026-11-20T16:00', end: '2026-11-20T16:45', rev: 1 },
  ],
  seq: 20,
  assistant: { refuse: false, full: false },
});

const board = (s: Store): BoardData => ({ cards: s.cards, columns: s.columns, held: s.held, started: s.started });
const where = (s: Store, id: string) => (Object.keys(s.columns) as ColumnId[]).find((k) => s.columns[k].includes(id));
const card = (s: Store, id: string) => s.cards[id] ?? reject('not-found', 'That card no longer exists.');
const overlap = (s: Store, start: string, end: string, except?: string) => s.meetings.find((m) => m.id !== except && m.start < end && start < m.end);

export const service = createDemoService<Store>({
  name: 'planning-board',
  seed,
  persist: true,
  handlers: {
    'board.get': { read: (s) => board(s) },
    'cards.move': {
      write: (s, d: { id: string; column: ColumnId; index: number; rev: number }) => {
        const k = card(s, d.id);
        const from = where(s, d.id)!;
        if (s.held[d.id]) reject('invalid', `${s.held[d.id]} is moving this card.`);
        if (k.rev !== d.rev) reject('conflict', 'Someone else moved or changed this card first.', { current: board(s) });
        if (d.column === 'doing' && from !== 'doing' && s.columns.doing.length >= WIP_LIMIT) {
          reject('invalid', `In progress is full: ${WIP_LIMIT} cards is the limit. Finish one or move one out first.`);
        }
        const columns = { ...s.columns, [from]: s.columns[from].filter((x) => x !== d.id) } as Record<ColumnId, string[]>;
        const list = [...columns[d.column]];
        list.splice(Math.max(0, Math.min(d.index, list.length)), 0, d.id);
        columns[d.column] = list;
        const next = { ...k, rev: k.rev + 1 };
        return { state: { ...s, columns, cards: { ...s.cards, [d.id]: next } }, result: board({ ...s, columns, cards: { ...s.cards, [d.id]: next } }) };
      },
      current: (s) => board(s),
    },
    'cards.update': {
      write: (s, d: { id: string; patch: Partial<Omit<Card, 'id' | 'rev'>>; rev: number }) => {
        const k = card(s, d.id);
        if (k.rev !== d.rev) reject('conflict', 'Someone else changed this card first.', { current: k });
        if (d.patch.title !== undefined && !d.patch.title.trim()) reject('invalid', 'Give the card a title.', { field: 'title' });
        if (d.patch.points != null && !POINTS.includes(d.patch.points)) reject('invalid', `Estimates are ${POINTS.join(', ')}.`, { field: 'points' });
        const next = { ...k, ...d.patch, rev: k.rev + 1 };
        return { state: { ...s, cards: { ...s.cards, [d.id]: next } }, result: next };
      },
      current: (s, d: { id: string }) => s.cards[d.id],
    },
    'cards.create': {
      write: (s, d: { column: ColumnId; title: string }) => {
        if (!d.title.trim()) reject('invalid', 'Give the card a title.');
        const id = `c${s.seq}`;
        const k = c(id, d.title.trim(), EPICS[s.seq % 3], null, null);
        return { state: { ...s, seq: s.seq + 1, cards: { ...s.cards, [id]: k }, columns: { ...s.columns, [d.column]: [...s.columns[d.column], id] } }, result: k };
      },
    },
    'sprint.start': {
      write: (s) => {
        if (s.started) return { state: s, result: board(s) };
        const planned = [...s.columns.sprint, ...s.columns.doing];
        if (!s.columns.sprint.length) reject('invalid', 'Sprint 24 has no cards. Move some from the backlog first.');
        const loose = planned.filter((id) => s.cards[id].points == null).map((id) => s.cards[id].title);
        if (loose.length) reject('invalid', `${loose.length === 1 ? `“${loose[0]}” has` : `${loose.length} cards have`} no estimate. Estimate ${loose.length === 1 ? 'it' : 'them'}, or move ${loose.length === 1 ? 'it' : 'them'} back to the backlog.`);
        return { state: { ...s, started: true }, result: board({ ...s, started: true }) };
      },
    },
    'meetings.list': { read: (s) => s.meetings },
    'meetings.create': {
      write: (s, d: { title: string; start: string; end: string }) => {
        if (!d.title.trim()) reject('invalid', 'Name the meeting.');
        const clash = overlap(s, d.start, d.end);
        if (clash) reject('invalid', `That overlaps ${clash.title} in the team room.`);
        const m: Meeting = { id: `m${s.seq}`, title: d.title.trim(), start: d.start, end: d.end, rev: 1 };
        return { state: { ...s, seq: s.seq + 1, meetings: [...s.meetings, m] }, result: m };
      },
    },
    'meetings.move': {
      write: (s, d: { id: string; start: string; end: string; rev: number }) => {
        const m = s.meetings.find((x) => x.id === d.id) ?? reject('not-found', 'That meeting was cancelled.');
        if (m.rev !== d.rev) reject('conflict', `Someone else moved ${m.title} first.`, { current: m });
        const clash = overlap(s, d.start, d.end, d.id);
        if (clash) reject('invalid', `That overlaps ${clash.title} in the team room.`);
        const next = { ...m, start: d.start, end: d.end, rev: m.rev + 1 };
        return { state: { ...s, meetings: s.meetings.map((x) => (x.id === d.id ? next : x)) }, result: next };
      },
      current: (s, d: { id: string }) => s.meetings.find((x) => x.id === d.id),
    },
    'meetings.rename': {
      write: (s, d: { id: string; title: string }) => {
        if (!d.title.trim()) reject('invalid', 'Name the meeting.');
        const meetings = s.meetings.map((x) => (x.id === d.id ? { ...x, title: d.title.trim(), rev: x.rev + 1 } : x));
        return { state: { ...s, meetings }, result: meetings.find((x) => x.id === d.id) };
      },
    },
    // A write, because it can use up a one-off refusal; its result is the turn's events.
    'assistant.turn': {
      write: (s, d: TurnInput & { fresh?: boolean }) => {
        const a = s.assistant ?? { refuse: false, full: false };
        if (a.full && !d.fresh) reject('invalid', 'This conversation is too long for the assistant’s context. Start a new conversation; the board isn’t affected.', { field: 'context' });
        if (a.refuse) return { state: { ...s, assistant: { ...a, refuse: false } }, result: [{ at: 1, type: 'refusal', text: 'I can’t help with that request.' }, { at: 1, type: 'finish' }] };
        return { state: d.fresh ? { ...s, assistant: { ...a, full: false } } : s, result: script(board(s), d) };
      },
    },
  },
});

/** What teammates do while you plan. */
export const events = [
  {
    label: 'Theo adds a card to the sprint',
    run: () => service.external('Theo Marsh adds a card to Sprint 24', (s) => {
      const id = `c${s.seq}`;
      return { ...s, seq: s.seq + 1, cards: { ...s.cards, [id]: c(id, 'Fix the plan picker on Safari', 'Billing', 'Theo Marsh', 2, ['frontend']) }, columns: { ...s.columns, sprint: [...s.columns.sprint, id] } };
    }),
  },
  {
    label: 'Mara picks up a card',
    run: () => service.external('Mara Silva picks up “Welcome checklist”', (s) => ({ ...s, held: { ...s.held, c4: 'Mara Silva' } })),
  },
  {
    label: 'Mara puts it down',
    run: () => service.external('Mara Silva puts down “Welcome checklist”', (s) => { const held = { ...s.held }; delete held.c4; return { ...s, held }; }),
  },
  {
    label: 'Lena moves a card the assistant proposed to move',
    run: () => service.external('Lena Park moves “Billing emails in Spanish” to In progress', (s) => {
      const from = where(s, 'c10');
      if (!from || from === 'doing') return s;
      const columns = { ...s.columns, [from]: s.columns[from].filter((x) => x !== 'c10'), doing: [...s.columns.doing, 'c10'] } as Record<ColumnId, string[]>;
      return { ...s, columns, cards: { ...s.cards, c10: { ...s.cards.c10, rev: s.cards.c10.rev + 1 } } };
    }),
  },
  { label: 'The assistant’s model refuses the next request', run: () => service.external('The model will refuse the next request', (s) => ({ ...s, assistant: { ...(s.assistant ?? { full: false }), refuse: true } })) },
  { label: 'The conversation fills the model’s context', run: () => service.external('The conversation filled the model’s context', (s) => ({ ...s, assistant: { ...(s.assistant ?? { refuse: false }), full: true } })) },
];
