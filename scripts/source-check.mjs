// `altitude check`: Altitude's rules that are certain from an application's source text, so an agent (or CI) gets an
// error it can act on, with a rule ID that `altitude explain` resolves. Feedback at the moment of an edit helps agents
// more than prose read beforehand: in SWE-agent, an edit-time linter was the most important part of the interface
// (arXiv 2405.15793). No dependencies and no parser: Node only, bundled into dist/cli.
//
// Each rule's kind says what a finding means:
//   deterministic     certain from the text; fails the run (exit 1)
//   contextual-review likely, but the text can't settle it; reported for review, never fails
// What it doesn't check: anything that needs the page rendered (contrast, overflow, focus) or a person (usability,
// accessibility). It says so in its output.
//
// A finding a team has decided to keep is marked on its line or the line above: `altitude-ignore: <ID> <reason>`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const SOURCE = new Set(['.tsx', '.jsx', '.ts', '.js', '.mjs', '.css', '.scss', '.html']);
const SKIP = new Set(['node_modules', 'dist', 'build', 'out', '.next', '.git', 'coverage', 'storybook-static']);
const COLOUR = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/;
const TAILWIND_COLOUR = /(?:^|[\s"'`:])(?:text|bg|border|ring|outline|fill|stroke|from|via|to|divide|placeholder|decoration|caret|accent)-(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)|white|black|\[(?:#|rgb|hsl|oklch))/;

function files(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...files(path));
    else if (SOURCE.has(extname(entry.name)) && !/\.(test|spec|stories)\.[jt]sx?$|\.d\.ts$/.test(entry.name) && statSync(path).size < 1_000_000) out.push(path);
  }
  return out;
}

const ignored = (lines, i, id) => [lines[i], lines[i - 1] || ''].some((l) => new RegExp(`altitude-ignore:\\s*${id}\\b`).test(l));
// Strip comments so commented-out code and prose don't count (keeps line numbers).
const uncomment = (text) => text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

export const RULES = {
  'ALT-TOKEN-001': { kind: 'deterministic', title: 'Colours come from the tokens, not literals' },
  'ALT-SETUP-002': { kind: 'deterministic', title: "Altitude's stylesheet is imported" },
  'ALT-SETUP-003': { kind: 'deterministic', title: 'The app is wrapped in AltitudeProvider' },
  'ALT-CHART-001': { kind: 'deterministic', title: 'No pie or donut charts' },
  'ALT-CHART-002': { kind: 'deterministic', title: 'One axis per plot' },
  'ALT-CHART-003': { kind: 'deterministic', title: 'Bars stand on zero' },
  'ALT-CHART-004': { kind: 'deterministic', title: 'Marks are flat ink' },
  'ALT-CHART-005': { kind: 'deterministic', title: 'Colour does one job' },
  'ALT-CHART-006': { kind: 'deterministic', title: 'Every chart has a name' },
  'ALT-CHART-007': { kind: 'deterministic', title: 'No decorative entrances' },
  'ALT-CHART-008': { kind: 'contextual-review', title: 'A chart that leads a report says one thing first' },
  'ALT-CHART-009': { kind: 'contextual-review', title: 'Importance is emphasis' },
  'ALT-COPY-001': { kind: 'deterministic', title: 'Buttons name their outcome, never OK or Submit' },
  'ALT-PRIMARY-001': { kind: 'contextual-review', title: 'One primary action per view' },
  'ALT-VISUAL-004': { kind: 'contextual-review', title: "Controls keep Altitude's elevation" },
};

/** The names a file imports from a module: named imports (by their local name) and namespace imports (`A` in `A.Bar`). */
function importsFrom(text, mod) {
  const named = new Map(), spaces = new Set();
  const q = mod.replace(/[/.]/g, (c) => '\\' + c);
  for (const m of text.matchAll(new RegExp(`import\\s+(?:type\\s+)?((?:(?!\\bimport\\b)[^;])*?)\\s+from\\s*['"]${q}['"]`, 'g'))) {
    const clause = m[1];
    const ns = clause.match(/\*\s+as\s+(\w+)/);
    if (ns) spaces.add(ns[1]);
    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) for (const part of braces[1].split(',')) { const [orig, local] = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/); if (orig) named.set((local ?? orig).trim(), orig.trim()); }
  }
  /** The module's own name for a JSX tag ("A.BarChart" or a local alias), or null when the tag isn't from it. */
  const of = (tag) => { const dot = tag.indexOf('.'); return dot > 0 ? (spaces.has(tag.slice(0, dot)) ? tag.slice(dot + 1) : null) : named.get(tag) ?? null; };
  return { any: named.size > 0 || spaces.size > 0, of };
}

/**
 * Whether a file imports (or re-exports) anything from altitude-design that survives compilation. Type-only imports
 * (`import type { … }`, or braces holding only `type X` specifiers) are erased, so they need no stylesheet or provider.
 */
function importsRuntime(text) {
  if (/require\(\s*['"]altitude-design['"]\s*\)/.test(text)) return true;
  for (const m of text.matchAll(/\b(?:import|export)\s+((?:(?!\b(?:import|export)\b)[^;])*?)\s*from\s*['"]altitude-design['"]/g)) {
    const clause = m[1].trim();
    if (/^type\s*[{*]|^type\s+\w+\s*$/.test(clause)) continue;
    const braces = clause.match(/^\{([^}]*)\}$/);
    const parts = braces ? braces[1].split(',').map((p) => p.trim()).filter(Boolean) : [];
    if (parts.length && parts.every((p) => /^type\s+\w/.test(p))) continue;
    return true;
  }
  return false;
}

/**
 * Every JSX element in `text` whose tag (bare or namespaced) a module names one of `names`: its opening tag, its
 * children up to the matching close (empty when self-closing) and its line. Braces and quotes are tracked, so an arrow
 * or a comparison inside a prop doesn't end the tag. No parser: good enough for the shapes generated apps write.
 */
function elements(text, from, names) {
  const out = [];
  for (const m of text.matchAll(/<((?:\w+\.)?[A-Z]\w*)(?=[\s/>])/g)) {
    const own = from.of(m[1]);
    if (!own || !names.includes(own)) continue;
    let i = m.index + m[0].length, depth = 0, quote = null;
    for (; i < text.length; i++) {
      const c = text[i];
      if (quote) { if (c === quote) quote = null; continue; }
      if (c === '"' || c === "'" || c === '`') { if (depth === 0 || c === '`' || /[=(,:\[{\s]/.test(text[i - 1])) quote = c; continue; }
      if (c === '{') depth++; else if (c === '}') depth--; else if (c === '>' && depth === 0) break;
    }
    const tag = text.slice(m.index, i + 1);
    let body = '';
    if (!/\/\s*>$/.test(tag)) { const close = text.indexOf(`</${m[1]}>`, i); body = close < 0 ? '' : text.slice(i + 1, close); }
    out.push({ name: own, tag, body, line: text.slice(0, m.index).split('\n').length });
  }
  return out;
}
const prop = (tag, name) => new RegExp(`\\s${name.replace(/[-]/g, '\\-')}(?=[\\s=/>])`).test(tag);
const spread = (tag) => /\{\s*\.\.\./.test(tag);
const RECHARTS_CHARTS = ['LineChart', 'BarChart', 'AreaChart', 'ComposedChart', 'ScatterChart', 'RadarChart'];
const RECHARTS_MARKS = ['Bar', 'Line', 'Area', 'Scatter', 'Pie', 'Radar', 'RadialBar', 'Funnel'];
const ALTITUDE_CHARTS = ['BarChart', 'LineChart', 'AreaChart', 'ScatterChart', 'Heatmap', 'DotPlot', 'Sparkline', 'SpanWaterfall'];
const RESERVED_HUE = /^(?:accent|accent-ink|accent-soft|presence-[1-3])$/;

/** The chart rules (ALT-CHART-002 to -009) for one source file. `add(id, line, observed, repair)`. */
function chartRules(text, rawLines, add) {
  const rc = importsFrom(text, 'recharts'), alt = importsFrom(text, 'altitude-design');
  const skip = (id, line) => ignored(rawLines, line - 1, id);
  const say = (id, line, observed, repair) => { if (!skip(id, line)) add(id, line, observed.replace(/\s+/g, ' ').trim().slice(0, 160), repair); };
  if (rc.any) {
    for (const c of elements(text, rc, RECHARTS_CHARTS)) {
      // ALT-CHART-002: two value axes on one plot.
      const axes = elements(c.body, rc, ['YAxis']);
      const ids = new Set([...c.body.matchAll(/\byAxisId=\{?\s*['"]?([\w-]+)/g)].map((m) => m[1]));
      if (axes.length > 1 || ids.size > 1) say('ALT-CHART-002', c.line, c.tag, 'Two measures of different scale are two charts, small multiples, or indexed to a common base: two scales on one plot invite a correlation the data never made (Charts.md, rule 6).');
      // ALT-CHART-003: a bar chart's value axis that doesn't start at zero.
      const bars = c.name === 'BarChart' || elements(c.body, rc, ['Bar']).length > 0;
      if (bars) for (const a of axes) {
        const d = a.tag.match(/\bdomain=\{\s*\[\s*([^,\]]+)/);
        const lo = d && d[1].trim().replace(/^['"]|['"]$/g, '');
        if (lo && (/^(dataMin|auto)/.test(lo) || (/^-?\d+(\.\d+)?$/.test(lo) && Number(lo) > 0))) say('ALT-CHART-003', c.line + a.line - 1, a.tag, "Keep zero on a bar chart's value axis: a bar that starts above zero misstates its length. Values where zero isn't meaningful are a DotPlot (Charts.md, rule 2).");
      }
      // ALT-CHART-006: a chart with no accessible name, or its accessibility layer turned off.
      if (/\baccessibilityLayer=\{\s*false\s*\}/.test(c.tag) || (!spread(c.tag) && !prop(c.tag, 'title') && !prop(c.tag, 'aria-label') && !prop(c.tag, 'aria-labelledby')))
        say('ALT-CHART-006', c.line, c.tag, 'Name the chart (title, aria-label or aria-labelledby) and keep accessibilityLayer on: a chart has a name, a summary, a keyboard path and a table view (Charts.md, rule 8).');
    }
    for (const m of elements(text, rc, RECHARTS_MARKS)) {
      // ALT-CHART-004: a gradient, a filter (a shadow or glow) or a fully rounded bar.
      const r = m.tag.match(/\bradius=\{\s*(\[[^\]]*\]|\d+(?:\.\d+)?)\s*\}/);
      const corners = r ? (r[1].startsWith('[') ? r[1].slice(1, -1).split(',').map(Number) : [Number(r[1])]) : [];
      const roundFoot = m.name === 'Bar' && (corners.length === 1 ? corners[0] > 0 : corners.length === 4 && (corners[2] > 0 || corners[3] > 0));
      if (/\bfill=\{?\s*['"`]url\(#/.test(m.tag) || prop(m.tag, 'filter') || /\bstyle=\{\{[^}]*\bfilter\s*:/.test(m.tag) || roundFoot)
        say('ALT-CHART-004', m.line, m.tag, "Draw marks as flat ink in a series colour: no gradient, shadow, glow or sheen, and round only a bar's data end. Depth costs accuracy, and a sheen says press it (Charts.md, rule 1).");
      // ALT-CHART-005: a reserved hue on a series.
      const hue = m.tag.match(/\b(?:fill|stroke)=\{?\s*['"`]var\(--([\w-]+)\)/);
      if (hue && RESERVED_HUE.test(hue[1])) say('ALT-CHART-005', m.line, m.tag, `Colour a series from the data palette (var(--data-1) to var(--data-6), var(--data-other)): ${hue[1]} already means something else in Altitude (Charts.md, rule 5).`);
      // ALT-CHART-007: an entrance animation (Recharts animates marks in by default).
      const anim = m.tag.match(/\bisAnimationActive(?:=\{\s*([^}]*?)\s*\})?(?=[\s/>])/);
      const begin = m.tag.match(/\banimationBegin=\{\s*(\d+)/);
      if (!anim || anim[1] === undefined || anim[1] === 'true' || (begin && Number(begin[1]) > 0))
        say('ALT-CHART-007', m.line, m.tag, "Set isAnimationActive={false}, or a reduced-motion-aware value that's false on first render: a chart is simply there, and nothing grows from the baseline for decoration (Charts.md, rule 7).");
    }
  }
  if (alt.any) {
    const containers = elements(text, alt, ['ChartContainer']);
    containers.forEach((c, n) => {
      const whole = c.tag + c.body;
      // ALT-CHART-003: a fixed y domain above zero on a bar chart.
      const y = c.tag.match(/\byDomain=\{\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/);
      if (y && (Number(y[1]) > 0 || Number(y[2]) < 0) && elements(c.body, alt, ['BarChart']).length)
        say('ALT-CHART-003', c.line, c.tag, "Leave yDomain off a bar chart, or include zero in it: a bar that starts above zero misstates its length (Charts.md, rule 2).");
      // ALT-CHART-006: a chart with no name.
      if (!spread(c.tag) && !prop(c.tag, 'title') && !prop(c.tag, 'aria-label') && !prop(c.tag, 'aria-labelledby'))
        say('ALT-CHART-006', c.line, c.tag, 'Give the ChartContainer a title, or aria-labelledby pointing at the CardTitle that names it (Charts.md, rule 8).');
      // ALT-CHART-008: the first chart in a page's main content, with no takeaway.
      if (n === 0 && /<main[\s>]/.test(text) && !prop(c.tag, 'takeaway'))
        say('ALT-CHART-008', c.line, c.tag, 'If this chart leads a report, give it a takeaway: the one thing it says, written from the data shown (Charts.md, rule 9). A row of equal dashboard cards can do without one.');
      // ALT-CHART-009: three or more series in an inline config with nothing said to matter.
      const cfg = c.tag.match(/\bconfig=\{\{([\s\S]*?)\}\}(?=[\s/>])/);
      const series = cfg ? (cfg[1].match(/\blabel\s*:/g) || []).length : 0;
      if (series >= 3 && !prop(c.tag, 'takeaway') && !/\sfocus=/.test(whole))
        say('ALT-CHART-009', c.line, c.tag, `${series} series and nothing says which matters: give the chart type focus for the series it's about, or a takeaway that names it (Charts.md, rule 5, "Focus").`);
    });
    // ALT-CHART-004: a filter (a drop shadow, a glow) on one of Altitude's charts.
    for (const m of elements(text, alt, ALTITUDE_CHARTS))
      if (prop(m.tag, 'filter') || /\bstyle=\{\{[^}]*\bfilter\s*:/.test(m.tag))
        say('ALT-CHART-004', m.line, m.tag, "Remove the filter: a chart's marks are flat ink on the ground, and a shadow on a bar misstates its value (Charts.md, rule 1).");
    // ALT-CHART-005: a series config that takes the accent, a presence hue or a status colour.
    const lines = text.split('\n');
    lines.forEach((l, i) => {
      const m = l.match(/\blabel\s*:[^{}]*\bcolor\s*:\s*['"](accent[\w-]*|presence-[1-3]|positive|caution|critical)['"]|\bcolor\s*:\s*['"](accent[\w-]*|presence-[1-3]|positive|caution|critical)['"][^{}]*\blabel\s*:/);
      if (m) say('ALT-CHART-005', i + 1, l, `A series' color is a data slot (data-1 to data-6, data-other): ${m[1] ?? m[2]} already means something else. Status that means good or bad goes with an icon and a word (Charts.md, rule 5).`);
    });
  }
}

// tokenNames: custom property names from the installed tokens.css, so `ink: '#…'` inside a custom scheme (which
// defines tokens rather than bypassing them) isn't reported.
export function scan(root, { tokenNames = new Set() } = {}) {
  const findings = [];
  const add = (id, file, line, observed, repair) => findings.push({ ruleId: id, kind: RULES[id].kind, status: RULES[id].kind === 'deterministic' ? 'fail' : 'review', file: file && relative(root, file), line, observed, expected: RULES[id].title, repair, verification: `altitude explain ${id}` });
  const sources = files(root);
  let usesAltitude = false, stylesheet = false, providers = [];

  for (const file of sources) {
    const raw = readFileSync(file, 'utf8');
    const text = uncomment(raw);
    const lines = text.split('\n'), rawLines = raw.split('\n');
    // HTML is read like CSS: its <style> blocks and style="" attributes hold declarations.
    const css = /\.(s?css|html)$/.test(file);
    if (importsRuntime(text)) usesAltitude = true;
    if (/['"]altitude-design\/altitude(\.no-fonts)?\.css['"]/.test(text)) stylesheet = true;
    lines.forEach((line, i) => {
      const at = i + 1;
      const skip = (id) => ignored(rawLines, i, id);
      // ALT-TOKEN-001: a colour literal in a declaration or inline style. Custom properties (--brand: #…) define tokens,
      // and a scheme's token entries (ink: '#…') do too; AltitudeProvider's accent takes a literal by design.
      if (COLOUR.test(line) && !skip('ALT-TOKEN-001')) {
        const definesToken = /^\s*--[\w-]+\s*:/.test(line) || [...line.matchAll(/['"]?([a-z][\w-]*)['"]?\s*:\s*['"`]?(?:#|rgb|hsl|oklch)/g)].some((m) => tokenNames.has(m[1]));
        const accent = /\baccent\s*=\s*\{?\s*['"`]#/.test(line);
        // In CSS (and HTML's style="" attributes), any declaration other than a custom property's whose value holds a colour.
        const inStyle = css ? [...line.matchAll(/(?:^|[{;"'])\s*([a-z-]+)\s*:\s*([^;{}"']+)/g)].some((m) => !m[1].startsWith('--') && COLOUR.test(m[2]))
          : /\bstyle=\{\{|(?:color|background|backgroundColor|borderColor|fill|stroke|boxShadow|outlineColor)\s*[:=]/.test(line);
        if (!definesToken && !accent && inStyle) add('ALT-TOKEN-001', file, at, line.trim().slice(0, 160), 'Use a token instead: var(--ink-muted), var(--accent), var(--surface-raised) and the rest of tokens.css. A brand colour goes to AltitudeProvider accent, and a full palette to a custom scheme.');
      } else if (!css && TAILWIND_COLOUR.test(line) && /\bclass(Name)?=/.test(line) && !skip('ALT-TOKEN-001')) {
        // A Tailwind palette class (text-zinc-500, bg-white, bg-[#fafafa]) bypasses the tokens just as a literal does.
        add('ALT-TOKEN-001', file, at, line.trim().slice(0, 160), 'Use a token instead of a palette class: style={{ color: "var(--ink-muted)" }} or a class whose CSS uses the tokens.');
      }
      if (css) return;
      // ALT-CHART-001: pie and donut charts from the usual libraries.
      if (!skip('ALT-CHART-001') && (/import\s*\{[^}]*\b(PieChart|Pie|Doughnut|RadialBarChart)\b[^}]*\}\s*from\s*['"](recharts|react-chartjs-2)['"]/.test(line) || /from\s*['"]@nivo\/pie['"]/.test(line) || /\btype\s*:\s*['"](pie|doughnut)['"]/.test(line)))
        add('ALT-CHART-001', file, at, line.trim().slice(0, 160), 'Show a part of a whole as a stacked BarChart or a segmented Meter: angle and area are read less accurately than length (Charts.md, "Choosing a form").');
      // ALT-COPY-001: a button labelled OK or Submit.
      const copy = line.match(/<(?:\w+\.)?Button\b[^>]*>\s*(OK|Ok|Okay|Submit)\s*<\/(?:\w+\.)?Button>/);
      if (copy && !skip('ALT-COPY-001')) add('ALT-COPY-001', file, at, copy[0].slice(0, 160), `Start with a verb and name the outcome: "Save changes", "Send invite", "Create project", not "${copy[1]}".`);
      // ALT-VISUAL-004: an elevation override on a control whose height carries meaning.
      const lift = line.match(/<(?:\w+\.)?(Input|Textarea|Select|Combobox|Button|Switch|Checkbox)\b[^>]*(boxShadow|box-shadow|\bshadow-(?!none)[\w-]+|\btranslate-y-|\btransform\s*:)/);
      if (lift && !skip('ALT-VISUAL-004')) add('ALT-VISUAL-004', file, at, line.trim().slice(0, 160), `Remove the override: a ${lift[1]}'s height is how it says whether you press it or fill it. Use the component's variant or size props instead.`);
    });
    if (!css) chartRules(text, rawLines, (id, line, observed, repair) => add(id, file, line, observed, repair));
    // ALT-CHART-005: shadcn/ui's chart colours mapped to anything but the data palette (Theming.md, "With shadcn/ui").
    lines.forEach((line, i) => {
      for (const m of line.matchAll(/['"]?--chart-(\d+)['"]?\s*:\s*['"]?([^;'"}\n]+)/g)) {
        const v = m[2].trim();
        if (!/^var\(--data-(?:[1-6]|other)\)$/.test(v) && !ignored(rawLines, i, 'ALT-CHART-005'))
          add('ALT-CHART-005', file, i + 1, line.trim().slice(0, 160), `Map --chart-${m[1]} to the data palette, var(--data-${Math.min(6, Number(m[1]) || 1)}): series colours come from data-1 to data-6, never the accent, a status colour or a literal (Theming.md, "With shadcn/ui").`);
      }
    });
    if (!css) {
      // The provider by any name it's imported under (`AltitudeProvider as Provider`, `A.AltitudeProvider`), as well as
      // the literal tag (a project may re-export it from its own module).
      const alt = importsFrom(text, 'altitude-design');
      const n = [...text.matchAll(/<((?:\w+\.)?[A-Z]\w*)(?=[\s/>])/g)].filter((m) => /(?:^|\.)AltitudeProvider$/.test(m[1]) || alt.of(m[1]) === 'AltitudeProvider').length;
      if (n) providers.push(...Array(n).fill(relative(root, file)));
      // ALT-PRIMARY-001: more than one primary button in one file (often one view).
      const primaries = [...text.matchAll(/<(?:\w+\.)?Button\b[^>]*\bvariant=["']primary["']/g)];
      if (primaries.length > 1 && !ignored(rawLines, text.slice(0, primaries[1].index).split('\n').length - 1, 'ALT-PRIMARY-001'))
        add('ALT-PRIMARY-001', file, text.slice(0, primaries[1].index).split('\n').length, `${primaries.length} primary buttons in this file`, 'If they can be on screen together, keep one primary (the one action the task leads to) and make the others secondary or ghost.');
    }
  }
  if (usesAltitude && !stylesheet) add('ALT-SETUP-002', null, null, 'No file imports altitude-design/altitude.css or altitude-design/altitude.no-fonts.css', "Import one of them once, at the app's entry: import 'altitude-design/altitude.css';");
  if (usesAltitude && !providers.length) add('ALT-SETUP-003', null, null, 'Components from altitude-design are used, but nothing renders <AltitudeProvider>', 'Render one AltitudeProvider around the whole app. It sets the scheme and hosts dialogs and toasts.');
  if (providers.length > 1) findings.push({ ruleId: 'ALT-SETUP-003', kind: 'contextual-review', status: 'review', file: null, line: null, observed: `<AltitudeProvider> is rendered in ${providers.length} places (${[...new Set(providers)].join(', ')})`, expected: 'One AltitudeProvider around the app', repair: 'Keep one around the app unless the others are deliberate (separate roots, previews).', verification: 'altitude explain ALT-SETUP-003' });
  return { files: sources.length, findings };
}
