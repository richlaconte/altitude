# Tabs

Switches between views of the same content.

**`variant="folder"` (default): the sheet on top is the one you're reading.** Every tab is the top edge of its own sheet. The chosen tab and its panel are one raised piece (`surface-raised`, `elev-2`) with concave fillets where they meet; the other tabs lie flush on the ground behind it. Choosing a tab brings its sheet up from behind: its tab rises 10px into place on `ease-settle` while the old tab drops back, and the panel's shadow swells from `elev-1` as the new sheet surfaces, its content emerging 3px below. Hovering an unchosen tab peeks its sheet up a little: a ghost of the tab, before you commit.

**`variant="segmented"`:** a compact control for ranges and modes. The options sit in a well and one raised pill glides between them on `ease-settle`; hovering an option shows a faint ghost of the pill.

Arrow keys, Home and End move between tabs in both.

**Narrow.** A tab list that doesn't fit scrolls within itself, so the page never scrolls sideways: the chosen tab stays in view, and an edge with more tabs past it fades out.

**You provide:** `Tabs` with `value`/`onValueChange` or `defaultValue` and optionally `variant`; a `TabsList` (with an `aria-label`) of `TabsTrigger value="…"`; one `TabsContent value="…"` per trigger. In the folder variant put the `TabsContent`s directly after the `TabsList`: together they're one folder.

- Keep labels to one or two words.
- Don't use tabs for sequential steps; they imply the views are peers.

`TabsContent` takes `forceMount` to keep an unchosen panel mounted (inert, hidden from assistive technology, `data-state="inactive"`), for views that hold state or cross-fade, as a chart's Chart | Table views do.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Tabs` as first used in its preview:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'altitude-design';

<Tabs defaultValue="overview">
  <TabsList aria-label="Project">
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="activity">Activity</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
    <TabsTrigger value="members">Members</TabsTrigger>
  </TabsList>
  <TabsContent value="overview"><p className="body">Three deployments this week. Everything is healthy.</p></TabsContent>
  <TabsContent value="activity"><p className="body">Mara merged “Faster cold starts” 2 hours ago.</p></TabsContent>
  <TabsContent value="settings"><p className="body">Region, domains and environment variables.</p></TabsContent>
  <TabsContent value="members"><p className="body">Six people have access to this project.</p></TabsContent>
</Tabs>
```

The full preview, as rendered in Storybook and checked in CI (`stack`, `body` are the preview page's own layout classes, not Altitude's):

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'altitude-design';

export default function App() {
  return (
    <div className="stack">
      <Tabs defaultValue="overview">
        <TabsList aria-label="Project">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><p className="body">Three deployments this week. Everything is healthy.</p></TabsContent>
        <TabsContent value="activity"><p className="body">Mara merged “Faster cold starts” 2 hours ago.</p></TabsContent>
        <TabsContent value="settings"><p className="body">Region, domains and environment variables.</p></TabsContent>
        <TabsContent value="members"><p className="body">Six people have access to this project.</p></TabsContent>
      </Tabs>
      <Tabs defaultValue="week" variant="segmented">
        <TabsList aria-label="Range">
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
```
<!-- /example -->
