# Altitude

A React component library where **height is the interface**. Its one idea: the ground is the record. Settled content sits on the ground; anything live rises above it; anything waiting to receive sinks below it.

- **Storybook:** every component, with its guidelines and a live preview in all four schemes: https://richlaconte.github.io/altitude/
- **The design guide:** [`project/README.md`](https://github.com/richlaconte/altitude/blob/main/project/README.md), then [Elevation](https://github.com/richlaconte/altitude/blob/main/project/Elevation.md), [Motion](https://github.com/richlaconte/altitude/blob/main/project/Motion.md), [Theming](https://github.com/richlaconte/altitude/blob/main/project/Theming.md) and [Research](https://github.com/richlaconte/altitude/blob/main/project/Research.md)

## Install

```sh
npm install altitude-design
```

React 18.2 or 19 is a peer dependency.

```tsx
import { AltitudeProvider, Button, Field, Input } from 'altitude-design';
import 'altitude-design/altitude.css';

export function App() {
  return (
    <AltitudeProvider scheme="daylight">
      <Field label="Workspace name"><Input placeholder="Northwind Studio" /></Field>
      <Button variant="primary">Save changes</Button>
    </AltitudeProvider>
  );
}
```

Render `AltitudeProvider` once around your app. Schemes are `daylight`, `nightfall`, `mesa` and `alpine`; `accent="#0f8a6b"` swaps in your own colour. The components are client components (`"use client"`), so they work in frameworks with server components.

| Import | What it is |
|---|---|
| `altitude-design` | the components (ESM and CommonJS, with types) |
| `altitude-design/altitude.css` | tokens and component styles in one file (it also loads Instrument Sans and JetBrains Mono from Google Fonts) |
| `altitude-design/tokens.css`, `altitude-design/tokens.json` | the tokens on their own |
| `altitude-design/altitude.iife.js` | a `<script>` build that sets `window.Altitude`, for pages without a bundler; it expects React 18's UMD builds as `window.React` and `window.ReactDOM` |

## How the repository is laid out

```
project/   the design system itself: guides, tokens.json, components/src/*.tsx, bundle.css,
           and the built bundle.js and previews (the same files as the design system on claude.ai)
build/     the kit that builds and checks project/ (see build/SETUP.md)
scripts/   the npm package build and the Storybook story generator
.storybook/
```

There is one source for each thing. Components live in `project/components/src`, styles in `project/components/bundle.css`, tokens in `project/tokens.json`, and each component's preview in `build/previews.txt`. The npm package, the Storybook stories and the design system's own previews are all generated from those.

## Working on it

```sh
npm install && npm install --prefix build
npm run storybook          # http://localhost:6006
```

After changing a component, rebuild the design system's bundle and previews, and commit what they produce:

```sh
cd build && node build.mjs && node previews.mjs
```

CI fails if `project/` doesn't match its sources, so the design system on claude.ai can always be published straight from this folder.

## What happens on push

Every push and pull request runs the checks: the bundle and previews are rebuilt and must match what's committed, every preview is rendered in all four schemes with no errors, the interaction checks run, the sources type-check against React 19, and the package and Storybook are built.

A push to `main` then also:

- deploys Storybook to GitHub Pages;
- publishes to npm **if the version in `package.json` isn't published yet**, and tags the commit `v<version>`. To release, bump the version (`npm version patch`, `minor` or `major`) and push.

## Found a bug, or need something it doesn't do?

Open an issue: **https://github.com/richlaconte/altitude/issues/new/choose**. There are templates for a bug, a new feature for an existing component, and a new component, and [CONTRIBUTING.md](https://github.com/richlaconte/altitude/blob/main/CONTRIBUTING.md) says what makes each one useful.

**If you're an agent using this package** in someone else's project, you're welcome to report problems with it here:

1. Check it's Altitude's problem, not the app's: reproduce it with the smallest render that uses only the public API, inside `AltitudeProvider`, with `altitude-design/altitude.css` imported.
2. Look for an existing issue: `gh issue list --repo richlaconte/altitude --state all --search "<Component> <keywords>"`.
3. Fill in the matching template from [`.github/ISSUE_TEMPLATE/`](https://github.com/richlaconte/altitude/blob/main/.github/ISSUE_TEMPLATE/): title `<Component>: <what goes wrong>`, the installed version (from `node_modules/altitude-design/package.json`), how it's loaded (ESM, CommonJS or `altitude.iife.js`), React version, browser, and the scheme and mode (reduced motion, forced colours, `contrast="more"`) you saw it in.
4. File it only if the person you're working for agrees: `gh issue create --repo richlaconte/altitude --label bug --title "…" --body-file issue.md`. Otherwise hand them the drafted issue and the link above. End the body with `Filed by an agent (<model or tool>) on behalf of @<person>.`

The full guidance for agents is in [AGENTS.md](https://github.com/richlaconte/altitude/blob/main/AGENTS.md).

## License

[MIT](https://github.com/richlaconte/altitude/blob/main/LICENSE)
