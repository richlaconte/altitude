# Altitude

> Altitude is a design and HCI framework for React web applications built by agents, published on npm as `altitude-design` (MIT, React 18.2 or 19). Its one idea: height is the interface, and the ground is the record. Settled content sits on the ground, anything live rises above it, and anything waiting to receive (a field, a slot, a track) sinks below it. It ships components, design tokens, task patterns with workflow hooks, and the rules for using them.

This file covers {{base}}. It describes the repository's `main` branch as of {{date}} (`package.json` version {{version}}), and every link below is a plain Markdown, JSON or TypeScript file served from this site and rebuilt from `main` on each deploy. The published npm package can be older than `main`, so in a project that has it installed, the installed package is the authority:

- Check `node_modules/altitude-design/package.json` for the version, and the installed declarations (`node_modules/altitude-design/dist/types/index.d.ts`) for what it exports. If a component or hook listed here isn't exported there, the installed version predates it: don't import it or imitate it; use what's installed, or upgrade the package.
- If `node_modules/altitude-design/dist/guidance/README.md` exists, it holds the task guidance matched to the installed version, and `npm exec -- altitude patterns "<what you're building>"` finds the right contract. Older versions ship neither.

Rules agents most often get wrong (each is explained in the linked guides):

- Install `altitude-design`, import `altitude-design/altitude.css` once (or `altitude.no-fonts.css` to avoid the Google Fonts request), render one `AltitudeProvider` around the whole app, and render `Toaster` once inside it. Components are client components (`"use client"`).
- Meaning lives in four tiers: sunk (an opening to fill), ground (settled, read it), raised (live, press it), floating (above the page). The eight levels exist for hover and press motion; never make two things mean different things by putting them one level apart. One thing at level 5, ever.
- Push up, fill down: things you press are raised, things you fill are sunk. Never style an input as raised or a button as sunk. Only surfaces that do something lift on hover.
- Never encode an amount in height. In charts the data is flat ink standing on the ground line: no shadows, gradients or 3D, no pie or donut charts, no dual axes, and colour does one job per chart.
- Height never travels alone: every elevation signal also has a word, an icon, an ARIA state or a border, and status is never colour alone.
- Pass data as it loads (`user?.name`, `rows={deploys}`); components draw their own loading imprint, so don't hand-write skeletons.
- Don't disable a submit button to say a form is invalid; let it be pressed and list what's missing with `ErrorSummary`. Disable it only while the submission is in flight.
- Use the tokens in `tokens.json`; don't invent colours, shadows or radii. Copy is sentence case, and buttons start with a verb and name the outcome ("Delete project", never "OK" or "Submit").
- Pending and success states must match the operation's real state. The application owns persistence, permissions, business rules and real undo; automated checks don't prove a screen is accessible.
- Each component's guide says what it's for, how it uses height and what you provide; read it before using the component.
- For a whole product task (settings, sign-in, members, billing, import), read the matching task pattern before composing components. For a new screen, start with Screen layout.

## Start here

- [Design guide](project/README.md): the laws of the elevation model, content and honesty rules, colour, type, spacing, focus and states, and how to use the components.
- [Elevation](project/Elevation.md): the model in full: the tiers and levels, how each level is drawn, and every signal height carries.
- [Component API](project/components/index.d.ts.md): TypeScript declarations for every public component, hook and prop (large: search it for the name you need rather than reading it whole).
- [Design tokens](project/tokens.json): colours for both schemes, the elevation ladder, spacing, radii, type and motion, as JSON.

## Guides

- [Motion](project/Motion.md): read before animating anything; motion only travels along the height axis, and duration is distance travelled.
- [Charts](project/Charts.md): read before drawing any chart, stat or meter; the form chooser, the colour rule and how each chart part is built.
- [Mobile](project/Mobile.md): read before laying anything out for touch or a small screen.
- [Theming](project/Theming.md): the daylight and nightfall schemes, custom accents, the data palette, and using Altitude's styles with shadcn/ui.
- [Distinctiveness](project/Distinctiveness.md): read before composing a screen, so it doesn't read as generated.
- [Fundamentals](project/Fundamentals.md): the established design laws generated interfaces break, and where Altitude answers each.
- [Actions in place](project/ActionsInPlace.md): editing a value where it lives with `InlineEdit` and `EditRegion`, direct actions with real recovery, and targeted confirmation.

## Task patterns

- [Framework entry](project/framework/README.md): how to choose a pattern from the person's task, and what the application must still supply.
- [Principles](project/framework/principles.md): who owns what between Altitude and the application, and how to run the examples and verification.
- [App skeleton](project/framework/app-skeleton.md): shell, page header, a filtered and paged table, a record in a sheet, and settings, composed correctly.
{{patterns}}

{{components}}

## Agent setup

- [Agent setup](docs/framework/AGENT-SETUP.md): connecting Codex or Claude Code to the installed guidance with `npx altitude init`, and removing it.
- [Release notes](docs/framework/RELEASE-NOTES.md): what changed in the framework, and migration notes.

## Optional

- [Full text](llms-full.txt): every guide and task pattern above in one file, for loading all of it at once (large).
- [Research](project/Research.md): the numbered experiments and measurements behind each rule (very large).
- [Contributing](CONTRIBUTING.md): how work is organised, and what makes a useful bug report or feature request.
- [Agent notes for the repository](AGENTS.md): for agents changing Altitude itself or filing issues against it.
- [Storybook](storybook/): every component with a live preview in both schemes (HTML, for people).
