import * as React from 'react';
import {
  Breadcrumb, Button, Card, CardContent, CardHeader, CardTitle,
  PageHeader, PageHeaderDescription, PageHeaderTitle, PropertyList, PropertyListItem,
} from 'altitude-design';
import type { Practice } from './practice';

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function Overview({ practice, onEditSettings }: { practice: Practice; onEditSettings: () => void }) {
  return (
    <>
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: 'Practice' }]} />}
        primary={<Button variant="primary" onClick={onEditSettings}>Edit practice settings</Button>}
      >
        <PageHeaderTitle>{practice.name}</PageHeaderTitle>
        <PageHeaderDescription>How your practice appears to clients when they book.</PageHeaderDescription>
      </PageHeader>
      <div className="page-body">
        <Card>
          <CardHeader><CardTitle>Practice details</CardTitle></CardHeader>
          <CardContent>
            <PropertyList aria-label="Practice details" layout="inline">
              <PropertyListItem label="Practice name" value={practice.name} />
              <PropertyListItem label="Contact email" value={practice.email} />
              <PropertyListItem label="Phone" value={practice.phone} />
              <PropertyListItem label="Address" value={practice.address} />
              <PropertyListItem label="Vets on the rota" value={String(practice.vets)} />
              <PropertyListItem label="Appointments this week" value={String(practice.appointmentsThisWeek)} />
            </PropertyList>
            <p className="meta">Last changed {dateFormat.format(practice.updatedAt)} by {practice.updatedBy}</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
