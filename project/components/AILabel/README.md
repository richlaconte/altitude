# AILabel

Says when content was generated or changed by AI, and explains how when asked: for trust, and under transparency rules such as the EU AI Act. Carbon for AI made its label the entry point to explainability; this follows that, without the gradient.

**Elevation: a label is part of the record.** It's a flush `Badge` plate, a small static icon and a word: "AI", or **"Drafted with AI"** once a person has reviewed it.
- **No gradient, no glow, no shimmer.** A glow is light from below, and the light never moves. A gradient rim is also easily mistaken for focus.
- **It acts**, so it lifts one level when pointed at, like any plate that acts.
- **The explanation** is a `Popover` at level 3, "About this content": the model, when it was generated (`RelativeTime`), confidence in words, who reviewed or edited it, and the sources it was based on.
- **Provenance stays.** Accepting AI content doesn't remove its label; the plate changes to "Drafted with AI" and the explanation says who reviewed it.

**Accessibility.** A button with `aria-haspopup="dialog"` opening a non-modal popover. Its name says what it marks ("Summary generated with AI. Show details", or "drafted with AI and reviewed"). Tab, Enter and Escape. Under forced colours the plate has a border, and the icon and word carry the meaning. Under `contrast="more"` the plate's border is `line-control`.

**Props:** `subject` (what it marks, default "Content"); `model`; `generatedAt`; `sources` (`{ title, url? }[]`); `confidence`; `reviewedBy`; `editedBy`; `children` (anything else about how it was made).

**You provide:** the provenance. Place the label beside what it marks, such as a heading or a field label.

```tsx
<h3>Summary <AILabel subject="Summary" model="Opus 5.5" generatedAt={summary.at}
  sources={summary.sources} reviewedBy={summary.reviewer} confidence="Medium: two sources disagreed" /></h3>
```

- Do keep the label once a person accepts the content.
- Do say confidence in words.
- Don't decorate AI content with gradients, glows or shimmer.
- Don't use the label as the only place AI involvement is disclosed when your rules require more.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`AILabel` as first used in its preview:

```tsx
import { AILabel } from 'altitude-design';

<AILabel subject="Summary" model="Opus 5.5" generatedAt={new Date(Date.now() - 4 * 60000)} confidence="Medium: two sources disagreed about the renewal date"
sources={[{ title: 'Call with Jamie Lee, 28 Oct', url: '#/calls/28' }, { title: 'Contract v3.pdf', url: '#/files/contract' }]} />
```

The full preview, as rendered in Storybook and checked in CI (`col`, `al`, `ttl` are the preview page's own layout classes, not Altitude's):

```tsx
import { AILabel } from 'altitude-design';

export default function App() {
  return (
    <div className="col al">
      <div>
        <h3 className="ttl">Summary <AILabel subject="Summary" model="Opus 5.5" generatedAt={new Date(Date.now() - 4 * 60000)} confidence="Medium: two sources disagreed about the renewal date"
          sources={[{ title: 'Call with Jamie Lee, 28 Oct', url: '#/calls/28' }, { title: 'Contract v3.pdf', url: '#/files/contract' }]} /></h3>
        <p>Jamie wants to move to annual billing in November and asked whether the 30-day refund applies to the remaining monthly period.</p>
      </div>
      <div>
        <h3 className="ttl">Reply <AILabel subject="Reply" model="Opus 5.5" generatedAt={new Date(Date.now() - 3 * 3600000)} reviewedBy="Maya Chen" editedBy="Maya Chen" /></h3>
        <p>Hi Jamie, thanks for getting in touch. Your full refund of €240 is on its way.</p>
      </div>
    </div>
  );
}
```
<!-- /example -->
