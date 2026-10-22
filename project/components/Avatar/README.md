# Avatar

Represents a person and shows their presence as **height above the page**, drawn the way your eye judges height above a floor: by the gap between a thing and its shadow. Every face is a disc with its own cast shadow on the ground beneath it.

| `status` | Height | Shadow | Lamp |
|---|---|---|---|
| `active` | hovering, 15% of its size | smaller and fainter, with a clear gap | green |
| `idle` | resting on the page | a tight contact shadow right under it | amber |
| `offline` | lying flat in the page, greyscale | none | none |

`live` (speaking, typing, presenting right now) makes the face drift gently up and down over `dur-hover`, its shadow breathing with it; under reduced motion it holds a little higher instead. Height is animated through a registered `--hr` property, so face and shadow move together on `ease-settle`. `presence={1|2|3}` rings the face in that person's presence colour, the same colour they wear on anything they're holding.

The lamp is a flat dot in `positive` (active) or `caution` (idle), the same colours as status text everywhere else, cut out of the face by a 2px ring of ground. It shows at 24px and larger (`lamp={false}` hides it) and is never shown inside a group: there, height alone says who's here. With `onClick` the avatar becomes a button, and hovering or focusing lifts it higher, the same promise as everything else that lifts.

In an `AvatarGroup`, faces are cut out of each other with a ring of ground and higher faces sit in front; you can read who's here from the heights alone. The face under the pointer lifts out of the stack. The overflow is a flat "+N" disc.

**Loading.** While `name` is undefined (`user?.name` while your data loads), or a promise, the avatar is a round imprint of its `size`; it rises out of it when the name arrives (see `Await`).

**You provide:** `name` (always: it's the accessible label, with the status appended), optional `src`, `size` in pixels (default 36), `status`, `live`, `presence`, `lamp`, `onClick`.

- Leave about a fifth of the avatar's size free below it for the shadow, and a third above a group for faces that rise.
