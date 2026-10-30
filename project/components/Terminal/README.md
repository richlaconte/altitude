# Terminal

A command's output as it runs, with how it ended. Coding agents run `npm test`, `git status` or a migration; the person watches the output arrive, then reads the exit. `CodeBlock streaming` is for code being written; a process also has stderr, an exit status, a duration and Stop.

**Elevation: CodeBlock's frame, with a process's states.**
- **The frame** is flush on the ground with a 1px `line` rim, mono, no shadow, named by its command (`$ npm test`).
- **Running** isn't the record yet: a dashed `line-control` rule down the left, "Running", and Stop (secondary, level 1).
- **Finished**, the rule goes solid with one afterglow and the exit is said in words: "Exited with 0 · 4.2s" with a check, "Exited with 1 · 4.2s" with a critical mark (the edge stays neutral; Distinctiveness, CM3), or "Stopped by you".
- **stderr lines** carry a critical mark in the gutter and say "stderr" to screen readers.
- **"Jump to latest output"** floats at level 3 when you scroll up while it runs, as in `Conversation`.

**Accessibility.** A `figure` with a focusable `log` region that isn't live, so output isn't read line by line; completion is announced once ("npm test exited with 1 after 4.2 seconds."). Tab reaches the output, Stop and Copy; arrows scroll; Escape in the output stops a running command when `stopOnEscape` is set.

**ANSI.** With `ansi` (default), red, yellow and green map to `critical`, `caution` and `positive`, blue and cyan to `accent-ink`, dim to `ink-muted`, bold to 600; everything else is stripped. The status inks clear 4.5:1 as text on `surface-ground` in both schemes (lowest: `positive` in daylight, 5.31). A carriage return overwrites its line, so progress bars settle on their last state.

**Props:** `command`, `output` (a string, or `{ text, stream?: 'stdout' | 'stderr' }[]`), `status` (`'running' | 'exited' | 'stopped'`), `exitCode`, `duration`, `onStop`, `stopOnEscape`, `maxLines` (default 400; earlier lines behind "Show N earlier lines"), `ansi`, `copyable`.

**You provide:** the chunks as they arrive, the status, and the exit code and duration when it ends.

```tsx
<Terminal command="npm test" output={chunks} status={run.status} exitCode={run.code} duration={run.ms}
  onStop={run.status === 'running' ? stop : undefined} />
```

- Do keep stderr marked as stderr; it's how a failing line is found.
- Do say the exit, even when it's 0.
- Don't use it for code the agent is writing (that's `CodeBlock streaming`).
