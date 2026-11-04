import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  EmptyState,
  Field,
  Input,
  Select,
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Toaster,
  toast,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './styles.css';
import {
  Account,
  Activity,
  ActivityKind,
  Contact,
  INDUSTRIES,
  OWNERS,
  STAGES,
  contacts as initialContacts,
  initialAccount,
  initialActivity,
} from './data';

const CURRENT_USER = 'Priya Raman';

/* ---------- helpers ---------- */

const initials = (name: string) =>
  name
    .replace(/&/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const shortDateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

const parseDay = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

function when(iso: string) {
  const d = parseDay(iso);
  const days = daysBetween(d, new Date());
  if (days === 0) return `Today, ${timeFmt.format(d)}`;
  if (days === 1) return `Yesterday, ${timeFmt.format(d)}`;
  if (days > 1 && days < 7) return `${days} days ago`;
  return d.getFullYear() === new Date().getFullYear() ? shortDateFmt.format(d) : dateFmt.format(d);
}

function lastTouched(iso: string) {
  const days = daysBetween(parseDay(iso), new Date());
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return dateFmt.format(parseDay(iso));
}

const websiteHref = (w: string) => (/^https?:\/\//i.test(w) ? w : `https://${w}`);
const stageOf = (v: string) => STAGES.find((s) => s.value === v) ?? STAGES[0]!;

/* ---------- icons for activity kinds ---------- */

const svg = (d: React.ReactNode) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const KIND: Record<ActivityKind, { label: string; icon: React.ReactNode }> = {
  call: { label: 'Call', icon: svg(<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />) },
  email: { label: 'Email', icon: svg(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>) },
  meeting: { label: 'Meeting', icon: svg(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>) },
  note: { label: 'Note', icon: svg(<><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>) },
  deal: { label: 'Deal update', icon: svg(<path d="M3 17l6-6 4 4 8-8M15 7h6v6" />) },
};

const pencil = svg(<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />);
const dots = svg(<><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>);

/* ---------- edit sheet ---------- */

type Errors = Partial<Record<keyof Account, string>>;

function validate(a: Account): Errors {
  const e: Errors = {};
  if (!a.name.trim()) e.name = 'Account name is required.';
  if (a.website.trim() && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(a.website.trim()))
    e.website = 'Enter a domain like example.com.';
  if (a.annualValue.trim() && !/^[\d,]+(\.\d{1,2})?$/.test(a.annualValue.trim()))
    e.annualValue = 'Use numbers only, e.g. 184,000.';
  if (a.employees.trim() && !/^[\d,+\- ]+$/.test(a.employees.trim())) e.employees = 'Use a number or range, e.g. 1,200.';
  if (a.phone.trim() && !/^[\d\s()+\-.x]{7,}$/i.test(a.phone.trim())) e.phone = 'Enter a valid phone number.';
  return e;
}

function EditAccountSheet({
  open,
  onOpenChange,
  account,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  account: Account;
  onSave: (a: Account) => void;
}) {
  const [draft, setDraft] = React.useState(account);
  const [submitted, setSubmitted] = React.useState(false);

  // Start from the saved record each time the sheet opens.
  React.useEffect(() => {
    if (open) {
      setDraft(account);
      setSubmitted(false);
    }
  }, [open, account]);

  const errors = submitted ? validate(draft) : {};
  const set = <K extends keyof Account>(k: K) => (v: Account[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const text = (k: keyof Account) => ({
    value: draft[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k)(e.target.value),
  });
  const dirty = JSON.stringify(draft) !== JSON.stringify(account);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate(draft);
    if (Object.keys(errs).length) return;
    onSave({ ...draft, name: draft.name.trim(), website: draft.website.trim() });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} size="lg">
      <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
        <SheetHeader>
          <SheetTitle>Edit account details</SheetTitle>
          <SheetDescription>Changes are visible to everyone on the {account.name} account team.</SheetDescription>
        </SheetHeader>
        <div className="form-grid">
          <Field label="Account name" required error={errors.name} className="span-2">
            <Input {...text('name')} autoComplete="organization" />
          </Field>
          <Field label="Industry">
            <Select value={draft.industry} onValueChange={set('industry')} items={INDUSTRIES.map((i) => ({ value: i, label: i }))} />
          </Field>
          <Field label="Stage">
            <Select
              value={draft.stage}
              onValueChange={(v) => set('stage')(v as Account['stage'])}
              items={STAGES.map((s) => ({ value: s.value, label: s.label }))}
            />
          </Field>
          <Field label="Account owner">
            <Select value={draft.owner} onValueChange={set('owner')} items={OWNERS.map((o) => ({ value: o, label: o }))} />
          </Field>
          <Field label="Renewal date">
            <Input type="date" {...text('renewalDate')} />
          </Field>
          <Field label="Annual contract value" hint="USD" error={errors.annualValue}>
            <Input {...text('annualValue')} inputMode="decimal" leading="$" />
          </Field>
          <Field label="Employees" error={errors.employees}>
            <Input {...text('employees')} inputMode="numeric" />
          </Field>
          <Field label="Website" error={errors.website}>
            <Input {...text('website')} type="url" placeholder="example.com" />
          </Field>
          <Field label="Main phone" error={errors.phone}>
            <Input {...text('phone')} type="tel" autoComplete="tel" />
          </Field>
          <Field label="Headquarters" className="span-2">
            <Textarea {...text('address')} rows={2} />
          </Field>
          <Field label="About" hint="What they do and where the relationship stands." className="span-2">
            <Textarea {...text('description')} rows={5} maxLength={600} />
          </Field>
        </div>
        <SheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!dirty}>
            Save changes
          </Button>
        </SheetFooter>
      </form>
    </Sheet>
  );
}

/* ---------- sections ---------- */

function DetailsCard({ account, settle, onEdit }: { account: Account; settle: number; onEdit: () => void }) {
  return (
    <Card settle={settle || undefined}>
      <CardHeader>
        <div className="card-head-row">
          <CardTitle>Details</CardTitle>
          <Button size="sm" variant="ghost" leading={pencil} onClick={onEdit}>
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="details">
          <div>
            <dt>Industry</dt>
            <dd>{account.industry}</dd>
          </div>
          <div>
            <dt>Website</dt>
            <dd>
              {account.website ? (
                <a href={websiteHref(account.website)} target="_blank" rel="noreferrer">
                  {account.website}
                </a>
              ) : (
                <span className="muted">Not set</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Main phone</dt>
            <dd>{account.phone ? <a href={`tel:${account.phone.replace(/[^\d+]/g, '')}`}>{account.phone}</a> : <span className="muted">Not set</span>}</dd>
          </div>
          <div>
            <dt>Employees</dt>
            <dd>{account.employees || <span className="muted">Not set</span>}</dd>
          </div>
          <div>
            <dt>Headquarters</dt>
            <dd>{account.address || <span className="muted">Not set</span>}</dd>
          </div>
          <div>
            <dt>About</dt>
            <dd>
              <p className="about">{account.description || <span className="muted">No description yet.</span>}</p>
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function Stats({ account, lastActivity }: { account: Account; lastActivity?: Activity }) {
  const renewal = account.renewalDate ? parseDay(account.renewalDate) : null;
  const daysToRenewal = renewal ? daysBetween(new Date(), renewal) : null;
  return (
    <section className="stats" aria-label="Key figures">
      <Card>
        <CardContent>
          <p className="stat-label">Annual contract value</p>
          <p className="stat-value">{account.annualValue ? `$${account.annualValue}` : '—'}</p>
          <p className="stat-sub">Enterprise upgrade in progress</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <p className="stat-label">Renewal</p>
          <p className="stat-value">{renewal ? dateFmt.format(renewal) : '—'}</p>
          <p className="stat-sub">
            {daysToRenewal == null ? 'No date set' : daysToRenewal >= 0 ? `In ${daysToRenewal} days` : `${-daysToRenewal} days overdue`}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <p className="stat-label">Open opportunity</p>
          <p className="stat-value">$184,000</p>
          <p className="stat-sub">Expected close Dec 15</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <p className="stat-label">Last activity</p>
          <p className="stat-value">{lastActivity ? when(lastActivity.at).split(',')[0] : '—'}</p>
          <p className="stat-sub">{lastActivity ? `${KIND[lastActivity.kind].label} by ${lastActivity.who}` : 'Nothing logged'}</p>
        </CardContent>
      </Card>
    </section>
  );
}

function ContactsCard({ contacts, setContacts }: { contacts: Contact[]; setContacts: (c: Contact[]) => void }) {
  const [settled, setSettled] = React.useState<{ id: string; n: number } | null>(null);

  const makePrimary = (c: Contact) => {
    setContacts(contacts.map((x) => ({ ...x, primary: x.id === c.id })));
    setSettled({ id: c.id, n: Date.now() });
    toast({ title: `${c.name} is now the primary contact`, tone: 'positive' });
  };

  const copyEmail = async (c: Contact) => {
    try {
      await navigator.clipboard.writeText(c.email);
      toast(`Copied ${c.email}`);
    } catch {
      toast({ title: 'Couldn’t copy', description: c.email, tone: 'caution' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="card-head-row">
          <div>
            <CardTitle>Contacts</CardTitle>
            <CardDescription>{contacts.length} people at this account</CardDescription>
          </div>
          <AvatarGroup max={4}>
            {contacts.map((c) => (
              <Avatar key={c.id} name={c.name} size={28} />
            ))}
          </AvatarGroup>
        </div>
      </CardHeader>
      <CardContent>
        <Table aria-label="Contacts">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Last contacted</TableHead>
              <TableHead align="end">
                <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                  Actions
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((c) => (
              <TableRow key={c.id} rowId={c.id} settle={settled?.id === c.id ? settled.n : undefined}>
                <TableCell>
                  <div className="person">
                    <Avatar name={c.name} size={32} />
                    <div>
                      <div className="person-name">
                        {c.name}
                        {c.primary && (
                          <Badge tone="accent" variant="tinted">
                            Primary
                          </Badge>
                        )}
                      </div>
                      <div className="person-title">{c.title}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge tone={c.role === 'Decision maker' ? 'accent' : c.role === 'Champion' ? 'positive' : 'neutral'} lamp={false}>
                    {c.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="contact-links">
                    <a href={`mailto:${c.email}`}>{c.email}</a>
                    <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</a>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="muted">{lastTouched(c.lastContacted)}</span>
                </TableCell>
                <TableCell align="end">
                  <DropdownMenu
                    align="end"
                    trigger={
                      <Button variant="ghost" size="sm" square aria-label={`Actions for ${c.name}`}>
                        {dots}
                      </Button>
                    }
                    items={[
                      { label: 'Send email', onSelect: () => (window.location.href = `mailto:${c.email}`) },
                      { label: 'Copy email address', onSelect: () => void copyEmail(c) },
                      { type: 'separator' },
                      { label: 'Make primary contact', onSelect: () => makePrimary(c), disabled: c.primary },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const FILTERS: { value: 'all' | ActivityKind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'call', label: 'Calls' },
  { value: 'email', label: 'Emails' },
  { value: 'meeting', label: 'Meetings' },
  { value: 'note', label: 'Notes' },
];

function ActivityCard({
  activity,
  contacts,
  onLog,
}: {
  activity: Activity[];
  contacts: Contact[];
  onLog: (a: Omit<Activity, 'id' | 'at' | 'who'>) => void;
}) {
  const [filter, setFilter] = React.useState<string>('all');
  const [kind, setKind] = React.useState<ActivityKind>('note');
  const [contact, setContact] = React.useState<string>('none');
  const [body, setBody] = React.useState('');
  const [newest, setNewest] = React.useState<string | null>(null);

  const sorted = React.useMemo(() => [...activity].sort((a, b) => b.at.localeCompare(a.at)), [activity]);
  const prevLen = React.useRef(activity.length);
  React.useEffect(() => {
    if (activity.length > prevLen.current) setNewest(sorted[0]?.id ?? null);
    prevLen.current = activity.length;
  }, [activity.length, sorted]);

  const log = (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    const first = text.split('\n')[0]!;
    onLog({
      kind,
      title: first.length > 70 ? `${first.slice(0, 67)}…` : first,
      body: text.length > first.length || first.length > 70 ? text : undefined,
      contact: contact === 'none' ? undefined : contact,
    });
    setBody('');
    if (filter !== 'all' && filter !== kind) setFilter('all');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Calls, emails, meetings and notes from the account team</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="composer" onSubmit={log}>
          <Textarea
            aria-label="Activity details"
            placeholder="Log a call, email, meeting or note…"
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) log(e);
            }}
          />
          <div className="composer-row">
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <Select
                size="sm"
                aria-label="Activity type"
                value={kind}
                onValueChange={(v) => setKind(v as ActivityKind)}
                items={(['note', 'call', 'email', 'meeting'] as ActivityKind[]).map((k) => ({ value: k, label: KIND[k].label }))}
              />
              <Select
                size="sm"
                aria-label="Related contact"
                value={contact}
                onValueChange={setContact}
                items={[{ value: 'none', label: 'No contact' }, ...contacts.map((c) => ({ value: c.name, label: c.name }))]}
              />
            </div>
            <Button type="submit" size="sm" variant="primary" disabled={!body.trim()}>
              Log activity
            </Button>
          </div>
        </form>

        <Tabs variant="segmented" value={filter} onValueChange={setFilter}>
          <TabsList aria-label="Filter activity">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {FILTERS.map((f) => {
            const items = f.value === 'all' ? sorted : sorted.filter((a) => a.kind === f.value);
            return (
              <TabsContent key={f.value} value={f.value} style={{ paddingTop: 'var(--space-5)' }}>
                {items.length === 0 ? (
                  <EmptyState size="sm" title={`No ${f.label.toLowerCase()} logged yet`} description="Anything logged above will appear here." />
                ) : (
                  <ol className="timeline">
                    {items.map((a) => (
                      <li key={a.id}>
                        <span className="kind-icon" data-kind={a.kind} title={KIND[a.kind].label}>
                          {KIND[a.kind].icon}
                        </span>
                        <div>
                          <div className="act-top">
                            <span className="act-title">
                              {a.title} {a.id === newest && <Badge tone="positive" variant="tinted">Just logged</Badge>}
                            </span>
                            <time className="act-time" dateTime={a.at} title={parseDay(a.at).toLocaleString()}>
                              {when(a.at)}
                            </time>
                          </div>
                          {a.body && <p className="act-body">{a.body}</p>}
                          <div className="act-by">
                            {KIND[a.kind].label} · {a.who}
                            {a.contact && ` with ${a.contact}`}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

/* ---------- page ---------- */

function AccountPage() {
  const [account, setAccount] = React.useState<Account>(initialAccount);
  const [contacts, setContacts] = React.useState<Contact[]>(initialContacts);
  const [activity, setActivity] = React.useState<Activity[]>(initialActivity);
  const [editing, setEditing] = React.useState(false);
  const [saves, setSaves] = React.useState(0);

  const stage = stageOf(account.stage);
  const lastActivity = React.useMemo(() => [...activity].sort((a, b) => b.at.localeCompare(a.at))[0], [activity]);

  const save = (next: Account) => {
    const changes: Activity[] = [];
    if (next.stage !== account.stage)
      changes.push({
        id: `a${Date.now()}`,
        kind: 'deal',
        title: `Stage changed from ${stageOf(account.stage).label} to ${stageOf(next.stage).label}`,
        who: CURRENT_USER,
        at: new Date().toISOString(),
      });
    if (next.owner !== account.owner)
      changes.push({
        id: `a${Date.now() + 1}`,
        kind: 'deal',
        title: `Account owner changed to ${next.owner}`,
        who: CURRENT_USER,
        at: new Date().toISOString(),
      });
    setAccount(next);
    if (changes.length) setActivity((a) => [...a, ...changes]);
    setSaves((n) => n + 1);
    setEditing(false);
    toast({ title: 'Account details saved', tone: 'positive' });
  };

  const logActivity = (a: Omit<Activity, 'id' | 'at' | 'who'>) => {
    setActivity((list) => [...list, { ...a, id: `a${Date.now()}`, at: new Date().toISOString(), who: CURRENT_USER }]);
    toast({ title: `${KIND[a.kind].label} logged`, tone: 'positive' });
  };

  return (
    <main className="page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href="#">Accounts</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{account.name}</span>
      </nav>

      <header className="account-head">
        <div className="account-mark" aria-hidden="true">
          {initials(account.name)}
        </div>
        <div className="account-title">
          <h1>{account.name}</h1>
          <div className="account-meta">
            <Badge tone={stage.tone} variant="tinted">
              {stage.label}
            </Badge>
            <span>{account.industry}</span>
            <span className="sep" aria-hidden="true">•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Avatar name={account.owner} size={20} />
              Owned by {account.owner}
            </span>
          </div>
        </div>
        <div className="head-actions">
          <Button variant="secondary" onClick={() => (window.location.href = `mailto:${contacts.find((c) => c.primary)?.email ?? ''}`)}>
            Email primary contact
          </Button>
          <Button variant="primary" leading={pencil} onClick={() => setEditing(true)}>
            Edit details
          </Button>
        </div>
      </header>

      <Stats account={account} lastActivity={lastActivity} />

      <div className="layout">
        <div className="col">
          <DetailsCard account={account} settle={saves} onEdit={() => setEditing(true)} />
        </div>
        <div className="col">
          <ContactsCard contacts={contacts} setContacts={setContacts} />
          <ActivityCard activity={activity} contacts={contacts} onLog={logActivity} />
        </div>
      </div>

      <EditAccountSheet open={editing} onOpenChange={setEditing} account={account} onSave={save} />
      <Toaster />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider scheme="daylight">
    <AccountPage />
  </AltitudeProvider>,
);
