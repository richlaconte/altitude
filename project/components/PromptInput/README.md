# PromptInput

Where a person writes to an assistant or agent: a textarea that grows, attachments as chips, optional tools or a model picker, Send, and Stop while a response is generating.

**Elevation: an opening.** The whole composer is the `Input` well. Empty, its back wall shows and it deepens as the pointer nears; once it holds text its floor rises flush (Completeness and Anticipation, as `Textarea`).
- **Send is the level-2 primary.** With nothing to send (no text, or a file still uploading) it's flush and faint, but stays focusable (`aria-disabled`).
- **While generating, Send becomes Stop in the same slot and size**, held as the live action. Its icon cross-fades without travel, so nothing moves.
- **Attachments are `Tag` plates** above the text. One being uploaded (your `onAttach` returned a promise) hovers as pending, "Uploading". A rejection removes it and says so.
- **Dragging a file over** drops the well to a trench, "Drop to attach", as `DropZone` does. It opens only while something could be dropped.

**Keyboard.** Enter sends. Shift+Enter adds a line. **Enter during IME composition never sends**, because it confirms the composition (Japanese, Chinese, Korean input). Escape stops generating. ⌘U or Ctrl+U attaches. Pasting a file attaches it. After sending, focus stays in the composer.

**Accessibility.** Plain HTML: a `<form>` with a labelled `<textarea>` ("Message" unless you name it) and buttons named "Send message", "Stop generating" and "Attach files". Sending isn't announced, because the conversation announces the response. Stopping is ("Generating stopped"), and so are attachments added and removed. Under forced colours the empty well is dashed and a drop target dashed thick. Under reduced motion the composer grows without gliding.

**Parts:** `PromptInput` (`onSubmit({ text, files })`, `status` (`'ready' | 'submitted' | 'streaming' | 'error'`), `onStop`, `value`, `onValueChange`, `onAttach`, `accept`); `PromptInputAttachments`; `PromptInputTextarea` (`placeholder`, `maxHeight`); `PromptInputToolbar`; `PromptInputAttach`; `PromptInputSubmit`.

**You provide:** sending, stopping, uploading, and the `status` of the response. Leave out `accept` and there are no attachments.

```tsx
<PromptInput onSubmit={(msg) => send(msg)} status={status} onStop={stop} accept="image/*,.pdf">
  <PromptInputAttachments />
  <PromptInputTextarea placeholder="Ask about this workspace" />
  <PromptInputToolbar>
    <PromptInputAttach />
    <Select size="sm" aria-label="Model" items={models} />
    <PromptInputSubmit />
  </PromptInputToolbar>
</PromptInput>
```

- Do keep Stop where Send was.
- Do return a promise from `onAttach` so an upload shows it's in flight.
- Don't send on Enter during IME composition (it's handled; don't override `onKeyDown` to send).
- Don't announce "Message sent".
