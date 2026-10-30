# Distinctiveness

Interfaces built by agents now have a look people recognise and distrust: purple gradients, Inter, a centred hero, three icon cards, a sidebar and a grid of equal cards on every screen. Altitude is made for apps that agents write, so it can fall into that look twice: through its own defaults, and through what agents compose from them. This chapter says how it stays out, and how we keep checking, because the look keeps moving.

The evidence is in **Research** ("Generated interfaces converge"). Every tell, with its sources and where Altitude stands, is in [`tells.json`](tells.json).

## Why it happens

A model writing an interface picks the likeliest choice, and the likeliest choices are the safe ones that fill its training data. UI kits used as shipped make it worse. Four findings shape everything below:

- **Structure gives it away more than colour.** Across generative UI tools given the same prompt, layout and overall appearance converge more than palette. Models also vary a design far less than designers do when the same brief moves to a different product.
- **Banning a tell creates the next one.** With purple banned, output moves to cream and terracotta, near-black with one acid green, Instrument Serif and all-caps mono labels. A blocklist goes stale in months.
- **Familiar is good.** People rate simple, prototypical pages as most appealing within a fiftieth of a second. Avoiding the generated look doesn't mean being strange.
- **It's behaviour too.** Generated interfaces skip status, recovery and control, and a quarter of the design reasons a tool gives never reach the screen.

## The rules

1. **Familiar controls, specific structure.** Buttons, fields, menus and dialogs work the way people expect. The arrangement of a screen comes from its content and task, not from a template.
2. **Name the task before the layout.** Before composing a screen, write down who's there, what they came to do, the one thing that leads, and the one primary action. A sidebar with a card grid is a choice to justify, not a starting point. A list with detail, a focused editor, a guided flow or a single decision view usually fits better.
3. **Height is the signature.** Altitude's distinctiveness is the elevation language: raised slabs, sunk wells, a page that recedes. Repeat it, and don't add decoration to look designed: no gradients, glows, frosted panels or coloured edge stripes. Every shadow is a tier with a meaning and a non-height cue, which is what separates Altitude's depth from the rounded, soft-shadowed default (CM1).
4. **One thing leads.** Every screen has a focal point. A grid of equal cards is right only when the items really are equal. Spacing groups: tight within a group, wider between groups.
5. **States are the design.** Empty, loading, failed, partial and stale states get as much care as the full one. The framework patterns' contracts say which apply.
6. **Copy names things.** The content rules hold, and on top of them: no marketese ("unlock", "seamless", "supercharge", "empower"), no "Welcome back!", no arrows on calls to action. Name the object and the outcome.
7. **Check claims against the build.** If the reasoning behind a screen says something ("the primary action stands out", "errors are recoverable"), the screen must show it. Look before saying it's done.
8. **Judge, and fix, in clusters.** One gradient proves nothing; a cluster of tells does. Swapping a colour doesn't fix a generic layout, and a fix that only bans this year's default lands on next year's.

## The tells

`tells.json` groups the tells by area: colour, type, layout, components, motion, icons and imagery, copy, states, behaviour and consistency. Each has an id (`CO4`, `LA5`), its sources with their strength (peer-reviewed, preprint, vendor or practitioner), how it can be caught, and Altitude's status:

| `detect` | What catches it |
|---|---|
| `lint` | Source text: hues, font families, `background-clip: text`, uppercase labels, easing, emoji, banned words ([#320](https://github.com/richlaconte/altitude/issues/320)) |
| `render` | A rendered preview: equal-weight grids, spacing rhythm, contrast, unloaded fonts ([#321](https://github.com/richlaconte/altitude/issues/321)) |
| `measure` | The distinctiveness benchmark: how far screens sit from what default tools generate ([#322](https://github.com/richlaconte/altitude/issues/322)) |
| `human` | Review and the study with people ([#326](https://github.com/richlaconte/altitude/issues/326)) |

## Where Altitude stands

As of the 2026-10-30 audit, 29 of 47 tells are clear, 11 are to watch, 3 are unchecked and 4 are exposed. Nothing was rendered for it: it read `tokens.json`, `bundle.css`, `build/previews.txt`, `components/src` and `site/` at commit `6d40bf2`, with a regex prototype for the `lint` tells and the rest by hand.

**Clear.** No purple, gradient text, coloured stripes, glows, bounce, count-ups, emoji, sparkles or marketese anywhere in the library or previews. The content rules, the forbidden light glows, the rejected severity bars (E8) and Charts' "the data is the record" already rule most of the tells out.

**Exposed:**

- **CO4, Mesa** is terracotta on cream (`#b4441b` on `#f6f1ea`), the most-cited replacement for purple ([#324](https://github.com/richlaconte/altitude/issues/324)).
- **CO5, Alpine** is near-black with one mint accent (`#5fd6b2` on `#0f1513`) ([#324](https://github.com/richlaconte/altitude/issues/324)).
- **TY4, the landing page** puts an uppercase, letter-spaced kicker above every heading ([#320](https://github.com/richlaconte/altitude/issues/320)).
- **LA5, the app skeleton** is the sidebar, top bar and table every generated dashboard uses, and agents copy it for every screen ([#323](https://github.com/richlaconte/altitude/issues/323)).

**Watch:**

- **CO3, Nightfall:** periwinkle on dark.
- **CO8, Daylight:** its blue sits near Tailwind's.
- **TY2 and IC3:** Instrument Sans and Lucide ([#325](https://github.com/richlaconte/altitude/issues/325)).
- **CM6:** props that mirror shadcn.
- **CM2:** the dialog scrim's blur.
- **Composition-dependent:** LA4 (equal-weight grids), LA7 (stat rows) and BH1 (design theater) depend on how apps compose the parts.

## How it's checked

| When | What | Gates? |
|---|---|---|
| Every push | The `lint` and `render` checks (#320, #321) | `lint` fails; equal-weight grids and flat spacing warn |
| Every push | `npm run check:tells`: is the catalog due a review or audit? | Warns |
| Every pull request that changes how something looks | The review list below | Reviewer |
| Each release, and quarterly | The benchmark against a rebuilt baseline (#322) | Recorded, not gated |
| Yearly | The blind study with people (#326) | Recorded in Research |

For a pull request that changes how something looks, the reviewer asks:

- Does any `exposed` or `watch` tell in `tells.json` get closer, or a new one appear?
- Does the screen have one focal point and one primary action?
- Is every shadow a tier, with its word, icon, ARIA state or border?
- Are the empty, loading and failed states designed, with words that name the object?
- Is anything decorative (a gradient, a glow, an edge stripe, an animation) doing a job, or there to look designed?

## Keeping current

The look moves with each model release and each popular anti-slop prompt, so the catalog is refreshed on a schedule. Nothing runs the refresh for us; the repository says when it's due. `tells.json` records when the catalog was last reviewed and last audited, and how often each is due (`refresh`). `npm run check:tells` runs on every push. It warns when either is overdue and lists tells not seen for six months, as annotations on the run and in its summary. It never fails a build for being overdue, only for a malformed catalog; `--strict` makes overdue a failure locally.

| When | What | Output |
|---|---|---|
| Monthly | Read the practitioner catalogs (avoid-ai-design and others), the avoid-lists in the major frontend design skills (they say where generators will go next), new preprints on generative UI homogeneity, and design press | New tells added to `tells.json` with sources; `lastSeen` updated on the ones still common; new `lint` rules filed against #320 |
| Quarterly, and after a major model release | Rebuild the benchmark baseline with current tools and models, rerun it, and re-audit the schemes, type and skeleton against the current defaults | The benchmark as a numbered experiment in Research; the audit in "Where Altitude stands"; status changes in `tells.json` |
| Yearly | The study with people | A numbered experiment; new tells from what participants named |

When you finish a review or an audit, set `refresh.reviewed` or `refresh.audited` to the date, in the same pull request as its changes. A major model release makes both due at once: set the dates back to say so.

Retire a tell that two quarterly reviews in a row no longer find in generated output. A tell that's gone from generators but still in Altitude isn't a problem; one that's common in both is.

## For agents building with Altitude

Before composing a screen:

1. Write the task, the one thing that leads, and the primary action (rule 2).
2. Choose the frame from the task, not from the app skeleton by default.
3. Use the scheme's elevation for emphasis; add no decoration.
4. Build every state the pattern lists.
5. Write copy that names the object and the outcome.
6. Compare the result with what you said you'd build, and with the tells in `tells.json`, before saying it's done.
