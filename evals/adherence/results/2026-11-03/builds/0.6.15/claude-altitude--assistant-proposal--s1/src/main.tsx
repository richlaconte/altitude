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
  Switch,
  Timeline,
  TimelineItem,
  Toaster,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';

/* ---------------------------------------------------------------------------
 * Sample data. There is no backend: the "service" below waits and resolves
 * (or rejects, when the simulation switch is on) so every save state is real
 * in the interface but nothing leaves the browser.
 * ------------------------------------------------------------------------- */

type Customer = {
  company: string;
  billingEmail: string;
  plan: string;
  owner: string;
};

const OWNERS = [
  { value: 'priya', label: 'Priya Raman' },
  { value: 'tomas', label: 'Tomás Ferreira' },
  { value: 'okonkwo', label: 'Ada Okonkwo' },
  { value: 'lindqvist', label: 'Jonas Lindqvist' },
];
const ownerName = (id: string) => OWNERS.find((o) => o.value === id)?.label ?? id;

const INITIAL: Customer = {
  company: 'Harbourline Freight Ltd',
  billingEmail: 'accounts@harbourline.example',
  plan: 'Growth, billed annually',
  owner: 'priya',
};

const PROPOSAL_SOURCE = { title: 'Email from Marta Kowal (Harbourline finance), 2 Nov 2026' };
const PROPOSED_AT = new Date(Date.now() - 18 * 60000);

type Activity = { id: number; at: Date; text: string };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CustomerRecord() {
  const [customer, setCustomer] = React.useState<Customer>(INITIAL);
  const [proposed, setProposed] = React.useState<{ billingEmail?: string; owner?: string }>({
    billingEmail: 'billing@harbourline.example',
    owner: 'tomas',
  });
  const [failSaves, setFailSaves] = React.useState(false);
  const failRef = React.useRef(failSaves);
  failRef.current = failSaves;

  const nextId = React.useRef(2);
  const [activity, setActivity] = React.useState<Activity[]>([
    {
      id: 1,
      at: PROPOSED_AT,
      text: 'Assistant proposed a new billing email and a new account owner, from Marta Kowal’s email.',
    },
  ]);
  const log = (text: string) =>
    setActivity((xs) => [{ id: nextId.current++, at: new Date(), text }, ...xs]);

  /** Simulated persistence: resolves only after the "write" succeeds. */
  const saveField =
    <V,>(what: string) =>
    async (draft: V) => {
      await wait(900);
      if (failRef.current) {
        return { ok: false as const, error: `We couldn’t save the ${what}. Nothing changed. Try again.` };
      }
      return { ok: true as const, value: draft };
    };

  const set = <K extends keyof Customer>(key: K) => (value: Customer[K]) =>
    setCustomer((c) => ({ ...c, [key]: value }));

  const pendingCount = Object.values(proposed).filter((v) => v !== undefined).length;

  return (
    <main className="page">
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: 'Customers', href: '#/customers' }, { label: customer.company }]} />}
      >
        <PageHeaderTitle>{customer.company}</PageHeaderTitle>
        <PageHeaderDescription>Billing contact, plan and who owns this account.</PageHeaderDescription>
      </PageHeader>

      <div className="layout">
        <Card>
          <CardHeader>
            <CardTitle>
              <span id="customer-details" className="title-row">
                Customer details
                {pendingCount > 0 && (
                  <AILabel
                    subject="Proposed changes"
                    model="Opus 5.5"
                    generatedAt={PROPOSED_AT}
                    sources={[PROPOSAL_SOURCE]}
                    confidence="High: the email names the new billing address and the new owner"
                  />
                )}
              </span>
            </CardTitle>
            <CardDescription>
              {pendingCount > 0
                ? `The assistant proposed ${pendingCount === 1 ? 'one change' : `${pendingCount} changes`}. Nothing changes until you accept.`
                : 'No changes waiting for review.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PropertyList aria-labelledby="customer-details" layout="inline" proposedBy="Assistant">
              <PropertyListItem label="Company name" value={customer.company} />
              <PropertyListItem<string>
                label="Billing email"
                value={customer.billingEmail}
                required
                validate={(v) => (EMAIL.test(v.trim()) ? undefined : 'Enter an email address like billing@company.example.')}
                onSave={saveField<string>('billing email')}
                onValueChange={set('billingEmail')}
                proposed={proposed.billingEmail}
                onProposalResolved={(accepted, value) => {
                  setProposed((p) => ({ ...p, billingEmail: undefined }));
                  if (accepted) {
                    setCustomer((c) => ({ ...c, billingEmail: value }));
                    log(`You accepted the assistant’s billing email: ${value}.`);
                  } else {
                    log(`You rejected the assistant’s billing email (${value}). It stays ${customer.billingEmail}.`);
                  }
                }}
              />
              <PropertyListItem label="Plan" value={customer.plan} />
              <PropertyListItem<string>
                label="Account owner"
                value={customer.owner}
                commit="on-choose"
                renderValue={ownerName}
                editor={(control) => <Select {...control} items={OWNERS} size="sm" />}
                onSave={saveField<string>('account owner')}
                onValueChange={set('owner')}
                proposed={proposed.owner}
                onProposalResolved={(accepted, value) => {
                  setProposed((p) => ({ ...p, owner: undefined }));
                  if (accepted) {
                    setCustomer((c) => ({ ...c, owner: value }));
                    log(`You accepted the assistant’s account owner: ${ownerName(value)}.`);
                  } else {
                    log(`You rejected the assistant’s account owner (${ownerName(value)}). It stays ${ownerName(customer.owner)}.`);
                  }
                }}
              />
            </PropertyList>
          </CardContent>
        </Card>

        <section aria-labelledby="activity-heading" className="side">
          <h2 id="activity-heading" className="section-heading">Activity</h2>
          <Timeline aria-label="Customer activity" groupBy="none">
            {activity.map((e) => (
              <TimelineItem key={e.id} time={e.at}>
                {e.text}
              </TimelineItem>
            ))}
          </Timeline>

          <div className="simulation">
            <h2 className="section-heading">Simulation</h2>
            <p className="hint">There’s no server. Saves wait about a second, then succeed unless this is on.</p>
            <Switch label="Make saves fail" checked={failSaves} onCheckedChange={setFailSaves} />
          </div>
        </section>
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
