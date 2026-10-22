# Altitude

A React component library where **height is the interface**. Its one idea: the ground is the record. Settled content sits on the ground; anything live rises above it; anything waiting to receive sinks below it.

- **Storybook:** every component, with its guidelines and a live preview in all four schemes: `https://<owner>.github.io/<repo>/`
- **The design guide:** [`project/README.md`](project/README.md), then [Elevation](project/Elevation.md), [Motion](project/Motion.md), [Theming](project/Theming.md) and [Research](project/Research.md)

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

## Issues and requests

Requests for new components, new functionality and bug reports each have a template; [CONTRIBUTING.md](CONTRIBUTING.md) says how to write a useful one. Agents can file issues too: see [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)
