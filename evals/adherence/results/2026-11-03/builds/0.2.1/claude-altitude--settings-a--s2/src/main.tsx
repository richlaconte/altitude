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
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Toaster,
  toast,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';

type Workspace = { name: string; contactEmail: string };

const INITIAL_WORKSPACE: Workspace = {
  name: 'Northwind Studio',
  contactEmail: 'ops@northwindstudio.com',
};

const MEMBERS = [
  { name: 'Priya Raman', status: 'active' as const },
  { name: 'Marcus Oyelaran', status: 'active' as const },
  { name: 'Hana Kobayashi', status: 'idle' as const },
  { name: 'Diego Ferreira', status: 'offline' as const },
  { name: 'Elsa Lindqvist', status: 'active' as const },
  { name: 'Tomás Herrera', status: 'idle' as const },
];

const PROJECTS = [
  { name: 'Spring catalog relaunch', open: 14, due: 'Nov 18', tone: 'caution' as const, state: 'At risk' },
  { name: 'Mobile checkout redesign', open: 22, due: 'Dec 2', tone: 'positive' as const, state: 'On track' },
  { name: 'Partner portal v2', open: 9, due: 'Dec 15', tone: 'positive' as const, state: 'On track' },
  { name: 'Q1 brand refresh', open: 31, due: 'Jan 20', tone: 'neutral' as const, state: 'Planning' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(w: Workspace) {
  const errors: Partial<Record<keyof Workspace, string>> = {};
  const name = w.name.trim();
  if (!name) errors.name = 'Enter a workspace name.';
  else if (name.length > 60) errors.name = 'Use 60 characters or fewer.';
  const email = w.contactEmail.trim();
  if (!email) errors.contactEmail = 'Enter a contact email.';
  else if (!EMAIL_RE.test(email)) errors.contactEmail = 'Enter an email like name@company.com.';
  return errors;
}

function Overview({ workspace, onOpenSettings }: { workspace: Workspace; onOpenSettings: () => void }) {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>{workspace.name}</h1>
          <p className="muted">Contact: {workspace.contactEmail}</p>
        </div>
        <Button variant="secondary" onClick={onOpenSettings}>
          Workspace settings
        </Button>
      </header>

      <div className="stats">
        <Card>
          <CardContent>
            <p className="stat-label">Active projects</p>
            <p className="stat-value">{PROJECTS.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="stat-label">Open tasks</p>
            <p className="stat-value">{PROJECTS.reduce((n, p) => n + p.open, 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="stat-label">Members</p>
            <div className="members-row">
              <p className="stat-value">{MEMBERS.length}</p>
              <AvatarGroup max={4}>
                {MEMBERS.map((m) => (
                  <Avatar key={m.name} name={m.name} status={m.status} size={28} />
                ))}
              </AvatarGroup>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>Everything your team is working on right now.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="project-list">
            {PROJECTS.map((p) => (
              <li key={p.name}>
                <div>
                  <p className="project-name">{p.name}</p>
                  <p className="muted small">
                    {p.open} open tasks · due {p.due}
                  </p>
                </div>
                <Badge tone={p.tone}>{p.state}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

function Settings({
  workspace,
  onSave,
  onCancel,
}: {
  workspace: Workspace;
  onSave: (w: Workspace) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = React.useState<Workspace>(workspace);
  const [submitted, setSubmitted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(0);

  const errors = validate(draft);
  const hasErrors = Object.keys(errors).length > 0;
  const dirty =
    draft.name.trim() !== workspace.name || draft.contactEmail.trim() !== workspace.contactEmail;

  const set = (key: keyof Workspace) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors || !dirty || saving) return;
    setSaving(true);
    const next = { name: draft.name.trim(), contactEmail: draft.contactEmail.trim() };
    await onSave(next);
    setDraft(next);
    setSaving(false);
    setSubmitted(false);
    setSavedAt(Date.now());
    toast({ title: 'Workspace settings saved', tone: 'positive' });
  }

  const showError = (key: keyof Workspace) => (submitted ? errors[key] : undefined);

  return (
    <>
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <button type="button" className="link" onClick={onCancel}>
          {workspace.name}
        </button>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Settings</span>
      </nav>
      <header className="page-header">
        <div>
          <h1>Workspace settings</h1>
          <p className="muted">These details appear to everyone in the workspace and on invoices.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        <Card settle={savedAt || undefined}>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Name your workspace and choose where we send account notices.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="fields">
              <Field label="Workspace name" required error={showError('name')} hint="Shown in the sidebar and in invites.">
                <Input
                  name="name"
                  value={draft.name}
                  onChange={set('name')}
                  autoComplete="organization"
                  maxLength={80}
                  disabled={saving}
                />
              </Field>
              <Field
                label="Contact email"
                required
                error={showError('contactEmail')}
                hint="Billing and security notices go here."
              >
                <Input
                  name="contactEmail"
                  type="email"
                  value={draft.contactEmail}
                  onChange={set('contactEmail')}
                  autoComplete="email"
                  disabled={saving}
                />
              </Field>
            </div>
          </CardContent>
          <CardFooter>
            <div className="actions">
              <span className="muted small" aria-live="polite">
                {dirty ? 'You have unsaved changes.' : ''}
              </span>
              <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>
                Save changes
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </>
  );
}

function App() {
  const [view, setView] = React.useState<'overview' | 'settings'>('settings');
  const [workspace, setWorkspace] = React.useState<Workspace>(INITIAL_WORKSPACE);

  // No backend: simulate a short network round-trip.
  const save = (w: Workspace) =>
    new Promise<void>((resolve) =>
      setTimeout(() => {
        setWorkspace(w);
        resolve();
      }, 700),
    );

  return (
    <div className="shell">
      <main className="page">
        {view === 'overview' ? (
          <Overview workspace={workspace} onOpenSettings={() => setView('settings')} />
        ) : (
          <Settings workspace={workspace} onSave={save} onCancel={() => setView('overview')} />
        )}
      </main>
      <Toaster />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider scheme="daylight">
    <App />
  </AltitudeProvider>,
);
