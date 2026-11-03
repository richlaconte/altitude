# Markdown

An answer's Markdown, set as Altitude prose, as it streams. Models answer in Markdown; `Markdown` renders it in the system's type and hands the parts Altitude already has to their components: fenced code to `CodeBlock`, links to `Link`, `[n]` markers to `InlineCitation`, tables to `Table`'s flush rows, `---` to `Separator`.

**Elevation: the record's typography, adding no height.**
- **Paragraphs, lists and headings** are on the ground. A `#` heading is the heading style (never the title, which belongs to the page), weight 600; `##` and below step down.
- **Inline code** has a 1px `line` rim and no fill. **Fenced code** is a `CodeBlock` titled with its language.
- **Tables** are `Table`'s flush rows with `line` dividers, in a frame that scrolls sideways when the table is wider than the message.
- **Blockquotes** have a 2px `line` rule at their start. **Task items** have a read-only stamped check.
- **A citation** is the one part that lifts, by one, when pointed at.
- **An image** waits in a sunk imprint at a 16:9 size and rises out of it when it loads; if it fails, its alt text shows.
- **While streaming** an open fence is a streaming `CodeBlock` (dashed rule, "Writing…", `aria-busy`), a table shows nothing until its delimiter row arrives and never a half-received row, and an unclosed `**`, backtick or link shows its words without the markers. The answer as a whole is still carried by `Message status="streaming"`.

**Accessibility.** Plain HTML: headings offset by `headingLevel` (default 3, so `#` is `h3` under the conversation's), lists, `table` with a header row, `blockquote`, `pre`/`code`, `a`. A table is in a focusable region named after its first columns, so it can be scrolled by keyboard. Markdown announces nothing; `Conversation` announces an answer once it completes. Off-site links say "(opens in a new tab)".

**Safety.** Raw HTML in the source is shown as text unless `allowHtml`. URLs pass through `transformUrl`, which by default refuses `javascript:`, `vbscript:`, `file:` and `data:` (except images); a refused link keeps its words.

**Props:** `children` (the source), `streaming`, `citations`, `idPrefix`, `syntax`, `headingLevel`, `components` (`a`, `img`, `code`, `pre`, `table`, `blockquote`), `allowHtml`, `transformUrl`. Also exported: `parseMarkdown`, `safeUrl`.

**You provide:** the text, `streaming` while it arrives, and the sources its `[n]` markers refer to. It covers CommonMark plus GFM tables, task lists, strikethrough and bare links, with no dependencies; footnotes, math and reference-style links aren't parsed. For those, render with your own parser and pass its parts through `components`.

```tsx
<Message from="assistant" status={m.status}>
  <MessageContent>
    <Markdown streaming={m.status === 'streaming'} citations={m.sources} syntax={highlight}>{m.text}</Markdown>
  </MessageContent>
</Message>
```

- Do pass `streaming` while the answer arrives, so half-received constructs don't flash as raw text.
- Do give each answer its own `idPrefix` when several cite sources on one page.
- Don't turn on `allowHtml` for model output or anything else you don't control.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Markdown` as first used in its preview:

```tsx
import { Markdown } from 'altitude-design';

<Markdown citations={sources}>{done}</Markdown>
```

The full preview, as rendered in Storybook and checked in CI (`md-demo`, `lbl`, `col` are the preview page's own layout classes, not Altitude's):

```tsx
import { Markdown } from 'altitude-design';

const sources = [
  { title: 'Billing FAQ', url: 'https://help.example.com/billing/faq', excerpt: 'Annual plans can be refunded in full within 30 days of purchase.' },
  { title: 'Plans and pricing', url: 'https://example.com/pricing' },
];
const done = [
  '# Refunds on annual plans',
  '',
  'Annual plans are refunded **in full** within 30 days [1]; after that, the unused months are credited as *account balance*, not cash [2].',
  '',
  '## What to check first',
  '',
  '- [x] The plan was bought less than 30 days ago',
  '- [ ] No seats were added since',
  '- [ ] The invoice is `paid`, not ~~pending~~',
  '',
  '| Plan | Window | Refund |',
  '| --- | :---: | ---: |',
  '| Monthly | none | $0 |',
  '| Annual | 30 days | 100% |',
  '',
  '> Credits never expire, but they can\'t be moved to another workspace.',
  '',
  'Issue it from the console:',
  '',
  '```sh',
  'altitude billing refund INV-0042 --full',
  '```',
  '',
  'See [the billing guide](https://help.example.com/billing) for partial refunds.',
].join('\n');
const streaming = [
  '## Steps',
  '',
  '1. Find the invoice',
  '2. Check the **refund window',
  '',
  '| Invoice | Amount | Status |',
  '| --- | ---: | --- |',
  '| INV-0042 | $480 | paid |',
  '| INV-0043 | $1',
].join('\n') + '';
const streamingCode = ['Run this:', '', '```ts', 'const refund = await billing.refund({', "  invoice: 'INV-0042',"].join('\n');
export default function App() {
  return (
    <div className="md-demo">
      <div>
        <p className="lbl">Complete</p>
        <Markdown citations={sources}>{done}</Markdown>
      </div>
      <div className="col">
        <div>
          <p className="lbl">Mid-stream: an unclosed bold and a half-received row</p>
          <Markdown streaming>{streaming}</Markdown>
        </div>
        <div>
          <p className="lbl">Mid-stream: an open fence</p>
          <Markdown streaming>{streamingCode}</Markdown>
        </div>
      </div>
    </div>
  );
}
```
<!-- /example -->
