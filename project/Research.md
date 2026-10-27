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

## What was rejected

- **Blur for de-emphasis.** Small blur isn't detected pre-attentively, large blur is unpleasant to read, and it destroys text contrast. Relevance uses shading polarity (raised vs sunk) instead.
- **Continuous elevation.** No "priority 0–100 mapped to height". Depth is ordinal: use tiers and put the number in text.
- **Light glows for height in dark schemes.** Light "shadows" lose their pre-attentive depth reading.
- **Moving things to adapt.** Predicted menu items arrive sooner (ephemeral adaptation) but never change position.
- **Pointer-driven parallax, tilt and lean.** Motion parallax is a strong depth cue, but continuous parallax is a vestibular trigger and adds motion that isn't tied to a change of state. Lean (a face following the pointer by up to 2px) and raised things climbing toward an approaching pointer were tried and removed: see E10. Approach survives only as an opening deepening, bounded, local and removed under reduced motion.
- **Glossy lamps and accent rims on fields.** See E10.
- **Keycap avatars, socket badges, severity bars.** See E8.
- **Hashed identity tints and presence as three heights on avatars.** See E12.
- **Read wear as altitude.** Frequent use is a different idea from "now", and raising frequently used items would make positions drift. A worn-edge treatment may suit it better; not built.

## How to validate with people

Lab measurements show the cues are *present*. These studies would show they *work*:

1. **Clickability (after Burmistrov et al.).** Screenshots with and without `--alt-sheen`; participants mark every pressable element. Measure misses, false alarms and time per element.
2. **Change detection.** Update one of twelve cards while the participant does a distractor task. Compare time-to-notice and accuracy for afterglow, a "New" badge, and nothing.
3. **Tier reading.** Flash a screen for 200ms and ask which elements are inputs, buttons or overlays, in each scheme and with the low-vision filter.
4. **Pending trust.** With 200ms, 800ms and 3s server latency, compare optimistic writes with pending/landed altitude against a spinner. Measure duplicate submissions and confidence ratings.
5. **Hold-to-commit.** Accidental-activation rate and completion time for destructive actions, HoldButton vs a confirmation dialog.
6. **Form completion.** A long form with some fields left empty: compare how often people submit with a required field missed, and how fast they find it, when empty fields are sunk wells versus all fields looking alike.
