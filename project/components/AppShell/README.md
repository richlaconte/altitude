# AppShell and Sidebar

The frame of an app: a sidebar of destinations (grouped, collapsible), a top bar with search and the user's menu, and the page.

**Elevation: the frame lies on the ground.** Where you are is part of the record, so the sidebar, top bar and page are all `surface-ground`, divided by `line`. Don't float the sidebar as a raised card. Only the things in it that act are live:
- **A destination** lifts one level when pointed at, because it navigates.
- **The current one** sits on a raised pill (segmented `Tabs`' build) that glides from destination to destination as you move.
- **Only a count floats** (`Badge variant="count"`). A status ("Beta") would be a flush plate.
- **Collapsing to a rail** changes width on `ease-glide`, not level. In the rail, each destination is an icon with its name in a tooltip to the right.
- **The top bar** rises one level while content passes under it, as `ScrollArea`'s header does.
- **On narrow screens** (below `mobileBreakpoint`, default 768px) the sidebar moves into a `Sheet` drawer from the left (level 4), titled "Navigation". Choosing a destination closes it.

**Parts** (shadcn/ui's names):
- `AppShell`: `sidebar`, `topBar` and the page. It includes a `SidebarProvider`, a skip link, and a `SidebarTrigger` at the start of the top bar.
- `SidebarProvider`: `collapsed`, `defaultCollapsed`, `onCollapsedChange`, `mobileBreakpoint`. ⌘B or Ctrl+B toggles. `useSidebar()` reads and changes the state.
- `Sidebar`: a `nav` (`aria-label`, default "Main") with `collapsible` (`'icon' | 'none'`). Inside it go `SidebarHeader`, `SidebarContent` (scrolls, and holds the pill), `SidebarFooter`.
- `SidebarGroup`: `label`; `collapsible` makes the label a disclosure button. Also `SidebarGroupLabel`.
- `SidebarMenu` › `SidebarMenuItem` › `SidebarMenuButton` (`href`, `current`, `icon`, `asChild` for a router's link) and `SidebarMenuBadge` (`label`, such as "4 unread").
- `SidebarTrigger`, and `SidebarInset` (the `main` landmark; it sets `--alt-page-pad` for `PageHeader`).

**Open questions, answered.** Persisting the collapsed state is up to your app (use `collapsed` and `onCollapsedChange` with a cookie or `localStorage`). The workspace switcher is a recipe, a `DropdownMenu` whose trigger is an `Avatar` and a name, not a part (see the preview).

**Accessibility.** [Landmarks](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/): `nav` with a label, `header`, `main`. A skip link ("Skip to content") comes first. The current destination has `aria-current="page"`. **A count is part of the destination's name** ("Inbox, 4 unread"). In the rail, each destination keeps its name as `aria-label` and in a tooltip. Collapsible groups use the disclosure pattern. `SidebarTrigger` says what it will do ("Collapse sidebar", "Open navigation") and carries `aria-keyshortcuts`. Under forced colours the pill gets a 1px border. Under `contrast="more"` it gets a 2px slab and the dividers are `line-control`. Under reduced motion the pill appears in place and the rail changes width at once.

```tsx
<AppShell
  sidebar={
    <Sidebar>
      <SidebarHeader><WorkspaceMenu /></SidebarHeader>
      <SidebarContent>
        <SidebarGroup label="Workspace">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton href="/inbox" current icon={<Inbox />}>Inbox</SidebarMenuButton>
              <SidebarMenuBadge label="4 unread">4</SidebarMenuBadge>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter><UserMenu /></SidebarFooter>
    </Sidebar>
  }
  topBar={<SearchEntry />}>
  {page}
</AppShell>
```

- Do give every destination an icon if the sidebar can collapse to a rail.
- Do say what a count counts (`label="4 unread"`).
- Don't raise the sidebar into a card or give it a shadow.
- Don't put actions in the sidebar's destinations; they navigate.
