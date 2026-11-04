// Sample data for one account. There is no backend: `accountService` keeps the record in memory with a revision,
// so writes behave like a real service (latency, stale-write rejection) without pretending to persist anywhere.

export type Stage = 'prospect' | 'customer' | 'renewal' | 'at-risk';

export interface Account {
  name: string;
  legalName: string;
  stage: Stage;
  owner: string;
  industry: string;
  plan: string;
  annualValue: number;
  renewalDate: string; // ISO date
  website: string;
  address: string;
  customerSince: string; // ISO date
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  role: 'Decision maker' | 'Champion' | 'Billing' | 'Technical' | 'User';
  email: string;
  phone: string;
  primary?: boolean;
  lastContacted: Date;
}

export type ActivityKind = 'call' | 'email' | 'meeting' | 'note' | 'stage' | 'invoice' | 'edit';

export interface Activity {
  id: string;
  kind: ActivityKind;
  at: Date;
  actor: string;
  /** The rest of the sentence after the actor's name. */
  text: string;
  detail?: string;
  status?: 'pending' | 'committed' | 'failed';
}

export const STAGES: { value: Stage; label: string; tone: 'neutral' | 'accent' | 'positive' | 'caution' }[] = [
  { value: 'prospect', label: 'Prospect', tone: 'neutral' },
  { value: 'customer', label: 'Customer', tone: 'positive' },
  { value: 'renewal', label: 'Renewal in progress', tone: 'accent' },
  { value: 'at-risk', label: 'At risk', tone: 'caution' },
];

export const TEAM = [
  { value: 'Dana Okafor', label: 'Dana Okafor' },
  { value: 'Rhys Llewellyn', label: 'Rhys Llewellyn' },
  { value: 'Mei Tanaka-Ross', label: 'Mei Tanaka-Ross' },
  { value: 'Samuel Adjei', label: 'Samuel Adjei' },
];

/** The person using the CRM. */
export const CURRENT_USER = 'Dana Okafor';

const daysAgo = (d: number, hour = 10, minute = 0) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(hour, minute, 0, 0);
  return t;
};
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

export const INITIAL_ACCOUNT: Account = {
  name: 'Harrow & Pike Freight',
  legalName: 'Harrow & Pike Freight Ltd',
  stage: 'renewal',
  owner: 'Dana Okafor',
  industry: 'Freight forwarding',
  plan: 'Fleet Pro, 40 driver seats',
  annualValue: 48600,
  renewalDate: '2027-01-14',
  website: 'harrowpike.example',
  address: 'Unit 4, Stourton Link, Leeds LS10 1RW',
  customerSince: '2023-03-06',
};

export const CONTACTS: Contact[] = [
  { id: 'c-kwame', name: 'Kwame Mensah-Bright', title: 'Operations manager', role: 'Champion', email: 'kwame@harrowpike.example', phone: '+44 113 496 0417', primary: true, lastContacted: hoursAgo(2) },
  { id: 'c-fiona', name: 'Fiona Harrow', title: 'Managing director', role: 'Decision maker', email: 'fiona.harrow@harrowpike.example', phone: '+44 113 496 0182', lastContacted: daysAgo(1, 15, 30) },
  { id: 'c-ola', name: 'Ola Wiśniewska', title: 'Finance lead', role: 'Billing', email: 'accounts@harrowpike.example', phone: '+44 113 496 0255', lastContacted: daysAgo(3, 11) },
  { id: 'c-priya', name: 'Priya Raman', title: 'IT contractor (Raman Systems)', role: 'Technical', email: 'priya@ramansystems.example', phone: '+44 7700 900 318', lastContacted: daysAgo(18, 14) },
  { id: 'c-jack', name: 'Jack Pike', title: 'Depot supervisor, Wakefield', role: 'User', email: 'jack.pike@harrowpike.example', phone: '+44 1924 496 071', lastContacted: daysAgo(41, 9) },
];

export const INITIAL_ACTIVITY: Activity[] = [
  { id: 'a9', kind: 'email', at: hoursAgo(2), actor: 'Kwame Mensah-Bright', text: 'emailed about the driver app crashing on older Android handsets',
    detail: '“Three of our Wakefield drivers are on Galaxy A12s and the app closes when they scan a proof of delivery. Is there a fix before the January routes start?”' },
  { id: 'a8', kind: 'call', at: daysAgo(1, 15, 30), actor: 'Dana Okafor', text: 'logged a call with Fiona Harrow about renewal pricing',
    detail: 'Fiona is happy with Fleet Pro but wants the per-seat price held for two years. Agreed to send a two-year option alongside the one-year quote by Friday.' },
  { id: 'a7', kind: 'meeting', at: daysAgo(3, 11), actor: 'Dana Okafor', text: 'held the quarterly review with Kwame Mensah-Bright and Ola Wiśniewska',
    detail: 'On-time delivery up from 91% to 95% since route planning went live. They may add 8 seats for the new Wakefield depot in spring.' },
  { id: 'a6', kind: 'stage', at: daysAgo(6, 9, 15), actor: 'Dana Okafor', text: 'moved the stage from Customer to Renewal in progress' },
  { id: 'a5', kind: 'email', at: daysAgo(6, 9, 10), actor: 'Dana Okafor', text: 'sent the renewal quote: £48,600 a year for 40 seats' },
  { id: 'a4', kind: 'invoice', at: daysAgo(9, 16), actor: 'Ola Wiśniewska', text: 'paid invoice INV-2026-0931 (£4,050)' },
  { id: 'a3', kind: 'note', at: daysAgo(18, 14), actor: 'Rhys Llewellyn', text: 'added a note after the SSO set-up call with Priya Raman',
    detail: 'SSO through their Microsoft tenant is live. Priya asked for the audit log export; it is on the Q1 roadmap.' },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** An in-memory stand-in for the CRM's account service. */
export function createAccountService(initial: Account) {
  let record = { ...initial };
  let revision = 1;
  return {
    get revision() { return revision; },
    async patch<K extends keyof Account>(key: K, value: Account[K], expectedRevision: number): Promise<{ ok: true; value: Account[K]; revision: number } | { ok: false; error: string }> {
      await wait(450);
      if (expectedRevision !== revision) return { ok: false, error: 'Someone else changed this account. Reload it to see their change.' };
      record = { ...record, [key]: value };
      revision += 1;
      return { ok: true, value: record[key], revision };
    },
    async logActivity(activity: Activity): Promise<Activity> {
      await wait(700);
      return { ...activity, status: 'committed' };
    },
  };
}
