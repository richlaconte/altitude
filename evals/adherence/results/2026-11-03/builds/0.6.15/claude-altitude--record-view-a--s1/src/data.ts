// Sample data for one account. There is no backend: `accountService` below stands in for one, in memory.

export type Stage = 'prospect' | 'evaluation' | 'proposal' | 'negotiation' | 'customer' | 'churned';

export type Account = {
  name: string;
  stage: Stage;
  owner: string;
  industry: string;
  website: string;
  phone: string;
  address: string;
};

export const STAGES: { value: Stage; label: string }[] = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'evaluation', label: 'Evaluation' },
  { value: 'proposal', label: 'Proposal sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'customer', label: 'Customer' },
  { value: 'churned', label: 'Churned' },
];

export const STAGE_TONE: Record<Stage, 'neutral' | 'accent' | 'positive' | 'caution' | 'critical'> = {
  prospect: 'neutral',
  evaluation: 'accent',
  proposal: 'accent',
  negotiation: 'caution',
  customer: 'positive',
  churned: 'critical',
};

export const OWNERS = [
  { value: 'priya', label: 'Priya Raman' },
  { value: 'dmitri', label: 'Dmitri Volkov' },
  { value: 'aoife', label: 'Aoife Brennan' },
  { value: 'marcus', label: 'Marcus Oyelaran' },
];

export const INDUSTRIES = [
  { value: 'Cold-chain logistics', label: 'Cold-chain logistics' },
  { value: 'Food distribution', label: 'Food distribution' },
  { value: 'Freight forwarding', label: 'Freight forwarding' },
  { value: 'Warehousing', label: 'Warehousing' },
  { value: 'Agriculture', label: 'Agriculture' },
];

export const labelFor = (list: { value: string; label: string }[], value: string) =>
  list.find(o => o.value === value)?.label ?? value;

export const INITIAL_ACCOUNT: Account = {
  name: 'Harrowgate Cold Storage',
  stage: 'negotiation',
  owner: 'priya',
  industry: 'Cold-chain logistics',
  website: 'harrowgate-cold.example',
  phone: '+44 113 496 0712',
  address: 'Unit 4, Stourton Link, Leeds LS10 1RS',
};

// Facts the sales team doesn't edit here (they come from billing and the contract).
export const ACCOUNT_FACTS = {
  id: 'ACC-20418',
  created: '14 March 2024',
  dealValue: '£86,400 per year',
  sites: '3 depots, 41 refrigerated trailers',
};

export interface Contact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  role?: 'Decision maker' | 'Champion' | 'Billing';
}

export const CONTACTS: Contact[] = [
  { id: 'c1', name: 'Fenella Ashworth', title: 'Operations director', email: 'f.ashworth@harrowgate-cold.example', phone: '+44 113 496 0715', role: 'Decision maker' },
  { id: 'c2', name: 'Tomasz Wiśniewski', title: 'Fleet manager', email: 'tomasz.w@harrowgate-cold.example', phone: '+44 7700 900 418', role: 'Champion' },
  { id: 'c3', name: 'Grace Nkemelu', title: 'Finance controller', email: 'accounts@harrowgate-cold.example', phone: '+44 113 496 0720', role: 'Billing' },
  { id: 'c4', name: 'Rhys Penhallow', title: 'Night shift supervisor, Stourton depot', email: 'rhys.p@harrowgate-cold.example', phone: '+44 7700 900 652' },
];

export type ActivityKind = 'call' | 'email' | 'meeting' | 'note' | 'stage' | 'edit';

export interface Activity {
  id: string;
  kind: ActivityKind;
  at: Date;
  actor: string;
  text: string;
  detail?: string;
}

// Anchored to the calendar day, so "Today" and "Yesterday" hold at any hour.
const daysAgo = (days: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() > Date.now()) d.setTime(Date.now() - 60_000 * (days + 1));
  return d;
};

export const INITIAL_ACTIVITY: Activity[] = [
  { id: 'a9', kind: 'email', at: daysAgo(0, 9, 12), actor: 'Priya Raman', text: 'emailed Fenella Ashworth the revised order form',
    detail: 'Attached the order form with the 3-year term and the 8% discount on trailer sensors. Asked for a signature by 14 November so installs can start before the Christmas peak.' },
  { id: 'a8', kind: 'call', at: daysAgo(1, 15, 40), actor: 'Priya Raman', text: 'called Tomasz Wiśniewski (22 minutes)',
    detail: 'Tomasz is happy with the pilot data from the Stourton depot. Wants door-open alerts routed to the night supervisor, not the shared inbox.' },
  { id: 'a7', kind: 'stage', at: daysAgo(1, 11, 5), actor: 'Priya Raman', text: 'moved the account from Proposal sent to Negotiation' },
  { id: 'a6', kind: 'meeting', at: daysAgo(4, 10, 0), actor: 'Dmitri Volkov', text: 'met Fenella Ashworth and Grace Nkemelu at the Leeds office',
    detail: 'Walked through pricing. Grace needs quarterly invoicing rather than annual in advance; finance has approved that.' },
  { id: 'a5', kind: 'note', at: daysAgo(6, 16, 30), actor: 'Priya Raman', text: 'added a note',
    detail: 'Competitor (incumbent) contract ends 31 January. Their main complaint is false temperature alarms on the older trailers.' },
  { id: 'a4', kind: 'email', at: daysAgo(9, 8, 50), actor: 'Grace Nkemelu', text: 'replied asking for a breakdown of installation costs' },
  { id: 'a3', kind: 'meeting', at: daysAgo(15, 13, 0), actor: 'Aoife Brennan', text: 'ran the pilot review with Tomasz Wiśniewski at the Stourton depot' },
];

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// An in-memory stand-in for the CRM's account service, with a revision so a stale write is refused.
export function createAccountService(initial: Account) {
  let record = { ...initial };
  let revision = 1;
  return {
    get revision() { return revision; },
    async save(patch: Partial<Account>, expectedRevision: number): Promise<{ ok: true; value: Account; revision: number } | { ok: false; error: string }> {
      await wait(450);
      if (expectedRevision !== revision) return { ok: false, error: 'Someone else changed this account. Reload it to see their changes, then edit again.' };
      record = { ...record, ...patch };
      revision += 1;
      return { ok: true, value: { ...record }, revision };
    },
  };
}
