// The React side of the example apps' shared module (#400): a hook for the simulated service, and the frame every
// example renders in: one AltitudeProvider, the app, then the fixtures drawer below it, outside the app's main.
// Built only from the public altitude-design API.
import * as React from 'react';
import {
  Accordion, AltitudeProvider, Badge, Button, Radio, RadioGroup, Select, Switch, Tabs, TabsList, TabsTrigger,
} from 'altitude-design';
import type { BuiltInScheme, Tone } from 'altitude-design';
import { DEMO_MODES } from './service';
import type { DemoLogEntry, DemoMode, DemoService, DemoSnapshot } from './service';

export * from './service';

/** The service's store, mode and log, re-rendering when any of them changes. */
export function useDemoService<S>(service: DemoService<S>): DemoSnapshot<S> {
  return React.useSyncExternalStore(service.subscribe, service.getSnapshot, service.getSnapshot);
}

export interface DemoQuery<T> {
  /** The last answer. Kept while a refresh is in flight or after a refresh fails. */
  data: T | undefined;
  /** Why the last read failed. Cleared by the next answer. */
  error: Error | undefined;
  loading: boolean;
  reload: () => Promise<void>;
  /** Change the held answer in place, for an optimistic write. */
  setData: (update: (data: T | undefined) => T | undefined) => void;
}

/**
 * A read through the service: it runs on mount, again when something changes elsewhere (externalRevision) or the
 * example is reset (resetRevision), and on reload. An answer that arrives after a newer request was sent is ignored.
 */
export function useDemoQuery<S, T>(service: DemoService<S>, op: string, input?: unknown): DemoQuery<T> {
  const { externalRevision, resetRevision } = useDemoService(service);
  const [state, setState] = React.useState<{ data: T | undefined; error: Error | undefined; loading: boolean }>({ data: undefined, error: undefined, loading: true });
  const seq = React.useRef(0);
  const key = JSON.stringify(input ?? null);
  const reload = React.useCallback(async () => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await service.request<T>(op, input);
      if (id === seq.current) setState({ data, error: undefined, loading: false });
    } catch (e) {
      if (id === seq.current) setState((s) => ({ ...s, error: e instanceof Error ? e : new Error(String(e)), loading: false }));
    }
  }, [service, op, key]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (resetRevision) setState({ data: undefined, error: undefined, loading: true }); }, [resetRevision]);
  React.useEffect(() => { void reload(); }, [reload, externalRevision, resetRevision]);
  const setData = React.useCallback((update: (data: T | undefined) => T | undefined) => setState((s) => ({ ...s, data: update(s.data) })), []);
  return { ...state, reload, setData };
}

/** Something that happens outside the app, offered as a button in the drawer. */
export interface ExternalEvent { label: string; run: () => void }

const SCHEMES: { id: BuiltInScheme; label: string }[] = [{ id: 'daylight', label: 'Daylight' }, { id: 'nightfall', label: 'Nightfall' }];
// The landing page's swatches (site/main.tsx), so the examples and the site offer the same accents.
const ACCENTS = [
  { value: 'scheme', label: "The scheme's own" },
  { value: '#0f8a6b', label: 'Pine' },
  { value: '#2a6f9e', label: 'Harbor' },
  { value: '#b13a68', label: 'Rosewood' },
  { value: '#6b7d1e', label: 'Olive' },
];
const systemScheme = (): BuiltInScheme => {
  try { return matchMedia('(prefers-color-scheme: dark)').matches ? 'nightfall' : 'daylight'; } catch { return 'daylight'; }
};

const STATUS: Record<DemoLogEntry['status'], { tone: Tone; word: string; lamp?: boolean | 'pulse' }> = {
  pending: { tone: 'neutral', word: 'Waiting', lamp: 'pulse' },
  ok: { tone: 'positive', word: 'Succeeded' },
  rejected: { tone: 'critical', word: 'Rejected' },
  lost: { tone: 'caution', word: 'Response lost' },
  aborted: { tone: 'neutral', word: 'Cancelled' },
  external: { tone: 'neutral', word: 'Elsewhere', lamp: false },
};

const modeAnnouncement = (mode: DemoMode, once: boolean) => {
  const m = DEMO_MODES.find((x) => x.value === mode)!;
  if (mode === 'success') return 'Requests will succeed.';
  return once ? `The next request: ${m.label.toLowerCase()}. Then requests succeed again.` : `${m.description} This lasts until you change it.`;
};

export interface FixturesDrawerProps<S> {
  service: DemoService<S>;
  /** Modes offered. Default: all of them. */
  modes?: DemoMode[];
  events?: ExternalEvent[];
  /** The page modes, owned by ExampleFrame. */
  page: PageModes;
  onPageChange: (page: PageModes) => void;
}

export interface PageModes { scheme: BuiltInScheme; accent: string; reduced: boolean; more: boolean }

/** The example's controls: the server's behaviour, things that happen elsewhere, the page's modes, and the request log. */
export function FixturesDrawer<S>({ service, modes, events = [], page, onPageChange }: FixturesDrawerProps<S>) {
  const snap = useDemoService(service);
  const [said, setSaid] = React.useState('');
  const offered = DEMO_MODES.filter((m) => !modes || modes.includes(m.value));
  const setMode = (mode: DemoMode, once: boolean) => { service.setMode(mode, { once }); setSaid(modeAnnouncement(mode, once && mode !== 'success')); };
  const set = (patch: Partial<PageModes>) => onPageChange({ ...page, ...patch });

  const content = (
    <div className="ex-drawer-body">
      <section className="ex-group" aria-labelledby="ex-server">
        <h3 id="ex-server" className="ex-group-title">The server</h3>
        <RadioGroup value={snap.mode} onValueChange={(v) => setMode(v as DemoMode, snap.once)} aria-labelledby="ex-server">
          {offered.map((m) => <Radio key={m.value} value={m.value} label={m.label} description={m.description} />)}
        </RadioGroup>
        <Switch checked={snap.once} onCheckedChange={(once) => setMode(snap.mode, once)} label="Only the next request" disabled={snap.mode === 'success'} />
      </section>
      {events.length > 0 && (
        <section className="ex-group" aria-labelledby="ex-elsewhere">
          <h3 id="ex-elsewhere" className="ex-group-title">Elsewhere</h3>
          <p className="ex-caption">Changes made by someone else, as the server would report them.</p>
          <div className="ex-actions">{events.map((e) => <Button key={e.label} size="sm" onClick={e.run}>{e.label}</Button>)}</div>
        </section>
      )}
      <section className="ex-group" aria-labelledby="ex-page">
        <h3 id="ex-page" className="ex-group-title">The page</h3>
        <Tabs variant="segmented" value={page.scheme} onValueChange={(v) => set({ scheme: v as BuiltInScheme })}>
          <TabsList aria-label="Scheme">{SCHEMES.map((s) => <TabsTrigger key={s.id} value={s.id}>{s.label}</TabsTrigger>)}</TabsList>
        </Tabs>
        <div className="ex-field">
          <span id="ex-accent" className="ex-label">Accent</span>
          <Select aria-labelledby="ex-accent" value={page.accent} onValueChange={(accent) => set({ accent })} items={ACCENTS} />
        </div>
        <Switch checked={page.reduced} onCheckedChange={(reduced) => set({ reduced })} label="Reduced motion" />
        <Switch checked={page.more} onCheckedChange={(more) => set({ more })} label="More contrast" />
      </section>
      <section className="ex-group ex-log" aria-labelledby="ex-log">
        <div className="ex-log-head">
          <h3 id="ex-log" className="ex-group-title">Requests</h3>
          <Button size="sm" variant="secondary" onClick={() => { service.reset(); setSaid('The example data is back to the start.'); }}>Reset example data</Button>
        </div>
        {snap.log.length === 0
          ? <p className="ex-caption">No requests yet.</p>
          : (
            <ol className="ex-log-list">
              {snap.log.map((e) => {
                const s = STATUS[e.status];
                return (
                  <li key={e.id} className="ex-log-row" data-status={e.status}>
                    <code className="ex-log-op">{e.op}</code>
                    <Badge tone={s.tone} lamp={s.lamp}>{s.word}</Badge>
                    {e.mode !== 'success' && e.status !== 'external' && <span className="ex-caption">{DEMO_MODES.find((m) => m.value === e.mode)!.label}</span>}
                    <span className="ex-caption ex-log-outcome">{e.outcome}{e.settledAt !== undefined && e.status !== 'external' ? ` · ${e.settledAt - e.startedAt} ms` : ''}</span>
                  </li>
                );
              })}
            </ol>
          )}
      </section>
    </div>
  );

  return (
    <aside className="ex-drawer" aria-labelledby="ex-drawer-title">
      <h2 id="ex-drawer-title" className="ex-drawer-title">Example fixtures</h2>
      <p className="ex-caption">This example runs on a simulated service in your browser. Nothing is sent anywhere, and a simulated save proves nothing about a real server.</p>
      <Accordion items={[{ value: 'fixtures', title: 'Server, page and request log', content }]} type="single" defaultValue={[]} />
      <span className="ex-sr" role="status">{said}</span>
    </aside>
  );
}

export interface ExampleFrameProps<S> {
  service: DemoService<S>;
  modes?: DemoMode[];
  events?: ExternalEvent[];
  /** The app. It renders its own main. */
  children: React.ReactNode;
}

/** One AltitudeProvider around the app and its fixtures drawer, with the page modes the drawer controls. */
export function ExampleFrame<S>({ service, modes, events, children }: ExampleFrameProps<S>) {
  const [page, setPage] = React.useState<PageModes>(() => ({ scheme: systemScheme(), accent: 'scheme', reduced: false, more: false }));
  React.useLayoutEffect(() => { document.body.setAttribute('data-theme', page.scheme); }, [page.scheme]);
  return (
    <AltitudeProvider
      scheme={page.scheme}
      accent={page.accent === 'scheme' ? undefined : page.accent}
      motion={page.reduced ? 'reduced' : 'system'}
      contrast={page.more ? 'more' : 'system'}
      className="ex-frame"
    >
      <div className="ex-app">{children}</div>
      <FixturesDrawer service={service} modes={modes} events={events} page={page} onPageChange={setPage} />
    </AltitudeProvider>
  );
}
