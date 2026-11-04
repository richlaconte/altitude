// The example's own fixture, in the drawer's "This example" section: who's looking. State, not an event, and outside
// the app's main. Both views read the same report from the same server.
import * as React from 'react';
import { Tabs, TabsList, TabsTrigger } from 'altitude-design';
import { EMPLOYEE, MANAGER, viewAs } from './data';

export function Controls() {
  const view = React.useSyncExternalStore(viewAs.subscribe, viewAs.get, viewAs.get);
  return (
    <>
      <Tabs variant="segmented" value={view} onValueChange={(v) => viewAs.set(v as 'employee' | 'manager')}>
        <TabsList aria-label="View as">
          <TabsTrigger value="employee">{EMPLOYEE} (submits)</TabsTrigger>
          <TabsTrigger value="manager">{MANAGER} (approves)</TabsTrigger>
        </TabsList>
      </Tabs>
      <p className="ex-caption">View as: the same report, seen by the person who submits it and the person who approves it.</p>
    </>
  );
}
