// "Altitude for agents" (site-dist/agent.html, #286): the scripted agent run from build/fixtures/patterns/agent-harness.jsx
// in a complete harness, with the moment rail, notes, and the modes to check each moment in. The same file is the
// AgentHarness story and its render in CI. Below it, the orchestration view (build/fixtures/patterns/agent-orchestration.jsx):
// seven agents on one job, supervised from one screen.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AltitudeProvider, Switch, Tabs, TabsList, TabsTrigger } from '../project/components/src/index';
import type { BuiltInScheme } from '../project/components/src/index';
// @ts-ignore: a checked .jsx fixture, shared with Storybook and CI
import { App as Harness } from '../build/fixtures/patterns/agent-harness.jsx';
// @ts-ignore: a checked .jsx fixture, shared with Storybook and CI
import { App as Orchestration } from '../build/fixtures/patterns/agent-orchestration.jsx';

const SCHEMES: { id: BuiltInScheme; label: string }[] = [
  { id: 'daylight', label: 'Daylight' }, { id: 'nightfall', label: 'Nightfall' },
];
const systemScheme = (): BuiltInScheme => (matchMedia('(prefers-color-scheme: dark)').matches ? 'nightfall' : 'daylight');

function Page() {
  const [scheme, setScheme] = React.useState<BuiltInScheme>(systemScheme);
  const [reduced, setReduced] = React.useState(false);
  const [more, setMore] = React.useState(false);
  React.useLayoutEffect(() => { document.body.setAttribute('data-theme', scheme); }, [scheme]);
  return (
    <AltitudeProvider scheme={scheme} motion={reduced ? 'reduced' : 'system'} contrast={more ? 'more' : 'system'} className="page">
      <a className="skip" href="#moments">Skip to the moments</a>
      <header className="nav">
        <div className="wrap nav-row">
          <a className="brand" href="./" aria-label="Altitude, home"><span className="mark" aria-hidden="true"><i /><i /><i /></span>Altitude</a>
          <nav className="nav-links" aria-label="Site"><a href="./">Home</a><a href="./storybook/">Components</a><a href="https://github.com/richlaconte/altitude">GitHub</a></nav>
        </div>
      </header>
      <main>
        <section className="band agent-band" aria-labelledby="agent-title">
          <div className="wrap">
            <div className="section-head">
              <h1 className="display" id="agent-title">Altitude for agents</h1>
              <p className="lead">One agent run, “Add annual pricing to the pricing page”, played through a complete harness. The states that matter most only show up mid-run, for a second: jump to any of them below, or press Play. Every moment is drawn by the components as they ship; nothing here is a mock-up.</p>
            </div>
            <div className="agent-modes" role="group" aria-label="Modes">
              <Tabs variant="segmented" value={scheme} onValueChange={(v) => setScheme(v as BuiltInScheme)}>
                <TabsList aria-label="Scheme">{SCHEMES.map((s) => <TabsTrigger key={s.id} value={s.id}>{s.label}</TabsTrigger>)}</TabsList>
              </Tabs>
              <Switch checked={reduced} onCheckedChange={setReduced} label="Reduced motion" />
              <Switch checked={more} onCheckedChange={setMore} label="More contrast" />
            </div>
            <div id="moments"><Harness start={0} /></div>
            <p className="caption">The run is a list of events shaped like an AI SDK stream; seeking folds them up to the moment you choose, so every state is reachable on demand and is the same every time. No network, no key.</p>
          </div>
        </section>
        <section className="band agent-band" aria-labelledby="orchestration-title">
          <div className="wrap">
            <div className="section-head">
              <h2 className="h2" id="orchestration-title">Many agents at once</h2>
              <p className="lead">A lead agent splits “Launch annual pricing” into six tasks and runs them side by side. Supervising them is a different job from talking to one: you need to see who's waiting on you, answer without opening each agent, catch two agents changing the same file or one going in circles, and see where the time went. The decisions waiting on you lead, oldest first; the roster says every agent's state in words; the lanes show how long agents waited on you.</p>
            </div>
            <div id="orchestration"><Orchestration start={2} /></div>
          </div>
        </section>
      </main>
    </AltitudeProvider>
  );
}

createRoot(document.getElementById('altitude-site')!).render(<Page />);
