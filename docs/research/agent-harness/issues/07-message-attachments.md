<!--
title: Message: show what was attached to a sent message
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`Message` (with `PromptInput`'s attachment chips as the source of the look).

## What you're trying to do

A person attaches a screenshot and a PDF in `PromptInput` and sends. The chips leave the composer, and nothing in the thread shows what went with the message, so neither the person scrolling back nor a screen reader user knows the answer was about those files. Apps work around it by rendering their own thumbnails inside `MessageContent`.

## Today

`PromptInput` draws attachments as `Tag` plates and an upload in flight as pending (`project/components/PromptInput/README.md`). `Message` has `from`, `status`, `name`, `onRetry` and children only (`project/components/src/conversation.tsx#L75`).

## Proposal

```tsx
<Message from="user">
  <MessageAttachments items={[
    { name: 'checkout-bug.png', type: 'image/png', url: thumbUrl, onOpen: () => preview(id) },
    { name: 'Q3 pricing.pdf', type: 'application/pdf', size: 482113, href: fileUrl },
  ]} />
  <MessageContent>Why does checkout break on this screen?</MessageContent>
</Message>
```

Images are thumbnails (a fixed 64px row, `object-fit: cover`); other files are the same `Tag` plates the composer used, now settled, with name, type and `FormattedNumber` size. Items with `onOpen` or `href` act.

**Additive?** yes

## Elevation impact

A sent attachment is part of the record: it was uploaded before the message was sent, so it can't be pending.

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| File plate | Ground | 0 | `Tag` plate · none | name, type icon, size |
| Image thumbnail | Ground | 0 | 1px `line` rim · none, `radius-md` | its `alt` (the file name unless given) |
| Plate or thumbnail that opens | Ground → +1 on hover | 0 | lifts one level, like any plate that acts | "Open checkout-bug.png" |
| Unavailable (expired, deleted) | Ground | 0 | plate, `ink-muted` | "No longer available" |
| Opened image | Floating | 5 | `Dialog` (the app's own preview) | as `Dialog` |

## Motion and accessibility

None new in motion. A labelled list ("2 attachments") before the message text; each item a link or button named by the file. Under forced colours thumbnails keep a 1px `CanvasText` border.

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the component's README and its `build/previews.txt` section updated
- [ ] `Elevation.md` / `Motion.md` updated if a signal or choreography changed
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes; interaction checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

Part of the agent harness research pass (`docs/research/agent-harness/`); related to #150 and #151.
