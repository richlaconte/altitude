// Narrow insets (Mobile, M11): on a phone, padding steps down instead of stacking a desktop's insets at every level of
// nesting. On a desktop nothing changes, a narrow card included (cards 20px, the page, dialogs and sheets 24px, trace
// detail indented 40px to the step's text); on a 375px phone the page gutter, a card, a dialog and a sheet are 16px,
// trace detail is one small step in, and what reaches through an inset (a page header, a sheet's header and footer, a
// folder tab strip) still lines up with it. Also the two narrow faults found with it: a Markdown
// answer's last block carries no margin out, and a DiffView's buttons wrap rather than being clipped. Run after a render
// of every preview (it opens test/p-<Name>-daylight.html for Card, AppShell, Trace, Markdown, DiffView, Tabs and
// AgentHarness); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const desktop = await browser.newContext({ viewport: { width: 960, height: 800 } });
const phone = await browser.newContext({ viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true });
const open = async (ctx, name) => { const p = await ctx.newPage(); await p.goto(`file://${T}p-${name}-daylight.html`); await p.waitForTimeout(400); return p; };
const px = (p, sel, prop) => p.evaluate(([s, k]) => { const e = document.querySelector(s); return e ? parseFloat(getComputedStyle(e)[k]) : NaN; }, [sel, prop]);
// An overlay's parts, made without opening one: their insets follow the viewport, not a parent.
const overlay = (p) => p.evaluate(() => {
  const make = (html) => { const d = document.createElement('div'); d.innerHTML = html; document.body.appendChild(d); return d; };
  const d = make('<div class="alt-dialog"></div><div class="alt-sheet-inner"><div class="alt-sheet-header"></div><div class="alt-sheet-footer"></div></div>');
  const cs = (s) => getComputedStyle(d.querySelector(s));
  const r = { dialog: parseFloat(cs('.alt-dialog').paddingLeft), inner: parseFloat(cs('.alt-sheet-inner').paddingLeft),
    header: -parseFloat(cs('.alt-sheet-header').marginLeft), headerPad: parseFloat(cs('.alt-sheet-header').paddingLeft), footer: -parseFloat(cs('.alt-sheet-footer').marginLeft) };
  d.remove(); return r;
});

for (const [ctx, wide] of [[desktop, true], [phone, false]]) {
  const at = wide ? 'desktop' : 'phone';
  // Card: 20px on a desktop, however narrow the card; 16px on a phone.
  let p = await open(ctx, 'Card');
  const card = await px(p, '.alt-card-content', 'paddingLeft');
  expect(card === (wide ? 20 : 16), `${at}: a card's content inset is ${wide ? 20 : 16}px (${card})`);
  const head = await px(p, '.alt-card-header', 'paddingLeft');
  if (!Number.isNaN(head)) expect(head === card, `${at}: a card's header and content share an inset (${head}, ${card})`);
  await p.close();
  // AppShell: the page gutter, and a page header reaching through it to the shell's edge.
  p = await open(ctx, 'AppShell');
  const shell = await p.evaluate(() => { const m = document.querySelector('.alt-inset'), h = m?.querySelector('.alt-page-head'); if (!m || !h) return null;
    const pad = parseFloat(getComputedStyle(m).paddingLeft), mr = m.getBoundingClientRect(), hr = h.getBoundingClientRect();
    return { pad, edge: Math.round(hr.left - mr.left), text: Math.round(hr.left + parseFloat(getComputedStyle(h).paddingLeft) - (mr.left + pad)) }; });
  if (!shell) expect(false, `${at}: AppShell renders an Inset with a PageHeader`);
  else {
    expect(shell.pad === (wide ? 24 : 16), `${at}: the page gutter is ${wide ? 24 : 16}px (${shell.pad})`);
    expect(shell.edge === 0 && shell.text === 0, `${at}: the page header reaches the shell's edge and its text lines up with the page (${JSON.stringify(shell)})`);
  }
  // Overlays: 24px on a desktop, 16px on a phone; a sheet's header and footer reach exactly through its inset.
  const o = await overlay(p);
  expect(o.dialog === (wide ? 24 : 16) && o.inner === o.dialog, `${at}: dialog and sheet insets are ${wide ? 24 : 16}px (${JSON.stringify(o)})`);
  expect(o.header === o.inner && o.footer === o.inner && o.headerPad === o.inner, `${at}: a sheet's header and footer line up with its body (${JSON.stringify(o)})`);
  await p.close();
  // Trace: detail indented to the step's text where there's room, one small step in when narrow.
  p = await open(ctx, 'Trace');
  const indent = await p.evaluate(() => { const d = document.querySelector('.alt-trace-detail'); return d ? Math.round(d.getBoundingClientRect().left - d.parentElement.getBoundingClientRect().left) : NaN; });
  expect(wide ? indent === 40 : indent === 12, `${at}: trace detail is indented ${wide ? 40 : 12}px (${indent})`);
  await p.close();
  // Folder tabs: the tab strip's inset matches the panel's.
  p = await open(ctx, 'Tabs');
  const folder = await p.evaluate(() => { const t = document.querySelector('.alt-tabs[data-variant="folder"]'); if (!t) return null;
    return [parseFloat(getComputedStyle(t.querySelector(':scope > .alt-tabs-list')).paddingLeft), parseFloat(getComputedStyle(t.querySelector(':scope > .alt-tabs-content')).paddingLeft)]; });
  if (folder) expect(folder[0] === folder[1] && folder[0] === (wide ? 20 : 16), `${at}: a folder tab strip lines up with its panel (${folder})`);
  await p.close();
  // Markdown: the last block of an answer carries no margin out of it.
  p = await open(ctx, 'Markdown');
  const trailing = await p.evaluate(() => [...document.querySelectorAll('.alt-md')].map((m) => m.lastElementChild ? parseFloat(getComputedStyle(m.lastElementChild).marginBottom) : 0));
  expect(trailing.length > 0 && trailing.every((m) => m === 0), `${at}: no Markdown answer ends with a margin (${trailing})`);
  await p.close();
  // DiffView: every header button is inside the frame, not clipped by it.
  p = await open(ctx, 'DiffView');
  const clipped = await p.evaluate(() => [...document.querySelectorAll('.alt-diff')].flatMap((d) => { const r = d.getBoundingClientRect();
    return [...d.querySelectorAll('.alt-diff-nav button')].filter((b) => { const q = b.getBoundingClientRect(); return q.right > r.right + 0.5 || q.left < r.left - 0.5; }).map((b) => b.textContent); }));
  expect(clipped.length === 0, `${at}: DiffView's buttons are all inside its frame (clipped: ${clipped.join(', ')})`);
  await p.close();
}
// The agent harness on a phone: the answer keeps most of the width (it had 249px of 375 before insets stepped down).
{
  const p = await open(phone, 'AgentHarness');
  await p.click('.ah-moment:text-is("Writing")'); await p.waitForTimeout(300);
  const w = await p.evaluate(() => Math.round(document.querySelector('.alt-msg[data-from="assistant"] .alt-msg-content')?.getBoundingClientRect().width ?? 0));
  expect(w >= 270, `phone: the agent's answer is at least 270px wide in a 375px harness (${w})`);
  await p.close();
}
console.log(`Narrow insets: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
