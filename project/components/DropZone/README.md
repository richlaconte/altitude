# DropZone

A receptacle that opens only when there's something to receive: flush at rest, sunk while a file is in flight, deeper under the pointer.

At rest it's a dashed outline on the ground. As soon as files are dragged anywhere over the page it sinks into a well (armed), so every place that can take the file announces itself. Hovering it deepens it to a trench with an `accent-ink` rim and `accent-soft` fill (over). Dropped files settle in with an afterglow. Clicking, Enter or Space opens the file picker.

**You provide:** `onFiles`, optional `accept` and `multiple`, the zone's content (an icon and "Drop files or browse"). `state` forces a visual state for documentation.

- Don't leave drop zones armed when nothing is being dragged; an always-open well stops meaning anything.

## The queue

Pass `queue` and each file you're handling is a slat under the zone, named by its file and size:

- **uploading** is a task, so a `Progress` fill rises out of its trench ("Uploading, 40%"), with Cancel;
- **processing** is a write the server hasn't confirmed, so the slat **hovers as pending** ("Processing"), with Cancel;
- **done** lands and settles with the afterglow ("Uploaded"), with Remove;
- **failed** drops to a trench with its reason and **Retry**, and Remove.

`UploadItem` is `{ id, name, size?, state, progress?, error? }`. `onRetry`, `onCancel` and `onRemove` get the id, and their buttons name the file ("Retry upload of report.pdf"). Progress is announced at 25, 50, 75 and 100%, and on processing, finishing and failing, never continuously. Afterglows start at most four at once.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`DropZone` as first used in its preview:

```tsx
import { DropZone } from 'altitude-design';

<DropZone state="idle"><Body /></DropZone>
```

The full preview, as rendered in Storybook and checked in CI (`three`, `lab` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { DropZone } from 'altitude-design';

const Body = () => <><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg><span>Drop files or <u>browse</u></span></>;
export default function App() {
  return (
    <div className="three">
      <div><div className="lab">idle · flush</div><DropZone state="idle"><Body /></DropZone></div>
      <div><div className="lab">armed · a file is in flight</div><DropZone state="armed"><Body /></DropZone></div>
      <div><div className="lab">over · ready to receive</div><DropZone state="over"><Body /></DropZone></div>
      <div style={{ gridColumn: '1 / -1' }}><Queue /></div>
    </div>
  );
}
// A stand-in uploader: files upload in steps, then the server processes them; one fails until retried.
const start = [
  { id: 'a', name: 'Q3 board deck.pdf', size: 2400000, state: 'uploading', progress: 0 },
  { id: 'b', name: 'Customer list.csv', size: 480000, state: 'uploading', progress: 0 },
  { id: 'c', name: 'Brand guidelines.pdf', size: 18200000, state: 'uploading', progress: 0, fails: true },
];
function Queue() {
  const [items, setItems] = React.useState(start);
  React.useEffect(() => {
    const t = setInterval(() => setItems((xs) => xs.map((x) => {
      if (x.state === 'uploading') { const p = Math.min(100, x.progress + (x.id === 'b' ? 34 : 13)); if (x.fails && p > 40) return { ...x, state: 'failed', error: 'The connection dropped' }; return p >= 100 ? { ...x, state: 'processing', progress: 100 } : { ...x, progress: p }; }
      if (x.state === 'processing') return Math.random() < 0.35 ? { ...x, state: 'done' } : x;
      return x;
    })), 450);
    return () => clearInterval(t);
  }, []);
  return <DropZone multiple queue={items} onFiles={(fs) => setItems((xs) => [...xs, ...fs.map((f, i) => ({ id: f.name + Date.now() + i, name: f.name, size: f.size, state: 'uploading', progress: 0 }))])}
    onRetry={(id) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, state: 'uploading', progress: 40, fails: false, error: undefined } : x)))}
    onCancel={(id) => setItems((xs) => xs.filter((x) => x.id !== id))} onRemove={(id) => setItems((xs) => xs.filter((x) => x.id !== id))}><Body /></DropZone>;
}
```
<!-- /example -->
