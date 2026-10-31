import * as React from 'react';
import * as A from 'altitude-design';
import {practiceDetails, todaysAppointments, type Practice} from './practice';

export function PracticeOverview({practice, onEditSettings}: {practice: Practice; onEditSettings: () => void}) {
  return (
    <main className="vc-page">
      <A.PageHeader
        breadcrumb={<A.Breadcrumb items={[{label: 'Practice overview'}]} />}
        primary={<A.Button variant="primary" onClick={onEditSettings}>Practice settings</A.Button>}
      >
        <A.PageHeaderTitle>{practice.name}</A.PageHeaderTitle>
        <A.PageHeaderDescription>Today’s bookings and how clients reach the practice.</A.PageHeaderDescription>
      </A.PageHeader>
      <div className="vc-grid">
        <A.Card>
          <A.CardHeader>
            <A.CardTitle>Today’s appointments</A.CardTitle>
            <A.CardDescription>{todaysAppointments.length} booked</A.CardDescription>
          </A.CardHeader>
          <A.CardContent>
            <ul className="vc-appointments">
              {todaysAppointments.map((a) => (
                <li key={a.time}>
                  <span className="vc-time">{a.time}</span>
                  <span><strong>{a.patient}</strong> · {a.owner}<br /><span className="vc-muted">{a.reason}</span></span>
                </li>
              ))}
            </ul>
          </A.CardContent>
        </A.Card>
        <A.Card>
          <A.CardHeader>
            <A.CardTitle>Practice details</A.CardTitle>
          </A.CardHeader>
          <A.CardContent>
            <A.PropertyList aria-label="Practice details" layout="inline">
              <A.PropertyListItem label="Practice name" value={practice.name} />
              <A.PropertyListItem label="Contact email" value={practice.contactEmail} />
              <A.PropertyListItem label="Phone" value={practiceDetails.phone} />
              <A.PropertyListItem label="Address" value={practiceDetails.address} />
              <A.PropertyListItem label="Opening hours" value={practiceDetails.hours} />
              <A.PropertyListItem label="Veterinarians" value={practiceDetails.vets} />
            </A.PropertyList>
          </A.CardContent>
        </A.Card>
      </div>
    </main>
  );
}
