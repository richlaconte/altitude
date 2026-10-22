# Badge

Labels status or metadata. A badge is an **indicator plate**: part of the record, so it's set flush into the page (a shallow stamp, darker at its top edge with a light lip below) and never lifts.

- **Lamp.** Status carries an indicator lamp: a flat 7px dot in its tone's own colour (`positive`, `caution`, `critical` or `accent`, the same colour the tone uses for text), with no gloss, socket or glow. It's printed on the plate rather than set into it, so it never competes with the plate's height. It's on by default for `positive`, `caution` and `critical`; `lamp` on a neutral badge shows an unlit lamp, an empty `ink-muted` ring ("Draft"); `lamp={false}` hides it. With a lamp, the label stays in `ink` and the colour lives in the lamp. Without one, a toned plate says its tone in its lettering.
- **Relight and re-stamp.** When `tone` changes the lamp relights: it starts as an empty ring and fills in over `dur-travel-3`. When the label changes, the plate is re-stamped (it comes down 3px onto the page and settles). Neither happens on first render.
- **Pulse.** `lamp="pulse"` fades the dot to a third and back over `dur-hover`, for something in progress ("Deploying"). It holds still under reduced motion.

| `variant` | Looks like | Use |
|---|---|---|
| `plate` (default) | a neutral plate stamped into the ground | Most status and metadata. |
| `tinted` | the plate takes its tone's `-soft` colour, lettering in the tone | When status needs to be seen from across the page. (`soft` is the old name.) |
| `outline` | a `line-control` hairline only | Versions, IDs, counts of things that don't need attention. |
| `count` | a number on a floating pill (`elev-2`) | Unread or waiting items: the one badge that rises, because it wants you. It pops up when the number changes. Solid `accent` or `critical`; neutral is `surface-floating`. Position it yourself (for example absolutely, over a Button's corner). |

**Loading.** While the label is undefined (your data hasn't arrived) or a promise, the badge is a plate-shaped imprint (see `Await`).

**You provide:** a short label (one or two words, sentence case) or a number for `count`, `tone`, optionally `variant` and `lamp`.

- Do pair status colour with the word: "Outage", never a lamp alone.
- Don't make badges clickable; if it filters or navigates, it's a ghost Button.
- Don't use `count` for totals that aren't asking for attention; use a plate or plain text.
