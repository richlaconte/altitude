// Prepares the human-made anchor (README, "The anchor"): two MIT-licensed admin templates designed by people before
// generated UI was common, one per domain letter, with their brand names and years replaced so a judge can't answer
// from a logo or a date. Layout, styles and the rest of the copy are left as shipped.
//
//   npm pack tabler-ui@0.0.32 && tar xzf tabler-ui-0.0.32.tgz && mv package <src>/tabler
//   git clone --depth 1 --branch v3.0.5 https://github.com/ColorlibHQ/AdminLTE.git <src>/adminlte
//   node evals/first-impression/model-judge/anchor.mjs --src <src> --out <pages>
//   node evals/distinctiveness/capture.mjs --baselines <pages> --out <captures>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ANCHOR = {
  'tabler-2018': {
    source: 'tabler-ui@0.0.32 (npm, 2018-04-16), MIT, Copyright (c) 2018 Paweł Kuna',
    pages: { 'dashboard-a': 'tabler/dist/index.html', 'records-a': 'tabler/dist/crypto-currencies.html', 'record-view-a': 'tabler/dist/invoice.html', 'settings-a': 'tabler/dist/profile.html' },
  },
  'adminlte-2020': {
    source: 'AdminLTE v3.0.5 (GitHub tag, 2020-05-19), MIT, Copyright (c) 2014-2020 ColorlibHQ',
    pages: { 'dashboard-b': 'adminlte/index2.html', 'records-b': 'adminlte/pages/examples/projects.html', 'record-view-b': 'adminlte/pages/examples/project-detail.html', 'settings-b': 'adminlte/pages/examples/project-edit.html' },
  },
};

// Brand and date text only, and only in visible text: tags, attributes, scripts and styles are left as shipped, so no
// asset path breaks. The two logo marks are swapped for the neutral name in plain text. README, "The anchor".
export const NEUTRAL = 'Fieldline';
const text = (t) => t.replace(/AdminLTE v3|AdminLTE 3|AdminLTE|\btabler\b/gi, NEUTRAL).replace(/^(\s*)Source code(\s*)$/, '$1Help$2').replace(/\b20(1\d|2[01])\b/g, '2026');
export function neutralise(html) {
  return html.replace(/<(script|style)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->|<[^>]+>|[^<]+/gi, (token) => {
    if (/^<title\b/i.test(token)) return token;
    if (/^<img\b[^>]*(tabler\.svg|AdminLTELogo)/i.test(token)) return /tabler\.svg/i.test(token) ? `<span style="font:600 18px/32px inherit;color:#495057">${NEUTRAL}</span>` : '';
    // value and placeholder are visible text too
    return token.startsWith('<') ? token.replace(/\b(value|placeholder)="([^"]*)"/gi, (_, k, v) => `${k}="${text(v)}"`) : text(token);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (key) => { const i = args.indexOf(key); return i < 0 ? '' : resolve(args[i + 1]); };
  const src = option('--src'), out = option('--out');
  if (!src || !out) { console.error('usage: anchor.mjs --src <dir holding tabler/ and adminlte/> --out <pages dir>'); process.exit(2); }
  for (const [tool, { pages }] of Object.entries(ANCHOR)) for (const [brief, file] of Object.entries(pages)) {
    const path = join(src, file);
    writeFileSync(path, neutralise(readFileSync(path, 'utf8')));
    mkdirSync(join(out, tool, brief), { recursive: true });
    writeFileSync(join(out, tool, brief, 'url.txt'), `file://${path}\n`);
  }
  console.log(`8 anchor pages → ${out}`);
}
