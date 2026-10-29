# Link

Navigation: a link in prose, "Learn more" after a hint, "View all invoices →" at the end of a card, an external link to docs.

**Elevation.** A link is text in the record, so it lies on the ground and **never lifts**. Lifting a word would break its line, and height means "press it", which is what a `Button` is for. It's `accent-ink` with an underline, so it's never told apart by colour alone. Hover thickens the underline from 1px to 2px over `dur-travel-1`. Focus is the 2px `accent-ink` ring at a 2px offset. A standalone link ("View all invoices →") is still ground.

**Link or button?** A link goes somewhere (it has an `href`). A button does something. Don't use a ghost `Button` for navigation: it has the wrong semantics, and it lifts on hover like a slab.

**External links.** `external` opens a new tab with `rel="noopener noreferrer"`, ends with an external-link icon, and adds "(opens in a new tab)" for screen readers.

**Router links.** `asChild` puts the styles and behaviour on your own element (a router's `Link`) instead of rendering an `<a>`.

**Accessibility.** It's a plain `<a href>`, so Enter follows it. Under forced colours it's `LinkText`. Under `contrast="more"` the underline is always 2px. `visited` turns a followed link's underline `ink-muted` (off by default; it helps in long lists of documents).

**Props:** `href` and every anchor attribute; `external`; `asChild`; `visited`.

**You provide:** where it goes, and link text that says where (not "click here").

```tsx
<Link href="/docs/webhooks">Read about webhooks</Link>
<Link href="https://status.example.com" external>Status page</Link>
<Link asChild><NextLink href="/billing">Manage billing</NextLink></Link>
```

- Do write link text that makes sense on its own ("Read about webhooks", not "here").
- Do use `external` for anything that leaves your app.
- Don't use a link for an action (Save, Delete); that's a `Button`.
- Don't colour a link yourself, or take its underline away inside prose.
