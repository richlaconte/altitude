# Stepper

Shows where you are in a process of a few steps: done steps settle into the record, the current one stands raised, and steps to come are imprints.

**Elevation.** A stepper is a staircase of plates standing on one ground line, in the same vocabulary as Drilldown's breadcrumb, and each step's height says which of the three things it is.

- **Done: settled into the record.** A plate flush with the ground, its edges stamped like a Badge, wearing the Checkbox family's check: a raised white mark on the accent. Done steps are part of the record now, so they don't stand up.
- **Current: live.** A raised slab with a wall (`wall-2`, as tall as the primary action), `surface-raised`, its number ringed in `accent-ink`. It has no sheen: sheen means "press me", and the current step does nothing when pressed; its wall is staircase height, as on the breadcrumb's current step.
- **To come: not built yet.** Imprints pressed into the page (`surface-well`, a dark inner top edge), like Skeleton's.

Connectors between steps are `accent` behind you and `line-control` ahead.

**Advancing** is the record being written. The current step presses down into the ground (`ease-sink`) and its check is stamped in (as a Badge is re-stamped: down 3px, settling, while the tick draws); about 150ms later the next step rises out of its imprint (`dur-travel-3`, `ease-rise`), within the attention budget. Going back runs the other way: the current step sinks back into an imprint and the step you chose rises from the record. Every state uses the same six-layer shadow list, so each animates into the others. Reduced motion keeps the changes of level and drops the travel.

**Keyboard and screen readers.** An `<ol>` (named "Progress" unless you pass `aria-label`) with `aria-current="step"` on the current step. Every step also says its state in words ("Step 2 of 5, completed"), and a polite live region announces the new step when it changes. With `onStepChange`, completed steps become buttons (`role="button"`, Enter or Space) that go back to that step; hovering one shows a ghost of the slab it would become. Steps ahead can't be jumped to. In forced colours the current step has a solid border and steps to come a dashed one.

| Prop | Default | |
|---|---|---|
| `steps` | | `{ title, description?, id? }[]` |
| `current` | | index of the step being worked on; `steps.length` means all done |
| `onStepChange` | | makes completed steps buttons that go back |
| `orientation` | `horizontal` | `vertical` stacks the plates, with descriptions under the titles |

**You provide:** `steps` with short titles (one or two words, sentence case), `current`, and the Back and Continue buttons that change it; `onStepChange` if people may revisit completed steps.

- Do keep it to three to six steps; more than that is a list, not a staircase.
- Don't use it for places people move between freely; that's Tabs, or Drilldown for a hierarchy.
