import * as React from 'react';
import { createRoot } from 'react-dom/client';
import 'altitude-design/altitude.css';
import './styles.css';
import { CustomerRecord } from './CustomerRecord';
import { AltitudeProvider, Toaster } from 'altitude-design';

function App() {
  return (
    <main className="page">
      <CustomerRecord />
      <Toaster />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
  </AltitudeProvider>,
);
