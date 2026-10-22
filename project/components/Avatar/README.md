# Avatar

Represents a person. A face is a disc on the page, built from the same pieces as everything around it: while the person is here it rests on the page like a card, and while they're not it's part of the record, a plate set flush into the page. Only someone live leaves the ground.

| State | Height | Face | Lamp |
|---|---|---|---|
| `active` | resting: level 1, a contact shadow | `surface-raised` | filled `positive` |
| `idle` | resting: level 1, a contact shadow | `surface-raised` | an empty ring in `caution` |
| `offline` | flush in the page (ground), photo greyscale | a badge plate, `ink-muted` initials | none |
| `live` | lifted off the page, drifting over `dur-hover`; its shadow appears on the page beneath it | `surface-raised` at level 2 | as its status |

Faces are neutral. Status colours never stand for a person, so an initial on a pink disc can't read as an error; colour lives in the lamp, as it does on a `Badge`. Active and idle differ in the lamp's shape (filled or an empty ring), not only its colour, and not in height: they're one tier, because both people are here.

`live` (speaking, typing, presenting right now) lifts the face: the shadow beneath it appears on the page and gets smaller and fainter as the face rises, the cue people read as an object floating rather than resting. Under reduced motion it holds a little above the page instead of drifting. Height is animated through a registered `--hr` property, so face and shadow move together on `ease-settle`. `presence={1|2|3}` rings the face in that person's presence colour, 2px out, the same way a collaborator's hold is drawn.

The lamp is cut out of the face by a 2px ring of ground. It shows at 24px and larger (`lamp={false}` hides it) and is never shown inside a group. With `onClick` the avatar becomes a button: hovering or focusing lifts it off the page, and pressing returns it to the ground, the same promise as everything else that lifts. Avatars without `onClick` never lift on hover.

**Teams, organisations, bots and agents** are `shape="square"`: a tile whose corners grow with its size (`radius-xs` up to 24px, `radius-sm` to 36, `radius-md` to 48, `radius-lg` above), with the same states, lamp and shadow as a person. Keep circles for people, so a glance tells you whether a person did something.

**Faces.** With `src` the photo fills the face; if it fails to load, the initials show instead. Initials are the first letter of the first and last words, skipping punctuation and emoji ("Mara de Quist" is MQ, "Jean-Luc Picard" JP, "李小龙" 李); below 28px, one letter, drawn larger. Names that no rule abbreviates well are better given a photo.

**Sizes.** 24px in dense rows and tables, 28–32px in lists and groups, 36px (the default) beside a name, 44px on cards, 64px in a profile header.

In an `AvatarGroup`, every face stands on one ground line, each cut out of the one before it by a ring of ground, overlapping by 15% so the initials beneath stay whole. Offline faces are flush plates in the row; a live face lifts in front of its neighbours. `max` caps the faces shown and the rest become a flush "+N" plate whose label names them ("2 more: Eli Ward, Kai Ito"); `size` sizes every face that doesn't set its own. The group is a `role="group"` labelled with how many people it holds ("7 people"); pass your own `aria-label` for something more specific ("Editing now").

**Loading.** While `name` is undefined (`user?.name` while your data loads), or a promise, the avatar is an imprint of its `size` and `shape`; it rises out of it when the name arrives (see `Await`).

**Forced colours and high contrast.** Faces get a `CanvasText` rim (`GrayText` when offline, 2px when live), and the active lamp is filled while the idle one stays a ring. Under `contrast="more"` a resting face sits on the same ink slab as a card.

**Right to left.** The lamp sits at the inline end and a group overlaps from the inline start, so both mirror with `dir="rtl"`.

**You provide:** `name` (always: it's the accessible label, with the status appended), optional `src`, `size` in pixels (default 36), `shape`, `status`, `live`, `presence`, `lamp`, `onClick`. On `AvatarGroup`: `max`, `size`.

- Leave about a fifth of the avatar's size free above a live or pressable avatar for it to rise into, and a quarter above a group.
