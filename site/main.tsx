import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider, Avatar, AvatarGroup, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  DataTable, Field, Input, Kbd, Progress, RevealGroup, Select, Surface, Switch, Tabs, TabsContent, TabsList, TabsTrigger,
  Toaster, toast,
} from '../project/components/src/index';
import type { BuiltInScheme } from '../project/components/src/index';
type Level = NonNullable<React.ComponentProps<typeof Surface>['level']>;
import { arrivalCode, insideAvatar, insideAwait, install, quickStart, yourCode } from './snippets';

const LINKS = {
  storybook: 'https://richlaconte.github.io/altitude/storybook/',
  github: 'https://github.com/richlaconte/altitude',
  guide: 'https://github.com/richlaconte/altitude/blob/main/project/README.md',
  awaitDocs: 'https://github.com/richlaconte/altitude/blob/main/project/components/Await/README.md',
  npm: 'https://www.npmjs.com/package/altitude-design',
};

/* ───────────── a small TSX highlighter: comments, strings, keywords, tags ───────────── */

const TOKEN = /(\{\/\*[\s\S]*?\*\/\}|\/\/[^\n]*)|('[^'\n]*'|"[^"\n]*"|`[^`]*`)|(<\/?)([A-Za-z][\w.]*)|\b(export|default|function|const|let|return|if|import|from|throw|as|type|new|null|true|false)\b|\b(\d[\d_]*(?:ms|px)?)\b/g;
function Code({ code, label }: { code: string; label: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0, m: RegExpExecArray | null, i = 0;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code))) {
    if (m.index > last) parts.push(code.slice(last, m.index));
    if (m[1]) parts.push(<span key={i++} className="tk-c">{m[1]}</span>);
    else if (m[2]) parts.push(<span key={i++} className="tk-s">{m[2]}</span>);
    else if (m[4]) parts.push(m[3], <span key={i++} className={/^[A-Z]/.test(m[4]) ? 'tk-t' : 'tk-h'}>{m[4]}</span>);
    else if (m[5]) parts.push(<span key={i++} className="tk-k">{m[5]}</span>);
    else if (m[6]) parts.push(<span key={i++} className="tk-n">{m[6]}</span>);
    last = TOKEN.lastIndex;
  }
  parts.push(code.slice(last));
  return <pre className="code" tabIndex={0} aria-label={label}><code>{parts}</code></pre>;
}

function CopyLine({ text }: { text: string }) {
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast({ title: 'Copied to your clipboard', description: text, tone: 'positive', duration: 2400 }); }
    catch {
      const r = document.createRange(); const el = document.getElementById('install-line');
      if (el) { r.selectNodeContents(el); const s = getSelection(); s?.removeAllRanges(); s?.addRange(r); }
      toast({ title: 'Press ⌘C or Ctrl+C to copy', duration: 2400 });
    }
  };
  return (
    <div className="install">
      <span className="install-prompt" aria-hidden="true">$</span>
      <code id="install-line">{text}</code>
      <Button size="sm" variant="ghost" onClick={copy}>Copy</Button>
    </div>
  );
}

/* ───────────── hero: the ladder itself ───────────── */

const RUNGS: { level: Level; tier: string; what: string }[] = [
  { level: 5, tier: 'Floating', what: 'Dialog: one thing at the summit, ever' },
  { level: 4, tier: 'Floating', what: 'Sheet, toast' },
  { level: 3, tier: 'Floating', what: 'Menu, popover, a card in your hand' },
  { level: 2, tier: 'Raised', what: 'Primary action, hover' },
  { level: 1, tier: 'Raised', what: 'Card, button' },
  { level: 0, tier: 'Ground', what: 'The record: rows, badges, alerts' },
  { level: -1, tier: 'Sunk', what: 'An empty field, a slot' },
  { level: -2, tier: 'Sunk', what: 'An invalid field, a trench' },
];
function Ladder() {
  return (
    <ol className="ladder" aria-label="The elevation ladder, from level 5 down to level −2">
      {RUNGS.map((r, i) => {
        const startsTier = i === 0 || RUNGS[i - 1].tier !== r.tier;
        return (
          <li key={r.level} className="rung" data-tier={r.tier.toLowerCase()} style={{ ['--step' as string]: 7 - i }}>
            <span className="rung-tier" aria-hidden={!startsTier}>{startsTier ? r.tier : ''}</span>
            <Surface level={r.level} className="rung-face">
              <span className="rung-level">{r.level > 0 ? '+' : r.level < 0 ? '−' : ''}{Math.abs(r.level)}</span>
              <span className="rung-what">{r.what}</span>
            </Surface>
          </li>
        );
      })}
    </ol>
  );
}

/* ───────────── the Suspense demo ───────────── */

type Latency = 'fast' | 'typical' | 'slow' | 'uneven';
type PartKey = 'user' | 'presence' | 'deploys';
const PARTS: { key: PartKey; label: string; what: string }[] = [
  { key: 'user', label: 'User', what: 'avatar, name, role, bio' },
  { key: 'presence', label: 'Presence', what: 'status badge' },
  { key: 'deploys', label: 'Deploys', what: 'table rows' },
];
const AXIS = 3500;
const PLANS: Record<Latency, () => Record<PartKey, number>> = {
  fast: () => ({ user: 120, presence: 180, deploys: 240 }),
  typical: () => ({ user: 700, presence: 1100, deploys: 1700 }),
  slow: () => ({ user: 2000, presence: 2600, deploys: 3300 }),
  uneven: () => {
    const r = () => Math.round((300 + Math.random() * 2900) / 50) * 50;
    return { user: r(), presence: r(), deploys: r() };
  },
};
const LATENCY_LABEL: Record<Latency, string> = { fast: 'Fast', typical: 'Typical', slow: 'Slow', uneven: 'Uneven' };

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

function Lane({ part, what, delay, landed, round }: { part: string; what: string; delay: number; landed: boolean; round: number }) {
  return (
    <li className="lane-row">
      <span className="lane-label">{part}<span className="lane-what">{what}</span></span>
      <span className="lane" aria-hidden="true">
        <span className="lane-grace" />
        <span key={round} className="lane-fill" data-landed={landed ? '' : undefined}
          style={{ width: `${(Math.min(delay, AXIS) / AXIS) * 100}%`, animationDuration: `${delay}ms` }} />
      </span>
      <span className="lane-ms">{(delay / 1000).toFixed(2)}s</span>
      <Badge tone={landed ? 'positive' : 'neutral'} lamp={landed ? true : 'pulse'} className="lane-state">{landed ? 'Landed' : 'Waiting'}</Badge>
    </li>
  );
}

function SuspenseDemo() {
  const [latency, setLatency] = React.useState<Latency>('typical');
  const [together, setTogether] = React.useState(false);
  const [round, setRound] = React.useState(0);
  const [delays, setDelays] = React.useState(() => PLANS.typical());
  const [landed, setLanded] = React.useState<Partial<Record<PartKey, boolean>>>({});

  const reload = (l: Latency = latency) => { setLanded({}); setDelays(PLANS[l]()); setRound((r) => r + 1); };
  React.useEffect(() => {
    const ts = PARTS.map((p) => setTimeout(() => setLanded((x) => ({ ...x, [p.key]: true })), delays[p.key]));
    return () => ts.forEach(clearTimeout);
  }, [delays, round]);

  const member = <Member key={round} delays={delays} />;
  const all = PARTS.every((p) => landed[p.key]);
  return (
    <div className="demo">
      <div className="demo-stage">
        {together ? <RevealGroup key={round}>{member}</RevealGroup> : member}
      </div>
      <Surface level={1} className="demo-panel">
        <div className="panel-block">
          <span className="panel-label" id="latency-label">Network</span>
          <Tabs variant="segmented" value={latency} onValueChange={(v) => { setLatency(v as Latency); reload(v as Latency); }}>
            <TabsList aria-labelledby="latency-label">
              {(Object.keys(LATENCY_LABEL) as Latency[]).map((l) => <TabsTrigger key={l} value={l}>{LATENCY_LABEL[l]}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>
        <ol className="lanes" aria-label="When each query's data arrives">
          {PARTS.map((p) => <Lane key={p.key} part={p.label} what={p.what} delay={delays[p.key]} landed={!!landed[p.key]} round={round} />)}
        </ol>
        <div className="lane-row lane-axis" aria-hidden="true">
          <span className="lane-label" />
          <span className="axis">
            {[0, 1, 2, 3].map((s) => <span key={s} className="axis-tick" style={{ left: `${((s * 1000) / AXIS) * 100}%` }}>{s}s</span>)}
          </span>
          <span className="lane-ms" /><span className="lane-state" />
        </div>
        <p className="panel-note">
          {latency === 'fast'
            ? 'Everything arrives inside the 300ms grace, so no imprint ever shows: the parts simply appear.'
            : together
              ? 'Landing together: parts that arrive early stay imprints until the slowest lands, then rise at once.'
              : 'Each part rises out of its imprint as its own data lands, four rises at a time at most. The dashed line is the 300ms grace: anything that lands before it never shows an imprint.'}
        </p>
        <div className="panel-actions">
          <Switch label="Land together" checked={together} onCheckedChange={(on) => { setTogether(on); reload(); }} />
          <Button variant="primary" onClick={() => reload()} aria-describedby="reload-state">Reload data</Button>
          <span id="reload-state" className="alt-sr" aria-live="polite">{all ? 'All parts landed.' : ''}</span>
        </div>
      </Surface>
    </div>
  );
}

function CodeTabs() {
  return (
    <Tabs defaultValue="yours" className="code-tabs">
      <TabsList aria-label="Code">
        <TabsTrigger value="yours">Your code</TabsTrigger>
        <TabsTrigger value="avatar">Avatar</TabsTrigger>
        <TabsTrigger value="arrival">useArrival</TabsTrigger>
        <TabsTrigger value="await">Await</TabsTrigger>
      </TabsList>
      <TabsContent value="yours"><Code label="Your code" code={yourCode} /></TabsContent>
      <TabsContent value="avatar"><Code label="Inside Avatar" code={insideAvatar} /></TabsContent>
      <TabsContent value="arrival"><Code label="useArrival" code={arrivalCode} /></TabsContent>
      <TabsContent value="await"><Code label="Await" code={insideAwait} /></TabsContent>
    </Tabs>
  );
}

/* ───────────── the laws, each with a specimen ───────────── */

function Laws() {
  const [opened, setOpened] = React.useState(0);
  return (
    <div className="laws">
      <Card className="law">
        <CardHeader><CardTitle>Push up, fill down</CardTitle><CardDescription>Things you press are raised slabs with a wall under them. Things you fill are openings cut into the page.</CardDescription></CardHeader>
        <CardContent><div className="specimen"><Input aria-label="Project name" placeholder="Project name" /><Button>Create</Button></div></CardContent>
      </Card>
      <Card className="law">
        <CardHeader><CardTitle>Altitude is importance</CardTitle><CardDescription>The primary action rests at level 2, secondary at 1, ghost on the ground. Wall thickness says which is which.</CardDescription></CardHeader>
        <CardContent><div className="specimen"><Button variant="primary">Publish</Button><Button>Preview</Button><Button variant="ghost">Discard</Button></div></CardContent>
      </Card>
      <Card className="law">
        <CardHeader><CardTitle>Only what moves, moves</CardTitle><CardDescription>A surface lifts on hover only if clicking it does something. Point at both of these.</CardDescription></CardHeader>
        <CardContent>
          <div className="specimen specimen-cards">
            <Surface level={1} className="mini">Static</Surface>
            <Surface level={1} interactive className="mini" role="button" onClick={() => setOpened((n) => n + 1)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpened((n) => n + 1); } }}>
              {opened ? `Opened ${opened}×` : 'Opens'}
            </Surface>
          </div>
        </CardContent>
      </Card>
      <Card className="law">
        <CardHeader><CardTitle>Height never travels alone</CardTitle><CardDescription>Every signal also has a word, an icon, an ARIA state or a border, so it survives screen readers and forced colours.</CardDescription></CardHeader>
        <CardContent><div className="specimen"><Badge tone="positive">Operational</Badge><Badge tone="caution">Degraded</Badge><Badge tone="critical">Outage</Badge></div></CardContent>
      </Card>
    </div>
  );
}

/* ───────────── theming: drives the whole page ───────────── */

const SCHEMES: { id: BuiltInScheme; label: string }[] = [
  { id: 'daylight', label: 'Daylight' }, { id: 'nightfall', label: 'Nightfall' }, { id: 'mesa', label: 'Mesa' }, { id: 'alpine', label: 'Alpine' },
];
const ACCENTS: { id: string; label: string; hex: string | undefined }[] = [
  { id: 'scheme', label: 'Scheme default', hex: undefined },
  { id: 'pine', label: 'Pine', hex: '#0f8a6b' },
  { id: 'ember', label: 'Ember', hex: '#c2410c' },
  { id: 'cobalt', label: 'Cobalt', hex: '#1d4ed8' },
  { id: 'rose', label: 'Rose', hex: '#be185d' },
];
type Look = { scheme: BuiltInScheme; accent?: string; reduced: boolean; more: boolean };

function Theming({ look, setLook }: { look: Look; setLook: (f: (l: Look) => Look) => void }) {
  return (
    <div className="theming">
      <Surface level={1} className="theme-controls">
        <div className="panel-block">
          <span className="panel-label" id="scheme-label">Scheme</span>
          <Tabs variant="segmented" value={look.scheme} onValueChange={(v) => setLook((l) => ({ ...l, scheme: v as BuiltInScheme }))}>
            <TabsList aria-labelledby="scheme-label">{SCHEMES.map((s) => <TabsTrigger key={s.id} value={s.id}>{s.label}</TabsTrigger>)}</TabsList>
          </Tabs>
        </div>
        <div className="panel-block">
          <span className="panel-label" id="accent-label">Accent</span>
          <div className="swatches" role="group" aria-labelledby="accent-label">
            {ACCENTS.map((a) => (
              <button key={a.id} type="button" className="swatch" aria-pressed={look.accent === a.hex} aria-label={a.label} title={a.label}
                data-default={a.hex ? undefined : ''} style={a.hex ? { ['--sw' as string]: a.hex } : undefined}
                onClick={() => setLook((l) => ({ ...l, accent: a.hex }))} />
            ))}
          </div>
        </div>
        <div className="panel-block switches">
          <Switch label="Reduced motion" checked={look.reduced} onCheckedChange={(on) => setLook((l) => ({ ...l, reduced: on }))} />
          <Switch label="More contrast" checked={look.more} onCheckedChange={(on) => setLook((l) => ({ ...l, more: on }))} />
        </div>
        <p className="panel-note">These change the whole page. A custom accent derives its own text, fill and tint colours, checked for contrast on every surface of the scheme.</p>
      </Surface>
      <Card className="sample">
        <CardHeader><CardTitle>Invite your team</CardTitle><CardDescription>Seats are billed monthly. You can remove people at any time.</CardDescription></CardHeader>
        <CardContent>
          <div className="sample-body">
            <Field label="Email address" hint="We'll send them a link that works for 7 days."><Input type="email" placeholder="ana@northwind.studio" /></Field>
            <Field label="Role">
              <Select aria-label="Role" defaultValue="editor" items={[{ value: 'viewer', label: 'Viewer' }, { value: 'editor', label: 'Editor' }, { value: 'admin', label: 'Admin' }]} />
            </Field>
            <div className="seats">
              <AvatarGroup max={4}>
                <Avatar name="Mara Quist" status="active" size={30} />
                <Avatar name="Tomás Reyes" status="idle" size={30} />
                <Avatar name="Ines Park" status="active" size={30} />
                <Avatar name="Dev Olsen" status="offline" size={30} />
                <Avatar name="Lu Chen" size={30} />
              </AvatarGroup>
              <div className="seats-meter"><span className="seats-text">7 of 10 seats used</span><Progress value={70} aria-label="Seats used" /></div>
            </div>
            <div className="sample-actions"><Button variant="ghost">Cancel</Button><Button variant="primary">Send invite</Button></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────────── the page ───────────── */

function systemScheme(): BuiltInScheme {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'dark') return 'nightfall';
  if (t === 'light') return 'daylight';
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'nightfall' : 'daylight';
}

function Page() {
  const [look, setLook] = React.useState<Look>(() => ({ scheme: systemScheme(), reduced: false, more: false }));
  React.useLayoutEffect(() => { document.body.setAttribute('data-theme', look.scheme); }, [look.scheme]);
  return (
    <AltitudeProvider scheme={look.scheme} accent={look.accent} motion={look.reduced ? 'reduced' : 'system'} contrast={look.more ? 'more' : 'system'} className="page">
      <header className="nav">
        <div className="wrap nav-row">
          <a className="brand" href="#top" aria-label="Altitude, back to top">
            <span className="mark" aria-hidden="true"><i /><i /><i /></span>Altitude
          </a>
          <nav className="nav-links" aria-label="Site">
            <a href="#workflows">Workflows</a>
            <a href="#loading">Loading</a>
            <a href="#theming">Theming</a>
            <a href={LINKS.storybook}>Components</a>
            <a href={LINKS.github}>GitHub</a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="kicker">Design and HCI framework · React · MIT licence</p>
              <h1 className="display">Height is the interface.</h1>
              <p className="lead">
                Altitude is a framework for agent-built web applications with one idea: <strong>the ground is the record.</strong> Settled content sits on the
                ground. Anything live rises above it. Anything waiting to be filled sinks below it.
              </p>
              <div className="hero-actions">
                <a className="alt-btn" data-variant="primary" data-size="lg" href={LINKS.storybook}><span className="alt-btn-label">Browse components</span></a>
                <a className="alt-btn" data-variant="secondary" data-size="lg" href={LINKS.guide}><span className="alt-btn-label">Read the design guide</span></a>
              </div>
              <CopyLine text={install} />
            </div>
            <div className="hero-art">
              <Ladder />
              <p className="caption">People read four tiers at a glance. The eight levels exist so hover and press can be felt.</p>
            </div>
          </div>
        </section>

        <section className="band agent-teaser" aria-labelledby="agent-teaser-title">
          <div className="wrap">
            <div className="section-head">
              <h2 className="headline" id="agent-teaser-title">Building for agents?</h2>
              <p className="lead">Watch one agent run through every state, a proposal that's raised and not pending, a streaming answer on a dashed rule, a failed step in a trench, a queued follow-up, in a complete harness. Jump to any moment.</p>
            </div>
            <a className="alt-btn" data-variant="secondary" data-size="md" href="agent.html"><span className="alt-btn-label">See Altitude for agents</span></a>
          </div>
        </section>

        <section className="band" id="workflows" aria-labelledby="workflows-title">
          <div className="wrap">
            <div className="section-head">
              <p className="kicker">From intent to interaction</p>
              <h2 className="h2" id="workflows-title">Build the whole workflow.</h2>
              <p className="lede">Ask for settings, search, a consequential action or a request process. Altitude supplies focused design guidance, small workflow hooks and checks for the states between the first click and the actual outcome.</p>
            </div>
            <div className="laws">
              {[
                ['Edit a record', 'Validate, preserve edits after failure, retry and report the actual save outcome.', 'EditRecord'],
                ['Find records', 'Distinguish loading, refresh, first-use emptiness, no results and failure.', 'AsyncCollection'],
                ['Act with consequences', 'Explain the target, confirm intent where needed and offer real recovery.', 'ConsequentialAction'],
                ['Review and send', 'Correct earlier answers, retain applicable data and keep a confirmation receipt.', 'ReviewSubmit'],
              ].map(([title, description, story]) => <Card key={story} className="law"><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><a href={LINKS.storybook + '?path=/story/patterns-' + story.toLowerCase() + '--preview'}>Try the workflow</a></CardContent></Card>)}
            </div>
            <div className="code-head"><h3 className="h3">Connect your agent to the installed guidance.</h3><p className="lede small">Explicit setup previews a small project instruction block. It preserves your instructions and routes the agent to the version you installed.</p></div>
            <Code label="Preview and apply agent setup" code={'npx altitude init --client codex\n# Review the preview, then apply:\nnpx altitude init --client codex --apply\n# Claude Code: use --client claude'} />
            <p className="lede small">Workflow patterns are experimental. Applications supply persistence, authorization, business validation, navigation and any real undo. Automated checks cover specific contracts; contextual design decisions and assistive-technology validation still need review.</p>
          </div>
        </section>

        <section className="band band-sunk" id="loading" aria-labelledby="loading-title">
          <div className="wrap">
            <div className="section-head">
              <p className="kicker">Suspense, built in</p>
              <h2 className="h2" id="loading-title">Skeletons you don't write.</h2>
              <p className="lede">
                Pass your data the way you already do. While it's still undefined, each component shows its own imprint at its own
                size, drawn from the same props and tokens, so nothing jumps. When the data arrives, the content rises out of the
                imprint. Change the network below and reload.
              </p>
            </div>
            <SuspenseDemo />
            <div className="code-head">
              <h3 className="h3">How it's handled</h3>
              <p className="lede small">Undefined means "not here yet". The component turns that into a suspension inside its own Suspense boundary, whose fallback is its own imprint. A component that never waits takes the old path: no boundary, no extra element. <a href={LINKS.awaitDocs}>Read the loading guide</a>.</p>
            </div>
            <CodeTabs />
            <ul className="facts">
              <li><strong>Undefined means not here yet.</strong> Pass <code>user?.name</code> while your query loads. <code>null</code> means there's nothing, and renders empty.</li>
              <li><strong>Optional parts wait with their card.</strong> An undefined description or body waits only while the card's required parts do, so a missing field never leaves a skeleton behind.</li>
              <li><strong>Under 300ms, nothing shows.</strong> The imprint waits out <Kbd>dur-grace</Kbd> before fading in, so fast loads never flash.</li>
              <li><strong>Promises work too.</strong> From a server component, pass a promise instead of the value; React 18 and 19 both work.</li>
            </ul>
          </div>
        </section>

        <section className="band" aria-labelledby="laws-title">
          <div className="wrap">
            <div className="section-head">
              <p className="kicker">The laws</p>
              <h2 className="h2" id="laws-title">Every component speaks the same physics.</h2>
            </div>
            <Laws />
          </div>
        </section>

        <section className="band band-sunk" id="theming" aria-labelledby="theming-title">
          <div className="wrap">
            <div className="section-head">
              <p className="kicker">Theming</p>
              <h2 className="h2" id="theming-title">Four schemes, one ladder.</h2>
              <p className="lede">Swap the scheme, bring your own accent, or turn on reduced motion and more contrast. The elevation language holds in all of them.</p>
            </div>
            <Theming look={look} setLook={setLook} />
          </div>
        </section>

        <section className="band" aria-labelledby="start-title">
          <div className="wrap start">
            <div className="section-head">
              <p className="kicker">Get started</p>
              <h2 className="h2" id="start-title">Install it, wrap your app once.</h2>
              <p className="lede">Render <code>AltitudeProvider</code> once around your app and import the stylesheet. The props mirror shadcn/ui, so most of it will feel familiar.</p>
              <CopyLine text={install} />
            </div>
            <Code label="Quick start" code={quickStart} />
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap foot-row">
          <span>Altitude · MIT licence · built with Altitude</span>
          <nav className="nav-links" aria-label="Elsewhere">
            <a href={LINKS.storybook}>Storybook</a>
            <a href={LINKS.npm}>npm</a>
            <a href={LINKS.github}>GitHub</a>
            <a href={`${LINKS.github}/issues/new/choose`}>Report an issue</a>
          </nav>
        </div>
      </footer>
      <Toaster />
    </AltitudeProvider>
  );
}

createRoot(document.getElementById('altitude-site')!).render(<Page />);
