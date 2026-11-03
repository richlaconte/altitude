// Example apps' simulated service and fixtures drawer (#400).
// First, the service on its own with a hand-driven clock: every mode resolves or rejects when and how it says, a lost
// response saves before it fails, a conflict hands back the current version, "only the next request" reverts, a cancelled
// write doesn't save, external changes and reset notify, persistence round-trips, and jitter repeats run to run.
// Then the smallest app, Team notes (examples/apps/hello), built by scripts/build-examples.mjs and driven in a browser:
// it renders in both schemes with no page or console errors; a note is pending, then lands; a failed one keeps its text
// and lands on Try again; a lost response is reconciled without a duplicate; a teammate's note arrives without moving
// focus; the drawer is collapsed below the app, announces a mode change, and Reset starts over; the page never scrolls
// sideways on a phone. Exits non-zero on a failure.
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { createDemoService, createManualClock, DemoError } from '../../examples/apps/shared/service.ts';
import { buildExamples } from '../../scripts/build-examples.mjs';

let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const flush = () => new Promise((r) => setTimeout(r, 0));

// ---- The service, with a manual clock -------------------------------------------------------------------------
const seed = () => ({ items: ['a'] });
const handlers = {
  'items.list': { read: (s) => s.items },
  'items.add': {
    write: (s, x) => { if (!x) throw new DemoError('invalid', 'Name it first.', { field: 'name' }); return { state: { items: [...s.items, x] }, result: x }; },
    current: (s) => s.items,
  },
};
const make = (extra = {}) => { const clock = createManualClock(); return { clock, svc: createDemoService({ name: 't', seed, handlers, clock, latency: { base: 300, jitter: 0 }, ...extra }) }; };
const watch = (p) => { const out = { settled: false }; p.then((v) => Object.assign(out, { settled: true, value: v }), (e) => Object.assign(out, { settled: true, error: e })); return out; };

{ // success
  const { clock, svc } = make();
  const r = watch(svc.request('items.add', 'b'));
  expect(svc.getSnapshot().log[0].status === 'pending', 'a request is logged as pending at once');
  clock.advance(299); await flush();
  expect(!r.settled, 'success: not answered before the latency');
  clock.advance(1); await flush();
  expect(r.value === 'b' && svc.getSnapshot().state.items.join() === 'a,b', 'success: answered and saved at the latency');
  expect(svc.getSnapshot().log[0].status === 'ok', 'success: logged as ok');
}
{ // slow
  const { clock, svc } = make(); svc.setMode('slow');
  const r = watch(svc.request('items.list')); clock.advance(1000); await flush();
  expect(!r.settled, 'slow: still waiting after a second');
  clock.advance(800); await flush();
  expect(r.settled && !r.error, 'slow: answered at six times the latency');
}
{ // fail
  const { clock, svc } = make(); svc.setMode('fail');
  const r = watch(svc.request('items.add', 'b')); clock.advance(300); await flush();
  expect(r.error?.kind === 'failed' && !r.error.committed && svc.getSnapshot().state.items.length === 1, 'fail: rejected and nothing saved');
}
{ // lost-response
  const { clock, svc } = make(); svc.setMode('lost-response');
  const r = watch(svc.request('items.add', 'b')); clock.advance(300); await flush();
  expect(!r.settled && svc.getSnapshot().state.items.length === 2, 'lost response: saved at the latency, still no answer');
  clock.advance(1100); await flush();
  expect(r.error?.kind === 'lost-response' && r.error.committed === true, 'lost response: then rejected, marked committed');
  expect(svc.getSnapshot().log[0].status === 'lost', 'lost response: logged as lost');
  const read = watch(svc.request('items.list')); clock.advance(300); await flush();
  expect(read.value?.join() === 'a,b', 'lost response: a read answers, so the app can reconcile');
}
{ // conflict
  const { clock, svc } = make(); svc.setMode('conflict');
  const w = watch(svc.request('items.add', 'b')); const rd = watch(svc.request('items.list')); clock.advance(300); await flush();
  expect(w.error?.kind === 'conflict' && w.error.current?.join() === 'a' && svc.getSnapshot().state.items.length === 1, 'conflict: a write is rejected with the current version');
  expect(rd.value?.join() === 'a', 'conflict: reads still answer');
}
{ // offline and rate-limited
  const { clock, svc } = make(); svc.setMode('offline');
  const r = watch(svc.request('items.list')); clock.advance(0); await flush();
  expect(r.error?.kind === 'offline', 'offline: rejected at once');
  svc.setMode('rate-limited');
  const q = watch(svc.request('items.list')); clock.advance(300); await flush();
  expect(q.error?.kind === 'rate-limited' && q.error.retryAfter === 30000, 'rate limited: rejected with a retry-after');
}
{ // once
  const { clock, svc } = make(); svc.setMode('fail', { once: true });
  expect(svc.getSnapshot().once, 'once: flagged');
  const a = watch(svc.request('items.list')); const b = watch(svc.request('items.list')); clock.advance(300); await flush();
  expect(a.error && !b.error && svc.getSnapshot().mode === 'success', 'once: only the next request fails, then success');
}
{ // a handler's own rejection, and an unknown op
  const { clock, svc } = make();
  const r = watch(svc.request('items.add', '')); const u = watch(svc.request('nope')); clock.advance(300); await flush();
  expect(r.error?.kind === 'invalid' && r.error.field === 'name', 'a handler rejects with invalid and the field');
  expect(u.error?.kind === 'not-found', 'an unknown op is rejected');
}
{ // abort
  const { clock, svc } = make(); const ctl = new AbortController();
  const r = watch(svc.request('items.add', 'b', { signal: ctl.signal })); clock.advance(100); ctl.abort(); await flush();
  clock.advance(500); await flush();
  expect(r.error?.name === 'AbortError' && svc.getSnapshot().state.items.length === 1, 'abort: cancelled before the server acts, nothing saved');
  expect(svc.getSnapshot().log[0].status === 'aborted', 'abort: logged as cancelled');
}
{ // external and reset
  const { clock, svc } = make(); let calls = 0; svc.subscribe(() => calls++);
  svc.external('Someone adds z', (s) => ({ items: [...s.items, 'z'] }));
  const snap = svc.getSnapshot();
  expect(snap.state.items.join() === 'a,z' && snap.externalRevision === 1 && snap.log[0].status === 'external' && calls > 0, 'external: changes the store, counts, logs and notifies');
  svc.setMode('fail');
  const r = watch(svc.request('items.add', 'b'));
  svc.reset();
  clock.advance(300); await flush();
  const after = svc.getSnapshot();
  expect(after.state.items.join() === 'a' && after.mode === 'success' && after.resetRevision === 1, 'reset: fresh seed, success, counted');
  expect(after.log.length === 0 && r.settled, 'reset: the log stays empty when a request from before the reset settles');
  // A write in flight across a reset isn't written into the new seed.
  const w = watch(svc.request('items.add', 'late'));
  svc.reset();
  clock.advance(300); await flush();
  expect(w.error?.kind === 'failed' && svc.getSnapshot().state.items.join() === 'a', 'reset: a write from before it is turned away, not saved into the new data');
}
{ // persistence
  const mem = new Map(); const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const one = make({ persist: true, storage });
  const r = watch(one.svc.request('items.add', 'b')); one.clock.advance(300); await flush();
  const two = make({ persist: true, storage });
  expect(r.value === 'b' && two.svc.getSnapshot().state.items.join() === 'a,b', 'persist: a new service loads what was saved');
  two.svc.reset();
  expect(!mem.has('altitude-example:t'), 'persist: reset clears storage');
  const bad = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} };
  expect(make({ persist: true, storage: bad }).svc.getSnapshot().state.items.join() === 'a', 'persist: blocked storage falls back to the seed');
}
{ // deterministic jitter
  const times = [];
  for (let run = 0; run < 2; run++) {
    const clock = createManualClock(); const svc = createDemoService({ name: 'j', seed, handlers, clock });
    for (let i = 0; i < 3; i++) { svc.request('items.list'); }
    clock.advance(1000); await flush();
    times.push(svc.getSnapshot().log.map((e) => e.settledAt - e.startedAt).join());
  }
  expect(times[0] === times[1] && /\d/.test(times[0]), `jitter repeats run to run (${times.join(' / ')})`);
}

// ---- Team notes in a browser ----------------------------------------------------------------------------------
const out = fileURLToPath(new URL('../test/examples/', import.meta.url));
await buildExamples(out, { only: ['hello'] });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const notes = (page) => page.evaluate(() => [...document.querySelectorAll('.hello-note')].map((c) => ({ text: c.querySelector('.hello-text')?.textContent, status: c.getAttribute('data-status') })));
const openDrawer = async (page) => { const t = page.locator('.ex-drawer .alt-acc-trigger'); if ((await t.getAttribute('aria-expanded')) !== 'true') await t.click(); await page.waitForTimeout(250); };
const mode = async (page, label) => { await openDrawer(page); await page.locator('.ex-drawer label.alt-radio').filter({ has: page.locator('.alt-check-label', { hasText: new RegExp(`^${label}$`) }) }).click(); await page.waitForTimeout(80); };
const add = async (page, text) => { await page.fill('.hello-add input', text); await page.click('.hello-add button[type="submit"]'); };

for (const scheme of ['daylight', 'nightfall']) {
  const page = await browser.newPage({ viewport: { width: 1180, height: 900 }, colorScheme: scheme === 'nightfall' ? 'dark' : 'light' });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`file://${out}hello.html`);
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload(); await page.waitForTimeout(800);
  expect(await page.evaluate(() => document.body.getAttribute('data-theme')) === scheme, `${scheme}: the page follows the system scheme`);
  expect((await notes(page)).length === 2, `${scheme}: the seeded notes load`);
  if (scheme === 'daylight') {
    // The drawer: below the app, outside main, collapsed.
    const layout = await page.evaluate(() => { const d = document.querySelector('.ex-drawer'); return { outside: !d.closest('main'), after: !!(document.querySelector('main').compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING), collapsed: d.querySelector('button[aria-expanded]').getAttribute('aria-expanded') === 'false', mains: document.querySelectorAll('main').length, h1: document.querySelectorAll('h1').length }; });
    expect(layout.outside && layout.after && layout.collapsed && layout.mains === 1 && layout.h1 === 1, `the drawer is after the one main, outside it, collapsed (${JSON.stringify(layout)})`);

    // Success: pending, then lands.
    await add(page, 'Lunch is at noon.'); await page.waitForTimeout(60);
    expect((await notes(page))[0]?.status === 'pending', 'a new note is pending at once');
    await page.waitForTimeout(700);
    expect((await notes(page))[0]?.status === 'committed', 'then it lands');

    // Fail: kept, with Try again, which lands it.
    await mode(page, 'Fail'); await add(page, 'Bring snacks.'); await page.waitForTimeout(700);
    let n = await notes(page);
    expect(n[0]?.text === 'Bring snacks.' && n[0]?.status === 'failed' && await page.locator('.hello-retry button').count() === 1, 'a failed note keeps its text and offers Try again');
    await mode(page, 'Succeed'); await page.click('.hello-retry button'); await page.waitForTimeout(700);
    expect((await notes(page))[0]?.status === 'committed', 'Try again lands it');

    // Lost response: reconciled, no duplicate.
    await mode(page, 'Lose the response'); await add(page, 'Fire drill at 11.'); await page.waitForTimeout(2600);
    n = await notes(page);
    expect(n.filter((x) => x.text === 'Fire drill at 11.').length === 1, 'a lost response leaves exactly one copy');
    expect(n.find((x) => x.text === 'Fire drill at 11.')?.status === 'committed', 'and reading back shows it was saved, so it lands');

    // Announcement of a mode change.
    await mode(page, 'Offline');
    expect(/no connection/i.test(await page.locator('.ex-drawer [role="status"]').textContent()), 'a mode change is announced');
    await add(page, 'Offline note.'); await page.waitForTimeout(200);
    expect((await notes(page))[0]?.status === 'failed', 'offline: the note fails at once and is kept');
    await mode(page, 'Succeed');

    // External: arrives, focus stays.
    await page.focus('.hello-add input');
    await page.locator('.ex-drawer button', { hasText: 'A teammate adds a note' }).click();
    await page.focus('.hello-add input');
    await page.waitForTimeout(700);
    const ext = await page.evaluate(() => ({ text: [...document.querySelectorAll('.hello-note .hello-text')].map((t) => t.textContent).join(' | '), focus: document.activeElement?.matches('.hello-add input'), said: document.querySelector('.hello-sr')?.textContent }));
    expect(/Deploy freeze/.test(ext.text ?? '') && ext.focus && /Priya adds a note/.test(ext.said ?? ''), `a teammate's note arrives, is announced and focus stays (${JSON.stringify(ext)})`);

    // A refresh that fails keeps the list and says it may be out of date; Try again refreshes it.
    await mode(page, 'Fail');
    await page.locator('.ex-drawer button', { hasText: 'A teammate adds a note' }).click(); await page.waitForTimeout(700);
    const stale = await page.evaluate(() => ({ alert: /couldn’t refresh/.test(document.querySelector('.hello .alt-alert')?.textContent ?? ''), notes: document.querySelectorAll('.hello-note').length }));
    expect(stale.alert && stale.notes > 2, `a failed refresh keeps the list and says so (${JSON.stringify(stale)})`);
    await mode(page, 'Succeed');
    await page.locator('.hello .alt-alert button', { hasText: 'Try again' }).click(); await page.waitForTimeout(700);
    expect(await page.locator('.hello .alt-alert').count() === 0, 'Try again refreshes it');

    // The log, then Reset.
    expect(await page.locator('.ex-log-row').count() > 5, 'the request log lists the requests');
    await page.locator('.ex-drawer button', { hasText: 'Reset example data' }).click(); await page.waitForTimeout(800);
    n = await notes(page);
    expect(n.length === 2 && await page.locator('.ex-log-row').count() <= 1, `Reset starts over (${n.length} notes)`);

    // Scheme switch from the drawer.
    await page.locator('.ex-drawer [role="tab"]', { hasText: 'Nightfall' }).click(); await page.waitForTimeout(100);
    expect(await page.evaluate(() => document.body.getAttribute('data-theme')) === 'nightfall', 'the drawer switches the scheme');
  }
  expect(!errors.length, `${scheme}: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await page.close();
}
{ // phone
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`file://${out}hello.html`); await page.waitForTimeout(600);
  await openDrawer(page);
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(w[0] <= w[1], `phone: no sideways scroll (${w.join(' > ')})`);
  await ctx.close();
}
await browser.close();
console.log(`Example service: ${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
