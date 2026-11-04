import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AltitudeProvider } from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { Overview } from './Overview';
import { Settings, type LeaveGuard } from './Settings';
import { getWorkspace, type WorkspaceSettings } from './workspace';

type Route = 'overview' | 'settings';
const OVERVIEW_HASH = '#/';
const SETTINGS_HASH = '#/settings';
const parse = (hash: string): Route => (hash === SETTINGS_HASH ? 'settings' : 'overview');

function App() {
  const [route, setRoute] = React.useState<Route>(() => parse(location.hash));
  const [workspace, setWorkspace] = React.useState(getWorkspace);
  const guard = React.useRef<LeaveGuard | null>(null);
  const routeRef = React.useRef(route);
  routeRef.current = route;
  const registerGuard = React.useCallback((g: LeaveGuard | null) => { guard.current = g; }, []);

  // Navigation without asking: used once the person has already decided.
  const go = React.useCallback((next: Route) => {
    const hash = next === 'settings' ? SETTINGS_HASH : OVERVIEW_HASH;
    if (location.hash !== hash) history.pushState(null, '', hash);
    setRoute(next);
    window.scrollTo(0, 0);
  }, []);

  // Breadcrumb links and browser Back/Forward change the hash; ask the settings page before leaving it.
  React.useEffect(() => {
    const onHashChange = async () => {
      const next = parse(location.hash);
      if (routeRef.current === 'settings' && next !== 'settings' && guard.current) {
        history.pushState(null, '', SETTINGS_HASH);
        if (await guard.current('navigation')) go(next);
        return;
      }
      setRoute(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [go]);

  const onSaved = React.useCallback((value: WorkspaceSettings) => setWorkspace((w) => ({ ...w, ...value })), []);

  return route === 'settings'
    ? <Settings initial={{ name: workspace.name, contactEmail: workspace.contactEmail }}
        onSaved={onSaved} onLeave={() => go('overview')} registerGuard={registerGuard} />
    : <Overview workspace={workspace} onOpenSettings={() => go('settings')} />;
}

createRoot(document.getElementById('root')!).render(<AltitudeProvider><App /></AltitudeProvider>);
