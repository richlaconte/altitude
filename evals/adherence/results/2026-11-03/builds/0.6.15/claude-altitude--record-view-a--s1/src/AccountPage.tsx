import * as React from 'react';
import {
  Avatar, Badge, Breadcrumb, Field, Input, PageHeader, PageHeaderDescription, PageHeaderTitle,
  PropertyList, PropertyListItem, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Timeline,
  TimelineItem,
} from 'altitude-design';
import {
  ACCOUNT_FACTS, CONTACTS, INDUSTRIES, INITIAL_ACCOUNT, INITIAL_ACTIVITY, OWNERS, STAGES, STAGE_TONE,
  createAccountService, labelFor, type Account, type Activity, type ActivityKind, type Stage,
} from './data';

// Lucide icon paths (24px grid, 1.75 stroke), drawn in currentColor.
const ICONS: Record<ActivityKind, string[]> = {
  call: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z'],
  email: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M22 6l-10 7L2 6'],
  meeting: ['M8 2v4', 'M16 2v4', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M3 10h18'],
  note: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8'],
  stage: ['M5 12h14', 'M12 5l7 7-7 7'],
  edit: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z'],
};
const Icon = ({ kind }: { kind: ActivityKind }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICONS[kind].map(d => <path key={d} d={d} />)}
  </svg>
);

const FIELD_NAMES: Record<keyof Account, string> = {
  name: 'account name', stage: 'stage', owner: 'owner', industry: 'industry', website: 'website', phone: 'phone', address: 'billing address',
};
const display = (key: keyof Account, value: string) =>
  key === 'stage' ? labelFor(STAGES, value) : key === 'owner' ? labelFor(OWNERS, value) : value;

function validateAccount(draft: Account) {
  const errors: Partial<Record<keyof Account, string>> = {};
  if (!draft.name.trim()) errors.name = 'Enter the account name.';
  if (draft.website.trim() && /\s/.test(draft.website.trim())) errors.website = 'Enter a web address without spaces, like harrowgate-cold.example.';
  if (draft.phone.trim() && !/^\+?[\d\s()-]{7,}$/.test(draft.phone.trim())) errors.phone = 'Enter a phone number using digits, spaces and an optional +.';
  return Object.keys(errors).length ? errors : undefined;
}

export function AccountPage() {
  const service = React.useRef(createAccountService(INITIAL_ACCOUNT)).current;
  const [account, setAccount] = React.useState<Account>(INITIAL_ACCOUNT);
  const [activity, setActivity] = React.useState<Activity[]>(INITIAL_ACTIVITY);

  // Each confirmed write becomes an entry in the account's activity, written as a sentence.
  const record = (before: Account, after: Account, changed: (keyof Account)[]) => {
    const at = new Date();
    const entries: Activity[] = changed.map((key, i) => key === 'stage'
      ? { id: `local-${at.getTime()}-${i}`, kind: 'stage', at, actor: 'You', text: `moved the account from ${display('stage', before.stage)} to ${display('stage', after.stage)}` }
      : { id: `local-${at.getTime()}-${i}`, kind: 'edit', at, actor: 'You',
          text: after[key] ? `changed the ${FIELD_NAMES[key]} to ${display(key, after[key])}` : `cleared the ${FIELD_NAMES[key]}` });
    setActivity(list => [...entries.reverse(), ...list]);
  };

  // One property saved where it sits.
  const saveField = <K extends keyof Account>(key: K) => async (draft: Account[K]) => {
    const value = (typeof draft === 'string' ? draft.trim() : draft) as Account[K];
    const result = await service.save({ [key]: value } as Partial<Account>, service.revision);
    if (!result.ok) return result;
    record(account, result.value, [key]);
    return { ok: true as const, value: result.value[key] };
  };
  const setField = <K extends keyof Account>(key: K) => (value: Account[K]) => setAccount(a => ({ ...a, [key]: value }));
  const validateField = (key: keyof Account) => (draft: string) => validateAccount({ ...account, [key]: draft })?.[key];

  const owner = labelFor(OWNERS, account.owner);

  return (
    <main className="page">
      <PageHeader breadcrumb={<Breadcrumb items={[{ label: 'Accounts', href: '#/accounts' }, { label: account.name }]} />}>
        <PageHeaderTitle>{account.name}</PageHeaderTitle>
        <PageHeaderDescription>
          {account.industry} account, owned by {owner}. Change any detail by selecting it.
        </PageHeaderDescription>
      </PageHeader>

      <div className="layout">
        <div className="primary-column">
          <section aria-labelledby="details-title" className="section">
            <div className="section-head">
              <h2 id="details-title">Account details</h2>
              <Badge tone={STAGE_TONE[account.stage]}>{labelFor(STAGES, account.stage)}</Badge>
            </div>
            <PropertyList<Account> aria-labelledby="details-title" layout="inline"
              editAll={{
                label: 'account details',
                value: account,
                onValueChange: setAccount,
                validate: validateAccount,
                onSave: async (draft, { previousValue, changed }) => {
                  const patch = Object.fromEntries(changed.map(key => [key, typeof draft[key] === 'string' ? (draft[key] as string).trim() : draft[key]])) as Partial<Account>;
                  const result = await service.save(patch, service.revision);
                  if (!result.ok) return result;
                  record(previousValue, result.value, changed);
                  return { ok: true, value: result.value };
                },
                renderEditor: field => <div className="edit-grid">
                  <Field label="Account name" required error={field.error('name')}><Input {...field('name')} autoComplete="organization" /></Field>
                  <Field label="Stage"><Select {...field.value('stage')} items={STAGES} /></Field>
                  <Field label="Owner"><Select {...field.value('owner')} items={OWNERS} /></Field>
                  <Field label="Industry"><Select {...field.value('industry')} items={INDUSTRIES} /></Field>
                  <Field label="Website" error={field.error('website')}><Input {...field('website')} autoComplete="url" /></Field>
                  <Field label="Phone" error={field.error('phone')}><Input {...field('phone')} type="tel" autoComplete="tel" /></Field>
                  <Field label="Billing address" className="span-2"><Input {...field('address')} autoComplete="street-address" /></Field>
                </div>,
              }}>
              <PropertyListItem label="Account name" value={account.name} required
                onSave={saveField('name')} onValueChange={setField('name')} validate={validateField('name')} />
              <PropertyListItem label="Stage" value={account.stage} commit="on-choose"
                onSave={saveField('stage')} onValueChange={setField('stage')}
                renderValue={(s: Stage) => labelFor(STAGES, s)}
                editor={c => <Select {...c} onValueChange={v => c.onValueChange(v as Stage)} items={STAGES} size="sm" aria-label="Stage" />} />
              <PropertyListItem label="Owner" value={account.owner} commit="on-choose"
                onSave={saveField('owner')} onValueChange={setField('owner')}
                renderValue={o => labelFor(OWNERS, o)}
                editor={c => <Select {...c} items={OWNERS} size="sm" aria-label="Owner" />} />
              <PropertyListItem label="Industry" value={account.industry} commit="on-choose"
                onSave={saveField('industry')} onValueChange={setField('industry')}
                editor={c => <Select {...c} items={INDUSTRIES} size="sm" aria-label="Industry" />} />
              <PropertyListItem label="Website" value={account.website} emptyLabel="Add website"
                onSave={saveField('website')} onValueChange={setField('website')} validate={validateField('website')} />
              <PropertyListItem label="Phone" value={account.phone} emptyLabel="Add phone number"
                onSave={saveField('phone')} onValueChange={setField('phone')} validate={validateField('phone')} />
              <PropertyListItem label="Billing address" value={account.address} emptyLabel="Add billing address"
                onSave={saveField('address')} onValueChange={setField('address')} />
              <PropertyListItem label="Proposed contract" value={ACCOUNT_FACTS.dealValue} />
              <PropertyListItem label="Fleet" value={ACCOUNT_FACTS.sites} />
              <PropertyListItem label="Account ID" value={ACCOUNT_FACTS.id} renderValue={id => <span className="mono">{id}</span>} />
              <PropertyListItem label="Created" value={ACCOUNT_FACTS.created} />
            </PropertyList>
          </section>

          <section aria-labelledby="contacts-title" className="section">
            <div className="section-head">
              <h2 id="contacts-title">Contacts</h2>
              <span className="caption">{CONTACTS.length} people</span>
            </div>
            <div className="table-frame">
              <Table aria-labelledby="contacts-title">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role in deal</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CONTACTS.map(c => (
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
                      <TableCell>{c.role ? <Badge tone="neutral">{c.role}</Badge> : <span className="caption">None recorded</span>}</TableCell>
                      <TableCell><a className="link" href={`mailto:${c.email}`}>{c.email}</a></TableCell>
                      <TableCell><a className="link nowrap" href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>

        <aside className="secondary-column section" aria-labelledby="activity-title">
          <div className="section-head">
            <h2 id="activity-title">Recent activity</h2>
          </div>
          <Timeline aria-label="Recent activity" headingLevel={3}>
            {activity.map(e => (
              <TimelineItem key={e.id} time={e.at} icon={<Icon kind={e.kind} />}
                detail={e.detail ? <p className="detail">{e.detail}</p> : undefined}>
                <strong>{e.actor}</strong> {e.text}
              </TimelineItem>
            ))}
          </Timeline>
        </aside>
      </div>
    </main>
  );
}
