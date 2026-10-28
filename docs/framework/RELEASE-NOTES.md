# Unreleased — design and HCI framework

No package version bump, npm publish or deployment is part of this change. The existing package version remains the development build identity; release managers must select a new version before publication. Generated guidance always matches the package version used to build it.

## Added

- Four experimental task patterns with typed hooks, shared error summary/status feedback, adverse-state service fixtures and generated previews.
- A versioned local knowledge catalog: authority, applicability, exceptions, sources, evidence status, stable rules and linked verification.
- Explicit Node CLI setup for Codex/Claude Code, intent discovery, rule explanation and scoped installation diagnostics.
- Clean packed consumer checks for runtime exports, resources and ESM/CommonJS/Bundler/NodeNext declarations; meaningful-state accessibility and responsive tests.
- Reproducible three-condition agent evaluation harness and separate manual validation protocol.

## Repairs and compatibility

Existing runtime imports and CSS/font/token/IIFE entry points remain. New APIs are additive on the existing runtime entry; no new provider, router, form library or backend is required. New hooks use explicit result objects and required validation/selection policies. A malformed JavaScript adapter response becomes failure, never success.

Interactive Surface keeps its default element for compatibility but now supplies button role/keyboard behavior when used as an action. Prefer `as="button"` for an action and `as="a" href="…"` for navigation. Native buttons default to `type="button"`; explicitly use `type="submit"` for form submission. Existing custom key handlers should call `preventDefault()` if they own activation. Do not nest controls inside a button; use a noninteractive container with separate actions for compound content. Disabled interactions are blocked.

Field renders both hint and error and merges the child's external description IDs, preserving caller-supplied required state. Applications must still provide real external referenced IDs and useful labels.

Select now participates in native form validity, FormData, disabled and reset behavior through a visually hidden native select. This intentionally changes formerly invalid behavior: required empty Select blocks native form submission. Uncontrolled reset returns to the declared default; controlled values stay application-owned, so use the form’s `onReset` to reset controlled state deliberately. Supply explicit error text for business validation. Native required errors get a useful accessible message.

The sparse Dialog focus audit case was already repaired on current main by Actions in place; this change retains that ownership model and adds regression coverage.

Declarations now have separate generated ESM and CommonJS trees with explicit relative extensions for NodeNext. Runtime module identity is unchanged; do not mix ESM and CommonJS imports within one React tree.

## Setup and upgrades

1. Install the selected release locally.
2. Preview `npx altitude init --client codex` (or `claude`), review the exact changes, then rerun with `--apply`.
3. Ask for ordinary product work. The project pointer routes the agent to a focused installed pattern.
4. After upgrades, run `npx altitude doctor --json` and refresh the managed pointer. Modified user blocks are never silently overwritten.
5. To uninstall integration, preview `npx altitude init --client codex --remove`, then apply. Existing instructions and later additions remain.

Patterns coordinate UI state; applications own permission checks, data models, business validation, concurrency/idempotency, routing and durable storage. `requestLeave` is an explicit integration point, not a universal browser/router interceptor. Undo is only meaningful when its adapter actually restores data. No automated test establishes human usability or complete accessibility.
