import { useState, type FormEvent, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  INDUSTRIES,
  OWNERS,
  STAGES,
  TIERS,
  type Account,
  type Stage,
} from "@/data/account"

type Draft = {
  name: string
  industry: string
  stage: Stage
  tier: string
  owner: string
  website: string
  phone: string
  employees: string
  revenueMillions: string
  address: string
  renewalDate: string
  description: string
}

type Errors = Partial<Record<keyof Draft, string>>

function toDraft(a: Account): Draft {
  return {
    name: a.name,
    industry: a.industry,
    stage: a.stage,
    tier: a.tier,
    owner: a.owner,
    website: a.website,
    phone: a.phone,
    employees: a.employees?.toString() ?? "",
    revenueMillions:
      a.annualRevenue == null ? "" : (a.annualRevenue / 1_000_000).toString(),
    address: a.address,
    renewalDate: a.renewalDate,
    description: a.description,
  }
}

function validate(d: Draft): Errors {
  const errors: Errors = {}
  if (!d.name.trim()) errors.name = "Account name is required."
  if (
    d.website.trim() &&
    !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(d.website.trim())
  ) {
    errors.website = "Enter a domain like example.com."
  }
  if (d.employees.trim() && !/^\d+$/.test(d.employees.replace(/,/g, "").trim())) {
    errors.employees = "Use a whole number."
  }
  if (
    d.revenueMillions.trim() &&
    !/^\d+(\.\d+)?$/.test(d.revenueMillions.replace(/,/g, "").trim())
  ) {
    errors.revenueMillions = "Use a number, e.g. 412 or 12.5."
  }
  if (!d.renewalDate) errors.renewalDate = "Renewal date is required."
  return errors
}

function fromDraft(d: Draft, base: Account): Account {
  const employees = d.employees.replace(/,/g, "").trim()
  const revenue = d.revenueMillions.replace(/,/g, "").trim()
  return {
    ...base,
    name: d.name.trim(),
    industry: d.industry,
    stage: d.stage,
    tier: d.tier,
    owner: d.owner,
    website: d.website.trim().replace(/^https?:\/\//i, "").replace(/\/$/, ""),
    phone: d.phone.trim(),
    employees: employees ? Number(employees) : null,
    annualRevenue: revenue ? Math.round(Number(revenue) * 1_000_000) : null,
    address: d.address.trim(),
    renewalDate: d.renewalDate,
    description: d.description.trim(),
  }
}

export function EditAccountDialog({
  account,
  open,
  onOpenChange,
  onSave,
}: {
  account: Account
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (account: Account) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        {/* Mounted only while open, so each opening starts from the saved values. */}
        <EditAccountForm account={account} onSave={onSave} />
      </DialogContent>
    </Dialog>
  )
}

function EditAccountForm({
  account,
  onSave,
}: {
  account: Account
  onSave: (account: Account) => void
}) {
  const [draft, setDraft] = useState(() => toDraft(account))
  const [errors, setErrors] = useState<Errors>({})

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const next = validate(draft)
    setErrors(next)
    if (Object.keys(next).length > 0) {
      const first = Object.keys(next)[0]
      document.getElementById(`account-${first}`)?.focus()
      return
    }
    onSave(fromDraft(draft, account))
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Edit account details</DialogTitle>
        <DialogDescription>
          Changes are visible to everyone on the account team.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Account name" error={errors.name} wide>
          <Input
            id="account-name"
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            aria-invalid={!!errors.name}
            autoComplete="off"
          />
        </Field>

        <Field id="industry" label="Industry">
          <OptionSelect
            id="account-industry"
            value={draft.industry}
            options={INDUSTRIES}
            onChange={(v) => set("industry", v)}
          />
        </Field>

        <Field id="tier" label="Tier">
          <OptionSelect
            id="account-tier"
            value={draft.tier}
            options={TIERS}
            onChange={(v) => set("tier", v)}
          />
        </Field>

        <Field id="stage" label="Lifecycle stage">
          <OptionSelect
            id="account-stage"
            value={draft.stage}
            options={STAGES}
            onChange={(v) => set("stage", v as Stage)}
          />
        </Field>

        <Field id="owner" label="Account owner">
          <OptionSelect
            id="account-owner"
            value={draft.owner}
            options={OWNERS}
            onChange={(v) => set("owner", v)}
          />
        </Field>

        <Field id="website" label="Website" error={errors.website}>
          <Input
            id="account-website"
            value={draft.website}
            onChange={(e) => set("website", e.target.value)}
            aria-invalid={!!errors.website}
            placeholder="example.com"
          />
        </Field>

        <Field id="phone" label="Main phone">
          <Input
            id="account-phone"
            type="tel"
            value={draft.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </Field>

        <Field id="employees" label="Employees" error={errors.employees}>
          <Input
            id="account-employees"
            inputMode="numeric"
            value={draft.employees}
            onChange={(e) => set("employees", e.target.value)}
            aria-invalid={!!errors.employees}
          />
        </Field>

        <Field
          id="revenueMillions"
          label="Annual revenue (USD millions)"
          error={errors.revenueMillions}
        >
          <Input
            id="account-revenueMillions"
            inputMode="decimal"
            value={draft.revenueMillions}
            onChange={(e) => set("revenueMillions", e.target.value)}
            aria-invalid={!!errors.revenueMillions}
          />
        </Field>

        <Field id="renewalDate" label="Renewal date" error={errors.renewalDate}>
          <Input
            id="account-renewalDate"
            type="date"
            value={draft.renewalDate}
            onChange={(e) => set("renewalDate", e.target.value)}
            aria-invalid={!!errors.renewalDate}
          />
        </Field>

        <Field id="address" label="Headquarters address" wide>
          <Input
            id="account-address"
            value={draft.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </Field>

        <Field id="description" label="About" wide>
          <Textarea
            id="account-description"
            rows={3}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit">Save changes</Button>
      </DialogFooter>
    </form>
  )
}

function Field({
  id,
  label,
  error,
  wide,
  children,
}: {
  id: string
  label: string
  error?: string
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className={wide ? "grid gap-1.5 sm:col-span-2" : "grid gap-1.5"}>
      <Label htmlFor={`account-${id}`}>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function OptionSelect({
  id,
  value,
  options,
  onChange,
}: {
  id: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v)
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
