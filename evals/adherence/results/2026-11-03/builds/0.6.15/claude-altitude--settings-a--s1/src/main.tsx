import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider, Breadcrumb, Button, Dialog, ErrorSummary, Field, Input, PageHeader, PageHeaderDescription,
  PageHeaderTitle, PropertyList, PropertyListItem, SettingsSection, WorkflowStatus, useEditRecord,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { getWorkspace, saveWorkspaceDetails, type WorkspaceDetails, type WorkspaceSummary } from './workspace-service';

// Navigation is application-owned: two hash routes, no router dependency.
type Route = 'overview' | 'settings';
const routeFromHash = (): Route => (window.location.hash === '#/settings' ? 'settings' : 'overview');
const hrefFor = (route: Route) => (route === 'settings' ? '#/settings' : '#/overview');

function App() {
  const [route, setRoute] = React.useState<Route>(routeFromHash);
  const [workspace, setWorkspace] = React.useState<WorkspaceSummary>(getWorkspace);
  // Settings registers a guard here so Back/Forward can't silently drop an unsaved draft.
  const leaveGuard = React.useRef<((to: Route) => Promise<boolean>) | null>(null);
  const current = React.useRef(route); current.current = route;

  const go = React.useCallback((to: Route) => {
    if (window.location.hash !== hrefFor(to)) window.history.pushState(null, '', hrefFor(to));
    setRoute(to);
  }, []);

  React.useEffect(() => {
    const onPop = async () => {
      const to = routeFromHash();
      if (current.current === 'settings' && to !== 'settings' && leaveGuard.current) {
        // Put the URL back while we ask; only move on once the person decides.
        window.history.pushState(null, '', hrefFor('settings'));
        if (await leaveGuard.current(to)) go(to);
        return;
      }
      setRoute(to);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [go]);

  return route === 'settings'
    ? <WorkspaceSettings workspace={workspace} onSaved={(d) => setWorkspace((w) => ({ ...w, ...d }))}
        onLeave={() => go('overview')} registerGuard={(g) => { leaveGuard.current = g; }} />
    : <WorkspaceOverview workspace={workspace} onOpenSettings={() => go('settings')} />;
}

function WorkspaceOverview({ workspace, onOpenSettings }: { workspace: WorkspaceSummary; onOpenSettings: () => void }) {
  const heading = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { heading.current?.querySelector('h1')?.focus(); }, []);
  return (
    <main className="ws-page">
      <div ref={heading}>
        <PageHeader actions={<Button variant="secondary" onClick={onOpenSettings}>Workspace settings</Button>}>
          <PageHeaderTitle tabIndex={-1}>{workspace.name}</PageHeaderTitle>
          <PageHeaderDescription>Workspace overview: who owns it, how to reach it and what it holds.</PageHeaderDescription>
        </PageHeader>
      </div>
      <PropertyList aria-label="Workspace details" layout="inline">
        <PropertyListItem label="Workspace name" value={workspace.name} />
        <PropertyListItem label="Contact email" value={workspace.contactEmail} />
        <PropertyListItem label="Owner" value={workspace.owner} />
        <PropertyListItem label="Plan" value={workspace.plan} />
        <PropertyListItem label="Members" value={String(workspace.memberCount)} />
        <PropertyListItem label="Active projects" value={String(workspace.activeProjects)} />
      </PropertyList>
    </main>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LABELS: Record<keyof WorkspaceDetails, string> = { name: 'Workspace name', contactEmail: 'Contact email' };
const IDS: Record<keyof WorkspaceDetails, string> = { name: 'ws-name', contactEmail: 'ws-contact-email' };

function validate(d: WorkspaceDetails) {
  const errors: Partial<Record<keyof WorkspaceDetails, string>> = {};
  const name = d.name.trim();
  if (!name) errors.name = 'Enter a workspace name.';
  else if (name.length > 60) errors.name = 'Use 60 characters or fewer.';
  const email = d.contactEmail.trim();
  if (!email) errors.contactEmail = 'Enter a contact email.';
  else if (!EMAIL.test(email)) errors.contactEmail = 'Enter an email address like name@studio.example.';
  return errors;
}

function WorkspaceSettings({ workspace, onSaved, onLeave, registerGuard }: {
  workspace: WorkspaceSummary;
  onSaved: (details: WorkspaceDetails) => void;
  onLeave: () => void;
  registerGuard: (guard: ((to: Route) => Promise<boolean>) | null) => void;
}) {
  const form = useEditRecord<WorkspaceDetails>({
    initialValue: { name: workspace.name, contactEmail: workspace.contactEmail },
    validationMode: 'submit',
    validate,
    save: async (draft) => {
      const result = await saveWorkspaceDetails(draft);
      if (result.ok) onSaved(result.value);
      return result;
    },
    messages: { saving: 'Saving workspace details', saved: 'Workspace details saved' },
  });
  const saving = form.phase === 'submitting';

  // Discard confirmation: requestLeave awaits the person's answer in this dialog.
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const answer = React.useRef<((discard: boolean) => void) | null>(null);
  const cancelButton = React.useRef<HTMLButtonElement>(null);
  const askToDiscard = () => new Promise<boolean>((resolve) => { answer.current = resolve; setConfirmOpen(true); });
  const decide = (discard: boolean) => { setConfirmOpen(false); answer.current?.(discard); answer.current = null; };

  const formRef = React.useRef(form); formRef.current = form;
  React.useEffect(() => {
    registerGuard(() => formRef.current.requestLeave('back', askToDiscard));
    return () => registerGuard(null);
  }, [registerGuard]);

  React.useEffect(() => {
    if (!form.dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [form.dirty]);

  const header = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { header.current?.querySelector('h1')?.focus(); }, []);

  const leave = async () => { if (await form.requestLeave('cancel', askToDiscard)) onLeave(); };

  const errorList = (Object.keys(form.errors) as (keyof WorkspaceDetails)[])
    .filter((k) => form.errors[k])
    .map((k) => ({ id: IDS[k], label: LABELS[k], message: form.errors[k]! }));

  return (
    <main className="ws-page ws-settings">
      <div ref={header}>
        <PageHeader breadcrumb={<Breadcrumb items={[
          { label: workspace.name, href: hrefFor('overview'), onClick: (e) => { e.preventDefault(); void leave(); } },
          { label: 'Settings' },
        ]} />}>
          <PageHeaderTitle tabIndex={-1}>Workspace settings</PageHeaderTitle>
          <PageHeaderDescription>How your workspace is named and where we send account and billing notices.</PageHeaderDescription>
        </PageHeader>
      </div>

      <SettingsSection title="General" description="These details are saved together.">
        <form className="ws-form" aria-label="Workspace details" noValidate
          onSubmit={(e) => { e.preventDefault(); if (!saving) void form.submit(); }}>
          <ErrorSummary errors={errorList} focusKey={form.submitCount} title="Fix these before saving" />
          <Field label={LABELS.name} hint="Shown to everyone in the workspace and in email notifications." error={form.errors.name}>
            <Input id={IDS.name} value={form.draft.name} autoComplete="organization"
              onChange={(e) => form.setField('name', e.target.value)} />
          </Field>
          <Field label={LABELS.contactEmail} hint="Where we send account, security and billing notices." error={form.errors.contactEmail}>
            <Input id={IDS.contactEmail} type="email" value={form.draft.contactEmail} autoComplete="email"
              onChange={(e) => form.setField('contactEmail', e.target.value)} />
          </Field>
          {form.phase === 'failed' && form.error && <p className="ws-failure" role="alert">{form.error}</p>}
          <div className="ws-actions">
            <Button ref={cancelButton} type="button" variant="secondary" disabled={saving} onClick={() => void leave()}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving} disabled={saving}>
              {saving ? 'Saving changes' : form.phase === 'failed' ? 'Try saving again' : 'Save changes'}
            </Button>
          </div>
        </form>
      </SettingsSection>

      <WorkflowStatus>{form.status}</WorkflowStatus>

      <Dialog open={confirmOpen} size="sm" background="stationary"
        onOpenChange={(open) => { if (!open) decide(false); }}
        title="Discard your changes?"
        description="Your edits to the workspace name or contact email haven’t been saved. Leaving now discards them."
        focusSelector="[data-keep]" returnFocus={() => cancelButton.current}
        footer={<>
          <Button data-keep variant="secondary" onClick={() => decide(false)}>Keep editing</Button>
          <Button variant="danger" onClick={() => decide(true)}>Discard changes</Button>
        </>} />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<AltitudeProvider><App /></AltitudeProvider>);
