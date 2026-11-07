# ModelSelector

Chooses a configured AI provider connection and one of its models. The Provider field names where the request goes; the searchable Model field names what runs there. Use it on its own with application-owned state, or use `PromptInputModelSelector` inside a `PromptInput` configured with `modelPicker`.

## Contract

`ModelSelector` is controlled: pass `providers`, `value` and `onValueChange`. A selection is `{ providerId, modelId }`; `null` means no provider, and an empty `modelId` means the provider was chosen but a model is still required. IDs are opaque, case-sensitive strings: slashes and gateway aliases stay intact. Provider IDs must be unique, nonempty configured-connection IDs; model IDs must be unique and nonempty within their provider. The same model ID can appear under several providers.

Each provider has `id`, `label`, optional `description`, `disabled` and `disabledReason`, plus a readonly `models` list. Each model has the same display/availability fields. A `disabledReason` makes its option unavailable even without `disabled`; explain what the person can do, such as “Connect this provider in Settings.” Disabled choices remain in the list with their reason and cannot be chosen. Changing provider always emits `{ providerId, modelId: '' }`, never the first model or a cross-provider fallback.

A removed selection retains its ID in an unavailable option and a visible explanation. Loading (`loading`) and a catalog failure (`error`) keep the current selection visible and block dispatch. `disabled` locks the controls only: a complete, available selection remains valid. `getModelSelectionError({ providers, value, loading, error })` returns the blocking reason or `null`; a standalone selector does not send anything or enforce application authorization.

## Composer and runtime

Pass the same configuration as `PromptInput.modelPicker` and render `PromptInputModelSelector` in its toolbar. The composer validates immediately before send and enqueue, preserving drafts and attachments when blocked. Successful callbacks receive a copied `PromptMessage.model`; changing the picker later cannot rewrite that pair. Keep the pair in queued messages, stored turn inputs and retries. Route the stream from its **input**, not a closure over the current picker, and display the provider-confirmed execution identity on completed records when it differs from the requested alias.

Applications own connection setup, credentials, endpoint discovery, catalog refresh, authorization, required capabilities, defaults, persistence and provider requests. Supply an already authorized catalog, express task-specific exclusions with `disabledReason`, and validate again at the server before dispatch. When dispatching an older queued or retried input, revalidate that input's pair; never silently replace it with today's picker value. No credentials or SDK are included in this component.

## Keyboard, layout and elevation

Provider reuses Select: arrows and typing navigate, Enter chooses, Escape closes and returns focus. Model reuses Combobox: typing searches labels and IDs; Enter chooses an available match; Escape restores the chosen value. Enter in either field never submits an enclosing composer. IME Enter is left to text composition. Each field has a visible label; feedback is polite and associated through `aria-describedby`. Incomplete choices receive instructions, without an immediate invalid-field state. Stale or unavailable choices use `aria-invalid` as well as words.

| Part or state | Tier / level | Surface and shadow | Meaning without height |
|---|---|---|---|
| Empty field | sunk / −1 | existing Input `surface-well`, `well` | visible label, placeholder |
| Chosen field | ground / 0 | existing filled Input treatment | selected label and tick |
| Invalid choice | sunk / −2 | existing Input `critical-soft`, trench treatment | explanation and `aria-invalid` |
| Options | floating / 3 | existing Select `surface-floating`, `elev-3` | listbox, options, selection state |
| Disabled field / feedback | ground / 0 | existing disabled field / plain text | disabled state and reason |

Fields wrap within a narrow composer; their touch targets are at least 44px on coarse pointers. Provider uses Select's automatic touch sheet; the searchable model list stays anchored to its input. Existing controls supply forced-color borders, focus rings and reduced-motion behavior. There is no new elevation tier.

The [provider/model research](../../../docs/research/agent-model-selection/README.md) records the source evidence and tradeoffs. Browser coverage lives in `build/checks/model-selector.mjs`; engineering checks do not measure human usability.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`ModelSelector` as first used in its preview:

```tsx
import { ModelSelector } from 'altitude-design';

<ModelSelector providers={providers} value={value} onValueChange={setValue} />
```

The full preview, as rendered in Storybook and checked in CI (`ms-demo`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { ModelSelector } from 'altitude-design';

const providers = [
  { id: 'studio', label: 'Studio connection', models: [{ id: 'beam', label: 'Beam', description: 'General conversation' }, { id: 'arc', label: 'Arc', description: 'Code and tools' }] },
  { id: 'gateway', label: 'Team gateway', description: 'Your workspace connection', models: [{ id: 'beam', label: 'Beam' }, { id: 'large', label: 'Large model', disabledReason: 'Not enabled for this workspace.' }] },
  { id: 'local', label: 'Local connection', disabledReason: 'Connect a local server in Settings.', models: [] },
];
export default function App() {
  const [value, setValue] = React.useState({ providerId: 'studio', modelId: 'beam' });
  return <div className="ms-demo">
    <section>
      <h3>For the next message</h3>
      <ModelSelector providers={providers} value={value} onValueChange={setValue} />
      <p className="cap">{value.modelId ? `Selected: ${value.providerId} / ${value.modelId}` : 'Choose a model for this provider.'} Fictional catalog; no provider request is made.</p>
    </section>
    <section>
      <h3>A saved model is unavailable</h3>
      <ModelSelector providers={providers} value={{ providerId: 'gateway', modelId: 'retired' }} onValueChange={() => {}} />
    </section>
  </div>;
}
```
<!-- /example -->
