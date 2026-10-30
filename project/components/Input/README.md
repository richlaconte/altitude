# Input

A single-line text field. A field is an **opening cut into the page**, and you can see into it.

Altitude has one camera, slightly in front of and above the page: under a raised face you see its front wall (a button's wall), and inside an opening you see its **back wall**, just below the top edge. That inside wall (`--alt-wall-in`, 4px) is what makes an empty field read as a hole you can put something into.

- **Empty:** a well (`surface-well`) with its inside wall showing and a soft occlusion shadow on the floor below it. The placeholder sits on the floor, half a wall lower than it would on a flat field.
- **Approached:** as the pointer comes within 56px the wall deepens up to 2px more, the way a receptacle opens for something about to be put in. Content sinks with it. Only the opening changes: the field itself never moves. Fields are the one place Altitude responds to a pointer before it arrives; buttons and cards wait until it's on them.
- **Filled:** as soon as it holds a value, the floor rises flush with the page: the wall shrinks to nothing on `ease-settle`, the text rises with it, and the field turns `surface-raised`. A form's unfilled fields read as holes at a glance.
- **Focused:** the floor lights up (`surface-raised`), and an empty focused field holds the extra depth approach previewed, even after the pointer moves away, until something is put in it. A field you click into shows nothing more: you know where you clicked, and the caret is there.
- **Focused from the keyboard:** the rim also darkens to a 2px neutral (`--alt-rim-held`: `ink` mixed 80% into `line-control`, a 1px border doubled by a 1px outline), so you can find the field you tabbed to. No accent and no halo: a form you're working through shouldn't glow at every field. The rim keeps at least a 3:1 change from the resting rim in every scheme, so it meets WCAG's focus-appearance contrast. Whether focus came from the keyboard is decided as it arrives (`useKeyFocus`), so typing into a field you clicked doesn't add the rim, and clicking a field removes it. An invalid field's keyboard rim stays `critical`.
- **Invalid:** dropped to trench depth (a 6px wall in a `critical` tint, on `critical-soft`), whether or not it's filled. It drops on `ease-sink` rather than shaking.
- **Disabled:** flat on the ground with a `line` rim, no wall.
- **Suggested:** a value proposed for the field (an AI completion, autofill, a template) is drawn as a **ghost of the value** in `ink-faint`, the feedforward vocabulary ("the ghost of the check a box would get"). With `suggestion` alone it's the whole value while the field is empty, or the rest of it while what's typed matches its start. With `suggestionMode="append"` it continues the text. **Tab accepts** (the floor rises flush with one afterglow, and `onChange` and `onAcceptSuggestion` hear the new value), **Escape dismisses**, and typing carries on past it. **A suggested value isn't a value**: it's never put in the field, so an empty field with a ghost stays an opening. It's read out as the field's description ("Suggestion: Billing. Press Tab to accept."), Tab moves focus as usual when no ghost is showing, and acceptance is announced. Under forced colours the ghost is `GrayText`.

The shadow list is always four layers (wall, occlusion, lip, halo; the halo is unused by Altitude's own states and kept so custom states animate), so every state animates into every other. Empty and filled are detected with CSS (`:placeholder-shown`), so it works for controlled and uncontrolled inputs; when you don't pass a placeholder, a blank one is set for you. In forced-colours mode empty fields have a dashed rim, filled ones a solid rim and invalid ones a thick dashed rim.

`Textarea` is the same opening, multi-line and resizable. Give it a `maxLength` and it shows **how full** it is: a faint fill rises from the floor with a waterline at its top, turning `caution` at 90% and `critical` at the limit, with a live count below.

**On touch.** Under a coarse pointer the field steps up to `size-field-md`'s 48px, and the text you type is at least 16px, so iOS Safari never zooms the page when the field is focused. Labels stay 14px. See [Theming](../../Theming.md), "Density and target size".

**You provide:** `placeholder` in `ink-muted` (a hint, never the label), `size` (`sm` 34px, `md` 40px), optional `leading` and `trailing` nodes (16px icons, a `Kbd`, a unit). For Textarea, optional `maxLength` and `showFill={false}` to hide the fill. For either, an optional `suggestion`, `suggestionMode` and `onAcceptSuggestion`. Wrap either in `Field` for a label and messages.

- Do use `Field` rather than a placeholder as the only label.
- Don't add an accent focus ring or glow to fields, or a rim on click. Keyboard focus on buttons and choice controls is the `accent-ink` ring; on a field the lit floor is the focus, plus the dark rim when you arrived by keyboard.
- Don't put a suggestion in the value: pass it as `suggestion`, so people can tell what they wrote from what was proposed.
- Don't place inputs on `surface-well` backgrounds: a well inside a well disappears. Put forms on ground or raised surfaces.
