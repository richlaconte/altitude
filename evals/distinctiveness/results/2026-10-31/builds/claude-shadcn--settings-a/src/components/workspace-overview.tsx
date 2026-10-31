import { FolderKanbanIcon, ListTodoIcon, MailIcon, SettingsIcon, UsersIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { members, projects, type ProjectStatus, type Workspace } from "@/data"

const statusVariant: Record<ProjectStatus, "secondary" | "destructive" | "outline"> = {
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
  const activeProjects = projects.filter((p) => p.status !== "Completed").length
  const openTasks = projects.reduce((sum, p) => sum + p.openTasks, 0)

  const stats = [
    { label: "Active projects", value: activeProjects, icon: FolderKanbanIcon },
    { label: "Open tasks", value: openTasks, icon: ListTodoIcon },
    { label: "Members", value: members.length, icon: UsersIcon },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Workspace overview</p>
          <h1 className="text-2xl font-semibold tracking-tight">{workspace.name}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MailIcon className="size-3.5" aria-hidden />
            {workspace.contactEmail}
          </p>
        </div>
        <Button variant="outline" onClick={onOpenSettings}>
          <SettingsIcon data-icon="inline-start" />
          Workspace settings
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} size="sm">
            <CardHeader>
              <CardDescription className="flex items-center gap-1.5">
                <Icon className="size-4" aria-hidden />
                {label}
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>Everything your team is working on this quarter.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Open tasks</TableHead>
                <TableHead className="text-right">Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell className="text-muted-foreground">{project.lead}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[project.status]}>{project.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{project.openTasks}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{project.due}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <AvatarGroup>
          {members.slice(0, 4).map((m) => (
            <Avatar key={m.initials} size="sm">
              <AvatarFallback>{m.initials}</AvatarFallback>
            </Avatar>
          ))}
          <AvatarGroupCount>+{members.length - 4}</AvatarGroupCount>
        </AvatarGroup>
        {members.length} members · {workspace.plan}
      </div>
    </div>
  )
}
