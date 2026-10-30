<!--
title: New: Markdown — an answer's text, rendered as it streams, in Altitude's type
label: enhancement
template: .github/ISSUE_TEMPLATE/new-component.md
-->

## What it's for

Models answer in Markdown: headings, lists, tables, emphasis, links, inline code and fenced code. Today `MessageContent` takes children, so every app picks its own parser and its own prose styles, and the answer, the largest thing on a harness's screen, is the one part not set in Altitude. Streaming makes it worse: a half-received table or an unclosed fence flashes raw syntax for a second before it resolves.

`Markdown` renders an answer's Markdown as Altitude prose, hands the parts Altitude already has to their components (`CodeBlock`, `Link`, `InlineCitation`, `Table` styles), and renders unfinished constructs as unfinished rather than as raw text while `streaming`.

**Closest existing components:** `MessageContent` (a container, no prose), `CodeBlock` (fenced code only), `Table` (structured rows, not text).
**Name:** `Markdown` (shadcn has no equivalent; AI Elements calls it `Response`, which names the use rather than the thing).

## Elevation story

**What it is:** settled
**Signal it carries:** none new. An answer still arriving is already carried by `Message status="streaming"` (the "Streaming" row). `Markdown` is the record's typography and adds no height.
**Relatives it borrows from:** code is `CodeBlock`; links are `Link`; tables use `Table`'s flush rows; `[n]` markers become `InlineCitation`; images arrive from an imprint as `Await` does.

| Part / state | Tier | Level | Surface · shadow | Non-height cue (word, icon, ARIA state or border) |
|---|---|---|---|---|
| Paragraphs, lists, headings | Ground | 0 | none · none | `text-body`; headings are `text-heading` (never `text-title`, which belongs to the page), weight 600 |
| Inline code | Ground | 0 | none · none, 1px `line` rim | JetBrains Mono |
| Fenced code | Ground | 0 | `CodeBlock` | its title (the language when none is given) |
| Fenced code still open while streaming | Ground | 0 | `CodeBlock streaming` | dashed `line-control` rule, "Writing…", `aria-busy` |
| Table | Ground | 0 | `Table` rows · none, `line` dividers | `<table>` with a header row |
| Table still arriving | Ground | 0 | rows received so far | no partial row is drawn; the header shows once it's complete |
| Blockquote | Ground | 0 | none · none, 2px `line` rule at its start | `<blockquote>` |
| Link | Ground | 0 | `Link` | underline; "(opens in a new tab)" off-site |
| Citation `[n]` | Ground → lifts 1 when pointed at | 0 | `InlineCitation` plate | "Source 2: Billing FAQ" |
| Image loading | Sunk (imprint) | −1 | `Skeleton` imprint at the image's size | `aria-busy`, alt text |
| Rule `---` | Ground | 0 | `Separator` | `<hr>` |
| Task list item | Ground | 0 | stamped check like `Checklist`, read only | "Done" / "Not done" in its name |

## Motion

None of its own. Text arrives without per-word animation (Conversation's rule). An image rises out of its imprint over `dur-travel-1` with `ease-rise`; under reduced motion it appears in place. A table row that completes appears in place: rows don't rise one by one.

## Accessibility

**WAI-ARIA pattern:** plain HTML: semantic `h2`–`h4` (offset by `headingLevel`, default 3, so an answer's headings sit under the conversation's), `ul`/`ol`, `table`, `blockquote`, `pre`/`code`, `a`.
**Keyboard:** nothing new; links, citations and code blocks keep theirs. A table wider than the message scrolls in a focusable named region, as `CodeBlock` does.
**Screen reader:** nothing is announced by `Markdown`; `Conversation` announces an answer once when it completes. Raw HTML in the source is not rendered by default.
**Forced colours:** inline code rim and blockquote rule are `CanvasText`; links `LinkText`.
**`contrast="more"`:** rims and rules are `line-control`.

## API sketch

```tsx
<Message from="assistant" status={m.status}>
  <MessageContent>
    <Markdown streaming={m.status === 'streaming'} citations={m.sources} syntax={highlight}>
      {m.text}
    </Markdown>
  </MessageContent>
</Message>
```

- `children: string`, the Markdown source (CommonMark plus GFM tables, task lists and strikethrough).
- `streaming`: render unfinished constructs as unfinished (open fence → streaming `CodeBlock`; a table without its delimiter row → nothing yet; an unclosed `**` → plain text until closed).
- `citations`: sources for `[n]` markers, rendered as `InlineCitation`; `idPrefix` as `Sources`.
- `syntax`: passed to every `CodeBlock`.
- `headingLevel`: the level of a `#` heading (default 3).
- `components`: override the element for any node (`{ a: RouterLink }`).
- `allowHtml` (default false), `transformUrl` (default strips `javascript:` and `data:` except images).

## Rules it strains (optional)

None. It applies existing rules to prose.

## Done when

- [ ] Source in `project/components/src/`, exported from `index.tsx`, its name added to `names` in `build/build.mjs`, declarations in `index.d.ts`
- [ ] A `bundle.css` section with a header comment explaining its elevation model
- [ ] `project/components/Markdown/README.md` in the existing format (what it is, elevation, props, "You provide", do and don't)
- [ ] A section in `build/previews.txt` with an honest `@dsCard` group and subtitle, including a mid-stream snapshot with an open fence and a half table
- [ ] A row in the signals table in `Elevation.md`; new choreography in `Motion.md`; sources and a prototype review in `Research.md`
- [ ] `tsc` clean; `shoot.mjs` renders it in all four schemes with no page or console errors; also checked with `FORCED=1`, reduced motion and `contrast="more"`
- [ ] Keyboard paths checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed (CI fails otherwise)

## Open questions (optional)

- Ship a small dependency-free parser (the bundle is dependency-free today), or take a parser adapter (`remark`, `markdown-it`, Streamdown) the way `CodeBlock` takes `syntax`? A built-in subset keeps `altitude.iife.js` working; an adapter keeps correctness someone else's problem.
- Should math (`$…$`) be in scope, as an adapter only?

Part of the agent harness research pass (`docs/research/agent-harness/`); related to #151 and #157.
