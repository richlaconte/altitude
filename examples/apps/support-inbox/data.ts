// The support inbox's simulated server (#404): a team's tickets, each a conversation with a customer, internal notes,
// and properties (assignee, priority, status). Built on the shared service (#400, #459): replies can be slow, fail, be
// lost, wait offline, or meet a teammate who changed the ticket first.
import { createDemoService, reject } from '../shared/react';

export const ME = 'Sam Rivera';
export const TEAMMATE = 'Maya Chen';
export type Status = 'Open' | 'Pending' | 'On hold' | 'Solved';
export type Priority = 'Low' | 'Normal' | 'High' | 'Urgent';
export interface Message { id: string; author: string; fromCustomer: boolean; body: string; at: number }
export interface Ticket {
  id: string; subject: string; requester: string; status: Status; priority: Priority; assignee: string | null;
  updatedAt: number; unread: boolean; messages: Message[]; notes: Message[]; rev: number;
  /** Teammates on it now, as the server reports presence. */
  viewers: { name: string; replying: boolean }[];
}
export interface Store { tickets: Ticket[]; mentions: { id: string; ticket: string; by: string; at: number; read: boolean }[]; seq: number }

export const STATUSES: Status[] = ['Open', 'Pending', 'On hold', 'Solved'];
export const PRIORITIES: Priority[] = ['Low', 'Normal', 'High', 'Urgent'];
export const AGENTS = [ME, TEAMMATE, 'Jon Park'];

const T0 = Date.UTC(2026, 10, 3, 9, 30);
const min = (m: number) => T0 - m * 60_000;
const msg = (id: string, author: string, body: string, at: number, fromCustomer = true): Message => ({ id, author, fromCustomer, body, at });

export const seed = (): Store => ({
  seq: 0,
  mentions: [],
  tickets: [
    { id: 'T-4471', subject: 'Refund for order 4471', requester: 'Priya Natarajan', status: 'Open', priority: 'High', assignee: ME, updatedAt: min(4), unread: true, rev: 1, viewers: [],
      messages: [msg('m1', 'Priya Natarajan', 'The blender arrived with a cracked jug, so I’d like a refund rather than a replacement. Photos attached.', min(4))], notes: [] },
    { id: 'T-4468', subject: 'Can’t sign in after the update', requester: 'Tomás Ruiz', status: 'Open', priority: 'Normal', assignee: ME, updatedAt: min(18), unread: true, rev: 1, viewers: [],
      messages: [msg('m2', 'Tomás Ruiz', 'Since this morning the app says my password is wrong, but it works on the website.', min(18))], notes: [] },
    { id: 'T-4460', subject: 'Change the delivery address', requester: 'Hana Kobayashi', status: 'Pending', priority: 'Normal', assignee: ME, updatedAt: min(52), unread: false, rev: 1, viewers: [],
      messages: [msg('m3', 'Hana Kobayashi', 'Can I still change the address for order 4402?', min(90)), msg('m4', ME, 'Yes, if it hasn’t shipped. What’s the new address?', min(70), false), msg('m5', 'Hana Kobayashi', 'It’s the flat above the bakery, 14B Mill Lane.', min(52))], notes: [] },
    { id: 'T-4455', subject: 'Invoice for March', requester: 'Oluwaseun Bello', status: 'On hold', priority: 'Low', assignee: null, updatedAt: min(130), unread: false, rev: 1, viewers: [],
      messages: [msg('m6', 'Oluwaseun Bello', 'Our finance team needs the VAT number on the invoice before they can pay it.', min(130))], notes: [msg('n1', 'Jon Park', 'Waiting on finance to reissue with the VAT number.', min(120), false)] },
    { id: 'T-4450', subject: 'Wrong size sent', requester: 'Lea Hoffmann', status: 'Solved', priority: 'Normal', assignee: TEAMMATE, updatedAt: min(300), unread: false, rev: 1, viewers: [],
      messages: [msg('m7', 'Lea Hoffmann', 'Got the right ones today, thank you for sorting it out so quickly.', min(300))], notes: [] },
  ],
});

const find = (s: Store, id: string) => s.tickets.find((t) => t.id === id) ?? reject('not-found', 'That ticket no longer exists.');
const put = (s: Store, t: Ticket): Store => ({ ...s, tickets: s.tickets.map((x) => (x.id === t.id ? t : x)) });

export const service = createDemoService<Store>({
  name: 'support-inbox',
  seed,
  persist: true,
  latency: { base: 320, jitter: 140 },
  handlers: {
    'tickets.list': { read: (s) => s.tickets },
    'mentions.list': { read: (s) => s.mentions },
    // Idempotent by the reply's id: a retry after a lost response returns the reply that was saved, never a second one.
    'tickets.reply': {
      write: (s, input: { ticket: string; id: string; body: string }) => {
        const t = find(s, input.ticket);
        if (!input.body.trim()) reject('invalid', 'Write a reply first.', { field: 'body' });
        const saved = t.messages.find((m) => m.id === input.id);
        if (saved) return { state: s, result: saved };
        const m = msg(input.id, ME, input.body.trim(), Date.now(), false);
        return { state: put(s, { ...t, messages: [...t.messages, m], status: 'Pending', updatedAt: m.at, rev: t.rev + 1 }), result: m };
      },
    },
    'tickets.note': {
      write: (s, input: { ticket: string; id: string; body: string }) => {
        const t = find(s, input.ticket);
        const saved = t.notes.find((m) => m.id === input.id);
        if (saved) return { state: s, result: saved };
        const m = msg(input.id, ME, input.body.trim(), Date.now(), false);
        return { state: put(s, { ...t, notes: [...t.notes, m] }), result: m };
      },
    },
    // A property. If it isn't what you last saw (`expected`), a teammate changed that property first: a conflict.
    'tickets.update': {
      write: (s, input: { ticket: string; field: 'assignee' | 'priority' | 'status'; value: string | null; expected: string | null }) => {
        const t = find(s, input.ticket);
        if (t[input.field] !== input.expected) reject('conflict', `${TEAMMATE} changed this ticket while you were working on it.`, { current: t });
        const next = { ...t, [input.field]: input.value, rev: t.rev + 1 };
        return { state: put(s, next), result: next };
      },
      current: (s, input: { ticket: string }) => s.tickets.find((t) => t.id === input.ticket),
    },
    'tickets.read': { write: (s, input: { ticket: string }) => { const t = find(s, input.ticket); return { state: t.unread ? put(s, { ...t, unread: false }) : s, result: null }; } },
    'mentions.read': { write: (s, input: { ids: string[] }) => ({ state: { ...s, mentions: s.mentions.map((m) => (input.ids.includes(m.id) ? { ...m, read: true } : m)) }, result: null }) },
  },
});

const NEW = [
  { subject: 'Discount code not working', requester: 'Aiyana Redcloud', body: 'SPRING20 says it has expired, but the email says it runs until Sunday.' },
  { subject: 'Order arrived damaged', requester: 'Kofi Mensah', body: 'The box was crushed and two of the glasses are broken.' },
  { subject: 'Where is my parcel?', requester: 'Ines Duarte', body: 'Tracking hasn’t moved since Tuesday.' },
];
const onFirst = (s: Store, change: (t: Ticket) => Ticket): Store => put(s, change(s.tickets.find((t) => t.id === 'T-4471')!));

export const events = [
  {
    label: 'A new ticket arrives',
    run: () => service.external('A new ticket arrives', (s) => {
      const n = NEW[s.seq % NEW.length], id = `T-${4480 + s.seq}`, at = Date.now();
      const t: Ticket = { id, subject: n.subject, requester: n.requester, status: 'Open', priority: 'Normal', assignee: ME, updatedAt: at, unread: true, rev: 1, viewers: [], messages: [msg(`${id}-m`, n.requester, n.body, at)], notes: [] };
      return { ...s, seq: s.seq + 1, tickets: [t, ...s.tickets] };
    }),
  },
  { label: `${TEAMMATE} opens “Refund for order 4471”`, run: () => service.external(`${TEAMMATE} opens “Refund for order 4471”`, (s) => onFirst(s, (t) => ({ ...t, viewers: [{ name: TEAMMATE, replying: false }] }))) },
  { label: `${TEAMMATE} starts replying to it`, run: () => service.external(`${TEAMMATE} starts replying to “Refund for order 4471”`, (s) => onFirst(s, (t) => ({ ...t, viewers: [{ name: TEAMMATE, replying: true }] }))) },
  {
    label: `${TEAMMATE} replies first`,
    run: () => service.external(`${TEAMMATE} replies to Priya`, (s) => onFirst(s, (t) => ({
      ...t, viewers: [{ name: TEAMMATE, replying: false }], status: 'Pending', updatedAt: Date.now(), rev: t.rev + 1,
      messages: [...t.messages, msg(`mc-${t.messages.length}`, TEAMMATE, 'Sorry about the jug, Priya. I’ve started the refund; you’ll see it in 3–5 days.', Date.now(), false)],
    }))),
  },
  { label: `${TEAMMATE} reassigns it to herself`, run: () => service.external(`${TEAMMATE} reassigns “Refund for order 4471” to herself`, (s) => onFirst(s, (t) => ({ ...t, assignee: TEAMMATE, rev: t.rev + 1 }))) },
  {
    label: `${TEAMMATE} mentions you in a note`,
    run: () => service.external(`${TEAMMATE} mentions you in a note`, (s) => {
      const t = s.tickets.find((x) => x.id === 'T-4468')!;
      const note = msg(`nm-${t.notes.length}`, TEAMMATE, `@${ME} this looks like the SSO bug from Monday. Can you check their account?`, Date.now(), false);
      return { ...put(s, { ...t, notes: [...t.notes, note] }), mentions: [...s.mentions, { id: note.id, ticket: t.id, by: TEAMMATE, at: note.at, read: false }] };
    }),
  },
];
