// Engineering evidence only. Uses the complete app and its existing simulated service, never participant answers.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import { buildExamples } from '../../scripts/build-examples.mjs';
import { PROTOCOL_VERSION, renderRecord, validateRecord } from './report.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const requireBuild = createRequire(new URL('../../build/package.json', import.meta.url));
const { chromium } = requireBuild('playwright-core');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const out = resolve(process.argv[2] ?? resolve(root, `build/test/interaction-${Date.now()}`));
mkdirSync(dirname(out), { recursive: true });
mkdirSync(out); // Refuse to overwrite any previous run, including a failed one.
await buildExamples(resolve(out, 'stimuli'), { only: ['planning-board'] });
const artifact = resolve(out, 'stimuli/planning-board.html');
const source = {
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  dirty: !!execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim(),
  packageVersion: JSON.parse(readFileSync(resolve(root, 'package.json'))).version,
  artifactSha256: sha(readFileSync(artifact)),
  runnerSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
  lockSha256: sha(readFileSync(resolve(root, 'package-lock.json'))),
  reactVersion: requireBuild(resolve(root, 'node_modules/react/package.json')).version,
};
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const results = [];
const check = (checks, name, ok, evidence) => { checks.push({ name, passed: !!ok, evidence }); if (!ok) throw new Error(name); };
const drawer = async page => {
  const trigger = page.locator('.ex-drawer .alt-acc-trigger');
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
};
const requests = (page, op) => page.locator('.ex-log-row').evaluateAll((rows, op) => rows.filter(r => r.querySelector('.ex-log-op')?.textContent === op).map(r => ({ status: r.dataset.status, text: r.textContent })), op);
const savedState = page => page.evaluate(() => JSON.parse(localStorage.getItem('altitude-example:planning-board') ?? 'null'));
const settle = page => page.evaluate(async () => {
  await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
});
const editTitle = async (page, title) => {
  await page.getByRole('button', { name: `Open ${title}`, exact: true }).click();
  const property = page.locator('[role="dialog"] .alt-property').filter({ hasText: /^Title/ }).first();
  await property.locator('button').first().click();
  return property;
};

try {
  for (const motion of ['normal', 'reduced']) for (const journey of ['field-edit', 'record-movement']) {
    const id = `${journey}-${motion}`;
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: motion === 'reduced' ? 'reduce' : 'no-preference', colorScheme: 'light' });
    context.setDefaultTimeout(8000);
    const page = await context.newPage();
    await page.route(/^https?:\/\//, route => route.abort()); // Same local fallback fonts in every condition.
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Ignore blocked network fonts; record all JavaScript console errors.
    page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('net::ERR_FAILED')) errors.push(msg.text()); });
    const checks = [];
    const record = {
      protocolVersion: PROTOCOL_VERSION, id, evidenceType: 'engineering', recordedAt: new Date().toISOString(), sessionId: 'engineering-smoke', observedVariant: 'baseline', priorRecordRefs: [],
      source, environment: { browser: `Chromium ${browser.version()}`, os: `${os.platform()} ${os.release()}`, viewport: [1280, 900], zoom: 1, scheme: 'daylight', input: 'keyboard with pointer fixture setup', motion, assistiveTechnology: null, fonts: 'Network fonts blocked; system fallback' },
      journey, task: journey === 'field-edit' ? 'Rename Invoice PDF redesign to Invoice PDF layout; recover from the rejected write.' : 'Move Annual billing toggle from Sprint 24 to In progress, then edit the same card title.',
      variants: [{ id: 'baseline', description: 'Unmodified complete planning-board app at the recorded source and artifact digest.', artifactSha256: source.artifactSha256 }], order: ['baseline'],
      stimulus: { status: 'unverified', reason: 'Smoke not completed.', healthRef: `${id}.json` },
      outcome: { result: 'not-attempted', observations: [], assistance: 'Automated engineering driver; not a participant.' },
      comprehension: { result: 'not-assessed', response: null, reason: 'Participant evaluation unrun.' },
      ratings: [], comparison: { status: 'not-assessed', selected: null, reason: 'One implementation; no participant comparison.' },
      negativeEvidence: [], uncertainty: ['No participant or model judgments collected.', 'No AT, pointer/touch, narrow viewport, zoom or forced-color evaluation in this smoke run.', 'Simulated service and localStorage read-back do not prove production persistence.'], checks,
    };
    try {
      await page.goto(pathToFileURL(artifact).href);
      await page.waitForSelector('[data-board-card="c1"]');
      await drawer(page);
      if (journey === 'field-edit') {
        await page.locator('.ex-drawer label.alt-radio').filter({ has: page.locator('.alt-check-label', { hasText: /^Fail$/ }) }).click();
        await page.locator('.ex-drawer label').filter({ hasText: 'Only the next request' }).click();
        await page.locator('.ex-drawer .alt-select-trigger[aria-labelledby="ex-ops"]').click();
        await page.getByRole('option', { name: 'cards.update', exact: true }).click();
      }
      await page.locator('.ex-drawer .alt-acc-trigger').click();
      await page.locator('[data-board-card="c1"]').scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: resolve(out, `${id}-before.png`) });
      if (journey === 'field-edit') {
        const property = await editTitle(page, 'Invoice PDF redesign');
        const input = property.locator('input');
        await input.fill('Invoice PDF layout');
        await property.evaluate(el => {
          window.__fieldStates = [];
          window.__fieldObserver = new MutationObserver(() => {
            const editor = el.querySelector('[data-state]');
            window.__fieldStates.push({ state: editor?.getAttribute('data-state'), busy: !!editor?.querySelector('[aria-busy="true"]'), text: el.textContent });
          });
          window.__fieldObserver.observe(el, { subtree: true, attributes: true, childList: true, characterData: true });
        });
        await input.press('Enter');
        await property.locator('[data-state="error"]').waitFor();
        const states = await page.evaluate(() => { window.__fieldObserver.disconnect(); return window.__fieldStates; });
        check(checks, 'A real pending write precedes the rejection', states.some(s => s.state === 'saving' && s.busy && /Saving changes/.test(s.text)), states);
        const errorText = await property.innerText();
        check(checks, 'Rejection retains named record, draft, full local error and recovery',
          await input.inputValue() === 'Invoice PDF layout' && /couldn.t|failed|try again/i.test(errorText) && await property.getByRole('button', { name: 'Save changes', exact: true }).isEnabled(),
          { errorText, draft: await input.inputValue() });
        check(checks, 'Rejected write leaves confirmed record unchanged', (await savedState(page))?.cards?.c3?.title !== 'Invoice PDF layout', await requests(page, 'cards.update'));
        await settle(page);
        await page.screenshot({ path: resolve(out, `${id}-failed.png`) });
        await property.getByRole('button', { name: 'Save changes', exact: true }).click();
        await page.waitForFunction(() => JSON.parse(localStorage.getItem('altitude-example:planning-board') ?? 'null')?.cards?.c3?.title === 'Invoice PDF layout');
        await property.locator('[data-state="read"]').waitFor();
        const writes = await requests(page, 'cards.update');
        check(checks, 'Exactly one rejected write followed by one accepted retry', writes.length === 2 && writes.filter(x => x.status === 'rejected').length === 1 && writes.filter(x => x.status === 'ok').length === 1, writes);
        check(checks, 'Canonical title identifies the same record', /Invoice PDF layout/.test(await page.locator('[role="dialog"]').innerText()), (await savedState(page)).cards.c3);
        await page.screenshot({ path: resolve(out, `${id}-after.png`) });
        await page.keyboard.press('Escape');
        await page.reload();
        await page.getByRole('button', { name: 'Open Invoice PDF layout', exact: true }).waitFor();
        check(checks, 'Accepted title survives reload in simulated storage', (await savedState(page)).cards.c3.title === 'Invoice PDF layout', { record: 'c3', title: 'Invoice PDF layout' });
      } else {
        const card = page.locator('[data-board-card="c1"]');
        check(checks, 'Correct source identity and status before movement', await card.evaluate(el => el.closest('[data-board-col]')?.dataset.boardCol) === 'sprint', await card.innerText());
        await card.focus();
        await page.keyboard.press('Space');
        await page.evaluate(() => {
          window.__interactionFrames = [];
          const start = performance.now();
          const tick = () => {
            const el = document.querySelector('[data-board-card="c1"]');
            const rect = el?.getBoundingClientRect();
            window.__interactionFrames.push({ ms: Math.round(performance.now() - start), x: rect?.x, y: rect?.y, transform: el ? getComputedStyle(el).transform : null, column: el?.closest('[data-board-col]')?.dataset.boardCol });
            if (performance.now() - start < 750) requestAnimationFrame(tick);
            else window.__interactionFramesDone = true;
          }; tick();
        });
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(() => document.activeElement?.closest('[data-board-card]')?.getAttribute('data-board-card') === 'c1' && document.activeElement?.closest('[data-board-col]')?.getAttribute('data-board-col') === 'doing');
        await page.keyboard.press('Space');
        await page.waitForFunction(() => window.__interactionFramesDone === true);
        const frames = await page.evaluate(() => window.__interactionFrames);
        record.frames = frames;
        const end = frames.at(-1);
        const intermediate = frames.filter(f => f.column === 'doing' && Math.abs(f.x - end.x) > 1);
        check(checks, motion === 'normal' ? 'Normal-motion stimulus has observable intermediate travel' : 'Reduced-motion stimulus has no intermediate travel', motion === 'normal' ? intermediate.length >= 2 : intermediate.length === 0, { intermediateFrames: intermediate.length, totalFrames: frames.length });
        await page.waitForFunction(() => JSON.parse(localStorage.getItem('altitude-example:planning-board') ?? 'null')?.columns?.doing?.includes('c1'));
        const writes = await requests(page, 'cards.move');
        check(checks, 'One acknowledged move of the same record to In progress', writes.length === 1 && writes[0].status === 'ok' && await card.evaluate(el => el.closest('[data-board-col]')?.dataset.boardCol) === 'doing', writes);
        const focused = await page.evaluate(() => document.activeElement?.closest('[data-board-card]')?.getAttribute('data-board-card'));
        check(checks, 'Keyboard focus remains on the moved record', focused === 'c1', { focused });
        const cues = await page.locator('.ex-app [aria-live]').allTextContents();
        check(checks, 'Persistent name and semantic destination cues survive the transition', /Annual billing toggle/.test(await card.innerText()) && cues.some(x => /In progress/.test(x)), cues);
        await page.screenshot({ path: resolve(out, `${id}-after.png`) });
        const property = await editTitle(page, 'Annual billing toggle');
        check(checks, 'Continued editing opens the same card title', await property.locator('input').inputValue() === 'Annual billing toggle', { savedId: (await savedState(page)).cards.c1.id });
      }
      check(checks, 'No page or JavaScript console errors', errors.length === 0, errors);
      record.stimulus = { status: 'valid', reason: 'All named engineering checks passed in this recorded mode; human visual/AT review remains separate.', healthRef: `${id}.json` };
      record.outcome = { result: 'completed', observations: checks.map(c => c.name), assistance: record.outcome.assistance };
    } catch (error) {
      record.stimulus = { status: 'invalid', reason: error.message, healthRef: `${id}.json` };
      record.outcome = { result: 'failed', observations: checks.filter(c => c.passed).map(c => c.name), assistance: record.outcome.assistance };
      record.negativeEvidence.push(`Engineering stimulus failure: ${error.message}`);
      await page.screenshot({ path: resolve(out, `${id}-failure.png`) }).catch(() => {});
    } finally {
      validateRecord(record);
      writeFileSync(resolve(out, `${id}.json`), `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx' });
      writeFileSync(resolve(out, `${id}.md`), renderRecord(record), { flag: 'wx' });
      results.push({ id, status: record.stimulus.status, checks: checks.length, reason: record.stimulus.reason });
      await context.close();
    }
  }
} finally { await browser.close(); }
const summary = { protocolVersion: PROTOCOL_VERSION, source, evidenceType: 'engineering', participantEvaluation: 'unrun', results };
writeFileSync(resolve(out, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(summary, null, 2));
if (results.some(r => r.status !== 'valid')) process.exitCode = 1;
