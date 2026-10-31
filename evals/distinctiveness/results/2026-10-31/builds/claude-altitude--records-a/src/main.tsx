import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {AltitudeProvider} from 'altitude-design';
import 'altitude-design/altitude.css';
import './projects.css';
import {ProjectsScreen} from './ProjectsScreen';

createRoot(document.getElementById('root')!).render(<AltitudeProvider><ProjectsScreen /></AltitudeProvider>);
