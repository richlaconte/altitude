// The expense reports example's simulated server (#407): one report, October's, moving between two people with
// different powers over it. Sam Okafor imports his card transactions, attaches receipts and submits; Dana Kim, his
// manager, approves or returns it with a reason. Built on the shared service (#400, #459).
import { createDemoService, reject } from '../shared/react';

export const EMPLOYEE = 'Sam Okafor';
export const MANAGER = 'Dana Kim';
export const PERIOD = 'October 2026';

export interface Transaction { id: string; date: string; merchant: string; category: string; project: string; amount: number; receipt: string | null }
export type ReportStatus = 'draft' | 'submitted' | 'approved' | 'returned';
export interface Decision { by: string; at: number; outcome: 'approved' | 'returned'; reason?: string; total: number }
export interface Report { status: ReportStatus; transactions: Transaction[]; imported: string | null; decision: Decision | null; submittedAt: number | null }

export const CATEGORIES = [
  { value: 'travel', label: 'Travel' }, { value: 'lodging', label: 'Lodging' }, { value: 'meals', label: 'Meals' },
  { value: 'software', label: 'Software' }, { value: 'office', label: 'Office supplies' }, { value: 'other', label: 'Other' },
];
export const PROJECTS = [
  { value: 'none', label: 'No project' }, { value: 'atlas', label: 'Atlas launch' }, { value: 'harbor', label: 'Harbor migration' }, { value: 'field', label: 'Field visits' },
];
export const categoryLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;
export const projectLabel = (v: string) => PROJECTS.find((p) => p.value === v)?.label ?? v;
export const totalOf = (ts: Transaction[]) => Math.round(ts.reduce((n, t) => n + t.amount, 0) * 100) / 100;
export const money = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n);

/** The sample card export: twelve rows, two with problems (a date that isn't a date, an amount that isn't a number). */
export const SAMPLE_CSV = {
  name: 'card-october-2026.csv',
  columns: ['Posted', 'Description', 'Amount (EUR)', 'Type'],
  rows: [
    ['2026-10-02', 'Aer Lingus DUB-LHR', '189.40', 'Travel'],
    ['2026-10-02', 'Premier Inn London City', '312.00', 'Lodging'],
    ['2026-10-03', 'Dishoom Shoreditch', '46.80', 'Meals'],
    ['2026-10-03', 'Heathrow Express', '25.00', 'Travel'],
    ['2026-10-07', 'Figma Professional', '45.00', 'Software'],
    ['2026-10-09', 'Easons Stationery', '18.65', 'Office'],
    ['2026-10-14', 'Irish Rail Dublin-Cork', '72.50', 'Travel'],
    ['2026-10-14', 'Clayton Hotel Cork', '149.00', 'Lodging'],
    ['2026-10-15', 'Market Lane Cork', 'thirty-eight', 'Meals'],
    ['2026-10-21', 'Bolt taxi', '22.15', 'Travel'],
    ['10/31', 'Notion Plus', '96.00', 'Software'],
    ['2026-10-28', 'Bewley’s Grafton St', '12.40', 'Meals'],
  ],
};

export const seed = (): Report => ({ status: 'draft', transactions: [], imported: null, decision: null, submittedAt: null });

const editable = (r: Report) => r.status === 'draft' || r.status === 'returned' || r.status === 'submitted';

export const service = createDemoService<Report>({
  name: 'expense-reports',
  seed,
  persist: true,
  latency: { base: 320, jitter: 140 },
  handlers: {
    'report.get': { read: (r) => r },
    // Idempotent by import id: importing the same file twice doesn't add its rows twice.
    'transactions.import': {
      write: (r, input: { importId: string; transactions: Transaction[] }) => {
        if (r.imported === input.importId) return { state: r, result: r };
        const next: Report = { ...r, transactions: [...r.transactions, ...input.transactions], imported: input.importId };
        return { state: next, result: next };
      },
    },
    // One cell. `knownStatus` is the report's status as the editor last saw it: if the manager has decided since, the
    // edit is refused as a conflict and the server hands back the report as it is now.
    'transaction.update': {
      write: (r, input: { id: string; key: keyof Transaction; value: unknown; knownStatus: ReportStatus }) => {
        if (r.status !== input.knownStatus) reject('conflict', `${MANAGER} ${r.status === 'returned' ? 'returned' : 'decided on'} this report while you were editing.`, { current: r });
        if (!editable(r)) reject('invalid', 'This report is approved. It can’t be changed.');
        const t = r.transactions.find((x) => x.id === input.id) ?? reject('not-found', 'That transaction is no longer on the report.');
        if (input.key === 'amount' && (typeof input.value !== 'number' || !(input.value >= 0))) reject('invalid', 'Use an amount of 0 or more.', { field: 'amount' });
        const next = { ...t, [input.key]: input.value };
        return { state: { ...r, transactions: r.transactions.map((x) => (x.id === t.id ? next : x)) }, result: next };
      },
      current: (r) => r,
    },
    // Submitting is idempotent: submitting a submitted report returns it, so a retry after a lost response can't
    // submit twice.
    'report.submit': {
      write: (r) => {
        if (r.status === 'submitted') return { state: r, result: r };
        if (r.status === 'approved') reject('invalid', 'This report is already approved.');
        const missing = r.transactions.filter((t) => !t.receipt).length;
        if (missing) reject('invalid', `${missing} ${missing === 1 ? 'transaction needs' : 'transactions need'} a receipt.`);
        const next: Report = { ...r, status: 'submitted', submittedAt: Date.now(), decision: null };
        return { state: next, result: next };
      },
    },
    'report.decide': {
      write: (r, input: { outcome: 'approved' | 'returned'; reason?: string }) => {
        if (r.decision && r.status !== 'submitted') return { state: r, result: r };
        if (r.status !== 'submitted') reject('conflict', `${EMPLOYEE} hasn’t submitted this report.`, { current: r });
        if (input.outcome === 'returned' && !input.reason?.trim()) reject('invalid', `Say why, so ${EMPLOYEE.split(' ')[0]} knows what to fix.`, { field: 'reason' });
        const decision: Decision = { by: MANAGER, at: Date.now(), outcome: input.outcome, reason: input.reason?.trim() || undefined, total: totalOf(r.transactions) };
        const next: Report = { ...r, status: input.outcome, decision };
        return { state: next, result: next };
      },
      current: (r) => r,
    },
  },
});

/** Who's looking: the drawer's "View as" switch. State, not an event, and outside the app's main. */
type View = 'employee' | 'manager';
let view: View = 'employee';
const listeners = new Set<() => void>();
export const viewAs = {
  get: () => view,
  set: (v: View) => { view = v; listeners.forEach((l) => l()); },
  subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
};

export const events = [
  {
    label: `${MANAGER} returns the report`,
    run: () => service.external(`${MANAGER} returns the report`, (r) => (r.status !== 'submitted' ? r : {
      ...r, status: 'returned' as const,
      decision: { by: MANAGER, at: Date.now(), outcome: 'returned' as const, reason: 'The Clayton Hotel needs an itemised receipt, not the card slip.', total: totalOf(r.transactions) },
    })),
  },
];
