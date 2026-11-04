import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Icons,
  Surface,
  toast,
} from 'altitude-design';

type FieldKey = 'companyName' | 'billingEmail' | 'plan' | 'accountOwner';
type Customer = Record<FieldKey, string>;

interface Proposal {
  id: string;
  field: FieldKey;
  value: string;
  reason: string;
}

type ProposalState = 'open' | 'saving' | 'failed';

const LABELS: Record<FieldKey, string> = {
  companyName: 'Company name',
  billingEmail: 'Billing email',
  plan: 'Plan',
  accountOwner: 'Account owner',
};

const FIELD_ORDER: FieldKey[] = ['companyName', 'billingEmail', 'plan', 'accountOwner'];

const INITIAL_CUSTOMER: Customer = {
  companyName: 'Northwind Logistics GmbH',
  billingEmail: 'accounts@northwind-logistics.de',
  plan: 'Growth (annual)',
  accountOwner: 'Priya Raman',
};

const INITIAL_PROPOSALS: Proposal[] = [
  {
    id: 'p-email',
    field: 'billingEmail',
    value: 'ap@northwind-logistics.de',
    reason: 'The last 3 invoices bounced from the current address. A reply from their finance team asked us to use this one.',
  },
  {
    id: 'p-owner',
    field: 'accountOwner',
    value: 'Marcus Feld',
    reason: 'Priya moved to the Enterprise team on 28 Oct. Marcus now covers DACH Growth accounts.',
  },
];

/** Stand-in for a PATCH request. There is no backend, so this just waits. */
function saveField(field: FieldKey, value: string): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 900));
}

export function CustomerRecord() {
  const [customer, setCustomer] = React.useState<Customer>(INITIAL_CUSTOMER);
  const [proposals, setProposals] = React.useState<Proposal[]>(INITIAL_PROPOSALS);
  const [states, setStates] = React.useState<Record<string, ProposalState>>({});
  // Bumped when a field's saved value changes, so that field settles visibly.
  const [settled, setSettled] = React.useState<Partial<Record<FieldKey, number>>>({});

  const setState = (id: string, s: ProposalState) => setStates((prev) => ({ ...prev, [id]: s }));
  const removeProposal = (id: string) => setProposals((prev) => prev.filter((p) => p.id !== id));

  async function accept(p: Proposal) {
    setState(p.id, 'saving');
    try {
      await saveField(p.field, p.value);
    } catch {
      setState(p.id, 'failed');
      toast({ title: `${LABELS[p.field]} not saved`, description: 'Nothing changed. Try again.', tone: 'critical' });
      return;
    }
    const previous = customer[p.field];
    setCustomer((c) => ({ ...c, [p.field]: p.value }));
    setSettled((s) => ({ ...s, [p.field]: (s[p.field] ?? 0) + 1 }));
    removeProposal(p.id);
    toast({
      title: `${LABELS[p.field]} updated`,
      description: `${previous} → ${p.value}`,
      tone: 'positive',
    });
  }

  function reject(p: Proposal) {
    removeProposal(p.id);
    toast({
      title: `Suggestion for ${LABELS[p.field].toLowerCase()} rejected`,
      description: `${LABELS[p.field]} stays ${customer[p.field]}.`,
      action: {
        label: 'Undo',
        onClick: () =>
          setProposals((prev) =>
            prev.some((x) => x.id === p.id)
              ? prev
              : [...prev, p].sort((a, b) => FIELD_ORDER.indexOf(a.field) - FIELD_ORDER.indexOf(b.field)),
          ),
      },
    });
  }

  const openCount = proposals.length;

  return (
    <Card className="record">
      <CardHeader>
        <div className="record-head">
          <div>
            <CardTitle>{customer.companyName}</CardTitle>
            <CardDescription>Customer #C-20481 · Billing record</CardDescription>
          </div>
          {openCount > 0 ? (
            <Badge tone="accent" variant="tinted">
              {openCount === 1 ? '1 suggestion to review' : `${openCount} suggestions to review`}
            </Badge>
          ) : (
            <Badge tone="positive">Up to date</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <dl className="fields">
          {FIELD_ORDER.map((field) => {
            const proposal = proposals.find((p) => p.field === field);
            const state = proposal ? states[proposal.id] ?? 'open' : undefined;
            return (
              <div className="field-row" key={field} data-has-proposal={proposal ? '' : undefined}>
                <dt className="field-label">{LABELS[field]}</dt>
                <dd className="field-current">
                  {proposal && <span className="col-caption">Current</span>}
                  <Surface
                    level={0}
                    className="field-value"
                    settle={settled[field]}
                    status={state === 'saving' ? 'pending' : undefined}
                  >
                    {customer[field]}
                  </Surface>
                </dd>
                {proposal && (
                  <ProposalCard
                    proposal={proposal}
                    current={customer[field]}
                    state={state!}
                    onAccept={() => accept(proposal)}
                    onReject={() => reject(proposal)}
                  />
                )}
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}

function ProposalCard({
  proposal,
  current,
  state,
  onAccept,
  onReject,
}: {
  proposal: Proposal;
  current: string;
  state: ProposalState;
  onAccept: () => void;
  onReject: () => void;
}) {
  const label = LABELS[proposal.field];
  const saving = state === 'saving';
  const headingId = `${proposal.id}-heading`;
  return (
    <dd className="field-proposal">
      <span className="col-caption">Suggested by assistant</span>
      <Surface
        as="section"
        level={2}
        className="proposal"
        aria-labelledby={headingId}
        status={saving ? 'pending' : state === 'failed' ? 'failed' : undefined}
      >
        <h3 id={headingId} className="visually-hidden">
          Suggested {label.toLowerCase()}
        </h3>
        <div className="proposal-value">
          <del className="proposal-old"><span className="visually-hidden">Current: </span>{current}</del>
          <span aria-hidden="true" className="proposal-arrow">→</span>
          <ins className="proposal-new"><span className="visually-hidden">Suggested: </span>{proposal.value}</ins>
        </div>
        <p className="proposal-reason">{proposal.reason}</p>
        <div className="proposal-actions">
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            leading={saving ? undefined : <Icons.Check size={14} />}
            onClick={onAccept}
            aria-label={`Accept suggested ${label.toLowerCase()} ${proposal.value}`}
          >
            {saving ? 'Saving…' : state === 'failed' ? 'Retry' : 'Accept'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={saving}
            leading={<Icons.X size={14} />}
            onClick={onReject}
            aria-label={`Reject suggested ${label.toLowerCase()} ${proposal.value}`}
          >
            Reject
          </Button>
        </div>
      </Surface>
    </dd>
  );
}
