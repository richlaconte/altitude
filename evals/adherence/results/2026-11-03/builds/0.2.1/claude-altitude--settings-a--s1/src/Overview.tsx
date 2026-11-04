import * as React from 'react';
import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'altitude-design';
import { members, projects, workspaceMeta, type ProjectStatus, type Workspace } from './data';

const statusTone: Record<ProjectStatus, 'positive' | 'caution' | 'critical' | 'neutral'> = {
  'On track': 'positive',
  'At risk': 'caution',
  Blocked: 'critical',
  Done: 'neutral',
};

export function Overview({ workspace, onOpenSettings }: { workspace: Workspace; onOpenSettings: () => void }) {
  const active = members.filter((m) => m.status === 'active').length;
  const openTasks = projects.reduce((sum, p) => sum + p.openTasks, 0);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1 className="page-title">{workspace.name}</h1>
          <p className="page-sub">
            {workspaceMeta.plan} plan · Contact <a href={`mailto:${workspace.contactEmail}`}>{workspace.contactEmail}</a>
          </p>
        </div>
        <Button variant="secondary" onClick={onOpenSettings}>
          Workspace settings
        </Button>
      </header>

      <div className="stats">
        <Card>
          <CardContent>
            <p className="stat-label">Active projects</p>
            <p className="stat-value">{projects.filter((p) => p.status !== 'Done').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="stat-label">Open tasks</p>
            <p className="stat-value">{openTasks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="stat-label">Seats used</p>
            <p className="stat-value">
              {workspaceMeta.seatsUsed}
              <span className="stat-of"> / {workspaceMeta.seatsTotal}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>Everything this workspace is working on.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="num">Open tasks</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.lead}</TableCell>
                  <TableCell>
                    <Badge tone={statusTone[p.status]}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="num">{p.openTasks}</TableCell>
                  <TableCell>{p.due}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            {members.length} people · {active} online now
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarGroup max={6}>
            {members.map((m) => (
              <Avatar key={m.name} name={m.name} status={m.status} size={36} />
            ))}
          </AvatarGroup>
        </CardContent>
      </Card>
    </>
  );
}
