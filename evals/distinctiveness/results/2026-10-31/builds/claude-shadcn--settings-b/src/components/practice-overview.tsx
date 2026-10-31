import type { ComponentType, ReactNode } from "react"
import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon, SettingsIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  practiceDetails,
  todayStats,
  upcomingAppointments,
  type Appointment,
  type Practice,
} from "@/data"

const statusVariant: Record<Appointment["status"], "default" | "secondary" | "outline"> = {
  "Checked in": "default",
  Confirmed: "secondary",
  Pending: "outline",
}

export function PracticeOverview({
  practice,
  onOpenSettings,
}: {
  practice: Practice
  onOpenSettings: () => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Practice overview</p>
          <h1 className="truncate font-heading text-2xl font-semibold tracking-tight">
            {practice.name}
          </h1>
        </div>
        <Button variant="outline" onClick={onOpenSettings}>
          <SettingsIcon data-icon="inline-start" />
          Practice settings
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {todayStats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {stat.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Up next</CardTitle>
            <CardDescription>Thursday, October 30</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Reason</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingAppointments.map((appt) => (
                  <TableRow key={appt.time + appt.pet}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {appt.time}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{appt.pet}</div>
                      <div className="text-xs text-muted-foreground">
                        {appt.species} · {appt.owner}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div>{appt.reason}</div>
                      <div className="text-xs text-muted-foreground">{appt.vet}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={statusVariant[appt.status]}>{appt.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Practice details</CardTitle>
            <CardDescription>Shown to clients when they book</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={onOpenSettings}>
                Edit
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-3">
              <DetailRow icon={MailIcon} label="Contact email">
                <span className="break-all">{practice.email}</span>
              </DetailRow>
              <DetailRow icon={PhoneIcon} label="Phone">
                {practiceDetails.phone}
              </DetailRow>
              <DetailRow icon={MapPinIcon} label="Address">
                {practiceDetails.address}
              </DetailRow>
              <DetailRow icon={ClockIcon} label="Hours">
                {practiceDetails.hours}
              </DetailRow>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  )
}
