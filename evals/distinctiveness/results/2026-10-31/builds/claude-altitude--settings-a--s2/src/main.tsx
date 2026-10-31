import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {
  AltitudeProvider, Badge, Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage,
  Button, Card, CardContent, CardHeader, CardTitle, Dialog, ErrorSummary, Field, Input, PageHeader, PageHeaderDescription,
  PageHeaderTitle, RelativeTime, SaveBar, SettingsSection, WorkflowStatus, useEditRecord,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import {getWorkspace, saveWorkspaceGeneral, type Workspace, type WorkspaceGeneral} from './workspace-service';

const CURRENT_USER = 'Priya Natarajan';
type Route = 'overview' | 'settings';

const statusTone = {'On track': 'positive', 'At risk': 'caution', Done: 'neutral'} as const;

const pageStyle: React.CSSProperties = {maxWidth: 880, margin: '0 auto', padding: '24px 16px 120px', display: 'grid', gap: 24};

/** Moves focus to the page's h1 after an in-app navigation so screen readers land on the new page. */
function useFocusHeading() {
  React.useEffect(() => {
    const h1 = document.querySelector<HTMLElement>('main h1');
    if (h1) { h1.tabIndex = -1; h1.focus(); }
  }, []);
}

function Overview({workspace, onOpenSettings}: {workspace: Workspace; onOpenSettings: () => void}) {
  useFocusHeading();
  return (
    <main style={pageStyle}>
      <PageHeader primary={<Button variant="primary" onClick={onOpenSettings}>Workspace settings</Button>}>
        <PageHeaderTitle>{workspace.name}</PageHeaderTitle>
        <PageHeaderDescription>
          {workspace.plan} plan · {workspace.members} members · Contact {workspace.contactEmail}
        </PageHeaderDescription>
      </PageHeader>
      <Card>
        <CardHeader><CardTitle>Projects</CardTitle></CardHeader>
        <CardContent>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{textAlign: 'start'}}>
                <th scope="col" style={{textAlign: 'start', padding: '8px 0'}}>Project</th>
                <th scope="col" style={{textAlign: 'start'}}>Lead</th>
                <th scope="col" style={{textAlign: 'end'}}>Open tasks</th>
                <th scope="col" style={{textAlign: 'end'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {workspace.projects.map((p) => (
                <tr key={p.id}>
                  <td style={{padding: '8px 0'}}>{p.name}</td>
                  <td>{p.lead}</td>
                  <td style={{textAlign: 'end'}}>{p.openTasks}</td>
                  <td style={{textAlign: 'end'}}><Badge tone={statusTone[p.status]}>{p.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p>Settings last changed by {workspace.updatedBy} <RelativeTime date={workspace.updatedAt} />.</p>
    </main>
  );
}

const labels: Record<keyof WorkspaceGeneral, string> = {name: 'Workspace name', contactEmail: 'Contact email'};
const fieldId = (key: keyof WorkspaceGeneral) => 'ws-' + key;

function Settings({workspace, onSaved, onLeave}: {workspace: Workspace; onSaved: () => void; onLeave: () => void}) {
  useFocusHeading();
  const form = useEditRecord<WorkspaceGeneral>({
    initialValue: {name: workspace.name, contactEmail: workspace.contactEmail},
    validationMode: 'submit',
    validate: (d) => ({
      ...(d.name.trim() ? {} : {name: 'Enter a workspace name.'}),
      ...(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.contactEmail.trim()) ? {} : {contactEmail: 'Enter an email address like name@company.com.'}),
    }),
    save: async (draft) => {
      try {
        const result = await saveWorkspaceGeneral(draft, CURRENT_USER);
        if (result.ok) onSaved();
        return result;
      } catch {
        return {ok: false, error: 'We couldn’t reach the server. Your changes are still here. Try saving again.'};
      }
    },
    messages: {saving: 'Saving workspace settings', saved: 'Workspace settings saved'},
  });

  // Discard confirmation for Cancel: resolves with the person's decision.
  const [confirmLeave, setConfirmLeave] = React.useState<((discard: boolean) => void) | null>(null);
  const askDiscard = () => new Promise<boolean>((resolve) => setConfirmLeave(() => resolve));
  const answer = (discard: boolean) => { confirmLeave?.(discard); setConfirmLeave(null); };
  const cancelButton = React.useRef<HTMLButtonElement>(null);

  const leave = async (reason: 'cancel' | 'navigation') => {
    if (await form.requestLeave(reason, askDiscard)) onLeave();
  };

  // Closing or reloading the tab with unsaved changes: the browser shows its own prompt.
  React.useEffect(() => {
    if (!form.dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [form.dirty]);

  const submitting = form.phase === 'submitting';
  const errorList = (Object.keys(labels) as (keyof WorkspaceGeneral)[])
    .filter((k) => form.errors[k])
    .map((k) => ({id: fieldId(k), label: labels[k], message: form.errors[k]!}));

  const field = (key: keyof WorkspaceGeneral, hint: string, type: string, autoComplete: string) => (
    <Field label={labels[key]} hint={hint} error={form.errors[key]} required>
      <Input id={fieldId(key)} type={type} autoComplete={autoComplete} value={form.draft[key]}
        onChange={(e) => form.setField(key, e.target.value)} />
    </Field>
  );

  return (
    <main style={pageStyle}>
      <PageHeader
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink href="#overview" onClick={(e: React.MouseEvent) => { e.preventDefault(); void leave('navigation'); }}>{workspace.name}</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbItem><BreadcrumbPage>Settings</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
        actions={<Button ref={cancelButton} variant="secondary" onClick={() => void leave('cancel')} disabled={submitting}>Cancel</Button>}
      >
        <PageHeaderTitle>Workspace settings</PageHeaderTitle>
        <PageHeaderDescription>Change how your workspace is named and who we contact about it.</PageHeaderDescription>
      </PageHeader>

      <SettingsSection id="general" title="General" description="Saved together: change what you need, then save once.">
        <form
          aria-label="General workspace settings"
          noValidate
          style={{display: 'grid', gap: 16}}
          onSubmit={(e) => { e.preventDefault(); void form.submit(); }}
          onKeyDown={(e) => {
            // Two text fields and no visible submit button: native implicit submission doesn't apply, so Enter saves here.
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT' && form.dirty && !submitting) { e.preventDefault(); void form.submit(); }
          }}
        >
          <ErrorSummary errors={errorList} focusKey={form.submitCount} />
          {field('name', 'Shown to all 14 members and on invitations.', 'text', 'organization')}
          {field('contactEmail', 'Where we send billing notices and security alerts.', 'email', 'email')}
        </form>
      </SettingsSection>

      <WorkflowStatus>{form.status}</WorkflowStatus>
      <SaveBar record={form} saveLabel="Save settings" discardLabel="Discard changes" />

      <Dialog
        open={confirmLeave !== null}
        onOpenChange={(open) => { if (!open) answer(false); }}
        background="stationary"
        initialFocus="title"
        returnFocus={() => cancelButton.current}
        title="Discard unsaved changes?"
        description="Your changes to the workspace name or contact email haven’t been saved. Leaving now discards them."
        footer={<>
          <Button onClick={() => answer(false)}>Keep editing</Button>
          <Button variant="danger" onClick={() => answer(true)}>Discard and leave</Button>
        </>}
      />
    </main>
  );
}

function App() {
  const [route, setRoute] = React.useState<Route>('overview');
  const [workspace, setWorkspace] = React.useState<Workspace>(getWorkspace);
  const refresh = () => setWorkspace(getWorkspace());
  return route === 'overview'
    ? <Overview workspace={workspace} onOpenSettings={() => setRoute('settings')} />
    : <Settings workspace={workspace} onSaved={refresh} onLeave={() => setRoute('overview')} />;
}

createRoot(document.getElementById('root')!).render(<AltitudeProvider><App /></AltitudeProvider>);
