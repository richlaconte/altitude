import * as React from 'react';
import {Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from 'altitude-design';
import {Practice} from './data';

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '160px 1fr',
  gap: 'var(--space-3)',
  padding: 'var(--space-2) 0',
  borderBottom: '1px solid var(--line)',
  fontSize: 14,
};

function Row({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div style={rowStyle}>
      <dt style={{color: 'var(--ink-muted)'}}>{label}</dt>
      <dd style={{margin: 0}}>{children}</dd>
    </div>
  );
}

export function PracticeOverview({
  practice,
  savedAt,
  onEdit,
}: {
  practice: Practice;
  savedAt: number | null;
  onEdit: () => void;
}) {
  return (
    <section aria-labelledby="overview-title">
      <p style={{margin: 0, color: 'var(--ink-muted)', fontSize: 13}}>Practice</p>
      <h1 id="overview-title" style={{margin: '0 0 var(--space-6)', fontSize: 26}}>
        Practice overview
      </h1>

      <Card settle={savedAt ?? undefined}>
        <CardHeader>
          <div style={{display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap'}}>
            <CardTitle>{practice.name}</CardTitle>
            <Badge tone="positive">Accepting bookings</Badge>
          </div>
          <CardDescription>{practice.address}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl style={{margin: 0}}>
            <Row label="Contact email">{practice.email}</Row>
            <Row label="Phone">{practice.phone}</Row>
            <Row label="Opening hours">{practice.hours}</Row>
            <Row label="Veterinarians">{practice.vets}</Row>
            <Row label="Appointments this week">{practice.appointmentsThisWeek}</Row>
          </dl>
        </CardContent>
        <CardFooter>
          <Button variant="primary" onClick={onEdit}>
            Edit practice settings
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
