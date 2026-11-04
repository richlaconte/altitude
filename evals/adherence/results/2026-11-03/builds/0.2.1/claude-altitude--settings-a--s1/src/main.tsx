import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AltitudeProvider, Toaster } from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { initialWorkspace, type Workspace } from './data';
import { Overview } from './Overview';
import { Settings } from './Settings';

type View = 'overview' | 'settings';

function App() {
  const [workspace, setWorkspace] = React.useState<Workspace>(initialWorkspace);
  const [view, setView] = React.useState<View>('settings');

  React.useEffect(() => {
    document.title = `${view === 'settings' ? 'Settings' : 'Overview'} · ${workspace.name}`;
    window.scrollTo(0, 0);
  }, [view, workspace.name]);

  return (
    <main className="page">
      {view === 'settings' ? (
        <Settings
          key="settings"
          workspace={workspace}
          onSave={setWorkspace}
          onCancel={() => setView('overview')}
        />
      ) : (
        <Overview workspace={workspace} onOpenSettings={() => setView('settings')} />
      )}
      <Toaster />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider scheme="daylight">
    <App />
  </AltitudeProvider>,
);
