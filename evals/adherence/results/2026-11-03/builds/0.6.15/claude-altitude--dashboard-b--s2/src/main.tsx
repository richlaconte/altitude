import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AltitudeProvider } from 'altitude-design';
import 'altitude-design/altitude.css';
import './dashboard.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<AltitudeProvider><App /></AltitudeProvider>);
