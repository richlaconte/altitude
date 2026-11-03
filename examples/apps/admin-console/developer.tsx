// Developers: API keys created in a dialog that can't close until the secret is saved, listed masked; revoking one names
// what uses it, and a webhook signed with a revoked key says it's failing and asks for another key.
import * as React from 'react';
import {
  Badge, Button, Card, Dialog, Field, Input, PageHeader, PageHeaderDescription, PageHeaderTitle, SecretField, Select, Table,
  TableBody, TableCell, TableHead, TableHeader, TableRow, WorkflowStatus,
} from 'altitude-design';
import { DemoError, useDemoQuery } from '../shared/react';
import { service } from './data';
import type { ApiKey, Webhook } from './data';
import { Resource, isKind, message } from './ui';

type Dev = { keys: ApiKey[]; webhooks: Webhook[] };

function CreateKey({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (k: ApiKey) => void }) {
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [made, setMade] = React.useState<{ key: ApiKey; secret: string } | null>(null);
  const [saved, setSaved] = React.useState(false);
  React.useEffect(() => { if (open) { setName(''); setError(''); setMade(null); setSaved(false); } }, [open]);
  const create = async () => {
    setBusy(true); setError('');
    try { const r = await service.request<{ key: ApiKey; secret: string }>('keys.create', { name }); setMade(r); onCreated(r.key); }
    catch (e) {
      // A key whose response was lost can't be shown again, so it's never adopted: the person creates another and revokes the stray one.
      setError(isKind(e, 'lost-response') ? 'The connection dropped before we could show the key. If a new key appears in the list, revoke it and create another.' : message(e));
    } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} dismissible={!busy && (!made || saved)} onOpenChange={(o) => { if (!o) onClose(); }}
      title={made ? 'Save your new key' : 'Create an API key'}
      footer={made ? <Button variant="primary" disabled={!saved} onClick={onClose}>Done</Button>
        : <><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={() => void create()}>Create key</Button></>}>
      {made
        ? <SecretField label="Secret key" value={made.secret} once warning="You won’t see this key again. Store it somewhere safe, like your secrets manager." onAcknowledge={() => setSaved(true)} />
        : <Field label="Key name" hint="Say where it’s used, like “Billing service”." error={error || undefined}>
            <Input value={name} onChange={(e) => { setName(e.target.value); setError(''); }} autoFocus />
          </Field>}
    </Dialog>
  );
}

export function Developer() {
  const q = useDemoQuery<unknown, Dev>(service, 'developer.get');
  const [creating, setCreating] = React.useState(false);
  const [revoking, setRevoking] = React.useState<ApiKey | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [status, setStatus] = React.useState('');

  const revoke = async () => {
    if (!revoking) return;
    setBusy(true); setError('');
    try { await service.request('keys.revoke', { id: revoking.id }); }
    catch (e) {
      if (!(e instanceof DemoError && e.kind === 'lost-response')) { setError(`We couldn’t revoke the key. It still works. ${message(e)}`); setBusy(false); return; }
    }
    await q.reload(); // the webhook that used it changes too
    setStatus(`The ${revoking.name} key was revoked. Requests that use it now fail.`);
    setBusy(false); setRevoking(null);
    requestAnimationFrame(() => document.getElementById('ac-title')?.focus());
  };
  const setKey = async (hook: Webhook, keyId: string) => {
    try { await service.request('webhooks.setKey', { id: hook.id, keyId }); await q.reload(); setStatus('The webhook is signed with the new key.'); }
    catch (e) { setStatus(`We couldn’t change the webhook’s key. ${message(e)}`); }
  };

  return <>
    <PageHeader primary={<Button variant="primary" onClick={() => setCreating(true)}>Create key</Button>}>
      <PageHeaderTitle id="ac-title" tabIndex={-1}>Developers</PageHeaderTitle>
      <PageHeaderDescription>API keys and webhooks for Fenwick Tools.</PageHeaderDescription>
    </PageHeader>
    <div className="ac-body">
      <Resource query={q} noun="keys and webhooks">
        {({ keys, webhooks }) => <>
          <section className="ac-stack" aria-labelledby="ac-keys-h">
            <h2 id="ac-keys-h" className="ac-h2">API keys</h2>
            {keys.length === 0 ? <p className="ac-muted">No keys. Create one to call the API.</p> : (
              <Table aria-labelledby="ac-keys-h">
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Key</TableHead><TableHead>Last used</TableHead><TableHead align="end"><span className="ac-sr">Actions</span></TableHead></TableRow></TableHeader>
                <TableBody>
                  {keys.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell>{k.name}</TableCell>
                      <TableCell><code className="ac-mono">ak_live_••••{k.tail}</code></TableCell>
                      <TableCell className="ac-muted">{k.lastUsed}</TableCell>
                      <TableCell align="end"><Button size="sm" variant="ghost" aria-label={`Revoke the ${k.name} key`} onClick={() => { setError(''); setRevoking(k); }}>Revoke</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
          <section className="ac-stack" aria-labelledby="ac-hooks-h">
            <h2 id="ac-hooks-h" className="ac-h2">Webhooks</h2>
            {webhooks.map((w) => {
              const key = keys.find((k) => k.id === w.keyId);
              return (
                <Card key={w.id} className="ac-hook">
                  <div className="ac-row"><code className="ac-mono">{w.url}</code>{key ? <Badge tone="positive">Active</Badge> : <Badge tone="critical">Failing</Badge>}</div>
                  <p className="ac-muted">Sends {w.events.join(' and ')}.</p>
                  {!key && <p className="ac-prose">Its signing key was revoked, so deliveries fail. Choose another key to start them again.</p>}
                  <div className="ac-field">
                    <span id={`ac-hook-key-${w.id}`} className="ac-label">Signing key</span>
                    <Select aria-labelledby={`ac-hook-key-${w.id}`} value={key?.id ?? ''} onValueChange={(v) => void setKey(w, v)} items={keys.map((k) => ({ value: k.id, label: k.name }))} invalid={!key} />
                  </div>
                </Card>
              );
            })}
          </section>
        </>}
      </Resource>
    </div>
    <WorkflowStatus>{status}</WorkflowStatus>
    <CreateKey open={creating} onClose={() => { setCreating(false); void q.reload(); }} onCreated={(k) => { q.setData((d) => (d ? { ...d, keys: [...d.keys, k] } : d)); setStatus(`The ${k.name} key was created.`); }} />
    <Dialog open={!!revoking} background="stationary" size="sm" dismissible={!busy} onOpenChange={(o) => { if (!o) setRevoking(null); }}
      title={`Revoke the ${revoking?.name} key?`}
      description={revoking && revoking.usedBy.length ? `Requests that use it fail immediately. It’s used by ${revoking.usedBy.join(' and ')}.` : 'Requests that use it fail immediately. Nothing has used it recently.'}
      footer={<><Button disabled={busy} onClick={() => setRevoking(null)}>Keep key</Button><Button variant="danger" loading={busy} onClick={() => void revoke()}>Revoke key</Button></>}>
      {error && <p className="ac-error" role="alert">{error}</p>}
    </Dialog>
  </>;
}
