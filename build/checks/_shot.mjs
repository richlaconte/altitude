import { adapterPages } from './adapter-page.mjs';
const [file, name, out] = process.argv.slice(2);
const { open, close } = await adapterPages(file, name);
for (const scheme of ['daylight', 'mesa']) { const { page } = await open({ scheme, height: 360 }); await page.click('.cm-content'); await page.waitForTimeout(700); await page.screenshot({ path: `${out}-${scheme}.png` }); await page.close(); }
await close();
