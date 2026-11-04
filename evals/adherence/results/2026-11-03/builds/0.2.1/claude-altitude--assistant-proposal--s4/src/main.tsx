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
  useDepth,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';

type FieldKey = 'company' | 'email' | 'plan' | 'owner';
type CustomerRecord = Record<FieldKey, string>;

type Proposal = {
  id: string;
  field: FieldKey;
  value: string;
  reason: string;
  state: 'open' | 'saving' | 'failed';
};

const LABELS: Record<FieldKey, string> = {
  company: 'Company name',
  email: 'Billing email',
  plan: 'Plan',
  owner: 'Account owner',
};

const FIELD_ORDER: FieldKey[] = ['company', 'email', 'plan', 'owner'];

const INITIAL_RECORD: CustomerRecord = {
  company: 'Northwind Logistics Ltd.',
  email: 'ap@northwind-logistics.com',
  plan: 'Growth (annual)',
  owner: 'Dana Whitfield',
};

const INITIAL_PROPOSALS: Proposal[] = [
  {
    id: 'p-email',
    field: 'email',
    value: 'billing@northwind-logistics.com',
    reason: 'The last three invoices to ap@ bounced; their finance lead signed a reply from billing@.',
    state: 'open',
  },
  {
    id: 'p-owner',
    field: 'owner',
    value: 'Marcus Okafor',
    reason: 'Dana moved to the Enterprise team on Oct 28; Marcus took over her mid-market book.',
    state: 'open',
  },
];

/** Stand-in for a network write. Resolves after a short delay; there is no backend. */
function simulateSave(_field: FieldKey, _value: string): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 900));
}

function App() {
  const [record, setRecord] = React.useState<CustomerRecord>(INITIAL_RECORD);
  const [proposals, setProposals] = React.useState<Proposal[]>(INITIAL_PROPOSALS);
  // Bumped per field when its saved value changes, so that row settles once.
  const [settled, setSettled] = React.useState<Partial<Record<FieldKey, number>>>({});

  const update = (id: string, patch: Partial<Proposal>) =>
    setProposals((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const accept = async (p: Proposal) => {
    update(p.id, { state: 'saving' });
    try {
      await simulateSave(p.field, p.value);
    } catch {
      update(p.id, { state: 'failed' });
      toast({ title: `Couldn't save ${LABELS[p.field].toLowerCase()}`, tone: 'critical' });
      return;
    }
    // Only now, after the save succeeded, does the record change.
    setRecord((r) => ({ ...r, [p.field]: p.value }));
    setProposals((ps) => ps.filter((x) => x.id !== p.id));
    setSettled((s) => ({ ...s, [p.field]: (s[p.field] ?? 0) + 1 }));
    toast({ title: `${LABELS[p.field]} updated`, description: p.value, tone: 'positive' });
  };

  const reject = (p: Proposal) => {
    setProposals((ps) => ps.filter((x) => x.id !== p.id));
    toast({
      title: `Proposal rejected`,
      description: `${LABELS[p.field]} stays as it was.`,
      action: {
        label: 'Undo',
        onClick: () =>
          setProposals((ps) =>
            ps.some((x) => x.id === p.id) ? ps : [...ps, { ...p, state: 'open' }],
          ),
      },
    });
  };

  const open = proposals.filter((p) => p.state !== 'saving').length;

  return (
    <main className="page">
      <header className="page-head">
        <p className="eyebrow">Customers / CUS-20418</p>
        <h1>{record.company}</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Customer record</CardTitle>
          <CardDescription>
            {proposals.length === 0
              ? 'No pending proposals. Everything shown is saved.'
              : `The assistant proposed ${proposals.length} ${proposals.length === 1 ? 'change' : 'changes'}. Nothing changes until you accept.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="record">
            {FIELD_ORDER.map((field) => (
              <FieldRow
                key={field}
                field={field}
                value={record[field]}
                proposal={proposals.find((p) => p.field === field)}
                settle={settled[field]}
                onAccept={accept}
                onReject={reject}
              />
            ))}
          </dl>
        </CardContent>
      </Card>

      <p className="sr-only" aria-live="polite">
        {open === 0 ? 'No proposals awaiting review.' : `${open} ${open === 1 ? 'proposal' : 'proposals'} awaiting review.`}
      </p>
      <Toaster />
    </main>
  );
}

function FieldRow({
  field,
  value,
  proposal,
  settle,
  onAccept,
  onReject,
}: {
  field: FieldKey;
  value: string;
  proposal?: Proposal;
  settle?: number;
  onAccept: (p: Proposal) => void;
  onReject: (p: Proposal) => void;
}) {
  const depth = useDepth({
    settle,
    status: proposal?.state === 'saving' ? 'pending' : proposal?.state === 'failed' ? 'failed' : undefined,
  });
  const label = LABELS[field];

  return (
    <div className="row" {...depth}>
      <dt className="row-label">{label}</dt>
      <dd className={proposal ? 'row-body has-proposal' : 'row-body'}>
        <div className="current">
          {proposal && <span className="col-tag">Current</span>}
          <Value field={field} value={value} />
        </div>

        {proposal && (
          <Surface level={2} className="proposal" aria-label={`Proposed ${label.toLowerCase()}`} role="group">
            <span className="col-tag col-tag-accent">Proposed by assistant</span>
            <Value field={field} value={proposal.value} />
            <p className="reason">{proposal.reason}</p>
            {proposal.state === 'failed' && (
              <p className="error" role="alert">
                <Icons.AlertCircle size={14} /> The save didn't go through. Try again.
              </p>
            )}
            <div className="actions">
              <Button
                variant="primary"
                size="sm"
                loading={proposal.state === 'saving'}
                leading={proposal.state === 'saving' ? undefined : <Icons.Check size={14} />}
                aria-label={`Accept proposed ${label.toLowerCase()}: ${proposal.value}`}
                onClick={() => onAccept(proposal)}
                disabled={proposal.state === 'saving'}
              >
                {proposal.state === 'saving' ? 'Saving…' : proposal.state === 'failed' ? 'Retry' : 'Accept'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leading={<Icons.X size={14} />}
                aria-label={`Reject proposed ${label.toLowerCase()}`}
                onClick={() => onReject(proposal)}
                disabled={proposal.state === 'saving'}
              >
                Reject
              </Button>
            </div>
          </Surface>
        )}
      </dd>
    </div>
  );
}

function Value({ field, value }: { field: FieldKey; value: string }) {
  if (field === 'owner') {
    return (
      <span className="value value-owner">
        <Avatar name={value} size={24} />
        {value}
      </span>
    );
  }
  if (field === 'plan') {
    return (
      <span className="value">
        <Badge tone="accent">{value}</Badge>
      </span>
    );
  }
  if (field === 'email') return <span className="value mono">{value}</span>;
  return <span className="value">{value}</span>;
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider scheme="daylight">
    <App />
  </AltitudeProvider>,
);
