import * as React from 'react';
import { cx, Icons, useDepth } from './core';
import { Button } from './controls';
import { CopyButton } from './copy-button';
import { formatDuration } from './trace';

export type TerminalChunk = { text: string; stream?: 'stdout' | 'stderr' };
export interface TerminalProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** The command that ran: "npm test". It names the figure. */
  command: string;
  /** Everything it has printed so far: a string, or chunks marked stdout or stderr as they arrived. */
  output: string | TerminalChunk[];
  /** Default 'running'. */
  status?: 'running' | 'exited' | 'stopped';
  exitCode?: number;
  /** Milliseconds it ran (said once it's finished). */
  duration?: number;
  /** Shows Stop while it runs. */
  onStop?: () => void;
  /** Escape inside the output stops a running command. Default false. */
  stopOnEscape?: boolean;
  /** Lines kept on screen; earlier ones are behind "Show 1,204 earlier lines". Default 400. */
  maxLines?: number;
  /** Map ANSI colours to Altitude's inks (red, yellow and green to the status inks, blue and cyan to accent-ink, dim to ink-muted). Default true; off, escapes are stripped. */
  ansi?: boolean;
  /** Shows Copy for the whole output. Default true. */
  copyable?: boolean;
}

type Seg = { text: string; tone?: string; bold?: boolean };
type Line = { stream: 'stdout' | 'stderr'; segs: Seg[] };
const ESC = /\x1b\[([0-9;?]*)([A-Za-z])|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()][A-Za-z0-9]/g;
const TONES: Record<number, string> = { 31: 'critical', 91: 'critical', 33: 'caution', 93: 'caution', 32: 'positive', 92: 'positive', 34: 'accent', 94: 'accent', 36: 'accent', 96: 'accent', 90: 'muted', 37: 'ink', 97: 'ink', 30: 'ink' };

// Splits output into lines with their stream and ANSI styling. A carriage return overwrites the line (progress bars).
function linesOf(output: string | TerminalChunk[], ansi: boolean): Line[] {
  const chunks = typeof output === 'string' ? [{ text: output, stream: 'stdout' as const }] : output;
  const lines: Line[] = [];
  let open = false;
  let style: { tone?: string; bold?: boolean } = {};
  for (const c of chunks) {
    const stream = c.stream ?? 'stdout';
    const parts = c.text.split('\n');
    parts.forEach((raw, k) => {
      // The newline that ends a chunk closes its line; it doesn't start an empty one.
      if (k === parts.length - 1 && k > 0 && raw === '') return;
      let line: Line;
      if (k === 0 && open && lines[lines.length - 1].stream === stream) line = lines[lines.length - 1];
      else { line = { stream, segs: [] }; lines.push(line); }
      let text = raw;
      const cr = text.lastIndexOf('\r');
      if (cr >= 0) { line.segs = []; text = text.slice(cr + 1); }
      let at = 0;
      ESC.lastIndex = 0;
      for (let m: RegExpExecArray | null; (m = ESC.exec(text)); ) {
        if (m.index > at) line.segs.push({ text: text.slice(at, m.index), ...style });
        at = m.index + m[0].length;
        if (ansi && m[2] === 'm') for (const n of (m[1] || '0').split(';').map(Number)) {
          if (n === 0) style = {};
          else if (n === 1) style = { ...style, bold: true };
          else if (n === 2) style = { ...style, tone: 'muted' };
          else if (n === 22) style = { ...style, bold: false };
          else if (n === 39) style = { ...style, tone: undefined };
          else if (TONES[n]) style = { ...style, tone: TONES[n] };
        }
      }
      if (at < text.length) line.segs.push({ text: text.slice(at), ...style });
    });
    open = !c.text.endsWith('\n');
  }
  return lines;
}
const plain = (l: Line) => l.segs.map((s) => s.text).join('');

/**
 * A command's output as it runs (#273), in CodeBlock's frame: flush on the ground with a 1px rim, mono. While it runs
 * it isn't the record yet: a dashed rule down the left, "Running", and the output follows its end until you scroll up
 * (then "Jump to latest output" rises). It finishes with one afterglow and its exit in words: "Exited with 0 · 4.2s",
 * with a critical mark when non-zero (the edge stays neutral: #374), or "Stopped by you". stderr lines carry a critical mark and say "stderr".
 */
export function Terminal({ command, output, status = 'running', exitCode, duration, onStop, stopOnEscape = false, maxLines = 400, ansi = true, copyable = true, className, ...rest }: TerminalProps) {
  const lines = React.useMemo(() => linesOf(output, ansi), [output, ansi]);
  const [all, setAll] = React.useState(false);
  const hidden = all ? 0 : Math.max(0, lines.length - maxLines);
  const shown = hidden ? lines.slice(hidden) : lines;
  const body = React.useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = React.useState(true);
  const following = React.useRef(true);
  React.useLayoutEffect(() => { const el = body.current; if (el && following.current) el.scrollTop = el.scrollHeight; });
  const running = status === 'running';
  const failed = status === 'exited' && exitCode !== undefined && exitCode !== 0;
  const [said, setSaid] = React.useState('');
  const [glow, setGlow] = React.useState(0);
  const last = React.useRef(status);
  React.useEffect(() => {
    if (last.current === 'running' && status !== 'running') {
      setGlow((n) => n + 1);
      const took = duration !== undefined ? ` after ${formatDuration(duration).replace(/(\d)s$/, '$1 seconds').replace(/ms$/, ' milliseconds')}` : '';
      setSaid(status === 'stopped' ? `${command} stopped.` : `${command} exited with ${exitCode ?? 0}${took}.`);
    }
    last.current = status;
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  const { style, 'aria-busy': _b, ...depth } = useDepth({ settle: glow || undefined });
  const exit = status === 'stopped' ? 'Stopped by you' : status === 'exited' ? `Exited with ${exitCode ?? 0}${duration !== undefined ? ` · ${formatDuration(duration)}` : ''}` : null;
  return (
    <figure {...rest} {...depth} style={style} className={cx('alt-code alt-term', className)} aria-label={`$ ${command}`} aria-busy={running || undefined}
      data-status={status} data-failed={failed ? '' : undefined}>
      <div className="alt-code-head">
        <code className="alt-term-cmd"><span className="alt-term-prompt" aria-hidden="true">$ </span>{command}</code>
        <span className="alt-code-tools">
          {running && <span className="alt-code-writing">Running</span>}
          {running && onStop && <Button size="sm" variant="secondary" onClick={onStop}><Icons.Stop size={12} aria-hidden="true" />Stop<span className="alt-sr"> command</span></Button>}
          {copyable && <CopyButton size="sm" label="Copy output" value={() => lines.map(plain).join('\n')} />}
        </span>
      </div>
      <div className="alt-term-viewport">
        <div ref={body} className="alt-term-body" role="log" aria-live="off" aria-label={`Output of ${command}`} tabIndex={0}
          onScroll={(e) => { const el = e.currentTarget; const end = el.scrollTop + el.clientHeight >= el.scrollHeight - 8; following.current = end; setAtEnd(end); }}
          onKeyDown={(e) => { if (e.key === 'Escape' && stopOnEscape && running && onStop) { e.preventDefault(); onStop(); } }}>
          {hidden > 0 && <button type="button" className="alt-term-more" onClick={() => { following.current = false; setAll(true); }}>Show {hidden.toLocaleString()} earlier line{hidden === 1 ? '' : 's'}</button>}
          <pre className="alt-term-pre">{shown.map((l, i) => (
            <span key={hidden + i} className="alt-term-line" data-stream={l.stream === 'stderr' ? 'stderr' : undefined}>
              {l.stream === 'stderr' && <span className="alt-sr">stderr: </span>}
              {l.segs.map((s, j) => s.tone || s.bold ? <span key={j} data-tone={s.tone} data-bold={s.bold ? '' : undefined}>{s.text}</span> : s.text)}
              {'\n'}
            </span>
          ))}</pre>
        </div>
        {!atEnd && running && <Button size="sm" className="alt-term-jump" onClick={() => { const el = body.current; if (!el) return; following.current = true; setAtEnd(true); el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }}><Icons.ArrowDown size={14} />Jump to latest output</Button>}
      </div>
      {exit && (
        <figcaption className="alt-term-exit" data-tone={failed ? 'critical' : undefined}>
          {status === 'exited' && (failed ? <Icons.AlertCircle size={13} aria-hidden="true" /> : <Icons.CircleCheck size={13} aria-hidden="true" />)}{exit}
        </figcaption>
      )}
      <span className="alt-sr alt-term-said" role="status" aria-live="polite">{said}</span>
    </figure>
  );
}
