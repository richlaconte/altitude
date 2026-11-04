import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {
  AILabel,
  AltitudeProvider,
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
  RelativeTime,
  Select,
  Toaster,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';

type Customer = {
  company: string;
  billingEmail: string;
  plan: string;
  owner: string;
};

type Proposals = {billingEmail?: string; owner?: string};

type ActivityEntry = {
  id: number;
  field: 'billingEmail' | 'owner';
  accepted: boolean;
  from: string;
  to: string;
  at: Date;
};

const OWNERS = [
  {value: 'priya', label: 'Priya Raman'},
  {value: 'tomasz', label: 'Tomasz Wierzbicki'},
  {value: 'dele', label: 'Dele Okonkwo'},
  {value: 'hana', label: 'Hana Sato'},
];
const ownerName = (v: string) => OWNERS.find(o => o.value === v)?.label ?? v;

const FIELD_NAMES = {billingEmail: 'Billing email', owner: 'Account owner'} as const;

// The assistant's suggestions came from this message; shown in the AI label's explanation.
const PROPOSAL_SOURCE = {title: 'Email from Jo Brannigan (Finance, Halden Freight), 30 Oct'};
const PROPOSED_AT = new Date(Date.now() - 18 * 60000);

type SaveResult = {ok: true; value: string} | {ok: false; error: string};

const wait =(ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simulated persistence: there is no backend, so each write waits and then succeeds unless the value is invalid.
async function saveBillingEmail(draft: string): Promise<SaveResult> {
  await wait(900);
  const value = draft.trim();
  if (!EMAIL.test(value)) return {ok: false, error: 'Use an email address like ap@company.example.'};
  return {ok: true, value};
}
async function saveOwner(draft: string): Promise<SaveResult> {
  await wait(900);
  if (!OWNERS.some(o => o.value === draft)) return {ok: false, error: 'Choose someone from your team.'};
  return {ok: true, value: draft};
}

function App() {
  const [customer, setCustomer] = React.useState<Customer>({
    company: 'Halden Freight Partners Ltd',
    billingEmail: 'accounts@haldenfreight.example',
    plan: 'Growth, billed annually',
    owner: 'priya',
  });
  const [proposals, setProposals] = React.useState<Proposals>({
    billingEmail: 'ap@haldenfreight.example',
    owner: 'tomasz',
  });
  const [activity, setActivity] = React.useState<ActivityEntry[]>([]);
  const nextId = React.useRef(1);

  const set = <K extends keyof Customer>(key: K) => (value: Customer[K]) =>
    setCustomer(c => ({...c, [key]: value}));

  // The value each accepted write replaced, for the activity entry. Captured when the simulated save lands.
  const customerRef = React.useRef(customer);
  customerRef.current = customer;
  const replaced = React.useRef<Partial<Record<'billingEmail' | 'owner', string>>>({});

  const persist = (field: 'billingEmail' | 'owner', save: (d: string) => Promise<SaveResult>) => async (draft: string) => {
    const before = customerRef.current[field];
    const result = await save(draft);
    if (result.ok) replaced.current[field] = before;
    return result;
  };

  // Called once a proposal is accepted (and its save landed) or rejected: log it and clear the proposal.
  const resolve = (field: 'billingEmail' | 'owner') => (accepted: boolean, value: string) => {
    const label = field === 'owner' ? ownerName : (v: string) => v;
    const from = accepted ? replaced.current[field] ?? customerRef.current[field] : customerRef.current[field];
    setActivity(a => [{id: nextId.current++, field, accepted, from: label(from), to: label(value), at: new Date()}, ...a]);
    setProposals(p => ({...p, [field]: undefined}));
  };

  const pending = Object.values(proposals).filter(v => v !== undefined).length;

  return (
    <main className="page">
      <PageHeader>
        <PageHeaderTitle>{customer.company}</PageHeaderTitle>
        <PageHeaderDescription>
          {pending > 0
            ? `The assistant suggested ${pending === 1 ? 'one change' : `${pending} changes`} to this customer. Nothing changes until you accept it.`
            : 'Customer record. Select a value to change it.'}
        </PageHeaderDescription>
      </PageHeader>

      <div className="layout">
        <Card>
          <CardHeader>
            <CardTitle className="title-row">
              <span id="customer-details">Customer details</span>
              {pending > 0 && (
                <AILabel
                  subject="Suggested changes"
                  generatedAt={PROPOSED_AT}
                  sources={[PROPOSAL_SOURCE]}
                  confidence="High: the email names the new contact and owner directly"
                />
              )}
            </CardTitle>
            <CardDescription>Billing contact and ownership for this account.</CardDescription>
          </CardHeader>
          <CardContent>
            <PropertyList aria-labelledby="customer-details" layout="inline" proposedBy="Assistant">
              <PropertyListItem label="Company name" value={customer.company} />
              <PropertyListItem
                label="Billing email"
                value={customer.billingEmail}
                required
                onSave={persist('billingEmail', saveBillingEmail)}
                onValueChange={set('billingEmail')}
                validate={v => (EMAIL.test(v.trim()) ? undefined : 'Use an email address like ap@company.example.')}
                editor={({value, onValueChange, ...control}) => (
                  <Input {...control} type="email" size="sm" value={value ?? ''} onChange={e => onValueChange(e.target.value)} />
                )}
                proposed={proposals.billingEmail}
                onProposalResolved={resolve('billingEmail')}
              />
              <PropertyListItem label="Plan" value={customer.plan} />
              <PropertyListItem
                label="Account owner"
                value={customer.owner}
                commit="on-choose"
                renderValue={ownerName}
                onSave={persist('owner', saveOwner)}
                onValueChange={set('owner')}
                editor={control => <Select {...control} items={OWNERS} size="sm" />}
                proposed={proposals.owner}
                onProposalResolved={resolve('owner')}
              />
            </PropertyList>
          </CardContent>
        </Card>

        <section aria-labelledby="activity-title" className="activity">
          <h2 id="activity-title" className="activity-title">Activity</h2>
          {activity.length === 0 ? (
            <p className="muted">No changes yet. Accepted and rejected suggestions are listed here.</p>
          ) : (
            <ol className="activity-list">
              {activity.map(entry => (
                <li key={entry.id} className="activity-item">
                  <span>
                    {entry.accepted
                      ? <>{FIELD_NAMES[entry.field]} changed from <strong>{entry.from}</strong> to <strong>{entry.to}</strong>.</>
                      : <>Rejected the suggested {FIELD_NAMES[entry.field].toLowerCase()} <strong>{entry.to}</strong>. {FIELD_NAMES[entry.field]} unchanged.</>}
                  </span>
                  <span className="muted meta">
                    Suggested by Assistant, {entry.accepted ? 'accepted' : 'rejected'} by you, <RelativeTime date={entry.at} />
                    {entry.accepted && (
                      <AILabel
                        subject={`${FIELD_NAMES[entry.field]} change`}
                        generatedAt={PROPOSED_AT}
                        sources={[PROPOSAL_SOURCE]}
                        reviewedBy="you"
                      />
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
      <Toaster />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
  </AltitudeProvider>,
);
