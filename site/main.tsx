// The landing page. Its design record (Distinctiveness rule 2, screen layout):
//   Task:    a React developer, or an agent working for one, decides whether Altitude fits their app, then installs it.
//   Lead:    the one idea, the ground is the record, shown working in real components, not described.
//   Primary: Browse components (one per view; the install command is a CodeBlock with its own ghost CopyButton).
//   Next:    install, or read the guide.
// Everything on it is built from the shipped components and tokens. It adds no tier: bands are the ground, parted by
// `line`; code is flush (CodeBlock); copying confirms in its button (CopyButton); choices are switches (ColorSwatchPicker).
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider, Avatar, AvatarGroup, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  CodeBlock, ColorSwatchPicker, DataTable, Field, InlineEdit, Input, Kbd, Meter, RevealGroup, Select, Surface, Switch,
  Tabs, TabsList, TabsTrigger, Toaster, toast,
} from '../project/components/src/index';
/** Injected by scripts/build-site.mjs, counted from the repository at build time. */
declare const __SITE__: { version: string; experiments: number; checks: number; patterns: number };
import type { BuiltInScheme } from '../project/components/src/index';
type Level = NonNullable<React.ComponentProps<typeof Surface>['level']>;
import { agentSetup, arrivalCode, insideAvatar, insideAwait, installTabs, quickStart, yourCode } from './snippets';

const REPO = 'https://github.com/richlaconte/altitude';
const LINKS = {
  storybook: 'https://richlaconte.github.io/altitude/storybook/',
  github: REPO,
  guide: `${REPO}/blob/main/project/README.md`,
  elevation: `${REPO}/blob/main/project/Elevation.md`,
  research: `${REPO}/blob/main/project/Research.md`,
  framework: `${REPO}/blob/main/project/framework/README.md`,
  awaitDocs: `${REPO}/blob/main/project/components/Await/README.md`,
  benchmark: `${REPO}/blob/main/evals/distinctiveness/results/2026-10-31/REPORT.md`,
  npm: 'https://www.npmjs.com/package/altitude-design',
};
const story = (id: string) => `${LINKS.storybook}?path=/story/${id}--preview`;

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

/* ───────────── hero: the ladder itself ───────────── */

const RUNGS: { level: Level; tier: string; what: string }[] = [
  { level: 5, tier: 'Floating', what: 'Dialog: one thing at the summit, ever' },
  { level: 4, tier: 'Floating', what: 'Sheet, toast' },
  { level: 3, tier: 'Floating', what: 'Menu, popover, a card in your hand' },
  { level: 2, tier: 'Raised', what: 'The primary action, a hover' },
  { level: 1, tier: 'Raised', what: 'Card, button' },
  { level: 0, tier: 'Ground', what: 'The record: rows, labels, settled text' },
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

/* ───────────── the idea, working: one value through every reading ───────────── */

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
    </div>
  );
}

const READINGS: { name: string; what: string }[] = [
  { name: 'Editing opens a well.', what: 'Things you fill are cut into the page; the text stays exactly where it was.' },
  { name: 'Saving hovers.', what: 'A write in flight is live, so it lifts, but only after 300ms: a fast save never shows as pending.' },
  { name: 'Saved lands, and glows.', what: 'The accepted value settles back to the ground with an afterglow. It fades over 5 seconds, not the 8 a change you didn’t make gets, because you watched this one land.' },
  { name: 'Failing drops into a trench.', what: 'It says what happened in words and keeps your text for the retry.' },
];

const LAWS = [
  ['Altitude is importance.', 'The primary action rests at level 2; one thing at level 5, ever.'],
  ['Push up, fill down.', 'Things you press are raised slabs with a wall; things you fill are openings.'],
  ['Tiers carry meaning, levels carry motion.', 'People read four tiers at a glance; the eight levels make hover and press felt.'],
  ['Only what moves, moves.', 'A surface lifts on hover only if clicking it does something.'],
  ['Live things are above, settled things are on the ground.', 'New content arrives lifted and settles; pending writes hover until they land.'],
  ['The light never moves.', 'One light, straight above. Shadows fall down and are always darker than the ground.'],
  ['Height never travels alone.', 'Every signal also has a word, an icon, an ARIA state or a border.'],
];

/* ───────────── loading: skeletons you don't write ───────────── */

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
          <Button variant="secondary" onClick={() => reload()} aria-describedby="reload-state">Reload data</Button>
          <span id="reload-state" className="alt-sr" aria-live="polite">{all ? 'All parts landed.' : ''}</span>
        </div>
      </Surface>
    </div>
  );
}

/* ───────────── evidence: each rule with the finding behind it ───────────── */

const EVIDENCE: { rule: string; finding: string; source: string }[] = [
  { rule: 'Buttons show their height.', finding: 'On flat pages people missed 35.8% of clickable elements against 26.0% on pages with depth, and took twice as long to find flat icons.', source: 'Burmistrov et al., 2015' },
  { rule: 'Four tiers carry meaning, not eight levels.', finding: 'Measured in Altitude’s own rendering, adjacent levels in one tier can differ by less than one just-noticeable difference.', source: 'Experiment E1' },
  { rule: 'A fast save never shows as pending.', finding: 'About 0.1s feels instant and about 1s keeps flow, so a write that confirms within 300ms stays invisible.', source: 'Nielsen; dur-grace' },
  { rule: 'An afterglow lasts 8 seconds.', finding: 'Measured: full strength for the first second, noticeable for about four, gone by eight.', source: 'Experiment E6; Baudisch et al., 2006' },
  { rule: 'Shadows are never a light glow.', finding: 'Shadows are read before attention only when they’re darker than the ground; lighter ones lose the effect.', source: 'Rensink & Cavanagh, 1993' },
  { rule: 'In a chart, bars never lift.', finding: 'Depth cues on bar graphs make estimates of their values less accurate, so chart marks are flat ink on a ground line.', source: 'Zacks et al., 1998' },
];

/* ───────────── theming: drives the whole page ───────────── */

const SCHEMES: { id: BuiltInScheme; label: string }[] = [
  { id: 'daylight', label: 'Daylight' }, { id: 'nightfall', label: 'Nightfall' },
];
// The scheme's own accent is a swatch like the others, so one radio group is the only control for the accent.
const SCHEME_ACCENT: Record<BuiltInScheme, string> = { daylight: '#2b56d6', nightfall: '#86a2ff' }; // tokens.json "accent"
const ACCENTS = [
  { value: '#0f8a6b', name: 'Pine' },
  { value: '#2a6f9e', name: 'Harbor' },
  { value: '#b13a68', name: 'Rosewood' },
  { value: '#6b7d1e', name: 'Olive' },
];
type Look = { scheme: BuiltInScheme; accent?: string; reduced: boolean; more: boolean };

/** The sample form works, honestly: it validates, and says that nothing was sent (Fundamentals: nothing pressable is inert). */
function InviteSample() {
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const send = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter an email address, like ana@northwind.studio.'); return; }
    setError(undefined);
    toast({ title: 'This is a sample, so no invite was sent', description: `It would have gone to ${email.trim()}.` });
  };
  return (
    <Card className="sample">
      <CardHeader><CardTitle>Invite your team</CardTitle><CardDescription>A sample form. Seats are billed monthly, and you can remove people at any time.</CardDescription></CardHeader>
      <CardContent>
        <form className="sample-body" noValidate onSubmit={(e) => { e.preventDefault(); send(); }}>
          <Field label="Email address" hint="We'll send them a link that works for 7 days." error={error}>
            <Input type="email" placeholder="ana@northwind.studio" value={email} onChange={(e) => { setEmail(e.target.value); if (error) setError(undefined); }} />
          </Field>
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
            <Meter className="seats-meter" label="Seats" value={7} max={10} high={9} format={(n) => `${n}`} />
          </div>
          <div className="sample-actions">
            <Button type="button" variant="secondary" onClick={() => { setEmail(''); setError(undefined); }}>Clear</Button>
            <Button type="submit" variant="primary">Send invite</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

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
          <div className="accent-row">
            <ColorSwatchPicker aria-labelledby="accent-label" value={look.accent ?? SCHEME_ACCENT[look.scheme]}
              swatches={[{ value: SCHEME_ACCENT[look.scheme], name: `${look.scheme === 'daylight' ? 'Daylight' : 'Nightfall'} default` }, ...ACCENTS]}
              onValueChange={(v) => setLook((l) => ({ ...l, accent: v === SCHEME_ACCENT[l.scheme] ? undefined : v }))} />
          </div>
        </div>
        <div className="panel-block switches">
          <Switch label="Reduced motion" checked={look.reduced} onCheckedChange={(on) => setLook((l) => ({ ...l, reduced: on }))} />
          <Switch label="More contrast" checked={look.more} onCheckedChange={(on) => setLook((l) => ({ ...l, more: on }))} />
        </div>
        <p className="panel-note">These change the whole page. A custom accent derives its own text, fill and tint colours, checked for contrast on every surface of the scheme.</p>
      </Surface>
      <InviteSample />
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
  const [look, setLook] = React.useState<Look>(() => ({ scheme: systemScheme(), reduced: false, more: false }));
  const top = React.useRef<HTMLSpanElement>(null);
  const raised = useRaisedOnScroll(top);
  React.useLayoutEffect(() => { document.body.setAttribute('data-theme', look.scheme); }, [look.scheme]);
  return (
    <AltitudeProvider scheme={look.scheme} accent={look.accent} motion={look.reduced ? 'reduced' : 'system'} contrast={look.more ? 'more' : 'system'} className="page">
      <span ref={top} className="nav-sentinel" aria-hidden="true" />
      <a className="skip" href="#main">Skip to content</a>
      <header className="nav" data-raised={raised ? '' : undefined}>
        <div className="wrap nav-row">
          <a className="brand" href="#top" aria-label="Altitude, back to top">
            <span className="mark" aria-hidden="true"><i /><i /><i /></span>Altitude
          </a>
          <nav className="nav-links" aria-label="Site">
            <a className="nav-local" href="#idea">The idea</a>
            <a className="nav-local" href="#agents">For agents</a>
            <a className="nav-local" href="#evidence">Evidence</a>
            <a href={LINKS.storybook}>Components</a>
            <a href={LINKS.github}>GitHub</a>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="hero" id="top">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="hero-meta">React components and task guidance · v{__SITE__.version} · MIT licence</p>
              <h1 className="display">Height is the interface.</h1>
              <p className="lead">
                Altitude is a design and HCI framework for the React apps agents build. It has one idea: <strong>the ground is the record.</strong> Settled
                content sits on the ground. Anything live rises above it. Anything waiting to be filled sinks below it.
              </p>
              <div className="hero-actions">
                <a className="alt-btn" data-variant="primary" data-size="lg" href={LINKS.storybook}><span className="alt-btn-label">Browse components</span></a>
                <a className="alt-btn" data-variant="secondary" data-size="lg" href={LINKS.guide}><span className="alt-btn-label">Read the design guide</span></a>
              </div>
              <CodeBlock className="hero-install" title="Install" tabs={installTabs} syntax={syntax} />
            </div>
            <div className="hero-art">
              <Ladder />
              <p className="caption">Every surface sits on one of these. People read the four tiers at a glance; the eight levels exist so hover and press can be felt.</p>
            </div>
          </div>
        </section>

        <section className="band" id="idea" aria-labelledby="idea-title">
          <div className="wrap">
            <div className="section-head">
              <h2 className="h2" id="idea-title">One value, every reading.</h2>
              <p className="lede">Height in Altitude isn’t decoration: it says what state something is in. Edit this title, save it, then make a save fail. It’s the shipped <code>InlineEdit</code>, unchanged.</p>
            </div>
            <div className="idea">
              <OneValue />
              <dl className="readings">
                {READINGS.map((r) => <div key={r.name} className="reading"><dt>{r.name}</dt><dd>{r.what}</dd></div>)}
              </dl>
            </div>
            <div className="laws-block">
              <h3 className="h3">The seven laws</h3>
              <ol className="laws">
                {LAWS.map(([law, why]) => <li key={law}><strong>{law}</strong> {why}</li>)}
              </ol>
              <p className="lede small"><a href={LINKS.elevation}>Elevation</a> lists every signal height carries, from a saved view to a fleet of agents, with the word, icon or ARIA state that carries each one without height.</p>
            </div>
          </div>
        </section>

        <section className="band" id="loading" aria-labelledby="loading-title">
          <div className="wrap">
            <div className="section-head">
              <h2 className="h2" id="loading-title">Skeletons you don't write.</h2>
              <p className="lede">
                Pass your data the way you already do. While it's still undefined, each component shows its own imprint at its own
                size, so nothing jumps. When the data arrives, the content rises out of the imprint. Change the network and reload.
              </p>
            </div>
            <SuspenseDemo />
            <div className="split">
              <div className="code-head">
                <h3 className="h3">How it's handled</h3>
                <p className="lede small">Undefined means "not here yet". The component turns that into a suspension inside its own Suspense boundary, whose fallback is its own imprint. A component that never waits takes the old path: no boundary, no extra element. <a href={LINKS.awaitDocs}>Read the loading guide</a>.</p>
                <ul className="facts">
                  <li><strong>Undefined means not here yet.</strong> Pass <code>user?.name</code> while your query loads. <code>null</code> means there's nothing, and renders empty.</li>
                  <li><strong>Optional parts wait with their card.</strong> A missing description never leaves a skeleton behind.</li>
                  <li><strong>Under 300ms, nothing shows.</strong> The imprint waits out <Kbd>dur-grace</Kbd>, so fast loads never flash.</li>
                  <li><strong>Promises work too.</strong> From a server component, pass a promise instead of the value, on React 18 or 19.</li>
                </ul>
              </div>
              <CodeBlock title="Loading, from your code to the component" syntax={syntax} maxHeight={520} tabs={[
                { label: 'Your code', language: 'tsx', code: yourCode },
                { label: 'Avatar', language: 'tsx', code: insideAvatar },
                { label: 'useArrival', language: 'tsx', code: arrivalCode },
                { label: 'Await', language: 'tsx', code: insideAwait },
              ]} />
            </div>
          </div>
        </section>

        <section className="band" id="agents" aria-labelledby="agents-title">
          <div className="wrap">
            <div className="section-head">
              <h2 className="h2" id="agents-title">Made for the apps agents write.</h2>
              <p className="lede">Agents skip the states between the first click and the actual outcome. Altitude gives them task contracts, small workflow hooks and checks for those states, and components for the agent’s own interface: proposals, streaming answers, traces, a fleet of agents.</p>
            </div>
            <div className="split">
              <div>
                <h3 className="h3">Four task patterns</h3>
                <ul className="patterns">
                  <li><a href={story('patterns-editrecord')}>Edit a record</a><span>Validate, keep edits after a failure, retry, and report the save that actually happened.</span></li>
                  <li><a href={story('patterns-asynccollection')}>Find records</a><span>Tell loading, refreshing, a first empty view, no results and failure apart.</span></li>
                  <li><a href={story('patterns-consequentialaction')}>Act with consequences</a><span>Name the target, confirm only where it matters, and offer recovery that’s real.</span></li>
                  <li><a href={story('patterns-reviewsubmit')}>Review and send</a><span>Correct earlier answers, keep what applies, and leave a receipt.</span></li>
                </ul>
                <p className="lede small">{__SITE__.patterns - 4} more contracts cover settings, members, billing, sign-in, import, sync and more: <a href={LINKS.framework}>the framework</a>.</p>
              </div>
              <div className="agents-side">
                <CodeBlock title="Point your agent at the installed guidance" language="sh" code={agentSetup} syntax={syntax} />
                <p className="lede small">Setup previews a small block of project instructions, keeps yours, and routes the agent to the version you installed. Nothing runs on install.</p>
                <p className="lede small"><a href="agent.html">Watch one agent run through every state</a>: a proposal that’s raised and not pending, an answer streaming on a dashed rule, a failed step in a trench, seven agents on one job.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="band" id="evidence" aria-labelledby="evidence-title">
          <div className="wrap">
            <div className="section-head">
              <h2 className="h2" id="evidence-title">Every rule has a reason.</h2>
              <p className="lede">Altitude’s rules come from perception research and from {__SITE__.experiments} numbered experiments measured in its own rendering. {__SITE__.checks} automated checks, nearly all of them in a real browser, hold the components to them on every push.</p>
            </div>
            <dl className="evidence">
              {EVIDENCE.map((e) => (
                <div key={e.rule} className="evidence-row">
                  <dt>{e.rule}</dt>
                  <dd>{e.finding} <span className="evidence-source">{e.source}</span></dd>
                </div>
              ))}
            </dl>
            <div className="unproven">
              <h3 className="h3">What isn’t proven yet</h3>
              <p className="lede small">The workflow patterns are experimental: engineering checks cover their contracts, and studies with people are still to come. The first <a href={LINKS.benchmark}>distinctiveness benchmark</a> found that building with Altitude doesn’t yet move an agent’s screens measurably away from what plain tools produce. Automated checks don’t establish accessibility on their own. <a href={LINKS.research}>Research</a> keeps the record, including what was tried and dropped.</p>
            </div>
          </div>
        </section>

        <section className="band" id="theming" aria-labelledby="theming-title">
          <div className="wrap">
            <div className="section-head">
              <h2 className="h2" id="theming-title">Two schemes, one ladder.</h2>
              <p className="lede">Swap the scheme, bring your own accent, or turn on reduced motion and more contrast. The elevation language holds in all of them, and under forced colours every tier falls back to a border.</p>
            </div>
            <Theming look={look} setLook={setLook} />
          </div>
        </section>

        <section className="band" aria-labelledby="start-title">
          <div className="wrap start">
            <div className="section-head">
              <h2 className="h2" id="start-title">Install it, wrap your app once.</h2>
              <p className="lede">Render <code>AltitudeProvider</code> once around your app and import the stylesheet. React 18.2 or 19. The props mirror shadcn/ui, so most of it will feel familiar.</p>
              <div className="start-links">
                <a className="alt-btn" data-variant="primary" data-size="md" href={LINKS.storybook}><span className="alt-btn-label">Browse components</span></a>
                <a href={LINKS.guide}>Read the design guide</a>
              </div>
            </div>
            <div className="start-code">
              <CodeBlock title="Install" tabs={installTabs} syntax={syntax} />
              <CodeBlock title="App.tsx" language="tsx" code={quickStart} syntax={syntax} />
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap foot-row">
          <span>Altitude · MIT licence · this page is built with Altitude</span>
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
