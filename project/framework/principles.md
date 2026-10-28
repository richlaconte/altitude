# Scope and ownership

Altitude supplies native/control semantics, keyboard and focus contracts, operation state, and reusable compositions. Applications supply authorization, validation, durable persistence, identity, service concurrency, routing/history, and the truth of content. People validate whether a task and its language fit their context.

Keep the ground as the record. Unsaved input is local editing; pending starts when a write is dispatched. Show committed only after the service confirms the promised outcome. Pair elevation with text, state, icons or borders. Follow the existing Elevation guide, shipped as `visual/Elevation.md` in package guidance; this framework adds no tier.

Rule authority is explicit: normative standards retain their applicability and exceptions; informative implementation patterns and heuristics are contextual; Altitude visual policies govern this library; experimental hypotheses are not established human-performance findings. A rule's diagnostic class is separate from its authority. Deterministic violations can fail checks; application integration obligations need service fixtures; contextual findings need product review.

The machine-readable sources are `patterns/*.json`, `rules.json`, `evidence.json`, and their schemas. Pattern Markdown explains those contracts. Runtime sources and executable fixtures implement them; tests establish only the behavior they exercise. Package builds copy prose and generate indexes, versions, hashes, and reference snapshots. Do not hand-edit `dist/guidance`.

For each supported journey test narrow viewports, long translated content, RTL, zoom, reduced motion and forced colors. Keep controls and status reachable without relying on hover, color or depth. Test with keyboard and relevant assistive technology; record browser/AT versions and remaining gaps. A passing scan is not a conformance claim.

## Run the examples and verification

The package includes runnable example compositions with public imports. In a consumer project with React, React DOM and Altitude installed, add the example bundler as a development dependency (`npm install --save-dev esbuild`), then run:

```sh
node node_modules/altitude-design/dist/guidance/references/scripts/build-framework-fixture.mjs --out work/altitude-examples
```

Open the generated `work/altitude-examples/index.html` in a browser. The helper aliases React, React DOM and Altitude to the consuming project's installed copies, avoiding duplicate providers or React instances. Its in-memory service demonstrates delays, rejection, real mutation and recovery; it does not supply production persistence. The same helper in the repository is `node scripts/build-framework-fixture.mjs --out work/altitude-examples`, after `npm run build`.

Files under `references/build/checks/` are version-matched evidence snapshots for inspection, not standalone installed test commands: they depend on repository tooling and fixtures. Maintainers run `node build/checks/pattern-workflows.mjs` in the repository after installing root and build dependencies, with a supported Playwright browser (or the `CHROME` executable environment variable). Consumers should adapt these scenarios into their own test runner using public exports and their actual service/navigation adapters; exercise delayed rejection, retry, retained data, keyboard and the real persistence outcome. `altitude doctor` checks installation and setup only. It does not run those application integration checks.
