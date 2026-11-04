export type Stage = 'prospect' | 'evaluation' | 'negotiation' | 'customer' | 'at-risk';

export interface Account {
  name: string;
  industry: string;
  stage: Stage;
  owner: string;
  website: string;
  phone: string;
  employees: string;
  annualValue: string;
  renewalDate: string;
  address: string;
  description: string;
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  role: 'Decision maker' | 'Champion' | 'Influencer' | 'User' | 'Billing';
  primary?: boolean;
  lastContacted: string;
}

export type ActivityKind = 'call' | 'email' | 'meeting' | 'note' | 'deal';

export interface Activity {
  id: string;
  kind: ActivityKind;
  title: string;
  body?: string;
  who: string;
  contact?: string;
  at: string; // ISO
}

export const STAGES: { value: Stage; label: string; tone: 'neutral' | 'accent' | 'positive' | 'caution' | 'critical' }[] = [
  { value: 'prospect', label: 'Prospect', tone: 'neutral' },
  { value: 'evaluation', label: 'Evaluation', tone: 'accent' },
  { value: 'negotiation', label: 'Negotiation', tone: 'caution' },
  { value: 'customer', label: 'Customer', tone: 'positive' },
  { value: 'at-risk', label: 'At risk', tone: 'critical' },
];

export const INDUSTRIES = [
  'Logistics & freight',
  'Manufacturing',
  'Healthcare',
  'Financial services',
  'Retail',
  'Software',
  'Energy & utilities',
];

export const OWNERS = ['Priya Raman', 'Marcus Ellery', 'Dana Whitfield', 'Tomás Ortega'];

export const initialAccount: Account = {
  name: 'Harbor & Pine Logistics',
  industry: 'Logistics & freight',
  stage: 'negotiation',
  owner: 'Priya Raman',
  website: 'harborpine.com',
  phone: '+1 (503) 555-0148',
  employees: '1,200',
  annualValue: '184,000',
  renewalDate: '2027-02-28',
  address: '2200 NW Front Ave, Suite 400\nPortland, OR 97209',
  description:
    'Regional third-party logistics provider running 14 warehouses across the Pacific Northwest. Currently on the Growth plan for fleet tracking; evaluating an upgrade to Enterprise to add dock scheduling and the carrier API before peak season.',
};

export const contacts: Contact[] = [
  {
    id: 'c1',
    name: 'Elena Vasquez',
    title: 'VP of Operations',
    email: 'elena.vasquez@harborpine.com',
    phone: '+1 (503) 555-0172',
    role: 'Decision maker',
    primary: true,
    lastContacted: '2026-11-02',
  },
  {
    id: 'c2',
    name: 'Jordan Okafor',
    title: 'Director of Warehouse Systems',
    email: 'j.okafor@harborpine.com',
    phone: '+1 (503) 555-0109',
    role: 'Champion',
    lastContacted: '2026-10-30',
  },
  {
    id: 'c3',
    name: 'Wei Lin',
    title: 'Procurement Manager',
    email: 'wei.lin@harborpine.com',
    phone: '+1 (503) 555-0185',
    role: 'Billing',
    lastContacted: '2026-10-27',
  },
  {
    id: 'c4',
    name: 'Sam Brennan',
    title: 'IT Security Lead',
    email: 'sam.brennan@harborpine.com',
    phone: '+1 (503) 555-0133',
    role: 'Influencer',
    lastContacted: '2026-10-21',
  },
  {
    id: 'c5',
    name: 'Aisha Rahman',
    title: 'Dispatch Supervisor',
    email: 'a.rahman@harborpine.com',
    phone: '+1 (503) 555-0161',
    role: 'User',
    lastContacted: '2026-09-18',
  },
];

export const initialActivity: Activity[] = [
  {
    id: 'a1',
    kind: 'call',
    title: 'Pricing call with Elena',
    body: 'Walked through Enterprise tiering. She wants a 3-year option with a price lock; asked for a revised quote by Friday.',
    who: 'Priya Raman',
    contact: 'Elena Vasquez',
    at: '2026-11-02T16:30:00',
  },
  {
    id: 'a2',
    kind: 'deal',
    title: 'Opportunity moved to Negotiation',
    body: 'Enterprise upgrade · $184,000 ARR · close date Dec 15',
    who: 'Priya Raman',
    at: '2026-11-02T17:05:00',
  },
  {
    id: 'a3',
    kind: 'email',
    title: 'Sent security questionnaire responses',
    body: 'SOC 2 Type II report and the completed SIG Lite attached. Sam to confirm by next week.',
    who: 'Marcus Ellery',
    contact: 'Sam Brennan',
    at: '2026-10-31T10:12:00',
  },
  {
    id: 'a4',
    kind: 'meeting',
    title: 'Dock scheduling demo (onsite)',
    body: 'Jordan and 3 shift leads at the Rivergate warehouse. Strong reaction to the yard view; asked about integration with their Manhattan WMS.',
    who: 'Priya Raman',
    contact: 'Jordan Okafor',
    at: '2026-10-30T13:00:00',
  },
  {
    id: 'a5',
    kind: 'note',
    title: 'Competitor in the mix',
    body: 'Wei mentioned they also have a quote from a competitor at roughly 15% lower. Our edge is the carrier API and existing rollout.',
    who: 'Priya Raman',
    contact: 'Wei Lin',
    at: '2026-10-27T09:40:00',
  },
  {
    id: 'a6',
    kind: 'email',
    title: 'Q3 usage report shared',
    body: 'Tracked shipments up 22% QoQ; 96% of drivers active weekly.',
    who: 'Dana Whitfield',
    contact: 'Elena Vasquez',
    at: '2026-10-14T15:20:00',
  },
  {
    id: 'a7',
    kind: 'call',
    title: 'Support escalation follow-up',
    body: 'Confirmed the ELD sync fix resolved the dispatch delays. Aisha happy with response time.',
    who: 'Dana Whitfield',
    contact: 'Aisha Rahman',
    at: '2026-09-18T11:00:00',
  },
];
