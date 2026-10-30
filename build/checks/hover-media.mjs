// Hover is a pointer's (#246): every :hover rule in bundle.css sits inside @media (hover: hover), so a tap on a touch
// screen never leaves a surface lifted or tinted after it has done its job (law 4: pressing returns it to ground).
// Keyboard focus keeps its lift through :focus-visible. Under forced colours a hover is a system-colour outline, no
// height, so those rules may stay bare (the issue's hairline exception). Exits non-zero on any other bare :hover.
import { readFileSync } from 'fs';
import { chromium } from 'playwright-core';
const css = readFileSync(new URL('../../project/components/bundle.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
let pass = 0, fail = 0;
const bare = [];
// A second pass that records each rule with its context.
const rules = [];
{
  const ctx = []; let buf = '';
  for (const ch of css) {
    if (ch === '{') { const h = buf.trim(); if (!h.startsWith('@') && h.includes(':hover')) rules.push({ sel: h, ctx: [...ctx] }); ctx.push(h); buf = ''; }
    else if (ch === '}') { ctx.pop(); buf = ''; }
    else if (ch === ';') buf = '';
    else buf += ch;
  }
}
for (const r of rules) if (!r.ctx.some((c) => /^@media[^{]*\((hover:\s*hover|forced-colors:\s*active)\)/.test(c))) bare.push(r.sel.slice(0, 120));
if (rules.length && !bare.length) pass++; else { fail++; console.log(`FAIL ${bare.length} :hover rule(s) outside @media (hover: hover):\n  ` + bare.join('\n  ')); }
// In a browser: with a mouse, hovering a button lifts it; on a phone, a tap leaves it at rest.
{
  const T = new URL('../test/', import.meta.url).pathname;
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const shadow = async (page, act) => {
    await page.goto(`file://${T}p-Button-daylight.html`); await page.waitForTimeout(500);
    const b = page.locator('.alt-btn[data-variant="secondary"]').first();
    const rest = await b.evaluate((e) => getComputedStyle(e).boxShadow);
    await act(b); await page.waitForTimeout(400);
    return { rest, after: await b.evaluate((e) => getComputedStyle(e).boxShadow) };
  };
  const desk = await browser.newPage({ viewport: { width: 960, height: 800 } });
  const d = await shadow(desk, (b) => b.hover());
  if (d.after !== d.rest) pass++; else { fail++; console.log('FAIL with a mouse, hover no longer lifts the button'); }
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true });
  const m = await shadow(await ctx.newPage(), (b) => b.tap());
  if (m.after === m.rest) pass++; else { fail++; console.log(`FAIL on a phone, a tapped button stays lifted (${m.after})`); }
  await browser.close();
}
console.log(`hover-media: ${rules.length} :hover rules, each inside @media (hover: hover) or a forced-colours outline · ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
