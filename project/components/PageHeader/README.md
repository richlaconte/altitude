# PageHeader

The block every page opens with: breadcrumb, title, a line of description, the page's actions, and sometimes tabs.

**Elevation.** The page's name is the record, so the block lies on the ground. Only its actions are live: secondaries at level 1, ghosts at 0, and **one primary at level 2, in its own slot**. "The primary action rests at level 2" (law 1) becomes structural: `primary` takes one element, and a `variant="primary"` button put in `actions` logs a development warning naming law 1. Actions that don't need to be seen go in `overflow`, a "More actions" menu (`DropdownMenu`, level 3). With `sticky`, the header stays at the top and **rises one level when content passes under it** (`surface-raised`, `elev-1`), as `ScrollArea`'s header does.

**Layout.** The breadcrumb sits above, the title and description on the left, and the actions on the right (the primary last, nearest the reading edge). Tabs go underneath. Everything wraps on narrow screens. Set `--alt-page-pad` to the page's side padding (`AppShell` does) and the header reaches through it, so a sticky header's rise spans the page.

**Accessibility.** A `<header>` with the page's `h1` (`PageHeaderTitle`). The tab order is breadcrumb, actions, tabs. "More actions" is a [menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/). Under forced colours a risen sticky header gets a bottom border.

**Props.** `PageHeader`: `breadcrumb`, `primary`, `actions`, `overflow` (`DropdownMenu` entries), `tabs`, `sticky`. Inside it go `PageHeaderTitle` (an `h1`) and `PageHeaderDescription`.

**You provide:** the page's name, what it's for in one line, and its actions, with the one that matters most as `primary`.

```tsx
<PageHeader sticky
  breadcrumb={<Breadcrumb items={[{ label: 'Settings', href: '/settings' }, { label: 'Members' }]} />}
  primary={<Button variant="primary">Invite members</Button>}
  actions={<Button variant="secondary">Export list</Button>}
  overflow={[{ label: 'Download audit log', onSelect: download }]}>
  <PageHeaderTitle>Members</PageHeaderTitle>
  <PageHeaderDescription>People who can see and edit this workspace.</PageHeaderDescription>
</PageHeader>
```

- Do give a page at most one primary action; put the rest in `actions` or `overflow`.
- Do keep the description to one line about what the page is for.
- Don't put a PageHeader inside a `Card`; that's `CardHeader`.
- Don't make the whole header a raised card. It lies on the ground, and only rises while content passes under it.
