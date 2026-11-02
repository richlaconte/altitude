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

const SOURCE = new Set(['.tsx', '.jsx', '.ts', '.js', '.mjs', '.css', '.scss']);
const SKIP = new Set(['node_modules', 'dist', 'build', 'out', '.next', '.git', 'coverage', 'storybook-static']);
const COLOUR = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/;

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
  'ALT-COPY-001': { kind: 'deterministic', title: 'Buttons name their outcome, never OK or Submit' },
  'ALT-PRIMARY-001': { kind: 'contextual-review', title: 'One primary action per view' },
  'ALT-VISUAL-004': { kind: 'contextual-review', title: "Controls keep Altitude's elevation" },
};

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
    const css = /\.s?css$/.test(file);
    if (/from\s+['"]altitude-design['"]|require\(\s*['"]altitude-design['"]\s*\)/.test(text)) usesAltitude = true;
    if (/['"]altitude-design\/altitude(\.no-fonts)?\.css['"]/.test(text)) stylesheet = true;
    lines.forEach((line, i) => {
      const at = i + 1;
      const skip = (id) => ignored(rawLines, i, id);
      // ALT-TOKEN-001: a colour literal in a declaration or inline style. Custom properties (--brand: #…) define tokens,
      // and a scheme's token entries (ink: '#…') do too; AltitudeProvider's accent takes a literal by design.
      if (COLOUR.test(line) && !skip('ALT-TOKEN-001')) {
        const definesToken = /^\s*--[\w-]+\s*:/.test(line) || [...line.matchAll(/['"]?([a-z][\w-]*)['"]?\s*:\s*['"`]?(?:#|rgb|hsl|oklch)/g)].some((m) => tokenNames.has(m[1]));
        const accent = /\baccent\s*=\s*\{?\s*['"`]#/.test(line);
        // In CSS, any declaration other than a custom property's whose value holds a colour.
        const inStyle = css ? [...line.matchAll(/(?:^|[{;])\s*([a-z-]+)\s*:\s*([^;{}]+)/g)].some((m) => !m[1].startsWith('--') && COLOUR.test(m[2]))
          : /\bstyle=\{\{|(?:color|background|backgroundColor|borderColor|fill|stroke|boxShadow|outlineColor)\s*[:=]/.test(line);
        if (!definesToken && !accent && inStyle) add('ALT-TOKEN-001', file, at, line.trim().slice(0, 160), 'Use a token instead: var(--ink-muted), var(--accent), var(--surface-raised) and the rest of tokens.css. A brand colour goes to AltitudeProvider accent, and a full palette to a custom scheme.');
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
    if (!css) {
      const n = (text.match(/<(?:\w+\.)?AltitudeProvider\b/g) || []).length;
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
