import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AltitudeProvider, Toaster } from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { RecipePage } from './RecipePage';

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider scheme="daylight">
    <RecipePage />
    <Toaster />
  </AltitudeProvider>,
);
