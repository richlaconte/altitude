# Connect installed guidance to an agent

Install `altitude-design`, then run the installed binary from the consumer project root. The Node CLI has no runtime React dependency and no install hook. It never writes to a project merely because the package is installed.

```sh
npm exec -- altitude init --client codex
npm exec -- altitude init --client codex --apply
npm exec -- altitude init --client claude --apply
npm exec -- altitude patterns "edit settings" --json
npm exec -- altitude explain ALT-EDIT-001
npm exec -- altitude doctor --json
npm exec -- altitude init --client codex --remove
npm exec -- altitude init --client codex --remove --apply
```

`init` defaults to a preview, including the exact before/after text. `--apply` applies that preview. `--client all` targets both clients. Repeating setup makes no change. Removal removes only the managed block, restoring surrounding bytes; a file created by setup is removed only if nothing else remains. User-edited managed blocks, malformed markers and symlinks are rejected for manual reconciliation. Existing instructions outside the block are preserved. Run setup again after upgrading the installed package. Use `--cwd PATH` to target an explicit project directory. Resolution uses that directory's installed `altitude-design/package.json`, never the version fetched by a different CLI invocation.

The Codex adapter writes a compact routing block to project `AGENTS.md` (or an existing nonempty `AGENTS.override.md`, which Codex gives precedence); the Claude Code adapter writes it to project `CLAUDE.md`. Neither assumes instruction files under `node_modules` are automatically discovered. The routing block points at version-matched local focused documents rather than importing the complete manual. Restart the agent session after setup. Confirm Codex reports the project instruction file and Claude Code's `/context` lists it under Memory files; then ask an ordinary product question and check that the relevant pattern is read. Instructions are context, not enforcement, and broader or more specific instructions may affect discovery.

Mechanisms verified against official documentation on 2026-10-23: [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) describes root-to-working-directory instruction discovery, override precedence and size limits; [Claude Code memory](https://code.claude.com/docs/en/memory) documents project `CLAUDE.md` loading and `/context` inspection. The adapter tests verify files and round trips, not successful behavior of every client release. Claude Code also documents AGENTS.md support; CLAUDE.md remains the explicit adapter target.

`doctor` reports stable rule IDs, observed evidence, expected behavior, repairs and verification. It returns a failing exit code only for deterministic installation/setup defects; service integration and contextual obligations remain visibly unverified. It does not inspect an application's service behavior or certify accessibility. Guidance remains usable offline through `altitude-design/guidance`, `altitude-design/guidance/*`, and physical `node_modules/altitude-design/dist/guidance` files. Tooling stays outside browser imports.
