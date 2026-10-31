import { useState } from "react"
import { ChevronRightIcon, GlobeIcon, MapPinIcon } from "lucide-react"
import { toast } from "sonner"

import { AccountDetailsCard } from "@/components/account/account-details-card"
import { ActivityCard } from "@/components/account/activity-card"
import { ContactsCard } from "@/components/account/contacts-card"
import { EditAccountDialog } from "@/components/account/edit-account-dialog"
import { StageBadge } from "@/components/account/stage-badge"
import { Badge } from "@/components/ui/badge"
import { Toaster } from "@/components/ui/sonner"
import {
  account as initialAccount,
  activities,
  contacts,
  type Account,
} from "@/data/account"
import { initials } from "@/lib/format"

export default function App() {
  const [account, setAccount] = useState<Account>(initialAccount)
  const [editing, setEditing] = useState(false)

  // Headquarters city/state, e.g. "Columbus, OH" from the full street address.
  const location = account.address
    .split(",")
    .slice(-2)
    .map((s) => s.trim().replace(/\s+\d{5}(-\d{4})?$/, ""))
    .join(", ")

  return (
    <div className="min-h-svh bg-muted/40">
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="grid gap-4">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground">
                  Accounts
                </a>
              </li>
              <li aria-hidden>
                <ChevronRightIcon className="size-3.5" />
              </li>
              <li aria-current="page" className="truncate text-foreground">
                {account.name}
              </li>
            </ol>
          </nav>

          <div className="flex items-start gap-4">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground"
              aria-hidden
            >
              {initials(account.name)}
            </div>
            <div className="grid min-w-0 gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl font-semibold tracking-tight">
                  {account.name}
                </h1>
                <StageBadge stage={account.stage} />
                <Badge variant="outline">{account.tier}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>{account.industry}</span>
                {location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon className="size-3.5" aria-hidden />
                    {location}
                  </span>
                )}
                {account.website && (
                  <a
                    href={`https://${account.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <GlobeIcon className="size-3.5" aria-hidden />
                    {account.website}
                  </a>
                )}
                <span className="font-mono text-xs">{account.id}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <aside className="lg:sticky lg:top-6 lg:order-last">
            <AccountDetailsCard
              account={account}
              onEdit={() => setEditing(true)}
            />
          </aside>
          <div className="grid min-w-0 gap-6">
            <ContactsCard contacts={contacts} />
            <ActivityCard activities={activities} />
          </div>
        </div>
      </main>

      <EditAccountDialog
        account={account}
        open={editing}
        onOpenChange={setEditing}
        onSave={(next) => {
          setAccount(next)
          setEditing(false)
          toast.success("Account details saved")
        }}
      />
      <Toaster theme="light" position="bottom-right" />
    </div>
  )
}
