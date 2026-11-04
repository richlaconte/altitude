import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AILabel,
  AltitudeProvider,
  Badge,
  Breadcrumb,
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
import './app.css';

/*
 * Design record
 * - Goal: a billing admin reviews an assistant's proposed changes to one customer and accepts or rejects each.
 * - Primary action: none in the header; each proposal carries its own Accept and Reject (Agent action pattern).
 * - Consequence: accepting writes the field; nothing changes before that. Rejecting leaves the record untouched.
 * - States: proposed (raised), saving (pending), saved (settles, keeps "Drafted with AI"), failed (trench, Retry), rejected.
 * - Application-owned, simulated here: persistence (saveField below, no backend), permissions (assumed: the viewer may
 *   edit billing contacts and owners), navigation (breadcrumb is static), the audit trail (kept in memory only).
 */

type Customer = {
  company: string;
  billingEmail: string;
  plan: string;
  owner: string;
};

const OWNERS = [
  { value: 'dana', label: 'Dana Whitfield' },
  { value: 'kenji', label: 'Kenji Oduya' },
  { value: 'priya', label: 'Priya Raman' },
  { value: 'tomas', label: 'Tomás Herrera' },
];
const ownerName = (v: string) => OWNERS.find((o) => o.value === v)?.label ?? v;

const PROPOSED_AT = new Date(Date.now() - 12 * 60000);
const SOURCES = [
  { title: 'Email from Ruth Halloran (Finance), 1 Nov 2026' },
  { title: 'Account handover note, 30 Oct 2026' },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

type FieldKey = 'billingEmail' | 'owner';
type Entry = { id: number; text: string; at: Date };

function CustomerRecord() {
  const [customer, setCustomer] = React.useState<Customer>({
    company: 'Halloran Freight Co.',
    billingEmail: 'accounts@halloranfreight.example',
    plan: 'Growth (annual)',
    owner: 'dana',
  });
  const [proposed, setProposed] = React.useState<Partial<Record<FieldKey, string>>>({
    billingEmail: 'ap.invoices@halloranfreight.example',
    owner: 'kenji',
  });
  // Fields whose current value came from an accepted proposal: they keep their provenance.
  const [fromAI, setFromAI] = React.useState<Partial<Record<FieldKey, boolean>>>({});
  const [activity, setActivity] = React.useState<Entry[]>([]);

  const log = (text: string) => setActivity((a) => [{ id: Date.now() + Math.random(), text, at: new Date() }, ...a]);

  const set = (key: FieldKey) => (v: string) => setCustomer((c) => ({ ...c, [key]: v }));

  // Simulated write: there is no backend.
  const saveField = (key: FieldKey) => async (draft: string) => {
    await wait(900);
    if (key === 'billingEmail' && !isEmail(draft)) return { ok: false as const, error: 'Use an email address like name@company.example.' };
    return { ok: true as const, value: draft };
  };

  const resolved = (key: FieldKey, label: string, show: (v: string) => string) => (accepted: boolean, value: string) => {
    setProposed((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
    if (accepted) {
      setFromAI((f) => ({ ...f, [key]: true }));
      log(`${label} changed to ${show(value)}. Proposed by Assistant, accepted by you.`);
    } else {
      log(`Rejected the proposed ${label.toLowerCase()} (${show(value)}). Nothing changed.`);
    }
  };

  const manualEdit = (key: FieldKey, label: string, show: (v: string) => string) => (v: string) => {
    set(key)(v);
    // Only a person's direct edit removes the AI provenance; accepting a proposal sets it in onProposalResolved.
    if (!proposed[key]) {
      setFromAI((f) => ({ ...f, [key]: false }));
      log(`${label} changed to ${show(v)} by you.`);
    }
  };

  const withProvenance = (key: FieldKey, subject: string, text: string) => (
    <span className="value-with-label">
      {text}
      {fromAI[key] && <AILabel subject={subject} model="Opus 5.5" generatedAt={PROPOSED_AT} sources={SOURCES} reviewedBy="you" />}
    </span>
  );

  const pending = Object.keys(proposed).length;

  return (
    <>
      <PageHeader breadcrumb={<Breadcrumb items={[{ label: 'Customers', href: '#/customers' }, { label: customer.company }]} />}>
        <PageHeaderTitle>{customer.company}</PageHeaderTitle>
        <PageHeaderDescription>Billing details for this customer. Changes the assistant proposes only apply once you accept them.</PageHeaderDescription>
      </PageHeader>

      <section className="record" aria-labelledby="details-title">
        <h2 id="details-title" className="section-title">
          Customer details
          {pending > 0 && (
            <AILabel subject="Proposed changes" model="Opus 5.5" generatedAt={PROPOSED_AT} sources={SOURCES}
              confidence="High: the customer's finance team asked for the new billing email in writing" />
          )}
        </h2>
        <PropertyList aria-labelledby="details-title" layout="inline" proposedBy="Assistant">
          <PropertyListItem label="Company name" value={customer.company} />
          <PropertyListItem
            label="Billing email"
            value={customer.billingEmail}
            renderValue={(v) => withProvenance('billingEmail', 'Billing email', v)}
            required
            validate={(v) => (isEmail(v) ? undefined : 'Use an email address like name@company.example.')}
            editor={({ value, onValueChange, ...c }) => (
              <Input {...c} type="email" size="sm" value={value} onChange={(e) => onValueChange(e.target.value)} />
            )}
            onSave={saveField('billingEmail')}
            onValueChange={manualEdit('billingEmail', 'Billing email', (v) => v)}
            proposed={proposed.billingEmail}
            onProposalResolved={resolved('billingEmail', 'Billing email', (v) => v)}
          />
          <PropertyListItem label="Plan" value={customer.plan} renderValue={(v) => <Badge tone="neutral">{v}</Badge>} />
          <PropertyListItem
            label="Account owner"
            value={customer.owner}
            renderValue={(v) => withProvenance('owner', 'Account owner', ownerName(v))}
            commit="on-choose"
            editor={(c) => <Select {...c} items={OWNERS} size="sm" />}
            onSave={saveField('owner')}
            onValueChange={manualEdit('owner', 'Account owner', ownerName)}
            proposed={proposed.owner}
            onProposalResolved={resolved('owner', 'Account owner', ownerName)}
          />
        </PropertyList>
      </section>

      <section className="record" aria-labelledby="activity-title">
        <h2 id="activity-title" className="section-title">Activity</h2>
        {activity.length === 0 ? (
          <p className="muted">No changes yet. The assistant's proposals are waiting for your decision.</p>
        ) : (
          <ol className="activity" aria-live="polite">
            {activity.map((e) => (
              <li key={e.id}>
                <span>{e.text}</span>
                <time className="muted" dateTime={e.at.toISOString()}>
                  {e.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

function App() {
  return (
    <main className="page">
      <CustomerRecord />
      <Toaster />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
  </AltitudeProvider>,
);
