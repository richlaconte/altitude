// Sample data for one account. There is no backend: `saveAccount` stands in for the CRM service and keeps the
// record in memory for this page session only.

export type Stage = 'prospect' | 'evaluating' | 'negotiation' | 'customer' | 'churned';

export type Account = {
  name: string;
  stage: Stage;
  owner: string;
  industry: string;
  employees: string;
  annualValue: string;
  website: string;
  phone: string;
  address: string;
  renewalDate: string;
  about: string;
};

export type Contact = {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  primary?: boolean;
};

export type Activity = {
  id: string;
  time: string;
  kind: 'call' | 'email' | 'meeting' | 'note' | 'deal' | 'edit';
  text: string;
  detail?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

export const STAGES: { value: Stage; label: string }[] = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'evaluating', label: 'Evaluating' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'customer', label: 'Customer' },
  { value: 'churned', label: 'Churned' },
];

export const OWNERS = ['Priya Raman', 'Marcus Feld', 'Hannah Okafor', 'Diego Salgado'].map((n) => ({ value: n, label: n }));

export const INDUSTRIES = ['Freight and logistics', 'Manufacturing', 'Retail', 'Healthcare', 'Financial services', 'Software']
  .map((n) => ({ value: n, label: n }));

export const initialAccount: Account = {
  name: 'Brightwater Logistics',
  stage: 'customer',
  owner: 'Priya Raman',
  industry: 'Freight and logistics',
  employees: '1240',
  annualValue: '186000',
  website: 'https://brightwaterlogistics.com',
  phone: '+1 (414) 555-0182',
  address: '2200 N Commerce St, Milwaukee, WI 53212',
  renewalDate: '2027-02-28',
  about: 'Regional freight carrier running 14 cross-dock terminals across the Midwest. Uses Route Planner and Fleet Insights on the Enterprise plan; evaluating the Yard Management add-on for their two largest terminals.',
};

export const contacts: Contact[] = [
  { id: 'c1', name: 'Dana Whitfield', title: 'VP of Operations', email: 'dana.whitfield@brightwaterlogistics.com', phone: '+1 (414) 555-0147', primary: true },
  { id: 'c2', name: 'Samuel Oyelaran', title: 'Director of IT', email: 's.oyelaran@brightwaterlogistics.com', phone: '+1 (414) 555-0163' },
  { id: 'c3', name: 'Mei Lin Chou', title: 'Procurement Manager', email: 'meilin.chou@brightwaterlogistics.com', phone: '+1 (414) 555-0129' },
  { id: 'c4', name: 'Rob Kessler', title: 'Terminal Manager, Gary IN', email: 'rob.kessler@brightwaterlogistics.com', phone: '+1 (219) 555-0174' },
];

export const initialActivity: Activity[] = [
  { id: 'a1', time: '2026-10-29T16:20:00-05:00', kind: 'call', text: 'Priya Raman called Dana Whitfield about the Yard Management pilot', detail: '25 min. Dana wants the pilot at Gary and Joliet first; needs a security review from Samuel before procurement signs.' },
  { id: 'a2', time: '2026-10-28T10:05:00-05:00', kind: 'email', text: 'Mei Lin Chou replied to “Yard Management pricing for two terminals”', detail: 'Asked whether the pilot price can be credited against the annual contract if they roll out to all 14 terminals.' },
  { id: 'a3', time: '2026-10-24T14:00:00-05:00', kind: 'meeting', text: 'Priya Raman and Hannah Okafor met Samuel Oyelaran for a technical review', detail: 'Covered SSO, the telematics integration and data residency. Follow-up: send the SOC 2 report.' },
  { id: 'a4', time: '2026-10-21T09:30:00-05:00', kind: 'deal', text: 'Priya Raman opened the deal “Yard Management pilot” for $24,000' },
  { id: 'a5', time: '2026-10-14T11:45:00-05:00', kind: 'note', text: 'Hannah Okafor noted that Gary terminal volume is up 30% since September', detail: 'Rob Kessler mentioned they are short on yard staff for the peak season.' },
  { id: 'a6', time: '2026-10-02T13:15:00-05:00', kind: 'email', text: 'Priya Raman sent the Q3 business review deck to Dana Whitfield' },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Stand-in for the CRM service: answers after a delay with the record as stored (trimmed). */
export async function saveAccount(draft: Account): Promise<Account> {
  await wait(700);
  const stored = { ...draft };
  (Object.keys(stored) as (keyof Account)[]).forEach((k) => { (stored as Record<string, string>)[k] = String(stored[k]).trim(); });
  return stored;
}
