// The landing page. Its design record (Distinctiveness rule 2, screen layout):
//   Task:    a React developer, or an agent working for one, decides whether Altitude fits their app, then installs it.
//   Lead:    height showing state, in one real component you can make succeed and fail (the hero's InlineEdit).
//   Primary: Browse components. Next: set up an agent, or install.
// Four bands, each with one point: what it is (hero), what you stop writing (loading), what your agent gets (agents),
// how to start. The laws, the evidence and the theming detail live in the guide and Research; the page links to them.
// Everything on it is built from the shipped components and tokens. It adds no tier: bands are the ground, parted by
// `line`; code is flush (CodeBlock); copying confirms in its button (CopyButton).
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider, Avatar, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  CodeBlock, DataTable, InlineEdit, Switch, Tabs, TabsList, TabsTrigger,
} from '../project/components/src/index';
/** Injected by scripts/build-site.mjs, counted from the repository at build time. */
declare const __SITE__: { version: string; experiments: number; checks: number; patterns: number; examples: { slug: string; title: string; what: string }[] };
import type { BuiltInScheme } from '../project/components/src/index';
import { agentSetup, installTabs, quickStart, yourCode } from './snippets';

const REPO = 'https://github.com/richlaconte/altitude';
const LINKS = {
  storybook: 'https://richlaconte.github.io/altitude/storybook/',
  github: REPO,
  guide: `${REPO}/blob/main/project/README.md`,
  research: `${REPO}/blob/main/project/Research.md`,
  framework: `${REPO}/blob/main/project/framework/README.md`,
  awaitDocs: `${REPO}/blob/main/project/components/Await/README.md`,
  npm: 'https://www.npmjs.com/package/altitude-design',
};

/* ───────────── code: CodeBlock is the record; Altitude ships no highlighter, so this small one returns its tok-* classes ───────────── */

const TOKEN = /(\{\/\*[\s\S]*?\*\/\}|\/\/[^\n]*|^#[^\n]*)|('[^'\n]*'|"[^"\n]*"|`[^`]*`)|(<\/?)([A-Za-z][\w.]*)|\b(export|default|function|const|let|return|if|import|from|throw|as|type|new|null|true|false)\b/gm;
function syntax(code: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let last = 0, m: RegExpExecArray | null, i = 0;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code))) {
    if (m.index > last) parts.push(code.slice(last, m.index));
    if (m[1]) parts.push(<span key={i++} className="tok-comment">{m[1]}</span>);
    else if (m[2]) parts.push(<span key={i++} className="tok-string">{m[2]}</span>);
    else if (m[4]) parts.push(m[3], <span key={i++} className="tok-keyword">{m[4]}</span>);
    else if (m[5]) parts.push(<span key={i++} className="tok-keyword">{m[5]}</span>);
    last = TOKEN.lastIndex;
  }
  parts.push(code.slice(last));
  return parts;
}

/* ───────────── hero: one value, saved and failed, in the shipped InlineEdit ───────────── */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
function OneValue() {
  const [title, setTitle] = React.useState('Faster cold starts');
  const [fail, setFail] = React.useState(false);
  const [slow, setSlow] = React.useState(true);
  return (
    <div className="idea-demo">
      <div className="idea-record">
        <p className="idea-record-meta">Release note · Week 44</p>
        <InlineEdit label="Release title" trigger="field" hint="seam" value={title} onValueChange={setTitle} required maxLength={60}
          onSave={async (draft) => {
            await wait(slow ? 1400 : 120);
            return fail ? { ok: false, error: 'We couldn’t reach the server. Your text is kept; try again.' } : { ok: true, value: draft.trim() };
          }} />
        <p className="idea-record-body">Cold starts are down 38% across all regions.</p>
      </div>
      <div className="idea-controls">
        <Switch label="Slow network" checked={slow} onCheckedChange={setSlow} />
        <Switch label="Make the next save fail" checked={fail} onCheckedChange={setFail} />
      </div>
      <p className="caption">
        Edit the title. The field is cut into the page; a save in flight lifts above it; the saved title settles back with a
        brief glow. A failed save sinks, says why in words, and keeps your text.
      </p>
    </div>
  );
}

/* ───────────── loading: skeletons you don't write ───────────── */

type Latency = 'fast' | 'typical' | 'slow';
type PartKey = 'user' | 'presence' | 'deploys';
const PLANS: Record<Latency, Record<PartKey, number>> = {
  fast: { user: 120, presence: 180, deploys: 240 },
  typical: { user: 700, presence: 1100, deploys: 1700 },
  slow: { user: 2000, presence: 2600, deploys: 3300 },
};
const LATENCY_LABEL: Record<Latency, string> = { fast: 'Fast', typical: 'Typical', slow: 'Slow' };

type Deploy = { id: string; service: string; region: string; duration: string; ok: boolean };
const DEPLOYS: Deploy[] = [
  { id: 'd1', service: 'edge-router', region: 'eu-west-1', duration: '1m 42s', ok: true },
  { id: 'd2', service: 'billing-api', region: 'us-east-2', duration: '3m 05s', ok: true },
  { id: 'd3', service: 'search-indexer', region: 'ap-south-1', duration: '4m 51s', ok: false },
  { id: 'd4', service: 'auth', region: 'eu-central-2', duration: '58s', ok: true },
];
const columns = [
  { key: 'service', header: 'Service', cell: (d: Deploy) => <span className="mono">{d.service}</span> },
  { key: 'region', header: 'Region' },
  { key: 'duration', header: 'Duration', align: 'end' as const },
  { key: 'result', header: 'Result', cell: (d: Deploy) => <Badge tone={d.ok ? 'positive' : 'critical'}>{d.ok ? 'Live' : 'Failed'}</Badge> },
];
const USER = { name: 'Mara Quist', role: 'Platform engineer, Lisbon', bio: 'Merged “Faster cold starts” into main. Cold starts are down 38% across all regions.' };
const PRESENCE = { label: 'On call' };

/** Stands in for useQuery or useSWR: `data` is undefined until the response arrives. */
function useFakeQuery<T>(value: T, ms: number): { data: T | undefined } {
  const [data, setData] = React.useState<T | undefined>(undefined);
  React.useEffect(() => { const t = setTimeout(() => setData(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return { data };
}

/** Written the way you'd write it anyway: no loading flags, no skeleton markup. */
function Member({ delays }: { delays: Record<PartKey, number> }) {
  const { data: user } = useFakeQuery(USER, delays.user);
  const { data: presence } = useFakeQuery(PRESENCE, delays.presence);
  const { data: deploys } = useFakeQuery(DEPLOYS, delays.deploys);
  return (
    <div className="stage-stack">
      <Card className="member">
        <CardHeader>
          <div className="who">
            <Avatar name={user?.name} size={44} status="active" />
            <div className="who-id">
              <CardTitle>{user?.name}</CardTitle>
              <CardDescription skeleton={{ lines: 1, width: '72%' }}>{user?.role}</CardDescription>
            </div>
            <Badge tone="positive">{presence?.label}</Badge>
          </div>
        </CardHeader>
        <CardContent skeleton={{ lines: 2 }}>{user?.bio}</CardContent>
      </Card>
      <DataTable aria-label="Recent deploys" columns={columns} rows={deploys} getRowId={(d) => d.id} getRowLabel={(d) => d.service} skeleton={{ lines: 4 }} />
    </div>
  );
}

function SuspenseDemo() {
  const [latency, setLatency] = React.useState<Latency>('typical');
  const [round, setRound] = React.useState(0);
  const [landed, setLanded] = React.useState(false);
  const delays = PLANS[latency];
  React.useEffect(() => {
    setLanded(false);
    const t = setTimeout(() => setLanded(true), Math.max(...Object.values(delays)));
    return () => clearTimeout(t);
  }, [delays, round]);
  return (
    <div className="demo">
      <div className="demo-bar">
        <Tabs variant="segmented" value={latency} onValueChange={(v) => { setLatency(v as Latency); setRound((r) => r + 1); }}>
          <TabsList aria-label="Network speed">
            {(Object.keys(LATENCY_LABEL) as Latency[]).map((l) => <TabsTrigger key={l} value={l}>{LATENCY_LABEL[l]}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <Button variant="secondary" onClick={() => setRound((r) => r + 1)} aria-describedby="reload-state">Reload data</Button>
        <span id="reload-state" className="alt-sr" aria-live="polite">{landed ? 'All parts loaded.' : ''}</span>
      </div>
      <div className="demo-split">
        <div className="demo-stage"><Member key={round} delays={delays} /></div>
        <CodeBlock title="Your code" language="tsx" code={yourCode} syntax={syntax} maxHeight={640} />
      </div>
    </div>
  );
}

/* ───────────── the page ───────────── */

const SCHEMES: { id: BuiltInScheme; label: string }[] = [
  { id: 'daylight', label: 'Light' }, { id: 'nightfall', label: 'Dark' },
];

function systemScheme(): BuiltInScheme {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'dark') return 'nightfall';
  if (t === 'light') return 'daylight';
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'nightfall' : 'daylight';
}

/** The nav lies on the ground and rises one level once content passes under it, as a sticky PageHeader does: a
 *  sentinel at the top of the page and an IntersectionObserver, so it changes only when the state does. */
function useRaisedOnScroll(sentinel: React.RefObject<HTMLElement | null>) {
  const [raised, setRaised] = React.useState(false);
  React.useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setRaised(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [sentinel]);
  return raised;
}

function Page() {
  const [scheme, setScheme] = React.useState<BuiltInScheme>(systemScheme);
  const top = React.useRef<HTMLSpanElement>(null);
  const raised = useRaisedOnScroll(top);
  React.useLayoutEffect(() => { document.body.setAttribute('data-theme', scheme); }, [scheme]);
  return (
    <AltitudeProvider scheme={scheme} className="page">
      <span ref={top} className="nav-sentinel" aria-hidden="true" />
      <a className="skip" href="#main">Skip to content</a>
      <header className="nav" data-raised={raised ? '' : undefined}>
        <div className="wrap nav-row">
          <a className="brand" href="#top" aria-label="Altitude, back to top">
            <span className="mark" aria-hidden="true"><i /><i /><i /></span>Altitude
          </a>
          <div className="nav-end">
            <nav className="nav-links" aria-label="Site">
              <a href={LINKS.storybook} target="_blank" rel="noopener noreferrer">Components</a>
              <a className="nav-local" href={LINKS.guide} target="_blank" rel="noopener noreferrer">Guide</a>
              <a className="nav-local" href="#examples">Examples</a>
              <a className="nav-local" href={LINKS.github} target="_blank" rel="noopener noreferrer">GitHub</a>
            </nav>
            <Tabs variant="segmented" className="scheme-toggle" value={scheme} onValueChange={(v) => setScheme(v as BuiltInScheme)}>
              <TabsList aria-label="Colour scheme">{SCHEMES.map((s) => <TabsTrigger key={s.id} value={s.id}>{s.label}</TabsTrigger>)}</TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="hero" id="top">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="hero-meta">React components · v{__SITE__.version} · MIT licence</p>
              <h1 className="display">Height is the interface.</h1>
              <p className="lead">
                A React component library where height shows state: settled content on the ground, anything live above it,
                anything to fill below it. It ships with guidance your coding agent reads, so the apps it builds get the
                in-between states right.
              </p>
              <div className="hero-actions">
                <a className="alt-btn" data-variant="primary" data-size="lg" href={LINKS.storybook} target="_blank" rel="noopener noreferrer"><span className="alt-btn-label">Browse components</span></a>
                <a className="alt-btn" data-variant="secondary" data-size="lg" href="#agents"><span className="alt-btn-label">Set up your agent</span></a>
              </div>
              <CodeBlock className="hero-install" title="Install" tabs={installTabs} syntax={syntax} />
            </div>
            <div className="hero-art">
              <OneValue />
            </div>
          </div>
        </section>

        <section className="band" id="loading" aria-labelledby="loading-title">
          <div className="wrap">
            <div className="section-head">
              <h2 className="h2" id="loading-title">Skeletons you don't write.</h2>
              <p className="lede">
                Pass your data as you already do. While it's undefined, each component holds its own shape; when it arrives,
                the content rises into place. No loading flags. <a href={LINKS.awaitDocs} target="_blank" rel="noopener noreferrer">Read the loading guide</a>.
              </p>
            </div>
            <SuspenseDemo />
          </div>
        </section>

        <section className="band" id="agents" aria-labelledby="agents-title">
          <div className="wrap">
            <div className="section-head">
              <h2 className="h2" id="agents-title">Built for the apps agents write.</h2>
              <p className="lede">Agents skip the states between a click and its outcome. Altitude gives yours the rules and the checks to handle them.</p>
            </div>
            <div className="split">
              <ul className="points">
                <li>
                  <strong>Guidance in the package.</strong> {__SITE__.patterns} task patterns: editing a record, finding records,
                  billing, sign-in, sync and more. Your agent reads the copy that matches your installed version. <a href={LINKS.framework} target="_blank" rel="noopener noreferrer">See the patterns</a>.
                </li>
                <li>
                  <strong>A checker.</strong> <code>altitude check</code> flags hard-coded colours, a missing provider, pie charts
                  and buttons labelled OK or Submit.
                </li>
                <li>
                  <strong>Components for the agent itself.</strong> Proposals, streaming answers, traces and a fleet of agents
                  on one job. <a href="agent.html" target="_blank" rel="noopener noreferrer">Watch an agent run</a>.
                </li>
              </ul>
              <CodeBlock title="Point your agent at the installed guidance" language="sh" code={agentSetup} syntax={syntax} />
            </div>
            <div className="examples" id="examples">
              <h3 className="h3">Example apps you can break</h3>
              <p className="lede small">Whole products on a simulated server in your browser. Make the next save slow, fail, lose its response or conflict, and see what the product does.</p>
              <ul className="example-links">
                {__SITE__.examples.map((e) => <li key={e.slug}><a href={`examples/${e.slug}.html`} target="_blank" rel="noopener noreferrer">{e.title}</a></li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="band" aria-labelledby="start-title">
          <div className="wrap start">
            <div className="section-head">
              <h2 className="h2" id="start-title">Install it, wrap your app once.</h2>
              <p className="lede">React 18.2 or 19. The props mirror shadcn/ui, so most of it will feel familiar.</p>
              <p className="lede small">
                The rules come from perception research and {__SITE__.experiments} experiments measured in Altitude's own
                rendering. <a href={LINKS.research} target="_blank" rel="noopener noreferrer">Research</a> records what's proven, what isn't yet, and what was dropped.
              </p>
              <div className="start-links">
                <a className="alt-btn" data-variant="primary" data-size="md" href={LINKS.storybook} target="_blank" rel="noopener noreferrer"><span className="alt-btn-label">Browse components</span></a>
                <a href={LINKS.guide} target="_blank" rel="noopener noreferrer">Read the design guide</a>
              </div>
            </div>
            <div className="start-code">
              <CodeBlock title="App.tsx" language="tsx" code={quickStart} syntax={syntax} />
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap foot-row">
          <span>Altitude · MIT licence · this page is built with Altitude</span>
          <nav className="nav-links" aria-label="Elsewhere">
            <a href={LINKS.storybook} target="_blank" rel="noopener noreferrer">Storybook</a>
            <a href={LINKS.npm} target="_blank" rel="noopener noreferrer">npm</a>
            <a href={LINKS.github} target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href={`${LINKS.github}/issues/new/choose`} target="_blank" rel="noopener noreferrer">Report an issue</a>
          </nav>
        </div>
      </footer>
    </AltitudeProvider>
  );
}

createRoot(document.getElementById('altitude-site')!).render(<Page />);
