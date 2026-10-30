// Markdown (#268): CommonMark blocks and inlines plus GFM tables, task lists, strikethrough and bare links, set as
// Altitude prose; what it hands to CodeBlock, Link, InlineCitation and Separator; URL safety and raw HTML; and while
// streaming, unfinished constructs render as unfinished (an open fence writes, a table waits for its delimiter row and
// never draws a half row, an unclosed ** or link shows its words without the markers). Run after a render of every
// preview (it opens test/p-Markdown-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`file://${T}p-Markdown-daylight.html`); await page.waitForTimeout(400);
await page.evaluate(() => { document.body.innerHTML = '<div id="r"></div>'; window.__root = ReactDOM.createRoot(document.getElementById('r')); });
// Renders the source and returns the Markdown element's HTML (and a handle for queries).
const md = async (src, props = {}) => {
  await page.evaluate(([src, props]) => new Promise((done) => {
    const A = window.Altitude, h = React.createElement;
    window.__root.render(h(A.AltitudeProvider, null, h(A.Markdown, { ...props, citations: props.citations ? [{ title: 'Billing FAQ', url: 'https://x.test' }, { title: 'Pricing' }] : undefined }, src)));
    setTimeout(done, 80);
  }), [src, props]);
  return page.evaluate(() => document.querySelector('.alt-md').innerHTML);
};
const q = (sel) => page.evaluate((sel) => [...document.querySelectorAll(`.alt-md ${sel}`)].map((e) => e.textContent), sel);
const text = () => page.evaluate(() => document.querySelector('.alt-md').textContent);

// Headings
await md('# One\n\n## Two\n\nSetext\n===');
expect((await q('h3'))[0] === 'One' && (await q('h4')).join() === 'Two', 'a # heading is h3 and ## is h4 (headingLevel 3)');
expect((await q('h3')).join() === 'One,Setext', 'a setext heading is a heading');
await md('# One', { headingLevel: 2 });
expect((await q('h2')).join() === 'One', 'headingLevel moves them');
// Inlines
await md('**b** *i* _u_ snake_case_word ~~d~~ 2 * 3 `a **b**` \\*lit\\*');
expect((await q('strong')).join() === 'b' && (await q('em')).join() === 'i,u' && (await q('del')).join() === 'd', `emphasis, strong and strikethrough (${await q('em')})`);
expect((await text()).includes('snake_case_word') && (await text()).includes('2 * 3') && (await text()).includes('*lit*'), 'intraword underscores, a spaced * and escapes stay literal');
expect((await q('code.alt-md-code')).join() === 'a **b**', 'inline code keeps its text');
await md('line one  \nline two\nline three');
expect((await page.evaluate(() => document.querySelectorAll('.alt-md br').length)) === 1, 'two trailing spaces make a hard break; a soft break does not');
// Links and images
await md('[guide](https://help.example.com/x "Guide") and [bad](javascript:alert(1)) <https://a.example> see https://example.com/path. and ![pic](data:text/html,x)');
const links = await page.evaluate(() => [...document.querySelectorAll('.alt-md a')].map((a) => [a.className, a.getAttribute('href'), a.textContent]));
expect(links.some(([c, h]) => c.includes('alt-link') && h === 'https://help.example.com/x'), `a link is Link (${JSON.stringify(links)})`);
expect(!links.some(([, h]) => /javascript/i.test(h ?? '')) && (await text()).includes('bad'), 'a javascript: link is refused and its words kept');
expect(links.some(([, h]) => h === 'https://a.example') && links.some(([, h]) => h === 'https://example.com/path'), 'autolinks and bare links, without the trailing period');
expect(!(await page.evaluate(() => document.querySelector('.alt-md img'))), 'a data: image that is not an image type is refused');
await md('![dot](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=)');
await page.waitForTimeout(200);
expect(await page.evaluate(() => document.querySelector('.alt-md .alt-md-img[data-state="done"] img[alt="dot"]') !== null), 'an image loads out of its imprint');
await md('![a missing chart](missing.png)'); await page.waitForTimeout(200);
expect((await q('.alt-md-img-failed')).join() === 'a missing chart', 'an image that fails shows its alt text');
// Raw HTML
await md('<b>bold?</b>\n\n<script>window.__x=1</script>');
expect(!(await page.evaluate(() => document.querySelector('.alt-md b'))) && (await text()).includes('<b>bold?</b>'), 'raw HTML shows as text by default');
await md('<div class="raw">ok</div>', { allowHtml: true });
expect(await page.evaluate(() => !!document.querySelector('.alt-md .raw')), 'allowHtml renders an HTML block');
// Lists
await md('- a\n- b\n  - nested\n- c\n\n3. three\n4. four');
expect((await page.evaluate(() => document.querySelectorAll('.alt-md > ul > li').length)) === 3 && (await q('ul ul li')).join() === 'nested', 'a bullet list with a nested list');
expect((await page.evaluate(() => document.querySelector('.alt-md ol')?.getAttribute('start'))) === '3' && (await q('ol > li')).length === 2, 'an ordered list keeps its start');
expect(!(await page.evaluate(() => document.querySelector('.alt-md li p'))), 'a tight list has no paragraphs');
await md('- a\n\n- b');
expect((await page.evaluate(() => document.querySelectorAll('.alt-md li p').length)) === 2, 'a loose list has paragraphs');
await md('- [x] done\n- [ ] todo');
expect(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.alt-md-task')].map((t) => t.getAttribute('aria-label')))) === '["Done","Not done"]', 'task items say Done or Not done');
// Tables, quotes, rules, code
await md('| A | B |\n| :-- | --: |\n| 1 | 2 |\n| 3 | 4 |\n\n> quoted\n\n---\n\n```js\nlet x = 1;\n```');
const tbl = await page.evaluate(() => { const r = document.querySelector('.alt-md-table'); return { role: r.getAttribute('role'), tab: r.tabIndex, name: r.getAttribute('aria-label'), th: r.querySelectorAll('th').length, rows: r.querySelectorAll('tbody tr').length, end: r.querySelector('td:nth-child(2)').dataset.align }; });
expect(tbl.role === 'region' && tbl.tab === 0 && /A, B/.test(tbl.name) && tbl.th === 2 && tbl.rows === 2 && tbl.end === 'end', `a table in a focusable named region (${JSON.stringify(tbl)})`);
expect((await q('blockquote')).join() === 'quoted' && (await page.evaluate(() => !!document.querySelector('.alt-md .alt-sep'))), 'a blockquote and a rule (Separator)');
const code = await page.evaluate(() => { const f = document.querySelector('.alt-md figure.alt-code'); return f && { busy: f.getAttribute('aria-busy'), text: f.textContent }; });
expect(code && !code.busy && code.text.includes('let x = 1;') && code.text.includes('js'), `fenced code is a CodeBlock titled with its language (${JSON.stringify(code)})`);
// Citations
await md('Refunds in full [1], credits [2], not [9].', { citations: true });
expect((await page.evaluate(() => document.querySelectorAll('.alt-md .alt-cite').length)) === 2 && (await text()).includes('[9]'), 'markers with a source are InlineCitation; others stay text');
// Streaming
await md('Run:\n\n```ts\nconst a = 1', { streaming: true });
expect((await page.evaluate(() => document.querySelector('.alt-md .alt-code')?.getAttribute('aria-busy'))) === 'true', 'an open fence is a streaming CodeBlock');
await md('Run:\n\n```ts\nconst a = 1\n``', { streaming: true });
expect(!(await text()).includes('``'), 'a closing fence still arriving is not code');
await md('Intro\n\n| A | B |', { streaming: true });
expect(!(await page.evaluate(() => document.querySelector('.alt-md table'))) && !(await text()).includes('|'), 'a header row without its delimiter shows nothing yet');
await md('| A | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4', { streaming: true });
expect((await page.evaluate(() => document.querySelectorAll('.alt-md tbody tr').length)) === 1, 'the row still arriving is not drawn');
await md('| A | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |\n', { streaming: true });
expect((await page.evaluate(() => document.querySelectorAll('.alt-md tbody tr').length)) === 2, 'a row is drawn once its line is complete');
await md('Check the **refund window', { streaming: true });
expect(!(await text()).includes('*') && (await text()).includes('refund window') && !(await page.evaluate(() => document.querySelector('.alt-md strong'))), 'an unclosed ** shows its words without the markers while streaming');
await md('Check the **refund window');
expect((await text()).includes('**refund'), 'once complete, an unclosed ** is literal');
await md('See [the guide](https://help.ex', { streaming: true });
expect((await text()) === 'See the guide' && !(await page.evaluate(() => document.querySelector('.alt-md a'))), `a link still arriving shows its words (${await text()})`);
await md('Use `npm i', { streaming: true });
expect(!(await text()).includes('`') && (await q('code')).join() === 'npm i', 'an open code span is code while streaming');
// Keyboard: links and the table region are in the tab order.
await md('[one](https://a.example)\n\n| A |\n| - |\n| 1 |\n\n[two](https://b.example)');
await page.focus('body');
const order = [];
for (let i = 0; i < 3; i++) { await page.keyboard.press('Tab'); order.push(await page.evaluate(() => document.activeElement.className.split(' ')[0] + ':' + document.activeElement.textContent.slice(0, 4))); }
expect(order[0].startsWith('alt-link:one') && order[1].startsWith('alt-md-table') && order[2].startsWith('alt-link:two'), `Tab reaches links and the table region in order (${order})`);
expect(!errors.length, `no page errors (${errors.join('; ')})`);
console.log(`Markdown: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
