import * as React from 'react';
import {
  Avatar, Badge, Breadcrumb, Button, Input, Link, PageHeader, PageHeaderTitle, PropertyList, PropertyListItem,
  RelativeTime, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Timeline, TimelineItem,
} from 'altitude-design';
import {
  CONTACTS, CURRENT_USER, INITIAL_ACCOUNT, INITIAL_ACTIVITY, STAGES, TEAM, createAccountService,
  type Account, type Activity, type ActivityKind, type Contact,
} from './data';
import { LogActivityDialog, type LoggedActivity } from './LogActivityDialog';

// Lucide-style line icons (24px grid, 1.75 stroke), in currentColor.
const ICON_PATHS: Record<ActivityKind, string> = {
  call: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
  email: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 7l9 6 9-6',
  meeting: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  note: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  stage: 'M5 12h14M13 6l6 6-6 6',
  invoice: 'M4 3h16v18l-3-2-3 2-2-2-2 2-3-2-3 2zM8 8h8M8 12h8M8 16h4',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z',
};
const ActivityIcon = ({ kind }: { kind: ActivityKind }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICON_PATHS[kind]} />
  </svg>
);

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const longDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const stageOf = (s: string) => STAGES.find((x) => x.value === s)!;

const FIELD_LABELS: Record<keyof Account, string> = {
  name: 'Account name', legalName: 'Legal name', stage: 'Stage', owner: 'Account owner', industry: 'Industry', plan: 'Plan',
  annualValue: 'Annual contract value', renewalDate: 'Renewal date', website: 'Website', address: 'Head office', customerSince: 'Customer since',
};
const display = (key: keyof Account, value: unknown) =>
  key === 'stage' ? stageOf(value as string).label
    : key === 'annualValue' ? money.format(value as number)
      : key === 'renewalDate' ? longDate(value as string)
        : String(value || 'nothing');

export function AccountPage() {
  const service = React.useRef(createAccountService(INITIAL_ACCOUNT));
  const revision = React.useRef(service.current.revision);
  const [account, setAccount] = React.useState(INITIAL_ACCOUNT);
  const [contacts, setContacts] = React.useState(CONTACTS);
  const [activity, setActivity] = React.useState<Activity[]>(INITIAL_ACTIVITY);
  const [logging, setLogging] = React.useState(false);

  // One write per property. The canonical value comes back from the service; the change joins the history.
  const save = <K extends keyof Account>(key: K) => async (draft: Account[K], { previousValue }: { previousValue: Account[K] }) => {
    const value = (typeof draft === 'string' ? draft.trim() : draft) as Account[K];
    const result = await service.current.patch(key, value, revision.current);
    if (!result.ok) return result;
    revision.current = result.revision;
    setActivity((xs) => [{
      id: `edit-${Date.now()}`, kind: key === 'stage' ? 'stage' : 'edit', at: new Date(), actor: CURRENT_USER,
      text: key === 'stage'
        ? `moved the stage from ${display(key, previousValue)} to ${display(key, result.value)}`
        : `changed the ${FIELD_LABELS[key].toLowerCase()} from ${display(key, previousValue)} to ${display(key, result.value)}`,
    }, ...xs]);
    return { ok: true as const, value: result.value };
  };
  const set = <K extends keyof Account>(key: K) => (value: Account[K]) => setAccount((a) => ({ ...a, [key]: value }));
  const text = (key: 'legalName' | 'industry' | 'plan' | 'website' | 'address', required = true) => (
    <PropertyListItem label={FIELD_LABELS[key]} value={account[key]} required={required} onSave={save(key)} onValueChange={set(key)}
      validate={(v: string) => (required && !v.trim() ? `Enter the ${FIELD_LABELS[key].toLowerCase()}.` : undefined)} />
  );

  const persistActivity = (entry: Activity) => {
    setActivity((xs) => xs.map((x) => (x.id === entry.id ? { ...x, status: 'pending' } : x)));
    service.current.logActivity(entry).then(
      (saved) => {
        setActivity((xs) => xs.map((x) => (x.id === saved.id ? saved : x)));
        const contactId = (entry as Activity & { contactId?: string }).contactId;
        if (contactId && entry.kind !== 'note') setContacts((cs) => cs.map((c) => (c.id === contactId ? { ...c, lastContacted: saved.at } : c)));
      },
      () => setActivity((xs) => xs.map((x) => (x.id === entry.id ? { ...x, status: 'failed' } : x))),
    );
  };
  const log = ({ kind, contactId, summary }: LoggedActivity) => {
    const who = contacts.find((c) => c.id === contactId)?.name;
    const sentence = {
      call: who ? `logged a call with ${who}` : 'logged a call',
      meeting: who ? `logged a meeting with ${who}` : 'logged a meeting',
      email: who ? `logged an email with ${who}` : 'logged an email',
      note: who ? `added a note about ${who}` : 'added a note',
    }[kind];
    const entry = { id: `log-${Date.now()}`, kind, at: new Date(), actor: CURRENT_USER, text: sentence, detail: summary, status: 'pending' as const, contactId };
    setActivity((xs) => [entry, ...xs]);
    persistActivity(entry);
  };

  return (
    <main className="account">
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: 'Accounts', href: '#/accounts' }, { label: account.name }]} />}
        primary={<Button variant="primary" onClick={() => setLogging(true)}>Log activity</Button>}>
        <PageHeaderTitle>{account.name}</PageHeaderTitle>
      </PageHeader>

      <div className="account-body">
        <div className="account-record">
          <section aria-labelledby="details-heading">
            <div className="section-head">
              <h2 id="details-heading">Details</h2>
              <p className="caption">Select a value to change it. Each change saves on its own.</p>
            </div>
            <PropertyList aria-labelledby="details-heading" layout="inline">
              <PropertyListItem label={FIELD_LABELS.stage} value={account.stage} commit="on-choose" onSave={save('stage')} onValueChange={set('stage')}
                renderValue={(s) => <Badge tone={stageOf(s).tone} lamp>{stageOf(s).label}</Badge>}
                editor={(c) => <Select {...c} onValueChange={(v) => c.onValueChange(v as Account['stage'])} items={STAGES} size="sm" />} />
              <PropertyListItem label={FIELD_LABELS.owner} value={account.owner} commit="on-choose" onSave={save('owner')} onValueChange={set('owner')}
                editor={(c) => <Select {...c} items={TEAM} size="sm" />} />
              <PropertyListItem label={FIELD_LABELS.annualValue} value={account.annualValue} onSave={save('annualValue')} onValueChange={set('annualValue')} required
                renderValue={(n) => money.format(n)}
                validate={(n) => (Number.isFinite(n) && n >= 0 ? undefined : 'Enter an amount in pounds, 0 or more.')}
                editor={({ value, onValueChange, ...c }) => <Input {...c} type="number" min={0} step={100} inputMode="numeric" size="sm" value={Number.isFinite(value) ? value : ''}
                  onChange={(e) => onValueChange(e.target.value === '' ? Number.NaN : Number(e.target.value))} />} />
              <PropertyListItem label={FIELD_LABELS.renewalDate} value={account.renewalDate} onSave={save('renewalDate')} onValueChange={set('renewalDate')} required
                renderValue={longDate} validate={(d) => (d ? undefined : 'Choose the renewal date.')}
                editor={({ value, onValueChange, ...c }) => <Input {...c} type="date" size="sm" value={value} onChange={(e) => onValueChange(e.target.value)} />} />
              {text('plan')}
              {text('legalName')}
              {text('industry')}
              {text('website', false)}
              {text('address')}
              <PropertyListItem label={FIELD_LABELS.customerSince} value={longDate(account.customerSince)} />
            </PropertyList>
          </section>

          <section aria-labelledby="contacts-heading">
            <div className="section-head">
              <h2 id="contacts-heading">Contacts</h2>
              <p className="caption">{contacts.length} people, most recently contacted first</p>
            </div>
            <div className="table-scroll">
              <ContactsTable contacts={contacts} />
            </div>
          </section>
        </div>

        <section className="account-activity" aria-labelledby="activity-heading">
          <div className="section-head">
            <h2 id="activity-heading">Recent activity</h2>
          </div>
          <Timeline aria-label="Recent activity on this account">
            {activity.map((e) => (
              <TimelineItem key={e.id} time={e.at} icon={<ActivityIcon kind={e.kind} />} status={e.status}
                onRetry={() => persistActivity(e)} detail={e.detail && <p className="detail">{e.detail}</p>}>
                <strong>{e.actor === CURRENT_USER ? 'You' : e.actor}</strong> {e.text}
              </TimelineItem>
            ))}
          </Timeline>
        </section>
      </div>

      <LogActivityDialog open={logging} onOpenChange={setLogging} contacts={contacts} onLog={log} />
    </main>
  );
}

function ContactsTable({ contacts }: { contacts: Contact[] }) {
  const sorted = [...contacts].sort((a, b) => b.lastContacted.getTime() - a.lastContacted.getTime());
  return (
    <Table aria-labelledby="contacts-heading">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role in the deal</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Last contacted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((c) => (
          <TableRow key={c.id} rowId={c.id}>
            <TableCell>
              <div className="person">
                <Avatar name={c.name} size={32} />
                <div>
                  <div className="person-name">{c.name}</div>
                  <div className="caption">{c.title}</div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="role">
                {c.role}
                {c.primary && <Badge tone="accent" variant="outline">Primary contact</Badge>}
              </div>
            </TableCell>
            <TableCell><Link href={`mailto:${c.email}`}>{c.email}</Link></TableCell>
            <TableCell><Link href={`tel:${c.phone.replace(/\s/g, '')}`} className="nowrap">{c.phone}</Link></TableCell>
            <TableCell><RelativeTime date={c.lastContacted} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
