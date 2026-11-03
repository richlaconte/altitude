// Security: two-factor authentication, set up by entering a code into a row of openings, and turned off only after
// saying what that means.
import * as React from 'react';
import {
  Button, Dialog, Field, InputOTP, PageHeader, PageHeaderDescription, PageHeaderTitle, SettingsRow, SettingsSection, WorkflowStatus,
} from 'altitude-design';
import { DemoError, useDemoQuery } from '../shared/react';
import { EXAMPLE_CODE, service } from './data';
import { Resource, isKind, message } from './ui';

export function Security() {
  const q = useDemoQuery<unknown, { twoFactor: boolean }>(service, 'security.get');
  const [setup, setSetup] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [verifying, setVerifying] = React.useState(false);
  const [error, setError] = React.useState('');
  const [turningOff, setTurningOff] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState('');

  const verify = async (value: string) => {
    setVerifying(true); setError('');
    try { await service.request('security.enable', { code: value }); }
    catch (e) {
      let on = false;
      if (isKind(e, 'lost-response')) { try { on = (await service.request<{ twoFactor: boolean }>('security.get')).twoFactor; } catch { /* unknown: not on */ } }
      if (!on) {
        setError(e instanceof DemoError && e.field === 'code' ? e.message : isKind(e, 'lost-response') ? 'The connection dropped and two-factor wasn’t turned on. Enter a code again.' : `We couldn’t check the code. ${message(e)}`);
        setVerifying(false); setCode(''); return;
      }
    }
    await q.reload();
    setVerifying(false); setSetup(false); setCode('');
    setStatus('Two-factor authentication is on.');
    requestAnimationFrame(() => document.getElementById('ac-title')?.focus());
  };
  const turnOff = async () => {
    setBusy(true);
    try { await service.request('security.disable'); }
    catch (e) {
      let off = false;
      if (isKind(e, 'lost-response')) { try { off = !(await service.request<{ twoFactor: boolean }>('security.get')).twoFactor; } catch { /* unknown: still on */ } }
      if (!off) { setStatus(`We couldn’t turn off two-factor authentication. It’s still on. ${message(e)}`); setBusy(false); setTurningOff(false); return; }
    }
    await q.reload();
    setBusy(false); setTurningOff(false); setStatus('Two-factor authentication is off.');
  };

  return <>
    <PageHeader>
      <PageHeaderTitle id="ac-title" tabIndex={-1}>Security</PageHeaderTitle>
      <PageHeaderDescription>How you sign in to Fenwick Tools.</PageHeaderDescription>
    </PageHeader>
    <div className="ac-body">
      <Resource query={q} noun="security settings">
        {({ twoFactor }) => (
          <SettingsSection title="Two-factor authentication" description="A code from your authenticator app, as well as your password, every time you sign in.">
            <SettingsRow label="Status" description={twoFactor ? 'On. You’ll be asked for a code when you sign in.' : 'Off. Anyone with your password can sign in as you.'}>
              {twoFactor
                ? <Button onClick={() => setTurningOff(true)}>Turn off</Button>
                : <Button variant="primary" onClick={() => { setSetup(true); setError(''); setCode(''); }}>Set up two-factor</Button>}
            </SettingsRow>
          </SettingsSection>
        )}
      </Resource>
    </div>
    <WorkflowStatus>{status}</WorkflowStatus>
    <Dialog open={setup} dismissible={!verifying} onOpenChange={(o) => { if (!o) setSetup(false); }} title="Set up two-factor authentication"
      description="Scan the code with your authenticator app, then enter the six digits it shows."
      footer={<><Button disabled={verifying} onClick={() => setSetup(false)}>Cancel</Button><Button variant="primary" loading={verifying} onClick={() => void verify(code)}>Turn on two-factor</Button></>}>
      <Field label="Six-digit code" hint={`In this example, the authenticator shows ${EXAMPLE_CODE.slice(0, 3)} ${EXAMPLE_CODE.slice(3)}.`} error={error || undefined}>
        <InputOTP maxLength={6} value={code} onChange={(v) => { setCode(v); setError(''); }} onComplete={(v) => void verify(v)} verifying={verifying} invalid={!!error} />
      </Field>
    </Dialog>
    <Dialog open={turningOff} background="stationary" size="sm" dismissible={!busy} onOpenChange={(o) => { if (!o) setTurningOff(false); }}
      title="Turn off two-factor authentication?" description="Anyone with your password will be able to sign in as you."
      footer={<><Button disabled={busy} onClick={() => setTurningOff(false)}>Keep it on</Button><Button variant="danger" loading={busy} onClick={() => void turnOff()}>Turn off two-factor</Button></>} />
  </>;
}
