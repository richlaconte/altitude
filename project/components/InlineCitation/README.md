# InlineCitation

Numbered source markers in a grounded answer ("…renews monthly [2]"), with a preview of each source on hover or focus, and `Sources`, the list at the end.

**Elevation: a citation is part of the record.**
- **The marker** is a small flush plate with a mono number, raised a little off the baseline like a superscript. It's `ChartAnnotation`'s build: a flush `Badge` plate, and only one that acts lifts. It acts, so it **lifts one level when pointed at**.
- **The preview** is a `HoverCard` at level 3: "Source 2 · example.com", the title (linked), and the excerpt the answer relied on.
- **Sources** is a flush ordered list under a heading. Each entry is a marker's destination, highlighted when you arrive.
- **An unverified source** keeps its plate, adding a `caution` mark and "Unverified source" in words.

**Accessibility.** The marker is a link named "Source 2: Billing FAQ", never "[2]". Tab reaches it, the preview opens on focus as well as hover, and Enter follows it (to its entry in Sources by default, or your `href`). Under forced colours the plate has a `LinkText` border. Under `contrast="more"` its border is `line-control`.

**Props:** `InlineCitation`: `index`, `source` (`{ title, url?, excerpt?, unverified? }`), `href`, `idPrefix`. `Sources`: `items`, `heading`, `idPrefix`.

**You provide:** the sources, numbered in the order the answer cites them. When there are several answers on a page, give each its own `idPrefix`.

```tsx
<p>Plans renew monthly <InlineCitation index={2} source={{ title: 'Billing FAQ', url, excerpt }} />.</p>
<Sources items={sources} />
```

- Do include the excerpt the answer relied on.
- Do mark sources you couldn't verify.
- Don't render citations as bare numbers or superscripts with no name.
