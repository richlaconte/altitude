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
  DataTable,
  DropdownMenu,
  EmptyState,
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
  Stage,
  activities as initialActivities,
  contacts,
  initialAccount,
  opportunities,
} from './data';
import { EditAccountSheet } from './EditAccountSheet';

// Sample data is pinned to this date so relative times read sensibly.
const TODAY = new Date('2026-11-03T12:00:00');

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const longDate = (iso: string) =>
  new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
const daysBetween = (iso: string) =>
  Math.round((new Date(iso + 'T00:00:00').getTime() - TODAY.getTime()) / 86_400_000);

function ago(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((TODAY.getTime() - d.getTime()) / 86_400_000);
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} wk ago`;
  return longDate(iso.slice(0, 10));
}

const stageTone: Record<Stage, 'neutral' | 'accent' | 'positive' | 'caution' | 'critical'> = {
  Prospect: 'neutral',
  Evaluation: 'accent',
  Negotiation: 'caution',
  Customer: 'positive',
  'At risk': 'critical',
};

const kindLabel: Record<ActivityKind, string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  note: 'Note',
  deal: 'Deal update',
};

function KindIcon({ kind }: { kind: ActivityKind }) {
  const p = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (kind) {
    case 'call':
      return (
        <svg {...p}>
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
        </svg>
      );
    case 'email':
      return (
        <svg {...p}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
    case 'meeting':
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case 'note':
      return (
        <svg {...p}>
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path d="M14 3v6h6M8 13h8M8 17h5" />
        </svg>
      );
    case 'deal':
      return (
        <svg {...p}>
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M15 7h6v6" />
        </svg>
      );
  }
}

/* ---------- Header ---------- */

function AccountHeader({ account, onEdit }: { account: Account; onEdit: () => void }) {
  return (
    <header className="acct-header">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href="#">Accounts</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{account.name}</span>
      </nav>
      <div className="acct-title-row">
        <div className="acct-mark" aria-hidden="true">
          {account.name
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join('')}
        </div>
        <div className="acct-title">
          <h1>{account.name}</h1>
          <div className="acct-meta">
            <Badge tone={stageTone[account.stage]}>{account.stage}</Badge>
            <Badge variant="outline">{account.tier}</Badge>
            <span>{account.industry}</span>
            {account.domain && (
              <>
                <span aria-hidden="true">·</span>
                <a href={`https://${account.domain}`} target="_blank" rel="noreferrer">
                  {account.domain}
                </a>
              </>
            )}
          </div>
        </div>
        <div className="acct-actions">
          <Button variant="primary" onClick={onEdit}>
            Edit details
          </Button>
          <DropdownMenu
            align="end"
            trigger={
              <Button variant="secondary" square aria-label="More actions">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </Button>
            }
            items={[
              { label: 'Copy account link', onSelect: () => toast('Link copied') },
              { label: 'Export to CSV', onSelect: () => toast('Export started') },
              { type: 'separator' },
              {
                label: 'Mark as at risk',
                tone: 'critical',
                onSelect: () => toast({ title: 'Use Edit details to change the stage', tone: 'caution' }),
              },
            ]}
          />
        </div>
      </div>
    </header>
  );
}

/* ---------- Key figures ---------- */

function KeyFigures({ account }: { account: Account }) {
  const pipeline = opportunities.reduce((s, o) => s + o.amount, 0);
  const renewIn = daysBetween(account.renewalDate);
  return (
    <section className="figures" aria-label="Key figures">
      <div className="figure">
        <span className="figure-label">Annual recurring revenue</span>
        <span className="figure-value">{money(account.arr)}</span>
      </div>
      <div className="figure">
        <span className="figure-label">Open pipeline</span>
        <span className="figure-value">{money(pipeline)}</span>
        <span className="figure-sub">{opportunities.length} open opportunities</span>
      </div>
      <div className="figure">
        <span className="figure-label">Renewal</span>
        <span className="figure-value">{longDate(account.renewalDate)}</span>
        <span className={`figure-sub${renewIn >= 0 && renewIn <= 120 ? ' is-caution' : ''}`}>
          {renewIn >= 0 ? `in ${renewIn} days` : `${-renewIn} days overdue`}
        </span>
      </div>
      <div className="figure">
        <span className="figure-label">Account owner</span>
        <span className="figure-owner">
          <Avatar name={account.owner} size={24} />
          <span className="figure-value is-small">{account.owner}</span>
        </span>
      </div>
    </section>
  );
}

/* ---------- Details ---------- */

function DetailsCard({ account, saved, onEdit }: { account: Account; saved: number; onEdit: () => void }) {
  const rows: [string, React.ReactNode][] = [
    ['Industry', account.industry],
    ['Tier', account.tier],
    ['Employees', account.employees],
    ['Annual revenue', account.annualRevenue],
    ['Phone', <a href={`tel:${account.phone.replace(/[^+\d]/g, '')}`}>{account.phone}</a>],
    ['Address', account.address],
  ];
  return (
    <Card settle={saved || undefined} aria-labelledby="details-title">
      <CardHeader className="card-head-row">
        <CardTitle id="details-title">Account details</CardTitle>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </CardHeader>
      <CardContent>
        <p className="details-desc">{account.description || <em>No description yet.</em>}</p>
        <dl className="details">
          {rows.map(([k, v]) => (
            <div key={k} className="details-row">
              <dt>{k}</dt>
              <dd>{v || <span className="muted">Not set</span>}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function OpportunitiesCard() {
  return (
    <Card aria-labelledby="opps-title">
      <CardHeader>
        <CardTitle id="opps-title">Opportunities</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="opps">
          {opportunities.map((o) => (
            <li key={o.name}>
              <div>
                <div className="opp-name">{o.name}</div>
                <div className="muted small">Closes {longDate(o.close)}</div>
              </div>
              <div className="opp-right">
                <span className="opp-amt">{money(o.amount)}</span>
                <Badge variant="tinted" tone={o.stage === 'Negotiation' ? 'caution' : 'accent'} lamp={false}>
                  {o.stage}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ---------- Contacts ---------- */

// Mirrors Altitude's DataTableColumn, which the package doesn't export.
type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  align?: 'start' | 'end';
};

const roleTone: Record<Contact['role'], 'neutral' | 'accent' | 'positive'> = {
  'Decision maker': 'accent',
  Champion: 'positive',
  Influencer: 'neutral',
  Technical: 'neutral',
  Billing: 'neutral',
};

function ContactsCard() {
  const columns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: (c) => c.name,
      cell: (c) => (
        <span className="person">
          <Avatar name={c.name} size={28} />
          <span>
            <span className="person-name">
              {c.name}
              {c.primary && <span className="primary-tag">Primary</span>}
            </span>
            <span className="person-title">{c.title}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortValue: (c) => c.role,
      cell: (c) => (
        <Badge variant="tinted" tone={roleTone[c.role]} lamp={false}>
          {c.role}
        </Badge>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      cell: (c) => (
        <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()}>
          {c.email}
        </a>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      cell: (c) => <span className="nowrap">{c.phone}</span>,
    },
    {
      key: 'last',
      header: 'Last contacted',
      align: 'end',
      sortValue: (c) => c.lastContacted,
      cell: (c) => <span className="nowrap">{ago(c.lastContacted + 'T09:00:00')}</span>,
    },
  ];
  return (
    <Card aria-labelledby="contacts-title">
      <CardHeader className="card-head-row">
        <div>
          <CardTitle id="contacts-title">Contacts</CardTitle>
          <CardDescription>{contacts.length} people at this account</CardDescription>
        </div>
        <Button variant="secondary" size="sm" onClick={() => toast('Adding contacts needs a backend')}>
          Add contact
        </Button>
      </CardHeader>
      <CardContent className="flush">
        <DataTable
          aria-label="Contacts"
          columns={columns}
          rows={contacts}
          getRowId={(c) => c.id}
          getRowLabel={(c) => c.name}
          defaultSort={null}
        />
      </CardContent>
    </Card>
  );
}

/* ---------- Activity ---------- */

function ActivityCard({
  items,
  onLog,
  owner,
}: {
  items: Activity[];
  onLog: (text: string) => void;
  owner: string;
}) {
  const [note, setNote] = React.useState('');
  const [filter, setFilter] = React.useState<ActivityKind | 'all'>('all');
  const shown = filter === 'all' ? items : items.filter((a) => a.kind === filter);
  const filterLabel = filter === 'all' ? 'All activity' : `${kindLabel[filter]}s`;

  return (
    <Card aria-labelledby="activity-title">
      <CardHeader className="card-head-row">
        <div>
          <CardTitle id="activity-title">Recent activity</CardTitle>
          <CardDescription>Calls, emails, meetings and notes, newest first</CardDescription>
        </div>
        <DropdownMenu
          align="end"
          trigger={
            <Button variant="ghost" size="sm" aria-label={`Filter: ${filterLabel}`}>
              {filterLabel} ▾
            </Button>
          }
          items={[
            { label: 'All activity', onSelect: () => setFilter('all') },
            { type: 'separator' },
            ...(Object.keys(kindLabel) as ActivityKind[]).map((k) => ({
              label: `${kindLabel[k]}s`,
              onSelect: () => setFilter(k),
            })),
          ]}
        />
      </CardHeader>
      <CardContent>
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            if (!note.trim()) return;
            onLog(note.trim());
            setNote('');
            setFilter('all');
          }}
        >
          <Textarea
            aria-label="Log a note"
            placeholder={`Log a note as ${owner}…`}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="composer-actions">
            <Button type="submit" size="sm" variant="secondary" disabled={!note.trim()}>
              Log note
            </Button>
          </div>
        </form>

        {shown.length === 0 ? (
          <EmptyState
            size="sm"
            title={`No ${filterLabel.toLowerCase()} yet`}
            description="Try another filter, or log a note above."
            action={
              <Button size="sm" onClick={() => setFilter('all')}>
                Show all activity
              </Button>
            }
            announce
          />
        ) : (
          <ol className="timeline">
            {shown.map((a) => (
              <li key={a.id} className={`tl-item kind-${a.kind}`}>
                <span className="tl-icon" title={kindLabel[a.kind]}>
                  <KindIcon kind={a.kind} />
                </span>
                <div className="tl-body">
                  <div className="tl-head">
                    <span className="tl-title">{a.title}</span>
                    <time dateTime={a.at} className="tl-time">
                      {ago(a.at)}
                    </time>
                  </div>
                  {a.body && <p className="tl-text">{a.body}</p>}
                  <div className="tl-meta">
                    <span className="visually-hidden">{kindLabel[a.kind]} · </span>
                    {a.who}
                    {a.contact && <> with {a.contact}</>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Page ---------- */

function App() {
  const [account, setAccount] = React.useState(initialAccount);
  const [activity, setActivity] = React.useState(initialActivities);
  const [editing, setEditing] = React.useState(false);
  const [saved, setSaved] = React.useState(0);

  const save = (next: Account) => {
    const changed = (Object.keys(next) as (keyof Account)[]).filter((k) => next[k] !== account[k]);
    setAccount(next);
    if (changed.length === 0) {
      toast('No changes to save');
      return;
    }
    setSaved((n) => n + 1);
    setActivity((xs) => [
      {
        id: `n${Date.now()}`,
        kind: 'note',
        title: 'Account details updated',
        body: `Changed ${changed.length} field${changed.length === 1 ? '' : 's'}.`,
        who: next.owner,
        at: TODAY.toISOString(),
      },
      ...xs,
    ]);
    toast({ title: 'Account details saved', tone: 'positive' });
  };

  const logNote = (text: string) => {
    setActivity((xs) => [
      { id: `n${Date.now()}`, kind: 'note', title: 'Note', body: text, who: account.owner, at: TODAY.toISOString() },
      ...xs,
    ]);
    toast({ title: 'Note logged', tone: 'positive' });
  };

  return (
    <main className="page">
      <AccountHeader account={account} onEdit={() => setEditing(true)} />
      <KeyFigures account={account} />
      <div className="layout">
        <div className="main-col">
          <ContactsCard />
          <ActivityCard items={activity} onLog={logNote} owner={account.owner} />
        </div>
        <aside className="side-col" aria-label="Account summary">
          <DetailsCard account={account} saved={saved} onEdit={() => setEditing(true)} />
          <OpportunitiesCard />
        </aside>
      </div>
      <EditAccountSheet open={editing} onOpenChange={setEditing} account={account} onSave={save} />
      <Toaster />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider scheme="daylight">
    <App />
  </AltitudeProvider>,
);
