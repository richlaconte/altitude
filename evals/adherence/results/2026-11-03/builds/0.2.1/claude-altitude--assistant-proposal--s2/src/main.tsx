import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AltitudeProvider, Toaster } from 'altitude-design';
import 'altitude-design/altitude.css';
import './styles.css';
import { CustomerRecord } from './CustomerRecord';

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
