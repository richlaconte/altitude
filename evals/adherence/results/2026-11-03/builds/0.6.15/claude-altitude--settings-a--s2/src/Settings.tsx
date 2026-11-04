import * as React from 'react';
import {
  Alert, Breadcrumb, Button, Dialog, ErrorSummary, Field, Input, PageHeader, PageHeaderDescription, PageHeaderTitle,
  SettingsSection, WorkflowStatus, useEditRecord,
} from 'altitude-design';
import type { LeaveReason } from 'altitude-design';
import { saveWorkspaceSettings, type WorkspaceSettings } from './workspace';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LABELS: Record<keyof WorkspaceSettings, string> = { name: 'Workspace name', contactEmail: 'Contact email' };
const IDS: Record<keyof WorkspaceSettings, string> = { name: 'ws-name', contactEmail: 'ws-contact-email' };

function validate(d: WorkspaceSettings) {
  const errors: Partial<Record<keyof WorkspaceSettings, string>> = {};
  const name = d.name.trim();
  if (!name) errors.name = 'Enter a workspace name.';
  else if (name.length > 60) errors.name = 'Use 60 characters or fewer.';
  const email = d.contactEmail.trim();
  if (!email) errors.contactEmail = 'Enter a contact email.';
  else if (!EMAIL.test(email)) errors.contactEmail = 'Enter an email address like name@example.com.';
  return errors;
}

/** Lets the app ask the settings page before any navigation away (Cancel, breadcrumb, browser Back). */
export type LeaveGuard = (reason: LeaveReason) => Promise<boolean>;

interface SettingsProps {
  initial: WorkspaceSettings;
  onSaved: (value: WorkspaceSettings) => void;
  onLeave: () => void;
  registerGuard: (guard: LeaveGuard | null) => void;
}

export function Settings({ initial, onSaved, onLeave, registerGuard }: SettingsProps) {
  const form = useEditRecord<WorkspaceSettings>({
    initialValue: initial,
    validationMode: 'submit',
    validate,
    save: async (draft) => {
      try {
        const value = await saveWorkspaceSettings(draft);
        onSaved(value);
        return { ok: true, value };
      } catch {
        return { ok: false, error: 'We couldn’t save your changes. They’re still here; try saving again.' };
      }
    },
    messages: { saved: 'Workspace settings saved' },
  });

  // A discard confirmation that resolves when the person decides.
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const decide = React.useRef<((discard: boolean) => void) | null>(null);
  const askDiscard = React.useCallback(() => new Promise<boolean>((resolve) => {
    decide.current = resolve;
    setConfirmOpen(true);
  }), []);
  const answer = (discard: boolean) => {
    setConfirmOpen(false);
    decide.current?.(discard);
    decide.current = null;
  };

  const requestLeave = form.requestLeave;
  React.useEffect(() => {
    registerGuard((reason) => requestLeave(reason, askDiscard));
    return () => registerGuard(null);
  }, [registerGuard, requestLeave, askDiscard]);

  const cancel = async () => {
    if (await requestLeave('cancel', askDiscard)) onLeave();
  };

  const submitting = form.phase === 'submitting';
  const summary = (Object.keys(form.errors) as (keyof WorkspaceSettings)[])
    .filter((k) => form.errors[k])
    .map((k) => ({ id: IDS[k], label: LABELS[k], message: form.errors[k]! }));

  const field = (key: keyof WorkspaceSettings, hint: string, type = 'text', autoComplete?: string) => (
    <Field label={LABELS[key]} hint={hint} error={form.errors[key]} required>
      <Input
        id={IDS[key]} type={type} autoComplete={autoComplete} value={form.draft[key]}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setField(key, e.target.value)}
      />
    </Field>
  );

  return (
    <main className="page">
      <PageHeader breadcrumb={<Breadcrumb items={[{ label: form.baseline.name, href: '#/' }, { label: 'Settings' }]} />}>
        <PageHeaderTitle>Workspace settings</PageHeaderTitle>
        <PageHeaderDescription>Change how this workspace is named and where people can reach its admins.</PageHeaderDescription>
      </PageHeader>

      <SettingsSection title="General" description="These are saved together when you choose Save settings." className="settings-section">
        <form aria-label="General settings" noValidate className="settings-form"
          onSubmit={(e) => { e.preventDefault(); if (!submitting) void form.submit(); }}>
          <ErrorSummary errors={summary} focusKey={form.submitCount} />
          {field('name', 'Shown to all 14 members and on every project.', 'text', 'organization')}
          {field('contactEmail', 'Where members and billing send questions about this workspace.', 'email', 'email')}
          {form.phase === 'failed' && form.error && (
            <Alert tone="critical" title="Settings not saved">{form.error}</Alert>
          )}
          {form.phase === 'saved' && !form.dirty && (
            <Alert tone="positive" title="Settings saved">Members now see the updated name and contact email.</Alert>
          )}
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={cancel} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="primary" loading={submitting} disabled={submitting}>
              {submitting ? 'Saving settings' : form.phase === 'failed' ? 'Try saving again' : 'Save settings'}
            </Button>
          </div>
        </form>
      </SettingsSection>

      <WorkflowStatus>{form.status}</WorkflowStatus>

      <Dialog
        open={confirmOpen} size="sm" background="stationary"
        onOpenChange={(open) => { if (!open) answer(false); }}
        title="Discard your changes?"
        description="Your edits to the workspace name and contact email haven’t been saved. Leaving now discards them."
        focusSelector="[data-keep]"
        footer={<>
          <Button data-keep variant="secondary" onClick={() => answer(false)}>Keep editing</Button>
          <Button variant="danger" onClick={() => answer(true)}>Discard changes</Button>
        </>}
      />
    </main>
  );
}
