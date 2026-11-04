export interface Person {
  name: string;
  email: string;
}

export interface CustomerRecord {
  id: string;
  companyName: string;
  billingEmail: string;
  plan: string;
  accountOwner: Person;
}

export type ProposalField = 'billingEmail' | 'accountOwner';

export interface Proposal<F extends ProposalField = ProposalField> {
  id: string;
  field: F;
  value: CustomerRecord[F];
  reason: string;
}

export const initialRecord: CustomerRecord = {
  id: 'CUS-20418',
  companyName: 'Halvorsen Freight Ltd.',
  billingEmail: 'accounts@halvorsenfreight.com',
  plan: 'Growth (annual)',
  accountOwner: { name: 'Priya Natarajan', email: 'priya.natarajan@example.com' },
};

export const initialProposals: Proposal[] = [
  {
    id: 'prop-email',
    field: 'billingEmail',
    value: 'ap@halvorsenfreight.com',
    reason:
      'The last three invoices were forwarded from accounts@ to ap@ by the customer, and their finance contact signed off from ap@.',
  },
  {
    id: 'prop-owner',
    field: 'accountOwner',
    value: { name: 'Marcus Oyelaran', email: 'marcus.oyelaran@example.com' },
    reason:
      'Halvorsen moved to the Logistics territory this quarter, which Marcus Oyelaran owns.',
  },
];

/** Simulated save: there is no backend, so this just waits and resolves. */
export function saveField<F extends ProposalField>(
  _customerId: string,
  _field: F,
  value: CustomerRecord[F],
): Promise<CustomerRecord[F]> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 900));
}
