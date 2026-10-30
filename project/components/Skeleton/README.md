# Skeleton

Stands in for loading content as an **imprint**: the shape of what's coming, pressed into the page. When the content arrives it rises out of its imprint and the imprint fills in behind it.

Imprints are wells (`surface-well`, inset shadow) because they're openings waiting to receive something. While waiting, a soft band of light passes over them every `dur-sweep`, staggered line by line; it stops under reduced motion. When `loaded` turns true, the children rise from the bottom of the imprint over `dur-travel-3` while the well fades out. Reveals share the attention budget, so if many land at once, no more than four begin together and the rest follow in order.

**Or don't.** `Avatar`, `Badge`, `CardTitle`, `CardDescription`, `CardContent` and `DataTable` draw their own imprint while your data is still undefined; see `Await`. Use Skeleton for layouts of your own.

**You provide:** the real content as children, `loaded`, and a shape that matches it: `shape="circle"` with a `width`, `shape="text"` with `lines`, or a block with `width` and `height`.

- Match the real layout so nothing jumps when content arrives.
- Don't show imprints for loads under about 300ms; show nothing.

Under `AltitudeProvider loading="breath"` (experimental) a Skeleton breathes in depth instead of being swept by light, on the same page clock as every other imprint, and its content fills past the ground when `loaded` turns true. See `Await`.
