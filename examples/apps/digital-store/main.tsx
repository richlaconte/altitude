// Mounts the digital store example in its frame. scripts/build-examples.mjs bundles this into site-dist/examples/digital-store.html.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { ExampleFrame } from '../shared/react';
import { App, service } from './app';
import { Controls } from './controls';

createRoot(document.getElementById('example')!).render(<ExampleFrame service={service} controls={<Controls />}><App /></ExampleFrame>);
