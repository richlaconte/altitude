// Mounts the expense reports example in its frame. scripts/build-examples.mjs bundles this into site-dist/examples/expense-reports.html.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { ExampleFrame } from '../shared/react';
import { App, events, service } from './app';
import { Controls } from './controls';

createRoot(document.getElementById('example')!).render(<ExampleFrame service={service} events={events} controls={<Controls />}><App /></ExampleFrame>);
