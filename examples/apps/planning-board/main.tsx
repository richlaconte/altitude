// Mounts the Sprint 24 planning board in its frame. scripts/build-examples.mjs bundles this into site-dist/examples/planning-board.html.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { ExampleFrame } from '../shared/react';
import { App } from './app';
import { events, service } from './data';

createRoot(document.getElementById('example')!).render(<ExampleFrame service={service} events={events}><App /></ExampleFrame>);
