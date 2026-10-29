# CodeBlock

Code to read and copy: install commands, API examples in several languages, webhook payloads, config, code an agent wrote.

**Elevation.** Code shown to read and copy is the record, so it lies flush on the ground: a 1px `line` rim, mono type and no shadow. It isn't a `Card`, because code isn't a live surface. The header carries its name, a segmented `Tabs` switch between forms of the same thing (npm, pnpm; curl, Node, Python), and a ghost `CopyButton` ("Copy code"). Highlighted lines are `accent-soft` bands with an `accent-ink` edge behind the text. Line numbers sit in an `ink-faint` gutter. **Code still arriving** (`streaming`, from an agent) isn't the record yet: it has a dashed `line-control` rule down its left, says "Writing…", is `aria-busy`, and can't be copied until it's done.

**Syntax colours are yours.** Altitude ships no highlighter. Pass `syntax={(code, language) => …}` (Shiki, Prism, your own) and it renders whatever you return. The default token classes (`tok-comment`, `tok-keyword`, `tok-string`, and Prism's and highlight.js's equivalents) use `ink-muted`, `accent-ink` and `ink`, never the `data-*` palette. Colours carry nothing on their own.

**Overflow.** Code taller than `maxHeight` (default 360) or wider than its box scrolls. Only then does the scroll area become a focusable, named region (`tabIndex=0`, `role="region"`), so keyboard users can scroll it with the arrows.

**Accessibility.** A `<figure>` named by its title, holding `<pre><code>`. Line numbers are `aria-hidden`. Highlighted lines are said in words before the code ("Lines 3 and 7 are highlighted."). The form switch is `Tabs`, with `aria-selected`. Under forced colours the rim is `CanvasText` and highlighted lines are `Mark`. Under `contrast="more"` the rim is `line-control`. Switching forms cross-fades the code over `dur-travel-1` and nothing travels.

**Props:** `code` and `language` for one block, or `tabs` (`{ label, code, language? }[]`); `title`; `highlight` (line numbers from 1); `syntax`; `lineNumbers`; `streaming`; `maxHeight`; `copyable` (default true).

**You provide:** the code, a title (a filename, or what it does), and a highlighter if you want colour.

```tsx
<CodeBlock title="Install" tabs={[
  { label: 'npm', language: 'sh', code: 'npm install altitude-design' },
  { label: 'pnpm', language: 'sh', code: 'pnpm add altitude-design' },
]} />
<CodeBlock title="invoice.paid" language="json" code={payload} highlight={[3]} lineNumbers />
```

- Do give every block a title, so it's named and so people know what to paste where.
- Do use tabs for the same thing in several forms, not for different things.
- Don't raise a code block into a card or give it a shadow.
- Don't colour code with the chart palette.
