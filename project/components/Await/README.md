# Await

Components that bring their own loading state: hand one a promise instead of a value and, until it lands, it shows its own imprint at its own size. You don't write skeletons; `Await` is the Suspense boundary inside each of them, exported so your components can do the same.

**Elevation: loading is an imprint.** Content still to come is the shape of what's coming, pressed into the page (`surface-well`, `well`), as `Skeleton` draws it. The difference is who draws it. A Suspense-native component holds its own `<Suspense>` boundary, and its fallback is drawn from the same props and tokens as the component itself: an `Avatar` of `size={44}` leaves a 44px disc; a `CardTitle` leaves one line as tall as the title's line-height; a `Badge` leaves a plate; a `DataTable` keeps its real header over rows of cell imprints. So the imprint is the size of the content, and nothing moves when it lands.

| Takes a promise | Imprint |
|---|---|
| `Avatar` `name`, `src` | a disc of its `size` |
| `CardTitle`, `CardDescription` children | one line (title) or two (description), each one line-height of that type style; `skeleton={{ lines, width }}` |
| `Badge` children | a plate (`width`, default 64px; a `count` is round) |
| `DataTable` `rows` | the real header over `skeleton.lines` rows of imprinted cells (default 5) |
| `Card`, `CardContent` | not a prop: a boundary for anything of yours inside that suspends; a title line over `lines` lines (Card), or `lines` lines (CardContent), default 3 |

**Motion.** An imprint waits `dur-grace` (300ms) before it fades in, so loads quicker than that show nothing and land without moving: Skeleton's rule, "don't show imprints for loads under about 300ms", is now kept for you. When content lands after its imprint showed, it rises 8px out of it (`dur-travel-3`, `ease-rise`) while the imprint fills in behind it. Rises share the attention budget (`riseDelay`): if many land at once, no more than four begin together. Containers (`Card`, `CardContent`, `DataTable`) leave no imprint behind; their content just rises. Under reduced motion it fades in place.

**Landing together.** A page full of boundaries fills in piece by piece as each one's data arrives. Wrap related parts in `RevealGroup` and each part that lands early stays an imprint until the slowest one in the group has landed; then they rise together (still four at a time). Group things that load from the same place; a group waits for its slowest member.

**Without height.** Every imprint carries a visually hidden "Loading" and `aria-busy`, and is otherwise hidden from assistive technology; the content that replaces it is announced as normal content. Under forced colours imprints have a dashed `CanvasText` outline, like every sunk surface.

**How it works.** `readPromised(promise)` is React 19's `use()` when it's there; on React 18 it keeps the same contract by hand (the promise is thrown to the boundary and its result remembered), so both work. Values that aren't promises take the old path exactly: no boundary, no extra element. At rest the wrapper is `display: contents`, so it adds nothing to layout.

```tsx
// A server component (or a loader) starts the requests; the components wait for them.
const user = getUser(id);
<Card>
  <CardHeader>
    <Avatar name={user.then((u) => u.name)} src={user.then((u) => u.avatar)} size={44} />
    <CardTitle>{user.then((u) => u.name)}</CardTitle>
  </CardHeader>
  <CardContent><RecentActivity userId={id} /></CardContent> {/* yours; suspends inside the card */}
</Card>
<DataTable columns={columns} rows={getInvoices()} getRowId={(r) => r.id} />

// Your own component, the same way:
<Await inline shape="circle" imprint={<Skeleton shape="circle" width={24} />}><Flag code={country} /></Await>
```

**You provide:** promises that are stable across renders: started in a server component, a loader, a cache or state, never created inline in a client component's render (`.then` in render makes a new promise every time, and the part waits forever). Hints where the default shape won't match (`skeleton={{ lines: 3 }}`). `skeleton={false}` on any of them when you'd rather suspend to your own boundary.

- Do pass promises for data that arrives independently, and let each part land when it can.
- Do wrap parts that read better arriving together (a profile header) in `RevealGroup`.
- Don't wrap Suspense-native components in your own `Skeleton`s; they already imprint themselves.
- Don't use it for errors: a rejected promise throws to your nearest error boundary, where an `Alert` belongs.
- `Skeleton` with `loaded` is still the way when your loading state is a flag (`isLoading` from a data library) rather than a promise.
