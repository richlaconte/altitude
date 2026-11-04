import * as React from 'react';
import { Button, Card, CardContent, CardFooter, Field, Input } from 'altitude-design';
import type { PracticeSettings } from './data';

interface Props {
  initial: PracticeSettings;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onSave: (settings: PracticeSettings) => void;
  onCancel: () => void;
}

type Errors = Partial<Record<keyof PracticeSettings, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ name, email }: PracticeSettings): Errors {
  const errors: Errors = {};
  if (!name) errors.name = 'Enter the practice name.';
  else if (name.length > 80) errors.name = 'Keep the practice name to 80 characters or fewer.';
  if (!email) errors.email = 'Enter a contact email.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter an email address like frontdesk@yourclinic.com.';
  return errors;
}

export function PracticeSettingsForm({ initial, headingRef, onSave, onCancel }: Props) {
  const [name, setName] = React.useState(initial.name);
  const [email, setEmail] = React.useState(initial.email);
  const [errors, setErrors] = React.useState<Errors>({});
  const nameRef = React.useRef<HTMLInputElement>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const values = { name: name.trim(), email: email.trim() };
    const found = validate(values);
    setErrors(found);
    if (found.name) nameRef.current?.focus();
    else if (found.email) emailRef.current?.focus();
    else onSave(values);
  };

  return (
    <section aria-labelledby="settings-title" className="screen">
      <header className="screen-header">
        <p className="eyebrow">Practice overview / Settings</p>
        <h1 id="settings-title" ref={headingRef} tabIndex={-1}>Practice settings</h1>
        <p className="lede">Update how your clinic appears to pet owners when they book.</p>
      </header>

      <Card>
        <form noValidate onSubmit={submit}>
          <CardContent>
            <div className="fields">
              <Field
                label="Practice name"
                hint="Appears on your booking page and appointment reminders."
                error={errors.name}
                required
              >
                <Input
                  ref={nameRef}
                  name="practiceName"
                  autoComplete="organization"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                  }}
                />
              </Field>
              <Field
                label="Contact email"
                hint="Where booking requests and replies from pet owners are sent."
                error={errors.email}
                required
              >
                <Input
                  ref={emailRef}
                  type="email"
                  name="contactEmail"
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                  }}
                />
              </Field>
            </div>
          </CardContent>
          <CardFooter className="form-actions">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit" variant="primary">Save changes</Button>
          </CardFooter>
        </form>
      </Card>
    </section>
  );
}
