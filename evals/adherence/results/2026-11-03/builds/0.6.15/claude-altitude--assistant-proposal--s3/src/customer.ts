// Sample data and a simulated service. There is no backend: saves resolve after a short delay.

export interface Customer {
  company: string;
  billingEmail: string;
  plan: string;
  ownerId: string;
}

export const OWNERS = [
  { value: 'priya', label: 'Priya Raman' },
  { value: 'tomas', label: 'Tomás Ferreira' },
  { value: 'okon', label: 'Okon Bassey' },
];

export const ownerName = (id: string) => OWNERS.find(o => o.value === id)?.label ?? id;

export const CUSTOMER: Customer = {
  company: 'Halden Freight Ltd',
  billingEmail: 'accounts@haldenfreight.example',
  plan: 'Growth, billed annually',
  ownerId: 'priya',
};

export const PROPOSALS = {
  billingEmail: { value: 'ap@haldenfreight.example' },
  ownerId: { value: 'tomas' },
  model: 'Opus 5.5',
  generatedAt: new Date(Date.now() - 12 * 60000),
  confidence: 'High: the customer asked for both changes in writing',
  sources: [{ title: 'Email from Ruth Halden, "New AP inbox and contact"' }],
};

export function validateEmail(value: string): string | undefined {
  if (!value.trim()) return 'Enter a billing email.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter an email address like name@company.com.';
  return undefined;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Simulated persistence: resolves with the canonical value once the "server" confirms. */
export async function saveCustomerField<K extends keyof Customer>(_key: K, value: Customer[K]) {
  await wait(800);
  return { ok: true as const, value: typeof value === 'string' ? (value.trim() as Customer[K]) : value };
}
