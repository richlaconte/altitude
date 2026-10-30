<!--
title: PromptInput: add context with @ and run commands with /
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`PromptInput`.

## What you're trying to do

In a harness the person points the agent at things: "@pricing.ts", "@Q3 report", "@Maya", and runs commands: "/review", "/compact", "/clear". Typing @ or / opens a list anchored at the caret, filtered as they type; choosing an item puts a plate in the text and adds it to the message's context. Every coding harness does this; product assistants do it for records and people. `CommentThread` already has @people, but `PromptInput` has neither.

## Today

`PromptInput` is a growing textarea with attachments, a toolbar, Send and Stop (`project/components/PromptInput/README.md`). `CommentThread` takes `mentionable(query)` and draws mentions as plates (`project/components/src/comment-thread.tsx#L35`).

## Proposal

```tsx
<PromptInput onSubmit={({ text, files, mentions, command }) => send(…)}
  mentionable={async (q) => searchContext(q) /* { id, label, kind: 'file' | 'record' | 'person', description? }[] */}
  commands={[{ name: 'review', description: 'Review the current changes' }, { name: 'compact', description: 'Summarise the conversation so far' }]}>
  …
</PromptInput>
```

- @ anywhere opens the mention list; / at the start of an empty composer opens the command list.
- A chosen mention becomes a plate in the text (as `CommentThread`'s); Backspace after a plate removes it whole.
- `onSubmit` receives `mentions` and the chosen `command` separately from the text.
- The list ranks as `CommandPalette` does (best match on top, results carried when they change).

**Additive?** yes

## Elevation impact

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Composer | Sunk | −1 | as today | — |
| Mention / command list | Floating | 3 | `surface-floating` · `elev-3`, the `Combobox` list | "Files", "Records", "Commands" group headings |
| Highlighted option | — | — | `Combobox`'s gliding highlight | `aria-selected` |
| Mention in the text | Ground | 0 | flush plate inside the well (`CommentThread`'s) | its label and kind icon |
| Command in the text | Ground | 0 | flush plate in mono | "/review" |
| Loading results | Sunk (imprint) | −1 | imprint rows in the list | "Searching…" |

## Motion and accessibility

The list rises to level 3 from the caret as `Combobox`'s does; under reduced motion it appears. [Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) on the textarea: `aria-autocomplete="list"`, `aria-controls`, `aria-activedescendant`; arrows move, Enter or Tab chooses, Escape closes the list (and only a second Escape stops generating). IME composition never triggers the list. A chosen mention is announced ("Added pricing.ts to context"). On narrow touch screens the list follows #249.

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the component's README and its `build/previews.txt` section updated
- [ ] `Elevation.md` / `Motion.md` updated if a signal or choreography changed
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes; interaction checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

Part of the agent harness research pass (`docs/research/agent-harness/`); related to #150.
