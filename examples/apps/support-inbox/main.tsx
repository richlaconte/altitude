// Mounts the support inbox example in its frame. scripts/build-examples.mjs bundles this into site-dist/examples/support-inbox.html.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { ExampleFrame } from '../shared/react';
import { App, events, service } from './app';

createRoot(document.getElementById('example')!).render(<ExampleFrame service={service} events={events}><App /></ExampleFrame>);
