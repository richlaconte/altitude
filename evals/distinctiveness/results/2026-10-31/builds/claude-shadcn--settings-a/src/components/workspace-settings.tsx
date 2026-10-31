import { useState, type FormEvent } from "react"
import { ArrowLeftIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

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
import type { Workspace } from "@/data"

const NAME_MAX = 50
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Fields = Pick<Workspace, "name" | "contactEmail">
type Errors = Partial<Record<keyof Fields, string>>

function validate({ name, contactEmail }: Fields): Errors {
  const errors: Errors = {}
  if (!name.trim()) errors.name = "Enter a workspace name."
  else if (name.trim().length > NAME_MAX)
    errors.name = `Workspace name must be ${NAME_MAX} characters or fewer.`
  if (!contactEmail.trim()) errors.contactEmail = "Enter a contact email."
  else if (!EMAIL_PATTERN.test(contactEmail.trim()))
    errors.contactEmail = "Enter an email address like name@company.com."
  return errors
}

export function WorkspaceSettings({
  workspace,
  onSave,
  onCancel,
}: {
  workspace: Workspace
  onSave: (fields: Fields) => void
  onCancel: () => void
}) {
  const [fields, setFields] = useState<Fields>({
    name: workspace.name,
    contactEmail: workspace.contactEmail,
  })
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const isDirty =
    fields.name.trim() !== workspace.name ||
    fields.contactEmail.trim() !== workspace.contactEmail

  function update(key: keyof Fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(fields)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalid = nextErrors.name ? "workspace-name" : "contact-email"
      document.getElementById(firstInvalid)?.focus()
      return
    }

    setSaving(true)
    // Simulated network request; there is no backend.
    await new Promise((resolve) => setTimeout(resolve, 600))
    const trimmed = { name: fields.name.trim(), contactEmail: fields.contactEmail.trim() }
    onSave(trimmed)
    setFields(trimmed)
    setSaving(false)
    toast.success("Workspace settings saved")
  }

  function handleCancel() {
    if (isDirty) setConfirmDiscard(true)
    else onCancel()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={handleCancel}>
          <ArrowLeftIcon data-icon="inline-start" />
          Workspace overview
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Workspace settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage how {workspace.name} appears to members and where we send account notices.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>These details are visible to everyone in the workspace.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pb-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                value={fields.name}
                onChange={(e) => update("name", e.target.value)}
                autoComplete="organization"
                aria-invalid={!!errors.name}
                aria-describedby="workspace-name-hint"
                disabled={saving}
              />
              <p
                id="workspace-name-hint"
                className={errors.name ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
              >
                {errors.name ?? "Shown in the sidebar, invitations, and email notifications."}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-email">Contact email</Label>
              <Input
                id="contact-email"
                type="email"
                value={fields.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
                autoComplete="email"
                aria-invalid={!!errors.contactEmail}
                aria-describedby="contact-email-hint"
                disabled={saving}
              />
              <p
                id="contact-email-hint"
                className={
                  errors.contactEmail ? "text-sm text-destructive" : "text-sm text-muted-foreground"
                }
              >
                {errors.contactEmail ?? "Billing receipts and security alerts are sent here."}
              </p>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isDirty || saving}>
              {saving && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              Your edits to the workspace settings will be lost.
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
