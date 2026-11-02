# Fundamentals

Generated interfaces don't only look alike ([Distinctiveness](Distinctiveness.md) covers that). They also break rules that design settled long ago: they give every action the same weight, split related things apart, label buttons "Submit" and links "Learn more", leave popovers without a close button and add countdown timers nobody asked for. Altitude is made for apps that agents write, so its rules have to hold against those failures as well as against the look.

This chapter lists the established laws and standards that generated interfaces are documented as breaking, how they break them, and the Altitude rule that answers each. Where Altitude had no answer, the rule was added (see "What this added"). The evidence is in **Research** ("Generated interfaces break established rules").

## Why the rules break

- **Polish hides problems.** People rate attractive interfaces as easier to use before they've used them (the aesthetic-usability effect: Kurosu & Kashimura, 1995; Tractinsky, Katz & Ikar, 2000). Generated screens are polished by default, so they pass a glance and fail in use. Nielsen Norman Group found AI prototypes "good from afar": poor grouping, emphasis on what the task doesn't need, and layouts force-fitted into a template.
- **Form gets built, function doesn't.** Asked for 48 implicit principles, five generative UI tools built most of the structural and styling ones and almost none of the functional ones (system status, user control, error recovery): four of five scored 0.06 or less on that tier.
- **Syntax without meaning.** Generated code has the attribute but not the meaning: a button named "Submit", a link named "Read more", `alt="image"`. These pass automated checks. In 300 generated interfaces, generic button and link names were over half of the semantic accessibility failures.
- **The web's defaults include its bad habits.** Models reproduce what's common, and that includes deceptive patterns. Asked for a webshop, ChatGPT added an average of five to every site without being asked or giving a warning.

So "it renders and looks finished" proves nothing. Each rule below has to be checked against the built screen (Distinctiveness, rule 7).

## The laws, and where Altitude answers them

### Perception and layout

| Law | How generated interfaces break it | Altitude's answer |
|---|---|---|
| **Proximity** (Gestalt): things near each other read as a group | Large gaps inside a group and none between groups; one spacing value everywhere | Distinctiveness rule 4 (tight within a group, wider between groups); padding grows with altitude; LA6 render check |
| **Focal point and isolation** (von Restorff): the one different thing is the one remembered | Every button, CTA and stat at the same weight; emphasis on information the task doesn't need | Law 1 (altitude is importance, one thing at level 5); `ALT-VISUAL-002` one primary per view; LA4, LA7 |
| **Hick–Hyman law**: decision time grows with the number of equal choices | Rows of equal-weight actions and options | One primary action; the rest secondary, ghost or in an overflow menu (`ALT-VISUAL-002`) |
| **Fitts's law** and WCAG 2.5.8 target size | Small targets, dense icon rows, inline links with no padding | Theming ("Density and target size"), Mobile, the 24px minimum and the phone check |
| **Jakob's law**: people expect a control to work like the ones they know | A pattern from the wrong domain (a "profile" built as a social profile); novelty to look designed | Distinctiveness rules 1 and 2; Screen layout chooses the frame from the task |
| **Measure**: reading suffers when lines run long | Body text the full width of a wide pane | Type: prose runs 45 to 75 characters a line (added) |
| **Typographic hierarchy** | A new size or weight wherever it "feels right" | The type tokens; weight before size; never 700 |

### Interaction (Nielsen's heuristics, Norman's signifiers)

| Law | How generated interfaces break it | Altitude's answer |
|---|---|---|
| **Visibility of system status** | No pending, saved, failed or stale state; success shown on a timer | Law 5; `ALT-EDIT-001`, `ALT-STATUS-001`, `ALT-SYNC-001`; pending only once a write is dispatched |
| **User control and freedom** | No cancel, no undo, popovers without a close button | `ALT-REVIEW-001`, Actions in place; every overlay can be dismissed (Honesty, added) |
| **Error prevention and recovery** | Raw error strings; submit disabled with no reason given | Content rules for errors; `ALT-EDIT-002`, `ALT-ACTION-001`; don't disable submit to say a form is invalid (added) |
| **Consistency and standards** | Fonts, radii and spacing drift between pages | One source per token; CN1 lint |
| **Recognition rather than recall** | A placeholder as the only label, gone once typing starts | Every field has a visible label (added) |
| **Signifiers** (Norman): what can be pressed must look it, and what looks pressable must be | Flat controls nobody finds; raised or underlined elements that do nothing | Law 2 (push up, fill down); law 4 (a surface lifts only if clicking it does something); everything that looks pressable does something (added) |
| **Response time** (0.1s, 1s, 10s) | Spinners for everything, or nothing for slow work | Motion's durations; `Await`'s grace before an imprint shows |

### Accessibility (WCAG 2.2)

| Criterion | How generated interfaces break it | Altitude's answer |
|---|---|---|
| **1.4.3 Contrast**, **1.4.1 Use of colour** | Muted text that fails AA; status by colour alone | Every text token clears 4.5:1 on all eight surfaces; law 7; CO7 |
| **2.4.4 Link purpose**, **2.4.6 Headings and labels**, **2.5.3 Label in name**, **1.1.1 Non-text content**, **3.3.2 Labels** | "Submit", "Click", "Learn more", "Read more", `alt="image"`, "Field 1", headings unrelated to their section | Buttons start with a verb; and now links, icon-only buttons, images, fields and headings each name what they are (Content, added); `ALT-SEM-002`; CP5 lint |
| **1.3.1 Info and relationships** | No landmarks, no heading order, sections that are only visual | One `h1` per view, levels that don't skip, `header`, `nav`, `main` (Content, added) |
| **2.4.7 Focus visible** | Focus rings removed for looks | The focus rules; CM7 |
| **4.1.3 Status messages** | Changes announced only visually | `ALT-STATUS-001`, `WorkflowStatus` |
| **1.4.4 Resize**, **1.4.10 Reflow** | Fixed-width layouts that break at 320px or 200% | The framework's journey checks; Mobile; `checks/phone.mjs` |

### Honesty

| Rule | How generated interfaces break it | Altitude's answer |
|---|---|---|
| **No deceptive patterns** (Brignull's catalogue; Mathur et al.'s taxonomy) | Over a third of generated ecommerce components carry one: missing terms at sign-up, urgency with no deadline, popovers with no close button, the business's choice drawn bigger, costly options pre-selected. Newsletter, discount and membership components are the worst | Law 1: importance is the person's, never the business's (added); Honesty (added); `ALT-HONEST-001`; BH3. E89 had already ruled that a recommended plan gets a plate, not height |
| **Truthful content** | Invented metrics, ratings, testimonials and user counts presented as real | Show real data or say there's none (added); CP6; `Await` renders the real data as it arrives, never a stand-in |

## What this added

- **Law 1**: importance is the person's task, never the business's preference.
- **Honesty**, a new section in the design guide: real deadlines only, declining as findable as accepting, nothing costly pre-selected, every overlay dismissable, terms beside the action, leaving no harder than joining, real reviews and numbers.
- **Content**: links name where they go; icon-only buttons name the action; every field has a visible label; alt text describes the image; headings describe their section, with one `h1` and landmarks; real data or none.
- **Type**: prose runs 45 to 75 characters a line.
- **States**: don't disable submit to say a form is invalid; everything that looks pressable does something.
- **Tells**: CP5 (generic link and button names, linted), CM9 (placeholder as the only label), BH3 (deceptive patterns), BH4 (controls that look live but do nothing), CP6 (invented data presented as real).
- **Framework rules** `ALT-HONEST-001` and `ALT-SEM-002`, so agents using the installed guidance get them too.

## Still open

- **Previews with placeholder-only fields.** Several previews in `build/previews.txt` render an `Input` with a placeholder and no label (the theme and density galleries, the Input preview, the invite popover). Agents copy previews, so CM9 is `exposed` until they're fixed. That fix is a separate issue.
- **Deceptive patterns and heading structure have no automated check.** They're reviewed by people. A render check for overlays without a close control is a candidate.
- **None of this is tested with people.** The study in Distinctiveness (#326) should include whether people find Altitude screens' decline and cancel paths as quickly as their accept paths.

## For agents building with Altitude

Before saying a screen is done, check it against this chapter as well as the tells:

1. One thing leads, and it's what the person came to do.
2. Every link, button, field, image and heading names what it is, in words that make sense out of context.
3. Every state the pattern lists is built, and the screen says what's happening.
4. Nothing hurries, hides, pre-selects or traps, and declining is as easy as accepting.
5. Every number, name and review on screen is real, or the screen says there's nothing yet.
