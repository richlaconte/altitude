# Resizable

Panes side by side, with a divider you drag: an inbox, a ticket queue, a file browser, a record beside its list, an agent's chat beside its artifact.

**Elevation.** The panes are settled, on the ground. **They never lift**: a detail pane opening beside its list stays on the ground, unlike a `Sheet`, which lays a task over the page. The divider is 1px of `line`. Only the grip is live:
- At rest it's a small `line-control` plate, flush.
- Pointed at or focused, it lifts one level.
- **While held, it floats at level 3** ("whatever is in a hand floats").

Collapsing a pane changes its size on `ease-glide`, not its level.

**Sizes** are percentages of the group. Panels without a `defaultSize` share what's left. Dragging and the keys keep each pane between its `minSize` (default 10) and `maxSize` (default 90). `autoSaveId` remembers the layout in this browser, and `onLayout` reports it.

**Accessibility.** The [window splitter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/). Each handle is `role="separator"`, focusable, with `aria-valuenow`, `aria-valuemin` and `aria-valuemax` (the pane before it, in percent) and `aria-controls` naming that pane. It's named "Resize conversations" from the pane's label. Left and Right (or Up and Down when vertical) resize by 5% (10% with Shift), and Home and End go to the limits. **Enter collapses a `collapsible` pane and restores it.** A collapsed pane is inert and hidden from assistive technology, and its handle says "Conversations collapsed". Each pane is a named `region`. Under forced colours the divider is `CanvasText` and the grip has a 1px border (2px while held). Under `contrast="more"` the divider is `line-control` and a held grip gets a hard slab. Under reduced motion collapsing doesn't animate.

**Parts:**
- `ResizablePanelGroup`: `direction` (`'horizontal' | 'vertical'`), `autoSaveId`, `onLayout`.
- `ResizablePanel`: `defaultSize`, `minSize`, `maxSize`, `collapsible`, `aria-label`.
- `ResizableHandle`: `withGrip` (default true), `label`.

**Narrow.** Under 480px of its own width, `narrow="stack"` (the default) shows one pane at a time: `narrowPanel` picks it (default the first), and `onNarrowChange` tells you when to show a way back, the list-and-detail pattern on phones. `narrow="vertical"` stacks the panes with a horizontal grip instead, and `narrow={false}` keeps them side by side.

**You provide:** the panes and their names, and sensible limits.

```tsx
<ResizablePanelGroup direction="horizontal" autoSaveId="inbox">
  <ResizablePanel defaultSize={35} minSize={20} collapsible aria-label="Conversations">{list}</ResizablePanel>
  <ResizableHandle />
  <ResizablePanel aria-label="Conversation">{detail}</ResizablePanel>
</ResizablePanelGroup>
```

- Do name every pane, so its handle has a name.
- Do set a `minSize` that keeps a pane usable.
- Don't use it for a task that sits on top of the page; that's a `Sheet`.
- Don't raise a pane into a card.
