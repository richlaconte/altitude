import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AltitudeProvider, Toaster } from 'altitude-design';
import 'altitude-design/altitude.css';
import './styles.css';
import { CustomerRecordScreen } from './CustomerRecord';

function App() {
  return (
    <>
      <CustomerRecordScreen />
      <Toaster />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider scheme="daylight">
    <App />
  </AltitudeProvider>,
);
