// Mounts Storefront health in its frame. scripts/build-examples.mjs bundles this into site-dist/examples/service-health.html.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { ExampleFrame } from '../shared/react';
import { App } from './app';
import { events, live, service } from './data';
import { Controls } from './controls';

live.start();
createRoot(document.getElementById('example')!).render(
  <ExampleFrame service={service} events={events} controls={<Controls />}><App /></ExampleFrame>,
);
