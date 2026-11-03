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

**Narrow.** `orientation="auto"` (recommended) lays the steps out in a row when they all fit on one line, and down the page when they don't, so a phone never shows connectors leading to the next line.

**You provide:** `steps` with short titles (one or two words, sentence case), `current`, and the Back and Continue buttons that change it; `onStepChange` if people may revisit completed steps.

- Do keep it to three to six steps; more than that is a list, not a staircase.
- Don't use it for places people move between freely; that's Tabs, or Drilldown for a hierarchy.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Stepper` as first used in its preview:

```tsx
import { Stepper } from 'altitude-design';

<Stepper
  steps={steps}
  current={at}
  onStepChange={setAt}
  orientation="auto"
  aria-label="Workspace setup"
/>
```

The full preview, as rendered in Storybook and checked in CI (`wrap`, `row`, `cap`, `pair` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, Stepper } from 'altitude-design';

const steps = [{ title: "Account" }, { title: "Workspace" }, { title: "Invite team" }, { title: "Billing" }, { title: "Launch" }];
const setup = [
  { title: "Connect repository", description: "github.com/acme/northwind" },
  { title: "Configure build", description: "Framework, output directory, env" },
  { title: "Deploy", description: "First production deployment" }
];
export default function App() {
  const [at, setAt] = React.useState(2);
  return <div className="wrap">
  <Stepper
    steps={steps}
    current={at}
    onStepChange={setAt}
    orientation="auto"
    aria-label="Workspace setup"
  />
  <div className="row">
    <Button variant="ghost" disabled={at === 0} onClick={() => setAt(at - 1)}>
      Back
    </Button>
    <Button variant="primary" disabled={at === steps.length} onClick={() => setAt(at + 1)}>
      {at >= steps.length - 1 ? "Finish" : "Continue"}
    </Button>
    <span className="cap">
      Continue presses the current step into the record and raises the next one; click a completed step to go back.
    </span>
  </div>
  <div className="pair">
    <Stepper steps={setup} current={1} orientation="vertical" aria-label="Deployment setup" />
    <p className="cap">
      Vertical: the same plates, stacked. Completed steps are flush and checked, the current one stands on its wall, and steps to come are imprints.
    </p>
  </div>
</div>;
}
```
<!-- /example -->
