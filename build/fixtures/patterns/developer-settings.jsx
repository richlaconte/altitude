// Developer settings pattern (project/framework/patterns/developer-settings.md): API keys created in a dialog that can't
// close until the secret is saved, listed masked with when each was last used, rolled with an overlap said in words and
// revoked with what breaks; webhooks whose deliveries are a Timeline, a retry hovering as a pending write and a test
// event's payload shown in a CodeBlock; integrations as interactive cards, the OAuth handoff pending, disconnect named.
// The lines between the preview markers are its "DeveloperSettingsPattern" preview (scripts/pattern-previews.mjs copies
// them); build/checks/pattern-types.mjs type-checks this file against the public declarations and fails if they differ.
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PAYLOAD = JSON.stringify({ id: 'evt_EXAMPLE_1042', type: 'invoice.paid', created: '2026-10-29T09:12:00Z', data: { invoice: 'INV-0042', amount: 26400, currency: 'eur' } }, null, 2);
function App() {
  const [keys, setKeys] = React.useState([{ id: 'k1', name: 'Production', tail: '4f2a', used: 'Used 3 minutes ago by 3 services' }, { id: 'k2', name: 'CI pipeline', tail: '8d0e', used: 'Used yesterday' }]);
  const [creating, setCreating] = React.useState(/** @type {null | { name: string, secret?: string, saved?: boolean }} */ (null));
  const [confirm, setConfirm] = React.useState(/** @type {null | { kind: 'roll' | 'revoke' | 'disconnect', id: string, busy?: boolean }} */ (null));
  const [status, setStatus] = React.useState('');
  const [deliveries, setDeliveries] = React.useState(/** @type {{ id: string, event: string, at: string, result: 'Delivered' | 'Failed', status?: 'pending' | 'committed' | 'failed', attempt: number }[]} */ ([
    { id: 'd1', event: 'invoice.paid', at: '2026-10-29T09:12:00Z', result: 'Delivered', attempt: 1 },
    { id: 'd2', event: 'customer.updated', at: '2026-10-29T08:40:00Z', result: 'Failed', status: 'failed', attempt: 3 },
  ]));
  const [test, setTest] = React.useState(false);
  const [apps, setApps] = React.useState([{ id: 'chat', name: 'Team chat', about: 'Post alerts to a channel.', state: 'connected' }, { id: 'cal', name: 'Calendar sync', about: 'Add due dates to calendars.', state: 'idle' }, { id: 'store', name: 'Cloud storage', about: 'Attach files from your drive.', state: 'idle' }]);
  const heading = React.useRef(/** @type {HTMLHeadingElement | null} */ (null));
  const key = confirm && keys.find((k) => k.id === confirm.id);
  const app = confirm && apps.find((a) => a.id === confirm.id);
  const create = async () => { if (!creating) return; await wait(500); setCreating({ ...creating, secret: 'ak_live_EXAMPLE_7Hq2Xv9LmR3p' }); };
  const finishCreate = () => { if (!creating) return; setKeys((l) => [...l, { id: 'k' + (l.length + 1), name: creating.name || 'Untitled key', tail: '3p0K', used: 'Never used' }]); setStatus(`Key “${creating.name || 'Untitled key'}” created.`); setCreating(null); };
  const retry = async (id) => {
    setDeliveries((l) => l.map((d) => (d.id === id ? { ...d, status: 'pending', attempt: d.attempt + 1 } : d)));
    await wait(1000);
    setDeliveries((l) => l.map((d) => (d.id === id ? { ...d, status: 'committed', result: 'Delivered' } : d)));
  };
  const act = async () => {
    if (!confirm) return;
    setConfirm({ ...confirm, busy: true }); await wait(700);
    if (confirm.kind === 'revoke') { setKeys((l) => l.filter((k) => k.id !== confirm.id)); setStatus(`Key “${key?.name}” revoked. Requests that use it now fail.`); }
    if (confirm.kind === 'roll') { setKeys((l) => l.map((k) => (k.id === confirm.id ? { ...k, tail: 'Zx81', used: 'New key. The old one works until tomorrow, 09:12' } : k))); setStatus(`Key “${key?.name}” rolled. The old key keeps working for 24 hours.`); }
    if (confirm.kind === 'disconnect') { setApps((l) => l.map((a) => (a.id === confirm.id ? { ...a, state: 'idle' } : a))); setStatus(`${app?.name} disconnected.`); }
    setConfirm(null); requestAnimationFrame(() => heading.current?.focus());
  };
  const connect = async (id) => {
    setApps((l) => l.map((a) => (a.id === id ? { ...a, state: 'pending' } : a)));
    await wait(1200);
    setApps((l) => l.map((a) => (a.id === id ? { ...a, state: 'connected' } : a)));
  };
  return (
    <main className="dv-page">
      <h2 ref={heading} tabIndex={-1} className="dv-h">Developers</h2>
      <section className="dv-section" aria-labelledby="dv-keys-h">
        <div className="dv-row"><h3 id="dv-keys-h" className="dv-sub">API keys</h3><A.Button size="sm" onClick={() => setCreating({ name: '' })}>Create key</A.Button></div>
        <A.Table aria-labelledby="dv-keys-h">
          <A.TableHeader><A.TableRow><A.TableHead>Name</A.TableHead><A.TableHead>Key</A.TableHead><A.TableHead>Last used</A.TableHead><A.TableHead align="end"><span className="dv-vh">Actions</span></A.TableHead></A.TableRow></A.TableHeader>
          <A.TableBody>{keys.map((k) => <A.TableRow key={k.id}><A.TableCell>{k.name}</A.TableCell><A.TableCell><code className="dv-mask">ak_live_••••{k.tail}</code></A.TableCell><A.TableCell className="dv-muted">{k.used}</A.TableCell>
            <A.TableCell align="end"><div className="dv-actions"><A.Button size="sm" variant="ghost" aria-label={`Roll ${k.name} key`} onClick={() => setConfirm({ kind: 'roll', id: k.id })}>Roll</A.Button><A.Button size="sm" variant="ghost" aria-label={`Revoke ${k.name} key`} onClick={() => setConfirm({ kind: 'revoke', id: k.id })}>Revoke</A.Button></div></A.TableCell></A.TableRow>)}</A.TableBody>
        </A.Table>
      </section>
      <section className="dv-section" aria-labelledby="dv-hooks-h">
        <h3 id="dv-hooks-h" className="dv-sub">Webhooks</h3>
        <A.Card className="dv-hook">
          <div className="dv-row"><code>https://api.acme.dev/hooks/altitude</code><A.Badge tone="positive">Active</A.Badge></div>
          <div className="dv-events">{['invoice.paid', 'customer.updated', 'member.removed'].map((e) => <A.Checkbox key={e} label={e} defaultChecked={e !== 'member.removed'} />)}</div>
          <A.Timeline aria-label="Recent deliveries" groupBy="none" locale="en-IE">
            {deliveries.map((d) => <A.TimelineItem key={d.id} time={d.at} status={d.status} onRetry={d.result === 'Failed' ? () => retry(d.id) : undefined}>
              <span className="dv-delivery"><code>{d.event}</code> <A.Badge tone={d.status === 'pending' ? 'neutral' : d.result === 'Delivered' ? 'positive' : 'critical'}>{d.status === 'pending' ? `Retrying (attempt ${d.attempt} of 5)` : d.result}</A.Badge></span>
            </A.TimelineItem>)}
          </A.Timeline>
          <div><A.Button size="sm" onClick={() => setTest(true)}>Send test event</A.Button></div>
          {test && <A.CodeBlock title="Test event sent: invoice.paid" language="json" code={PAYLOAD} />}
        </A.Card>
      </section>
      <section className="dv-section" aria-labelledby="dv-apps-h">
        <h3 id="dv-apps-h" className="dv-sub">Integrations</h3>
        <div className="dv-apps">{apps.map((a) => <A.Card key={a.id} className="dv-app" status={a.state === 'pending' ? 'pending' : undefined}>
          <div className="dv-row"><strong>{a.name}</strong>{a.state === 'connected' && <A.Badge tone="positive">Connected</A.Badge>}</div>
          <p className="dv-muted">{a.about}</p>
          {a.state === 'connected' ? <A.Button size="sm" variant="ghost" onClick={() => setConfirm({ kind: 'disconnect', id: a.id })}>Disconnect</A.Button>
            : <A.Button size="sm" loading={a.state === 'pending'} onClick={() => connect(a.id)}>{a.state === 'pending' ? 'Waiting for authorization' : `Connect ${a.name}`}</A.Button>}
        </A.Card>)}</div>
      </section>
      <p className="dv-muted" role="status">{status}</p>
      <A.Dialog open={!!creating} dismissible={!creating?.secret || !!creating?.saved} onOpenChange={(o) => { if (!o) setCreating(null); }} title={creating?.secret ? 'Save your new key' : 'Create an API key'}
        footer={creating?.secret ? <A.Button variant="primary" disabled={!creating.saved} onClick={finishCreate}>Done</A.Button> : <><A.Button onClick={() => setCreating(null)}>Cancel</A.Button><A.Button variant="primary" onClick={create}>Create key</A.Button></>}>
        {creating?.secret ? <A.SecretField label="Secret key" value={creating.secret} once warning="You won’t see this key again. Store it somewhere safe, like your secrets manager." onAcknowledge={() => setCreating({ ...creating, saved: true })} />
          : <A.Field label="Key name" hint="Say where it’s used, like “Billing service”."><A.Input value={creating?.name || ''} onChange={(e) => creating && setCreating({ ...creating, name: e.target.value })} /></A.Field>}
      </A.Dialog>
      <A.Dialog open={!!confirm} background="stationary" size="sm" dismissible={!confirm?.busy} onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title={confirm?.kind === 'roll' ? `Roll the ${key?.name} key?` : confirm?.kind === 'revoke' ? `Revoke the ${key?.name} key?` : `Disconnect ${app?.name}?`}
        description={confirm?.kind === 'roll' ? 'You’ll get a new key now. The old key keeps working for 24 hours, so you can update your services first.'
          : confirm?.kind === 'revoke' ? `Requests that use it fail immediately. ${key?.used}.` : `${app?.name} stops receiving updates, and anyone using it loses access to Acme data through it.`}
        footer={<><A.Button disabled={confirm?.busy} onClick={() => setConfirm(null)}>Cancel</A.Button><A.Button variant={confirm?.kind === 'roll' ? 'primary' : 'danger'} loading={confirm?.busy} onClick={act}>{confirm?.kind === 'roll' ? 'Roll key' : confirm?.kind === 'revoke' ? 'Revoke key' : 'Disconnect'}</A.Button></>} />
    </main>
  );
}
// preview:end
export default App;
