// Says when project/tells.json is due a refresh (Distinctiveness, "Keeping current"). No network, no browser.
// Overdue reviews are warnings, so a stale catalog never blocks an unrelated change; --strict makes them failures.
// A malformed catalog always fails.
import assert from 'node:assert/strict';
import { appendFileSync, readFileSync } from 'node:fs';

const strict = process.argv.includes('--strict');
const catalog = JSON.parse(readFileSync(new URL('../../project/tells.json', import.meta.url), 'utf8'));
const { refresh, sources, tells } = catalog;
const day = 86400000;
const today = Date.parse(new Date().toISOString().slice(0, 10));
const date = (value, path) => {
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `${path}: expected YYYY-MM-DD`);
  const time = Date.parse(value);
  assert.ok(time <= today, `${path}: ${value} is in the future`);
  return time;
};

assert.ok(refresh, 'tells.json: missing refresh');
for (const key of ['reviewEveryDays', 'auditEveryDays', 'retireAfterDays']) assert.ok(Number.isInteger(refresh[key]) && refresh[key] > 0, `refresh.${key}`);
const ids = new Set();
for (const tell of tells) {
  const at = `tells.${tell.id}`;
  assert.match(tell.id, /^[A-Z]{2}\d+$/, `${at}: id`);
  assert.ok(!ids.has(tell.id), `${at}: duplicate id`);
  ids.add(tell.id);
  assert.ok(['lint', 'render', 'measure', 'human'].includes(tell.detect), `${at}: detect`);
  assert.ok(['clear', 'watch', 'exposed', 'unchecked'].includes(tell.altitude), `${at}: altitude`);
  assert.ok(tell.sources.length && tell.sources.every(s => s in sources), `${at}: sources must name entries in sources`);
  assert.ok(date(tell.added, `${at}.added`) <= date(tell.lastSeen, `${at}.lastSeen`), `${at}: lastSeen before added`);
}

const due = [];
const age = Math.floor((today - date(refresh.reviewed, 'refresh.reviewed')) / day);
if (age > refresh.reviewEveryDays) due.push(`The monthly catalog review is ${age - refresh.reviewEveryDays} days overdue (last ${refresh.reviewed}). Read the catalogs, skills' avoid-lists, preprints and press, update tells.json, and set refresh.reviewed.`);
const audit = Math.floor((today - date(refresh.audited, 'refresh.audited')) / day);
if (audit > refresh.auditEveryDays) due.push(`The quarterly audit is ${audit - refresh.auditEveryDays} days overdue (last ${refresh.audited}). Rebuild the baseline, rerun the benchmark, re-audit schemes, type and skeleton, record an experiment in Research, and set refresh.audited.`);
const stale = tells.filter(t => (today - Date.parse(t.lastSeen)) / day > refresh.retireAfterDays).map(t => t.id);
if (stale.length) due.push(`Not seen in generated output for ${refresh.retireAfterDays} days, so candidates to retire: ${stale.join(', ')}.`);

const summary = `${tells.length} tells; catalog reviewed ${refresh.reviewed} (${age} days ago, every ${refresh.reviewEveryDays}); audited ${refresh.audited} (${audit} days ago, every ${refresh.auditEveryDays}).`;
console.log(summary);
for (const line of due) console.log(process.env.GITHUB_ACTIONS ? `::warning title=Distinctiveness refresh due::${line}` : `due: ${line}`);
if (process.env.GITHUB_STEP_SUMMARY && due.length) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Distinctiveness refresh due\n\n${summary}\n\n${due.map(l => `- ${l}`).join('\n')}\n\nSee project/Distinctiveness.md, "Keeping current".\n`);
if (strict && due.length) process.exit(1);
