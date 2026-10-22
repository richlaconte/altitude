# Card

A raised surface that groups related content; it moves only if the whole card is one action.

A static Card sits at level 1 and never reacts to the pointer. An `interactive` Card stays put until the pointer is on it, lifts to level 2 and 2px on hover or focus and presses to ground on click; with `onClick` it becomes keyboard-reachable (`role="button"`, Enter and Space).

**Loading.** Pass your data as it is. A `CardTitle` whose text is undefined imprints one line of its own type; a `CardDescription`, or text passed straight to `CardContent`, imprints too, but only while the card's required parts (title, avatar, badge) are still waiting, so a missing field never leaves an imprint behind. A Card and its `CardContent` also hold a Suspense boundary for anything of yours that suspends inside them (`skeleton={{ lines }}`, default 3; `false` passes it to your own boundary). See `Await`.

**You provide:** content through `CardHeader` (with `CardTitle` and `CardDescription`), `CardContent` and `CardFooter` (right-aligned actions), or your own children. Padding is `space-5`.

Cards take the same depth signals as `Surface`: `settle`, `status`, `heldBy` and `relevance`.

- Do make the entire card the target when it navigates somewhere (a project tile).
- Don't make a card interactive *and* put buttons inside it: nested targets break the press metaphor. Keep the card static and let its buttons lift.
