import {
  CalendarIcon,
  MailIcon,
  PhoneIcon,
  StickyNoteIcon,
  type LucideIcon,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Activity, ActivityType } from "@/data/account"
import { formatDateTime } from "@/lib/format"

const typeMeta: Record<ActivityType, { label: string; icon: LucideIcon }> = {
  meeting: { label: "Meeting", icon: CalendarIcon },
  call: { label: "Call", icon: PhoneIcon },
  email: { label: "Email", icon: MailIcon },
  note: { label: "Note", icon: StickyNoteIcon },
}

const filters: { value: "all" | ActivityType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "meeting", label: "Meetings" },
  { value: "call", label: "Calls" },
  { value: "email", label: "Emails" },
  { value: "note", label: "Notes" },
]

export function ActivityCard({ activities }: { activities: Activity[] }) {
  const sorted = [...activities].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Meetings, calls, emails and notes</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="max-w-full overflow-x-auto">
            {filters.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {filters.map((f) => {
            const items =
              f.value === "all"
                ? sorted
                : sorted.filter((a) => a.type === f.value)
            return (
              <TabsContent key={f.value} value={f.value} className="pt-3">
                {items.length === 0 ? (
                  <p className="py-6 text-center text-muted-foreground">
                    No {f.label.toLowerCase()} logged yet.
                  </p>
                ) : (
                  <ol>
                    {items.map((a, i) => (
                      <ActivityItem
                        key={a.id}
                        activity={a}
                        last={i === items.length - 1}
                      />
                    ))}
                  </ol>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>
    </Card>
  )
}

function ActivityItem({
  activity,
  last,
}: {
  activity: Activity
  last: boolean
}) {
  const { label, icon: Icon } = typeMeta[activity.type]

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!last && (
        <span
          className="absolute top-8 bottom-0 left-4 w-px -translate-x-1/2 bg-border"
          aria-hidden
        />
      )}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4" />
        <span className="sr-only">{label}</span>
      </div>
      <div className="grid min-w-0 flex-1 gap-1 pt-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <h3 className="font-medium">{activity.title}</h3>
          <time
            dateTime={activity.at}
            className="text-xs whitespace-nowrap text-muted-foreground"
          >
            {formatDateTime(activity.at)}
          </time>
        </div>
        <p className="leading-relaxed text-muted-foreground">{activity.body}</p>
        <p className="text-xs text-muted-foreground">
          {label} by <span className="text-foreground">{activity.by}</span>
          {activity.with?.length ? (
            <>
              {" "}
              with{" "}
              <span className="text-foreground">
                {activity.with.join(", ")}
              </span>
            </>
          ) : null}
        </p>
      </div>
    </li>
  )
}
