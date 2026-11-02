# CopyButton

Copies a value and says so: API keys, install commands, invite links, IDs, webhook URLs.

**Elevation.** It's a `Button` (ghost by default, or `secondary`), so it's live: it lifts one level when pointed at. **Copying is a press that confirms in words.** Once copied it stays pressed to the ground for `dur-linger` (2s), its icon cross-fades from copy to a check, and its words change to "Copied". Then it springs back. There's no rise and no afterglow, because nothing new arrived on the page. All its words share one cell, so saying "Copied" never changes its width.

**When it fails.** The Clipboard API needs a secure context and permission. Where it isn't available, CopyButton falls back to selecting a hidden copy of the text and running the copy command. If that fails too, the button says "Couldn't copy" with an alert icon, and "Couldn't copy. Select the text and press ⌘C." (Ctrl+C off a Mac) is announced. `onError` gets the error.

**Accessibility.** It's a plain [button](https://www.w3.org/WAI/ARIA/apg/patterns/button/): Enter or Space copies. The button keeps its name while it says "Copied": a polite status region announces the result instead, so focus never lands on a button whose name just changed. An icon-only CopyButton (no children) is square, named by `label`, and shows `label` in a `Tooltip`. Under forced colours a hovered button gets a 1px border.

**Props:** `value` (a string, or a function returning one or a promise of one); `label` (default "Copy"); `copiedLabel` (default "Copied"); `failedLabel` (default "Couldn't copy"); `onCopy(value)`; `onError(error)`; every `Button` prop except `square`, `loading` and `leading`.

**You provide:** the value, and a `label` that names what's copied ("Copy API key") when the button is icon-only.

```tsx
<CopyButton value={apiKey} label="Copy API key" />
<CopyButton value={() => buildInviteUrl()} variant="secondary">Copy invite link</CopyButton>
```

- Do name what's copied ("Copy API key"), not just "Copy", when there are several on a page.
- Do put it next to the value it copies, so people can see what they got.
- Don't confirm a copy with a toast; the button says it where you're looking.
- Don't make a primary CopyButton: copying is rarely the main thing on a page.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`CopyButton` as first used in its preview:

```tsx
import { CopyButton } from 'altitude-design';

<CopyButton size="sm" value="sk_live_51Hc8x2Lw9Qe7TfR4mNpZa" label="Copy API key" />
```

The full preview, as rendered in Storybook and checked in CI (`cb`, `key`, `row`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import { CopyButton } from 'altitude-design';

export default function App() {
  return (
    <div className="cb">
      <div className="key"><code>sk_live_51Hc8x2Lw9Qe7TfR4mNpZa</code><CopyButton size="sm" value="sk_live_51Hc8x2Lw9Qe7TfR4mNpZa" label="Copy API key" /></div>
      <div className="row">
        <CopyButton variant="secondary" value={() => 'https://app.example.com/invite/7Fq2'}>Copy invite link</CopyButton>
        <CopyButton value={() => Promise.reject(new Error('denied'))}>Copy install command</CopyButton>
      </div>
      <p className="cap">Copied: pressed to the ground with a check and "Copied" for two seconds, announced politely; the button keeps its name and its width. The last one fails on purpose, to show what a failure says.</p>
    </div>
  );
}
```
<!-- /example -->
