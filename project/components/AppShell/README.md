# AppShell and Sidebar

The frame of an app: a sidebar of destinations (grouped, collapsible), a top bar with search and the user's menu, and the page.

**Elevation: the frame lies on the ground.** Where you are is part of the record, so the sidebar, top bar and page are all `surface-ground`, divided by `line`. Don't float the sidebar as a raised card. Only the things in it that act are live:
- **A destination** lifts one level when pointed at, because it navigates.
- **The current one** sits on a raised pill (segmented `Tabs`' build) that glides from destination to destination as you move.
- **Only a count floats** (`Badge variant="count"`). A status ("Beta") would be a flush plate.
- **Collapsing to a rail** changes width on `ease-glide`, not level. In the rail, each destination is an icon with its name in a tooltip to the right.
- **The top bar** rises one level while content passes under it, as `ScrollArea`'s header does.
- **On narrow screens** (below `mobileBreakpoint`, default 640px, the compact breakpoint) the sidebar moves into a `Sheet` drawer from the left (level 4), titled "Navigation". Choosing a destination closes it.

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

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`AppShell` as first used in its preview:

```tsx
import { AppShell, Avatar, Button, DropdownMenu, Kbd, PageHeader, PageHeaderDescription, PageHeaderTitle, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from 'altitude-design';

<AppShell
  sidebar={
    <Sidebar>
      <SidebarHeader>
        <DropdownMenu items={[{ label: 'Acme Inc.' }, { label: 'Northwind' }, { type: 'separator' }, { label: 'Create workspace' }]}
          trigger={<button className="as-ws"><Avatar name="Acme Inc." size={24} /><span className="alt-sidebar-text">Acme Inc.</span></button>} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup label="Workspace"><SidebarMenu>{item('inbox', 'Inbox', 4)}{item('projects', 'Projects')}{item('reports', 'Reports')}</SidebarMenu></SidebarGroup>
        <SidebarGroup label="Admin" collapsible><SidebarMenu>{item('members', 'Members')}{item('billing', 'Billing')}{item('settings', 'Settings')}</SidebarMenu></SidebarGroup>
      </SidebarContent>
      <SidebarFooter><SidebarMenu><SidebarMenuItem><SidebarMenuButton href="#/me" icon={<Avatar name="Maya Chen" size={20} />}>Maya Chen</SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarFooter>
    </Sidebar>
  }
  topBar={<Button variant="secondary" size="sm" className="search">Search… <Kbd>⌘K</Kbd></Button>}>
  <PageHeader primary={<Button variant="primary">New message</Button>}><PageHeaderTitle>{at[0].toUpperCase() + at.slice(1)}</PageHeaderTitle><PageHeaderDescription>The sidebar's current destination sits on a raised pill that glides as you move. ⌘B collapses it to a rail.</PageHeaderDescription></PageHeader>
  <div className="rows">{Array.from({ length: 8 }, (_, i) => <div key={i} />)}</div>
</AppShell>
```

The full preview, as rendered in Storybook and checked in CI (`as`, `as-ws`, `search`, `rows` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { AppShell, Avatar, Button, DropdownMenu, Kbd, PageHeader, PageHeaderDescription, PageHeaderTitle, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem } from 'altitude-design';

const I = ({ d }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const icons = { inbox: 'M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6z', projects: 'M3 7h7l2 2h9v10H3z', reports: 'M5 20V10M12 20V4M19 20v-7', members: 'M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6', billing: 'M3 7h18v10H3zM3 11h18', settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 12l2-1-2-4-2 1-2-1-1-2h-4l-1 2-2 1-2-1-2 4 2 1v0l-2 1 2 4 2-1 2 1 1 2h4l1-2 2-1 2 1 2-4z' };
export default function App() {
  const [at, setAt] = React.useState('inbox');
  const item = (key, label, badge) => (
    <SidebarMenuItem key={key}>
      <SidebarMenuButton href={'#/' + key} current={at === key} icon={<I d={icons[key]} />} onClick={(e) => { e.preventDefault(); setAt(key); }}>{label}</SidebarMenuButton>
      {badge && <SidebarMenuBadge label={`${badge} unread`}>{badge}</SidebarMenuBadge>}
    </SidebarMenuItem>
  );
  return (
    <div className="as">
      <AppShell
        sidebar={
          <Sidebar>
            <SidebarHeader>
              <DropdownMenu items={[{ label: 'Acme Inc.' }, { label: 'Northwind' }, { type: 'separator' }, { label: 'Create workspace' }]}
                trigger={<button className="as-ws"><Avatar name="Acme Inc." size={24} /><span className="alt-sidebar-text">Acme Inc.</span></button>} />
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup label="Workspace"><SidebarMenu>{item('inbox', 'Inbox', 4)}{item('projects', 'Projects')}{item('reports', 'Reports')}</SidebarMenu></SidebarGroup>
              <SidebarGroup label="Admin" collapsible><SidebarMenu>{item('members', 'Members')}{item('billing', 'Billing')}{item('settings', 'Settings')}</SidebarMenu></SidebarGroup>
            </SidebarContent>
            <SidebarFooter><SidebarMenu><SidebarMenuItem><SidebarMenuButton href="#/me" icon={<Avatar name="Maya Chen" size={20} />}>Maya Chen</SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarFooter>
          </Sidebar>
        }
        topBar={<Button variant="secondary" size="sm" className="search">Search… <Kbd>⌘K</Kbd></Button>}>
        <PageHeader primary={<Button variant="primary">New message</Button>}><PageHeaderTitle>{at[0].toUpperCase() + at.slice(1)}</PageHeaderTitle><PageHeaderDescription>The sidebar's current destination sits on a raised pill that glides as you move. ⌘B collapses it to a rail.</PageHeaderDescription></PageHeader>
        <div className="rows">{Array.from({ length: 8 }, (_, i) => <div key={i} />)}</div>
      </AppShell>
    </div>
  );
}
```
<!-- /example -->
