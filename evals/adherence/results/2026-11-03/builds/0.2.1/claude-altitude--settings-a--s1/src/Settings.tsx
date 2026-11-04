import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  Input,
  toast,
} from 'altitude-design';
import { workspaceMeta, type Workspace } from './data';

const NAME_MAX = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Partial<Record<keyof Workspace, string>>;

function validate(v: Workspace): Errors {
  const errors: Errors = {};
  const name = v.name.trim();
  if (!name) errors.name = 'Enter a workspace name.';
  else if (name.length > NAME_MAX) errors.name = `Keep the name to ${NAME_MAX} characters or fewer.`;
  const email = v.contactEmail.trim();
  if (!email) errors.contactEmail = 'Enter a contact email.';
  else if (!EMAIL_RE.test(email)) errors.contactEmail = 'Enter an email address like name@company.com.';
  return errors;
}

interface Props {
  workspace: Workspace;
  onSave: (next: Workspace) => void;
  onCancel: () => void;
}

export function Settings({ workspace, onSave, onCancel }: Props) {
  const [draft, setDraft] = React.useState<Workspace>(workspace);
  const [touched, setTouched] = React.useState<Partial<Record<keyof Workspace, boolean>>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savedCount, setSavedCount] = React.useState(0);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);

  const errors = validate(draft);
  const show = (k: keyof Workspace) => (submitted || touched[k] ? errors[k] : undefined);
  const dirty =
    draft.name.trim() !== workspace.name || draft.contactEmail.trim() !== workspace.contactEmail;

  const update = (k: keyof Workspace) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));
  const blur = (k: keyof Workspace) => () => setTouched((t) => ({ ...t, [k]: true }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !dirty) return;
    setSubmitted(true);
    if (errors.name) return nameRef.current?.focus();
    if (errors.contactEmail) return emailRef.current?.focus();

    const next = { name: draft.name.trim(), contactEmail: draft.contactEmail.trim() };
    setSaving(true);
    // No backend: simulate a short network round trip.
    window.setTimeout(() => {
      onSave(next);
      setDraft(next);
      setSaving(false);
      setSubmitted(false);
      setTouched({});
      setSavedCount((n) => n + 1);
      toast({ title: 'Workspace settings saved', tone: 'positive' });
    }, 700);
  };

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <button type="button" className="crumb-link" onClick={onCancel}>
          {workspace.name}
        </button>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Settings</span>
      </nav>

      <header className="page-header">
        <div>
          <h1 className="page-title">Workspace settings</h1>
          <p className="page-sub">Manage how this workspace appears to members and who we contact about it.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        <Card settle={savedCount || undefined}>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>These details are visible to everyone in the workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="form-stack">
              <Field
                label="Workspace name"
                hint={`Shown in the sidebar, invitations and email notifications. ${NAME_MAX} characters max.`}
                error={show('name')}
                required
              >
                <Input
                  ref={nameRef}
                  name="name"
                  autoComplete="organization"
                  value={draft.name}
                  onChange={update('name')}
                  onBlur={blur('name')}
                  disabled={saving}
                />
              </Field>
              <Field
                label="Contact email"
                hint="Billing receipts, security alerts and plan notices go here."
                error={show('contactEmail')}
                required
              >
                <Input
                  ref={emailRef}
                  name="contactEmail"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={draft.contactEmail}
                  onChange={update('contactEmail')}
                  onBlur={blur('contactEmail')}
                  disabled={saving}
                />
              </Field>
              <dl className="meta">
                <div>
                  <dt>Workspace URL</dt>
                  <dd>app.taskline.io/{workspaceMeta.slug}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{workspaceMeta.createdOn}</dd>
                </div>
              </dl>
            </div>
          </CardContent>
          <CardFooter className="form-actions">
            <span className="dirty-note" aria-live="polite">
              {dirty && !saving ? 'You have unsaved changes.' : ''}
            </span>
            <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving} disabled={!dirty || saving}>
              Save changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </>
  );
}
