import * as React from 'react';
import {
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
  toast,
} from 'altitude-design';
import {
  CustomerRecord,
  Person,
  Proposal,
  ProposalField,
  initialProposals,
  initialRecord,
  saveField,
} from './data';

type Decision = 'open' | 'saving' | 'accepted' | 'rejected';

interface ProposalState {
  proposal: Proposal;
  decision: Decision;
  /** The value the record held when the person decided, for the activity log. */
  previous?: CustomerRecord[ProposalField];
  decidedAt?: Date;
}

const FIELD_LABELS: Record<keyof Omit<CustomerRecord, 'id'>, string> = {
  companyName: 'Company name',
  billingEmail: 'Billing email',
  plan: 'Plan',
  accountOwner: 'Account owner',
};

function describe(field: ProposalField, value: CustomerRecord[ProposalField]): string {
  return field === 'accountOwner' ? (value as Person).name : (value as string);
}

function timeLabel(d: Date) {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function CustomerRecordScreen() {
  const [record, setRecord] = React.useState<CustomerRecord>(initialRecord);
  const [proposals, setProposals] = React.useState<ProposalState[]>(() =>
    initialProposals.map((proposal) => ({ proposal, decision: 'open' })),
  );
  // Bumped per field when its saved value changes, so the record row settles (afterglow).
  const [revisions, setRevisions] = React.useState<Partial<Record<ProposalField, number>>>({});

  const update = (id: string, patch: Partial<ProposalState>) =>
    setProposals((all) => all.map((p) => (p.proposal.id === id ? { ...p, ...patch } : p)));

  const accept = async (ps: ProposalState) => {
    const { proposal } = ps;
    const previous = record[proposal.field];
    update(proposal.id, { decision: 'saving' });
    try {
      const saved = await saveField(record.id, proposal.field, proposal.value);
      setRecord((r) => ({ ...r, [proposal.field]: saved }));
      setRevisions((r) => ({ ...r, [proposal.field]: (r[proposal.field] ?? 0) + 1 }));
      update(proposal.id, { decision: 'accepted', previous, decidedAt: new Date() });
      toast({
        tone: 'positive',
        title: `${FIELD_LABELS[proposal.field]} updated`,
        description: `Now ${describe(proposal.field, saved)}.`,
      });
    } catch {
      update(proposal.id, { decision: 'open' });
      toast({
        tone: 'critical',
        title: `Couldn't save ${FIELD_LABELS[proposal.field].toLowerCase()}`,
        description: 'Nothing was changed. Try again.',
      });
    }
  };

  const reject = (ps: ProposalState) => {
    update(ps.proposal.id, { decision: 'rejected', previous: record[ps.proposal.field], decidedAt: new Date() });
    toast({
      title: 'Proposal rejected',
      description: `${FIELD_LABELS[ps.proposal.field]} stays ${describe(ps.proposal.field, record[ps.proposal.field])}.`,
    });
  };

  const reopen = (ps: ProposalState) =>
    update(ps.proposal.id, { decision: 'open', previous: undefined, decidedAt: undefined });

  const pendingFor = (field: ProposalField) =>
    proposals.find((p) => p.proposal.field === field && (p.decision === 'open' || p.decision === 'saving'));

  const openCount = proposals.filter((p) => p.decision === 'open' || p.decision === 'saving').length;
  const decided = proposals.filter((p) => p.decision === 'accepted' || p.decision === 'rejected');

  return (
    <main className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">Customers / {record.id}</p>
          <h1 className="screen-title">{record.companyName}</h1>
        </div>
        <div className="screen-head-meta">
          <Badge tone="accent" variant="tinted">{record.plan}</Badge>
          {openCount > 0 ? (
            <Badge tone="caution">{openCount === 1 ? '1 proposal to review' : `${openCount} proposals to review`}</Badge>
          ) : (
            <Badge tone="positive">Up to date</Badge>
          )}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Customer record</CardTitle>
          <CardDescription>
            Saved values are shown on the left. The assistant's proposals sit beside them and change nothing until you
            accept them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="record">
            <RecordRow label={FIELD_LABELS.companyName}>
              <span className="value-text">{record.companyName}</span>
            </RecordRow>

            <RecordRow
              label={FIELD_LABELS.billingEmail}
              settle={revisions.billingEmail}
              proposal={pendingFor('billingEmail')}
              renderValue={(v) => <span className="value-text mono">{v as string}</span>}
              current={record.billingEmail}
              onAccept={accept}
              onReject={reject}
            />

            <RecordRow label={FIELD_LABELS.plan}>
              <span className="value-text">{record.plan}</span>
            </RecordRow>

            <RecordRow
              label={FIELD_LABELS.accountOwner}
              settle={revisions.accountOwner}
              proposal={pendingFor('accountOwner')}
              renderValue={(v) => <PersonValue person={v as Person} />}
              current={record.accountOwner}
              onAccept={accept}
              onReject={reject}
            />
          </dl>
        </CardContent>
      </Card>

      {decided.length > 0 && (
        <section className="activity" aria-labelledby="activity-title">
          <h2 id="activity-title" className="section-title">Decisions</h2>
          <ul className="activity-list">
            {decided.map((ps) => {
              const { field, value } = ps.proposal;
              const label = FIELD_LABELS[field];
              return (
                <li key={ps.proposal.id} className="activity-item">
                  <span className={`activity-icon ${ps.decision}`} aria-hidden>
                    {ps.decision === 'accepted' ? <Icons.Check size={14} /> : <Icons.X size={14} />}
                  </span>
                  <span className="activity-text">
                    {ps.decision === 'accepted' ? (
                      <>
                        Accepted <strong>{label}</strong>: {describe(field, ps.previous!)} →{' '}
                        {describe(field, value)}
                      </>
                    ) : (
                      <>
                        Rejected <strong>{label}</strong> change to {describe(field, value)}; kept{' '}
                        {describe(field, ps.previous!)}
                      </>
                    )}
                    <span className="activity-time"> · {timeLabel(ps.decidedAt!)}</span>
                  </span>
                  {ps.decision === 'rejected' && !pendingFor(field) && (
                    <Button size="sm" variant="ghost" onClick={() => reopen(ps)}>
                      Reconsider
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}

interface RecordRowProps {
  label: string;
  children?: React.ReactNode;
  settle?: number;
  current?: CustomerRecord[ProposalField];
  proposal?: ProposalState;
  renderValue?: (v: CustomerRecord[ProposalField]) => React.ReactNode;
  onAccept?: (ps: ProposalState) => void;
  onReject?: (ps: ProposalState) => void;
}

function RecordRow({ label, children, settle, current, proposal, renderValue, onAccept, onReject }: RecordRowProps) {
  const id = React.useId();
  const saving = proposal?.decision === 'saving';
  return (
    <div className={`record-row${proposal ? ' has-proposal' : ''}`}>
      <dt className="record-label" id={`${id}-label`}>{label}</dt>
      <dd className="record-body">
        <Surface level={0} settle={settle} className="record-current">
          {proposal && <span className="tag">Current</span>}
          {children ?? (renderValue && current !== undefined && renderValue(current))}
        </Surface>

        {proposal && renderValue && (
          <Surface
            as="section"
            level={2}
            status={saving ? 'pending' : undefined}
            className="proposal"
            aria-labelledby={`${id}-label ${id}-prop`}
          >
            <div className="proposal-head">
              <span className="tag tag-accent" id={`${id}-prop`}>Proposed by assistant</span>
            </div>
            <div className="proposal-value">{renderValue(proposal.proposal.value)}</div>
            <p className="proposal-reason">{proposal.proposal.reason}</p>
            <div className="proposal-actions">
              <Button
                variant="primary"
                size="sm"
                loading={saving}
                disabled={saving}
                leading={!saving ? <Icons.Check size={14} /> : undefined}
                onClick={() => onAccept?.(proposal)}
              >
                {saving ? 'Saving…' : 'Accept'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={saving}
                leading={<Icons.X size={14} />}
                onClick={() => onReject?.(proposal)}
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

function PersonValue({ person }: { person: Person }) {
  return (
    <span className="person">
      <Avatar name={person.name} size={28} />
      <span className="person-text">
        <span className="value-text">{person.name}</span>
        <span className="person-email mono">{person.email}</span>
      </span>
    </span>
  );
}
