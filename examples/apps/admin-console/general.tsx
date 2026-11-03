// General: the workspace's name and URL saved together with the SaveBar; notification switches that apply at once,
// each reporting its own write; the danger zone. A save against a version someone else replaced is a conflict, said in
// words with both choices; a lost response is reconciled by reading the workspace back.
import * as React from 'react';
import {
  Button, Dialog, ErrorSummary, Field, Input, PageHeader, PageHeaderDescription, PageHeaderTitle, SaveBar, SettingsRow,
  SettingsSection, Switch, WorkflowStatus, useConsequentialAction, useEditRecord,
} from 'altitude-design';
import type { DemoQuery } from '../shared/react';
import { DemoError } from '../shared/react';
import { service } from './data';
import type { Workspace } from './data';
import { isKind, message } from './ui';

type Draft = { name: string; url: string };
type Write = 'pending' | 'committed' | 'failed' | undefined;

export function General({ workspace }: { workspace: DemoQuery<Workspace> }) {
  const ws = workspace.data!;
  const rev = React.useRef(ws.rev);

  const record = useEditRecord<Draft>({
    initialValue: { name: ws.name, url: ws.url },
    validationMode: 'submit',
    validate: (d) => ({ ...(d.name.trim() ? {} : { name: 'Enter a workspace name.' }), ...(/^[a-z0-9-]+$/.test(d.url) ? {} : { url: 'Use lowercase letters, numbers and hyphens.' }) }),
    save: async (d) => {
      try {
        const saved = await service.request<Workspace>('workspace.save', { ...d, rev: rev.current });
        rev.current = saved.rev;
        workspace.setData(() => saved);
        return { ok: true, value: { name: saved.name, url: saved.url } };
      } catch (e) {
        if (e instanceof DemoError && e.kind === 'invalid' && e.field) return { ok: false, error: e.message, errors: { [e.field]: e.message } };
        if (e instanceof DemoError && e.kind === 'conflict') {
          const now = e.current as Workspace | undefined;
          if (now) { rev.current = now.rev; workspace.setData(() => now); }
          return { ok: false, error: `Someone else changed these settings while you were editing: the workspace is now called ${now?.name ?? 'something else'}. Save again to replace it with yours, or discard your changes to keep theirs.` };
        }
        if (isKind(e, 'lost-response')) {
          // Don't guess: read it back.
          try {
            const now = await service.request<Workspace>('workspace.get');
            workspace.setData(() => now);
            rev.current = now.rev;
            if (now.name === d.name && now.url === d.url) return { ok: true, value: d };
            return { ok: false, error: 'The connection dropped and your changes weren’t saved. Save again.' };
          } catch {
            return { ok: false, error: 'The connection dropped, and we couldn’t check whether your changes were saved. Save again: nothing will be duplicated.' };
          }
        }
        return { ok: false, error: message(e) };
      }
    },
  });

  // A change from elsewhere replaces what's shown only while there's no unsaved draft.
  React.useEffect(() => {
    if (!record.dirty && record.phase !== 'submitting' && (ws.name !== record.baseline.name || ws.url !== record.baseline.url)) { record.reset({ name: ws.name, url: ws.url }); rev.current = ws.rev; }
    else if (!record.dirty) rev.current = ws.rev;
  }, [ws.rev]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply-now switches.
  const [writes, setWrites] = React.useState<Record<'digest' | 'mentions', Write>>({ digest: undefined, mentions: undefined });
  const apply = async (key: 'digest' | 'mentions', value: boolean) => {
    workspace.setData((w) => (w ? { ...w, [key]: value } : w));
    setWrites((s) => ({ ...s, [key]: 'pending' }));
    try {
      await service.request('workspace.pref', { key, value });
      setWrites((s) => ({ ...s, [key]: 'committed' }));
    } catch (e) {
      let saved = false;
      if (isKind(e, 'lost-response')) {
        try { saved = (await service.request<Workspace>('workspace.get'))[key] === value; } catch { /* unknown: treat as not saved */ }
      }
      if (saved) { setWrites((s) => ({ ...s, [key]: 'committed' })); return; }
      workspace.setData((w) => (w ? { ...w, [key]: !value } : w));
      setWrites((s) => ({ ...s, [key]: 'failed' }));
    }
  };

  // The danger zone.
  const [typed, setTyped] = React.useState('');
  const remove = useConsequentialAction<boolean>({
    target: `${ws.name} workspace`,
    consequence: `Delete ${ws.name}, its 29 projects and every file, for all members. This can’t be undone.`,
    requiresConfirmation: true,
    focusFallback: () => document.getElementById('ac-title'),
    execute: async () => {
      try { await service.request('workspace.delete'); await workspace.reload(); return { ok: true, value: true }; }
      catch (e) { return { ok: false, error: isKind(e, 'lost-response') ? 'The connection dropped. Check whether the workspace still exists before trying again.' : `We couldn’t delete the workspace. Nothing was removed. ${message(e)}` }; }
    },
    messages: { pending: `Deleting ${ws.name}`, succeeded: `${ws.name} deleted` },
  });
  const confirming = remove.phase === 'confirming' || remove.phase === 'pending' || remove.phase === 'failed';
  const closeConfirm = () => { remove.cancel(); setTyped(''); };

  const fieldErrors = Object.entries(record.errors) as [keyof Draft, string][];
  return <>
    <PageHeader>
      <PageHeaderTitle id="ac-title" tabIndex={-1}>General</PageHeaderTitle>
      <PageHeaderDescription>The workspace’s name, address and notifications.</PageHeaderDescription>
    </PageHeader>
    <div className="ac-body">
      <SettingsSection title="Workspace" description="Saved together: change what you need, then save once.">
        <form className="ac-form" noValidate onSubmit={(e) => { e.preventDefault(); void record.submit(); }}>
          <ErrorSummary errors={fieldErrors.map(([k, m]) => ({ id: `ac-ws-${k}`, label: k === 'name' ? 'Workspace name' : 'Workspace URL', message: m }))} focusKey={record.submitCount} />
          <Field label="Workspace name" hint="Shown to everyone in the workspace." error={record.errors.name}>
            <Input id="ac-ws-name" value={record.draft.name} onChange={(e) => record.setField('name', e.target.value)} />
          </Field>
          <Field label="Workspace URL" hint={`altitude.app/${record.draft.url}`} error={record.errors.url}>
            <Input id="ac-ws-url" value={record.draft.url} onChange={(e) => record.setField('url', e.target.value)} />
          </Field>
        </form>
      </SettingsSection>
      <SettingsSection title="Notifications" description="Each change applies as soon as you make it.">
        <SettingsRow label="Weekly digest" description="A summary of the workspace’s activity every Monday." status={writes.digest}>
          <Switch checked={ws.digest} onCheckedChange={(v) => void apply('digest', v)} />
        </SettingsRow>
        <SettingsRow label="Mentions" description="Email me when someone mentions me." status={writes.mentions}>
          <Switch checked={ws.mentions} onCheckedChange={(v) => void apply('mentions', v)} />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Danger zone" tone="critical">
        <SettingsRow label="Delete workspace" description={remove.consequence}>
          <Button variant="danger" onClick={remove.request}>Delete workspace</Button>
        </SettingsRow>
      </SettingsSection>
    </div>
    <WorkflowStatus>{record.status || remove.status}</WorkflowStatus>
    <SaveBar record={record} />
    <Dialog open={confirming} background="stationary" dismissible={remove.phase !== 'pending'} onOpenChange={(o) => { if (!o) closeConfirm(); }}
      title={`Delete ${ws.name}?`} description={remove.consequence}
      footer={<>
        <Button disabled={remove.phase === 'pending'} onClick={closeConfirm}>Keep workspace</Button>
        <Button variant="danger" disabled={typed !== ws.name || remove.phase === 'pending'} onClick={remove.phase === 'failed' ? remove.retry : remove.confirm}>
          {remove.phase === 'pending' ? 'Deleting workspace' : remove.phase === 'failed' ? 'Try deleting again' : 'Delete workspace'}
        </Button>
      </>}>
      <Field label={`Type ${ws.name} to confirm`}><Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" /></Field>
      {remove.error && <p className="ac-error" role="alert">{remove.error}</p>}
    </Dialog>
  </>;
}
