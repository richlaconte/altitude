import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {AltitudeProvider} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import {PracticeOverview} from './PracticeOverview';
import {PracticeSettings, type LeaveGuard} from './PracticeSettings';
import {initialPractice, type Practice} from './practice';

type Route = 'overview' | 'settings';
const ROUTES: Record<Route, string> = {overview: '#/practice', settings: '#/practice/settings'};
const routeFromHash = (): Route => (window.location.hash === ROUTES.settings ? 'settings' : 'overview');

function App() {
  const [route, setRoute] = React.useState<Route>(routeFromHash);
  const [practice, setPractice] = React.useState<Practice>(initialPractice);
  // The settings screen registers a guard while it's mounted so every way out asks before discarding a draft.
  const guard = React.useRef<LeaveGuard | null>(null);

  const go = React.useCallback((next: Route) => {
    window.history.pushState(null, '', ROUTES[next]);
    setRoute(next);
    window.scrollTo(0, 0);
  }, []);

  React.useEffect(() => {
    const onPop = async () => {
      const next = routeFromHash();
      if (route === 'settings' && next !== 'settings' && guard.current) {
        // Browser Back: put the settings entry back until the person decides about their draft.
        window.history.pushState(null, '', ROUTES.settings);
        if (await guard.current('back')) {
          window.history.replaceState(null, '', ROUTES[next]);
          setRoute(next);
        }
        return;
      }
      setRoute(next);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [route]);

  const leaveSettings = async () => {
    if (!guard.current || (await guard.current('navigation'))) go('overview');
  };

  return route === 'settings' ? (
    <PracticeSettings
      practice={practice}
      onSaved={setPractice}
      onLeave={() => go('overview')}
      onNavigateOverview={leaveSettings}
      guardRef={guard}
    />
  ) : (
    <PracticeOverview practice={practice} onEditSettings={() => go('settings')} />
  );
}

if (!window.location.hash) window.history.replaceState(null, '', ROUTES.overview);
createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
  </AltitudeProvider>,
);
