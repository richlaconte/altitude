import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AltitudeProvider, Toaster } from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { getPractice, subscribe } from './practice';
import { Overview } from './Overview';
import { PracticeSettings, type LeaveGuard } from './PracticeSettings';

type Route = 'overview' | 'settings';
const HASH: Record<Route, string> = { overview: '#/practice', settings: '#/practice/settings' };
const routeFromHash = (): Route => (location.hash === HASH.settings ? 'settings' : 'overview');

function App() {
  const practice = React.useSyncExternalStore(subscribe, getPractice);
  const [route, setRoute] = React.useState<Route>(routeFromHash);
  const guard = React.useRef<LeaveGuard | null>(null);
  const registerGuard = React.useCallback((g: LeaveGuard | null) => { guard.current = g; }, []);
  const routeRef = React.useRef(route);
  routeRef.current = route;

  // Every navigation (in-app links, breadcrumb, browser Back/Forward) passes the settings page's unsaved-changes guard.
  React.useEffect(() => {
    const onHash = async () => {
      const next = routeFromHash();
      if (next === routeRef.current) return;
      if (routeRef.current === 'settings' && guard.current) {
        history.replaceState(null, '', HASH.settings); // stay put while the person decides
        if (!(await guard.current('navigation'))) return;
        history.replaceState(null, '', HASH[next]);
      }
      setRoute(next);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Moving to a new view: put focus on its heading so screen reader and keyboard users start at the top.
  const firstRender = React.useRef(true);
  React.useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const h1 = document.querySelector<HTMLElement>('main h1');
    if (h1) { h1.tabIndex = -1; h1.focus(); }
  }, [route]);

  const go = (to: Route) => { history.pushState(null, '', HASH[to]); setRoute(to); };

  return (
    <main className="page">
      {route === 'settings'
        ? <PracticeSettings key="settings" practice={practice} registerGuard={registerGuard} onLeave={() => go('overview')} />
        : <Overview practice={practice} onEditSettings={() => go('settings')} />}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
    <Toaster />
  </AltitudeProvider>,
);
