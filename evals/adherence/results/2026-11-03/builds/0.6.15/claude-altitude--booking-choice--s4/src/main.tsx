import * as React from 'react';
import { createRoot } from 'react-dom/client';
import 'altitude-design/altitude.css';
import './app.css';
import { AltitudeProvider } from 'altitude-design';
import { AppointmentRequest } from './AppointmentRequest';

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <AppointmentRequest />
  </AltitudeProvider>,
);
