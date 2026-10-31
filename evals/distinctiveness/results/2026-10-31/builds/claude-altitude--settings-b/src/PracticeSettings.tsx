import * as React from 'react';
import * as A from 'altitude-design';
import {savePractice, validatePractice, type Practice} from './practice';

export type LeaveGuard = (reason: A.LeaveReason) => Promise<boolean>;

const LABELS: Record<keyof Practice, string> = {name: 'Practice name', contactEmail: 'Contact email'};
const fieldId = (key: keyof Practice) => 'practice-' + key;

interface Props {
  practice: Practice;
  onSaved: (practice: Practice) => void;
  /** Leave without asking (the draft is clean or already discarded). */
  onLeave: () => void;
  /** Breadcrumb navigation, which goes through the app's guard. */
  onNavigateOverview: () => void;
  guardRef: React.MutableRefObject<LeaveGuard | null>;
}

export function PracticeSettings({practice, onSaved, onLeave, onNavigateOverview, guardRef}: Props) {
  const record = A.useEditRecord<Practice>({
    initialValue: practice,
    validationMode: 'submit',
    validate: validatePractice,
    save: async (draft) => {
      const result = await savePractice(draft);
      if (result.ok) onSaved(result.value);
      return result;
    },
    messages: {saving: 'Saving practice details', saved: 'Practice details saved'},
  });

  // Discard confirmation: requestLeave waits on this promise until the person answers the dialog.
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const answer = React.useRef<((discard: boolean) => void) | null>(null);
  const confirmDiscard = () =>
    new Promise<boolean>((resolve) => {
      answer.current = resolve;
      setConfirmOpen(true);
    });
  const decide = (discard: boolean) => {
    setConfirmOpen(false);
    answer.current?.(discard);
    answer.current = null;
  };

  const requestLeave = record.requestLeave;
  React.useEffect(() => {
    guardRef.current = (reason) => requestLeave(reason, confirmDiscard);
    return () => {
      guardRef.current = null;
    };
  });

  // Reloading or closing the tab with unsaved changes: the browser shows its own prompt.
  React.useEffect(() => {
    if (!record.dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [record.dirty]);

  const cancel = async () => {
    if (await requestLeave('cancel', confirmDiscard)) onLeave();
  };

  const submitting = record.phase === 'submitting';
  const field = (key: keyof Practice, hint: string, type = 'text', autoComplete?: string) => (
    <A.Field label={LABELS[key]} hint={hint} error={record.errors[key]} required>
      <A.Input
        id={fieldId(key)}
        type={type}
        autoComplete={autoComplete}
        value={record.draft[key]}
        onChange={(e) => record.setField(key, e.target.value)}
      />
    </A.Field>
  );

  return (
    <main className="vc-page vc-narrow">
      <A.PageHeader
        breadcrumb={
          <A.Breadcrumb
            items={[
              {label: 'Practice overview', href: '#/practice', onClick: (e) => { e.preventDefault(); onNavigateOverview(); }},
              {label: 'Practice settings'},
            ]}
          />
        }
        actions={<A.Button variant="secondary" onClick={cancel} disabled={submitting}>Cancel</A.Button>}
      >
        <A.PageHeaderTitle id="practice-settings-title" tabIndex={-1}>Practice settings</A.PageHeaderTitle>
        <A.PageHeaderDescription>How {record.baseline.name} appears to clients in booking confirmations and reminders.</A.PageHeaderDescription>
      </A.PageHeader>

      <A.SettingsSection
        id="practice-details"
        title="Practice details"
        description="Saved together: change what you need, then save once."
      >
        <form
          className="vc-form"
          aria-label="Practice details"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void record.submit();
          }}
        >
          <A.ErrorSummary
            errors={(Object.keys(LABELS) as (keyof Practice)[])
              .filter((k) => record.errors[k])
              .map((k) => ({id: fieldId(k), label: LABELS[k], message: record.errors[k]!}))}
            focusKey={record.submitCount}
          />
          {field('name', 'Shown on the booking page and in every email clients receive.', 'text', 'organization')}
          {field('contactEmail', 'Clients reply to this address, and booking notifications are sent to it.', 'email', 'email')}
          {/* Lets Enter submit the form; the visible Save action is in the SaveBar. */}
          <button type="submit" hidden />
        </form>
      </A.SettingsSection>

      <A.WorkflowStatus>{record.status}</A.WorkflowStatus>
      <A.SaveBar record={record} saveLabel="Save practice details" discardLabel="Discard changes" />

      <A.Dialog
        open={confirmOpen}
        background="stationary"
        onOpenChange={(open) => { if (!open) decide(false); }}
        returnFocus={() => document.getElementById('practice-settings-title')}
        initialFocus="title"
        title="Discard unsaved changes?"
        description="Your changes to the practice details haven’t been saved. If you leave now, they’ll be lost."
        footer={
          <>
            <A.Button onClick={() => decide(false)}>Keep editing</A.Button>
            <A.Button variant="danger" onClick={() => decide(true)}>Discard and leave</A.Button>
          </>
        }
      />
    </main>
  );
}
