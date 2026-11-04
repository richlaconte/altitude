import * as React from 'react';
import { Avatar, Badge, Button, Icons, Surface, Switch, toast } from 'altitude-design';
import {
  type Customer,
  type FieldKey,
  type Person,
  type Proposal,
  initialCustomer,
  initialProposals,
  saveField,
} from './data';

type SaveState = { status: 'pending' } | { status: 'failed'; message: string };
type Decision = { kind: 'accepted'; previous: string } | { kind: 'rejected'; proposed: string };

const FIELD_LABEL: Record<FieldKey, string> = {
  billingEmail: 'billing email',
  accountOwner: 'account owner',
};

const describe = (p: Proposal) => (p.field === 'accountOwner' ? p.value.name : p.value);

export function CustomerRecord() {
  const [customer, setCustomer] = React.useState<Customer>(initialCustomer);
  const [proposals, setProposals] = React.useState<Proposal[]>(initialProposals);
  const [saving, setSaving] = React.useState<Partial<Record<FieldKey, SaveState>>>({});
  const [decisions, setDecisions] = React.useState<Partial<Record<FieldKey, Decision>>>({});
  const [settled, setSettled] = React.useState<Partial<Record<FieldKey, number>>>({});
  const [failSaves, setFailSaves] = React.useState(false);

  const proposalFor = (field: FieldKey) => proposals.find((p) => p.field === field);

  async function accept(p: Proposal) {
    setSaving((s) => ({ ...s, [p.field]: { status: 'pending' } }));
    try {
      await saveField(customer.id, p.field, p.value, failSaves);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The change could not be saved.';
      setSaving((s) => ({ ...s, [p.field]: { status: 'failed', message } }));
      return;
    }
    // Each proposal targets its own field and only this flow writes it, so the value at click time is the one replaced.
    const previous = p.field === 'billingEmail' ? customer.billingEmail : customer.accountOwner.name;
    setCustomer((c) =>
      p.field === 'billingEmail' ? { ...c, billingEmail: p.value } : { ...c, accountOwner: p.value },
    );
    setProposals((ps) => ps.filter((x) => x.id !== p.id));
    setSaving((s) => ({ ...s, [p.field]: undefined }));
    setDecisions((d) => ({ ...d, [p.field]: { kind: 'accepted', previous } }));
    setSettled((s) => ({ ...s, [p.field]: (s[p.field] ?? 0) + 1 }));
    toast({ title: `Saved the new ${FIELD_LABEL[p.field]}`, description: describe(p), tone: 'positive' });
  }

  function reject(p: Proposal) {
    setProposals((ps) => ps.filter((x) => x.id !== p.id));
    setSaving((s) => ({ ...s, [p.field]: undefined }));
    setDecisions((d) => ({ ...d, [p.field]: { kind: 'rejected', proposed: describe(p) } }));
    toast({
      title: `Rejected the proposed ${FIELD_LABEL[p.field]}`,
      description: 'The current value stays as it is.',
      action: {
        label: 'Undo',
        onClick: () => {
          setProposals((ps) => (ps.some((x) => x.id === p.id) ? ps : [...ps, p]));
          setDecisions((d) => ({ ...d, [p.field]: undefined }));
        },
      },
    });
  }

  const open = proposals.length;

  return (
    <div className="record">
      <header className="record-head">
        <div>
          <p className="eyebrow">Customer · <span className="mono">{customer.id}</span></p>
          <h1 className="record-title">{customer.companyName}</h1>
        </div>
        {open > 0 ? (
          <Badge tone="caution" variant="tinted">
            {open === 1 ? '1 proposed change to review' : `${open} proposed changes to review`}
          </Badge>
        ) : (
          <Badge tone="positive" variant="tinted">No changes waiting for review</Badge>
        )}
      </header>

      <Surface as="section" level={0} className="record-sheet" aria-labelledby="record-heading">
        <div className="record-sheet-head">
          <h2 id="record-heading" className="section-title">Account details</h2>
          <span className="columns-hint" aria-hidden="true">
            <span>Current value</span>
            <span>Proposed by assistant</span>
          </span>
        </div>

        <dl className="rows">
          <Row label="Company name">
            <span className="value">{customer.companyName}</span>
          </Row>

          <Row
            label="Billing email"
            settle={settled.billingEmail}
            decision={decisions.billingEmail}
            proposal={
              proposalFor('billingEmail') && (
                <ProposalCard
                  proposal={proposalFor('billingEmail')!}
                  save={saving.billingEmail}
                  onAccept={accept}
                  onReject={reject}
                />
              )
            }
          >
            <span className="value mono">{customer.billingEmail}</span>
          </Row>

          <Row label="Plan">
            <span className="value">{customer.plan}</span>
          </Row>

          <Row
            label="Account owner"
            settle={settled.accountOwner}
            decision={decisions.accountOwner}
            proposal={
              proposalFor('accountOwner') && (
                <ProposalCard
                  proposal={proposalFor('accountOwner')!}
                  save={saving.accountOwner}
                  onAccept={accept}
                  onReject={reject}
                />
              )
            }
          >
            <PersonValue person={customer.accountOwner} />
          </Row>
        </dl>
      </Surface>

      <footer className="demo-controls">
        <Switch
          checked={failSaves}
          onCheckedChange={setFailSaves}
          label="Demo: make the next saves fail"
        />
        <p className="hint">Saving is simulated in this preview. There is no backend.</p>
      </footer>
    </div>
  );
}

function Row({
  label,
  children,
  proposal,
  decision,
  settle,
}: {
  label: string;
  children: React.ReactNode;
  proposal?: React.ReactNode;
  decision?: Decision;
  settle?: number;
}) {
  return (
    <div className="row" data-has-proposal={proposal ? '' : undefined}>
      <dt className="row-label">{label}</dt>
      <dd className="row-current">
        <Surface level={0} settle={settle} className="current-cell">
          {children}
        </Surface>
        {decision && !proposal && <DecisionNote decision={decision} />}
      </dd>
      {proposal && <dd className="row-proposal">{proposal}</dd>}
    </div>
  );
}

function DecisionNote({ decision }: { decision: Decision }) {
  return decision.kind === 'accepted' ? (
    <p className="decision">
      <Icons.CircleCheck size={14} aria-hidden="true" /> Assistant proposal accepted. Was {decision.previous}.
    </p>
  ) : (
    <p className="decision">
      <Icons.X size={14} aria-hidden="true" /> Assistant proposal ({decision.proposed}) rejected.
    </p>
  );
}

function PersonValue({ person }: { person: Person }) {
  return (
    <span className="person">
      <Avatar name={person.name} size={28} />
      <span>
        <span className="value">{person.name}</span>
        <span className="sub mono">{person.email}</span>
      </span>
    </span>
  );
}

function ProposalCard({
  proposal,
  save,
  onAccept,
  onReject,
}: {
  proposal: Proposal;
  save?: SaveState;
  onAccept: (p: Proposal) => void;
  onReject: (p: Proposal) => void;
}) {
  const pending = save?.status === 'pending';
  const failed = save?.status === 'failed';
  const label = FIELD_LABEL[proposal.field];
  const headingId = `${proposal.id}-heading`;

  return (
    <Surface
      as="section"
      level={2}
      status={pending ? 'pending' : failed ? 'failed' : undefined}
      className="proposal"
      aria-labelledby={headingId}
    >
      <p id={headingId} className="proposal-kicker">
        <span className="arrow" aria-hidden="true">→</span> Proposed {label}
      </p>

      <div className="proposal-value">
        {proposal.field === 'accountOwner' ? (
          <PersonValue person={proposal.value} />
        ) : (
          <span className="value mono">{proposal.value}</span>
        )}
      </div>

      <p className="proposal-reason">{proposal.reason}</p>

      {failed && (
        <p className="proposal-error" role="alert">
          <Icons.AlertCircle size={14} aria-hidden="true" /> {save.message}
        </p>
      )}

      <div className="proposal-actions">
        <Button
          variant="primary"
          size="sm"
          loading={pending}
          disabled={pending}
          leading={pending ? undefined : <Icons.Check size={14} />}
          onClick={() => onAccept(proposal)}
          aria-label={`${failed ? 'Try again: accept' : 'Accept'} proposed ${label}`}
        >
          {pending ? 'Saving…' : failed ? 'Try again' : 'Accept'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          leading={<Icons.X size={14} />}
          onClick={() => onReject(proposal)}
          aria-label={`Reject proposed ${label}`}
        >
          Reject
        </Button>
      </div>
    </Surface>
  );
}
