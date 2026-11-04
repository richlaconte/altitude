import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {AltitudeProvider, Toaster} from 'altitude-design';
import 'altitude-design/altitude.css';
import {PracticeOverview} from './PracticeOverview';
import {PracticeSettings} from './PracticeSettings';
import {initialPractice, Practice} from './data';

type View = 'overview' | 'settings';

function App() {
  const [view, setView] = React.useState<View>('overview');
  const [practice, setPractice] = React.useState<Practice>(initialPractice);
  // Bumped on every save so the overview card settles to show what changed.
  const [savedAt, setSavedAt] = React.useState<number | null>(null);

  return (
    <div style={{minHeight: '100vh', background: 'var(--surface-ground)', color: 'var(--ink)'}}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-6)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <strong style={{fontSize: 15}}>PawBook</strong>
        <span style={{color: 'var(--ink-muted)', fontSize: 13}}>Signed in as Dr. Maya Okafor</span>
      </header>
      <main style={{maxWidth: 720, margin: '0 auto', padding: 'var(--space-8) var(--space-6)'}}>
        {view === 'overview' ? (
          <PracticeOverview practice={practice} savedAt={savedAt} onEdit={() => setView('settings')} />
        ) : (
          <PracticeSettings
            practice={practice}
            onSave={(next) => {
              setPractice(next);
              setSavedAt(Date.now());
            }}
            onCancel={() => setView('overview')}
          />
        )}
      </main>
      <Toaster />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
  </AltitudeProvider>,
);
