import * as React from 'react';
import {
  Breadcrumb, Button, Dialog, ErrorSummary, Field, Input, PageHeader, PageHeaderDescription,
  PageHeaderTitle, SettingsSection, WorkflowStatus, useEditRecord,
} from 'altitude-design';
import type { LeaveReason } from 'altitude-design';
import { savePracticeDetails, type Practice, type PracticeDetails } from './practice';

const LABELS: Record<keyof PracticeDetails, string> = { name: 'Practice name', email: 'Contact email' };
const IDS: Record<keyof PracticeDetails, string> = { name: 'practice-name', email: 'practice-email' };

function validate(d: PracticeDetails) {
  const errors: Partial<Record<keyof PracticeDetails, string>> = {};
  const name = d.name.trim();
  if (!name) errors.name = 'Enter the practice name.';
  else if (name.length > 80) errors.name = 'Use 80 characters or fewer.';
  const email = d.email.trim();
  if (!email) errors.email = 'Enter a contact email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter an email address like reception@yourpractice.example.';
  return errors;
}

/** What the router asks before leaving this page. Resolves true when it's fine to go. */
export type LeaveGuard = (reason: LeaveReason) => Promise<boolean>;

export function PracticeSettings({ practice, onLeave, registerGuard }: {
  practice: Practice;
  onLeave: () => void;
  registerGuard: (guard: LeaveGuard | null) => void;
}) {
  const record = useEditRecord<PracticeDetails>({
    initialValue: { name: practice.name, email: practice.email },
    validationMode: 'submit',
    validate,
    save: (draft) => savePracticeDetails(draft),
    messages: { saving: 'Saving practice details…', saved: 'Practice details saved.' },
  });

  // Discard confirmation: requestLeave waits on the person's decision in this dialog.
  const [confirm, setConfirm] = React.useState<null | ((discard: boolean) => void)>(null);
  const askDiscard = React.useCallback(
    () => new Promise<boolean>((resolve) => setConfirm(() => (discard: boolean) => { setConfirm(null); resolve(discard); })),
    [],
  );

  const recordRef = React.useRef(record);
  recordRef.current = record;
  React.useEffect(() => {
    registerGuard((reason) => recordRef.current.requestLeave(reason, askDiscard));
    return () => registerGuard(null);
  }, [registerGuard, askDiscard]);

  // Reload or closing the tab with unsaved changes: the browser shows its own generic prompt.
  React.useEffect(() => {
    if (!record.dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [record.dirty]);

  const cancel = async () => { if (await record.requestLeave('cancel', askDiscard)) onLeave(); };
  const submitting = record.phase === 'submitting';
  const summary = (Object.keys(record.errors) as (keyof PracticeDetails)[])
    .filter((k) => record.errors[k])
    .map((k) => ({ id: IDS[k], label: LABELS[k], message: record.errors[k]! }));

  return (
    <>
      <PageHeader breadcrumb={<Breadcrumb items={[{ label: 'Practice', href: '#/practice' }, { label: 'Settings' }]} />}>
        <PageHeaderTitle>Practice settings</PageHeaderTitle>
        <PageHeaderDescription>Change the name and email clients see on bookings and reminders.</PageHeaderDescription>
      </PageHeader>
      <div className="page-body">
        <SettingsSection id="practice-details" title="Practice details" description="Saved together: change what you need, then save once.">
          <form className="settings-form" aria-label="Practice details" noValidate onSubmit={(e) => { e.preventDefault(); if (!submitting) void record.submit(); }}>
            <ErrorSummary errors={summary} focusKey={record.submitCount} />
            <Field label={LABELS.name} hint="Shown on the booking page, confirmations and reminders." error={record.errors.name} required>
              <Input id={IDS.name} autoComplete="organization" value={record.draft.name} onChange={(e) => record.setField('name', e.target.value)} />
            </Field>
            <Field label={LABELS.email} hint="Clients reply to this address, and we send booking alerts to it." error={record.errors.email} required>
              <Input id={IDS.email} type="email" autoComplete="email" value={record.draft.email} onChange={(e) => record.setField('email', e.target.value)} />
            </Field>
            {record.phase === 'failed' && record.error && <p className="form-error" role="alert">{record.error}</p>}
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={cancel} disabled={submitting}>Cancel</Button>
              <Button type="submit" variant="primary" loading={submitting}>
                {submitting ? 'Saving practice details' : record.phase === 'failed' ? 'Try saving again' : 'Save practice details'}
              </Button>
            </div>
          </form>
        </SettingsSection>
        <WorkflowStatus>{record.status}</WorkflowStatus>
      </div>
      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => { if (!open) confirm?.(false); }}
        size="sm"
        background="stationary"
        title="Discard unsaved changes?"
        description="Your changes to the practice details haven’t been saved. If you leave now, they’ll be lost."
        focusSelector="[data-keep]"
        footer={<>
          <Button data-keep variant="secondary" onClick={() => confirm?.(false)}>Keep editing</Button>
          <Button variant="danger" onClick={() => confirm?.(true)}>Discard changes</Button>
        </>}
      />
    </>
  );
}
