import { useRef, useState, type FormEvent } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Workspace } from "@/data/workspace"

type Fields = Pick<Workspace, "name" | "contactEmail">
type Errors = Partial<Record<keyof Fields, string>>

const NAME_MAX = 50
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(values: Fields): Errors {
  const errors: Errors = {}
  const name = values.name.trim()
  const email = values.contactEmail.trim()

  if (!name) errors.name = "Enter a workspace name."
  else if (name.length > NAME_MAX)
    errors.name = `Workspace name must be ${NAME_MAX} characters or fewer.`

  if (!email) errors.contactEmail = "Enter a contact email."
  else if (!EMAIL_PATTERN.test(email))
    errors.contactEmail = "Enter an email address like name@company.com."

  return errors
}

export function WorkspaceSettings({
  workspace,
  onSave,
  onCancel,
}: {
  workspace: Workspace
  onSave: (changes: Fields) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState<Fields>({
    name: workspace.name,
    contactEmail: workspace.contactEmail,
  })
  const [touched, setTouched] = useState<Partial<Record<keyof Fields, boolean>>>({})
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  const errors = validate(values)
  const visibleError = (field: keyof Fields) => (touched[field] ? errors[field] : undefined)
  const isDirty =
    values.name.trim() !== workspace.name ||
    values.contactEmail.trim() !== workspace.contactEmail

  const update = (field: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [field]: e.target.value }))

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTouched({ name: true, contactEmail: true })

    if (errors.name) return nameRef.current?.focus()
    if (errors.contactEmail) return emailRef.current?.focus()

    setSaving(true)
    // No backend — simulate a short network round-trip.
    await new Promise((resolve) => setTimeout(resolve, 600))
    const saved = { name: values.name.trim(), contactEmail: values.contactEmail.trim() }
    onSave(saved)
    setValues(saved)
    setSaving(false)
    toast.success("Workspace settings saved")
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="self-start" onClick={onCancel}>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden />
          Back to overview
        </Button>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Workspace settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage how {workspace.name} appears to your team.
          </p>
        </div>
      </header>

      <Card>
        <form onSubmit={handleSubmit} noValidate className="contents">
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>
              The workspace name is shown in the sidebar and in email notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pb-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                ref={nameRef}
                id="workspace-name"
                name="name"
                autoComplete="organization"
                value={values.name}
                onChange={update("name")}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                aria-invalid={!!visibleError("name")}
                aria-describedby="workspace-name-hint"
                disabled={saving}
              />
              <p
                id="workspace-name-hint"
                className={visibleError("name") ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
              >
                {visibleError("name") ?? `Up to ${NAME_MAX} characters.`}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="workspace-email">Contact email</Label>
              <Input
                ref={emailRef}
                id="workspace-email"
                name="contactEmail"
                type="email"
                autoComplete="email"
                value={values.contactEmail}
                onChange={update("contactEmail")}
                onBlur={() => setTouched((t) => ({ ...t, contactEmail: true }))}
                aria-invalid={!!visibleError("contactEmail")}
                aria-describedby="workspace-email-hint"
                disabled={saving}
              />
              <p
                id="workspace-email-hint"
                className={
                  visibleError("contactEmail") ? "text-sm text-destructive" : "text-sm text-muted-foreground"
                }
              >
                {visibleError("contactEmail") ??
                  "Billing receipts and security alerts are sent to this address."}
              </p>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isDirty || saving}>
              {saving && <Loader2Icon data-icon="inline-start" className="animate-spin" aria-hidden />}
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
