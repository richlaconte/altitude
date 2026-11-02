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

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Terminal` as first used in its preview:

```tsx
import { Terminal } from 'altitude-design';

<Terminal command="npm test" output={testRun} status="exited" exitCode={1} duration={4200} />
```

The full preview, as rendered in Storybook and checked in CI (`tm` is the preview page's own layout class, not Altitude's):

```tsx
import * as React from 'react';
import { Terminal } from 'altitude-design';

const E = String.fromCharCode(27);
const testRun = [
  { text: '> altitude@0.2.1 test\n> vitest run\n\n' },
  { text: E + '[32m ✓' + E + '[0m src/format.test.ts ' + E + '[2m(12 tests)' + E + '[0m\n' },
  { text: E + '[32m ✓' + E + '[0m src/tokens.test.ts ' + E + '[2m(31 tests)' + E + '[0m\n' },
  { text: E + '[31m ✗' + E + '[0m src/billing.test.ts > refunds an annual plan\n' },
  { text: '   AssertionError: expected 240 to equal 200\n', stream: 'stderr' },
  { text: '\n' + E + '[1m Tests' + E + '[0m  ' + E + '[31m1 failed' + E + '[0m | ' + E + '[32m43 passed' + E + '[0m (44)\n' },
];
export default function App() {
  const [n, setN] = React.useState(0);
  const [stopped, setStopped] = React.useState(false);
  React.useEffect(() => { if (stopped || n >= 30) return; const t = setTimeout(() => setN(n + 1), 140); return () => clearTimeout(t); }, [n, stopped]);
  const lines = Array.from({ length: n }, (_, i) => `[migrate] applying 2026_10_${String(i + 1).padStart(2, '0')}_add_index.sql … ok\n`).join('');
  return (
    <div className="tm">
      <Terminal command="npm test" output={testRun} status="exited" exitCode={1} duration={4200} />
      <Terminal command="npm run migrate" output={lines} status={stopped ? 'stopped' : n >= 30 ? 'exited' : 'running'} exitCode={0} duration={n * 140}
        onStop={() => setStopped(true)} stopOnEscape />
    </div>
  );
}
```
<!-- /example -->
