import * as React from 'react';
import { Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from 'altitude-design';
import type { Practice } from './data';

interface Props {
  practice: Practice;
  /** Changes after each save so the card settles. */
  savedAt: number;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onEdit: () => void;
}

export function PracticeOverview({ practice, savedAt, headingRef, onEdit }: Props) {
  return (
    <section aria-labelledby="overview-title" className="screen">
      <header className="screen-header">
        <p className="eyebrow">Practice</p>
        <h1 id="overview-title" ref={headingRef} tabIndex={-1}>Practice overview</h1>
      </header>

      <Card settle={savedAt || undefined}>
        <CardHeader>
          <CardTitle>{practice.name}</CardTitle>
          <CardDescription>Shown to pet owners on booking pages and confirmation emails.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="details">
            <div><dt>Contact email</dt><dd>{practice.email}</dd></div>
            <div><dt>Phone</dt><dd>{practice.phone}</dd></div>
            <div><dt>Address</dt><dd>{practice.address}</dd></div>
            <div><dt>Opening hours</dt><dd>{practice.hours}</dd></div>
            <div><dt>Veterinarians</dt><dd>{practice.vets}</dd></div>
            <div><dt>Appointments this week</dt><dd>{practice.appointmentsThisWeek}</dd></div>
            <div>
              <dt>Online booking</dt>
              <dd>
                {practice.onlineBooking
                  ? <Badge tone="positive">Accepting bookings</Badge>
                  : <Badge tone="caution">Paused</Badge>}
              </dd>
            </div>
          </dl>
        </CardContent>
        <CardFooter>
          <Button variant="primary" onClick={onEdit}>Edit practice settings</Button>
        </CardFooter>
      </Card>
    </section>
  );
}
