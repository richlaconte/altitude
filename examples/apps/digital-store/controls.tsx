// The store's own fixtures, in the drawer's "This example" section, outside the app's main (#636): who's signed in,
// and the server's clock. They change the server, as another tab or time passing would; the app hears about it from
// the service and the auth channel, never from here. No product module imports this file.
import * as React from 'react';
import { Button, Select } from 'altitude-design';
import { useDemoService } from '../shared/react';
import { store } from './client';
import { DAY } from './store.ts';
import { PRINCIPALS } from './seed.ts';

const GUEST = 'guest';
const ROLE = { buyer: 'buyer', creator: 'creator', moderator: 'moderator', support: 'support' } as const;
const ITEMS = [{ value: GUEST, label: 'A guest (signed out)' }, ...PRINCIPALS.map((p) => ({ value: p.id, label: `${p.name} (${ROLE[p.role]})` }))];
const clockWords = (ms: number) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(ms) + ' UTC';

export function Controls() {
  const { state } = useDemoService(store.service);
  return (
    <>
      <div className="ex-field">
        <span id="ds-signed-in" className="ex-label">Signed in as</span>
        <Select aria-labelledby="ds-signed-in" value={state.session.principalId ?? GUEST} onValueChange={(v) => store.switchPrincipal(v === GUEST ? null : v)} items={ITEMS} />
      </div>
      <p className="ex-caption">As signing in as someone else in another tab: the store drops what it showed the last account before it asks who you are.</p>
      <p className="ex-caption">The server’s clock: {clockWords(state.now)}.</p>
      <div className="ex-actions"><Button size="sm" onClick={() => store.advanceClock(DAY)}>A day passes</Button></div>
    </>
  );
}
