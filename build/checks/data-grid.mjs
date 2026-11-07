// DataGrid: the APG grid keys plus spreadsheet editing, ranges, copy/paste and undo. ALT_FIXTURE_ROOT selects React 19 fixtures.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
const open = async ({ scheme = 'daylight', width = 960 } = {}) => {
  const page = await browser.newPage({ viewport: { width, height: 700 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.goto(`file://${fixturePath('DataGrid', scheme)}`);
  page.setDefaultTimeout(5000);
  return page;
};
const cell = (page, r, c) => page.locator(`[data-cell="${r}:${c}"]`);
const at = page => page.evaluate(() => document.activeElement?.closest('[data-cell]')?.dataset.cell);
const text = (page, r, c) => cell(page, r, c).locator('.alt-grid-value').textContent();
const said = (page, t) => page.waitForFunction(t => [...document.querySelectorAll('.alt-data-grid .alt-grid-sr[aria-live]')].some(e => e.textContent.includes(t)), t);
const idle = page => page.waitForFunction(() => !document.querySelector('[data-status="pending"]'));

try {
  { const page = await open();
    const grid = page.getByRole('grid', { name: 'Inventory' });
    check(await grid.locator('[tabindex="0"]').count() === 1, 'DG-01 the grid is one Tab stop');
    check(await cell(page, 0, 1).getAttribute('aria-readonly') === 'true' && await cell(page, 0, 0).getAttribute('aria-readonly') === 'false', 'DG-02 read-only and editable cells say so');
    await cell(page, 0, 0).click();
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); check(await at(page) === '1:1', 'DG-03 arrows move one cell');
    await page.keyboard.press('End'); check(await at(page) === '1:4', 'DG-04 End goes to the row’s end');
    await page.keyboard.press('Control+Home'); check(await at(page) === '0:0', 'DG-05 Ctrl+Home goes to the first cell');
    await page.keyboard.press('Control+End'); check(await at(page) === '4:4', 'DG-06 Ctrl+End goes to the last cell');
    // Type to replace; Enter saves and moves down.
    await cell(page, 1, 3).click(); await page.keyboard.type('40');
    check(await page.getByRole('textbox', { name: 'Stock, Monitor arm' }).inputValue() === '40', 'DG-07 typing a character edits the cell, replacing its value; the field is named by column and row');
    await page.keyboard.press('Enter'); await idle(page);
    check(await text(page, 1, 3) === '40' && await at(page) === '2:3', 'DG-08 Enter saves and moves down');
    await said(page, 'Saved'); check(true, 'DG-09 the save is announced');
    // F2 keeps the value; Escape discards.
    await page.keyboard.press('F2'); const f = page.getByRole('textbox', { name: 'Stock, Cable tray' });
    check(await f.inputValue() === '0', 'DG-10 F2 edits with the current value');
    await page.keyboard.type('9'); await page.keyboard.press('Escape');
    check(await text(page, 2, 3) === '0' && await at(page) === '2:3', 'DG-11 Escape discards the draft');
    // Tab saves and moves right.
    await cell(page, 2, 0).click(); await page.keyboard.press('F2'); await page.keyboard.press('End'); await page.keyboard.type('s'); await page.keyboard.press('Tab'); await idle(page);
    check(await text(page, 2, 0) === 'Cable trays' && await at(page) === '2:1', 'DG-12 Tab saves and moves right');
    // Invalid values stay open with their message.
    await cell(page, 3, 2).click(); await page.keyboard.type('-1'); await page.keyboard.press('Enter');
    const bad = page.getByRole('textbox', { name: 'Price, Footrest' });
    check(await bad.getAttribute('aria-invalid') === 'true' && await page.getByRole('alert').filter({ hasText: 'Use a price of 0 or more.' }).isVisible(), 'DG-13 an invalid value keeps the cell open with its message');
    await page.keyboard.press('Escape');
    // IME: Enter during composition doesn't commit.
    await cell(page, 3, 0).click(); await page.keyboard.press('F2');
    await page.getByRole('textbox', { name: 'Name, Footrest' }).evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true })));
    check(await page.getByRole('textbox', { name: 'Name, Footrest' }).isVisible(), 'DG-14 Enter during IME composition doesn’t commit');
    // Clicking another cell commits, as in a spreadsheet.
    await page.keyboard.type(' pro'); await cell(page, 4, 0).click(); await idle(page);
    check(await text(page, 3, 0) === 'Footrest pro' && await at(page) === '4:0', 'DG-15 clicking another cell commits and moves there');
    // A refused save: the cell fails and says so.
    await cell(page, 0, 2).click(); await page.keyboard.type('45'); await page.keyboard.press('Enter');
    await said(page, '1 cell couldn’t be saved: The Desk lamp price is locked during the sale.');
    check(await cell(page, 0, 2).getAttribute('data-status') === 'failed' && await cell(page, 0, 2).getAttribute('aria-invalid') === 'true' && await text(page, 0, 2) === '$49', 'DG-16 a refused cell fails, keeps its value and announces why');
    await cell(page, 0, 2).click(); await page.keyboard.press('Enter');
    check(await page.getByRole('textbox', { name: 'Price, Desk lamp' }).inputValue() === '45', 'DG-17 reopening a failed cell restores the rejected draft');
    await page.keyboard.press('Escape');
    // Read-only cells don't edit.
    await cell(page, 0, 1).click(); await page.keyboard.type('x');
    check(await page.locator('.alt-grid-input').count() === 0, 'DG-18 typing in a read-only cell does nothing');
    await page.close(); }

  { const page = await open();
    await cell(page, 0, 3).click(); await page.keyboard.press('Shift+ArrowDown'); await page.keyboard.press('Shift+ArrowDown');
    check(await page.locator('[aria-selected="true"]').count() === 3, 'DG-19 Shift+arrows select a range (aria-selected)');
    // #501: press on a cell and drag to another: the range follows the pointer, and is announced once, at the end.
    const a0 = await cell(page, 0, 2).boundingBox(), b0 = await cell(page, 2, 3).boundingBox();
    await page.mouse.move(a0.x + a0.width / 2, a0.y + a0.height / 2); await page.mouse.down();
    await page.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2, { steps: 8 });
    const mid = await page.evaluate(() => ({ n: document.querySelectorAll('[data-range]').length, live: [...document.querySelectorAll('.alt-data-grid .alt-grid-sr[aria-live]')].map(e => e.textContent).join('|') }));
    check(mid.n === 6 && !mid.live.includes('cells selected'), `DG-19a dragging extends the range to the cell under the pointer, and says nothing yet (${JSON.stringify(mid)})`);
    await page.mouse.up();
    await said(page, '3 by 2 cells selected');
    check(await at(page) === '2:3' && await page.locator('[data-range][aria-selected="true"]').count() === 6, 'DG-19b letting go keeps the range, announced, with the active cell where the drag ended');
    await page.mouse.click(a0.x + a0.width / 2, a0.y + a0.height / 2);
    check(await page.locator('[data-range]').count() === 0 && await at(page) === '0:2', 'DG-19c a click without dragging is still a single cell');
    await cell(page, 0, 3).click(); await page.keyboard.press('Shift+ArrowDown'); await page.keyboard.press('Shift+ArrowDown');
    await said(page, '3 by 1 cells selected');
    const copied = await page.evaluate(() => { const d = new DataTransfer(); document.activeElement.dispatchEvent(new ClipboardEvent('copy', { clipboardData: d, bubbles: true, cancelable: true })); return d.getData('text/plain'); });
    check(copied === '120\n34\n0', 'DG-20 copy gives the range as tab-separated text');
    await page.keyboard.press('Delete'); await idle(page);
    check(await text(page, 0, 3) === '0' && await text(page, 1, 3) === '0', 'DG-21 Delete clears the range in one batch');
    await page.keyboard.press('Control+z');
    await page.waitForFunction(() => document.querySelector('[data-cell="0:3"] .alt-grid-value').textContent === '120');
    check(await text(page, 1, 3) === '34', 'DG-22 Ctrl+Z undoes the last batch');
    await cell(page, 1, 2).click();
    await page.evaluate(() => { const d = new DataTransfer(); d.setData('text/plain', '95\t60\n-3\t7\n'); document.activeElement.dispatchEvent(new ClipboardEvent('paste', { clipboardData: d, bubbles: true, cancelable: true })); });
    await said(page, '3 cells saved. 1 cell couldn’t be saved: Price, Cable tray: Use a price of 0 or more.');
    check(await text(page, 1, 2) === '$95' && await text(page, 1, 3) === '60' && await text(page, 2, 3) === '7' && await cell(page, 2, 2).getAttribute('data-status') === 'failed', 'DG-23 a paste saves the valid cells as one batch and marks the invalid one');
    // A custom editor (Select) commits on choosing.
    await cell(page, 4, 4).click(); await page.keyboard.press('Enter');
    await page.getByRole('option', { name: 'Active' }).click(); await idle(page);
    check((await cell(page, 4, 4).textContent()).includes('Active') && await at(page) === '4:4', 'DG-24 a Select column commits on choosing and returns to the cell');
    await page.close(); }

  // #614: DataGrid participates in Table's existing carry choreography. Observe real animations, including a
  // Table control, so a reorder must travel while initial rendering, unchanged rows and reduced motion do not.
  for (const scheme of ['daylight', 'nightfall']) for (const motion of ['full', 'reduced']) {
    const page = await open({ scheme });
    await page.evaluate(({ scheme, motion }) => {
      document.body.innerHTML = '<div id="carry-root"></div>';
      const A = window.Altitude, h = React.createElement;
      window.__carryCalls = [];
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (frames, options) {
        if (this.matches('tbody > tr')) window.__carryCalls.push({
          kind: this.closest('[role="grid"]') ? 'grid' : 'table',
          name: this.textContent, frames, options,
        });
        return animate.call(this, frames, options);
      };
      function App() {
        const [rows, setRows] = React.useState([
          { id: 'gateway', name: 'API gateway' }, { id: 'worker', name: 'Worker pool' }, { id: 'edge', name: 'Edge cache' },
        ]);
        const [revision, setRevision] = React.useState(0);
        const update = reverse => { setRows(rs => reverse ? [...rs].reverse() : [...rs]); setRevision(r => r + 1); };
        return h(A.AltitudeProvider, { scheme, motion },
          h('button', { id: 'carry-same', onClick: () => update(false) }, 'Keep order'),
          h('button', { id: 'carry-reverse', onClick: () => update(true) }, 'Reverse rows'),
          h('output', { id: 'carry-revision' }, revision),
          h(A.DataGrid, { 'aria-label': 'Releases', rows, getRowId: row => row.id, getRowLabel: row => row.name,
            columns: [{ key: 'name', header: 'Release' }], onCellSave: () => ({ ok: true }) }),
          h(A.Table, { 'aria-label': 'Carry control' }, h(A.TableBody, null,
            rows.map(row => h(A.TableRow, { key: row.id, rowId: row.id }, h(A.TableCell, null, row.name))))));
      }
      const scene = h(App);
      ReactDOM.createRoot(document.getElementById('carry-root')).render(document.documentElement.dataset.fixtureStrict === 'true' ? h(React.StrictMode, null, scene) : scene);
    }, { scheme, motion });
    await page.waitForFunction(() => document.querySelector('#carry-revision')?.textContent === '0');
    const label = `${scheme}/${motion}`;
    check((await page.evaluate(() => window.__carryCalls)).length === 0, `DG-29 ${label}: initial rows do not animate as moves`);
    await page.click('#carry-same');
    await page.waitForFunction(() => document.querySelector('#carry-revision').textContent === '1');
    check((await page.evaluate(() => window.__carryCalls)).length === 0, `DG-30 ${label}: replacing rows without changing order does not travel`);
    for (const revision of [2, 3]) {
      await page.evaluate(() => { window.__carryCalls = []; });
      await page.click('#carry-reverse');
      await page.waitForFunction(revision => document.querySelector('#carry-revision').textContent === String(revision), revision);
      const calls = await page.evaluate(() => window.__carryCalls);
      const moves = kind => calls.filter(call => call.kind === kind).sort((a, b) => a.name.localeCompare(b.name));
      const expected = motion === 'full' ? ['API gateway', 'Edge cache'] : [];
      for (const kind of ['table', 'grid']) {
        check(JSON.stringify(moves(kind).map(call => call.name)) === JSON.stringify(expected),
          `DG-31 ${label}/${revision}/${kind}: only displaced rows travel (${JSON.stringify(calls)})`);
      }
      if (motion === 'full') {
        check(moves('grid').every((call, i) => call.options.duration === 220 && call.options.easing.replaceAll(' ', '') === 'cubic-bezier(0.65,0,0.35,1)'
          && call.frames[0].transform !== 'translate(0px, 0px)' && call.frames[1].transform === 'none'
          && JSON.stringify(call.options) === JSON.stringify(moves('table')[i].options)),
        `DG-32 ${label}/${revision}: grid rows travel with the same duration and easing as Table`);
      }
      await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished)));
      check(await page.getByRole('grid', { name: 'Releases' }).locator('tbody tr').first().textContent() === (revision === 2 ? 'Edge cache' : 'API gateway'),
        `DG-33 ${label}/${revision}: the new order is retained after motion completes`);
    }
    await page.close();
  }

  // #570: an open edit stays bound to the row id and column key it began on. A reorder doesn't retarget its draft; a
  // row that leaves `rows` takes its draft with it, said, and nothing is saved to the record now in its place.
  { const page = await open();
    await page.evaluate(() => new Promise((done) => {
      document.body.innerHTML = '<button id="rev">Reverse rows</button><button id="drop">Remove Bob</button><div id="r"></div>';
      const A = window.Altitude, h = React.createElement;
      window.__saved = [];
      function App() {
        const [rows, setRows] = React.useState([{ id: 'a', name: 'Alice', amount: '10' }, { id: 'b', name: 'Bob', amount: '20' }]);
        React.useEffect(() => {
          document.getElementById('rev').onclick = () => setRows((rs) => [...rs].reverse());
          document.getElementById('drop').onclick = () => setRows((rs) => rs.filter((x) => x.id !== 'b'));
        }, []);
        return h(A.DataGrid, { 'aria-label': 'Accounts', rows, getRowId: (x) => x.id, getRowLabel: (x) => x.name,
          columns: [{ key: 'name', header: 'Name' }, { key: 'amount', header: 'Amount', editable: true }],
          onCellSave: (change) => { window.__saved.push({ rowId: change.rowId, key: change.key, draft: change.draft, previousValue: change.previousValue });
            setRows((rs) => rs.map((x) => x.id === change.rowId ? { ...x, amount: String(change.draft) } : x)); return { ok: true }; } });
      }
      const scene = h(A.AltitudeProvider, null, h(App));
      ReactDOM.createRoot(document.getElementById('r')).render(document.documentElement.dataset.fixtureStrict === 'true' ? h(React.StrictMode, null, scene) : scene);
      setTimeout(done, 200);
    }));
    const amount = name => page.locator('tbody tr').filter({ hasText: name }).locator('[role="gridcell"]').nth(1);
    await amount('Alice').dblclick(); await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.type('99');
    await page.click('#rev');
    const editor = page.getByRole('textbox', { name: 'Amount, Alice' });
    check(await editor.inputValue() === '99' && await page.getByRole('textbox', { name: 'Amount, Bob' }).count() === 0, 'DG-25 after the rows reorder, the open draft is still Alice’s');
    await editor.focus(); await page.keyboard.press('Enter'); await idle(page);
    const saved = await page.evaluate(() => window.__saved);
    check(saved.length === 1 && saved[0].rowId === 'a' && saved[0].draft === '99' && saved[0].previousValue === '10' && await amount('Alice').textContent() === '99' && await amount('Bob').textContent() === '20',
      `DG-26 committing it saves Alice, not the record now in its place (${JSON.stringify(saved)})`);
    await page.click('#rev'); // Bob last, so removing him leaves the active position past the end of `rows`
    await amount('Bob').dblclick(); await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.type('77');
    await page.evaluate(() => document.getElementById('drop').click()); // the field keeps focus until Bob goes
    await said(page, 'Edit discarded: Amount, Bob is no longer in the grid');
    check(await page.locator('.alt-grid-input').count() === 0 && (await page.evaluate(() => window.__saved)).length === 1 && await amount('Alice').textContent() === '99',
      'DG-27 when the edited row leaves the grid, its draft is discarded and said, and saved to no other record');
    check(await at(page) === '0:1' && await page.locator('[role="grid"] [tabindex="0"]').count() === 1,
      `DG-28 focus returns to the clamped active cell, the grid's one Tab stop (focus on ${await at(page)})`);
    await page.close(); }

  for (const scheme of ['daylight', 'nightfall']) for (const width of [320, 960]) {
    const page = await open({ scheme, width });
    for (const mode of ['standard', 'reduced-motion', 'forced-colors', 'increased-contrast']) {
      await page.emulateMedia({ reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference', forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
      await page.locator('.alt-root').evaluate((root, more) => { root.dataset.contrast = more ? 'more' : 'system'; }, mode === 'increased-contrast');
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${scheme}/${width}/${mode}: the page doesn’t scroll sideways (the grid scrolls within itself)`);
    }
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`DataGrid: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
