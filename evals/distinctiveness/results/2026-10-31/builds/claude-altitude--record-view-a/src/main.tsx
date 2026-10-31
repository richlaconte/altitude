// Account page (see README.md, "Design record").
//   Task: an account executive opens an account to get up to speed before a call, and corrects details that changed.
//   Lead: the account's details. Primary action: Edit details. Next: back to the call, with the change in the activity.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import * as A from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import {
  Account, Activity, contacts, INDUSTRIES, initialAccount, initialActivity, OWNERS, saveAccount, STAGES,
} from './data';

const LOCALE = 'en-US';
const money = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const count = new Intl.NumberFormat(LOCALE);
const day = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'long' });

const LABELS: Record<keyof Account, string> = {
  name: 'Account name', stage: 'Stage', owner: 'Account owner', industry: 'Industry', employees: 'Employees',
  annualValue: 'Annual contract value', website: 'Website', phone: 'Main phone', address: 'Billing address',
  renewalDate: 'Renewal date', about: 'About',
};
const FIELD_ORDER = Object.keys(LABELS) as (keyof Account)[];
const fieldId = (k: keyof Account) => `account-${k}`;

const stageLabel = (s: Account['stage']) => STAGES.find((x) => x.value === s)?.label ?? s;
const stageTone = (s: Account['stage']) =>
  s === 'customer' ? 'positive' : s === 'churned' ? 'critical' : s === 'negotiation' ? 'caution' : 'neutral';
const formatDay = (iso: string) => (iso ? day.format(new Date(`${iso}T12:00:00`)) : '');
const display = (k: keyof Account, v: string) =>
  k === 'stage' ? stageLabel(v as Account['stage'])
    : k === 'annualValue' && v ? money.format(Number(v))
    : k === 'employees' && v ? count.format(Number(v))
    : k === 'renewalDate' ? formatDay(v)
    : v;

function validate(d: Account): Partial<Record<keyof Account, string>> {
  const e: Partial<Record<keyof Account, string>> = {};
  if (!d.name.trim()) e.name = 'Enter the account name.';
  if (d.employees.trim() && !/^\d+$/.test(d.employees.trim())) e.employees = 'Enter the number of employees as a whole number, such as 1240.';
  if (d.annualValue.trim() && !/^\d+$/.test(d.annualValue.trim())) e.annualValue = 'Enter the value in whole US dollars without symbols, such as 186000.';
  if (d.website.trim() && !/^https?:\/\/[^\s.]+\.[^\s]+$/.test(d.website.trim())) e.website = 'Enter a full web address starting with https://.';
  return e;
}

const I = ({ d }: { d: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const ICONS: Record<Activity['kind'], string> = {
  call: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
  email: 'M4 4h16v16H4zM22 6l-10 7L2 6',
  meeting: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  note: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8',
  deal: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
};

function AccountPage() {
  const [account, setAccount] = React.useState(initialAccount);
  const [activity, setActivity] = React.useState(initialActivity);
  const [editing, setEditing] = React.useState(false);
  const [pageStatus, setPageStatus] = React.useState('');
  const editButton = React.useRef<HTMLButtonElement>(null);
  const discardResolver = React.useRef<((discard: boolean) => void) | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const form = A.useEditRecord<Account>({
    initialValue: initialAccount,
    validationMode: 'submit',
    validate,
    save: async (draft, { previousValue }) => {
      const stored = await saveAccount(draft);
      const changed = FIELD_ORDER.filter((k) => stored[k] !== previousValue[k]);
      if (changed.length) {
        const pick = (r: Account) => Object.fromEntries(changed.map((k) => [LABELS[k], display(k, r[k]) || 'Not set']));
        setActivity((list) => [{
          id: `edit-${Date.now()}`, time: new Date().toISOString(), kind: 'edit',
          text: changed.length === 1 ? `You changed the ${LABELS[changed[0]].toLowerCase()}` : `You changed ${changed.length} account details`,
          before: pick(previousValue), after: pick(stored),
        }, ...list]);
      }
      return { ok: true, value: stored };
    },
    messages: { saving: 'Saving account details…', saved: 'Account details saved.', failed: 'The account details couldn’t be saved. Your changes are still here; try again.' },
  });

  const closeEditor = () => {
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  };
  const openEditor = () => { form.reset(account); setPageStatus(''); setEditing(true); };
  const confirmDiscard = () => new Promise<boolean>((resolve) => { discardResolver.current = resolve; setConfirmOpen(true); });
  const answerDiscard = (discard: boolean) => { setConfirmOpen(false); discardResolver.current?.(discard); discardResolver.current = null; };
  const cancel = async () => {
    if (await form.requestLeave('cancel', confirmDiscard)) { form.reset(account); closeEditor(); }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await form.submit();
    if (result?.ok) {
      setAccount(result.value);
      setPageStatus('Account details saved.');
      closeEditor();
    }
  };

  // Leaving the page with unsaved edits: the browser decides the wording.
  React.useEffect(() => {
    if (!editing || !form.dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [editing, form.dirty]);

  const pending = form.phase === 'submitting';
  const errorList = FIELD_ORDER.filter((k) => form.errors[k]).map((k) => ({ id: fieldId(k), label: LABELS[k], message: form.errors[k]! }));
  const text = (k: keyof Account, props: Partial<React.ComponentProps<typeof A.Input>> = {}) => (
    <A.Field label={LABELS[k]} error={form.errors[k]} required={k === 'name'}>
      <A.Input id={fieldId(k)} value={form.draft[k]} readOnly={pending}
        onChange={(e) => form.setField(k, e.target.value)} {...props} />
    </A.Field>
  );
  const choice = (k: 'stage' | 'owner' | 'industry', items: { value: string; label: string }[]) => (
    <A.Field label={LABELS[k]} error={form.errors[k]}>
      <A.Select id={fieldId(k)} items={items} value={form.draft[k]} disabled={pending}
        onValueChange={(v) => form.setField(k, v as Account[typeof k])} />
    </A.Field>
  );

  const primary = contacts.find((c) => c.primary);

  return (
    <main className="acct">
      <A.PageHeader
        breadcrumb={<A.Breadcrumb items={[{ label: 'Accounts', href: '#/accounts' }, { label: account.name }]} />}
        primary={<A.Button ref={editButton} variant="primary" onClick={openEditor}>Edit details</A.Button>}>
        <A.PageHeaderTitle>{account.name}</A.PageHeaderTitle>
        <A.PageHeaderDescription>
          <A.Badge tone={stageTone(account.stage)}>{stageLabel(account.stage)}</A.Badge>{' '}
          {account.industry} · owned by {account.owner}
          {account.renewalDate && <> · renews {formatDay(account.renewalDate)}</>}
        </A.PageHeaderDescription>
      </A.PageHeader>
      <A.WorkflowStatus className="acct-status">{pageStatus}</A.WorkflowStatus>

      <div className="acct-body">
        <section className="acct-details" aria-labelledby="details-h">
          <h2 id="details-h" className="acct-h">Details</h2>
          <p className="acct-about">{account.about || 'No description yet.'}</p>
          <A.PropertyList layout="inline" aria-labelledby="details-h">
            <A.PropertyListItem label={LABELS.annualValue} value={account.annualValue} renderValue={(v) => (v ? money.format(Number(v)) : '')} />
            <A.PropertyListItem label={LABELS.renewalDate} value={account.renewalDate} renderValue={formatDay} />
            <A.PropertyListItem label={LABELS.employees} value={account.employees} renderValue={(v) => (v ? count.format(Number(v)) : '')} />
            <A.PropertyListItem label={LABELS.website} value={account.website}
              renderValue={(v) => (v ? <A.Link href={v} target="_blank" rel="noreferrer">{v.replace(/^https?:\/\//, '')}</A.Link> : '')} />
            <A.PropertyListItem label={LABELS.phone} value={account.phone}
              renderValue={(v) => (v ? <A.Link href={`tel:${v.replace(/[^\d+]/g, '')}`}>{v}</A.Link> : '')} />
            <A.PropertyListItem label={LABELS.address} value={account.address} />
          </A.PropertyList>
        </section>

        <section className="acct-activity" aria-labelledby="activity-h">
          <h2 id="activity-h" className="acct-h">Recent activity</h2>
          <A.Timeline aria-label={`Activity on ${account.name}`} locale={LOCALE}>
            {activity.map((a) => (
              <A.TimelineItem key={a.id} time={a.time} locale={LOCALE} icon={<I d={ICONS[a.kind]} />}
                detail={a.before && a.after
                  ? <A.DiffView mode="properties" before={a.before} after={a.after} />
                  : a.detail ? <p className="acct-detail">{a.detail}</p> : undefined}>
                {a.text}
              </A.TimelineItem>
            ))}
          </A.Timeline>
        </section>

        <aside className="acct-contacts" aria-labelledby="contacts-h">
          <h2 id="contacts-h" className="acct-h">Contacts <span className="acct-count">{contacts.length}</span></h2>
          <ul className="acct-people">
            {contacts.map((c) => (
              <li key={c.id} className="acct-person">
                <A.Avatar name={c.name} size={32} />
                <div className="acct-person-text">
                  <p className="acct-person-name">{c.name}{c.primary && <> <A.Badge variant="outline">Primary</A.Badge></>}</p>
                  <p className="acct-muted">{c.title}</p>
                  <A.Link href={`mailto:${c.email}`} className="acct-email">{c.email}</A.Link>
                  <A.Link href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</A.Link>
                </div>
              </li>
            ))}
          </ul>
          {primary && <p className="acct-muted">{primary.name} is the main point of contact for renewals.</p>}
        </aside>
      </div>

      <A.Sheet open={editing} size="lg" dismissible={!pending}
        onOpenChange={(open) => { if (!open) void cancel(); }}>
        <form className="acct-form" aria-labelledby="edit-h" noValidate onSubmit={submit}>
          <A.SheetHeader>
            <A.SheetTitle id="edit-h">Edit account details</A.SheetTitle>
            <A.SheetDescription>Changes are saved to {account.name} and recorded in its activity.</A.SheetDescription>
          </A.SheetHeader>
          <div className="acct-form-body">
            <A.ErrorSummary focusKey={form.submitCount} errors={errorList} />
            {form.error && <A.Alert tone="critical">{form.error}</A.Alert>}
            {text('name')}
            <div className="acct-form-row">
              {choice('stage', STAGES)}
              {choice('owner', OWNERS)}
            </div>
            <div className="acct-form-row">
              {choice('industry', INDUSTRIES)}
              {text('employees', { inputMode: 'numeric' })}
            </div>
            <div className="acct-form-row">
              {text('annualValue', { inputMode: 'numeric', leading: '$' })}
              {text('renewalDate', { type: 'date' })}
            </div>
            {text('website', { type: 'url', placeholder: 'https://' })}
            {text('phone', { type: 'tel' })}
            {text('address')}
            <A.Field label={LABELS.about} error={form.errors.about}>
              <A.Textarea id={fieldId('about')} rows={4} maxLength={600} value={form.draft.about} readOnly={pending}
                onChange={(e) => form.setField('about', e.target.value)} />
            </A.Field>
            <A.WorkflowStatus>{form.phase === 'saved' ? '' : form.status}</A.WorkflowStatus>
          </div>
          <A.SheetFooter>
            <A.Button type="button" variant="ghost" disabled={pending} onClick={() => void cancel()}>Cancel</A.Button>
            <A.Button type="submit" variant="primary" loading={pending}>Save details</A.Button>
          </A.SheetFooter>
        </form>
      </A.Sheet>

      <A.Dialog open={confirmOpen} size="sm" dismissible={false} initialFocus="title"
        title="Discard your changes?" description="Your edits to the account details haven’t been saved."
        footer={<>
          <A.Button variant="secondary" onClick={() => answerDiscard(false)}>Keep editing</A.Button>
          <A.Button variant="danger" onClick={() => answerDiscard(true)}>Discard changes</A.Button>
        </>} />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<A.AltitudeProvider><AccountPage /></A.AltitudeProvider>);
