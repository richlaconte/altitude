// The example's own fixtures, in the drawer's "This example" section (#460): which world the metrics come from, and
// whether the feed is running. They're state, not events, and they stay outside the app's main: the app reads only
// what the service answers, never these.
import * as React from 'react';
import { Select, Switch } from 'altitude-design';
import { useDemoService } from '../shared/react';
import { live, SCENARIOS, service, setScenario } from './data';
import type { Scenario } from './data';

export function Controls() {
  const snap = useDemoService(service);
  const on = React.useSyncExternalStore(live.subscribe, live.get, live.get);
  return (
    <>
      <div className="ex-field">
        <span id="sh-scenario" className="ex-label">Scenario</span>
        <Select aria-labelledby="sh-scenario" value={snap.state.scenario} onValueChange={(v) => setScenario(v as Scenario)} items={SCENARIOS} />
      </div>
      <Switch checked={on} onCheckedChange={live.set} label="A new minute of metrics every minute" />
      <p className="ex-caption">Off, the metrics pipeline has stalled: after two minutes the page should say its data is stale.</p>
    </>
  );
}
