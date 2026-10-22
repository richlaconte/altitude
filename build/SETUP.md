# Altitude build kit

These scripts are not part of the published design system; they build and check it. In the repository they sit beside it:

```
<root>/
  project/   ← every file of the published design system artifact (design-system.json, tokens.json, *.md, components/…)
  build/     ← this kit
```

CI runs the whole loop below on every push (see `.github/workflows/ci.yml`); `npm ci` here installs the kit's own pinned
versions (React 18, esbuild 0.24.2), which keep the design system's bundle byte-for-byte reproducible.

## One-time setup (run in build/)

```sh
npm install
mkdir -p test
cp node_modules/react/umd/react.production.min.js node_modules/react-dom/umd/react-dom.production.min.js test/
python3 tokcss.py ../project/tokens.json test/tokens.css   # CSS custom properties for local rendering only — never publish it
```

If Playwright's browser isn't installed, point `CHROME` at any Chromium or headless_shell binary.

## The loop

| Step | Command | Notes |
|---|---|---|
| Type-check | `npx tsc -p tsconfig.json` | strict; must be clean |
| Bundle | `node build.mjs` | writes `../project/components/bundle.js` (IIFE, global `Altitude`, React from `window`). Add every new top-level component name to the `names` array; sub-parts (e.g. `TabsList`) are not listed. |
| Previews | `node previews.mjs` | turns each `=== Name \| <!-- @dsCard … -->` section of `previews.txt` (with `--- css` and `--- jsx`) into `../project/components/Name/preview.html`. `A` is `window.Altitude`; `App` is rendered inside `AltitudeProvider`. |
| Render | `node shoot.mjs Name1,Name2 daylight,nightfall,mesa,alpine 960` | writes `test/shot-<Name>-<scheme>.png`, prints page errors and console errors/warnings, and exits non-zero if there are any. No names = every preview. Env: `DPR=2`, `WAIT=ms`, `FORCED=1` (forced colours), `ACT="(async()=>{ …page… })()"` to interact before the screenshot. |
| Interaction checks | `node checks/approach-and-lamps.mjs && node checks/field-focus.mjs` | after a render of every preview (they open `test/p-<Name>-daylight.html`); exit non-zero on a failure |
| Contact sheet | `cd test && python3 ../sheet.py out.png Name1,Name2 daylight,nightfall` | needs Pillow |
| Tokens | `python3 tokens.py ../project/tokens.json` | only if a token genuinely has to change; it re-checks contrast and must report 0 failures |
