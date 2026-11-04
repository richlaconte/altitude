import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  ErrorSummary,
  Field,
  Input,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  PropertyList,
  PropertyListItem,
  SaveBar,
  SettingsSection,
  Switch,
  WorkflowStatus,
  useEditRecord,
  type FieldErrors,
  type LeaveReason,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { demo, getPractice, savePracticeDetails, type PracticeDetails } from './practice-service';

// ---------------------------------------------------------------------------------------------------------------
// Routing: hash routes stand in for the booking app's router. A screen with unsaved work registers a leave guard;
// every way out of it (Cancel, the breadcrumb, browser Back) goes through that guard.

type Route = 'overview' | 'settings';
const ROUTES: Record<Route, string> = { overview: '#/practice', settings: '#/practice/settings' };
const parseRoute = (hash: string): Route => (hash === ROUTES.settings ? 'settings' : 'overview');
type LeaveGuard = (reason: LeaveReason) => Promise<boolean>;
/** Each route change moves focus to the new page's h1 (PageHeaderTitle), so screen readers hear where they are. */
const focusHeading = () => document.querySelector<HTMLElement>('main h1')?.focus();

function App() {
  const [route, setRoute] = React.useState<Route>(() => parseRoute(window.location.hash));
  const guard = React.useRef<LeaveGuard | null>(null);
  const routeRef = React.useRef(route);
  routeRef.current = route;

  React.useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', ROUTES.overview);
    const onHashChange = () => {
      const next = parseRoute(window.location.hash);
      if (routeRef.current === 'settings' && next !== 'settings' && guard.current) {
        // Browser Back: put the settings entry back, then ask before leaving unsaved changes.
        window.history.pushState(null, '', ROUTES.settings);
        void guard.current('back').then((ok) => {
          if (ok) go(next);
        });
        return;
      }
      setRoute(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const go = (next: Route) => {
    guard.current = null;
    if (window.location.hash !== ROUTES[next]) window.history.pushState(null, '', ROUTES[next]);
    setRoute(next);
  };

  const leaveTo = async (next: Route, reason: LeaveReason) => {
    if (guard.current && !(await guard.current(reason))) return;
    go(next);
  };

  return route === 'settings' ? (
    <PracticeSettings
      registerGuard={(g) => { guard.current = g; }}
      onLeave={(reason) => void leaveTo('overview', reason)}
    />
  ) : (
    <PracticeOverviewPage onEdit={() => go('settings')} />
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Practice overview: where Cancel returns to.

function PracticeOverviewPage({ onEdit }: { onEdit: () => void }) {
  const practice = getPractice();
  React.useEffect(() => { focusHeading(); }, []);
  return (
    <main className="page">
      <PageHeader primary={<Button variant="primary" onClick={onEdit}>Edit practice settings</Button>}>
        <PageHeaderTitle tabIndex={-1}>{practice.name}</PageHeaderTitle>
        <PageHeaderDescription>Practice overview for online booking.</PageHeaderDescription>
      </PageHeader>
      <Card>
        <CardHeader><CardTitle id="practice-details-title">Practice details</CardTitle></CardHeader>
        <CardContent>
          <PropertyList layout="inline" aria-labelledby="practice-details-title">
            <PropertyListItem label="Contact email" value={practice.contactEmail} />
            <PropertyListItem label="Phone" value={practice.phone} />
            <PropertyListItem label="Address" value={practice.address} />
            <PropertyListItem label="Opening hours" value={practice.openingHours} />
            <PropertyListItem label="Vets" value={`${practice.vets} vets`} />
            <PropertyListItem label="Appointments this week" value={`${practice.appointmentsThisWeek} booked`} />
          </PropertyList>
        </CardContent>
      </Card>
    </main>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Practice settings: name and contact email are one record, saved together (edit-record + settings patterns).

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LABELS: Record<keyof PracticeDetails, string> = { name: 'Practice name', contactEmail: 'Contact email' };
const IDS: Record<keyof PracticeDetails, string> = { name: 'practice-name', contactEmail: 'practice-email' };

function validate(draft: PracticeDetails): FieldErrors<PracticeDetails> {
  const errors: FieldErrors<PracticeDetails> = {};
  if (!draft.name.trim()) errors.name = 'Enter the practice name.';
  else if (draft.name.trim().length > 80) errors.name = 'Use 80 characters or fewer.';
  if (!draft.contactEmail.trim()) errors.contactEmail = 'Enter a contact email address.';
  else if (!EMAIL.test(draft.contactEmail.trim())) errors.contactEmail = 'Enter an email address like reception@yourpractice.com.';
  return errors;
}

function PracticeSettings({ registerGuard, onLeave }: {
  registerGuard: (guard: LeaveGuard | null) => void;
  onLeave: (reason: LeaveReason) => void;
}) {
  const initial = React.useMemo(() => {
    const p = getPractice();
    return { name: p.name, contactEmail: p.contactEmail };
  }, []);

  const form = useEditRecord<PracticeDetails>({
    initialValue: initial,
    validationMode: 'submit',
    validate,
    save: async (draft) => {
      try {
        return { ok: true, value: await savePracticeDetails(draft) };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'We couldn’t save your changes. Try again.' };
      }
    },
    messages: { saving: 'Saving practice details…', saved: 'Practice details saved' },
  });

  // Discard confirmation: requestLeave asks through this dialog only when there are unsaved changes.
  const [confirm, setConfirm] = React.useState<{ resolve: (ok: boolean) => void } | null>(null);
  const [notice, setNotice] = React.useState('');
  const phase = React.useRef(form.phase);
  phase.current = form.phase;
  const answer = (ok: boolean) => { confirm?.resolve(ok); setConfirm(null); };

  const guard = React.useCallback<LeaveGuard>(async (reason) => {
    const ok = await form.requestLeave(reason, () => new Promise<boolean>((resolve) => setConfirm({ resolve })));
    setNotice(!ok && phase.current === 'submitting' ? 'Wait for the save to finish before leaving this page.' : '');
    return ok;
  }, [form]);

  React.useEffect(() => { registerGuard(guard); }, [guard, registerGuard]);
  React.useEffect(() => () => registerGuard(null), []);
  React.useEffect(() => { focusHeading(); }, []);

  const errors = (Object.keys(form.errors) as (keyof PracticeDetails)[])
    .filter((key) => form.errors[key])
    .map((key) => ({ id: IDS[key], label: LABELS[key], message: form.errors[key]! }));

  return (
    <main className="page">
      <PageHeader
        breadcrumb={<Breadcrumb items={[
          { label: 'Practice overview', href: ROUTES.overview, onClick: (e) => { e.preventDefault(); onLeave('navigation'); } },
          { label: 'Practice settings' },
        ]} />}
        actions={<Button variant="secondary" onClick={() => onLeave('cancel')}>Cancel</Button>}
      >
        <PageHeaderTitle tabIndex={-1}>Practice settings</PageHeaderTitle>
        <PageHeaderDescription>How your practice appears to clients when they book.</PageHeaderDescription>
      </PageHeader>

      <SettingsSection title="Practice details" description="Saved together: change what you need, then save once.">
        <form
          className="settings-form"
          aria-label="Practice details"
          noValidate
          onSubmit={(e) => { e.preventDefault(); void form.submit(); }}
        >
          <ErrorSummary errors={errors} focusKey={form.submitCount} />
          <Field label={LABELS.name} hint="Shown on booking pages, confirmations and reminders." error={form.errors.name} required>
            <Input
              id={IDS.name}
              autoComplete="organization"
              value={form.draft.name}
              onChange={(e) => form.setField('name', e.target.value)}
            />
          </Field>
          <Field label={LABELS.contactEmail} hint="Clients reply to this address about their appointments." error={form.errors.contactEmail} required>
            <Input
              id={IDS.contactEmail}
              type="email"
              autoComplete="email"
              placeholder="reception@yourpractice.com"
              value={form.draft.contactEmail}
              onChange={(e) => form.setField('contactEmail', e.target.value)}
            />
          </Field>
        </form>
      </SettingsSection>

      <details className="demo-fixtures">
        <summary>Sample data controls</summary>
        <DemoFailSwitch />
      </details>

      <WorkflowStatus>{notice || form.status}</WorkflowStatus>
      <SaveBar record={form} saveLabel="Save practice details" discardLabel="Discard changes" />

      <Dialog
        open={!!confirm}
        onOpenChange={(open) => { if (!open) answer(false); }}
        size="sm"
        background="stationary"
        title="Discard unsaved changes?"
        description="Your changes to the practice name and contact email haven’t been saved. Leaving now discards them."
        focusSelector="[data-keep]"
        returnFocus={() => document.querySelector<HTMLElement>('main h1')}
        footer={<>
          <Button data-keep variant="secondary" onClick={() => answer(false)}>Keep editing</Button>
          <Button variant="danger" onClick={() => answer(true)}>Discard changes</Button>
        </>}
      />
    </main>
  );
}

function DemoFailSwitch() {
  const [on, setOn] = React.useState(demo.failNextSave);
  return (
    <Switch
      label="Make the next save fail"
      checked={on}
      onCheckedChange={(v) => { demo.failNextSave = v; setOn(v); }}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
  </AltitudeProvider>,
);
