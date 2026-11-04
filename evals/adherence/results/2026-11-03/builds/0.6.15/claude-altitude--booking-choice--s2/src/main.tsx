import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AltitudeProvider } from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { AppointmentForm } from './AppointmentForm';

function App() {
  return (
    <main>
      <AppointmentForm />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
  </AltitudeProvider>,
);
