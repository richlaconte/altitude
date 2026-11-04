import * as React from 'react';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Field, Input, toast} from 'altitude-design';
import {Practice, savePractice} from './data';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = {name?: string; email?: string};

function validate(name: string, email: string): Errors {
  const errors: Errors = {};
  if (!name.trim()) errors.name = 'Enter the practice name.';
  else if (name.trim().length > 80) errors.name = 'Keep the name under 80 characters.';
  if (!email.trim()) errors.email = 'Enter a contact email.';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter an email like frontdesk@yourclinic.com.';
  return errors;
}

export function PracticeSettings({
  practice,
  onSave,
  onCancel,
}: {
  practice: Practice;
  onSave: (next: Practice) => void;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(practice.name);
  const [email, setEmail] = React.useState(practice.email);
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savedCount, setSavedCount] = React.useState(0);

  const dirty = name.trim() !== practice.name || email.trim() !== practice.email;

  // After a first attempt, re-check as the person types so errors clear when fixed.
  React.useEffect(() => {
    if (submitted) setErrors(validate(name, email));
  }, [name, email, submitted]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const found = validate(name, email);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    const next = await savePractice({...practice, name: name.trim(), email: email.trim()});
    setSaving(false);
    setName(next.name);
    setEmail(next.email);
    setSubmitted(false);
    setSavedCount((n) => n + 1);
    onSave(next);
    toast({title: 'Practice settings saved', description: `${next.name} · ${next.email}`, tone: 'positive'});
  }

  return (
    <section aria-labelledby="settings-title">
      <p style={{margin: 0, color: 'var(--ink-muted)', fontSize: 13}}>Practice overview / Settings</p>
      <h1 id="settings-title" style={{margin: '0 0 var(--space-6)', fontSize: 26}}>
        Practice settings
      </h1>

      <form onSubmit={handleSubmit} noValidate>
        <Card status={saving ? 'pending' : undefined} settle={savedCount || undefined}>
          <CardHeader>
            <CardTitle>Practice details</CardTitle>
            <CardDescription>
              Shown to pet owners on booking pages and in appointment confirmation emails.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{display: 'grid', gap: 'var(--space-5)'}}>
              <Field label="Practice name" required error={errors.name}>
                <Input
                  name="practiceName"
                  autoComplete="organization"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field
                label="Contact email"
                required
                hint="Booking requests and owner replies go to this address."
                error={errors.email}
              >
                <Input
                  name="contactEmail"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={saving}
                />
              </Field>
            </div>
          </CardContent>
          <CardFooter>
            <div style={{display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', width: '100%'}}>
              <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving} disabled={!dirty || saving}>
                Save changes
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </section>
  );
}
