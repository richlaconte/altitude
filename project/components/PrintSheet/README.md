# PrintSheet

A document that will be printed, previewed on screen as the page it will become: an invoice, a weekly timesheet, a project overview to save as PDF and send. You set the paper, the margins and the header and footer that repeat on every page; the screen shows the pages at their paper size, scaled to fit, and the print comes out the same, with no screen chrome, shadows or scheme colours.

Use `Card` or `Surface` for a panel that only lives on screen, `Markdown` for prose, and `Artifact` for a document a person or an agent produced, with versions. Keep anything live about the document (its settings, the Print button) outside the sheet.

**Elevation: paper on the ground; in print, the page itself.**
- **On screen** each page is a piece of paper raised one level (`surface-raised`, `elev-1`) only so it's told apart from the page behind it, as a `Card` that only holds content: no wall, no hover lift, nothing to press.
- **Always light paper.** A sheet wears daylight's tokens in every scheme (`surface-raised`, which is white, and `ink`), because it previews a printed page, not the app. It's the one surface that doesn't follow the scheme.
- **Pages** are separated by `space-6` of ground. A `PrintSheetBreak` placed directly inside the sheet starts a new page on screen and in print. Content longer than a page continues on the same sheet, with a `line` rule where the printer will break it.
- **The header and footer** are flush caption text (`ink-muted`, 12px), as `PageHeader`'s, repeated on every page. `PrintSheetPageNumber` and `PrintSheetPageCount` fill in "Page 2 of 3".
- **In print** there is no ground and no height: no shadow, no radius, no gaps, no scale. The sheet sets `@page` (size and margins) and hides everything outside it. Each page ends in a page break, tables repeat their `<thead>` and keep rows whole, and headings stay with what follows.
- **Loading** (`loading`): each page is an imprint at its paper size (`surface-well`, `well`), and the document is named "Loading Invoice 1042" and `aria-busy`.

**Accessibility.** An `<article role="document">` named by `title`; `PrintSheetHeader` and `PrintSheetFooter` are `<header>` and `<footer>` inside it. A break between pages is `<hr role="separator">` named "Page 2 of 3". The sheet has no keyboard behaviour or tab stops of its own: it scrolls with its container, and anything interactive inside it (a link) tabs in order. Forced colours: each page has a 1px `CanvasText` edge. `contrast="more"`: the level-1 slab. Reduced motion: a page appears without rising. Print is unaffected by all three.

**Scale.** `scale="fit"` (default) scales the pages down to the container's width, never up, with a transform: the page keeps its exact print geometry (an A4 page is 210 mm wide however it's shown), and text stays sharp. A number is a fixed scale. Print is always actual size.

**Parts:** `PrintSheet` (`title`; `size`: `'a4'` (default), `'letter'`, `'legal'` or `{ width, height }` in CSS lengths; `margins` (CSS lengths, one or four, default `'20mm'`); `orientation`; `scale`; `header`; `footer`; `loading`), `PrintSheetHeader`, `PrintSheetFooter`, `PrintSheetBreak`, `PrintSheetPageNumber`, `PrintSheetPageCount`.

**You provide:** the content, laid out for paper (tables, headings, totals), and the print itself: call `window.print()`, or use the browser's or your own PDF pipeline. Generating a PDF file is out of scope.

**What browsers do.** Breaks within a page's content come from CSS fragmentation, so they're the browser's, and differ slightly between engines. Page numbers count pages you break by hand: when content overflows into an extra printed page, that page has no repeated header or footer, and the count doesn't include it. Where the count matters (an invoice, a timesheet), place `PrintSheetBreak`s yourself and keep each page's content within the page, which the screen rule shows. Chrome and Edge honour `@page` size; Safari and Firefox print to the size chosen in their print dialog.

```tsx
<PrintSheet title="Invoice 1042" size="a4" margins="18mm"
  header={<PrintSheetHeader><strong>Larkspur Studio</strong><span>Invoice 1042</span></PrintSheetHeader>}
  footer={<PrintSheetFooter>Page <PrintSheetPageNumber /> of <PrintSheetPageCount /></PrintSheetFooter>}>
  <h1>Invoice 1042</h1>
  <table>…</table>
  <PrintSheetBreak />
  <h2>Time entries</h2>
  <table>…</table>
</PrintSheet>
<Button onClick={() => window.print()}>Print</Button>
```

- Do keep settings and actions beside the sheet, not on it: nothing on paper is pressable.
- Do place breaks by hand when page numbers matter.
- Don't use it for screen-only content; it's paper, and it won't follow Nightfall.
- Don't put more than one PrintSheet on a page you print: the last `@page` rule wins.

## Demo and verification

The `PrintSheet` section of `build/previews.txt` is a two-page invoice for Larkspur Studio with a header, a footer with "Page n of m", a Paper select (A4 or US Letter), a switch for the time-entries page and a Print button. `node checks/print-sheet.mjs` (from `build/`) covers the document's name, pages split by a break and announced, the header and footer on every page with their numbers, white paper with ink text in both schemes, A4 and Letter geometry scaled to fit, the `@page` rule, no tab stops of its own, print media (no shadow, radius, scale or gaps; everything outside hidden; breaks and repeated table heads), a printed PDF of two pages, and 320/960px layouts in both schemes under reduced motion, forced colours and `contrast="more"`.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`PrintSheet` as first used in its preview:

```tsx
import { PrintSheet, PrintSheetBreak, PrintSheetFooter, PrintSheetHeader, PrintSheetPageCount, PrintSheetPageNumber } from 'altitude-design';

<PrintSheet title="Invoice 1042" size={size} margins="18mm"
  header={<PrintSheetHeader><strong>Larkspur Studio</strong><span>Invoice 1042 · 6 November 2026</span></PrintSheetHeader>}
  footer={<PrintSheetFooter><span>Larkspur Studio · 14 Quay Street</span><span>Page <PrintSheetPageNumber /> of <PrintSheetPageCount /></span></PrintSheetFooter>}>
  <h1>Invoice 1042</h1>
  <p>For Harbour Authority, work from 2 to 6 November 2026. Payment due in 30 days.</p>
  <table>
    <thead><tr><th>Work</th><th className="ps-num">Hours</th><th className="ps-num">Rate</th><th className="ps-num">Amount</th></tr></thead>
    <tbody>
      {PS_ITEMS.map(i => <tr key={i.what}><td>{i.what}</td><td className="ps-num">{i.hours}</td><td className="ps-num">{psMoney(i.rate)}</td><td className="ps-num">{psMoney(i.hours * i.rate)}</td></tr>)}
      <tr className="ps-total"><td colSpan={3}>Total</td><td className="ps-num">{psMoney(total)}</td></tr>
    </tbody>
  </table>
  {entries && <PrintSheetBreak />}
  {entries && <h2>Time entries</h2>}
  {entries && <table>
    <thead><tr><th>Day</th><th>Who</th><th>Work</th><th className="ps-num">Hours</th></tr></thead>
    <tbody>{PS_ENTRIES.map((e, k) => <tr key={k}><td>{e.day}</td><td>{e.who}</td><td>{e.what}</td><td className="ps-num">{e.hours}</td></tr>)}</tbody>
  </table>}
</PrintSheet>
```

The full preview, as rendered in Storybook and checked in CI (`ps-demo`, `ps-settings`, `ps-num`, `ps-total` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, Field, PrintSheet, PrintSheetBreak, PrintSheetFooter, PrintSheetHeader, PrintSheetPageCount, PrintSheetPageNumber, Select, Switch } from 'altitude-design';

const PS_ITEMS = [
  { what: 'Site survey, Harbour bridge', hours: 12, rate: 95 },
  { what: 'Structural drawings, revision B', hours: 18.5, rate: 110 },
  { what: 'Client meeting and notes', hours: 2, rate: 95 },
];
const PS_ENTRIES = [
  { day: 'Mon 2 Nov', who: 'Ana Ruiz', what: 'Site survey', hours: 6 },
  { day: 'Tue 3 Nov', who: 'Ana Ruiz', what: 'Site survey', hours: 6 },
  { day: 'Wed 4 Nov', who: 'Sam Okoro', what: 'Structural drawings', hours: 7.5 },
  { day: 'Thu 5 Nov', who: 'Sam Okoro', what: 'Structural drawings', hours: 8 },
  { day: 'Fri 6 Nov', who: 'Sam Okoro', what: 'Structural drawings', hours: 3 },
  { day: 'Fri 6 Nov', who: 'Ana Ruiz', what: 'Client meeting', hours: 2 },
];
const psMoney = n => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
export default function App() {
  const [size, setSize] = React.useState('a4');
  const [entries, setEntries] = React.useState(true);
  const total = PS_ITEMS.reduce((sum, i) => sum + i.hours * i.rate, 0);
  return <div className="ps-demo">
    <div className="ps-settings">
      <Field label="Paper">
        <Select value={size} onValueChange={setSize} items={[{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'US Letter' }]} />
      </Field>
      <Switch checked={entries} onCheckedChange={setEntries} label="Time entries page" />
      <Button onClick={() => window.print()}>Print</Button>
    </div>
    <PrintSheet title="Invoice 1042" size={size} margins="18mm"
      header={<PrintSheetHeader><strong>Larkspur Studio</strong><span>Invoice 1042 · 6 November 2026</span></PrintSheetHeader>}
      footer={<PrintSheetFooter><span>Larkspur Studio · 14 Quay Street</span><span>Page <PrintSheetPageNumber /> of <PrintSheetPageCount /></span></PrintSheetFooter>}>
      <h1>Invoice 1042</h1>
      <p>For Harbour Authority, work from 2 to 6 November 2026. Payment due in 30 days.</p>
      <table>
        <thead><tr><th>Work</th><th className="ps-num">Hours</th><th className="ps-num">Rate</th><th className="ps-num">Amount</th></tr></thead>
        <tbody>
          {PS_ITEMS.map(i => <tr key={i.what}><td>{i.what}</td><td className="ps-num">{i.hours}</td><td className="ps-num">{psMoney(i.rate)}</td><td className="ps-num">{psMoney(i.hours * i.rate)}</td></tr>)}
          <tr className="ps-total"><td colSpan={3}>Total</td><td className="ps-num">{psMoney(total)}</td></tr>
        </tbody>
      </table>
      {entries && <PrintSheetBreak />}
      {entries && <h2>Time entries</h2>}
      {entries && <table>
        <thead><tr><th>Day</th><th>Who</th><th>Work</th><th className="ps-num">Hours</th></tr></thead>
        <tbody>{PS_ENTRIES.map((e, k) => <tr key={k}><td>{e.day}</td><td>{e.who}</td><td>{e.what}</td><td className="ps-num">{e.hours}</td></tr>)}</tbody>
      </table>}
    </PrintSheet>
  </div>;
}
```
<!-- /example -->
