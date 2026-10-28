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
