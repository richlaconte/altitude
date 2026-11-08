# MediaGallery

Inspect a product through its images and playable previews (a turntable video, an audio sample, a model poster or your own 3D renderer) without leaving its page. It's the gallery on a product detail page: one stage, every thumbnail visible, and nothing that rotates or plays by itself. It isn't a carousel.

Use `Artifact` for something an agent is writing, and `MessageAttachments` for files sent with a message.

**Elevation: settled media with live controls.**
- **The stage** is the record. It lies on the ground with a 1px `line` rim, and its shape (`aspectRatio`, default 4 / 3) is reserved before anything loads, so nothing shifts.
- **An image still loading** is an imprint, a `surface-well` opening the image rises out of.
- **A failed preview** drops into a trench with its message and "Retry preview".
- **Thumbnails** are ordinary buttons on the ground that lift one level when pointed at, because they act. The current one has a 2px `accent-ink` outline and `aria-current="true"`. It's never higher than the others: selection isn't importance.
- **Previous and Next** are secondary slabs. **View larger** is a ghost button that opens the same gallery in a `Dialog` (level 5).
- Nothing in the gallery says price, popularity or quality in height.

**Every thumbnail stays visible.** Thumbnails wrap onto more lines, and are never truncated or replaced by dots. In Baymard's testing, dots or text alone left half of desktop testers unable to find additional images, and truncated thumbnails were overlooked by 50–80%. Video, audio and custom previews sit in the same set with a kind icon, and their kind is in the name ("Turntable, video"). Below 480px of its own width (a container query), the thumbnails take their own row beneath Previous, Next and View larger.

**Media behaves.**
- Only the active item is mounted, so switching can't leave hidden audio or video playing.
- Video and audio use native controls, `preload="metadata"` and never autoplay.
- Captions come from `tracks`. A transcript opens under the stage ("Transcript: Turntable").
- A custom renderer is mounted only while its item is active. Unmounting is its signal to stop work, and if it throws, the item's poster and alt text show instead.
- A browser that can't play a format says "This browser can't play this video." and points to the transcript.

**Accessibility.**
- A named group containing a `figure`; its caption gives the label and "Preview 2 of 4".
- A list of thumbnail buttons labelled "Choose a preview", each named "{label}, {kind}", following the APG carousel's grouped pickers, without rotation.
- Selecting doesn't move focus. A polite status says "Showing 2 of 4: Bark texture" once per selection.
- The gallery adds no key handlers to the stage, so an embedded renderer keeps its own keys and nothing traps focus.
- If the active item disappears from `items`, the gallery selects the item now at its position and says "That preview was removed".
- Forced colours: the current thumbnail has a 3px `Highlight` border, and a failed preview a thick dashed one.
- `contrast="more"`: thumbnails take an `ink` rim. Under reduced motion the stage swaps without its cross-fade.

**Parts:** `MediaGallery` takes these props:
- `aria-label` (without the word "carousel")
- `items`, each `{ id, kind, label, thumbnail?, caption? }` plus, by kind:
  - `image`: `src`, `alt`, `srcSet?`, `sizes?`
  - `video`: `src`, `type?`, `poster?`, `tracks?`, `transcript?`
  - `audio`: `src`, `type?`, `poster?`, `transcript?`
  - `custom`: `alt`, `poster?`, `kindLabel?`
- `value` and `onValueChange`
- `renderCustom(item, { active })`
- `error` (failures you know of, by id) and `onRetry(id)`
- `enlargeable`
- `aspectRatio`

**You provide:**
- trusted media URLs, and the rights to show them;
- alt text, captions and transcripts;
- poster images;
- any 3D renderer, loaded by your app. Altitude bundles no model decoder, transcoder or fetch policy.

URL validation and content safety are yours. A visible preview doesn't mean a file can be downloaded or is owned.

```tsx
<MediaGallery
  aria-label="Fernhollow pine forest pack previews"
  items={[
    { id: 'scene', kind: 'image', label: 'Forest scene', src: scene, thumbnail: sceneThumb, alt: 'Five pine trees on a grassy slope' },
    { id: 'spin', kind: 'video', label: 'Turntable', src: spinMp4, poster: spinPoster, tracks: [{ src: spinVtt, kind: 'captions', srcLang: 'en', label: 'English' }] },
    { id: 'model', kind: 'custom', label: 'Tall pine', poster: pinePoster, alt: 'The tall pine model', kindLabel: '3D model' },
  ]}
  value={active}
  onValueChange={setActive}
  renderCustom={(item) => <ModelViewer src={modelUrl(item.id)} />}
  enlargeable
/>
```

- Do give every image alt text that says what it shows, and every video and audio a transcript.
- Do name a poster honestly ("Model poster (not interactive)") when there's no renderer.
- Don't autoplay, rotate, or hide thumbnails behind dots or "+3".
- Don't put a second Dialog inside the enlarged view.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`MediaGallery` as first used in its preview:

```tsx
import { MediaGallery } from 'altitude-design';

<MediaGallery aria-label="Fernhollow pine forest pack previews" items={MG_ITEMS} value={active} onValueChange={setActive} enlargeable />
```

The full preview, as rendered in Storybook and checked in CI (`mg` is the preview page's own layout class, not Altitude's):

```tsx
import * as React from 'react';
import { MediaGallery } from 'altitude-design';

const mgSvg = (body) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">${body}</svg>`);
const MG_FOREST = mgSvg('<rect width="400" height="300" fill="#dfe8dc"/><rect y="210" width="400" height="90" fill="#8fa77f"/>' +
  [40, 110, 170, 250, 320].map((x, i) => `<path d="M${x} ${70 + i % 2 * 20}l${36 + i * 3} 140h-${72 + i * 6}z" fill="${i % 2 ? '#3f6b4a' : '#2f5a3c'}"/><rect x="${x - 5}" y="${210 + i % 2 * 0}" width="10" height="18" fill="#6b4a32"/>`).join(''));
const MG_BARK = mgSvg('<rect width="400" height="300" fill="#7a5a40"/>' + Array.from({ length: 14 }, (_, i) => `<path d="M${i * 30} 0c${12 - i % 3 * 6} 60 -${8 + i % 4 * 4} 120 ${6} 300" stroke="#4e3826" stroke-width="${5 + i % 3 * 3}" fill="none"/>`).join(''));
const MG_WIRE = mgSvg('<rect width="400" height="300" fill="#e8ecf2"/><g stroke="#4a5568" stroke-width="2" fill="none"><path d="M200 40l80 190h-160z"/><path d="M200 40l30 190M200 40l-30 190M150 160h100M135 200h130"/><rect x="194" y="230" width="12" height="24"/></g>');
const MG_SAMPLE = (() => { const rate = 8000, n = rate * 2, b = new Uint8Array(44 + n), v = new DataView(b.buffer); const w = (o, t) => [...t].forEach((c, i) => { b[o + i] = c.charCodeAt(0); });
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) { const t = i / rate; b[44 + i] = 128 + Math.round(36 * Math.exp(-t * 1.6) * (Math.sin(2 * Math.PI * 220 * t) + 0.5 * Math.sin(2 * Math.PI * 330 * t))); }
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' })); })();
const MG_ITEMS = [
  { id: 'scene', kind: 'image', label: 'Forest scene', src: MG_FOREST, thumbnail: MG_FOREST, alt: 'Five pine trees of different heights on a grassy slope, rendered with the pack’s models', caption: 'Rendered with the pack’s five tree models.' },
  { id: 'bark', kind: 'image', label: 'Bark texture', src: MG_BARK, thumbnail: MG_BARK, alt: 'Close-up of a brown bark texture with dark vertical ridges' },
  { id: 'ambience', kind: 'audio', label: 'Wind in the pines', src: MG_SAMPLE, type: 'audio/wav', transcript: 'Two seconds of a low, fading two-note tone standing in for wind through branches. No speech.' },
  { id: 'model', kind: 'custom', label: 'Tall pine, wireframe', poster: MG_WIRE, thumbnail: MG_WIRE, kindLabel: 'model poster (not interactive)', alt: 'Wireframe of the tall pine model: a cone of 3 tiers over a short trunk' },
];
export default function App() {
  const [active, setActive] = React.useState('scene');
  return <div className="mg">
    <MediaGallery aria-label="Fernhollow pine forest pack previews" items={MG_ITEMS} value={active} onValueChange={setActive} enlargeable />
  </div>;
}
```
<!-- /example -->
