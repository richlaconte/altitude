# Progress

Shows how far along a task is: a raised fill rising out of a trench.

Determinate progress glides between values on `ease-glide` (`dur-travel-3`). Without a `value` it's indeterminate: a third-width fill travels across the track every `dur-sweep`, and stops under reduced motion.

**You provide:** `value` (0–`max`) or nothing, and an `aria-label` or a visible label nearby.

- Do switch from indeterminate to determinate as soon as you know the total.
- Don't use it for a reading such as storage used of a quota: that's the record, not a task, so it's a [`Meter`](../Meter/README.md).

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Progress` as first used in its preview:

```tsx
import { Progress } from 'altitude-design';

<Progress value={v} aria-label="Upload" />
```

The full preview, as rendered in Storybook and checked in CI (`col`, `wrap`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Progress } from 'altitude-design';

export default function App() {
  const [v, setV] = React.useState(20);
  React.useEffect(() => { const t = setInterval(() => setV((x) => (x >= 100 ? 8 : x + 23)), 1100); return () => clearInterval(t); }, []);
  return (
    <div className="col wrap">
      <Progress value={v} aria-label="Upload" />
      <Progress aria-label="Loading" />
      <p className="cap">Determinate glides between values; indeterminate travels.</p>
    </div>
  );
}
```
<!-- /example -->
