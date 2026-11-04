export type Person = { name: string; email: string };

export type Customer = {
  id: string;
  companyName: string;
  billingEmail: string;
  plan: string;
  accountOwner: Person;
};

export type FieldKey = 'billingEmail' | 'accountOwner';

export type Proposal =
  | { id: string; field: 'billingEmail'; value: string; reason: string }
  | { id: string; field: 'accountOwner'; value: Person; reason: string };

export const initialCustomer: Customer = {
  id: 'cus_8F2K41',
  companyName: 'Halvorsen Freight Ltd.',
  billingEmail: 'accounts@halvorsenfreight.com',
  plan: 'Growth (annual)',
  accountOwner: { name: 'Priya Raman', email: 'priya.raman@example.com' },
};

export const initialProposals: Proposal[] = [
  {
    id: 'prop_email',
    field: 'billingEmail',
    value: 'ap@halvorsenfreight.com',
    reason:
      'The last three invoices to accounts@ bounced. Their finance lead asked in ticket #4471 for invoices to go to ap@ instead.',
  },
  {
    id: 'prop_owner',
    field: 'accountOwner',
    value: { name: 'Marcus Oyelaran', email: 'marcus.oyelaran@example.com' },
    reason:
      'Priya moved to the Enterprise team on 28 October. Marcus now covers Growth accounts in the Nordics region.',
  },
];

/**
 * Stands in for the backend: resolves after a short delay, or rejects when `fail` is set,
 * so the screen can show both outcomes.
 */
export function saveField(_customerId: string, _field: FieldKey, _value: unknown, fail: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (fail) reject(new Error('The billing service did not respond. Nothing was changed.'));
      else resolve();
    }, 1100);
  });
}
