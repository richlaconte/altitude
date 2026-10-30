# Research

Altitude's elevation language is built on perception and HCI research, then checked against measurements of its own rendered output. This page records the evidence, the experiments, and the decisions each one forced. Read it before adding a new elevation behavior.

## What the literature says

### Depth is read fast, and shading polarity carries it

- **Light comes from above.** People resolve ambiguous shading by assuming overhead light: a disc lit at the top reads as a bump, lit at the bottom as a dent (Ramachandran, 1988; see the [PeerJ review](https://peerj.com/articles/363)). This is why a raised surface carries a light top edge and a well carries a dark one, and why Altitude never moves its light.
- **Shape-from-shading is processed before attention.** Visual search uses 3D scene properties such as lighting direction in parallel ([Enns & Rensink, 1990](https://www2.psych.ubc.ca/~rensink/publications/abs.90.1.html)). Search with shaded objects is most efficient for *vertical* shading gradients, and better when distractors are lit from the top ([visual-search replication, Southampton](https://eprints.soton.ac.uk/48718)). Raised-versus-sunk is therefore a candidate for a pre-attentive "can I press this?" signal, but only if the shading is actually there.
- **Shadows are processed pre-attentively too, but only if they're darker than the ground.** When shadow regions were made lighter than the background, or outlined, the pre-attentive effect disappeared ([Rensink & Cavanagh, 1993](https://www2.psych.ubc.ca/~rensink/publications/abs.93.2.html)). Altitude never uses light "glows" to show height, even in dark schemes.
- **A cast shadow's displacement is read as height.** Moving only the shadow makes a stationary object appear to rise or sink ([Kersten, Mamassian & Knill, 1997](https://kerstenlab.psych.umn.edu/demos/shadows)). Altitude's ladder increases shadow *offset and blur*, not just darkness.
- **Depth segregates attention.** A conjunction search that includes stereoscopic depth runs in parallel ([Nakayama & Silverman, 1986](https://doi.org/10.1038/320264A0)): separate layers really are easier to search separately. That supports keeping overlays visibly off the page.

### Depth is a weak channel for amounts

- Depth ranks 6th of 10 magnitude channels, behind position, length, angle and area ([Munzner, *Visualization Analysis & Design*](https://www.cs.ubc.ca/~tmm/courses/436V-20/slides/marks.pdf)).
- Blur-defined depth (Semantic Depth of Field) separates only **two to four** groups reliably; people could not judge equal blur or blur ratios, a 7px blur was too weak, and participants disliked reading blurred objects ([Kosara et al., 2002](https://www.cvast.tuwien.ac.at/sites/default/files/bibcite/168/kos_vissym2002.pdf)).
- Real 3D layouts didn't beat 2D for retrieval: 6.77s vs 5.98s, not significant, though people preferred the 3D one ([Cockburn & McKenzie, 2001](https://www.cs.kent.edu/~jmaletic/cs63903/papers/Cockburn01.pdf)). Spatial memory itself does help ([Data Mountain, Robertson et al., 1998](https://www.microsoft.com/en-us/research/publication/data-mountain-using-spatial-memory-for-document-management/)).

So elevation should encode **a few ordered categories**, never a continuous value, and should keep things where they are.

### Flat interfaces cost time and errors

- In an eye-tracking study, flat web pages produced more missed clickable elements (35.8% vs 26.0%) and more false alarms (28.0% vs 16.6%) than traditional designs, and flat icons took twice as long to find (15.4s vs 8.0s) ([Burmistrov et al., 2015](https://www.flatisbad.com/publications/Burmistrov-INTERACT15.pdf)).
- Nielsen Norman Group's eye-tracking found weak signifiers attract less attention and cause uncertainty ([Flat UI elements attract less attention](https://nngroup.com/articles/flat-ui-less-attention-cause-uncertainty); summary only, the article couldn't be retrieved).

### Change, time and attention

- People miss changes they weren't attending to ([Rensink, O'Regan & Clark, 1997](https://www2.psych.ubc.ca/~rensink/publications/abs.96.2.html)). **Phosphor** answered with an afterglow: show the new state at once and leave a fading trace that explains what changed; two studies found significant benefits ([Baudisch et al., 2006](https://www.microsoft.com/en-us/research/?p=145436)).
- Abrupt onsets capture attention automatically ([Yantis & Jonides, 1984](https://researchgate.net/profile/Steven-Yantis/publication/16958392_Abrupt_visual_onsets_and_selective_attention_Evidence_from_visual_search/links/0046351b7673aea58b000000/Abrupt-visual-onsets-and-selective-attention-Evidence-from-visual-search.pdf)), and people can track only about four or five moving objects at once ([Pylyshyn & Storm, 1988](https://ruccs.rutgers.edu/images/personal-zenon-pylyshyn/docs/storm88.pdf)). A rise is an attention grab; spend them deliberately.
- **Ephemeral adaptation**: predicted menu items shown at once, the rest fading in over 500ms, made selection faster than a static menu and than highlighting. 250ms was too short to help, misses cost time, and the benefit needed ~79% prediction accuracy ([Findlater et al., 2009](https://www.cs.ubc.ca/labs/edapt/papers/findlater2009.pdf)).
- Animation helps when it's congruent with the change it shows and easy to perceive; otherwise static is as good ([Tversky, Morrison & Bétrancourt, 2002](https://faculty.washington.edu/aragon/classes/hcde411/w13/readings/Tversky_AnimationFacilitate_IJHCS02.pdf)). Animated transitions cut spatial-reconstruction errors from 1.8 to 0.4 without slowing tasks ([Bederson & Boltman, 1999](https://www.cs.umd.edu/projects/hcil/jazz/learn/papers/CS-TR-3964.pdf)).
- Reordering animates with **FLIP**: measure where each item was (First) and where it ends up (Last), apply the difference as a transform (Invert), then animate the transform away (Play), so moved rows travel without a layout per frame ([Paul Lewis](https://aerotwist.com/blog/flip-your-animations/)). Table re-sorts, CommandPalette results and Board moves use it.
- Response-time limits: about 0.1s feels instant, about 1s keeps flow ([Nielsen](https://www.nngroup.com/videos/3-response-time-limits-interaction-design/)).

### Physical metaphors that carry information

- **Piles** let people organize casually; a pile's presence and size say something without opening it ([Mander, Salomon & Wong, 1992](https://hci.stanford.edu/seminar/abstracts/92-93/930602-salomon-mander-rose-wong.html)).
- **Read wear and edit wear**: interaction history shown as physical wear ([Hill et al., 1992](https://acawiki.org/Edit_wear_and_read_wear)).
- **Workspace awareness**: in shared spaces, people need to see who is working where and on what ([Gutwin & Greenberg, 2002](https://collablab.northwestern.edu/CollabolabDistro/nucmc/GutwinGreenberg_FrameworkWorkspaceAwareness.pdf)).
- **Design frictions**: small, deliberate obstacles that prompt a moment of reflection before consequential actions ([Cox et al., 2016](https://oro.open.ac.uk/47011)).
- **Illusion of completeness**: people stop scrolling when a page looks finished ([Nielsen Norman Group](https://www.nngroup.com/videos/illusion-completeness/)). Scroll shadows are a long-standing CSS answer ([Verou, 2012](https://lea.verou.me/2012/04/background-attachment-local/)).
- **Cast shadows carry height.** When only a ball's shadow moves, people see the ball itself rise off the floor ([Kersten, Mamassian & Knill, 1997](https://journals.sagepub.com/doi/10.1068/p260171); [demonstrations](https://kerstenlab.psych.umn.edu/demos/shadows)). Avatars use exactly this: a live face lifts off its shadow, while everyone else here rests on theirs (see E12).
- Apple's 2025 Liquid Glass puts controls on a functional layer floating above content and says to avoid glass on glass ([WWDC25](https://developer.apple.com/videos/play/wwdc2025/219)), the same rule as Altitude's "one summit".

### Anticipation and feedforward

- **Feedforward** tells people what an action will do before they take it, as distinct from feedback afterwards; it bridges Norman's gulf of execution ([Vermeulen et al., 2013](https://documentserver.uhasselt.be/bitstream/1942/14759/1/VermeulenLuytenVandenHovenConinx_chi2013.pdf)). Altitude's hover ghosts are feedforward: the check an unchecked box would get, the radio thumb where it would land, a tab's sheet peeking up, a closed accordion lid's ghost.
- Targets that **expand as the pointer approaches** are acquired faster, even when the expansion starts late in the movement ([McGuffin & Balakrishnan, 2002](https://www.dgp.toronto.edu/~ravin/papers/chi2002_expandingtargets.pdf)). Altitude's approach response changes height, not size (a size change would reflow the layout), so it claims no Fitts' law gain. It's feedforward, and since E10 it's reserved for openings: an empty field opens as you reach for it, previewing what focusing it will do. Raised things no longer respond before the pointer is on them.

### Charts

These are the sources behind [Charts](Charts.md).

- **Position and length are read best; depth, angle and area worse.** Cleveland and McGill ranked elementary perceptual tasks by accuracy, with position on a common scale and length ahead of angle, area and volume ([Cleveland & McGill, 1984](https://doi.org/10.1080/01621459.1984.10478080)); Heer and Bostock replicated the ranking with crowdsourced participants ([Heer & Bostock, 2010](https://doi.org/10.1145/1753326.1753357)). Munzner's ranking puts depth 6th of 10 magnitude channels (see "Depth is a weak channel for amounts"). So a mark's amount is its length or position, never its height, and Altitude has no pie or donut chart.
- **Depth cues on bars cost accuracy.** Extraneous depth on bar graphs made people's estimates of bar heights less accurate ([Zacks, Levy, Tversky & Schiano, 1998](https://doi.org/10.1037/1076-898X.4.2.119)); Hughes (2001) reports a cost of about 10% for 3D bars. Microsoft's Office data-visualization guidance says chart elements should avoid drop shadows ([learn.microsoft.com](https://learn.microsoft.com/en-us/office/dev/add-ins/design/data-visualization-guidelines)). This is why marks are flat ink, and why a hovered bar never lifts.
- **Dual axes mislead.** Charts with two scales on one plot are read less accurately and invite comparisons the data doesn't support ([Isenberg, Bezerianos, Dragicevic & Fekete, 2011](https://doi.org/10.1109/TVCG.2011.160)). Altitude allows one axis per plot.
- **Decorative animation doesn't help.** Animation helps only when its motion is the change (Tversky, Morrison & Bétrancourt, above), so charts glide between values and never grow from the baseline on first render.
- **Staged transitions help people follow a change.** Animated transitions between statistical graphics significantly improved object tracking and value estimation; simple staging helped and was preferred, while rescaling axes at the same time as marks moved hurt ([Heer & Robertson, 2007](https://doi.org/10.1109/TVCG.2007.70539)). So a chart rescales first and moves its marks after, and `checks/chart-motion.mjs` holds it to that frame by frame.
- **A chart needs a path, not just a description.** Data Navigator models a chart as a graph of nodes laid over any rendering as an accessible layer ([Elavsky, Nadolskis & Moritz, 2023](https://doi.org/10.1109/TVCG.2023.3327393)); Olli moves a screen reader from a summary, to the axes and series, to the data ([Zong et al., 2022](https://doi.org/10.1111/cgf.14519)). Blind readers valued trends and statistics over a restatement of the encoding ([Lundgard & Satyanarayan, 2021](https://doi.org/10.1109/TVCG.2021.3114770)), so a series' name says its range and which way it went, and a point's says its change from the one before. Recharts 3 makes a chart one Tab stop with arrow keys between points. `ChartContainer`'s keyboard path follows these.
- **Classes beat a continuous ramp for naming a value.** Choropleth practice bins a sequential or diverging scheme into a few classes (ColorBrewer offers three to nine, and most maps use five to seven) so each colour can be found in the legend ([Harrower & Brewer, 2003](https://doi.org/10.1179/000870403235002042)). `Heatmap` bins into two to seven steps of `data-seq` or `data-div` and names each step's range.
- **Small marks need bigger colour differences.** The colour difference people can see shrinks with mark size ([Szafir, 2018](https://doi.org/10.1109/TVCG.2017.2744359)), so heatmap cells are at least 10px, steps are spread across the whole ramp rather than adjacent, and the grid wraps rather than shrinking cells further.
- **Accessibility is checked, not assumed.** Chartability groups chart accessibility into heuristics a reviewer can audit quickly ([Elavsky, Bennett & Moritz, 2022](https://doi.org/10.1111/cgf.14522)); Charts' five-point check (visual, keyboard, screen reader, reduced motion, forced colours) follows it.

- **The frame follows the libraries people know.** `ChartContainer` and `ChartConfig` take shadcn/ui's chart names and its config shape (data key → label and colour), and Recharts, visx, Nivo, ECharts and Observable Plot were considered as engines. Each adds a dependency, and none exposes what Altitude needs (imprints while loading, the attention budget, hover only where a click acts, legend keys built as switches), so the scales and axes are in-house (see E24).

The frame was reviewed against Altitude's rendering in E24. The full prototype review of every part and state comes with the first chart type, `BarChart`.

### Accessibility

- In forced-colors mode (Windows High Contrast), `box-shadow` is reverted, so anything conveyed only by a shadow is lost ([Microsoft Edge team](https://blogs.windows.com/msedgedev/2020/09/17/styling-for-windows-high-contrast-with-new-standards-for-forced-colors/)).
- WCAG 2.2 **Focus Appearance** (2.4.13, AAA) asks for a focus indicator at least as large as a 2px perimeter of the control, whose pixels change by at least 3:1 between the unfocused and focused states ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance)). A focused field's neutral rim meets it in every scheme (E10).
- Keyboard and ARIA behaviour follow the WAI-ARIA Authoring Practices ([APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)): combobox for `Combobox` and `CommandPalette`, listbox with a button trigger for `Select`, modal dialog for `Dialog`, `Sheet` and `CommandPalette`.

## Experiments

All measurements were taken from Altitude's rendered output in headless Chromium, in all four schemes, using CIEDE2000 (ΔE₀₀) for color differences. ΔE₀₀ ≈ 1 is a just-noticeable difference side by side; about 2–2.5 is noticeable at a glance.

### E1 · Can people tell adjacent levels apart?

Eight 96px tiles, one per level, on the ground. For each step up the ladder, the larger of the face-color difference and the shadow-band difference:

| Step | Daylight | Nightfall | Mesa | Alpine |
|---|---|---|---|---|
| −2 → −1 | 2.17 | 1.28 | 2.24 | 1.10 |
| −1 → 0 | 1.81 | 1.92 | 2.52 | 2.02 |
| 0 → 1 | 2.69 | 2.77 | 2.66 | 3.58 |
| 1 → 2 | **0.83** | 2.24 | **0.81** | 2.25 |
| 2 → 3 | 1.97 | 2.24 | 1.95 | 2.25 |
| 3 → 4 | 1.37 | 1.79 | 1.33 | 2.09 |
| 4 → 5 | **0.91** | 2.12 | **1.07** | 2.05 |

With a simulated low-vision filter (4px blur, contrast halved), the light schemes' 1→2 step fell to 0.33–0.52.

**Finding.** Adjacent levels are *not* reliably readable at rest, especially in light schemes, where every raised level is white and only the shadow differs. Tier boundaries are: sunk vs ground vs raised vs floating differ clearly in every scheme. This matches the 2–4 group limit for depth cues.

**Decision.** Meaning is assigned to **four tiers** (sunk, ground, raised, floating). The eight levels are kept for *motion*: hover climbs one level, press drops to ground. People read tiers and feel levels. No component may rely on a static difference between adjacent levels in the same tier.

### E2 · Does the shadow carry height?

The centroid of the shadow below each raised tile (Daylight): 1.4px at level 1, 4.7px at 2, 10.1px at 3, 17.3px at 4, 21.2px at 5. Nightfall: 2.7, 8.3, 15.9, 19.9, 20.4px.

**Finding.** Shadow displacement grows monotonically with level, the cue Kersten et al. showed is read as height. In dark schemes, levels 4 and 5 converge, so tonal lift (each level lighter) carries the difference there.

### E3 · What survives forced colors?

Rendered with `forced-colors: active`, the entire ladder disappeared: tiles, wells and shadows all became plain background.

**Decision.** In forced colors, elevation falls back to borders that encode the tiers: dashed for sunk (2px for trench), none for ground, 1px for raised, 2px for floating, double for modal. Verified rendering in both light and dark schemes. Under `prefers-contrast: more` (or `AltitudeProvider contrast="more"`), shadows become hard ink slabs whose thickness is the height, a high-contrast version of the same cast-shadow cue.

### E4 · Is "raised" actually shaded?

Top-to-bottom lightness difference (ΔL*) across the face of each surface:

| Surface | Daylight | Nightfall |
|---|---|---|
| Raised (before) | 0.0 | 0.0 |
| Well | −1.2 | −0.6 |
| Trench | −3.5 | −0.8 |

**Finding.** Wells had the dark-top polarity that reads as concave, but raised surfaces had no shading at all: they were flat faces with a drop shadow. The pre-attentive shading cue was present for "fill this" but missing for "press this".

**Decision.** Pressable controls (buttons, thumbs, keys, the selected tab, checked boxes) get a face gradient, `--alt-sheen`. Three strengths were rendered; the subtlest gives +1.9 to +4.8 ΔL*, mirroring the wells' polarity without looking glossy. Pressing removes the sheen, so the face flattens as it reaches the ground. Cards and other containers stay flat: they group, they aren't pressed.

### E5 · Do levels interpolate?

The computed `box-shadow` was sampled every frame while a surface climbed from level 1 to 5. All samples had four layers, and the ambient layer's offset, blur and spread moved continuously (4.6 → 12.2 → 19.9 → … → 48px).

**Finding.** Because every token, including flush, well and trench, uses the same four-layer structure, any level animates smoothly into any other.

### E6 · How long is an afterglow noticeable?

A card's face color was sampled after its afterglow started. The difference from its resting color (ΔE₀₀) in Daylight was 9.0 for the first second, 7.6 at 2s, 4.8 at 3s, 2.8 at 4s, 0.6 at 6s and 0 at 8s. Nightfall tracked within 1.3.

**Decision.** `dur-settle` is 8s, held at full strength for the first second, and noticeable for about four seconds: long enough to catch the eye of someone who looked away, gone before it becomes noise.

### E7 · How should a button show its height?

Three treatments were prototyped against the original (flat face, drop shadow) and rendered at rest, hover and press in light, dark and warm schemes: a **wall** (a solid edge under the face, darker than the face, as thick as the level), a **pill** with the same wall, and a **lit-edge slab** with no wall.

**Decision.** The wall. It draws height literally as displacement, the cue measured in E2 and shown to read as height, so a primary button (4px) visibly stands taller than a secondary one (2px) and a ghost button has none. Pressing has somewhere to go: the face travels the full wall height and the wall vanishes. It survives high contrast as an ink slab and needs no new colours, since the wall is derived from the face. The pill read as playful rather than precise; the lit-edge slab didn't separate primary from secondary.

### E8 · Which badge, avatar, tab and alert treatments carry their meaning?

A design review, not a measurement: each candidate was rendered in Daylight and Nightfall at 2× and judged against two questions: does it say the component's meaning in Altitude's own vocabulary, and does it suggest an affordance it doesn't have?

- **Badges.** Ten treatments: strong deboss, deboss with an inside wall, embossed label tape, sticker, rubber stamp, engraved type, inlay, severity steps, a trench socket with a raised mark, and an indicator plate with a lamp. The **lamp plate** won: it extends the hardware the system already has (keys with walls, switch tracks and thumbs) and keeps colour in a small lit bead, so plates stay calm in dense tables. The socket read as a toggle switch (a false affordance), severity steps read as signal strength (an inverted meaning), and the stamps and stickers looked like every other library's badge.
- **Avatars.** Keycap tiles with walls were rejected because walls mean "press it" everywhere else. The **detached shadow** was kept: it draws presence with a cue people already read as height (above), needs no outline, and survives dark schemes once the shadow core is dense enough. (Revised in E12: the detached shadow now belongs to live people only.)
- **Tabs.** A walled pill carried between tabs fought the smooth glide people liked. **Folder tabs** say "the sheet on top is the one you're reading" with one raised piece and no extra decoration; the glide survives as the segmented variant.
- **Alerts.** A flush band carried no elevation at all; a plaque set into the page looked heavy. A **sheet resting on the page** (paper edge, contact shadow) keeps alerts on the ground tier while giving them the same physicality as Pile and Drilldown, and lets several of them stack.

### E9 · Which treatments carry the seven newer components?

A design review like E8: static renders of every state in Daylight and Nightfall at 2×, judged on whether each says its meaning in Altitude's vocabulary without suggesting an affordance it lacks.

- **CommandPalette.** The query field is a real `Input` inset in the level-5 surface. Making the field the palette's top edge was rejected: with no rim it can't show empty against filled, and it read as a header bar.
- **Sheet.** Inset 8px from its edge rather than flush, because a flush sheet shows its height along one side only. The bottom sheet's handle is a recessed finger pull (an opening) rather than a flat pill.
- **HoverCard.** A level-3 card. A hover-intent "fuse" drawn on the trigger was rejected: it spends motion on every pointer pass over a paragraph of names.
- **Select and Combobox.** The chosen option wears the Checkbox's tick at the row's end. A mini checked box read as multi-select; a leading tick column wasted width.
- **Stepper.** Plates on one ground line, in the breadcrumb's vocabulary. Marker discs on a track were rejected because they read as a quantity. Completed plates had to be the ground itself: in Daylight they were nearly the same tone as the imprints of steps to come.
- **Table.** One slab per row, drawn from the first cell at the table's measured width; per-cell shadows showed seams between cells.
- **Board.** Columns open into wells only while a card is carried; a collapsed column as a `Pile` with its count reads as a quantity without needing the cards.

### E10 · Approach, lamps and field focus, after use

A review of three things that looked right in stills and didn't hold up in use. Candidates were rendered in Daylight and Nightfall at 2×, and the interactions checked in a browser.

- **Approach on raised things.** Buttons, crumbs, cards, piles, steps and board cards climbed toward an approaching pointer, and buttons, crumbs and cards leaned up to 2px after it across their face. In use, a button that shifts under a moving pointer reads as a fault, not as readiness. **Decision:** nothing raised responds before the pointer is on it, and nothing follows the pointer; hover is one discrete change. Fields keep approach, because a field doesn't move: only its depth changes, and that previews what focusing it will do.
- **Status lamps.** The glossy bead (a radial highlight, a lightened face in light schemes, a dark socket ring and a drop shadow) read as a separate object sitting on the plate, and its brightened colours didn't match the tone colours used everywhere else. Four candidates: the bead, a flat dot in the tone's own colour, a flat dot with a ring of its `-soft` tint, and a flat dot mixed 18% into the plate. **Decision:** the flat dot in the token itself. It matches the tone's text exactly; the tinted ring disappeared on neutral plates; the mixed dot looked washed out in Daylight. A neutral lamp is an empty ring, so lit and unlit differ in shape as well as colour. Daylight's `caution` dot is a deep amber that leans brown, because the token is tuned for 4.5:1 text; it's kept so the dot and the word agree.
- **Field focus.** An accent rim with an accent halo lit up every field you clicked into, so a form in use glowed more than its primary action. Candidates: 2px of `ink`, a 1px `ink` hairline with a 3px neutral halo, 2px of `ink` mixed into `line-control`, and that rim plus holding an empty field at its approached depth. Full `ink` was harsh in the dark schemes; the hairline and halo was too faint. **Decision:** 2px of `ink` mixed 80% into `line-control` (`--alt-rim-held`), with the empty field holding its depth while focused. The rim measures at least 3:1 against the resting rim in every scheme (Daylight 3.46, Nightfall 3.33, Mesa 3.05, Alpine 3.43) and at least 11:1 against the ground, so it meets Focus Appearance. Invalid fields keep a `critical` rim. Keyboard focus on everything you press or switch is still the `accent-ink` ring.
- **Field focus, follow-up: the rim is for the keyboard.** Even neutral, the rim appeared on every click. Focus Visible asks only that keyboard focus be visible, and names a text field's caret as one form of it ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)). **Decision:** a field you click into shows its lit floor and the caret; the rim appears only when focus arrived from the keyboard, decided as focus arrives so that typing doesn't add it. `:focus-visible` can't do this, because browsers match it on text fields after a click too, so a shared listener (`useKeyFocus`) marks the field. On a filled field, clicked focus changes nothing but the caret, which is enough when you've just clicked it. The CommandPalette's field never shows the rim, since focus never leaves it.

### E11 · How should an empty region read?

`EmptyState` was rendered at page and widget size in all four schemes at 2×, under forced colours and with `contrast="more"`, and its keyboard path and announcement checked in a browser. The choices below are reasoned from the model and not yet tested against alternatives with people.

- **Sunk, not raised.** A raised card holding the message would sit at the height of content, as if "empty" were a record; an `Alert` is the register for problems. A well with a dashed rim puts it with the empty field and the armed `DropZone`, so the rule stays one rule: sunken things want content. shadcn/ui's `Empty` (media, title, description, content) set the anatomy; Altitude keeps it and adds the opening.
- **Deepening under the action only.** Deepening whenever a pointer crossed the region would spend motion on every pass. Deepening only while the primary action is pointed at or focused previews what pressing it does (a record lands here), which makes it feedforward.
- **No pulse.** Anything looping on an empty state spends the attention budget on the least important thing on screen.

### E12 · Why didn't the avatar look like the rest of the system?

A design review like E8: the avatar was rendered beside Badge, Button, Card, Stepper and Pile in all four schemes at 2×, then two directions were rendered side by side with photos, sizes from 24 to 64px, a group, and the avatar in a list row and a card. It was compared with the avatar guidance of Fluent 2, Primer, Atlassian and Carbon, and with Slack's and Teams' presence conventions.

What didn't fit, each against a rule the rest of the system already keeps:

- **Status colours as identity.** Faces were tinted from `accent`, `positive`, `caution` and `critical` by a hash of the name, so a person could wear `critical-soft` and read as an error, and in the dark schemes the tints went muddy. The README reserves those hues for status. Fluent and Flux hash names into a palette of 12–30 identity colours that has no other meaning; Altitude has no such palette, and inventing one would break "never invent an in-between colour". Badge already answered the same question (E8, E10): keep the plate calm and put colour in a small lamp.
- **Offline drawn as an opening.** The offline face was `surface-well` with an inset shadow: the sunk tier, which means "waiting to receive". An offline person is part of the record, so the face is now a badge plate: flush, ground tier.
- **Three heights one level apart.** Active hovered about 15% of its size and idle rested, both inside the raised tier, which the laws forbid when the difference is a meaning. At 24–44px the gap between them was 3–6px and the soft shadow under an active face read as a grey underline. In collaborative tools presence is coarse ([Gutwin & Greenberg](https://grouplab.cpsc.ucalgary.ca/grouplab/uploads/Publications/Publications/1995-Awareness.NZ.pdf)), and Slack itself shows only active and away, as a filled or a hollow dot.
- **A gloss of its own.** A radial white highlight that nothing else in the system uses.
- **A ragged group that lifted on hover.** Active faces stood higher than idle ones, and every face lifted under the pointer whether or not clicking did anything, against "hover is a promise".

**Decision.** Height says whether a person is here, not how busy they are. Everyone here rests on the page at level 1 with the card's own shadow; active and idle differ by the lamp's shape (filled, or an empty ring, as Badge's unlit lamp), so the difference survives colour blindness and forced colours (a common complaint about Teams' green and yellow, which differ by hue alone). The detached shadow is kept for what it says best: in "The art of the float" ([2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10434713)), a contact shadow made an object read as resting and a detached one as floating, so leaving the ground is now a categorical signal, used only by someone live and by a pressable avatar under the pointer. Faces are neutral `surface-raised`. Groups stand on one ground line with 12% overlap, because at a fifth plus the ground cut-out a later face covered the initials beneath it, and at 15% wider fallback fonts (DejaVu Sans, Verdana) still clipped "TM". Initials take the first and last words and skip punctuation and emoji, after the problems listed in ["Names are complex"](https://hey.georgie.nu/avatar-initials/) for "Mara de Quist"-style names; below 28px they drop to one letter.

**Following the other systems.** Fluent, Primer and Atlassian draw people as circles and everything else (teams, organisations, bots, agents) as squares, so `shape="square"` does the same, its corners taken from the radius scale by size. Primer and Atlassian ask for alt text only when no name is shown beside the avatar; Altitude always labels the face, and labels a group with its count and its overflow with the names it hides, because a "+2" alone tells a screen reader nothing. Carbon falls back from a photo to initials; Altitude also falls back when a photo fails to load.

### E13 · How should several fields of one record be edited in place?

A design review, not a study: `EditRegion` was prototyped in the EditRegion preview (three people with access, each row editable) and rendered at 320 and 960px in all four schemes, under forced colours, reduced motion and `contrast="more"`, with its keyboard and race paths checked in a browser (`checks/edit-region.mjs`). It was compared with a Dialog per row (the existing ActionsInPlace recipe) and with one `InlineEdit` per field.

- **In place, not modal.** NN/g's guidance on data tables notes that a modal editor hides the neighbouring rows people consult to choose a value ([Data tables: four major user tasks](https://www.nngroup.com/articles/data-tables/)), and Shneiderman's direct manipulation asks for a continuous view of the objects with rapid, reversible, incremental actions ([1983](https://doi.org/10.1109/MC.1983.1654471)). The region keeps the list visible and lifts only the record being worked on.
- **One write, not several.** Independent `InlineEdit`s can leave a record half-changed when the second save fails. Saving the draft as one `onSave` with a `changed` list keeps the record consistent and still lets an application send a patch.
- **No save on blur.** People sometimes click away from a multi-field editor expecting their work to persist. Autosave was rejected because the Actions in place guide rules it out and because a blur isn't a deliberate act; instead the draft simply stays open and nothing is lost.
- **Whole-record conflicts.** A per-field merge (save the fields nobody else touched) was considered and rejected for now: it hides the other writer's change from the person saving, and `InlineEdit` already blocks the whole save.

Not yet tested with people: whether the raised editor is noticed as “still unsaved” when someone scrolls away, and whether five fields is the right ceiling before a `Sheet`.

### E14 · How should a set of tags be edited?
A design review, not a study: `TagInput` was prototyped in its preview and rendered at 320 and 960px in all four schemes, under forced colours, reduced motion and `contrast="more"`, with its keyboard paths checked in a browser (`checks/tag-input.mjs`). It was compared with the chip and tag models of React Aria `TagGroup`, MUI `Autocomplete multiple`, Material input chips, Fluent v9 `TagPicker` and Ant Design `Select mode="tags"`.
- **Tags are labels, not controls.** They're part of the record, so they're Badge plates flush in the field's floor rather than raised chips; only the remove button reacts to a pointer. Material and Fluent raise chips; here that would say every tag is a button to press.
- **One Tab stop for the tags.** React Aria and Fluent v9 make the tag group one stop with arrow keys; a stop per tag is slow with 20 tags. The input's description and the tags' own description state the keys.
- **Backspace arms before it removes.** A single Backspace that deletes a tag is a common source of accidental loss, worse when removal is persisted. Arming (the tag lifts and is announced) costs one keystroke and makes the next one's effect visible first.
- **The limit keeps focus.** Hiding or disabling the input at `max` drops keyboard focus to the body ([allxsmith/bestax#1103](https://github.com/allxsmith/bestax/issues/1103)); a read-only input with “Limit reached” keeps it.
Not yet tested with people: whether arming is understood without the announcement, and whether people find Enter-to-edit on a focused tag.
### E15 · How should a date be chosen?

A design review, not a study: `DatePicker`, `DateRangePicker` and `Calendar` were prototyped in their preview and rendered at 320 and 960px in all four schemes, under forced colours, reduced motion and `contrast="more"`, with the APG grid keys, RTL and the segmented field checked in a browser (`checks/date-picker.mjs`). They were compared with the [APG date picker dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/), React Aria's `DateField`/`DatePicker`, shadcn/ui's `Calendar` and native `<input type="date">`.

- **Typed segments, not free text.** A free-text date field has to guess the order of “03/04/2026”; segments in the locale's order (from `Intl.DateTimeFormat.formatToParts`) make the order visible and work the same way in every locale, React Aria's reasoning. Native `type="date"` was rejected: its popup can't be styled into the elevation language and differs per browser.
- **Days are flush; the choice is raised.** A well per day (the Checkbox build) at 42 days a month reads as texture. Keeping only the RadioGroup's one raised thumb, carried between days, says “one choice” and keeps the grid quiet.
- **A month change cross-fades.** Sliding months sideways is common, but the Motion rules keep travel for changes of level and of hierarchy; a month is neither.
- **ISO strings.** `Date` carries a time and a zone and shifts days across them; `Temporal.PlainDate` is right but needs a polyfill in some 2026 browsers. A `'YYYY-MM-DD'` string is exact and dependency-free.

Not yet tested with people: whether the typed segments are discovered before the calendar button, and whether the range's “choose the end” prompt is enough.

### E16 · How should a hierarchy be changed in place?

A design review, not a study: `Tree` was prototyped as a page tree and rendered at 320 and 960px in all four schemes, under forced colours, reduced motion and `contrast="more"`, with the APG keys, RTL, rename, create and both carry paths checked in a browser (`checks/tree.mjs`). It was compared with the [APG tree view](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/), VS Code's explorer, Notion's sidebar, React Aria's `Tree` and outliners (Workflowy, Logseq).

- **Flat rows with levels, not nested groups.** The APG allows either; a flat list with `aria-level`, `aria-setsize` and `aria-posinset` keeps one row model for rendering, focus and carrying, and supports lazy loading and later virtualisation.
- **Carry by keyboard, shown in place.** The APG doesn't cover moving. Outliners use Alt+↑/↓ and indent/outdent; file managers use cut and paste. Picking up with Space (as `SortableList`) and showing the node where it will land, with its depth announced, keeps the result visible before the drop.
- **Into versus between.** Pointer targets split a row into thirds: before, into, after. “Into” opens the node as a trench, a receptacle, and “between” is a thin well at the target depth, so the two read differently without colour. Spring-loaded folders (open after 600ms) follow the Finder convention.
- **No hover-only actions.** Row buttons for “add” and “rename” would put interactive elements inside `treeitem`; instead the shortcuts are on the row and `TreeHandle` lets a toolbar offer the same actions to pointer users.

Not yet tested with people: whether ↑ entering an open node above (rather than staying at the same depth) matches expectation, and whether the toolbar is found.

### E17 · How should a list be written into?

A design review, not a study: `Checklist` was prototyped with a nested and a flat list and rendered at 320 and 960px in all four schemes, under forced colours, reduced motion and `contrast="more"`, with its keys checked in a browser (`checks/checklist.mjs`). It was compared with Workflowy, Logseq, Things, Notion to-do blocks and GitHub task lists, which agree on Enter for a sibling, Tab/Shift+Tab to indent, and Backspace to merge.

- **Commit on leaving the line.** Every outliner saves a line when you leave it; an explicit Save per line would make the list unwritable. It departs from `InlineEdit`'s rule, so it's scoped to this component, and a refused change keeps the text with Retry.
- **Text inputs in a list, not a tree.** The tree pattern's arrow keys would fight the caret; nested `ul`s with ordinary inputs keep text editing native and the structure readable.
- **No focus trap.** Tab indents, so Escape leaves the line first; then Tab moves on, as it does from the last, empty line.
- **Ops, not arrays.** Reporting one op per action lets an application persist and merge per item instead of replacing the whole list.

Not yet tested with people: whether Escape-then-Tab is discovered, and whether Backspace-to-merge surprises people who expect it to do nothing at the start of a line.

### E18 · How should a query be built in place?

A design review, not a study: `FilterBar` was prototyped over an issue table and rendered at 320 and 960px in all four schemes, under forced colours, reduced motion and `contrast="more"`, with its keys checked in a browser (`checks/filter-bar.mjs`). It was compared with Linear's filters, Notion database filters, GitHub's search tokens, Jira's basic search and Airtable.

- **Conditions as sentences.** “Status is In review” reads the same to everyone and is the accessible name of each condition; segment buttons say which part they change.
- **One Tab stop.** The [APG toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) roving model keeps a row of five conditions (twenty segments) from adding twenty Tab stops.
- **Filter in place.** Removing non-matching rows reflows the table and loses people's place; with `relevance`, matches rise and misses sink, so positions survive (the existing **Relevance** signal).
- **Free text as a token, not a search box.** A “Title contains” condition sits beside the others, so the whole query is visible and editable in one place.

Not yet tested with people: whether the field-then-value sequence for a new condition is faster than a single combined picker.

### E19 · How should time be handled directly?

A design review, not a study: `Schedule` was prototyped as a room-booking week and rendered at 320 and 960px in all four schemes, under forced colours, reduced motion and `contrast="more"`, with every operation checked by keyboard and by pointer in a browser (`checks/schedule.mjs`). It was compared with Google Calendar, Outlook, Notion Calendar, FullCalendar and Bryntum.

- **Direct manipulation, with a keyboard twin for each drag.** Shneiderman's direct manipulation asks for visible objects and rapid, reversible actions ([1983](https://doi.org/10.1109/MC.1983.1654471)); WCAG 2.2 SC 2.5.7 asks that anything done by dragging can be done without it. Space-to-carry (as `Board` and `SortableList`), Shift+arrows to resize and Enter on empty time to create give each drag a keyboard path.
- **A grid of slots.** Rows of time slots by day columns make arrow navigation predictable and give every empty slot a name (“Tuesday 27 October, 10:15”) to create into; events are buttons inside their start slot.
- **Time opens only while something could land.** As Board's columns, days stay flat at rest and open into wells while carrying or drawing, so the grid isn't a field of holes.
- **Naive local times.** A zoned type would need a library or `Temporal`; local `YYYY-MM-DDTHH:mm` strings are exact and leave the zone to the application, which already knows it.

Not yet tested with people: whether Enter-to-create on empty time is found, and whether the side-by-side overlap layout stays readable past three events.

### E20 · How should a table be edited cell by cell?

A design review, not a study: `DataGrid` was prototyped as an inventory grid and rendered at 320 and 960px in all four schemes, under forced colours, reduced motion and `contrast="more"`, with its keys checked in a browser (`checks/data-grid.mjs`). It was compared with the [APG data grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), MUI X Data Grid, AG Grid, Glide Data Grid, Airtable and Excel.

- **A sibling, not a DataTable mode.** DataTable's README says it's “a table, not a grid”; adding cell focus and editing would change its semantics for everyone.
- **Enter, Tab and a click commit.** InlineEdit keeps a session open across blur, but every spreadsheet commits on Enter, Tab and clicking another cell, and fighting that makes entry unusable. Focus leaving the grid is the one case that keeps the draft open, marked unsaved, so nothing is lost or written silently.
- **No hover lift.** A click selects, so a lift would promise an action that doesn't happen; the header's pencil and `aria-readonly` carry editability.
- **Ranges are a tint.** Height is reserved for live content and writes; a selection is only a target.

Not yet tested with people: whether “Not saved yet” is noticed when someone tabs out of the grid mid-edit.

### E21 · How should a list of records be changed in place?

A design review, not a study: `ItemGroup` was prototyped with webhooks and a form builder's options and rendered at 320 and 960px in all four schemes, under forced colours, reduced motion and `contrast="more"`, with its keyboard paths checked in a browser (`checks/item-group.mjs`). It was compared with shadcn/ui's Item, GOV.UK's add-another pattern, Ant Design's `Form.List` and the Files recipe in Actions in place.

- **In place, not a dialog per operation.** Shneiderman's direct manipulation asks for continuous visibility and rapid, reversible actions ([1983](https://doi.org/10.1109/MC.1983.1654471)); NN/g finds modal editors hide the neighbours people refer to, and that one or two visible actions per row beat a hidden menu.
- **Undo over confirmation, when it's real.** Raskin's “never use a warning when you mean undo” supports immediate removal with recovery; but only the application knows whether it can reverse a removal, so `removal` has no default and confirmation remains for the irreversible case.
- **One editor at a time.** Two open editors split attention and make “which Save?” ambiguous; opening another keeps the first and returns focus to it, rather than discarding work.

Not yet tested with people: whether focus moving to the fresh add slat after adding is expected, and whether Undo without a time-out is noticed.

### E22 · How should a record's properties be edited?

A design review, not a study: `PropertyList` was prototyped as an issue sidebar and a “Check your answers” summary and rendered at 320 and 960px in all four schemes, under forced colours, reduced motion and `contrast="more"`, with its keyboard paths checked in a browser (`checks/property-list.mjs`). It was compared with GOV.UK's [summary list](https://design-system.service.gov.uk/components/summary-list/), Ant Design's Descriptions and ProDescriptions, and Linear's and Jira's issue sidebars.

- **The value is the button.** A separate “Change” link per row (GOV.UK) is clear but heavy in a sidebar; making the value plate itself the button, lifting on hover and named “Status: In review. Change status”, keeps the row quiet and the name meaningful out of context.
- **Read-only values don't lift.** Hover is a promise: only what opens an editor reacts, so editability is visible without a pencil per row.
- **Unset is an opening.** A dashed well that names what to add shows at a glance which properties are missing, as an empty field does.
- **Shortcuts off by default.** Linear's single-key shortcuts are fast, but WCAG 2.1.4 requires that they can be turned off or remapped.

Not yet tested with people: whether the hover-lifting plate is enough of an affordance on touch, where there's no hover (the open question in the issue).

### E23 · Can a chart palette stay clear of status, presence and the accent?

A measurement, not a study: `build/palette.mjs` (which CI reruns) searches OKLCH candidates in every scheme, simulates protanopia and deuteranopia after [Machado, Oliveira & Fernandes (2009)](https://doi.org/10.1109/TVCG.2009.113) at severity 1, and measures differences in [OKLab](https://bottosson.github.io/posts/oklab/) as ΔE×100 (not the ΔE₀₀ the other experiments use). Contrast is WCAG 2.

**A stock palette collides.** An 8-hue reference palette separates series well for colour-blind readers (worst adjacent ΔE 8.4–9.1) but lands within 15 of the reserved hues in every scheme (violet 3.6 from `presence-3` in daylight, red 7.7 from `critical` in nightfall), and in the light schemes four of its eight slots are under 3:1 on the ground. Okabe-Ito, Tableau 10, shadcn's `--chart-*` and the Recharts and ECharts defaults have the same problem: they use red, green, amber, magenta, teal and violet freely.

**The accent itself fails the gates.** `data-1` was proposed to be the accent. The shipped accents sit 9.6 (daylight), 6.0 (nightfall) from `presence-3`, 5.0 from `critical` (mesa) and 7.5 from `positive` (alpine), and both dark accents are lighter (OKLCH L 0.73 and 0.80) than a dark scheme's marks may be. So `data-1` takes the accent's *hue* at a lightness that clears them; in mesa no lightness of terracotta clears `critical` and `caution`, so it takes the nearest hue that does (a salmon, h 35 against the accent's 39). Charts' "never a series in `accent`" holds.

**Six slots need the reserved distance at 12, not 15.** With every other gate in place, the light schemes hold only four slots at 15: daylight and mesa leave about 85 candidates once 3:1 on white is required, and their status and presence hues sit at the same lightness as those candidates. Five fit only at chroma 0.24–0.30, which is neon beside the rest of the system. Daylight fails six at 14 and at 13; at 12 all four schemes hold six. Twelve is still well clear of confusion (the closest pair is 12.0, a plum `data-5` against daylight's violet `presence-3`), but it is a deliberate loosening of the issue's 15, recorded here.

**Gates added during the search.** Optimising only adjacent pairs let two slots share a hue (two greens 15 apart in lightness): slots now also keep 25° of hue and colour-blind ΔE ≥ 6 between *any* two, since a legend or a crossing line puts any pair side by side. The diverging ramp's best colour-blind pair was olive against indigo, which reads muddy at the dark pole; it's held to orange against blue (ColorBrewer's PuOr and RdBu family), which loses little (13.5 against 14.1 at the weakest step in daylight).

The chosen palette, by scheme:

| Scheme | Worst adjacent CVD ΔE | Worst CVD ΔE, any pair | Worst normal ΔE, any pair | Lowest contrast on ground or raised | Closest reserved hue | Smallest ramp step (L) | Diverging sides, worst CVD ΔE |
|---|---|---|---|---|---|---|---|
| daylight | 19.6 | 6.6 | 15.2 | 3.08:1 | `data-5` ↔ `presence-3` 12.0 | 0.089 | 13.5 |
| nightfall | 24.4 | 6.7 | 15.2 | 3.01:1 | `data-5` ↔ `accent` 12.3 | 0.089 | 13.6 |
| mesa | 22.8 | 6.8 | 15.1 | 3.00:1 | `data-1` ↔ `accent` 12.0 | 0.089 | 13.5 |
| alpine | 25.0 | 7.7 | 15.2 | 3.02:1 | `data-4` ↔ `presence-3` 13.0 | 0.088 | 11.6 |

Adjacent slots are now two to three times as far apart for colour-blind readers as the reference palette's (19.6–25.0 against 8.4–9.1). The cost is that any two slots can be as close as 6.6, so charts with more than a few series still need direct labels or patterns ([#72](https://github.com/richlaconte/altitude/issues/72)). `data-other` comes out near-black in the light schemes (L 0.33–0.35): every lighter neutral that holds 3:1 was within 15 of a slot. Not yet tested with people: whether the slots are told apart as well as these distances predict, in real charts and at small sizes.

### E24 · Does the chart frame sit on the ground?

A design review, not a study: `ChartContainer` was rendered with hand-drawn lines on a time scale and grouped bars on a band scale, each in a `Card`. The renders covered all four schemes at 960px, 360px at 2×, forced colours (Chromium's emulation) and `contrast="more"`.

- **Flat and flush.** The plot, gridlines and marks read as part of the card, and the bars stand on the ground line. Nothing in the frame has a level.
- **Ticks were tuned twice.** Monthly data first showed only every third month, because ticks were spaced for 84px labels; they're now spaced for the label's width (56px), so six months fit in a half-width card. At 360px the y axis allowed two ticks and stretched a $12K maximum to $20K; it now keeps at least three.
- **Forced colours keep the frame but not the series.** Tick labels and the ground line turn `CanvasText` and gridlines `GrayText`, but in Chromium's emulation the marks keep their `data-*` colours, so series aren't told apart without colour. Patterns, markers and `CanvasText` marks are #72.
- **Decided while building.** Charts ship in the main entry for now, because the scales and frame add about 8 KB to `bundle.js`. Tick labels use Instrument Sans with tabular figures, not JetBrains Mono, because they're labels, not values to copy. SVG only: past about 2,000 marks, aggregate or use a canvas library with Altitude's theme (#77).

Not yet tested with people: whether a generated summary is as useful as a written one.

**Without colour (#72).** Each slot has a fixed dash, marker and hatch, after ECharts' `aria.decal`, which it ships off by default. Altitude turns them on under forced colours and in print, and with the `patterns` prop anywhere else. Under Chromium's forced-colours emulation, `checks/chart-patterns.mjs` renders six hatched bars and four dashed, marked lines in `CanvasText`, all distinct; `GrayText` gridlines come out as the emulated system grey (a dark red, rgb 96 0 0). The print render keeps the colours and adds the patterns, so a greyscale printout still separates the series. Not yet checked on real Windows contrast themes.

### E25 · Does BarChart read flat, in every form?

The prototype review moved here from the Charts chapter (#48): `BarChart` was rendered as one sorted series, grouped, stacked, stacked to 100%, with negative values, and horizontal with long names. Each was in a `Card`, in all four schemes at 960px, at 360px at 2×, under forced colours and with `contrast="more"`. `checks/bar-chart.mjs` measures the geometry.

- **Flat and standing.** Every bar meets the ground line square and is rounded only at its data end, and none has a shadow or a filter. Stacked segments and grouped neighbours are 2px apart, so parts read as parts without an outline. A hovered bar on a static chart doesn't change at all.
- **Negative bars read as position, not depth.** They hang below the ground line with the same flat fill, rounded at their lower end; nothing about them looks sunk.
- **Labels were thinned too eagerly.** Category labels were thinned by the widest label plus 12px, which hid every other month at 960px. They're now thinned by each pair of neighbours' actual widths plus 4px, and every label shows in all six charts.
- **Horizontal needed a budget.** Long category names took two-thirds of a card and crushed the value axis until its ticks overlapped. Names now take at most 40% of the width and are cut with an ellipsis (the full name stays in the summary), and the value ticks are counted from what's left.
- **Forced colours.** Hatches tell all three stacked and grouped series apart in `CanvasText`; the first series stays solid.

Not yet tested with people: whether a 2px gap is enough to separate stacked segments at a glance for colour-blind readers when patterns are off.

### E26 · Does LineChart keep to its data?

A design review like E25: `LineChart` was rendered with intraday latency (two series every 30 minutes), a year of monthly revenue on a monotone curve, daily signups with missing days, and four converging plans. Each was in a `Card`, in all four schemes at 960px, at 360px at 2×, under forced colours and with `contrast="more"`. `checks/line-chart.mjs` measures it.

- **Gaps stay gaps.** Missing days break the line into runs; nothing is interpolated across them.
- **The curve doesn't invent data.** Sampled along the monotone path, the line never leaves the range of the two points it runs between.
- **Hour labels collided.** Time ticks were spaced for a fixed 56px, and "12:00 AM" and "6:00 AM" overlapped. Ticks are now chosen as the finest interval whose labels clear each other at the chart's width, and hours read "6 AM".
- **A foot that wasn't ground.** With zero off the axis (signups 40–80), the plot's foot still wore the ground line's `ink-muted` rule, which read as zero. It's now an ordinary gridline, and only zero is ground.
- **End labels.** Four converging lines (Free, Team, Business) put their names on top of each other; they're nudged at least 16px apart, with each name staying beside its line's end.

Not yet tested with people: whether end labels nudged away from their line's end are still read as belonging to it.

### E27 · Does the readout follow the data without drifting?

A design review: the readout was rendered open on line and bar charts in all four schemes and under forced colours, and `checks/chart-tooltip.mjs` drove it with a mouse and with touch. The surface, rise and warm-up were compared with `Tooltip`; the behaviour with shadcn/ui's `ChartTooltip`, Recharts' cursor and ECharts' axis pointer, which all follow the pointer continuously.

- **Steps, not glides.** Its position isn't transitioned: it jumps to the next x, with the crosshair, as a card in hand follows the pointer. Gliding between positions read as lag, and following every pixel (Recharts' default) would put it against E10's rule that nothing drifts across its own face.
- **Never over the point.** It opens on whichever side of the point has room, so it never hides the value it's reading.
- **Only what's read changes.** Lines ring their points in the plot's own colour, an outline rather than height; bars stay exactly as they were, because hovering a static bar does nothing.
- **Touch.** Press and hold (250ms) opens it, so a quick swipe still scrolls the page; dragging scrubs; it stays after the finger lifts until a tap elsewhere.
- **Dates as categories.** A bar per week printed raw ISO strings ("2026-03-02") on the axis; date-valued categories now read as dates ("Mar 2") on the axis and in full in the readout.

Not yet tested with people: whether the 250ms hold is discoverable on touch without a hint.

### E28 · Does a legend you can toggle look like one?

A design review: `ChartLegend` was rendered static (stacked bars) and toggleable (four lines, one hidden from the start), in all four schemes, under forced colours, with `contrast="more"` and with keyboard focus. `checks/chart-legend.mjs` drove it from the keyboard and the pointer. It was compared with the legends of Recharts, ECharts and Chart.js, which all toggle on click with keys that look like plain labels: the invisible affordance Burmistrov et al. (2015) measured.

- **Keys that look like choices.** Each toggle key lifts one level under the pointer, as a ghost button does, and holds a trench like a Checkbox's, so it reads as something to press before it's pressed. A static legend has none of this: its keys sit flush.
- **The line swatch didn't fill.** For a line chart the shown key first drew a thin line inside the trench, which in the dark schemes left the trench looking empty. A toggle key's swatch is now always a block that the series colour pours into; the static legend keeps the line.
- **Toggling is one change.** Hiding Team faded it out, showing Enterprise (12–17) rescaled y from 30–50 to 0–50 with the rescale staged first, and no other series changed colour.
- **The last series stays.** Its key is `aria-disabled` and described "At least one series stays shown", so the chart is never empty by accident.

Decided: no "show only this series" (isolate) yet. Alt-click is undiscoverable, and an "Only" button on hover adds a control per key; it can come later if people ask for it.

### E29 · Can the data be read without a pointer?

An engineering check, not a study: `checks/chart-keyboard.mjs` walks a two-series and a one-series `LineChart`, stacked and horizontal `BarChart`s, and hand-drawn marks from the keyboard, asserting every name, level change and position.

- **One Tab stop.** Every chart has exactly one node in the tab order at each level, and Tab leaves the chart in one press, where a node per point would have made a 49-point chart 49 Tab stops.
- **The units were missing.** A line chart's `y={{ format }}` formatted only its axis, so its readout and its points read "185" where the axis said "185 ms". A chart type's value format now reaches every place a value is said.
- **Rings on the marks.** A focused point's ring lands within 1.5px of the line's marker and of a horizontal bar's end.

Not yet checked by hand with a screen reader: VoiceOver and NVDA weren't available where this was built. The names are verified as accessible names, not as speech; whether `aria-roledescription` ("data point") reads well in both is the first thing to check.

### E30 · Where does a chart's table go?

A design review: the table view was rendered on a stacked bar chart, starting on the chart and on the table, in all four schemes and at 360px; `checks/chart-table.mjs` drives it. Chartability lists a data table as a core heuristic, and asks for it to be available to everyone, so it's a visible view rather than a visually hidden table.

- **In the chart's own box.** The table scrolls inside the plot's size, so the card and the page don't move when the view changes.
- **Two views of one record.** The control is the segmented `Tabs` (a pill gliding between two choices), and the views cross-fade rather than slide. Both stay mounted, so the chart keeps its size, motion and keyboard place while the table is shown; the hidden one is inert, which also takes the chart's keyboard path out of reach.
- **Opt-in, for now.** On by default, every widget-sized chart on a dashboard grows a control; the summary and the keyboard path already reach every value. Revisit if the table proves to be what people reach for.

### E31 · How should a chart wait?

A design review: the imprint, an empty plot with an action, a refetch and all-zero data were rendered in all four schemes and under forced colours, and `checks/chart-loading.mjs` drove a chart through undefined, a slow and a quick promise, a refetch, null, a rejection and a `RevealGroup`.

- **Shaped imprints, not a flat band.** Bars of varied height pressed into the page say "a bar chart is coming" at the chart's own size, and can't be taken for data: they're `surface-well`, carry no labels, and are announced as loading. Under forced colours they're dashed, like every sunk surface.
- **Fade, don't rise.** `Await`'s content rises 8px out of its imprint; a chart's marks would leave the ground line doing that, so they fade in place.
- **A refetch keeps what someone is reading.** It's never imprinted over; the old marks drop to half strength only after `dur-grace`, so a quick refetch shows nothing at all.
- **Two bugs found.** A rejected promise passed while older data showed was treated as a refetch and never reached the error boundary; it now does. And all-zero data drew on an invented −1 to 1 axis with the bars floating mid-plot; it now draws on 0–1, standing on the ground line.

Not yet compared with people: whether shaped imprints are ever read as data at a glance (the issue's open question).

### E32 · Can a trend be the size of a word?

A design review: `Sparkline` was rendered beside a headline number, in running text (a line with a normal range, bars with a zero day, and one still loading), and in a `DataTable` with decorative and labelled cells, in all four schemes at 960px and 360px, under forced colours at 2× and with `contrast="more"`. `checks/sparkline.mjs` measures it. Tufte calls sparklines "data-intense, design-simple, word-sized graphics" ([Tufte, *Beautiful Evidence*, 2006](https://www.edwardtufte.com/tufte/books_be)): their scale is the text beside them, which is why it has no axes and its label says the numbers in words.

- **As tall as the text.** It takes `1lh` of the surrounding type, so in a 23px paragraph it's 23px and in a table cell it's the cell's line. The first build zeroed its own line height to tidy the SVG's baseline, which made `1lh` zero and drew nothing; the SVG is a block instead.
- **Forced colours lost to a tone.** A sparkline with `tone="data"` kept `data-1` under forced colours, because the tone rule was more specific than the forced one. Every tone is now `CanvasText` when forced.
- **Gaps show as gaps.** A team with two missing days shows a short run, a break, then the rest; a single point between gaps is a dot.
- **Bars stand on zero.** A zero day has no bar, and the other bars still share one baseline, so the gap reads as nothing rather than as missing.

Not yet tested with people: whether `ink-muted` is enough contrast for a trend read at a glance in a dense table, or whether `data-1` should be the default.

### E33 · Does a stat say which way is good?

A design review: `Stat` was rendered as a hero number that loads, and in a `StatGroup` of four cards (users with `good="up"`, an error rate with `good="down"` that's rising, a neutral latency in ms, and a null), in all four schemes at 960px, at 360px at 2× and under forced colours, then refreshed. `checks/stat.mjs` drives it.

- **Up isn't always good.** Tremor's `BadgeDelta` colours an increase green; for an error rate that's the wrong way round. A stat stays neutral until it's told which direction is good, and then the word, the arrow and the lamp each say it, so a reader who can't tell red from green still reads "Up 21%" and sees the arrow.
- **No counting up.** Count-up animations delay the number they exist to show; Tversky, Morrison and Bétrancourt's finding (above) is that animation helps only when its motion is the change. The value cross-fades and the stat gets the afterglow.
- **The number is the record.** The stat has no shadow or level of its own; the `Card` it sits in is raised because it's something you can work with, as the Charts chapter says of dashboard cards.
- **A plate, not a pill of colour.** The change reuses `Badge` (a plate set into the page with a lamp), so a good or bad change looks like every other status in Altitude, and gets a 1px border under forced colours.

Not yet tested with people: whether a neutral, ink-muted change is noticed as readily as a coloured one on a busy dashboard.

### E34 · Is a meter a reading or a task?

A design review: `Meter` was rendered with storage under and past a threshold, seats near their limit, API calls over it, a reading still loading, and two segmented meters (storage by type, seats by role), in all four schemes at 960px, at 360px at 2×, under forced colours and with `contrast="more"`, then pushed across a threshold. `checks/meter.mjs` measures it.

- **Flush, not a trench.** The issue proposed `Progress`'s build, a raised fill in a trench. The Charts chapter, written after it, settles it the other way: a task under way is live, a reading is the record. A raised fill would also lift an amount off the ground, which is the one thing a chart may never do. So the meter is a flush track with flat ink across it.
- **Over the limit stays in range.** `aria-valuenow` must lie between its min and max ([WAI-ARIA 1.2, meter](https://www.w3.org/TR/wai-aria-1.2/#meter)), so a reading over the limit reports the max and says the real reading and "over limit" in `aria-valuetext`.
- **Segment cuts in the surface's colour.** A 2px cut showing the track was too faint to separate two segments of similar lightness; the cut is the surface's own colour (the page, or the card), as a stacked bar's gap is.
- **The state is a word.** Caution and critical are colours only alongside "Near limit" and "Over limit" on a Badge, so they survive forced colours, where every fill is `Highlight`.

Not yet tested with people: whether a notch above and below the track is found as readily as a labelled threshold.

### E35 · Can a list row be its own bar and still be read?

A design review: `BarList` was rendered with 21 pages folded into seven and "Other", static referrers that re-rank and filter in place, and customers that load, in all four schemes at 960px, at 360px at 2×, under forced colours and with `contrast="more"`. `checks/bar-list.mjs` measures it, including the contrast of `ink` over every bar composited on its card.

- **Text over a bar.** A 22% tint of `data-1` keeps `ink` at 4.5:1 or better over every bar in every scheme ([WCAG 2.2, 1.4.3](https://www.w3.org/TR/WCAG22/#contrast-minimum)), so the bar can sit behind the label instead of beside it, and the label gets the full row.
- **The bar stopped at the value.** In the first build the bar spanned the whole row, so the longest one ran under the share column and the percentage looked like part of the bar. The bar now runs under the label and the value only.
- **Wrap, don't cut.** A long path wraps at its slashes and hyphens. Breaking anywhere split words mid-way at 360px ("cha / rt"), so it only breaks a word when nothing else fits.
- **Lifting rows, flat bars.** As in `Table`, only rows that act lift. Lifting the bar with its row would make it a raised amount, so the bar is painted on the row and moves only because the row does.

Not yet tested with people: whether bars sized against the largest (rather than the total) are misread as shares when `share` is on.

### E36 · Can an area be flat and still read as a total?

A design review: `AreaChart` was rendered as three stacked regions over two weeks (with a legend you can toggle, the table view, and a change of week), plans as shares of 100%, and a single area of storage used, in all four schemes at 960px, at 360px at 2×, under forced colours and with `contrast="more"`. `checks/area-chart.mjs` measures it.

- **No gradient.** The faded-to-transparent fill most libraries use by default would borrow the sheen's cue, "press it" (E4). A flat fill at 28% under a 2px line reads as a volume without it.
- **Parts parted by the surface.** A 2px line in the plot's own colour separates bands as a stacked bar's gap does. Under forced colours each band also takes its slot's hatch.
- **Labels on a halo.** Nothing gates `ink` at 4.5:1 against the `data-*` fills, so band names carry a 3px halo of the plot's colour (`paint-order: stroke`), and appear only where a band is at least 20px tall.
- **↑ means up.** The container moved ↓ to the next series, which in a stack drawn from the bottom is the band above, so ↓ went up the screen. A stacked area turns that around, and each point says its share of the total, as the issue asked.
- **An area-shaped imprint.** The loading imprint was bars or a band; an area chart now imprints an area.

Not yet tested with people: how well the middle bands of a stack are read, since only the bottom band stands on a common baseline (Cleveland & McGill's position-on-a-common-scale advantage applies to it alone). This is why the README puts the steadiest part at the bottom.

### E37 · Can data that isn't yet the record be told apart without lifting it?

A design review: `ChartStatus` was rendered as monthly revenue with October so far, daily signups projected from today with a 10th–90th percentile band, regional requests with a three-week forecast, and quarterly bookings with Q3 so far and Q4 projected (and a button that closes the period), in all four schemes at 960px, at 360px at 2×, under forced colours and with `contrast="more"`. `checks/chart-status.mjs` measures it.

- **Pattern and a word, not height.** Altitude's pending writes hover until they land, but a hovering bar misstates its value, so the Commitment signal can't carry over. Partial and projected marks lie on the ground with the record, hatched or dashed, and say "So far" or "Projected" wherever a value is named.
- **Partial bars lose their fill.** A hatch on the plot's colour reads as "less than solid" at a glance, which is the point: the most common dashboard misreading is a half-counted month taken for a drop. A projection also keeps its outline, so it reads as a shape still to be filled.
- **One path, clipped.** Splitting a monotone line into two paths at the boundary put a kink there, because each half gets its own end tangents. The line is drawn once and clipped two ways, solid and dashed.
- **Patterns already use the hatch.** Under forced colours `data-2`'s own hatch is also 45°, so the pending hatch made its settled and projected parts identical. While patterns are on, a slot that has a hatch keeps it in the pending stretch, faded to 45%; slot 1, which is solid, takes the pending hatch.
- **Bands, not error bars.** After Correll & Gleicher (VIS 2014), the uncertainty is a flat fill at 16%. Its edges count toward y, and it's named in the readout.
- **Trends from the record.** The generated summary reads trends and extremes from the settled records and then says what's partial or projected. Otherwise a half-counted October would become the "lowest" month.

Not yet tested with people: whether "Today" is the right word for the rule when the first pending record is a partial period, since today falls inside that period rather than at its start.

### E38 · Can a chart carry its references without crowding its data?

A design review: `ChartReference` was rendered as uptime against a normal range, a target and a critical limit, with an outage annotated; cloud spend against a caution budget and a median that moves with the week; team scores against a bar on a horizontal chart; and latency against its mean with three crowded events, two of them buttons. In all four schemes at 960px, at 360px at 2×, under forced colours and with `contrast="more"`. `checks/chart-reference.mjs` measures it.

- **Drawn by the frame, not by each child.** If each reference drew itself, no label could know where the others were. The children are declarative, like `ChartTooltip`, and the container lays out every label and plate together: labels nudged 16px apart, plates in rows, a label under a plate stepped down below the rows.
- **Solid, never dashed.** Dashes already mean "projected" (E37), so a reference line is solid. Its colour is `ink-muted`, or the status tone when crossing it means good or bad, and then the label also carries the icon, so the tone is never colour alone.
- **Bands under, lines over.** A band is a region the data passes through, so it lies under the marks. A line is something to read the marks against, so it's drawn over them, with its label on a halo.
- **Computed values at the data's precision.** A mean read through a format that doesn't round printed "162.52380952380952 ms". The label rounds it to one more place than the data has.
- **References count toward y.** A budget above every bar was off the plot. Their values now join the extent.

Not yet tested with people: whether right-end labels are found as quickly as labels at the left, where reading starts.

### E39 · Can a live chart say what changed without moving under the reader?

A design review: `ChartLive` was rendered as an error rate over a 15-minute window that ticks every two seconds, crosses a 2% alert and can be paused, and a queue-depth bar chart where one queue grows or every queue refreshes. In all four schemes at 960px, at 360px at 2×, under forced colours and with reduced motion. `checks/chart-live.mjs` measures it.

- **An outline, not a glow.** Altitude's afterglow lifts a surface to level 2. A mark can't lift, so the trace is a 2px `ink` outline in the mark's own shape (a bar's outline, a ring on a point), decaying on the same `dur-settle` and `ease-decay`. Its value shows for the first second, so a glance gets the number too.
- **More than four is one change.** A full reload that glowed every bar would spend the whole attention budget at once and point at nothing. Past four marks, the caption takes the tint instead, as a table re-sort does.
- **A window slides, it doesn't cross-fade.** The motion engine cross-faded whenever x's values changed under a line (Motion rule 5), which made a ticking chart blink every tick. A live chart whose records overlap now glides its x domain one step, and departing points ride off the left edge, clipped to the plot.
- **Holding still beats pausing.** The readout used to change under the pointer on every tick. Updates now queue while the pointer or focus is in the plot, and the caption says so. The switch is still there for WCAG 2.2.2, and for anyone watching from a distance.
- **Announce crossings, not ticks.** A polite announcement every two seconds would make the page unusable with a screen reader, so nothing is said unless `announce` returns a sentence.

Not yet tested with people: whether an outline that holds for one second is noticed in peripheral vision as readily as the surface afterglow's tint and lift, which is what Phosphor measured (Baudisch et al. 2006).

### E40 · Can a chart filter without reshuffling what was read?

A design review: `ChartFilter` was rendered as eight services filtered by team (with and without `rescale`), daily signups with weekends receding, two regions stacked over a year shown one quarter at a time, and a `BarList` of pages filtered by kind. In all four schemes at 960px, at 360px at 2×, and under forced colours. `checks/chart-filter.mjs` measures it.

- **Contrast, not height.** Relevance raises matches everywhere else in Altitude. A bar can't rise without leaving the ground line, so misses recede to 35% instead. That's two groups, the reading Research.md recommends for relevance anyway.
- **Each record owns its stretch.** Dimming a line by whole segments made a miss between two matches vanish into them. Each record now owns the stretch of x to the midpoints with its neighbours, drawn as one path clipped there, so the curve keeps its shape and the miss shows exactly where it is.
- **Seams.** Neighbouring stretches of an area met at fractional x, and the anti-aliased clip edges left faint vertical lines. Edges on whole pixels, with crisp clip rects, remove them.
- **The count is the answer.** "3 of 8 services match" is text in the frame and the summary, so the result never depends on seeing the fade.

Not yet tested with people: whether 35% is enough for misses to recede under the chart's own contrast. It's the value DataTable's misses approach, but marks are much smaller than rows.

### E41 · Can a mark promise a click without lifting?

A design review: `ChartSelect` was rendered as revenue by region that cross-filters a monthly chart, and bookings by quarter that drill into their months inside a `Drilldown`. In all four schemes at 960px, at 360px at 2×, under forced colours, with a mouse, the keyboard and touch. `checks/chart-select.mjs` measures it.

- **The outline is the promise.** Elsewhere, hover lifts what a click acts on. A bar can't lift without leaving the ground line, so a mark that acts gets a 2px `ink` outline in its own shape, the pointer cursor and the action in the readout. A chart whose marks don't act gets none of them. That's the exception the Charts chapter states.
- **Selection is a filter.** Selecting recedes the rest to 35%, exactly as `relevance` does (E40), so one visual language covers "filtered from elsewhere" and "chosen here". The frame says "Filtered to EU", because the receded marks alone don't say what the filter is.
- **Escape clears before it leaves.** On a point, Escape went back up a level. With a selection, it now clears the selection first, so a keyboard user can undo without losing their place.
- **Focus after a drill.** `Drilldown` focused its view before the new chart had measured itself, so the chart's summary didn't exist yet. It now focuses the view at once, then moves to the summary when it appears, within a few frames.

Not yet tested with people: whether the readout's "Select to filter" line is read before the click, or only noticed after it.

### E42 · Can a grid of values be read without a value axis?

A design review: `Heatmap` was rendered as a year of commits in a calendar, requests by weekday and hour with the table view, and error-rate change by service and region on a diverging scale with a cell you can select. In all four schemes at 960px, at 360px at 2×, under forced colours, with reduced motion and with `contrast="more"`, by pointer and keyboard. `checks/heatmap.mjs` measures it.

- **Steps you can name.** A continuous ramp makes every cell a slightly different colour that no legend can name. Binning into steps (after ColorBrewer's classes) makes "4–9" something to find in the legend, say in a cell's name ("step 3 of 4") and sort by in the table.
- **Steps spread over the ramp.** Small cells need bigger colour differences (Szafir), so steps take ramp tokens spread from `data-seq-1` to `data-seq-7` rather than adjacent ones: four steps are 1, 3, 5 and 7.
- **Ranges said once, signs said in words.** Formatted ranges repeated their unit and read "−3.0 pts–−1.5 pts", the en dash looking like a minus. A range now says its unit once and uses "to" between signed numbers ("−0.5 to +0.5 pts"). The open ends say "< −1.5 pts" and "≥ +1.5 pts", or "10+" for counts.
- **Diverging steps on round numbers.** The first default put the steps at half-steps, which a one-decimal format rounded to the wrong edges ("−0.3 to +0.3" for ±0.25). The edges are now whole multiples of a 1–2–5 step, three to a side.
- **Wrap, don't shrink.** At 360px 24 hourly columns ran out of the card, because a cell can't go below 10px. Both variants now wrap into bands (00–11 above 12–23, a year into three), each naming its rows and columns.
- **The crosshair is an outline.** A grid has no axis for a crosshair to run along, so the cell under the readout wears a 2px `ink` outline. It's not a promise: a static grid has no pointer cursor. Charts' rule 4 says so.
- **Cross-fade, don't glide.** The shared engine glides values, which would walk a cell's colour through every step between its old and new value. A heatmap takes new values at once and cross-fades each cell's fill.
- **Patterns for the steps.** Under forced colours every fill becomes the same, so each step adds a density (none, sparse dots, dense dots, hatching, crosshatch); a diverging scale hatches its two sides in opposite directions.

The issue asked for the WAI-ARIA grid pattern. The keyboard follows it (arrows, Home/End, Ctrl+Home/End, Page Up/Down), but the cells sit in the chart's one-Tab-stop path from the summary, as every chart's points do (E29), and say their row and column in their names rather than through `rowheader` and `columnheader` cells.

Not yet tested with people: whether a calendar's Page Up and Page Down by month are found without being told, and whether a wrapped grid's second band is read as a continuation of the first.

### E43 · Can two measures be read from flat dots?

A design review: `ScatterChart` was rendered as p95 latency against payload for 30 endpoints in three services, with a trend, two labelled outliers and a legend that toggles; and spend against seats for 16 customers, selectable, with the table view, gliding to the next month. In all four schemes at 960px, at 360px at 2×, under forced colours and with `contrast="more"`, by pointer and keyboard. `checks/scatter-chart.mjs` measures it.

- **A ring, not a shadow.** Overlapping dots are kept apart by a 2px ring of the plot's own colour, the gap a stacked bar has, rather than by a stroke in a darker shade or a drop shadow, which would read as height.
- **8px means every shape.** Squares and triangles drawn in a circle's 8px box measured 7.2px and 7.4px. They're now sized so their own box is at least 8px.
- **Both axes named.** With two measures, an axis of bare numbers ("0, 50, 100") says nothing. The first build named them inside the plot, where a dot near the top sat under "p95". They're now named in room the frame leaves above and below the plot.
- **Labels find room.** At 360px, neither upper corner of the top-left outlier was clear of the plot's edges and the label beside it, so its label was dropped. Each label now tries six spots, upper corners first, then beside, then below. The trend's word counts as taken.
- **Nearest, with a reach.** The pointer reads the nearest dot (its Voronoi cell) within 48px. Past that, nothing is read, rather than a far dot being named.
- **Enter starts at the left.** The keyboard path entered at the first record in the array, wherever it was on the plot. It now enters at the leftmost dot, and ← and → follow x.
- **Identity decides the motion.** A record's place in the array isn't an identity, so data without `id` cross-fades. With ids, dots glide on both axes: x joins the values the engine interpolates.

Not yet tested with people: whether ↑ and ↓ to the nearest dot above or below are predictable in a dense cloud, where "above" may land on a dot far to one side.

### E44 · Can one trench hold a range?

A design review: the range `Slider` was rendered as a price filter ($0–$200 in $5 steps, two steps apart) under the single-value sliders it extends. In all four schemes at 960px, at 360px at 2× and under forced colours, by pointer and keyboard. `checks/range-slider.mjs` measures it.

- **One trench, one fill.** Two sliders side by side read as two settings. Two thumbs in one trench, with the raised fill between them, read as one span, the build the DateRangePicker already uses.
- **The fill is a handle.** Dragging between the thumbs pans the window. Because it acts, it lifts to level 2 on hover and shows a grab cursor, the rule every control follows. Pressing it doesn't jump either thumb, so a pan never starts with a jump.
- **Only the thumb in hand floats.** The single slider lifts its thumb whenever the slider is hovered and floats it whenever it's dragged. With two, that floated both, and both bubbles showed, so neither said which value was changing. Now only the thumb under the pointer lifts and only the one held floats; a pan holds both.
- **A clash with possession.** The first build marked the held thumb with `data-held`, which is already the collaborator-hold attribute (**Possession**), and the thumb took its tilt and its position and jumped out of the trench. It's `data-grabbed` now.
- **Focus follows the press.** Pressing the track moved the nearer thumb but left focus on the page, because the browser's mousedown focused nothing after the slider had focused the thumb. The press now prevents that default, so the thumb that moved is the one the arrow keys move.
- **Thumbs that meet.** With `minStepsBetween={0}` the two thumbs can sit on one value, where the upper one covers the lower. The first move decides which one goes: left takes the lower thumb, right the upper.
- **Bounds in ARIA.** Each thumb's `aria-valuemin` and `aria-valuemax` stop at the other thumb less the gap, as the APG pattern says, so Home and End go to the thumb's own bounds, not the track's ends.

Not yet tested with people: whether the fill is found as something to drag without the hint text the preview gives, and whether two bubbles close together are read as a pair or as a clash.

### E45 · Can a brush look like something to drag?

A design review: `ChartBrush` was rendered under a year of daily active users, its window shared with a `DateRangePicker`, and under a year of weekly sign-ups as bars, keeping its own window. In all four schemes at 960px, at 360px at 2×, under forced colours and with reduced motion, by pointer and keyboard. `checks/chart-brush.mjs` measures it.

- **The range Slider, laid along the overview.** The brush is #73's range Slider: the same thumbs, the same "can't cross" rule, the same keys, and the same `useRange` logic underneath. Only the press outside differs: a slider moves the nearer thumb there, a brush centres the window there, because what you want in an overview is "show me that bit".
- **A line, not an area.** The issue asked for "a sparkline-sized area". From zero, a year of values that never come near zero was a flat ripple near the top of the trench. From its own low and high, an area would stand on nothing and misstate every value. So the overview is a line spanning its own low to high, as a `Sparkline`'s line is. It's there for the shape.
- **Bubbles below.** The grips' date bubbles first rose above the overview, as a slider's do, and covered the plot's x axis labels. They now hang below the trench, over the brush's own caption, which says the same dates. Near an end they align to it: at the start, the first build's bubble ran 5px past the chart's frame.
- **The records' own x values.** The window's `{ start, end }` are records' x values, not free dates, so a `DateRange` fits as it is and a brush and a picker can share one state. A date typed into the picker that isn't a record is still honoured: the chart shows the records between the two dates.
- **Evenly spaced by record.** The overview spaces records evenly and the grips step by a record. Over daily or weekly data that's the same as time; over irregular data the overview is distorted, but the grips never land between records.
- **The plot cross-fades.** The issue expected the main chart to glide. A new window means new x values under the marks, which Motion's rule 5 cross-fades rather than morphing, so a pan reads as the view changing rather than the data moving.

Not yet tested with people: whether the lens is grabbed as a whole on first sight, without the description the preview gives, and whether pressing the overview to centre the window there is ever found.

### E46 · Where does the result of removing an item go?

A measurement, then a design review ([#97](https://github.com/richlaconte/altitude/issues/97)). In the Actions in place Files example, Archive was clicked while every element's position was sampled each animation frame (`shoot.mjs` with `ACT`, Daylight, 960px). Before: the row was gone in the first frame and the rows below jumped up 77px; the recovery Alert appeared 172px below the click, under the list; and about 100ms later it grew 10px when "Archiving…" became "…is archived", moving everything under it a second time. `ItemGroup` measured the same way: its slats jumped 84px and its Undo Alert appeared under the add slot.

- **Left in place.** The result now shows in the row's own slot at the row's height. In the same measurement, nothing moves while it holds.
- **Then closed, visibly.** The receipt lifts off as an Alert does, and the gap glides shut over `dur-travel-3`; `checks/actions-in-place.mjs` (RR-02) asserts the next row passes through intermediate positions instead of jumping.
- **Undo where Archive was.** The first screenshot put View Archived under the pointer that had just clicked Archive, so a double-click would have navigated away. Undo now takes that place: a stray second click reverses instead.
- **A pointer over the list holds the close.** A delayed close could move the next row under a pointer reaching for it. The close waits while a mouse is over the list, capped at `dur-settle`; touch has no hover, so it doesn't wait.
- **`dur-linger` is 2000ms by judgement.** About four words read in roughly a second (Nielsen's 1s flow limit) plus a second to act; the top of the "second or two" asked for.

Not yet tested with people: whether the close is noticeable enough at `dur-travel-3`, and whether waiting for the pointer to leave the list reads as lag. Both are open in [the validation record](ActionsInPlaceValidation.md).

### E47 · Can a chart Altitude doesn't draw keep its rules?

A build, then a read-back ([#76](https://github.com/richlaconte/altitude/issues/76)). shadcn/ui's chart component, as published, over Recharts 3.10, set up as **Theming** says and rendered in all four schemes, each nested in a daylight page (`examples/shadcn-chart`, read by `build/checks/shadcn-chart.mjs`).

- **The palette carries over, if it's declared where the scheme is.** shadcn's configs name `var(--chart-1)` directly, so mapping Tailwind's `--color-chart-*` isn't enough. With `--chart-*` declared on `:root` only, the three nested panels drew daylight's colours (9 failures); on `:root, [data-theme]` every mark matched its panel's `data-*`.
- **Most rules are props.** The grid, ground line, flat marks, readout level, crosshair, keyboard path and reduced motion each map to a Recharts prop, and all read back correctly.
- **Two props are needed where shadcn's styles stop working.** Recharts 3.10 moved tick text out of the group `ChartContainer`'s selector targets, so ticks fell back to Recharts' grey until `tick` was passed; and the stylesheet's crosshair colour beats Recharts' `stroke` attribute, so only an inline `style` makes it `ink-muted`.
- **What doesn't carry is behaviour, not colour:** marks that act, legend switches, imprints and empty states, the table view, afterglows and patterns. These stay with Altitude's own charts.

### E48 · Can a chart library Altitude doesn't draw read the scheme?

A build and a read-back ([#77](https://github.com/richlaconte/altitude/issues/77)). `altitude-design/chart-themes` turns the computed tokens of an element into an ECharts theme and Chart.js defaults. It imports neither library, and its only import is React, for `useChartTheme`.

- **Read from the element, not copied.** A theme read inside a scheme or a custom accent is that scheme's. `build/checks/chart-themes.mjs` compares each scheme's theme with `tokens.json`, checks that tokens passed by name give the same object, and checks that `useChartTheme` re-reads after the provider's `scheme` and `accent` change (80 assertions).
- **Motion follows the provider.** `motion="reduced"` or `"full"` on `AltitudeProvider` overrides the system setting, as it does for Altitude's own components, because the theme reads `--alt-travel` rather than the media query alone.
- **ECharts takes the theme's `aria` without an option of its own.** Tried in Node against ECharts 6.1.0 (SSR, SVG renderer): the model's `aria.enabled` came from the theme, series used `data-1` and `data-2`, and `{ patterns: true }` rendered decal patterns. Chart.js 4.6.1 accepted the object through `Chart.defaults.set`. Neither library is a dependency, so CI doesn't repeat this.
- **Not vouched for:** keyboard paths and screen-reader output are the library's own. A theme can't keep the rules in **Charts** for anyone.

### E49 · Can ItemGroup leave its result where the slat was?

A measurement, as in E46, of [#100](https://github.com/richlaconte/altitude/issues/100): Daylight, 960px, the webhooks preview, with the slat below sampled every animation frame (`checks/item-group.mjs`).
- **Before.** At about 219ms the removed slat was gone and the slats below jumped 84px in one frame. The Undo Alert appeared under the add slot.
- **After.** From the click to Undo during the hold, the slat below doesn't move at all (IG-RR-03). Left alone, the receipt holds for `dur-linger`, and then the slat below passes through many positions as the gap glides shut (IG-RR-06).

Findings:
- **Undo moves twice, and each move is shown.** During the hold, Undo is where the slat was. After the close it's in a toast, which `ItemGroup` raises itself. The toast doesn't announce again (`announce: false`, new on `toast`), because the receipt already said “… is removed. Undo is available.”
- **Undo after the close glides the slot open.** Animating only the height made it jump the slat's padding (25px) before gliding. `RemovalReceipt` now opens and closes the whole box, padding, borders and margins included. Under StrictMode the opening ran twice, and the second run measured the first run's empty frame, so the slot stayed shut and then jumped. The opening is now cancelled on cleanup.
- **A confirmed removal glides shut** with no receipt, because there's nothing to undo and nothing to read.
- **Repeated words are still news.** Removing and restoring the same webhook twice left the polite status saying “Staging EU restored.” already, so the second restore was silent, and its focus repair waited for a render that never came. The status now clears before it speaks.

Not yet tested with people: whether Undo moving from the slot to a toast reads as the same Undo.

### E50 · How should a line removed while typing leave?

A design review and a measurement ([#101](https://github.com/richlaconte/altitude/issues/101)). In `Checklist`, removal happens only from the keyboard: Backspace on an empty line, or at the start of a line, which merges its text into the line above. Before, the line vanished in one frame, and a raised Undo bar was added after the list, which changed the page's height a second time.

- **No receipt.** E46's in-place receipt would sit between lines being typed, and its hold would delay the context the caret needs. Nothing was lost, so there's nothing to read. The line now glides shut over `dur-travel-2`. `checks/checklist.mjs` samples the line below every frame and sees it pass through several positions (CL-20, CL-21), with the caret already at the end of the line above (CL-23).
- **No bar.** Undo stays on Ctrl/Cmd+Z, and the announcement names it for the platform: “Empty item removed. Undo with Ctrl+Z.” (⌘Z on Apple). Pointer-only users of `onUndo` lose the bar, but they couldn't remove a line without a keyboard in the first place.
- **Found while testing.** Chromium reports `navigator.userAgentData.platform` as “macOS”, which a case-sensitive `/Mac/` test misses. Checklist's test is now case-insensitive. `InlineEdit` has the same test and the same gap.
- **The announcement is one at a time, the latest.** Saying the same words twice needs the status cleared first. Clearing it and speaking a frame later let a stale removal overwrite a newer “Indented under …”, so only the latest is spoken.

### E51 · How long should a save's afterglow last?

A design review ([#114](https://github.com/richlaconte/altitude/pull/114), the edit-in-place lab). `dur-settle` (8s) is sized for change detection: content that changed while someone looked elsewhere has to still be tinted when they look back (study 2 below). A save in `InlineEdit` or `EditRegion` is different: the person pressed Save and is watching the value, so the tint confirms rather than announces, and 8s of it read as lingering. Both now default to 5s, and `settleDuration` (ms) sets it per instance. The keyframes are unchanged, so the full tint still holds for the first 12% (600ms) before decaying. Other afterglows (an arriving row or card, a restored slat) keep `dur-settle`.

### E52 · Can a value be edited without moving?

A design review and a set of measurements, prototyped on a lab page ([#114](https://github.com/richlaconte/altitude/pull/114), [#115](https://github.com/richlaconte/altitude/pull/115)) before reaching the components. Before, opening `InlineEdit` swapped the value for a `Field`: its text moved 26px right and 43px down, the editor's 104px appeared in one frame, and a visible status line kept “Changes saved” under it. `EditRegion` moved its first value 30px right and 53px down (padding and labels arrived at once) and drew the finished card in its first frame, uncovered by a 220ms height animation over about 225px, which read as a box being revealed, not a record growing. Its afterglow filled an unpadded box, so it sat against the text.

- **The value lives in a slot with its control's inset and font.** `Input` and `Select` put their text 13px in (12px padding and a 1px border); the read slot does the same with a transparent border, and the line reaches 13px past its column so the text lines up with the page. Opening fades in only the well. Measured: 0px across and 1px down for a title, and that 1px is the focused well's own approach depth. No label is added above the value; it names the control for assistive technology.
- **One glide for every change of size.** The height animates on the real box (so what's below is pushed through the change, not jumped), at `dur-travel-3` up to 120px and a little longer per pixel beyond, capped at +140ms. It clips only at the moving bottom edge, and with `clip-path` rather than `overflow`: a `Select` opened mid-glide measured the clipped box, found no room below and opened its list off the top of the page. New parts fade in as the edge reaches them.
- **Nothing slides.** The prototype carried values from their read place to their field (FLIP) and grew wells sideways. In a record whose controls sat in a flex row, a growing well reflowed its neighbours every frame while they were also being carried, and the editor's contents visibly jumped about. Now each field takes its final place at once and holds it on every frame (`checks/edit-region.mjs` ER-26 compares them across frames). A field whose text lands where its value was simply appears; one that lands elsewhere fades in. Width grows only for InlineEdit's single slot, whose siblings don't depend on it.
- **Padding that's always there.** The editor's padding and border exist in read mode under a negative margin, so the lift is colour and shadow (ER-28: the box doesn't move), and the afterglow has room around the text.
- **Labelled rows reserve their height.** With `EditRegionValue reserve` the read value already has its control's height and inset, so Edit all moves nothing (ER-34: every value opens where it was) and only the actions row is added (ER-35).
- **Status is announced, never shown,** and clears itself after `dur-linger`. The afterglow is the visible confirmation.
- **Ways to open, and a sign at rest.** A pencil on hover and the field drawn on hover both move nothing (IP-06, IP-10); the field puts the caret where the click landed. Hover-only triggers need a resting sign, or people don't know to point. `hint="seam"` is drawn from the well's own edge: a hairline cut in `line-control` over the well's light lip, where the well will open. An underline would read as a link (followed, not opened), and a dashed underline as an abbreviation or a tooltip.

### E53 · What should a separator say?

A design review: `Separator` was rendered as a section divider in a card, between groups of toolbar buttons and as "or" between two ways to sign in, in all four schemes at 960px, under forced colours and with `contrast="more"`. `checks/separator.mjs` measures it.

- **Only `line`.** A divider is decorative ink on the ground, so it's 1px of `line` with no shadow. `line-control` is the edge of a control, and a toolbar separator drawn in it would sit next to button edges in the same ink; it's used only under `contrast="more"`.
- **A labelled separator isn't `role="separator"`.** A separator's children are presentational ([WAI-ARIA 1.2, separator](https://www.w3.org/TR/wai-aria-1.2/#separator)), so "or" inside one is not reliably read. The word is plain text and the lines are pseudo-elements, so "Continue with SSO, or, Email address" reads in order.
- **Decorative is opt-in.** A screen reader announcing every divider is noise, but a divider that parts unrelated content is information. Defaulting to `role="separator"` keeps the information, and `decorative` is one prop for the toolbar case.

Not yet tested with people: whether a labelled "or" is clearer than a heading above the second option.

### E54 · Should a link lift?

A design review: `Link` was rendered in prose, as an external link, and as "View all invoices →" through a router element (`asChild`), in all four schemes at 960px, under forced colours and with `contrast="more"`. `checks/link.mjs` measures it.

- **No lift.** Everything else that acts lifts one level on hover, but a link in a paragraph would have to leave its own baseline to do it, and height means "press it", which is a button's job. So a link stays on the ground, and the underline (1px → 2px) is its hover. The check confirms its box doesn't move.
- **Underline always.** [WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color) wants a link in text told apart by more than colour (or by 3:1 against the text around it, which no scheme's `accent-ink` was chosen for), so the underline is never removed, even for a standalone link.
- **New tabs are said.** An external link announces "(opens in a new tab)" ([WCAG G201](https://www.w3.org/WAI/WCAG22/Techniques/general/G201)) and shows an icon. The text is visually hidden, so the link reads as written.

Not yet tested with people: whether the thicker underline on hover is noticed without a colour change.

### E55 · How should a number in a sentence change?

A design review: `FormattedNumber` was rendered in every preset (currency in minor units, bytes, durations, percent, compact) in a definition list and inside a sentence whose value changes, in all four schemes at 960px, under forced colours and with reduced motion. `checks/formatted-number.mjs` measures it.

- **A tint, not the afterglow's lift.** `Stat` takes the full afterglow, a lift with `elev-2`. Inside a sentence the shadow would land on the line below, so a number takes only the tint (`accent-soft` decaying over `dur-settle`), as a live chart's "Updated" caption does.
- **Cross-fade over `dur-travel-2`, not `dur-hover`.** The issue proposed `dur-hover`, but that token is 1800ms (it paces a pending write's hover). `Stat`'s `dur-travel-2` keeps the two consistent.
- **Spoken units, not `aria-label`.** `<data>` has the generic role, which can't be named ([WAI-ARIA 1.2, generic](https://www.w3.org/TR/wai-aria-1.2/#generic)), so the words ("4.5 gigabytes") are visually hidden text and the symbol is hidden from assistive technology.
- **Currency in minor units by default,** as the issue's sketch has it and as payment APIs (Stripe, Adyen) send amounts. The divisor comes from the currency, so JPY isn't divided. `minorUnits={false}` takes whole units.

Not yet tested with people: whether "4.5 GB" with the exact bytes in a tooltip is enough, or tables want the exact value shown.

### E56 · Is time passing a change?

A design review: `RelativeTime` was rendered in an activity feed reaching from seconds to 40 days back (`format="auto"`) and as "Last edited" on a card that can be edited again, in all four schemes at 960px and under forced colours. `checks/relative-time.mjs` measures it with a clock it controls.

- **Ticking is not a change.** The afterglow says "this is new". If every timestamp glowed as it ticked, a feed would shimmer every few seconds, and the glow would mean nothing. Only a new moment glows.
- **One timer, paused while hidden.** Each instance with its own interval adds up in a long feed. One shared 15-second timer refreshes them all. It stops while the page is hidden and catches up when it's shown, so a tab left open overnight doesn't show "2 minutes ago".
- **"now" and "yesterday".** `numeric: "auto"` gives the locale's own words for the nearest units, and seconds under 45 are "now". A count of seconds that changes on every tick is noise.
- **Focusable only for its tooltip.** A tab stop on every timestamp is costly in a feed, but keyboard users must reach the exact time where it matters, so the tab stop comes with the tooltip and goes with `tooltip={false}`, which falls back to `title`.

Not yet tested with people: whether 15 seconds is fresh enough for "now" in a chat-like feed.

### E57 · How should a copy confirm itself?

A design review: `CopyButton` was rendered icon-only beside an API key, as a secondary "Copy invite link", and failing on purpose, in all four schemes at 960px and under forced colours, and pressed with the pointer and the keyboard. `checks/copy-button.mjs` measures it with a stubbed clipboard.

- **Pressed, not glowing.** The afterglow means new content arrived, and a copy adds nothing to the page. The confirmation is where the hand is: the button stays pressed for `dur-linger` with a check and the word. A toast for a two-second event would draw the eye away from the value just copied.
- **The name doesn't change.** Renaming a focused button makes some screen readers re-announce it as a new control. The button keeps its name (`label`, or its text as `aria-label` while it says "Copied"), and a polite status region outside the button says what happened.
- **Its width doesn't change.** "Copied" is shorter than "Copy invite link" and "Couldn't copy" may be longer, so every label shares one cell, the fix #116 made for HoldButton.
- **A failure says what to do.** Clipboard writes fail in insecure contexts and under permission policies. After the fallback (a selected hidden textarea and the copy command) fails, it announces how to copy by hand with the platform's shortcut.

Not yet tested with people: whether two seconds is long enough to notice "Copied" on an icon-only button.

### E58 · How should a latched button look when it's on?

A design review: `Toggle` and `ToggleGroup` were rendered as a formatting bar (multiple), a view switch (single), "Show archived" (secondary) and a thumbs up/down vote, in all four schemes at 960px, under forced colours and with `contrast="more"`. `checks/toggle.mjs` measures them.

- **Sunk and filled, not held at ground.** "Pressing returns to ground; loading holds it there", so an on button drawn flush at ground level reads as a button still loading, which is the ambiguity the issue raised. On is a choice, so it borrows the Switch's build: a shallow well with `accent-soft` poured in and the label in `accent-ink`. That keeps "push up, fill down" (an on toggle is filled, not pressed), and it's the one stated exception to "never style a button as sunk". The alternative, a ground-level face with an accent bar, was rejected without being built: it puts a status-like bar on a control.
- **Single choice is segmented Tabs.** A view switch without panels is the same choice as segmented `Tabs`, so it uses the same classes (a well and one gliding pill) and is a radio group, where arrows move and choose.
- **One tab stop.** A 3-button formatting group costs one Tab, not three. Focus returns to the item you left, and inside a `Toolbar` the group leaves the arrow keys to the bar (shared roving focus).
- **The name doesn't change.** "Bold" stays "Bold" with `aria-pressed`. Renaming to "Unbold" makes the state ambiguous ([APG, button](https://www.w3.org/WAI/ARIA/apg/patterns/button/)).

Not yet tested with people: whether a sunk, tinted toggle is read as "on" as quickly as a raised, tinted one.

### E59 · What should a toolbar do when it runs out of room?

A design review: `Toolbar` was rendered as a seven-tool formatting bar (a ToggleGroup, a group with a ToolbarToggle, and a link button) at full width and squeezed to 260px with `overflow="menu"`, in all four schemes and under forced colours. `checks/toolbar.mjs` measures it.

- **Hide from the end, into a menu.** Wrapping onto a second row moves the tools you know into new places, and a horizontally scrolling bar hides them with no sign. The menu keeps every visible tool where it was and puts the rest in one predictable place. Hidden tools don't animate as they go: a resize isn't an event.
- **Toggles stay toggles in the menu.** A latched tool moved into the menu becomes a `menuitemcheckbox` with a check, so its state survives the move. `DropdownMenu` gained `checked` for this.
- **One tab stop, shared with ToggleGroup.** The bar and any ToggleGroup in it share one roving-focus hook, so a group inside the bar adds no tab stop of its own.
- **No separator at the edge.** A row that ends in a divider reads as if something is missing after it, so a trailing separator goes into the menu with what follows it.

Not yet tested with people: whether "More tools" is found as readily as a wrapped second row.

### E60 · One slab or two?

A design review: `SplitButton` was rendered as a primary "Save changes", a secondary "Merge" and a secondary "Deploy" that loads, in all four schemes at 960px and under forced colours, and hovered face by face. `checks/split-button.mjs` measures it.

- **One wall, two faces.** A `Button` and a chevron `Button` placed side by side have two walls and two rounded ends, and read as two actions of equal weight. Squaring the inner corners and running one wall under both faces makes one object with a notch.
- **Each face lifts alone.** The faces do different things (act, open a menu), so "hover is a promise" applies to each. Lifting both together would promise that pointing at the chevron saves.
- **The notch on an accent slab.** `line-control` is tuned for neutral surfaces and nearly vanishes on a saturated accent, so the notch on a primary slab mixes `on-accent` into the accent. That's derived from the scheme's tokens, not a new colour.
- **Loading doesn't take the menu.** A held-pressed action face keeps its label, and the chevron stays usable, so "Deploy to production" is still reachable while staging deploys.

Not yet tested with people: whether Alt+Down on the action is discovered without being taught.

### E61 · Where do a number field's steppers go?

A design review: `NumberInput` was rendered for seats (1–500), days (a unit), a price in `de-DE` euros and a percentage, empty and filled, in all four schemes at 960px, under forced colours and with `contrast="more"`. `checks/number-input.mjs` types, steps and pastes into them.

- **Slabs in the end cap.** The field is an opening and the steppers are things you press, so they're raised (level 1, 1px wall) inside the well's end cap. A sunk stepper would read as another field, and "push up, fill down" says why that's wrong. At a limit a stepper lies flush and faint, as a disabled button does.
- **Clamp when committed, not while typing.** Clamping each keystroke turns "12" into "1" then "12" in a field whose minimum is 10. The value is clamped on blur, Enter or a step, which keeps it in range without fighting the typing.
- **The locale's own separators.** `<input type="number">` refuses "1,5" in German and takes "1.000" as one. Parsing uses `Intl.NumberFormat`'s own group and decimal signs, so "1.250,50" is 1250.5 in `de-DE`.
- **No scroll-wheel accidents.** A page scroll over a number field changes its value in some browsers. The wheel steps only when `wheel` is set and the field is focused.

Not yet tested with people: whether 15px-tall steppers are large enough on touch screens, where people type instead.

### E62 · Six inputs or one?

A design review: `InputOTP` was rendered with six digits in two groups and eight alphanumeric characters, empty, partly filled, focused by keyboard, rejected and verifying, in all four schemes at 960px and under forced colours. `checks/input-otp.mjs` types, pastes and deletes in it.

- **One input.** Hand-rolled code fields often use one input per character, which breaks SMS autofill (`autocomplete="one-time-code"` fills one field), splits a pasted code, and makes a screen reader announce six unlabelled fields. One invisible input over the row keeps all three working, and the slots are drawn from its value.
- **Completeness per slot.** The Input rule (an empty field shows its back wall, a filled one rises flush) applied to each character shows progress through the code without a counter.
- **Filter, don't refuse.** Codes arrive formatted ("123-456", "123 456"). Dropping characters that don't match the pattern accepts both, where a strict `pattern` attribute would reject the paste.
- **Rejection keeps the code.** The row drops to a trench and stays filled, so a single mistyped digit can be corrected rather than retyped.

Not yet tested with people: whether the staggered fill on paste is noticed, or read as lag.

### E63 · When is a time complete?

A design review: `TimeInput` was rendered on a 12-hour clock with a time zone, on a 24-hour clock empty, and with a range it was outside, in all four schemes at 960px and under forced colours. `checks/time-input.mjs` types into it.

- **Whole or not at all.** "09:––" can't be scheduled, so it isn't a value: the field stays an opening and the value stays null until hour, minute (and AM/PM) are all there. That's the DatePicker's rule, and the two fields read the same in a form.
- **Typed by segment, not picked.** A list of 96 quarter hours is slower than typing "930p", and the native time input renders differently in every browser and ignores the scheme. The segments reuse DatePicker's, so typing, arrows and Backspace behave identically.
- **The value is always 24-hour.** Whatever the clock shows, the value is "HH:mm" from 00:00 to 23:59, so an app never parses "9:30 PM".
- **The zone is a label, not a conversion.** Converting a wall time across zones needs a date (daylight saving), which a time of day doesn't have. The short name tells people which zone the time is in, and the app does any converting.

Not yet tested with people: whether auto-advance after one digit ("9" moves on) surprises people who meant to type "09".

### E64 · Is a password's strength a task or a reading?

A design review: `PasswordInput` was rendered for signing in and for creating a password with a strength meter and two requirements, in all four schemes at 960px and under forced colours, typed into with Caps Lock on and off. `checks/password-input.mjs` measures it.

- **A reading.** Strength bars are usually drawn as progress, which says "keep going and you'll finish". Strength is a judgement of what's there, so it's a `Meter`: flat ink in a flush track, with the word beside it. That's the Charts rule applied outside a chart.
- **No caution colour.** The issue proposed `caution` and `positive` fills past thresholds. Meter's thresholds mean higher is worse (quotas, load), and a fill that turns caution as strength rises would say the opposite. The word carries the meaning, and the fill stays neutral.
- **Announce when typing pauses.** A live region that speaks on every key talks over the typing. Strength and unmet rules are said 0.9s after the last key.
- **The reveal toggle keeps its name.** "Show password" with `aria-pressed`, not "Show" becoming "Hide", is the Toggle rule (E58). Focus stays on the toggle, so revealing doesn't move the caret or the reading position.

Not yet tested with people: whether "Good" is read as good enough, or as a hint to keep going.

### E65 · How should a secret shown once read?

A design review: `SecretField` was rendered as a just-created API key in a card whose Done button waits for it, and as a stored webhook secret with reveal, rotate and revoke, in all four schemes at 960px and under forced colours. `checks/secret-field.mjs` measures it.

- **Completeness, inverted.** A field normally fills when it holds a value. A new secret holds its value from the start, but the task isn't done until the person has taken it away. So it stays a sunk well with its back wall showing until they confirm, and then it fills flush and masks. The depth says "something is still owed here".
- **The prefix stays.** Masking `ak_live_EXAMPLE…4f2a` to "••••4f2a" loses which kind of key it is. A new secret keeps its own prefix ("ak_live_") when it masks.
- **Bullets aren't read.** A screen reader reading "bullet bullet bullet bullet 4 f 2 a" is noise. A masked secret is announced as "Secret key, ending in 4f2a".
- **Focus doesn't fall to the page.** Checking "I've saved this key" removes the checkbox, so focus moves to the sentence that replaces it rather than to the top of the document.

Not yet tested with people: whether the sunk well alone, without the checkbox, makes people copy the key before leaving.

### E66 · Is a code block a card?

A design review: `CodeBlock` was rendered as an install command in three forms, a JSON payload with two highlighted lines, line numbers and a scroll, and code streaming in with a stand-in highlighter, in all four schemes at 960px and under forced colours. `checks/code-block.mjs` measures it.

- **Flush, not raised.** Code blocks are often drawn as dark raised cards. A card is a live surface, and code you read and copy is part of the record, so it lies flush with a `line` rim. The copy button and the form switch are the only live parts.
- **Bring your own highlighter.** Bundling one (Shiki is several hundred KB with grammars) would dwarf the rest of the package. `syntax` takes any function, and the default token colours stay within ink and the accent, because the data palette means series.
- **A region only when it scrolls.** A tab stop on every code block costs keyboard users in a docs page. The scroll area becomes focusable and named only when it overflows ([WCAG 2.1.1](https://www.w3.org/WAI/WCAG22/Understanding/keyboard)).
- **Not copyable while writing.** Copying half a command an agent is still writing is worse than waiting, so copy is disabled while `streaming`.

Not yet tested with people: whether a dashed left rule reads as "still arriving" without the caption.

### E67 · How should a colour be chosen, and checked?

A design review: `ColorPicker` was rendered with six brand swatches, a hex field, the full picker open and the contrast check, and with four label swatches beside a primary button in the chosen accent, in all four schemes at 960px and under forced colours. `checks/color-picker.mjs` measures it.

- **Swatches are radios.** A palette is one choice among several, so it's RadioGroup's build: trenches the colour pours into, one raised white mark that travels. The issue proposed this, and it keeps "choices are switches" true for colour too.
- **Two verdicts, not one.** The issue's single "Text passes 4.5:1" check almost never fails: for any colour, either white or black text reaches about 4.6:1. What a brand owner needs to know is which text works, so each gets its own plate. The issue's teal, for example, fails with white text (4.3:1) and passes with dark text (4.8:1).
- **Names before colour.** Every swatch is named and announced. Under forced colours a swatch keeps its real colour, because the colour is the content, with a border whose weight marks the chosen one.
- **A hex field that fills only when whole.** "0f8a" isn't a colour, so the field stays an opening (as TimeInput and DatePicker do) and reverts to the last colour on blur.

Not yet tested with people: whether the 2D area is needed at all, or the hex field and swatches cover brand use.

### E68 · Can the staircase leave Drilldown?

A design review: `Breadcrumb` was rendered for a three-step path and a six-step path collapsed to four, through a router element, in all four schemes at 960px and under forced colours, beside `Drilldown`. `checks/breadcrumb.mjs` measures it, and `approach-and-lamps.mjs` still checks Drilldown's steps.

- **One staircase.** Drilldown's step is extracted (`CrumbStep`) and both components use it, so the two can't drift. The CSS now targets `.alt-crumb-link`, so a step can be a button (Drilldown), a link or a router's element.
- **No pile and no rise.** Drilldown lays a sheet on a pile as you go deeper, and its new step rises out of the ground. A route change isn't you carrying something deeper, and it happens on every navigation, so Breadcrumb re-renders without motion.
- **No separators.** Height already says "deeper". A chevron between steps would say it twice and cost width.
- **Keep the ends.** Collapsing a deep path keeps the root (where you can always go) and the nearest steps (where you usually go), with the middle in a menu.

Not yet tested with people: whether a staircase is read as a path in a route-based app as readily as it is in Drilldown, where you built it yourself.

### E69 · Should pages look like a choice?

A design review: `Pagination` was rendered with 11 pages and a summary, and in cursor mode, in all four schemes at 960px and 360px and under forced colours, and paged by pointer and keyboard. `checks/pagination.mjs` measures it.

- **A thumb, not a row of buttons.** Numbered page buttons each promise an action. The current page is a position among the others, which is RadioGroup's reading: one raised thumb in a trench. It travels on `dur-travel-1`, faster than RadioGroup's thumb, because paging is frequent.
- **Links in Tab order, despite the look.** Drawing them like a radio group could suggest arrow keys, but pages are navigation, often with URLs, so they keep link semantics and plain Tab order, as the issue proposed.
- **One page, not "…".** A gap of exactly one page shows the page: "…" would take as much room and hide where it leads.
- **Held while loading.** "Loading: held pressed" applied to the thumb shows that the request is in flight without a spinner, and the rows land as DataTable's do.

Not yet tested with people: whether the thumb is read as "current page" as quickly as a filled, coloured button.

### E70 · Can a header make law 1 structural?

A design review: `PageHeader` was rendered with a breadcrumb, a primary, a secondary, an overflow menu and segmented tabs, sticky inside a scrolling page, in all four schemes at 960px and 360px and under forced colours. `checks/page-header.mjs` measures it.

- **One slot.** Pages assembled by hand often end up with two or three primary buttons in the header, which breaks law 1. A `primary` prop that takes one element, and a development warning when a primary button is put among the other actions, make the law the easy path.
- **The primary last.** The primary sits at the end of the row, nearest the reading edge and furthest from the breadcrumb, so it's where the eye lands after the title.
- **Rise only while covered.** A header raised all the time would be a card on top of the page. It lies on the ground and rises one level only while content passes under it, as ScrollArea's header does, through an IntersectionObserver sentinel rather than a scroll listener.
- **Reach through the padding.** A sticky header's rise that stops at the page's padding looks like a floating strip. `--alt-page-pad` lets it span the page.

Not yet tested with people: whether the overflow menu between the secondary and the primary hides actions people look for.

### E71 · Is the current page a live surface?

A design review: `AppShell` was rendered with a workspace switcher, two groups (one collapsible), a count, a footer user and a page with a `PageHeader`, expanded, collapsed to a rail and as a drawer at 360px, in all four schemes and under forced colours. `checks/app-shell.mjs` measures it.

- **A raised pill, as the issue proposed.** "Selected: raised out of its well" was written for choices inside a control, and the issue asked for a comparison with a flush plate and an accent bar. The pill keeps navigation in the Tabs family (one raised mark that travels between options), and its glide shows where you went. The accent bar was not built: a coloured bar on a destination reads as status.
- **The frame stays on the ground.** Sidebars are often floated as raised cards. A frame that's always there is the record of where you can go, so it lies flush, divided by lines, and only what acts lifts.
- **The rail's tooltips go right.** Above, a tooltip covers the icon over it. Tooltip gained `side="right"`, and the rail lets its tooltips out past its edge.
- **One measurement path.** The pill is measured when `aria-current` moves (a MutationObserver) or the sidebar resizes, not after every render. An after-every-render measurement fed back into React's updates in this tree, and hit React's update-depth limit on navigation.

Not yet tested with people: whether a rail of icons with tooltips is learnable without the expanded labels.

### E72 · Should a detail pane lift?

A design review: `Resizable` was rendered as a list and detail at 35/65, dragged, resized by keyboard and collapsed, in all four schemes at 960px and under forced colours. `checks/resizable.mjs` measures it.

- **Panes stay on the ground.** A detail pane is often drawn as a raised panel. A pane that's always there beside its list is part of the page, and raising it would make it read as a Sheet (a task laid over the page) or a card. Only the grip, which you pick up, uses height.
- **The grip floats while held.** "Whatever is in a hand floats at level 3" applies to a divider you carry, so the grip rises from 1 to 3 on press, as a sortable item does.
- **Enter collapses.** The APG window splitter puts collapse on Enter. A collapsed pane is inert and the handle says so in words, so keyboard users can't tab into content they can't see.
- **Percent sizes.** Sizes are percentages of the group, so a layout saved at one window width still fits another.

Not yet tested with people: whether an 8px-wide grip is found without a hover.

### E73 · What marks the thing a context menu is about?

A design review: `ContextMenu` was rendered on rows of a file list, each with a "⋯" menu of the same actions, opened by right-click, by Shift+F10 and by a long press, in all four schemes and under forced colours. `checks/context-menu.mjs` measures it.

- **A ring, not a lift.** The thing must show it's the subject, and lifting is how Altitude usually says "this one". But a row lifted out of a table breaks the columns (the reason DataTable's details open flush). A 2px `accent-ink` outline is DataGrid's active-cell ring, and works on any surface.
- **One menu implementation.** DropdownMenu's panel (items, highlight, keyboard, choosing) is now a shared internal `MenuPanel`, and ContextMenu positions it at the pointer in a portal. The two can't drift.
- **No submenus.** The issue sketched "Move to…" with nested items. That's floating on floating, which the rules forbid, and nested menus are a known keyboard and pointer trap. A long choice opens a Dialog.
- **Keyboard first-class.** Shift+F10 and the Menu key open it at the thing with the first item active. The thing must be focusable for that, so the README says so.

Not yet tested with people: whether the outline is noticed when the menu covers most of the row.

### E74 · Does a page banner need a new reading?

A design review: `Alert placement="page"` was rendered as a raised "trial ends" banner with an action and a worded dismiss, and a flat "email delays" banner, across the top of a page, in all four schemes at 960px and 360px and under forced colours. `checks/alert-banner.mjs` measures it.

- **No new tier.** A banner is status at page scope, so the existing Alert rule holds: informing is a flat sheet (ground) and asking for action is raised. Only the shape changes: edge to edge, no side rounding, and only a bottom edge and contact shadow, because a sheet laid across the whole width has no sides to show.
- **A region, so it can be skipped.** A banner repeated on every page is in the way for screen reader users, so it's a region named by its title.
- **Focus goes to the page.** Dismissing removes the button that had focus. Focus moves to `main` rather than to the top of the document.
- **Worded dismiss.** "Remind me tomorrow" says what dismissing does, where an × would suggest the notice is gone for good.

Not yet tested with people: whether a raised banner is read as more urgent than a flat one at the very top of an app.

### E75 · How do you mark a whole app as different?

A design review: `AltitudeProvider mode` was rendered as test mode over a dashboard, with a Dialog open, in all four schemes at 960px, under forced colours and with `contrast="more"`. `checks/app-mode.mjs` measures it.

- **Words and a border, as the issue proposed.** Height means "this matters now" relative to the page, and a mode changes the page itself, so there's no ground left to rise from. The ruling: a mode is the one state carried primarily by the non-height cues (law 7), and Elevation.md states it as a rule.
- **A frame that can't scroll away.** Coloured strips at the top of an app scroll away and get ignored. The 2px frame is fixed to the viewport and sits above dialogs and sheets, so the mode is in view at the moment of a consequential action.
- **The dialog names it too.** A confirmation in test mode ("Refund this payment?") carries a "Test mode" plate, because the dialog's scrim dims the strip.
- **Not dismissable.** A mode you can hide is a mode you can forget, so the strip has only your way out (`action`).

Not yet tested with people: whether the frame alone, without the strip in view, is recognised as "test mode" by people new to the app.

### E76 · Can law 1 be checked?

An engineering review: two primaries on a page, one on a page plus one in a Dialog, two in separate `PrimaryScope`s, one hidden, and the check switched off, rendered in a preview page. `checks/primary-scope.mjs` counts the warnings.

- **Count what's visible, per view.** A page commonly holds primaries it isn't showing (a closed tab panel, a collapsed section). Only visible primaries count, and each Dialog, Sheet and Popover is its own view, because only one of them is in front at a time.
- **One warning per arrangement.** A warning that repeats on every render is ignored, so each scope warns once per set of names, and the warning names the buttons so they can be found.
- **Off in the design system's own build.** The IIFE bundle has no `process.env`, so the check is on only where a bundler says it's development (or with `devChecks`). That keeps the previews, which fail on any console warning, honest about real warnings.
- **An explicit opt-out.** Dashboards of independent cards each have a legitimate primary. `PrimaryScope` says so in the code, which is clearer than a global switch.

Not yet tested with people: whether agents reliably move the second primary into `actions` when they see the warning.

### E77 · Should a column appearing animate?

A design review: `DataTable columnsMenu` was rendered in the Table preview with the menu open, columns hidden and reordered, and compact rows, in all four schemes and under forced colours. `checks/table-columns.mjs` measures it.

- **No motion for layout.** Rows glide when they're re-sorted, because the record moved. A column appearing or leaving changes how the record is laid out, not the record, so the table re-lays out at once.
- **Reuse, not a new control.** The menu is a Popover with a SortableList of Checkboxes and a ToggleGroup: every part already has its elevation and keyboard model, so the menu needed none of its own.
- **The first column stays.** A row without its name column can't be read or acted on, so the first column in order can't be hidden, and its checkbox says so by being disabled.
- **Compact stays 24px.** Compact density trims row padding to 4px, which keeps 28px rows and 24px targets.

Not yet tested with people: whether the "· 3 hidden" count is enough to find hidden columns again.

### E78 · What do rows do while the next page loads?

A design review: `DataTable pagination` was rendered paging 214 invoices eight at a time and loading 46 events six at a time, mid-load and loaded, in all four schemes. `checks/table-paging.mjs` measures it.

- **Half strength, not an imprint.** Replacing the rows with skeletons on every page change throws away what people were reading and moves their eyes. Keeping them on the ground at half strength, as a refetching chart does, says "these are about to change" and keeps the layout still.
- **The thumb is held pressed.** "Loading: held pressed" applied to Pagination's thumb puts the in-flight state where the hand just was.
- **Appended rows glow, staggered.** Rows from "Load more" are new to the page, so they take the afterglow, and riseDelay keeps at most four starting at once.
- **The range is the announcement.** "6 more loaded, 12 of 46" says what happened and where you are, which "Loading complete" doesn't.

Not yet tested with people: whether half strength is read as "loading" without a spinner.

### E79 · Where do bulk actions go when the selection is "all matching"?

A design review: `DataTable` was rendered with 25 loaded rows of 2,341 matching, the page selected, "all matching" selected with one exception, and scrolled until the toolbar was gone, in all four schemes. `checks/table-bulk.mjs` measures it.

- **A query, not a list.** "Select all 2,341" can't mean 2,341 ids the browser has never seen. The selection becomes `{ kind: 'query', total, except }`, which an API can act on directly, the flow Gmail, Linear and Shopify's Polaris share.
- **Said in words.** "All 2,341 matching, except 1" says exactly what an action will touch. A count alone ("2,340") hides that it's a query.
- **The bar floats at level 3.** A large selection is something in your hand while you scroll, and "whatever is in a hand floats". In `auto` it floats only once the toolbar is out of view, so it never covers rows needlessly.
- **The offer is flush.** "Select all matching" is information with a link, not an action asking to be taken, so it's a flush `accent-soft` row, not a raised banner.

Not yet tested with people: whether "except 1" is noticed before a destructive bulk action.

### E80 · What is a view, and when is it modified?

A design review: `SavedViews` was rendered over a FilterBar and a DataTable with three views, switched, modified (a sort and a filter changed), saved, saved as new and reset, in all four schemes. `checks/saved-views.mjs` measures it.

- **A view is the combination.** Filters, their match, the sort and the columns change together, so the hook holds them as one draft per view and spreads them onto FilterBar and DataTable. Agent-built versions usually store some of these and forget the rest.
- **A draft per view.** Switching tabs shouldn't throw away a change you were making, so each view keeps its draft until it's saved or reset.
- **Folder tabs, as the issue said.** The views own the table beneath them, so the active tab and the sheet holding the filters and table are one raised piece. The actions sit beside the list, not inside it, because a tab list may hold only tabs.
- **Modified is a word and a dot.** It's announced once, when the view first diverges, not on every change.

Not yet tested with people: whether "Save view" over a shared view needs a confirmation.

### E81 · What does each stage of an upload look like?

A design review: `DropZone queue` was rendered with files uploading, processing, done and failed (with Retry), in all four schemes at 960px and 360px and under forced colours. `checks/dropzone-queue.mjs` drives a queue through every state.

- **Four stages, four existing readings.** Uploading is a task moving toward done, so it's `Progress`. Processing is a write the server hasn't confirmed, so it hovers as pending (after `dur-grace`, so fast steps don't flicker). Done is committed, so it lands and settles. Failed drops to a trench. No new signal was needed, which is the point of the vocabulary.
- **Coarse announcements.** Announcing every percent floods a screen reader, so progress is said at quarters, plus the changes of stage.
- **Every button names its file.** In a list of five uploads, "Retry" alone is ambiguous, so each action's name includes the file.

Not yet tested with people: whether the pending hover is read as "the server is working" rather than as a hover effect.

### E82 · How deep should a filter go?

A design review: `FilterBar nesting={2}` was rendered with "Plan is Pro and any of: Country is Germany, Seats > 50" over a table filtered in place, a group added and removed, in all four schemes and under forced colours. `checks/filter-groups.mjs` measures it.

- **A bracket, not a card.** A group could be a raised panel, but it doesn't act: it's part of the query's record. A flush 1px `line-control` rule groups its conditions as brackets do in writing.
- **One level.** Rule builders that nest without limit turn into code editors with boxes. Real segments almost never need more than "A and (B or C)", so groups go one level deep.
- **Composition over a new model.** Each group is a FilterBar of its own (its conditions, its all/any, its Add filter), so the keyboard model, pickers and announcements are the ones FilterBar already has.
- **The sentence.** `filterSentence` reads the whole tree ("… and any of: …"), so screen reader users and summaries get the logic, not just a count.

Not yet tested with people: whether "any of" groups are understood without an "or" between their conditions.

### E83 · Should past events be cards?

A design review: `Timeline` was rendered with events from today and yesterday, one linking, one with detail open, and a comment you made landing and failing, in all four schemes and under forced colours. `checks/timeline.mjs` measures it.

- **Flush, on an upright ground line.** Activity feeds are often lists of raised cards, which claims every past event is live. A history is the record, so its events are flush entries on the same ground line Stepper and charts stand on, turned upright.
- **Only what's new or yours moves.** New events take the afterglow, staggered. An event you caused hovers as a pending write until it lands. A failure drops to a trench without the afterglow's tint, because a failure isn't news to celebrate.
- **Detail as a lid.** Detail opens as a raised card (the Accordion's lid), because opening it is something you did, unlike the events themselves.
- **One sentence each.** Each event is a sentence with its time, so a screen reader can read the list without the line or markers.

Not yet tested with people: whether day headings help or slow scanning in a busy feed.

### E84 · Is unread a height?

A design review: `NotificationCenter` was rendered with unread and read notifications over two days, one with an action, opened, marked read and receiving a new notification, in all four schemes, at 360px (a bottom Sheet) and under forced colours. `checks/notifications.mjs` measures it.

- **Unread is a mark.** Inboxes often keep unread items tinted or raised until they're read. That makes height mean "unread", a persistent state, which breaks "tiers carry meaning". Unread is an accent dot, weight 600 and "Unread" in the name; the item settles like anything else. Elevation.md's "States that don't rise" now points here.
- **Only the count floats.** The bell is a ghost button; its count is the one thing on it that wants you, so it floats, as in a Sidebar.
- **Announced while closed.** New notifications are announced, batched, from outside the panel, so they're heard without opening it.
- **Opening one reads it.** Following an item marks it read and closes the panel, which is what people expect and saves a click.

Not yet tested with people: whether the dot alone is noticed in a long list, without the tint people are used to.

### E85 · How should "saved" be said?

A design review: `SyncIndicator` was rendered saving, saved, offline with changes waiting (the queue open), failed and in conflict, beside an autosaving textarea, in all four schemes and under forced colours. `checks/sync-indicator.mjs` measures it.

- **A label, not a light show.** The state is a label at document scope, so it's a Badge plate whose lamp relights on change. Nothing rises, because a state change isn't new content, and the words carry the meaning in every mode.
- **One vocabulary, two scopes.** Items waiting to sync hover as pending, the commitment signal; the plate says the same thing for the whole document, so the two never disagree.
- **Announce without chatter.** An autosave that announces "Saving… Saved" on every keystroke is noise. "Saved" is said at most every five seconds and "Saving" never; going offline and failures are said at once, because they change what people should do.
- **The queue is a door.** Offline, the plate counts what's waiting and opens the list, so "3 changes waiting" can be checked rather than trusted.

Not yet tested with people: whether "Saved · 2 minutes ago" builds more trust than "Saved" alone.

### E86 · How should a change read without colour?

A design review: `DiffView` was rendered for a config file (two changed lines, an added line, unchanged runs folded) and for a subscription's properties, in all four schemes and under forced colours. `checks/diff-view.mjs` measures it, including the diff itself.

- **Signs and words first.** Diffs drawn in red and green alone fail colour-blind readers and the "never colour alone" rule. Every change has a sign (`+`, `−`), an element (`ins`, `del`), a strike-through for removals and "Added"/"Removed" for screen readers; the tints are a third cue, dropped under forced colours.
- **Pair by block.** A block of two removed lines followed by two added lines is two changed lines, so the nth removal pairs with the nth addition for word marks. Pairing only neighbours marked the wrong words.
- **Fold long runs, not single lines.** A lid for one unchanged line takes as much room as the line and hides it, so only runs of two or more fold.
- **Small, built in.** An LCS line and word diff covers documents and configs. Very large inputs can pass precomputed `hunks`.

Not yet tested with people: whether the summary ("3 additions, 2 removals") is enough to decide whether to read on.

### E87 · When should a save bar rise?

A design review: `SaveBar` was rendered over a four-field settings form driven by `useEditRecord`, clean, dirty, saving, saved and failed, in all four schemes and under forced colours. `checks/save-bar.mjs` drives it.

- **After the change settles, not on the key.** A bar that rises on the first keystroke is an abrupt onset while someone is typing. It rises 600ms after the draft stops changing, which the issue proposed.
- **Level 3, below sheets.** A draft is in your hand, so it floats, but at level 3, so a Sheet or Dialog opened over the page still sits above it.
- **Failure keeps the draft.** The bar drops to a trench and says "Your changes are kept", because the worst outcome of a failed save is a lost draft.
- **Reads the record.** It reads useEditRecord's phase and errors rather than having its own state, so it can't disagree with the form.

Not yet tested with people: whether 600ms feels responsive or late after a single edit.

### E88 · Is an inherited permission disabled?

A design review: `PermissionMatrix` was rendered with a locked Owner, three editable roles, inherited grants and denials, and a cell saving, in all four schemes and under forced colours. `checks/permission-matrix.mjs` drives it.

- **Decided, not disabled.** Agent-built matrices draw inherited and fixed grants as disabled checkboxes, which says "you can't have this". These cells are already decided, so they're stamped into the record like a done Checklist item, and they say where the decision comes from.
- **Reachable read-only cells.** Skipping them in the grid would hide why a role has a permission. They're focusable, read their reason, and pressing Space says they can't be changed here.
- **A ring, not a lift.** The active cell is DataGrid's ring, because a cell lifting out of its row breaks the grid.
- **A saving cell hovers.** Permission changes usually go to a server one at a time, so a promise from `onChange` makes that cell hover as pending, then settle, or revert on failure.

Not yet tested with people: whether a stamped check is read as "inherited" without its tooltip.

### E89 · Should the recommended plan stand taller?

A design review: `PlanPicker` was rendered with four plans (one current, one recommended, one unavailable) and a period switch, chosen by pointer and keyboard, in all four schemes and under forced colours. `checks/plan-picker.mjs` measures it.

- **No lifted card.** Pricing pages raise and glow the plan they want sold. Height in Altitude means "matters now"; a sales preference isn't that, and a raised card would also promise to be pressable in a different way from the others. "Recommended" is a plate.
- **One mark.** The plans are one choice, so they're RadioGroup's build at card size: flush cards and one raised mark that travels to the chosen card.
- **Prices don't count.** FormattedNumber cross-fades prices when the period changes. Counting digits would delay the number for decoration (the Stat rule).
- **The CTA lives outside.** Law 1 keeps one level-2 slab in the view, so the picker doesn't draw buttons on its cards. Your Continue button names the outcome.

Not yet tested with people: whether a "Recommended" plate steers as many choices as a raised card, which is the question a growth team will ask.

### E90 · Is a locked feature disabled?

A design review: `FeatureGate` was rendered on a secondary and a ghost button, one with an upgrade and one for someone who can't upgrade, opened by pointer and keyboard, in all four schemes. `checks/feature-gate.mjs` measures it.

- **Live, as the issue proposed.** The disabled build says nothing happens, is skipped by keyboard and some screen readers, and uses `ink-faint`. A locked feature does something (it explains), so it keeps the control's build, ink and hover lift, and adds a lock and a plan plate. Elevation.md now says so beside the disabled rule.
- **The requirement is in the name.** "Export to CSV, requires Business plan" tells screen reader users what pressing it will lead to.
- **One primary in the popover.** The upgrade is the popover's primary; PrimaryScope makes the popover its own view, so it doesn't count against the page's.
- **Who can upgrade.** People who can't buy shouldn't get a dead-end button; they're told to ask an admin.

Not yet tested with people: whether locked features in a toolbar feel like advertising.

### E91 · What happens to a resolved thread?

A design review: `CommentThread` was rendered with two comments (one mentioning), someone typing, a comment posting, landing and failing, a comment deleted and restored, and the thread resolved and reopened, in all four schemes. `checks/comment-thread.mjs` drives it.

- **Stamped, not gone.** Resolved threads often vanish, which loses the record of a decision. A resolved thread is stamped like a done Checklist item: muted, collapsed to one line that says who resolved it, and kept where it was.
- **Posting is a write.** A comment you post hovers as pending until the server confirms it, and a failure keeps its text in a trench with Retry, so a failed post is never mistaken for a sent one.
- **Plain text, real listbox.** Mentions use a listbox with `aria-activedescendant` on the textarea, the combobox pattern; the body stays plain text with "@Name" plates, so it can be stored anywhere.
- **Presence only for people.** The typing indicator is the one place presence colours belong: other people, live. It isn't announced.

Not yet tested with people: whether a collapsed resolved thread is reopened when it should be.

### E92 · Should a product tour dim the page?

A design review: `Tour` was rendered with three steps on a toolbar (a ghost button, an input, the primary), moved through by pointer and keyboard, skipped and finished, in all four schemes and under forced colours. `checks/tour.mjs` drives it.

- **No dimming.** Conventional tours dim everything but a cut-out spotlight. That's a level-5 summit, it blocks the thing being explained, and it would compete with any real dialog. A step is a level-3 note, so the page stays at full strength and usable.
- **A ring on the target.** The target may be text or a region, not something you press, so it's ringed rather than lifted (DataGrid's active cell).
- **No flying.** Moving on lifts one step off and raises the next at its target. A card sliding across the screen would carry the eye past what matters.
- **Focus comes back.** The tour is a non-modal dialog: focus goes to the step, Tab can reach the target, and focus returns where it was when the tour ends.

Not yet tested with people: whether an undimmed tour is noticed as quickly on a busy page.

### E93 · Where does Stop go?

A design review: `PromptInput` was rendered empty, with two lines, with a file uploading and attached, mid-drag, and through submitted → streaming → ready, in all four schemes and under forced colours. `checks/prompt-input.mjs` drives it, including a synthetic IME composition.

- **Stop takes Send's place.** Composers that put Stop elsewhere, or swap a wide "Stop generating" button in, move the layout under the pointer just as people reach for it. Stop is the same square in the same slot, its icon cross-fading.
- **IME Enter.** Enter during composition confirms the characters; sending then loses the message mid-word for Japanese, Chinese and Korean writers. `isComposing` (and keyCode 229 for older Safari) is checked before sending.
- **Send stays reachable when empty.** It's flush and faint like a disabled button, but `aria-disabled` rather than `disabled`, so keyboard users find it and learn why it does nothing.
- **An upload is a write.** A file being uploaded hovers as pending, and Send waits for it, so a message is never sent missing its attachment.

Not yet tested with people: whether the faint Send reads as "write something first" without a hint.

### E94 · Is a streaming answer pending?

A design review: `Conversation` was rendered with a settled exchange, an answer streaming in at six characters per 60ms, stopped, retried and completed, scrolled up mid-stream, in all four schemes and under forced colours. `checks/conversation.mjs` drives it.

- **Not pending.** A pending write hovers because something you did is in flight and might fail. A streaming answer isn't yours, and drawing it hovering would say your message hadn't been sent. It's the record still being written, so it borrows charts' "not yet the record": a dashed rule.
- **The arrival signal waits.** "New content arrives tinted and lifted, then settles" can't run for the 10 seconds an answer streams. The afterglow is held until completion, which is also when the answer becomes worth reading as a whole.
- **Announce once.** `role="log"` announces every change, which for streamed text is a word-by-word stutter. The log's announcements are off; the completed answer is announced once, truncated.
- **Let go when they scroll up.** Following to the bottom is right until someone scrolls back to read; then it stops and offers "Jump to latest".

Not yet tested with people: whether screen reader users prefer sentence-by-sentence announcements for long answers.

### E95 · Does a proposal hover?

A design review: `Confirmation` was rendered as three proposals (plain, hold to approve, and a dialog for an irreversible one that fails), approved, rejected, failed and retried, in all four schemes. `checks/confirmation.mjs` drives it.

- **Raised, not pending.** Commitment says a pending write hovers. Without a separate state for proposals, an agent would reasonably draw "awaiting approval" hovering, which tells the person being asked that it's already happening. Elevation.md now has a Proposed row: raised, like any status that asks for action.
- **Pending begins at approval.** Only then is something in flight; then the commitment signal runs as usual.
- **The consequence in words.** "214 Pro customers will receive…" rather than "Run tool send_email?", and Approve names the outcome.
- **No default action.** Enter never approves, and nothing is focused when a proposal arrives, so typing in the composer can't approve it by accident.

Not yet tested with people: whether "The assistant is asking" is needed when proposals appear inside a conversation.

### E96 · How does an agent's work look while it runs?

A design review: `Trace` was rendered running a five-step plan (a tool call, reasoning, a step that fails and is retried, a step awaiting approval), in all four schemes and under forced colours. `checks/trace.mjs` drives it.

- **Stepper, not cards.** Traces are usually nested cards with spinners. A run is a process, which Altitude already draws: done steps settle, the current one stands, planned ones are imprints. Using Stepper's plates means an agent run and a checkout flow read the same way.
- **No spinners.** The running step is raised with a steady lamp in its mark. A spinner on every running row is motion that says nothing new.
- **Failure is a trench, approval is raised.** A failed step drops down with its reason and Retry. A step waiting for approval holds a Confirmation, raised, because it asks for action (E95).
- **Throttled announcements.** Agents can complete several steps per second; announcing each would bury the one that matters. Changes are coalesced; failures and approvals interrupt.

Not yet tested with people: whether planned imprints set expectations the agent then breaks when its plan changes.

### E97 · Is a suggested value a value?

A design review: `Input` and `Textarea` were rendered with suggestions (a whole subject for an empty field, the rest of a label being typed, a sentence appended to a reply), accepted with Tab, dismissed with Escape and typed past, in all four schemes and under forced colours. `checks/input-suggestion.mjs` drives it.

- **Not a value.** Putting the suggestion in the value makes it look like the person's input and fills the well, so the form says the field is done when nobody has decided. The ghost is drawn over the field and the well stays an opening until it's accepted.
- **Feedforward, not new.** Altitude already shows what an action would produce as a faint ghost (the check a box would get). A suggestion is the same promise: "this is what Tab will put here."
- **Tab only when there's a ghost.** Otherwise Tab must move focus, or keyboard users are trapped in the field.
- **Heard before accepted.** The suggestion is the field's description, so a screen reader user hears it when they arrive, and acceptance is announced.

Not yet tested with people: whether Tab-to-accept collides with expectations in forms where Tab always moves on.

### E98 · Where does a proposed edit live?

A design review: `PropertyList` was rendered as a deal with three proposed changes from an assistant (one whose save fails), accepted one by one, all at once and rejected, in all four schemes. `checks/property-proposals.mjs` drives it.

- **In place, not elsewhere.** Proposals are usually shown in a side panel and copied over, or written straight into the record with an undo. The first loses the context of the current value; the second makes a proposal look like the record. Here each field shows both, current struck beside proposed, where the value lives.
- **Raised, like any proposal.** A field with a proposal asks for action, so it's raised one level, as Confirmation (E95). It isn't pending: nothing has been sent.
- **Saved through the same contract.** Accepting runs the item's own onSave, so the pending hover, failure and afterglow are InlineEdit's, and a failure keeps the proposal with Retry.
- **Accept all staggers.** Several fields settling at once would glow together; riseDelay keeps at most four afterglows starting at once.

Not yet tested with people: whether a long list of proposals needs a "review one by one" mode.

## What was rejected

- **Blur for de-emphasis.** Small blur isn't detected pre-attentively, large blur is unpleasant to read, and it destroys text contrast. Relevance uses shading polarity (raised vs sunk) instead.
- **Continuous elevation.** No "priority 0–100 mapped to height". Depth is ordinal: use tiers and put the number in text.
- **Light glows for height in dark schemes.** Light "shadows" lose their pre-attentive depth reading.
- **Moving things to adapt.** Predicted menu items arrive sooner (ephemeral adaptation) but never change position.
- **Pointer-driven parallax, tilt and lean.** Motion parallax is a strong depth cue, but continuous parallax is a vestibular trigger and adds motion that isn't tied to a change of state. Lean (a face following the pointer by up to 2px) and raised things climbing toward an approaching pointer were tried and removed: see E10. Approach survives only as an opening deepening, bounded, local and removed under reduced motion.
- **Glossy lamps and accent rims on fields.** See E10.
- **Keycap avatars, socket badges, severity bars.** See E8.
- **Hashed identity tints and presence as three heights on avatars.** See E12.
- **A stock categorical palette for charts** (Okabe-Ito, Tableau 10, shadcn's chart colours): it puts series on top of status and presence hues. See E23.
- **Shadowed, walled or sheened chart marks**, "because Altitude is about height". A bar's length is already its height on screen; adding Altitude's height to it costs accuracy and says "press it". See [Charts](Charts.md).
- **Hovered chart marks lifting a level**, as other interactive surfaces do. A lifted bar either leaves the ground line or casts a shadow below its top edge, and both misstate its value. Clickable marks get an outline instead.
- **Read wear as altitude.** Frequent use is a different idea from "now", and raising frequently used items would make positions drift. A worn-edge treatment may suit it better; not built.

## How to validate with people

Lab measurements show the cues are *present*. These studies would show they *work*:

1. **Clickability (after Burmistrov et al.).** Screenshots with and without `--alt-sheen`; participants mark every pressable element. Measure misses, false alarms and time per element.
2. **Change detection.** Update one of twelve cards while the participant does a distractor task. Compare time-to-notice and accuracy for afterglow, a "New" badge, and nothing.
3. **Tier reading.** Flash a screen for 200ms and ask which elements are inputs, buttons or overlays, in each scheme and with the low-vision filter.
4. **Pending trust.** With 200ms, 800ms and 3s server latency, compare optimistic writes with pending/landed altitude against a spinner. Measure duplicate submissions and confidence ratings.
5. **Hold-to-commit.** Accidental-activation rate and completion time for destructive actions, HoldButton vs a confirmation dialog.
6. **Form completion.** A long form with some fields left empty: compare how often people submit with a required field missed, and how fast they find it, when empty fields are sunk wells versus all fields looking alike.
