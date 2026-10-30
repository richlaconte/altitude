<!--
title: PromptInput: dictate a message
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`PromptInput`.

## What you're trying to do

People talk to assistants: on a phone, with their hands busy, or because a long instruction is faster said than typed. ChatGPT, Claude and AI Elements (`SpeechInput`) put a microphone in the composer: press it, speak, see the words appear, then edit and send. Today an app adds its own mic button and decides alone how "listening" looks, and the common answers (a pulsing red dot, a bouncing waveform) are motion Altitude doesn't allow.

## Today

`PromptInput` has attach, a toolbar slot and Send/Stop (`project/components/PromptInput/README.md`). There's no dictation.

## Proposal

```tsx
<PromptInputToolbar>
  <PromptInputAttach />
  <PromptInputDictate onStart={start} onStop={stop} status={dictation.status /* 'idle' | 'listening' | 'denied' | 'unavailable' */}
    interim={dictation.interim} />
  <PromptInputSubmit />
</PromptInputToolbar>
```

- The application supplies speech recognition (the Web Speech API or a server transcriber); Altitude draws the states.
- Final text is inserted at the caret; interim text is shown as a ghost until it's final.

**Additive?** yes

## Elevation impact

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Mic, idle | Ground → +1 on hover | 0 | ghost button | "Dictate" |
| Listening | latched | — | `Toggle` on: shallow well, `accent-soft` poured in | "Listening", `aria-pressed="true"`, a steady lamp; no pulse, no waveform |
| Interim words | Sunk (the well stays an opening) | −1 | text in `ink-faint`, as `suggestion` | not announced |
| Final words | — | — | the floor rises (Completeness) | the value |
| Permission denied / unavailable | Ground | 0 | flush, faint, still focusable | "Microphone blocked. Allow it in your browser's site settings." |

Interim text is a guess, like a suggestion: "a value proposed for a field is a ghost of the value in `ink-faint`, never in the value, so an empty field with a ghost stays an opening".

## Motion and accessibility

No level meter in height (amounts never go in height); if an input level is shown, it's a flat `Meter`-style length. A toggle button with `aria-pressed`; ⌘D / Ctrl+D (or the app's shortcut) via `aria-keyshortcuts`; Escape stops listening before it stops generating. "Listening" and "Stopped listening" are announced politely; interim text is not. Under reduced motion nothing changes, because nothing moves.

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the component's README and its `build/previews.txt` section updated
- [ ] `Elevation.md` / `Motion.md` updated if a signal or choreography changed
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes; interaction checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

Part of the agent harness research pass (`docs/research/agent-harness/`); related to #150 and #154.
