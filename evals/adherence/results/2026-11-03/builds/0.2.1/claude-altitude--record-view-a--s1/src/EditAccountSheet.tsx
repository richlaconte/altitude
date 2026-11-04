import * as React from 'react';
import {
  Button,
  Field,
  Input,
  Select,
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
} from 'altitude-design';
import { Account, INDUSTRIES, OWNERS, STAGES, TIERS } from './data';

type Errors = Partial<Record<keyof Account, string>>;

function validate(a: Account): Errors {
  const e: Errors = {};
  if (!a.name.trim()) e.name = 'Enter the account name.';
  if (a.domain && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(a.domain.trim()))
    e.domain = 'Use a domain like example.com, without https://.';
  if (!Number.isFinite(a.arr) || a.arr < 0) e.arr = 'Enter ARR as a positive number.';
  if (!a.renewalDate) e.renewalDate = 'Choose a renewal date.';
  return e;
}

const opts = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));

export function EditAccountSheet({
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
  const [arrText, setArrText] = React.useState(String(account.arr));
  const [errors, setErrors] = React.useState<Errors>({});
  const [saving, setSaving] = React.useState(false);

  // Start from the saved record each time the sheet opens.
  React.useEffect(() => {
    if (open) {
      setDraft(account);
      setArrText(String(account.arr));
      setErrors({});
      setSaving(false);
    }
  }, [open, account]);

  const set = <K extends keyof Account>(k: K, v: Account[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const next = { ...draft, arr: Number(arrText.replace(/[$,\s]/g, '')) };
    const errs = validate(next);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    setSaving(true);
    // No backend: simulate a short save round-trip.
    window.setTimeout(() => {
      onSave(next);
      onOpenChange(false);
    }, 450);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} size="lg" aria-label="Edit account details">
      <form onSubmit={submit} className="edit-form" noValidate>
        <SheetHeader>
          <SheetTitle>Edit account details</SheetTitle>
          <SheetDescription>Changes are saved to {account.name}.</SheetDescription>
        </SheetHeader>

        <div className="edit-body">
          <fieldset className="edit-group">
            <legend>Company</legend>
            <Field label="Account name" required error={errors.name}>
              <Input value={draft.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <div className="edit-row">
              <Field label="Website domain" error={errors.domain}>
                <Input value={draft.domain} onChange={(e) => set('domain', e.target.value)} />
              </Field>
              <Field label="Industry">
                <Select
                  value={draft.industry}
                  onValueChange={(v) => set('industry', v)}
                  items={opts(INDUSTRIES)}
                />
              </Field>
            </div>
            <div className="edit-row">
              <Field label="Employees">
                <Input value={draft.employees} onChange={(e) => set('employees', e.target.value)} />
              </Field>
              <Field label="Annual revenue">
                <Input
                  value={draft.annualRevenue}
                  onChange={(e) => set('annualRevenue', e.target.value)}
                />
              </Field>
            </div>
            <Field label="Description" hint="What they do and where the account stands.">
              <Textarea
                rows={4}
                maxLength={500}
                value={draft.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </Field>
          </fieldset>

          <fieldset className="edit-group">
            <legend>Relationship</legend>
            <div className="edit-row">
              <Field label="Stage">
                <Select
                  value={draft.stage}
                  onValueChange={(v) => set('stage', v as Account['stage'])}
                  items={opts(STAGES)}
                />
              </Field>
              <Field label="Tier">
                <Select
                  value={draft.tier}
                  onValueChange={(v) => set('tier', v as Account['tier'])}
                  items={opts(TIERS)}
                />
              </Field>
            </div>
            <div className="edit-row">
              <Field label="Account owner">
                <Select
                  value={draft.owner}
                  onValueChange={(v) => set('owner', v)}
                  items={opts(OWNERS)}
                />
              </Field>
              <Field label="Renewal date" required error={errors.renewalDate}>
                <Input
                  type="date"
                  value={draft.renewalDate}
                  onChange={(e) => set('renewalDate', e.target.value)}
                />
              </Field>
            </div>
            <Field label="Annual recurring revenue (USD)" error={errors.arr}>
              <Input
                inputMode="numeric"
                leading="$"
                value={arrText}
                onChange={(e) => {
                  setArrText(e.target.value);
                  if (errors.arr) setErrors((x) => ({ ...x, arr: undefined }));
                }}
              />
            </Field>
          </fieldset>

          <fieldset className="edit-group">
            <legend>Main office</legend>
            <Field label="Phone">
              <Input type="tel" value={draft.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Address">
              <Input value={draft.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
          </fieldset>
        </div>

        <SheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Save changes
          </Button>
        </SheetFooter>
      </form>
    </Sheet>
  );
}
