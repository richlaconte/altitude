# Drilldown

Navigates a hierarchy as a **stack**. Each place you go into is laid on top of the one before it; going back lifts sheets off the top.

- Do use `Breadcrumb` for the same staircase in an app with routes; the two share one implementation.
- **The breadcrumb is a staircase.** Every crumb is a step standing on the same ground line, so all their contact shadows line up; a deeper place is a *taller* step (its wall is 3px longer), not one floating higher. Face and wall share one hairline (`--alt-ring`), so the top edge of a white step always reads against a light page, and every step casts its contact shadow at the same ground line. The root is the lowest step and where you are now is the tallest. Every step except the current one is a button: it rises 1px when pointed at and presses down to the ground when clicked, and choosing it climbs back to that place. When you go deeper, the new step rises up out of the ground.
- **The view sits on a pile.** One sheet shows beneath it for each level you've descended (up to three), the same language as `Pile`: depth you can see at rest.
- **Transitions follow the stack.** Going deeper, the child is laid on top while the parent is pressed beneath it; going back, the top sheet lifts off and the parent comes up from under it. Focus moves to each new view.

**You provide:** `root`, a tree of `{ id, title, description?, children?, content? }`. A node with children lists them; a leaf shows its `content`.

- Use it for nested places people move through (workspace → project → environment → build).
- Don't use it for steps in a process; a stack implies you can always lift back out.

**Charts that drill.** A node with both `content` and `children` shows its content, and the content opens the children itself: a chart's `drill={(d) => childId}`, or `useDrilldown().open(id)` from your own component. After a step, focus moves to the new view's own first stop when it names one (`data-drill-focus`, as a chart's summary does), otherwise to the view.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Drilldown` as first used in its preview:

```tsx
import { Drilldown } from 'altitude-design';

<Drilldown root={tree} />
```

The full preview, as rendered in Storybook and checked in CI (`wrap` is the preview page's own layout class, not Altitude's):

```tsx
import { Drilldown } from 'altitude-design';

const tree = { id: 'ws', title: 'Workspace', children: [
  { id: 'nw', title: 'Orchard', description: 'Marketing site', children: [
    { id: 'prod', title: 'Production', description: 'orchard.example', children: [
      { id: 'b42', title: 'Build #42', description: 'main@8dc01b2 · 2h ago', content: 'Deployed by Mara. 14 routes, 2.1 MB, healthy.' },
      { id: 'b41', title: 'Build #41', description: 'main@51ac9e0 · yesterday', content: 'Rolled back after a cold-start regression.' } ] },
    { id: 'prev', title: 'Preview', description: '3 branches', content: 'Preview deployments for open pull requests.' } ] },
  { id: 'bc', title: 'Beacon', description: 'Internal dashboard', content: 'No deployments yet.' },
  { id: 'st', title: 'Settings', description: 'Members, billing, domains', content: 'Workspace settings.' } ] };
export default function App() { return <div className="wrap"><Drilldown root={tree} /></div>; }
```
<!-- /example -->
