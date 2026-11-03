# Skeleton

Stands in for loading content as an **imprint**: the shape of what's coming, pressed into the page. When the content arrives it rises out of its imprint and the imprint fills in behind it.

Imprints are wells (`surface-well`, inset shadow) because they're openings waiting to receive something. While waiting, a soft band of light passes over them every `dur-sweep`, staggered line by line; it stops under reduced motion. When `loaded` turns true, the children rise from the bottom of the imprint over `dur-travel-3` while the well fades out. Reveals share the attention budget, so if many land at once, no more than four begin together and the rest follow in order.

**Or don't.** `Avatar`, `Badge`, `CardTitle`, `CardDescription`, `CardContent` and `DataTable` draw their own imprint while your data is still undefined; see `Await`. Use Skeleton for layouts of your own.

**You provide:** the real content as children, `loaded`, and a shape that matches it: `shape="circle"` with a `width`, `shape="text"` with `lines`, or a block with `width` and `height`.

- Match the real layout so nothing jumps when content arrives.
- Don't show imprints for loads under about 300ms; show nothing.

Under `AltitudeProvider loading="breath"` (experimental) a Skeleton breathes in depth instead of being swept by light, on the same page clock as every other imprint, and its content fills past the ground when `loaded` turns true. See `Await`.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Skeleton` as first used in its preview:

```tsx
import { Avatar, Skeleton } from 'altitude-design';

<Skeleton loaded={loaded} shape="circle" width={44}><Avatar name="Mara Quist" size={44} status="active" /></Skeleton>
```

The full preview, as rendered in Storybook and checked in CI (`col`, `card`, `lines`, `txt`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Avatar, Skeleton, Surface } from 'altitude-design';

export default function App() {
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => { const t = setInterval(() => setLoaded((l) => !l), 2600); return () => clearInterval(t); }, []);
  return (
    <div className="col">
      <Surface level={1} className="card">
        <Skeleton loaded={loaded} shape="circle" width={44}><Avatar name="Mara Quist" size={44} status="active" /></Skeleton>
        <div className="lines">
          <Skeleton loaded={loaded} width="45%" height={14}><b style={{ font: '600 14px/20px var(--font-sans)' }}>Mara Quist</b></Skeleton>
          <Skeleton loaded={loaded} shape="text" lines={2}><p className="txt">Merged “Faster cold starts” into main. Cold starts are down 38% across all regions.</p></Skeleton>
        </div>
      </Surface>
      <p className="cap">While it loads, the layout is pressed into the page; when content lands it rises out of its imprint, four at a time at most.</p>
    </div>
  );
}
```
<!-- /example -->
