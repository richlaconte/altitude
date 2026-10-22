# Await

Components that bring their own loading state. Pass your data the way you already do: while it's `undefined` (`user?.name` while a query loads), the component shows its own imprint at its own size, and when the data arrives the content rises out of it. You don't write skeletons or loading flags. `Await` is the Suspense boundary inside each of them, exported so your components can do the same.

```tsx
const { data: user } = useQuery(userQuery(id));   // useSWR, a loader, your own state: anything that's undefined until it isn't

<Card>
  <CardHeader>
    <Avatar name={user?.name} size={44} />
    <CardTitle>{user?.name}</CardTitle>
    <CardDescription>{user?.role}</CardDescription>
  </CardHeader>
  <CardContent>{user?.bio}</CardContent>
</Card>
<DataTable columns={columns} rows={deploys} getRowId={(d) => d.id} />
```

**Elevation: loading is an imprint.** Content still to come is the shape of what's coming, pressed into the page (`surface-well`, `well`), as `Skeleton` draws it. The difference is who draws it. A component holds its own `<Suspense>` boundary, and its fallback is drawn from the same props and tokens as the component itself: an `Avatar` of `size={44}` leaves a 44px disc; a `CardTitle` leaves one line as tall as the title's line-height; a `Badge` leaves a plate; a `DataTable` keeps its real header over rows of cell imprints. So the imprint is the size of the content, and nothing moves when it lands.

**What counts as "not here yet".** `undefined` is on its way; `null` is nothing, and renders empty at once. Required content waits whenever it's undefined. Optional content (a card's description, text passed straight into `CardContent`) waits only while its card's required parts do, so a field that's simply missing from your data never leaves an imprint behind.

| Content | Waits while | Imprint |
|---|---|---|
| `Avatar` `name` | undefined | a disc of its `size` |
| `CardTitle` children | undefined | one line of the title's type; `skeleton={{ width }}` |
| `Badge` children | undefined | a plate (`width`, default 64px; a `count` is round) |
| `DataTable` `rows` | undefined | the real header over `skeleton.lines` rows of imprinted cells (default 5) |
| `CardDescription` children | undefined and the card's required parts are waiting | two lines of the description's type; `skeleton={{ lines, width }}` |
| `CardContent` children | undefined and the card's required parts are waiting, or anything of yours inside suspends | `lines` lines (default 3) |
| `Card` | anything of yours inside suspends | a title line over `lines` lines (default 3) |

Every one of them also takes a promise in place of the value (from a server component, say) and waits for it the same way.

**If a request fails** your data stays undefined, so the imprint stays. Render your error state in place of the content, as you would anyway, or pass `null`. `skeleton={false}` on any component renders exactly what you pass, with no imprint.

**Motion.** An imprint waits `dur-grace` (300ms) before it fades in, so loads quicker than that show nothing and land without moving: Skeleton's rule, "don't show imprints for loads under about 300ms", is now kept for you. When content lands after its imprint showed, it rises 8px out of it (`dur-travel-3`, `ease-rise`) while the imprint fills in behind it. Rises share the attention budget (`riseDelay`): if many land at once, no more than four begin together. Containers (`Card`, `CardContent`, `DataTable`) leave no imprint behind; their content just rises. Under reduced motion it fades in place.

**Landing together.** A page full of boundaries fills in piece by piece as each one's data arrives. Wrap related parts in `RevealGroup` and each part that lands early stays an imprint until the slowest one in the group has landed; then they rise together (still four at a time). Group things that load from the same place; a group waits for its slowest member.

**Without height.** Every imprint carries a visually hidden "Loading" and `aria-busy`, and is otherwise hidden from assistive technology; the content that replaces it is announced as normal content. Under forced colours imprints have a dashed `CanvasText` outline, like every sunk surface.

**How it works.** An undefined value becomes a suspension: the component's outer part (which stays mounted and re-renders when your data arrives) holds a promise that resolves once the value turns up (`useArrival`), and its inner part reads it, so the component's own boundary shows the imprint, and the reveal is the same one a real promise gets. Reading is React 19's `use()` when it's there; on React 18 the same contract is kept by hand (the promise is thrown to the boundary and its result remembered), so both work. A component that has never waited takes the old path exactly: no boundary, no extra element. Once it has, the wrapper stays, as `display: contents`, so it adds nothing to layout.

**Limits.** Your own markup can't tell: `<p>{user?.bio}</p>` inside a card renders an empty paragraph while it loads; pass the text straight to `CardContent` or `CardDescription` instead. An optional part whose data comes from a different, slower request than its card's required parts is treated as missing once they land, and appears when its data does, without an imprint.

```tsx
// Promises work too: from a server component, start the request and pass it along.
const user = getUser(id);
<Avatar name={user.then((u) => u.name)} size={44} />

// Your own component, the same way:
<Await inline shape="circle" imprint={<Skeleton shape="circle" width={24} />}><Flag code={country} /></Await>
```

**You provide:** your data as it is, `undefined` until it arrives. Hints where the default shape won't match (`skeleton={{ lines: 3 }}`). If you pass promises, make them stable across renders: started in a server component, a loader, a cache or state, never created inline in a client component's render. `skeleton={false}` on any of them to opt out.

- Do pass `user?.name` and friends straight in, and let each part land when its data does.
- Do wrap parts that read better arriving together (a profile header) in `RevealGroup`.
- Don't wrap Suspense-native components in your own `Skeleton`s; they already imprint themselves.
- Don't use it for errors: a rejected promise throws to your nearest error boundary, where an `Alert` belongs.
- Don't use `null` for "still loading"; it means there's nothing, and renders empty.
- `Skeleton` with `loaded` is still the way for layouts of your own.
