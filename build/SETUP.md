# Altitude build kit

These scripts are not part of the published design system; they build and check it. In the repository they sit beside it:

```
<root>/
  project/   ← every file of the published design system artifact (design-system.json, tokens.json, *.md, components/…)
  build/     ← this kit
```

CI runs the whole loop below on every push, in parallel jobs (see `.github/workflows/ci.yml` and "CI's checks" below);
`npm ci` here installs the kit's own pinned versions (React 18, esbuild 0.24.2), which keep the design system's bundle
byte-for-byte reproducible.

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
| Render | `node shoot.mjs Name1,Name2 daylight,nightfall 960` | writes `test/shot-<Name>-<scheme>.png`, prints page errors and console errors/warnings, and exits non-zero if there are any. No names = every preview. Env: `DPR=2`, `WAIT=ms`, `FORCED=1` (forced colours), `ACT="(async()=>{ …page… })()"` to interact before the screenshot. |
| Interaction checks | `node checks/approach-and-lamps.mjs && node checks/field-focus.mjs && node checks/avatar.mjs && node checks/modal-lifecycle.mjs && node checks/inline-edit.mjs && node checks/actions-in-place.mjs` | after a render of every preview (they open `test/p-<Name>-daylight.html`); exit non-zero on a failure |
| Phone check | `node checks/phone.mjs [Name1,Name2]` | after a render: opens every preview at 320 and 375 CSS px as a phone (`isMobile`, `hasTouch`) and reports M1 sideways overflow, M2 hit areas under 24px (and under 44px on touch, probed where the browser hits, so a `::before` extension counts) and M6 field text under 16px on touch. `PHONE_FAIL=M1,M2-24,M6` makes those fail; the rest are warnings. `PHONE_LIST=1` lists every offender. Skip a known exception with `data-phone-ignore="why"` on an element (or `<body>`) |
| Contact sheet | `cd test && python3 ../sheet.py out.png Name1,Name2 daylight,nightfall` | needs Pillow |
| Data palette | `node palette.mjs && python3 tokens.py ../project/tokens.json` | only when a scheme's colours or the gates change; chooses every `data-*` token (see Theming, "The data palette"). CI runs `node palette.mjs --check` |
| Tokens | `python3 tokens.py ../project/tokens.json` | only if a token genuinely has to change; it re-checks contrast and must report 0 failures |

## Actions in place runtime coverage

The new modal, inline-edit and actions-in-place checks resolve their default HTML fixture root relative to `checks/fixture-path.mjs`, independent of the calling directory. `ALT_FIXTURE_ROOT` selects a different fixture directory; `CHROME` selects a Chromium binary.

After generating and rendering React 18 previews, run from the repository root:

```sh
node scripts/build-check-fixtures.mjs
ALT_FIXTURE_ROOT="$PWD/build/test/react19" node build/checks/modal-lifecycle.mjs
ALT_FIXTURE_ROOT="$PWD/build/test/react19" node build/checks/inline-edit.mjs
ALT_FIXTURE_ROOT="$PWD/build/test/react19" node build/checks/actions-in-place.mjs
ALT_CHECK_STRICT=1 node scripts/build-check-fixtures.mjs
ALT_FIXTURE_ROOT="$PWD/build/test/react19-strict" node build/checks/modal-lifecycle.mjs
ALT_FIXTURE_ROOT="$PWD/build/test/react19-strict" node build/checks/inline-edit.mjs
```

The builder reads the same canonical JSX and CSS in `previews.txt`, adds the normal default provider wrapper, and pins React, React DOM and JSX runtime imports to the root React 19 installation. It fails clearly for missing sections. An optional comma-separated argument selects sections, for example `node scripts/build-check-fixtures.mjs Dialog,Sheet`. The default is InlineEdit, Dialog, ActionsInPlace, Sheet, CommandPalette and Toaster. Strict fixtures use a development build and React StrictMode; generated assets stay under ignored `build/test/`.

CI wraps each check with `scripts/record-check.mjs` to retain exact command, exit status and logs in `build/test/alt-05/results.json` and `report.md`. Each CI job keeps its own; the `ci` job folds them into one record with `node scripts/record-check.mjs --merge <dir>…`, in the order the checks ran, and uploads it and the screenshots even on failure. Add local command evidence with `node scripts/record-check.mjs <label> <command> <args…>`. Human evaluation is tracked separately in `project/ActionsInPlaceValidation.md`; a green runtime suite cannot close those gates.

After `npm run build`, run `node scripts/check-actions-package.mjs` from the root to check ESM/CommonJS/IIFE exports and compile consumer examples against both the generated npm declarations and the hand-maintained design-system declarations. CI records this check as `package-api`.

## CI's checks

`checks/ci.json` lists what CI's `checks` jobs run: every preview rendered in each scheme, the focused renders, and the
interaction checks against the React 18 previews and the React 19 and StrictMode fixtures. `scripts/ci-checks.mjs`
splits that into shards of about equal time, each on a runner of its own, and runs a shard's share one after another.
From the repository root, after the one-time setup:

```sh
node scripts/ci-checks.mjs            # everything, as CI does across all its shards
node scripts/ci-checks.mjs 3/6        # what CI's "Checks 3/6" job runs
node scripts/ci-checks.mjs --plan 1/6 # what each shard runs, and its expected time
```

**A new check needs no entry.** Every `.mjs` in `checks/` runs as a React 18 check, wrapped in `record-check.mjs` and
labelled `react18-<file>`, unless `ci.json` says otherwise:

- `elsewhere`: a helper, or a check another script runs, with the file that names it (the `build` job fails if that
  file doesn't);
- `react19.checks` and `strict.checks`: the checks that also run against the React 19 and StrictMode fixtures;
- `seconds`: how long a check takes, from a CI run's `alt-05/results.json`. It only balances the shards; a check
  without one counts as 10.
