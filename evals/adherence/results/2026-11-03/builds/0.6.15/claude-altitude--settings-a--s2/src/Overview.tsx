import * as React from 'react';
import {
  Button, Card, CardContent, CardHeader, CardTitle, PageHeader, PageHeaderDescription, PageHeaderTitle,
  PropertyList, PropertyListItem,
} from 'altitude-design';
import type { Workspace } from './workspace';

export function Overview({ workspace, onOpenSettings }: { workspace: Workspace; onOpenSettings: () => void }) {
  return (
    <main className="page">
      <PageHeader primary={<Button variant="primary" onClick={onOpenSettings}>Edit workspace settings</Button>}>
        <PageHeaderTitle>{workspace.name}</PageHeaderTitle>
        <PageHeaderDescription>Workspace overview: who to contact and what the team is working on.</PageHeaderDescription>
      </PageHeader>
      <div className="overview-grid">
        <Card>
          <CardHeader><CardTitle>Workspace details</CardTitle></CardHeader>
          <CardContent>
            <PropertyList layout="inline" aria-label="Workspace details">
              <PropertyListItem label="Workspace name" value={workspace.name} />
              <PropertyListItem label="Contact email" value={workspace.contactEmail} />
              <PropertyListItem label="Members" value={String(workspace.members)} />
              <PropertyListItem label="Created" value={workspace.createdOn} />
            </PropertyList>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Active projects</CardTitle></CardHeader>
          <CardContent>
            <ul className="project-list">
              {workspace.projects.map((p) => (
                <li key={p.id}>
                  <span className="project-name">{p.name}</span>
                  <span className="project-meta">Led by {p.lead} · due {p.due}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
