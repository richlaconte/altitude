// Builds the site's llms.txt (https://llmstxt.org, v2) and the Markdown it links to, into site-dist/.
//   site/llms.md                     the authored part: summary, rules and curated links, with {{placeholders}}
//   project/framework/patterns/*.json → the task pattern list (title and purpose)
//   project/components/*/README.md   → the component list (first sentence), grouped as build/previews.txt groups them
// The linked guides are copied to the same paths they have in the repository, so links between them still work; a link
// to a file the site doesn't serve is pointed at GitHub instead. Every link in llms.txt must resolve, or the build fails.
import { execSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, normalize, posix } from 'path';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const base = pkg.homepage.replace(/\/?$/, '/');
const github = 'https://github.com/richlaconte/altitude/blob/main/';

const md = (dir) => readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => `${dir}/${f}`);
const readmes = readdirSync('project/components').filter((d) => existsSync(`project/components/${d}/README.md`)).sort();

// What the site serves as Markdown, at its repository path.
const served = [
  ...md('project'),
  'project/tokens.json',
  'project/components/index.d.ts',
  ...readmes.map((d) => `project/components/${d}/README.md`),
  ...md('project/framework'),
  ...readdirSync('project/framework').filter((f) => f.endsWith('.json')).map((f) => `project/framework/${f}`),
  ...readdirSync('project/framework/patterns').map((f) => `project/framework/patterns/${f}`),
  ...md('docs/framework'),
  'CONTRIBUTING.md',
  'AGENTS.md',
];

// The whole text in one file: the guides and the task patterns, without Research or the validation records.
const full = [
  'project/README.md', 'project/Elevation.md', 'project/Motion.md', 'project/Charts.md', 'project/Mobile.md',
  'project/Theming.md', 'project/Distinctiveness.md', 'project/Fundamentals.md', 'project/ActionsInPlace.md',
  'project/framework/README.md', 'project/framework/principles.md', 'project/framework/app-skeleton.md',
  ...md('project/framework/patterns').sort(),
];

const firstSentence = (text) => {
  const para = text.replace(/^# .*\n+/, '').split(/\n\s*\n/)[0].replace(/\s+/g, ' ').replace(/\*\*/g, '').trim();
  const sentence = (para.match(/^.+?[.!?](?=\s|$)/) || [para])[0];
  return sentence.replace(/:$/, '.');
};

function groups() {
  const byName = {};
  for (const line of readFileSync('build/previews.txt', 'utf8').split('\n')) {
    const m = line.match(/^=== (\S+) \|.*?group="([^"]+)"/);
    if (m) byName[m[1]] = m[2];
  }
  return byName;
}

// Rewrite one Markdown file's relative links: kept when the site serves the target, otherwise sent to GitHub.
// With absolute, a served target becomes a full URL too, for text read away from its own path.
function relink(file, text, absolute = false) {
  return text.replace(/\]\((?!https?:|mailto:|#)([^)\s]+)\)/g, (all, target) => {
    const [path, hash = ''] = target.split('#');
    const resolved = posix.normalize(posix.join(posix.dirname(file), path));
    const anchor = hash ? '#' + hash : '';
    if (served.includes(resolved)) return absolute ? `](${base}${resolved}${anchor})` : all;
    return `](${github}${resolved}${anchor})`;
  });
}

export function buildLlms(out) {
  for (const file of served) {
    mkdirSync(join(out, dirname(file)), { recursive: true });
    if (file.endsWith('.md')) writeFileSync(join(out, file), relink(file, readFileSync(file, 'utf8')));
    else copyFileSync(file, join(out, file));
  }
  // Static hosts serve .ts as video/mp2t, so the declarations are also served as Markdown, at the path plus .md.
  const dts = 'project/components/index.d.ts';
  writeFileSync(join(out, dts + '.md'), `# Altitude ${pkg.version}: public declarations\n\n\`\`\`ts\n${readFileSync(dts, 'utf8').trim()}\n\`\`\`\n`);

  const patterns = readdirSync('project/framework/patterns').filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(`project/framework/patterns/${f}`, 'utf8')))
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((p) => `- [${p.title}](project/framework/${p.document}): ${p.purpose}`).join('\n');

  const order = ['Foundations', 'Layout', 'Navigation', 'Inputs', 'Actions', 'Display', 'Feedback', 'Overlays', 'Charts', 'Patterns'];
  const byName = groups();
  const grouped = {};
  for (const name of readmes) (grouped[byName[name] || 'Other'] ||= []).push(name);
  const components = [...order, ...Object.keys(grouped).filter((g) => !order.includes(g)).sort()]
    .filter((g) => grouped[g])
    .map((g) => `## Components: ${g}\n\n` + grouped[g].map((n) =>
      `- [${n}](project/components/${n}/README.md): ${firstSentence(readFileSync(`project/components/${n}/README.md`, 'utf8'))}`).join('\n'))
    .join('\n\n');

  const fullText = `# Altitude ${pkg.version}: the full guide\n\n> Every Altitude guide and task pattern in one file, from ${base}llms.txt. Each part starts with the address it's served at.\n\n`
    + full.map((f) => `Source: ${base}${f}\n\n${relink(f, readFileSync(f, 'utf8'), true).trim()}\n`).join('\n---\n\n');
  writeFileSync(join(out, 'llms-full.txt'), fullText);


  let date;
  try { date = execSync('git log -1 --format=%cs', { encoding: 'utf8' }).trim(); } catch { date = new Date().toISOString().slice(0, 10); }

  const llms = readFileSync('site/llms.md', 'utf8')
    .replace('{{base}}', base).replace('{{version}}', pkg.version).replace('{{date}}', date)
    .replace('{{patterns}}', patterns).replace('{{components}}', components)
    // Absolute links: an agent may be handed this file without the URL it came from.
    .replace(/\]\((?!https?:)([^)\s]+)\)/g, (all, target) => {
      if (!existsSync(join(out, normalize(target))) && !target.startsWith('storybook')) throw new Error(`llms.txt links to ${target}, which the site doesn't serve`);
      return `](${base}${target})`;
    });
  if ((llms.match(/^# /gm) || []).length !== 1 || !/^# .+\n\n> /.test(llms)) throw new Error('llms.txt needs one H1 followed by a blockquote summary');
  if (/\{\{\w+\}\}/.test(llms)) throw new Error('llms.txt has an unfilled placeholder');
  writeFileSync(join(out, 'llms.txt'), llms);

  return { llms: Math.round(llms.length / 1024), full: Math.round(fullText.length / 1024), files: served.length };
}
