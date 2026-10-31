import { MailIcon, SettingsIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
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
import { members, projects, type Project, type Workspace } from "@/data/workspace"

const statusVariant: Record<Project["status"], "default" | "secondary" | "destructive" | "outline"> = {
  "On track": "secondary",
  "At risk": "destructive",
  Completed: "outline",
}

export function WorkspaceOverview({
  workspace,
  onOpenSettings,
}: {
  workspace: Workspace
  onOpenSettings: () => void
}) {
  const visibleMembers = members.slice(0, 4)
  const openTasks = projects.reduce((sum, p) => sum + p.openTasks, 0)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-muted-foreground">Workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight">{workspace.name}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MailIcon className="size-3.5" aria-hidden />
            {workspace.contactEmail}
          </p>
        </div>
        <Button variant="outline" onClick={onOpenSettings}>
          <SettingsIcon data-icon="inline-start" aria-hidden />
          Workspace settings
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Active projects</CardDescription>
            <CardTitle className="text-2xl">
              {projects.filter((p) => p.status !== "Completed").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Open tasks</CardDescription>
            <CardTitle className="text-2xl">{openTasks}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Members</CardDescription>
            <CardTitle className="text-2xl">{members.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <AvatarGroup>
              {visibleMembers.map((m) => (
                <Avatar key={m.name} size="sm">
                  <AvatarFallback title={m.name}>{m.initials}</AvatarFallback>
                </Avatar>
              ))}
              <AvatarGroupCount>+{members.length - visibleMembers.length}</AvatarGroupCount>
            </AvatarGroup>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>Everything your team is working on this quarter.</CardDescription>
          <CardAction>
            <Badge variant="outline">{workspace.plan} plan</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Lead</TableHead>
                <TableHead className="text-right">Open tasks</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{p.lead}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.openTasks}</TableCell>
                  <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                    {p.dueDate}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
