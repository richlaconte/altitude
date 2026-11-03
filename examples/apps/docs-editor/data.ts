// The docs editor's simulated server (#405): one policy document in sections, its details, a review round with a
// reviewer, versions, and comments. Built on the shared service (#400, #459), so every write can be slow, fail, lose its
// response, conflict, go offline or meet an ended session.
import { createDemoService, reject } from '../shared/react';
import type { ThreadComment } from 'altitude-design';

export interface Section { id: string; heading: string; body: string; rev: number; editedBy?: string }
export type Details = { owner: string; reviewDate: string; audience: string };
export interface Version { n: number; label: string; at: number; by: string; text: string }
export interface Suggestion { section: string; by: string; before: string; after: string }
export type DocStatus = 'draft' | 'in-review' | 'approved' | 'published';
export interface Doc {
  title: string;
  sections: Section[];
  details: Details;
  detailsRev: number;
  status: DocStatus;
  reviewer: string;
  versions: Version[];
  suggestion: Suggestion | null;
  comments: Record<string, ThreadComment[]>;
  /** The version number that was published, once it is. */
  published: number | null;
}

export const REVIEWER = 'Maya Chen';
export const OTHER = 'Jane Park';
const T0 = Date.UTC(2026, 10, 2, 9, 0);

const SECTIONS: Omit<Section, 'rev'>[] = [
  { id: 'scope', heading: 'Who this covers', body: 'Everyone employed by Fenwick Tools who travels for work, including contractors on assignments longer than three months.' },
  { id: 'booking', heading: 'Booking travel', body: 'Book flights and hotels through the travel desk at least 14 days ahead.\nTrain is preferred over flying for any trip under four hours door to door.' },
  { id: 'expenses', heading: 'Expenses', body: 'Meals are covered up to €45 a day.\nKeep every receipt and submit them within 30 days of returning.\nAlcohol is not covered.' },
  { id: 'safety', heading: 'Safety', body: 'Share your itinerary with your manager before you leave.\nIf something goes wrong, call the 24-hour travel line first.' },
];

export const docText = (sections: { heading: string; body: string }[]) => sections.map((s) => `## ${s.heading}\n${s.body}`).join('\n\n');

export const seed = (): Doc => {
  const sections = SECTIONS.map((s) => ({ ...s, rev: 1 }));
  const v1 = sections.map((s) => s.id === 'booking' ? { ...s, body: 'Book flights and hotels through the travel desk at least 7 days ahead.' } : s);
  return {
    title: 'Travel policy',
    sections,
    details: { owner: 'Sam Rivera', reviewDate: '2027-05-01', audience: 'All staff' },
    detailsRev: 1,
    status: 'draft',
    reviewer: REVIEWER,
    versions: [
      { n: 1, label: 'First draft', at: T0 - 6 * 86_400_000, by: 'Sam Rivera', text: docText(v1) },
      { n: 2, label: 'Booking rules updated', at: T0 - 86_400_000, by: 'Sam Rivera', text: docText(sections) },
    ],
    suggestion: null,
    comments: {},
    published: null,
  };
};

const section = (d: Doc, id: string) => d.sections.find((s) => s.id === id) ?? reject('not-found', 'That section no longer exists.');
const snapshot = (d: Doc, label: string, by: string): Version[] => [...d.versions, { n: d.versions.length + 1, label, at: Date.now(), by, text: docText(d.sections) }];

export const service = createDemoService<Doc>({
  name: 'docs-editor',
  seed,
  persist: true,
  latency: { base: 350, jitter: 150 },
  handlers: {
    'doc.get': { read: (d) => d },
    // One section's text. A save made against an older revision than the server's is a conflict: someone else saved
    // in between, and the server hands back its version.
    'section.save': {
      write: (d, input: { id: string; body: string; baseRev: number }) => {
        const s = section(d, input.id);
        if (s.rev !== input.baseRev) reject('conflict', `${s.editedBy ?? 'Someone'} changed “${s.heading}” while you were editing.`, { current: s });
        const next = { ...s, body: input.body, rev: s.rev + 1, editedBy: 'You' };
        return { state: { ...d, sections: d.sections.map((x) => (x.id === s.id ? next : x)) }, result: next };
      },
      current: (d, input: { id: string }) => d.sections.find((s) => s.id === input.id),
    },
    'details.save': {
      write: (d, input: { details: Details; baseRev: number }) => {
        if (d.detailsRev !== input.baseRev) reject('conflict', 'Someone changed the details while you were editing.', { current: { details: d.details, rev: d.detailsRev } });
        if (!input.details.owner.trim()) reject('invalid', 'Name an owner.', { field: 'owner' });
        return { state: { ...d, details: input.details, detailsRev: d.detailsRev + 1 }, result: { details: input.details, rev: d.detailsRev + 1 } };
      },
      current: (d) => ({ details: d.details, rev: d.detailsRev }),
    },
    'review.request': {
      write: (d) => {
        if (d.status !== 'draft') return { state: d, result: d };
        const next: Doc = { ...d, status: 'in-review', versions: snapshot(d, `Sent to ${d.reviewer} for review`, 'You') };
        return { state: next, result: next };
      },
    },
    'comment.add': {
      write: (d, input: { section: string; comment: ThreadComment }) => {
        const list = d.comments[input.section] ?? [];
        if (list.some((c) => c.id === input.comment.id)) return { state: d, result: input.comment };
        return { state: { ...d, comments: { ...d.comments, [input.section]: [...list, input.comment] } }, result: input.comment };
      },
    },
    'suggestion.resolve': { write: (d) => ({ state: { ...d, suggestion: null }, result: null }) },
    // Publishing is idempotent: a second Publish of a published document returns it, so a retry can't publish twice.
    'doc.publish': {
      write: (d) => {
        if (d.status === 'published') return { state: d, result: d };
        if (d.status !== 'approved') reject('invalid', `${d.reviewer} hasn’t approved this version yet.`);
        const versions = snapshot(d, 'Published', 'You');
        const next: Doc = { ...d, status: 'published', versions, published: versions.length };
        return { state: next, result: next };
      },
    },
  },
});

/** Things that happen elsewhere, from the fixtures drawer. */
export const events = [
  {
    label: `${OTHER} edits “Expenses”`,
    run: () => service.external(`${OTHER} edits “Expenses”`, (d) => ({
      ...d,
      sections: d.sections.map((s) => s.id === 'expenses' ? { ...s, body: s.body.replace(/€\d+/, '€50'), rev: s.rev + 1, editedBy: OTHER } : s),
    })),
  },
  {
    label: `${REVIEWER} comments on “Booking travel”`,
    run: () => service.external(`${REVIEWER} comments on “Booking travel”`, (d) => {
      const list = d.comments.booking ?? [];
      const c: ThreadComment = { id: `c-${list.length + 1}-${Date.now().toString(36)}`, author: { name: REVIEWER }, body: 'Can we say what counts as door to door? People will read it differently.', createdAt: Date.now() };
      return { ...d, comments: { ...d.comments, booking: [...list, c] } };
    }),
  },
  {
    label: `${REVIEWER} suggests changes to “Expenses”`,
    run: () => service.external(`${REVIEWER} suggests changes to “Expenses”`, (d) => {
      const s = d.sections.find((x) => x.id === 'expenses')!;
      // Two separate changes, an unchanged line between them, so each is decided on its own.
      const after = s.body.replace(/(Meals are covered up to €\d+ a day)\./, '$1, or €60 in London.').replace('Alcohol is not covered.', 'Alcohol is not covered, including at client dinners.');
      return { ...d, suggestion: { section: 'expenses', by: REVIEWER, before: s.body, after } };
    }),
  },
  {
    label: `${REVIEWER} approves`,
    run: () => service.external(`${REVIEWER} approves the policy`, (d) => (d.status === 'in-review' ? { ...d, status: 'approved' as const } : d)),
  },
];
