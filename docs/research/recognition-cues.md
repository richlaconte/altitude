# Recognition cues alongside quiet content

Research and design decision for [#617](https://github.com/richlaconte/altitude/issues/617), reviewed 2026-11-07 against `4378c0c8533ec771ccc3322fa1d7aca6c339c951`. Owner: Altitude maintainers. This is a contextual composition hypothesis with engineering review, not measured improvement in human recognition. The canonical consumer guidance belongs in `project/Distinctiveness.md` and `project/framework/patterns/screen-layout.md`.

## Problem and source audit

Altitude already supplies meaningful non-depth cues: InboxList has unread marks, selected-state semantics, a stable title/from/status order, descriptive previews and named teammate presence; Badge has status words with optional lamps. The design guide already requires text alternatives and status beyond color. The gap is in composition: the final Distinctiveness checklist says to add no decoration but does not ask which distinctions a person needs to recognize. Screen layout records task, lead, primary action and next step without recording that question.

Read [#319](https://github.com/richlaconte/altitude/issues/319) as the existing distinctiveness foundation and [#323](https://github.com/richlaconte/altitude/issues/323) as the task-first frame chooser. Neither needs replacing. The existing Support inbox is a complete public-API example with appropriate cues, a simulated service, adverse states and keyboard checks. Documenting and inspecting those cues is more informative here than inventing a second queue or adding a new component API.

## Evidence and limits

### Search is directed by both the task and the display

[Wolfe, Guided Search 6.0 (2021)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8965574/) models visual search as guided by features, prior history, task goals and scene meaning. It distinguishes selecting a location from recognizing its object. This supports asking what a cue should help someone find, rather than treating visual prominence as inherently useful. Applying that model to Altitude is an inference: neither the paper nor its laboratory results evaluate this inbox, an icon quota, or a particular palette. Avoid claims that every item is instantly understood without reading.

### Icons are not interchangeable units of recognition

[McDougall, Curry and de Bruijn (1999)](https://eprints.bournemouth.ac.uk/10165/1/Measuring_symbol_and_icon_characteristics_mcdougall__curry_%26_debruijn_1999.pdf) report norms for 239 symbols across concreteness, complexity, meaningfulness, familiarity and semantic distance. These dimensions make an important design distinction: an icon can be visually simple but poorly related to its intended meaning. The work enables controlled study; it does not establish that any icon beats text or that one icon family is universally familiar. Our inference is to retain readable labels for unfamiliar concepts and review the chosen symbol with the audience. A generic icon repeated on every identical ticket offers little help distinguishing those tickets.

### Meaning must survive a change in presentation

[WCAG 2.2](https://www.w3.org/TR/WCAG22/) supplies requirements, separate from the contextual search hypothesis: 1.1.1 covers non-text alternatives; 1.3.1 covers information and relationships; 1.4.1 prohibits color as the only visual carrier of information; 1.4.10 addresses reflow; 1.4.11 covers necessary non-text visual information. These requirements apply according to their stated scope and exceptions, not as an automatic checklist certifying an entire application.

The [WAI explanation of use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) explicitly permits color when another visual cue conveys the meaning. A status lamp beside “Pending” can help scanning without asking people to decode hue. The [relationships explanation](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html) covers the structure communicated by headings, groups and rows. Preserve that structure in text or semantics when layout changes.

[WAI's decorative-images tutorial](https://www.w3.org/WAI/tutorials/images/decorative/) explains why adjacent text can make an image redundant for assistive technology. “Decorative” in that accessibility sense does not mean a cue has no visual usefulness: an avatar beside the person's name may still support sighted recognition. Conversely, an accessible name alone does not explain an unfamiliar icon to a sighted person. Avoid both duplicate announcements and unjustified icon-only controls.

[WAI's reflow explanation](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) establishes the 320 CSS pixel review boundary and describes its relationship to 400% zoom. Narrow and zoomed presentation must preserve necessary content and functionality. A fixed screenshot is not enough: open the item, inspect its full description, return to the source and check the alternatives when color or motion is absent. [Non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) also warns that thin marks can remain difficult to perceive despite nominal contrast. Reuse existing component treatments and inspect their rendering.

### Local preference is a reason to investigate, not a population result

The evidence available for the November 6–7 assessments is the maintainer's summary in #617; the raw assessment sessions were not available in this checkout and were not independently reanalyzed. That summary reports repeated preferences for compact rows, quiet settled surfaces and selective tactility; Todoist supplied useful visual references, Raycast's color/visual treatment was positive, and Alfred's imagery looked dated. Those comparisons vary several things at once. They cannot isolate an icon set, layout, font or hue as the cause.

The same evidence record must retain disconfirming information: a dashboard selected at 1/5 while both alternatives were disliked is a low-rated relative winner, not approval. Record the task, alternatives and order if known, reason, absolute rating, comparative choice, rejected options, missing information and uncertainty. Do not invent missing order or scores, average unlike judgments into a design-quality score, or turn a maintainer's taste into an accessibility requirement. Human recognition remains unmeasured here.

## Alternatives and decision

| Approach | Benefit | Limitation | Decision |
| --- | --- | --- | --- |
| Keep avoidance rules alone | No new guidance to maintain | Leaves the affirmative recognition decision implicit; “quiet” can be interpreted as uniform prose | Insufficient for this issue |
| Prescribe more icons, color or images | Makes a visible change quickly | Confounds identity, decoration and taste; could remove labels or overwhelm the lead | Reject quotas and universal styling rules |
| Require a scoped recognition plan and review existing cues | Makes the task and evidence inspectable; reuses current semantics and tiers | Still needs participant study to establish effectiveness | Adopt as contextual guidance |

The recognition plan names a question, cue candidates, their words/semantics, where they sit, why their prominence is warranted, the quiet content they leave alone, evidence and uncertainty. Identity, type, status, grouping, selection, previews and direct data labels are options, not mandatory slots. Useful redundancy means two channels explain one relevant state; wasteful repetition adds no distinction for the task. No component prop, token, default theme, motion or deterministic aesthetic lint rule changes.

## Worked example and acceptance

Use the existing Support inbox with the same seed records and service outcomes. Recognition task: in All tickets, find the invoice awaiting action, identify its requester and status, open it, and distinguish public conversation from internal notes. Then observe Maya viewing/replying on the refund ticket without confusing that presence with ownership. Existing controls retain their behavior; do not introduce fictional owners or a new cue-only dataset.

| Question | Existing cue | Meaning without height/color | Boundary |
| --- | --- | --- | --- |
| Which issue and from whom? | Distinct subject, requester and preview in stable row slots | Subject/from accessible name; complete preview description | Truncated visible text must remain available after opening |
| What state is it in? | Badge and named view tab | “On hold”, “Pending” and other status words | The app's vocabulary needs review with actual agents |
| Which item is open or unread? | Selected row; unread dot and title weight | `aria-selected`; “Unread” in the row's name | Read and selected are different states |
| Is someone already replying? | Existing presence Avatar | Named viewing/replying text in the row and detail | Presence is not the assignee |
| Is this message public? | Separate sections with descriptive headings | Conversation and internal-notes labels | Color and border are supplementary |

Settled labels, previews and status marks remain on ground. The existing live/open row treatment and controls keep their documented elevations. No new motion is needed. Review at desktop and 320px, in Daylight and Nightfall, and forced colors with reduced motion. Check hierarchy, visible labels, accessible relationships, keyboard selection/return, no sideways scroll, and identity preserved after opening. Keep screenshots and exact commands as engineering evidence; no performance or satisfaction claim follows from them.

## Verification record

Implementation and observations will be recorded after the checks run. Participant evaluation is unrun; no people are recruited by this change.
