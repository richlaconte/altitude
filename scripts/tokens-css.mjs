// tokens.json → CSS custom properties. A Node port of build/tokcss.py; the output is identical.
// The first scheme is the default (:root); each scheme also gets a [data-theme="<id>"] block, which a retired scheme's
// name (#324) shares.
import { readFileSync } from 'fs';

export function tokensCss(tokensPath) {
  const t = JSON.parse(readFileSync(tokensPath, 'utf8'));
  const themes = t.color.themes.map((x) => x.id);
  const retired = Object.fromEntries(t.color.themes.map((x) => [x.id, x.retired ?? []]));
  const val = (v, th) => (typeof v === 'string' ? (th === themes[0] ? v : null) : (v[th] ?? null));
  const conv = (v) => (v.startsWith('{') && v.endsWith('}') ? `var(--${v.slice(1, -1)})` : v);
  const out = [];
  themes.forEach((th, i) => {
    const sel = [...(i === 0 ? [':root'] : []), ...[th, ...retired[th]].map((n) => `[data-theme="${n}"]`)].join(', ');
    const lines = [];
    for (const fam of ['color', 'shadow']) for (const tok of t[fam].tokens) {
      const v = val(tok.value, th);
      if (v === null && i > 0) continue;
      lines.push(`  --${tok.name}: ${conv(v)};`);
    }
    out.push(sel + ' {\n' + lines.join('\n') + '\n}');
  });
  const root = [];
  for (const [fam, body] of Object.entries(t)) {
    if (['color', 'shadow', 'type', 'name', 'version'].includes(fam)) continue;
    for (const tok of body.tokens) root.push(`  --${tok.name}: ${tok.value};`);
  }
  for (const [k, v] of Object.entries(t.type.families)) root.push(`  --font-${k}: ${v};`);
  out.push(':root {\n' + root.join('\n') + '\n}');
  return out.join('\n') + '\n';
}
