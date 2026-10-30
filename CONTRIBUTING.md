# Contributing to Altitude

Issues are welcome from people and from agents alike, and both use the same structure. If you are an agent, read [`AGENTS.md`](AGENTS.md) too; it covers how to file.

## Issues

There are three kinds. Each has a template in [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/), which is the skeleton to fill in.

| Kind | Template | Title | Label |
|---|---|---|---|
| A component Altitude doesn't have | [New component](.github/ISSUE_TEMPLATE/new-component.md) | `New: <Name> — <what it's for>` | `enhancement`, `needs-design` |
| New behaviour or a prop for an existing component | [Feature request](.github/ISSUE_TEMPLATE/feature-request.md) | `<Component>: <what it should do>` | `enhancement`, `needs-design` |
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

- **Small enough for one pull request.** If the work needs more than one reviewable pull request (more than about five "Done when" items across unrelated files, or a description that says "and also"), make it an umbrella with sub-issues instead.
- **Link, don't just mention.** If an issue is part of a bigger one, add it as a sub-issue. If it can't start until another lands, add a "blocked by" relationship. "Depends on #12" in prose is fine to explain why, but the link is what the queries below read.

### What happens next

An issue is a proposal, not a go-ahead. New components and API changes are agreed in the issue before anyone opens a pull request for them; the `ready` label is the go-ahead (see "How work is organised" below). Small bug fixes can go straight to a pull request that links the issue.

## How work is organised

Everything you need to plan work lives in the repository: milestones, labels, sub-issues, dependencies and linked pull requests. `gh` with ordinary `repo` access sees all of it. The project board (the repository's Projects tab) is a view of the same issues, with progress kept by workflows. It is not a second source: never record something only on the board.

| Question | Where it lives | Values |
|---|---|---|
| What kind of work? | label, set by the template | `bug`, `enhancement`, `documentation`; add `accessibility` when it's a barrier |
| Can anyone start? | label | `ready`: agreed and specified, anyone may pick it up. `needs-design`: a proposal, so agree the design in the issue first. Neither: not triaged yet. |
| How soon? | label | `P1`: do next (it hides data, breaks a core path or unblocks others). `P2`: a real gap with a workaround. `P3`: polish. |
| Toward what goal? | milestone | One per body of work, usually a research pass in `docs/research/`. Its description links the research and says when the milestone is done. |
| Part of what? | sub-issues | An umbrella issue (e.g. #244, Mobile) with its children |
| After what? | "blocked by" / "blocking" relationships | GitHub's issue dependencies |
| Who's on it? | a linked pull request (`Fixes #n`), opened as a draft when work starts | |
| How far along? | the board's Status | Todo → In progress → In review → Done |

### The lifecycle

1. **Filed.** The template sets the kind; feature requests and new components also get `needs-design`. No milestone or priority yet.
2. **Triaged** (maintainer). Sets a milestone and a priority, links sub-issues and dependencies, and labels a reproduced bug `ready`.
3. **Agreed.** The design is settled in the issue's comments. The maintainer then edits the body so it states what was agreed and swaps `needs-design` for `ready`. The body is the spec; the comments are its history.
4. **Claimed.** Someone opens a draft pull request with `Fixes #n` before writing much code. That pull request is the claim.
5. **In review**, then merged, which closes the issue.

### Finding something to work on

```sh
# Ready, unclaimed and unblocked, most urgent first
gh issue list --search "is:open label:ready no:assignee -is:blocked" --label P1
gh issue list --search "is:open label:ready no:assignee -is:blocked" --milestone "Explanatory charts"

# Before starting #123, check nobody has a pull request for it
gh pr list --state open --search "123"
```

### Why it works this way

The system is built for agents doing most of the implementation, with a person agreeing designs and reviewing:

- **Scope and self-containment matter most.** In a study of 3,180 issues assigned to Copilot's coding agent, issues small enough for one change and self-contained were associated with about 16 points higher merge rates; issues good on every criterion merged 77% of the time against 46% ([What Makes a GitHub Issue Ready for Copilot?, 2025](https://arxiv.org/abs/2512.21426)). Longer bodies were associated with fewer merges. So one pull request per issue, umbrellas with sub-issues, and the body kept to the agreed spec.
- **Duplicates and abandonment sink agent pull requests.** Of 562 rejected agent pull requests, 38% were abandoned without review and 23% duplicated an existing one ([Where Do AI Coding Agents Fail?, 2026](https://arxiv.org/abs/2601.15195)). So a draft pull request is the claim, `ready` is the only go-ahead, and the queries above exclude claimed and blocked work.
- **Make the structure explicit.** GitHub's guidance is to break large issues into sub-issues, state blocking relationships explicitly, and roll work up into milestones ([Best practices for Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/best-practices-for-projects)). Their coding-agent guidance asks for clear scope, acceptance criteria and pointers to the files involved ([Best results with the coding agent](https://docs.github.com/en/copilot/tutorials/coding-agent/get-the-best-results)); the templates' "Done when" and "Today" sections are those.
- **One source per thing.** Agents read labels, milestones and links with the same `gh` they already use, so those hold the state. The board only adds views and Status.

## Pull requests

Follow "Working on it" in the [README](README.md): change the sources, then run `node build.mjs && node previews.mjs` in `build/` and commit what they produce. CI fails if `project/` doesn't match its sources.

- **One issue per pull request**, linked with `Fixes #12` so merging closes it.
- **Open it as a draft when you start.** That's how others see the issue is taken. Mark it ready for review when the "Done when" list is checked and CI passes.
- **Stay inside the issue.** If you find something else, file an issue for it rather than fixing it in this pull request.

## Framework knowledge and workflow contributions

The canonical design knowledge lives in `project/framework`: JSON owns applicability, rule/evidence metadata and references; Markdown explains choices and examples; TypeScript owns executable behavior; tests own observed engineering evidence. Generate indexes and package copies with the package build. Do not create divergent agent/human manuals.

A pattern contribution needs a user problem, alternatives, required inputs, applicable states/transitions, content/keyboard/focus/announcement/responsive/recovery requirements, stable rule IDs and sources, explicit application responsibilities, implementation and adverse-state fixtures. Record authority (`standard`, contextual pattern, heuristic, local visual policy or experimental hypothesis), applicability, exceptions, maturity, maintenance owner and review date. Human effectiveness remains unmeasured until supported by actual evidence.

Run existing CI plus `npm run check:framework`. Keep browser tests against an actual packed installation, including failed and delayed service operations and actual data outcomes. Update `build/previews.txt` and regenerate outputs. Do not promote contextual heuristics into unconditional CI failures; every diagnostic needs observed evidence, expected behavior and actionable repair. Version policy and implementation together, document migrations, and record scoped suppressions with a reason and review date.
