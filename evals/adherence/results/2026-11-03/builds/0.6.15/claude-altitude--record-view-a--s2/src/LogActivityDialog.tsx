import * as React from 'react';
import { Button, Dialog, Field, Select, Textarea } from 'altitude-design';
import type { ActivityKind, Contact } from './data';

export interface LoggedActivity {
  kind: Extract<ActivityKind, 'call' | 'email' | 'meeting' | 'note'>;
  contactId: string;
  summary: string;
}

const KINDS = [
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
  { value: 'note', label: 'Note' },
];
const NO_CONTACT = 'none';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  /** Hands the activity to the page; the page shows it pending in the timeline until the service confirms. */
  onLog: (activity: LoggedActivity) => void;
}

export function LogActivityDialog({ open, onOpenChange, contacts, onLog }: Props) {
  const [kind, setKind] = React.useState<LoggedActivity['kind']>('call');
  const [contactId, setContactId] = React.useState(contacts.find((c) => c.primary)?.id ?? NO_CONTACT);
  const [summary, setSummary] = React.useState('');
  const [errors, setErrors] = React.useState<{ contact?: string; summary?: string }>({});

  React.useEffect(() => {
    if (open) { setKind('call'); setSummary(''); setErrors({}); setContactId(contacts.find((c) => c.primary)?.id ?? NO_CONTACT); }
  }, [open, contacts]);

  const contactItems = [
    { value: NO_CONTACT, label: 'No one in particular' },
    ...contacts.map((c) => ({ value: c.id, label: c.name, description: c.title })),
  ];
  const needsContact = kind === 'call' || kind === 'meeting';
  const verb = KINDS.find((k) => k.value === kind)!.label.toLowerCase();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (needsContact && contactId === NO_CONTACT) next.contact = `Choose who the ${verb} was with.`;
    if (!summary.trim()) next.summary = 'Write what happened, in a sentence or two.';
    setErrors(next);
    if (Object.keys(next).length) {
      const first = next.contact ? 'log-contact' : 'log-summary';
      document.getElementById(first)?.focus();
      return;
    }
    onLog({ kind, contactId, summary: summary.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Log activity" description="It's added to this account's history for everyone on the team."
      footer={<>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button variant="primary" type="submit" form="log-activity">{`Log ${verb}`}</Button>
      </>}>
      <form id="log-activity" className="log-form" onSubmit={submit} noValidate>
        <Field label="Type">
          <Select id="log-kind" value={kind} onValueChange={(v) => { setKind(v as LoggedActivity['kind']); setErrors((e) => ({ ...e, contact: undefined })); }} items={KINDS} />
        </Field>
        <Field label="With" required={needsContact} error={errors.contact}>
          <Select id="log-contact" value={contactId} onValueChange={(v) => { setContactId(v); setErrors((e) => ({ ...e, contact: undefined })); }} items={contactItems} />
        </Field>
        <Field label="Summary" required error={errors.summary} hint="What was discussed and any next step.">
          <Textarea id="log-summary" rows={4} maxLength={500} value={summary}
            onChange={(e) => { setSummary(e.target.value); if (errors.summary) setErrors((x) => ({ ...x, summary: undefined })); }}
            placeholder="Agreed to send a two-year pricing option by Friday." />
        </Field>
      </form>
    </Dialog>
  );
}
