import * as React from 'react';
import {createRoot} from 'react-dom/client';
import * as A from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import {getWorkspace, saveWorkspaceGeneral, type Workspace, type WorkspaceGeneral} from './service';

type Route = 'overview' | 'settings';
const routeFromHash = (): Route => (window.location.hash === '#/settings' ? 'settings' : 'overview');
const hrefFor = (route: Route) => (route === 'settings' ? '#/settings' : '#/');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// A route change moves focus to the new page's h1, so keyboard and screen-reader users land at its start.
const focusPageTitle = () => { document.getElementById('page-title')?.focus(); };
const dateFormat = new Intl.DateTimeFormat('en-US', {dateStyle: 'medium', timeStyle: 'short'});

function Overview({workspace, onOpenSettings}: {workspace: Workspace; onOpenSettings: () => void}) {
  React.useEffect(focusPageTitle, []);
  return (
    <main className="ws-page">
      <A.PageHeader
        breadcrumb={<A.Breadcrumb items={[{label: workspace.name}]} />}
        actions={<A.Button variant="secondary" onClick={onOpenSettings}>Workspace settings</A.Button>}
      >
        <A.PageHeaderTitle id="page-title" tabIndex={-1}>{workspace.name}</A.PageHeaderTitle>
        <A.PageHeaderDescription>Workspace overview</A.PageHeaderDescription>
      </A.PageHeader>
      <A.Card>
        <A.CardHeader><A.CardTitle>Details</A.CardTitle></A.CardHeader>
        <A.CardContent>
          <dl className="ws-details">
            <div><dt>Contact email</dt><dd>{workspace.contactEmail}</dd></div>
            <div><dt>Plan</dt><dd>{workspace.plan}</dd></div>
            <div><dt>Members</dt><dd>{workspace.memberCount}</dd></div>
            <div><dt>Active projects</dt><dd>{workspace.activeProjects}</dd></div>
            <div><dt>Owner</dt><dd>{workspace.owner}</dd></div>
            <div><dt>Last changed</dt><dd>{workspace.updatedBy}, {dateFormat.format(workspace.updatedAt)}</dd></div>
          </dl>
        </A.CardContent>
      </A.Card>
    </main>
  );
}

interface SettingsProps {
  workspace: Workspace;
  onSaved: (workspace: Workspace) => void;
  onLeave: () => void;
  /** Registers this page's guard so Back and other in-app navigation ask before discarding. */
  registerGuard: (guard: (() => Promise<boolean>) | null) => void;
}

function Settings({workspace, onSaved, onLeave, registerGuard}: SettingsProps) {
  React.useEffect(focusPageTitle, []);

  const general = A.useEditRecord<WorkspaceGeneral>({
    initialValue: {name: workspace.name, contactEmail: workspace.contactEmail},
    validationMode: 'submit',
    validate: (d) => ({
      ...(d.name.trim() ? {} : {name: 'Enter a workspace name.'}),
      ...(d.name.trim().length > 60 ? {name: 'Use 60 characters or fewer.'} : {}),
      ...(EMAIL.test(d.contactEmail.trim()) ? {} : {contactEmail: 'Enter an email address, like team@company.com.'}),
    }),
    save: async (draft) => {
      const clean = {name: draft.name.trim(), contactEmail: draft.contactEmail.trim()};
      try {
        const saved = await saveWorkspaceGeneral(clean);
        onSaved(saved);
        return {ok: true, value: {name: saved.name, contactEmail: saved.contactEmail}};
      } catch (e) {
        return {ok: false, error: e instanceof Error ? e.message : 'We couldn’t save your changes. Try again.'};
      }
    },
    messages: {saved: 'Workspace settings saved'},
  });

  // Discard confirmation: requestLeave waits on this dialog for a real decision.
  const [discardAsk, setDiscardAsk] = React.useState<((discard: boolean) => void) | null>(null);
  const confirmDiscard = React.useCallback(
    () => new Promise<boolean>((resolve) => setDiscardAsk(() => (discard: boolean) => { setDiscardAsk(null); resolve(discard); })),
    [],
  );

  const generalRef = React.useRef(general);
  generalRef.current = general;
  React.useEffect(() => {
    registerGuard(() => generalRef.current.requestLeave('navigation', confirmDiscard));
    return () => registerGuard(null);
  }, [registerGuard, confirmDiscard]);

  React.useEffect(() => {
    if (!general.dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [general.dirty]);

  const cancel = async () => {
    if (await general.requestLeave('cancel', confirmDiscard)) onLeave();
  };

  const labels: Record<keyof WorkspaceGeneral, string> = {name: 'Workspace name', contactEmail: 'Contact email'};
  const submitting = general.phase === 'submitting';

  return (
    <main className="ws-page">
      <A.PageHeader
        breadcrumb={<A.Breadcrumb items={[
          {label: workspace.name, href: hrefFor('overview'), onClick: (e) => { e.preventDefault(); void cancel(); }},
          {label: 'Settings'},
        ]} />}
        actions={<A.Button variant="secondary" onClick={() => void cancel()} disabled={submitting}>Cancel</A.Button>}
      >
        <A.PageHeaderTitle id="page-title" tabIndex={-1}>Workspace settings</A.PageHeaderTitle>
        <A.PageHeaderDescription>How your workspace is named and how people can reach your team.</A.PageHeaderDescription>
      </A.PageHeader>

      <A.SettingsSection id="ws-general" title="General" description="Change what you need, then save once.">
        <form id="ws-general-form" aria-label="General settings" className="ws-form" noValidate
          onSubmit={(e) => { e.preventDefault(); void general.submit(); }}>
          <A.ErrorSummary
            errors={(Object.keys(labels) as (keyof WorkspaceGeneral)[])
              .filter((k) => general.errors[k])
              .map((k) => ({id: 'ws-' + k, label: labels[k], message: general.errors[k]!}))}
            focusKey={general.submitCount}
          />
          <A.Field label={labels.name} hint="Shown to everyone in the workspace and on invitations." error={general.errors.name}>
            <A.Input id="ws-name" value={general.draft.name} autoComplete="organization"
              onChange={(e) => general.setField('name', e.target.value)} />
          </A.Field>
          <A.Field label={labels.contactEmail} hint="Where members and Northwind support send questions about this workspace." error={general.errors.contactEmail}>
            <A.Input id="ws-contactEmail" type="email" value={general.draft.contactEmail} autoComplete="email"
              onChange={(e) => general.setField('contactEmail', e.target.value)} />
          </A.Field>
          {/* Lets Enter submit the form; the visible Save action lives in the SaveBar. */}
          <button type="submit" hidden />
        </form>
      </A.SettingsSection>

      <p className="ws-meta">Last changed by {workspace.updatedBy}, {dateFormat.format(workspace.updatedAt)}.</p>

      <A.WorkflowStatus>{general.status}</A.WorkflowStatus>
      <A.SaveBar record={general} saveLabel="Save settings" discardLabel="Discard changes" />

      <A.Dialog
        open={discardAsk !== null}
        onOpenChange={(open) => { if (!open) discardAsk?.(false); }}
        background="stationary"
        size="sm"
        title="Discard unsaved changes?"
        description="Your changes to the workspace name or contact email haven’t been saved."
        footer={<>
          <A.Button onClick={() => discardAsk?.(false)}>Keep editing</A.Button>
          <A.Button variant="danger" onClick={() => discardAsk?.(true)}>Discard changes</A.Button>
        </>}
      />
    </main>
  );
}

function App() {
  const [route, setRoute] = React.useState<Route>(routeFromHash);
  const [workspace, setWorkspace] = React.useState<Workspace>(getWorkspace);
  const guard = React.useRef<(() => Promise<boolean>) | null>(null);
  const registerGuard = React.useCallback((g: (() => Promise<boolean>) | null) => { guard.current = g; }, []);

  const go = React.useCallback((next: Route) => {
    if (window.location.hash !== hrefFor(next)) window.location.hash = hrefFor(next);
    setRoute(next);
  }, []);

  // Browser Back/Forward: if the settings page has unsaved work, stay put and ask first.
  React.useEffect(() => {
    const onHashChange = async () => {
      const next = routeFromHash();
      if (next === route) return;
      if (route === 'settings' && guard.current) {
        history.pushState(null, '', hrefFor('settings'));
        if (!(await guard.current())) return;
        history.replaceState(null, '', hrefFor(next));
      }
      setRoute(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [route]);

  return route === 'settings'
    ? <Settings key="settings" workspace={workspace} onSaved={setWorkspace} onLeave={() => go('overview')} registerGuard={registerGuard} />
    : <Overview workspace={workspace} onOpenSettings={() => go('settings')} />;
}

createRoot(document.getElementById('root')!).render(<A.AltitudeProvider><App /></A.AltitudeProvider>);
