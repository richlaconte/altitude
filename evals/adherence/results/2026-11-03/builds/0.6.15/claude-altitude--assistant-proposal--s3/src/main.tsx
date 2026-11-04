import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AILabel,
  AltitudeProvider,
  Breadcrumb,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  PropertyList,
  PropertyListItem,
  Select,
  Toaster,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import { CUSTOMER, OWNERS, PROPOSALS, ownerName, saveCustomerField, validateEmail, type Customer } from './customer';

type Decision = { field: string; accepted: boolean; from: string; to: string; at: Date };

function CustomerRecord() {
  const [customer, setCustomer] = React.useState<Customer>(CUSTOMER);
  // Proposals live outside the record: nothing in `customer` changes until a person accepts.
  const [proposed, setProposed] = React.useState<Partial<Pick<Customer, 'billingEmail' | 'ownerId'>>>({
    billingEmail: PROPOSALS.billingEmail.value,
    ownerId: PROPOSALS.ownerId.value,
  });
  const [decisions, setDecisions] = React.useState<Decision[]>([]);

  const set = <K extends keyof Customer>(key: K) => (value: Customer[K]) => setCustomer(c => ({ ...c, [key]: value }));

  const resolve = (key: 'billingEmail' | 'ownerId', label: string, show: (v: string) => string) =>
    (accepted: boolean, value: string) => {
      setDecisions(d => [{ field: label, accepted, from: show(customer[key]), to: show(value), at: new Date() }, ...d]);
      setProposed(p => { const next = { ...p }; delete next[key]; return next; });
    };

  const reviewed = decisions.length > 0 ? 'you' : undefined;

  return (
    <main style={{ maxWidth: '56rem', margin: '0 auto', padding: 'var(--space-6) var(--space-5)', display: 'grid', gap: 'var(--space-6)' }}>
      <PageHeader breadcrumb={<Breadcrumb items={[{ label: 'Customers', href: '#/customers' }, { label: customer.company }]} />}>
        <PageHeaderTitle>{customer.company}</PageHeaderTitle>
        <PageHeaderDescription>Billing details for this customer account.</PageHeaderDescription>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle id="billing-details" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            Billing details
            {Object.keys(proposed).length > 0 || decisions.length > 0 ? (
              <AILabel
                subject="Proposed changes"
                model={PROPOSALS.model}
                generatedAt={PROPOSALS.generatedAt}
                sources={PROPOSALS.sources}
                confidence={PROPOSALS.confidence}
                reviewedBy={reviewed}
              />
            ) : null}
          </CardTitle>
          <CardDescription>
            The assistant suggested changes after reading the customer's latest email. Nothing changes until you accept a proposal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PropertyList aria-labelledby="billing-details" layout="inline" proposedBy="Assistant">
            <PropertyListItem label="Company name" value={customer.company} />
            <PropertyListItem
              label="Billing email"
              value={customer.billingEmail}
              required
              validate={validateEmail}
              onSave={draft => saveCustomerField('billingEmail', draft)}
              onValueChange={set('billingEmail')}
              editor={({ value, onValueChange, invalid, ...control }) => (
                <Input {...control} type="email" size="sm" invalid={invalid}
                  value={value} onChange={e => onValueChange(e.target.value)} />
              )}
              proposed={proposed.billingEmail}
              onProposalResolved={resolve('billingEmail', 'Billing email', v => v)}
            />
            <PropertyListItem label="Plan" value={customer.plan} />
            <PropertyListItem
              label="Account owner"
              value={customer.ownerId}
              renderValue={ownerName}
              commit="on-choose"
              onSave={draft => saveCustomerField('ownerId', draft)}
              onValueChange={set('ownerId')}
              editor={({ value, onValueChange, id, invalid, disabled }) => (
                <Select id={id} size="sm" aria-label="Account owner" invalid={invalid} disabled={disabled} value={value} onValueChange={onValueChange} items={OWNERS} />
              )}
              proposed={proposed.ownerId}
              onProposalResolved={resolve('ownerId', 'Account owner', ownerName)}
            />
          </PropertyList>
        </CardContent>
      </Card>

      {decisions.length > 0 ? (
        <section aria-labelledby="decisions-title">
          <h2 id="decisions-title" style={{ font: 'inherit', fontWeight: 600, margin: '0 0 var(--space-2)' }}>Your decisions</h2>
          <ul style={{ margin: 0, paddingInlineStart: 'var(--space-5)', color: 'var(--ink-muted)', display: 'grid', gap: 'var(--space-1)' }}>
            {decisions.map((d, i) => (
              <li key={i}>
                {d.accepted
                  ? `${d.field} changed from ${d.from} to ${d.to}. Proposed by Assistant, accepted by you`
                  : `${d.field} kept as ${d.from}. You rejected the Assistant's proposal of ${d.to}`}
                {' · '}
                <time dateTime={d.at.toISOString()}>{d.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <CustomerRecord />
    <Toaster />
  </AltitudeProvider>,
);
