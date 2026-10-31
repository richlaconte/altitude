import { useState, type FormEvent, type ReactNode } from "react"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Practice } from "@/data"

type Errors = Partial<Record<keyof Practice, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(values: Practice): Errors {
  const errors: Errors = {}
  if (!values.name.trim()) {
    errors.name = "Enter the practice name."
  } else if (values.name.trim().length > 80) {
    errors.name = "Keep the practice name under 80 characters."
  }
  if (!values.email.trim()) {
    errors.email = "Enter a contact email."
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Enter an email like frontdesk@yourclinic.com."
  }
  return errors
}

export function PracticeSettings({
  practice,
  onSave,
  onCancel,
}: {
  practice: Practice
  onSave: (practice: Practice) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState<Practice>(practice)
  const [touched, setTouched] = useState<Partial<Record<keyof Practice, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const errors = validate(values)
  const isDirty =
    values.name.trim() !== practice.name || values.email.trim() !== practice.email
  const showError = (field: keyof Practice) =>
    (submitted || touched[field]) && errors[field]

  function update(field: keyof Practice, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length > 0) return
    onSave({ name: values.name.trim(), email: values.email.trim() })
  }

  function handleCancel() {
    if (isDirty) setConfirmOpen(true)
    else onCancel()
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <Button variant="link" className="-ml-2.5 px-2.5" onClick={handleCancel}>
          <ArrowLeftIcon data-icon="inline-start" />
          Practice overview
        </Button>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Practice settings
        </h1>
      </div>

      <form onSubmit={handleSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Practice profile</CardTitle>
          <CardDescription>
            Clients see these details on booking pages and appointment emails.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Field
            id="practice-name"
            label="Practice name"
            error={showError("name")}
          >
            <Input
              id="practice-name"
              name="name"
              autoComplete="organization"
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              aria-invalid={Boolean(showError("name"))}
              aria-describedby={showError("name") ? "practice-name-error" : undefined}
            />
          </Field>
          <Field
            id="practice-email"
            label="Contact email"
            hint="Booking confirmations and client replies go to this address."
            error={showError("email")}
          >
            <Input
              id="practice-email"
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => update("email", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              aria-invalid={Boolean(showError("email"))}
              aria-describedby={
                showError("email") ? "practice-email-error" : "practice-email-hint"
              }
            />
          </Field>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isDirty}>
            Save changes
          </Button>
        </CardFooter>
      </Card>
      </form>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              Your edits to the practice profile haven't been saved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Keep editing</DialogClose>
            <Button variant="destructive" onClick={onCancel}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string | false
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
