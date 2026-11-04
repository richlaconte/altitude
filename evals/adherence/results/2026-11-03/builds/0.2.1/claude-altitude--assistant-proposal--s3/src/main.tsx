import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Icons,
  Surface,
  Toaster,
  toast,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './styles.css';

type FieldKey = 'company' | 'billingEmail' | 'plan' | 'accountOwner';

type Customer = Record<FieldKey, string>;

type Proposal = {
  id: string;
  field: FieldKey;
  value: string;
  reason: string;
};

type SaveStatus = 'pending' | 'committed' | 'failed';

const FIELD_LABELS: Record<FieldKey, string> = {
  company: 'Company name',
  billingEmail: 'Billing email',
  plan: 'Plan',
  accountOwner: 'Account owner',
};

const FIELD_ORDER: FieldKey[] = ['company', 'billingEmail', 'plan', 'accountOwner'];

const INITIAL_CUSTOMER: Customer = {
  company: 'Northwind Logistics GmbH',
  billingEmail: 'accounts@northwind-logistics.de',
  plan: 'Growth (annual)',
  accountOwner: 'Priya Raman',
};

const INITIAL_PROPOSALS: Proposal[] = [
  {
    id: 'p-email',
    field: 'billingEmail',
    value: 'ap@northwind-logistics.de',
    reason:
      'The last three invoices to accounts@ bounced. A reply from Northwind on 28 Oct asked for invoices to go to ap@.',
  },
  {
    id: 'p-owner',
    field: 'accountOwner',
    value: 'Marcus Oyelaran',
    reason:
      'Priya Raman moved to the Enterprise team on 1 Nov. Marcus Oyelaran now covers the DACH Growth accounts.',
  },
];

/** Stands in for the API: waits a moment, then resolves. */
function simulateSave(field: FieldKey, value: string): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 900 + Math.random() * 400);
  });
}

function App() {
  const [customer, setCustomer] = React.useState<Customer>(INITIAL_CUSTOMER);
  const [proposals, setProposals] = React.useState<Proposal[]>(INITIAL_PROPOSALS);
  const [saving, setSaving] = React.useState<Partial<Record<FieldKey, SaveStatus>>>({});
  const [settled, setSettled] = React.useState<Partial<Record<FieldKey, number>>>({});

  const proposalFor = (field: FieldKey) => proposals.find((p) => p.field === field);

  async function accept(p: Proposal) {
    const previous = customer[p.field];
    setSaving((s) => ({ ...s, [p.field]: 'pending' }));
    try {
      await simulateSave(p.field, p.value);
      setCustomer((c) => ({ ...c, [p.field]: p.value }));
      setProposals((ps) => ps.filter((x) => x.id !== p.id));
      setSaving((s) => ({ ...s, [p.field]: 'committed' }));
      setSettled((s) => ({ ...s, [p.field]: (s[p.field] ?? 0) + 1 }));
      toast({
        tone: 'positive',
        title: `${FIELD_LABELS[p.field]} updated`,
        description: `${previous} → ${p.value}`,
      });
    } catch {
      setSaving((s) => ({ ...s, [p.field]: 'failed' }));
      toast({ tone: 'critical', title: `Couldn't save ${FIELD_LABELS[p.field].toLowerCase()}`, description: 'Nothing was changed. Try again.' });
    }
  }

  function reject(p: Proposal) {
    setProposals((ps) => ps.filter((x) => x.id !== p.id));
    toast({
      title: 'Proposal rejected',
      description: `${FIELD_LABELS[p.field]} stays ${customer[p.field]}.`,
    });
  }

  const openCount = proposals.length;

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Customers / CUS-20418</p>
        <h1>{customer.company}</h1>
      </header>

      <Card className="record">
        <CardHeader>
          <div className="record-head">
            <div>
              <CardTitle>Customer record</CardTitle>
              <CardDescription>
                {openCount > 0
                  ? 'The assistant has proposed changes. Nothing on the record changes until you accept a proposal.'
                  : 'No proposals waiting. The record is up to date.'}
              </CardDescription>
            </div>
            {openCount > 0 ? (
              <Badge tone="accent" variant="count" aria-label={`${openCount} proposals to review`}>
                {String(openCount)}
              </Badge>
            ) : (
              <Badge tone="positive">Reviewed</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <dl className="fields">
            {FIELD_ORDER.map((field) => (
              <FieldRow
                key={field}
                field={field}
                value={customer[field]}
                proposal={proposalFor(field)}
                status={saving[field]}
                settle={settled[field]}
                onAccept={accept}
                onReject={reject}
              />
            ))}
          </dl>
        </CardContent>
      </Card>

      <p className="footnote">Saving is simulated in this demo. There is no backend.</p>
      <Toaster />
    </main>
  );
}

function FieldRow({
  field,
  value,
  proposal,
  status,
  settle,
  onAccept,
  onReject,
}: {
  field: FieldKey;
  value: string;
  proposal?: Proposal;
  status?: SaveStatus;
  settle?: number;
  onAccept: (p: Proposal) => void;
  onReject: (p: Proposal) => void;
}) {
  const label = FIELD_LABELS[field];
  const isSaving = status === 'pending';
  const labelId = `label-${field}`;

  return (
    <div className={proposal ? 'field-row has-proposal' : 'field-row'}>
      <dt id={labelId} className="field-label">
        {label}
      </dt>
      <dd className="field-body">
        <div className="current">
          {proposal && <span className="column-label">Current</span>}
          <Surface level={0} className="current-value" status={status === 'committed' ? 'committed' : undefined} settle={settle}>
            <FieldValue field={field} value={value} />
          </Surface>
        </div>

        {proposal && (
          <section className="proposal" aria-labelledby={`${labelId} proposal-${field}`}>
            <span className="column-label" id={`proposal-${field}`}>
              Proposed by assistant
            </span>
            <Surface level={1} status={isSaving ? 'pending' : undefined} className="proposal-card">
              <div className="proposal-value">
                <FieldValue field={field} value={proposal.value} />
              </div>
              <p className="proposal-reason">{proposal.reason}</p>
              <div className="proposal-actions">
                <Button
                  variant="primary"
                  size="sm"
                  loading={isSaving}
                  leading={isSaving ? undefined : <Icons.Check size={14} />}
                  onClick={() => onAccept(proposal)}
                  aria-label={`Accept: change ${label.toLowerCase()} to ${proposal.value}`}
                >
                  {isSaving ? 'Saving…' : 'Accept'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isSaving}
                  leading={<Icons.X size={14} />}
                  onClick={() => onReject(proposal)}
                  aria-label={`Reject: keep ${label.toLowerCase()} as ${value}`}
                >
                  Reject
                </Button>
              </div>
            </Surface>
          </section>
        )}
      </dd>
    </div>
  );
}

function FieldValue({ field, value }: { field: FieldKey; value: string }) {
  if (field === 'accountOwner') {
    return (
      <span className="person">
        <Avatar name={value} size={24} />
        {value}
      </span>
    );
  }
  if (field === 'billingEmail') return <span className="mono">{value}</span>;
  return <span>{value}</span>;
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider scheme="daylight">
    <App />
  </AltitudeProvider>,
);
