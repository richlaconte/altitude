# Breadcrumb

Where you are in an app with routes: Settings › Members › Jane Doe, or Projects › Atlas › Issues.

**Elevation: a staircase.** It's `Drilldown`'s breadcrumb, now available on its own, and the two share one implementation. Every step stands on the same ground line, outlined face and wall together, and **each deeper place is a taller step** (its wall 3px longer per level). Steps you can go back to are live: they lift one level when pointed at and press to the ground. The current page is the last and tallest step, in weight 600, and it doesn't press. A route-based app has no stack of views, so there's no pile under it, and **a route change re-renders it without motion**: a new route isn't an arrival.

**Deep paths.** With `maxItems`, a longer path keeps its first step and its last `maxItems − 1`. The middle waits behind a "…" step that opens a `DropdownMenu`, which floats at level 3.

**No separators.** Each step's height already says it's deeper than the one before, so there are no slashes or chevrons. `BreadcrumbSeparator` exists for code written for shadcn/ui and renders nothing.

**Accessibility.** The [breadcrumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/): a `nav` labelled "Breadcrumb", an ordered list, and `aria-current="page"` on the last step. The "…" step is a menu button named "Show 3 more levels". Under forced colours steps keep a 1px outline and the current step a 2px one. Under `contrast="more"` each step's wall is `ink`.

**Props.**
- `items` (`{ label, href?, onClick? }[]`; the last entry is the current page).
- `maxItems`.
- `renderLink(item, props)` for a router's link: spread `props` onto it.
- `onNavigate(item)` for steps chosen from the "…" menu (default: follow `href`).
- **Composable parts:** `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage` and `BreadcrumbEllipsis` mirror shadcn/ui's for full control.

**Fitting the width.** `fit="collapse"` (the default) keeps the trail on one line: when it doesn't fit, steps from the second onward move behind "…" until it does, keeping the first step and the current page, and they come back when there's room. `fit="wrap"` lets it wrap instead. `maxItems` still caps it by count.

**You provide:** the path, from the top of the app to here.

```tsx
<Breadcrumb
  items={[{ label: 'Settings', href: '/settings' }, { label: 'Members', href: '/settings/members' }, { label: 'Jane Doe' }]}
  maxItems={4}
  renderLink={(item, props) => <NextLink href={item.href!} {...props}>{item.label}</NextLink>}
/>
```

- Do end with the current page, as plain text.
- Do use it for location in a hierarchy, not for history ("back").
- Don't add separators between steps.
- Don't use it inside a `Drilldown`, which has its own.
