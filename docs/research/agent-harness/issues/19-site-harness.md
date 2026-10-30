<!--
title: Site: an agent harness page that replays a scripted run through every state
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

Site (`site/`, `scripts/build-site.mjs`), with a Storybook story and an `examples/` app built on the same script. Not a component; the area prefix follows CONTRIBUTING ("For a problem that isn't one component's, use the area instead").

## What you're trying to do

Altitude's AI components each have a preview, but nobody choosing a design system for an agent product sees them working together, and the states that matter most (a proposal that's raised, not pending; a streaming answer on a dashed rule; a failed step in a trench; a queued follow-up) only show up mid-run, for a second. A page with a live chat box wouldn't help: the site is a static, inlined page on GitHub Pages, so it can't call a model without a key and a server, and a live model wouldn't reliably reach the interesting states anyway.

## Today

The landing page (`site/main.tsx`) is one page with bands for workflows, loading (`Await`), the laws, theming and getting started. `scripts/build-site.mjs` builds `site-dist/index.html` (and `artifact.html`) from one entry. There's no agent example anywhere, and `examples/` holds only `shadcn-chart`.

## Proposal

**A second page, `site-dist/agent.html` ("Altitude for agents"), that replays a scripted, deterministic agent run in a complete harness, with a rail of named moments to jump between.** A teaser band on the landing page links to it.

1. **The harness.** A full layout, not a widget: `AppShell` with a `ThreadList` (#269) of a few sessions (one working, one needing approval, one unread); the `Conversation` with `Markdown` answers (#268), citations, attachments (#274) and `Suggestions` (#272); a `Trace` with tool calls, streaming reasoning (#279), a `Terminal` (#273) and parallel subagents (#278); a `Confirmation` with scopes (#280) and editing (#281); a `Question` (#270); an `Artifact` pane (#271) with a `DiffView` reviewed hunk by hunk (#282); a checkpoint (#277); and a `PromptInput` with @-context (#283), dictation (#284), a model `Select`, a context `Meter` and a queued follow-up (#276).
2. **The script.** One realistic task ("Add annual pricing to the pricing page"), as a timed list of events in the same shape an AI SDK stream produces (text deltas, reasoning, tool calls and results, approval requests, errors). A small player feeds it to the components through an adapter, so the page exercises the same props a real integration would. No network, no key.
3. **The moment rail.** A row of named moments under the harness: *Asked · Thinking · Searching · Writing · Approval needed · Question · Test failed · Retried · Queued follow-up · Reviewing changes · Rewound · Done*. Each jumps the run to that state (seek, not replay); Play / Pause runs it in real time. The rail is a `Stepper`-like set of choices built from existing components, keyboard operable.
4. **Annotations.** Beside each moment, a short note naming what you're seeing and the Elevation rule behind it ("Proposed is raised, not pending: nothing has been sent yet"), linking to the row in `Elevation.md`. A toggle hides them for a clean view.
5. **The modes.** The site's existing scheme switcher, plus reduced motion, forced colours (emulated with the forced-colours stylesheet) and `contrast="more"`, so each moment can be checked in every mode.
6. **One script, three uses.**
   - the site page;
   - a Storybook story, `Patterns/AgentHarness`, with an argument per moment;
   - a `shoot.mjs` fixture that renders every moment in all four schemes in CI, so a regression in any AI component's state shows up as a screenshot diff.
7. **A runnable example.** `examples/agent-harness/`: the same layout wired to a real model through the AI SDK's `useChat` transport, replacing the script player with a live stream, with a README on what the application provides (persistence, tool execution, permissions). The site links to it.

**Additive?** yes

## Elevation impact

None: the page composes existing readings and those proposed in the linked issues. Its own chrome (the rail, annotations, mode toggles) is built from existing components: the rail as choices, annotations as flush `Alert` sheets beside the harness.

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Harness | as its components | — | — | — |
| Moment rail, current moment | as `Tabs` segmented | — | raised pill | `aria-current="step"`, the moment's name |
| Annotation | Ground | 0 | `Alert` resting on the page | its words and a link to the rule |

## Motion and accessibility

Seeking to a moment renders that state directly with no replayed motion; Play uses each component's own motion, and reduced motion is honoured. The rail announces the moment reached ("Approval needed: the assistant wants to run npm run deploy"). The harness keeps every component's own semantics; the page adds a skip link to the rail and a heading per region. The page must work at phone width (the `ThreadList` becomes the `Sidebar`'s drawer and the `Artifact` a `Sheet`), which also exercises the mobile issues (#244 onwards).

## Done when

- [ ] `site/agent.tsx` and a second entry in `scripts/build-site.mjs` producing `site-dist/agent.html`, inlined like `index.html`; a band on the landing page linking to it
- [ ] The script and player in one module shared by the page, the Storybook story and the fixture
- [ ] Every moment reachable from the rail by keyboard; Play / Pause; annotations toggle
- [ ] `Patterns/AgentHarness` story; every moment rendered by `shoot.mjs` in all four schemes with no page or console errors, also with `FORCED=1`, reduced motion and `contrast="more"`
- [ ] `examples/agent-harness/` runs against a real model with a README
- [ ] Each component from the linked issues used as it ships; moments for components that haven't shipped are left out rather than faked

## Alternatives considered (optional)

- **A live chat on the landing page.** Needs a key and a server; can't reach approval, failure or rewind on demand; and the output is different every time, so it can't be a fixture.
- **A recorded video or GIF.** Shows motion but not keyboard, screen reader, schemes or modes, and goes stale with every change.
- **A Storybook story only.** Keep it (item 6), but Storybook is for people already evaluating the components; the site is where someone decides whether Altitude fits an agent product.

Part of the agent harness research pass (`docs/research/agent-harness/`); depends on #150–#157, #174 and the issues linked above.
