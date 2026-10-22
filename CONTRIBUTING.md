# Contributing to Altitude

Issues are welcome from people and from agents alike, and both use the same structure. If you are an agent, read [`AGENTS.md`](AGENTS.md) too; it covers how to file.

## Issues

There are three kinds. Each has a template in [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/), which is the skeleton to fill in.

| Kind | Template | Title | Label |
|---|---|---|---|
| A component Altitude doesn't have | [New component](.github/ISSUE_TEMPLATE/new-component.md) | `New: <Name> — <what it's for>` | `enhancement` |
| New behaviour or a prop for an existing component | [Feature request](.github/ISSUE_TEMPLATE/feature-request.md) | `<Component>: <what it should do>` | `enhancement` |
| Something that renders, moves, announces or builds wrong | [Bug report](.github/ISSUE_TEMPLATE/bug-report.md) | `<Component>: <what goes wrong>` | `bug` |

Titles are sentence case and name the component first, so the list reads as an index: `Select: support grouped options`, `Tooltip: warm-up doesn't carry to HoverCard`. Use the component's exported name (`DropdownMenu`, not "dropdown"). For a problem that isn't one component's, use the area instead: `Tokens:`, `Motion:`, `Storybook:`, `Package:`, `CI:`.

### What makes a good one

- **One thing per issue.** One component, one change, one bug. If you find three bugs, file three issues. A family that must change together (Select and Combobox) can share one; say why.
- **Search first.** If an open issue already covers it, add to that one instead.
- **Speak Altitude.** A request for a component or a visual change is mostly a question about height: is each part settled, live or an opening, which tier is it in, and what says the same thing without height? Answer it in the elevation table the template gives you, in the terms of [Elevation](project/Elevation.md). An issue that only says "add a Calendar" leaves the design to whoever picks it up.
- **Point at the rule.** For a bug, "Expected" should cite the line in the design guide or the component's README that the behaviour breaks. If no rule covers it, say so: that may be a gap in the docs, which is worth an issue of its own.
- **Reproduce it small.** The smallest render that shows the bug, using only the public API. A `build/previews.txt` section or a `shoot.mjs` command with `ACT` is even better, because anyone can run it and see the same screenshot (see [`build/SETUP.md`](build/SETUP.md)).
- **Say the scheme and the mode.** Many bugs show only in Nightfall, or only under reduced motion, forced colours or `contrast="more"`. Say which you checked, not only where it broke.
- **Keep observation and diagnosis apart.** "What goes wrong" and "Actual" are what you saw. A suspected cause goes in its own section, with a file and line, and how sure you are.
- **Additive by default.** Feature requests don't change existing props, defaults or behaviour. If yours has to, say what breaks and why it's worth a major version.
- **If a rule blocks a good design, say so.** Name the rule in "Rules it strains" rather than proposing something that quietly breaks it.

### What happens next

An issue is a proposal, not a go-ahead. New components and API changes are agreed in the issue before anyone opens a pull request for them. Small bug fixes can go straight to a pull request that links the issue.

## Pull requests

Follow "Working on it" in the [README](README.md): change the sources, then run `node build.mjs && node previews.mjs` in `build/` and commit what they produce. CI fails if `project/` doesn't match its sources. Link the issue the pull request resolves (`Fixes #12`).
