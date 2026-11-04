import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AltitudeProvider } from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { AppointmentRequest } from './AppointmentRequest';

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider scheme="daylight">
    <AppointmentRequest />
  </AltitudeProvider>,
);
