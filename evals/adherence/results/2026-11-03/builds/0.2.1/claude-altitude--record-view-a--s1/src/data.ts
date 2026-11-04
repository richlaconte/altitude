export type Stage = 'Prospect' | 'Evaluation' | 'Negotiation' | 'Customer' | 'At risk';
export type Tier = 'Enterprise' | 'Mid-market' | 'SMB';

export interface Account {
  name: string;
  domain: string;
  industry: string;
  tier: Tier;
  stage: Stage;
  owner: string;
  employees: string;
  annualRevenue: string;
  arr: number;
  renewalDate: string; // ISO date
  phone: string;
  address: string;
  description: string;
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  role: 'Decision maker' | 'Champion' | 'Influencer' | 'Technical' | 'Billing';
  lastContacted: string; // ISO date
  primary?: boolean;
}

export type ActivityKind = 'call' | 'email' | 'meeting' | 'note' | 'deal';

export interface Activity {
  id: string;
  kind: ActivityKind;
  title: string;
  body?: string;
  who: string;
  contact?: string;
  at: string; // ISO datetime
}

export const STAGES: Stage[] = ['Prospect', 'Evaluation', 'Negotiation', 'Customer', 'At risk'];
export const TIERS: Tier[] = ['Enterprise', 'Mid-market', 'SMB'];
export const OWNERS = ['Priya Raman', 'Marcus Feld', 'Dana Okafor', 'Tomás Herrera'];
export const INDUSTRIES = [
  'Logistics & freight',
  'Manufacturing',
  'Healthcare',
  'Financial services',
  'Retail',
  'Software',
];

export const initialAccount: Account = {
  name: 'Harbor Line Logistics',
  domain: 'harborline.com',
  industry: 'Logistics & freight',
  tier: 'Enterprise',
  stage: 'Customer',
  owner: 'Priya Raman',
  employees: '2,400',
  annualRevenue: '$612M',
  arr: 184_000,
  renewalDate: '2027-02-28',
  phone: '+1 (206) 555-0142',
  address: '1180 Alaskan Way, Suite 400, Seattle, WA 98101',
  description:
    'Regional freight carrier running 14 cross-dock terminals on the West Coast. Uses our dispatch and route-planning modules; evaluating the yard-management add-on for the Tacoma and Oakland terminals ahead of the Q1 renewal.',
};

export const contacts: Contact[] = [
  {
    id: 'c1',
    name: 'Elena Vasquez',
    title: 'VP of Operations',
    email: 'elena.vasquez@harborline.com',
    phone: '+1 (206) 555-0187',
    role: 'Decision maker',
    lastContacted: '2026-10-30',
    primary: true,
  },
  {
    id: 'c2',
    name: 'Jordan Pike',
    title: 'Director, Terminal Systems',
    email: 'jordan.pike@harborline.com',
    phone: '+1 (206) 555-0119',
    role: 'Champion',
    lastContacted: '2026-11-02',
  },
  {
    id: 'c3',
    name: 'Samir Haddad',
    title: 'IT Infrastructure Lead',
    email: 'samir.haddad@harborline.com',
    phone: '+1 (253) 555-0164',
    role: 'Technical',
    lastContacted: '2026-10-21',
  },
  {
    id: 'c4',
    name: 'Grace Lindqvist',
    title: 'Procurement Manager',
    email: 'grace.lindqvist@harborline.com',
    phone: '+1 (206) 555-0133',
    role: 'Influencer',
    lastContacted: '2026-10-14',
  },
  {
    id: 'c5',
    name: 'Ray Donnelly',
    title: 'Accounts Payable',
    email: 'ap@harborline.com',
    phone: '+1 (206) 555-0100',
    role: 'Billing',
    lastContacted: '2026-09-03',
  },
];

export const activities: Activity[] = [
  {
    id: 'a1',
    kind: 'call',
    title: 'Discovery call: yard management',
    body: 'Jordan walked through gate-check bottlenecks at Tacoma. Trucks wait about 22 minutes at peak. Wants a pilot scoped for January.',
    who: 'Priya Raman',
    contact: 'Jordan Pike',
    at: '2026-11-02T16:30:00',
  },
  {
    id: 'a2',
    kind: 'email',
    title: 'Sent renewal proposal draft',
    body: 'Three-year term with yard management bundled at 15% off list. Waiting on Elena for review.',
    who: 'Priya Raman',
    contact: 'Elena Vasquez',
    at: '2026-10-30T10:12:00',
  },
  {
    id: 'a3',
    kind: 'deal',
    title: 'Opportunity moved to Negotiation',
    body: 'Yard Management Expansion · $62,000',
    who: 'Priya Raman',
    at: '2026-10-28T14:05:00',
  },
  {
    id: 'a4',
    kind: 'meeting',
    title: 'On-site QBR in Seattle',
    body: 'Route-planning adoption is at 91% of dispatchers. They raised SSO with Okta as a requirement for the yard pilot.',
    who: 'Marcus Feld',
    contact: 'Elena Vasquez',
    at: '2026-10-21T13:00:00',
  },
  {
    id: 'a5',
    kind: 'note',
    title: 'Security review needed',
    body: 'Samir needs our SOC 2 Type II report and a data-residency statement before IT will sign off.',
    who: 'Priya Raman',
    contact: 'Samir Haddad',
    at: '2026-10-21T09:40:00',
  },
  {
    id: 'a6',
    kind: 'email',
    title: 'Procurement vendor form returned',
    who: 'Dana Okafor',
    contact: 'Grace Lindqvist',
    at: '2026-10-14T11:22:00',
  },
];

export const opportunities = [
  { name: 'Yard Management Expansion', amount: 62_000, stage: 'Negotiation', close: '2026-12-15' },
  { name: '2027 Platform Renewal', amount: 184_000, stage: 'Proposal', close: '2027-02-28' },
];
