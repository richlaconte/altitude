import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AltitudeProvider, Toaster, toast } from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { initialPractice, type Practice, type PracticeSettings } from './data';
import { PracticeOverview } from './PracticeOverview';
import { PracticeSettingsForm } from './PracticeSettingsForm';

type View = 'overview' | 'settings';

function App() {
  const [practice, setPractice] = React.useState<Practice>(initialPractice);
  const [view, setView] = React.useState<View>('overview');
  const [savedAt, setSavedAt] = React.useState(0);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const firstRender = React.useRef(true);

  // Move focus to the new screen's heading when the view changes (not on first load).
  React.useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus();
  }, [view]);

  const save = (settings: PracticeSettings) => {
    const changed = settings.name !== practice.name || settings.email !== practice.email;
    setPractice((p) => ({ ...p, ...settings }));
    setView('overview');
    if (changed) {
      setSavedAt(Date.now());
      toast({ title: 'Practice settings saved', tone: 'positive' });
    }
  };

  return (
    <main className="app">
      {view === 'overview' ? (
        <PracticeOverview
          practice={practice}
          savedAt={savedAt}
          headingRef={headingRef}
          onEdit={() => setView('settings')}
        />
      ) : (
        <PracticeSettingsForm
          initial={practice}
          headingRef={headingRef}
          onSave={save}
          onCancel={() => setView('overview')}
        />
      )}
      <Toaster />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider scheme="daylight" accent="#0f8a6b">
    <App />
  </AltitudeProvider>,
);
