import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AILabel,
  AltitudeProvider,
  Breadcrumb,
  Input,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  PropertyList,
  PropertyListItem,
  RelativeTime,
  Select,
  Switch,
  Toaster,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './customer.css';

// Design record: see README.md ("Customer record screen").

type Customer = { company: string; email: string; plan: string; owner: string };
type Proposals = { email?: string; owner?: string };
type Activity = { id: number; text: string; at: Date };

const OWNERS = [
  { value: 'priya', label: 'Priya Natarajan' },
  { value: 'tomasz', label: 'Tomasz Wiśniewski' },
  { value: 'ade', label: 'Adeola Bankole' },
  { value: 'lucas', label: 'Lucas Ferreira' },
];
const ownerName = (v: string) => OWNERS.find((o) => o.value === v)?.label ?? v;

const PROPOSAL_SOURCE = {
  model: 'Opus 5.5',
  generatedAt: new Date(Date.now() - 12 * 60000),
  sources: [{ title: 'Email from Mei Lin (Harbourline Freight), 2 Nov: “New AP inbox and account contact”' }],
  confidence: 'High: the customer stated both changes directly',
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CustomerRecord() {
  const [customer, setCustomer] = React.useState<Customer>({
    company: 'Harbourline Freight Ltd',
    email: 'accounts@harbourline.example',
    plan: 'Growth, billed annually',
    owner: 'priya',
  });
  const [proposals, setProposals] = React.useState<Proposals>({
    email: 'ap@harbourline.example',
    owner: 'tomasz',
  });
  const [accepted, setAccepted] = React.useState<{ email?: boolean; owner?: boolean }>({});
  const [activity, setActivity] = React.useState<Activity[]>([]);
  const [failNext, setFailNext] = React.useState(false);
  const failRef = React.useRef(failNext);
  failRef.current = failNext;
  const nextId = React.useRef(1);

  const log = (text: string) =>
    setActivity((a) => [{ id: nextId.current++, text, at: new Date() }, ...a]);

  // Simulated persistence: there is no backend. A save takes a moment and can be made to fail once.
  const save = <V,>(validate?: (v: V) => string | undefined) => async (draft: V) => {
    await wait(900);
    if (failRef.current) {
      setFailNext(false);
      return { ok: false as const, error: 'We couldn’t reach the billing service. Nothing changed. Try again.' };
    }
    const problem = validate?.(draft);
    if (problem) return { ok: false as const, error: problem };
    return { ok: true as const, value: draft };
  };

  const validateEmail = (v: string) => (EMAIL_RE.test(v.trim()) ? undefined : 'Enter an email address, like billing@company.example.');

  const resolve = (key: 'email' | 'owner', label: string, show: (v: string) => string) => (ok: boolean, value: string) => {
    setProposals((p) => ({ ...p, [key]: undefined }));
    if (ok) {
      setAccepted((a) => ({ ...a, [key]: true }));
      log(`You accepted the Assistant’s ${label}: ${show(value)}.`);
    } else {
      log(`You rejected the Assistant’s ${label}. ${label[0].toUpperCase() + label.slice(1)} unchanged.`);
    }
  };

  const provenance = (subject: string) => (
    <AILabel subject={subject} {...PROPOSAL_SOURCE} reviewedBy="you" />
  );

  return (
    <main className="cr-page">
      <PageHeader breadcrumb={<Breadcrumb items={[{ label: 'Customers', href: '#/customers' }, { label: customer.company }]} />}>
        <PageHeaderTitle>{customer.company}</PageHeaderTitle>
        <PageHeaderDescription>Billing details for this customer. Review the Assistant’s proposed changes before they take effect.</PageHeaderDescription>
      </PageHeader>

      <div className="cr-columns">
        <section className="cr-record" aria-labelledby="cr-details">
          <h2 id="cr-details" className="cr-heading">Billing details</h2>
          <PropertyList aria-labelledby="cr-details" layout="inline" proposedBy="Assistant">
            <PropertyListItem label="Company name" value={customer.company} />
            <PropertyListItem
              label="Billing email"
              value={customer.email}
              renderValue={(v) => (
                <span className="cr-value">
                  {v}
                  {accepted.email && provenance('Billing email')}
                </span>
              )}
              required
              validate={validateEmail}
              onSave={save<string>(validateEmail)}
              onValueChange={(email) => setCustomer((c) => ({ ...c, email }))}
              editor={({ value, onValueChange, ...control }) => (
                <Input {...control} type="email" size="sm" value={value ?? ''} onChange={(e) => onValueChange(e.target.value)} />
              )}
              proposed={proposals.email}
              onProposalResolved={resolve('email', 'billing email', (v) => v)}
            />
            <PropertyListItem label="Plan" value={customer.plan} />
            <PropertyListItem
              label="Account owner"
              value={customer.owner}
              renderValue={(v) => (
                <span className="cr-value">
                  {ownerName(v)}
                  {accepted.owner && provenance('Account owner')}
                </span>
              )}
              commit="on-choose"
              onSave={save<string>()}
              onValueChange={(owner) => setCustomer((c) => ({ ...c, owner }))}
              editor={(control) => <Select {...control} items={OWNERS} size="sm" />}
              proposed={proposals.owner}
              onProposalResolved={resolve('owner', 'account owner', ownerName)}
            />
          </PropertyList>
        </section>

        <aside className="cr-side">
          <section aria-labelledby="cr-source">
            <h2 id="cr-source" className="cr-heading">
              Why these changes <AILabel subject="Proposed changes" {...PROPOSAL_SOURCE} />
            </h2>
            <p className="cr-muted">
              The Assistant read an email from Mei Lin at Harbourline Freight asking to send invoices to their new accounts-payable
              inbox and to make Tomasz Wiśniewski their account owner. Nothing changes until you accept.
            </p>
          </section>

          <section aria-labelledby="cr-activity">
            <h2 id="cr-activity" className="cr-heading">Activity</h2>
            {activity.length === 0 ? (
              <p className="cr-muted">No changes to this record yet.</p>
            ) : (
              <ol className="cr-activity">
                {activity.map((a) => (
                  <li key={a.id}>
                    <span>{a.text}</span>
                    <span className="cr-muted cr-meta">
                      Proposed by Assistant · reviewed by you · <RelativeTime date={a.at} />
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="cr-sim" className="cr-sim">
            <h2 id="cr-sim" className="cr-heading">Simulation</h2>
            <p className="cr-muted">This preview has no backend. Saves are simulated and take about a second.</p>
            <Switch checked={failNext} onCheckedChange={setFailNext} label="Make the next save fail" />
          </section>
        </aside>
      </div>
    </main>
  );
}

function App() {
  return (
    <>
      <CustomerRecord />
      <Toaster />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
  </AltitudeProvider>,
);
