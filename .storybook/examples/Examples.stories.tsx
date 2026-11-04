// The example apps (#399), one story each, so people browsing components can open the apps from the same place (#428).
// Each app renders through ExampleContent: the app and its fixtures drawer, inside the one AltitudeProvider that
// .storybook/preview.tsx gives every story. The toolbar owns the scheme, motion and contrast, so the drawer leaves out
// its page controls. Hand-written, like ../adapters/; .storybook/main.ts aliases altitude-design to the sources, as
// scripts/build-examples.mjs does.
//
// Each app keeps its saved state under its own key (altitude-example:<name>), so the stories don't share data even
// though they share an origin, and Reset in the drawer puts an app back to the start.
import * as React from 'react';
import { ExampleContent } from '../../examples/apps/shared/react';
import '../../examples/apps/shared/examples.css';

import { App as AdminConsoleApp } from '../../examples/apps/admin-console/app';
import { events as adminEvents, service as adminService } from '../../examples/apps/admin-console/data';
import adminMeta from '../../examples/apps/admin-console/app.json';
import '../../examples/apps/admin-console/app.css';

import { App as BookingApp } from '../../examples/apps/booking/app';
import { events as bookingEvents, service as bookingService } from '../../examples/apps/booking/data';
import bookingMeta from '../../examples/apps/booking/app.json';
import '../../examples/apps/booking/app.css';

import { App as DocsEditorApp, events as docsEvents, service as docsService } from '../../examples/apps/docs-editor/app';
import docsMeta from '../../examples/apps/docs-editor/app.json';
import '../../examples/apps/docs-editor/app.css';

import { App as HelloApp, events as helloEvents, service as helloService } from '../../examples/apps/hello/app';
import helloMeta from '../../examples/apps/hello/app.json';
import '../../examples/apps/hello/app.css';

import { App as ServiceHealthApp } from '../../examples/apps/service-health/app';
import { events as healthEvents, live as healthLive, service as healthService } from '../../examples/apps/service-health/data';
import { Controls as HealthControls } from '../../examples/apps/service-health/controls';
import healthMeta from '../../examples/apps/service-health/app.json';
import '../../examples/apps/service-health/app.css';

import { App as PlanningBoardApp } from '../../examples/apps/planning-board/app';
import { events as boardEvents, service as boardService } from '../../examples/apps/planning-board/data';
import boardMeta from '../../examples/apps/planning-board/app.json';
import '../../examples/apps/planning-board/app.css';

export default {
  title: 'Examples',
  parameters: { layout: 'fullscreen' },
};

// The page behind an app: the frame's ground and type, without a second provider.
const story = (name: string, meta: { title: string; description: string }, render: () => React.ReactNode) => ({
  name,
  render: () => <div className="ex-frame">{render()}</div>,
  parameters: { docs: { description: { story: meta.description } } },
});

export const AdminConsole = story('Admin console', adminMeta, () => <ExampleContent service={adminService} events={adminEvents}><AdminConsoleApp /></ExampleContent>);
export const Booking = story('Booking', bookingMeta, () => <ExampleContent service={bookingService} events={bookingEvents}><BookingApp /></ExampleContent>);
export const PlanningBoard = story('Planning board', boardMeta, () => <ExampleContent service={boardService} events={boardEvents}><PlanningBoardApp /></ExampleContent>);
export const ServiceHealth = story('Service health', healthMeta, () => { healthLive.start(); return <ExampleContent service={healthService} events={healthEvents} controls={<HealthControls />}><ServiceHealthApp /></ExampleContent>; });
export const DocsEditor = story('Docs editor', docsMeta, () => <ExampleContent service={docsService} events={docsEvents} session><DocsEditorApp /></ExampleContent>);
export const Hello = story('Hello (starter)', helloMeta, () => <ExampleContent service={helloService} events={helloEvents}><HelloApp /></ExampleContent>);
