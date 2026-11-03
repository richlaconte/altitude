# EmptyState

What a list, board, search or page shows when it has nothing to show: a statement of what's empty, why, and one obvious next step.

**Why it's sunk.** An empty region isn't a problem (that's `Alert`) and it isn't a settled container (that's `Card`): it's a space waiting to receive, where the record hasn't landed yet. So it's an opening, a well cut into the page (`surface-well`, `well`) with a dashed `line-control` rim, the same below-ground signal as an empty field or an armed `DropZone`: sunken things want content. Its actions are ordinary raised buttons standing in it, the primary one at level 2. Pointing at or tabbing to the primary action deepens the well to a trench and darkens its rim to `ink-muted`, showing where the record it creates will land. When it appears it sinks in from flush (`dur-travel-1`, `ease-sink`), the inverse of new content arriving lifted; it never pulses or loops, because an empty state must never beg.

**Without height.** The rim is dashed while the region is empty, and the title says so in words; the icon is in `currentColor`. Under forced colours the rim is a dashed `CanvasText` border, like every sunk surface; with `contrast="more"` it turns solid.

**Accessibility.** It's a `section` named by its title (`aria-labelledby`, an `h3` by default; set `headingLevel` to fit the page's outline) and described by its description. Actions are real buttons or links in the normal tab order: nothing is focused for you and nothing traps focus. When an empty follows something the person did (a filter or a search that matched nothing), pass `announce` and it's said politely once it appears: `true` says the title, a string says that.

**You provide:** `title` (what's empty, as a statement), usually a `description` (why, or what will appear here), an `icon` (a Lucide line icon), and `action` (one primary `Button` whose label starts with a verb). Optionally `secondary` (a ghost `Button` or a link), `children` (extra content above the actions), `size="sm"` for a widget or a list, and `announce`.

- Do name what's empty and what to do: "No gift ideas yet" and **Add idea**, not "Nothing here" and **OK**.
- Do say which kind of empty it is in words: nothing yet, nothing matches, or you can't see it. Colour and height don't tell them apart.
- Do give it one primary action at most; a second one is `secondary`, quieter.
- Don't use it for an error that stopped content loading: that's a problem to fix, an `Alert`.
- Don't raise it into a card, or make it the only thing on a page that's still loading: show a `Skeleton` until you know it's empty.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`EmptyState` as first used in its preview:

```tsx
import { Button, EmptyState } from 'altitude-design';

<EmptyState icon={<Gift />} title="No gift ideas yet" headingLevel={2}
  description="Ideas you save stay private to you until you share them."
  action={<Button variant="primary">Add idea</Button>}
  secondary={<Button variant="ghost">Import a list</Button>} />
```

The full preview, as rendered in Storybook and checked in CI (`two`, `lab`, `side`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, EmptyState } from 'altitude-design';

const Gift = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" /></svg>;
const Search = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>;
const Bell = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>;
export default function App() {
  const [q, setQ] = React.useState('lamp');
  return (
    <div className="two">
      <div><div className="lab">md · a page with nothing yet</div>
        <EmptyState icon={<Gift />} title="No gift ideas yet" headingLevel={2}
          description="Ideas you save stay private to you until you share them."
          action={<Button variant="primary">Add idea</Button>}
          secondary={<Button variant="ghost">Import a list</Button>} />
      </div>
      <div className="side">
        <div><div className="lab">sm · a widget</div>
          <EmptyState size="sm" icon={<Bell />} title="You're all caught up" description="New mentions and replies appear here." />
        </div>
        <div><div className="lab">sm · after a search</div>
          {q ? <EmptyState size="sm" icon={<Search />} title={`No ideas match \u201C${q}\u201D`} announce="No matching ideas"
            description="Try another word, or clear the search." action={<Button size="sm" onClick={() => setQ('')}>Clear search</Button>} />
            : <p className="cap">Search cleared.</p>}
        </div>
      </div>
    </div>
  );
}
```
<!-- /example -->
