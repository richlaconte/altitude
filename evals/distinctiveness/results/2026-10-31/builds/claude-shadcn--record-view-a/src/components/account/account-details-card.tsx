import type { ReactNode } from "react"
import { ExternalLinkIcon, PencilIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { Account } from "@/data/account"
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatInteger,
} from "@/lib/format"

export function AccountDetailsCard({
  account,
  onEdit,
}: {
  account: Account
  onEdit: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <PencilIcon />
            Edit
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Item label="ARR">{formatCurrency(account.arr)}</Item>
          <Item label="Renewal">{formatDate(account.renewalDate)}</Item>
          <Item label="Tier">{account.tier}</Item>
          <Item label="Customer since">{formatDate(account.customerSince)}</Item>
        </dl>

        <Separator />

        <dl className="grid gap-3">
          <Item label="Account owner">{account.owner}</Item>
          <Item label="Industry">{account.industry}</Item>
          <Item label="Website">
            {account.website ? (
              <a
                href={`https://${account.website}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
              >
                {account.website}
                <ExternalLinkIcon className="size-3 text-muted-foreground" />
              </a>
            ) : null}
          </Item>
          <Item label="Main phone">
            {account.phone ? (
              <a
                href={`tel:${account.phone.replace(/[^\d+]/g, "")}`}
                className="underline-offset-4 hover:underline"
              >
                {account.phone}
              </a>
            ) : null}
          </Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Item label="Employees">
              {account.employees != null
                ? formatInteger(account.employees)
                : null}
            </Item>
            <Item label="Annual revenue">
              {account.annualRevenue != null
                ? formatCompactCurrency(account.annualRevenue)
                : null}
            </Item>
          </div>
          <Item label="Headquarters">{account.address || null}</Item>
        </dl>

        {account.description && (
          <>
            <Separator />
            <div className="grid gap-1">
              <h3 className="text-xs text-muted-foreground">About</h3>
              <p className="leading-relaxed">{account.description}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium [overflow-wrap:anywhere]">
        {children ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  )
}
