import * as React from 'react';
import { cx, useIsoLayoutEffect } from './core';
import { CopyButton } from './copy-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './controls';

/* ───────────────────────── CodeBlock ───────────────────────── */

export interface CodeBlockTab {
  label: string;
  code: string;
  language?: string;
}
export interface CodeBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** The code, for a single block. */
  code?: string;
  language?: string;
  /** A filename or what the code is ("Install"). Shown in the header and names the scroll region. */
  title?: React.ReactNode;
  /** The same thing in several forms (npm, pnpm; curl, Node, Python): a segmented switch in the header. */
  tabs?: CodeBlockTab[];
  /** Lines to highlight, counted from 1. */
  highlight?: number[];
  /** Your highlighter (Shiki, Prism): returns the code coloured. Altitude ships none. */
  syntax?: (code: string, language?: string) => React.ReactNode;
  /** Line numbers in a gutter (hidden from assistive technology). Default false. */
  lineNumbers?: boolean;
  /** The code is still arriving (from an agent): a dashed rule and "Writing…", aria-busy. */
  streaming?: boolean;
  /** Taller code scrolls. Default 360. */
  maxHeight?: number | string;
  /** Default true. */
  copyable?: boolean;
}

/** One code body: lines (or your highlighter's output), highlighted bands, a gutter, and a scroll region when it overflows. */
function Body({ code, language, highlight = [], syntax, lineNumbers, maxHeight, name }: { code: string; language?: string; highlight?: number[]; syntax?: CodeBlockProps['syntax']; lineNumbers?: boolean; maxHeight: number | string; name: string }) {
  const lines = code.replace(/\n$/, '').split('\n');
  const scroller = React.useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = React.useState(false);
  useIsoLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [code]);
  const marked = highlight.filter((n) => n >= 1 && n <= lines.length);
  const said = marked.length ? `${marked.length === 1 ? 'Line' : 'Lines'} ${marked.join(', ').replace(/, (\d+)$/, ' and $1')} ${marked.length === 1 ? 'is' : 'are'} highlighted.` : '';
  // A focusable, named region only when there's something to scroll to (keyboard users scroll it with the arrows).
  const region = overflows ? { tabIndex: 0, role: 'region', 'aria-label': name } : {};
  return (
    <div ref={scroller} className="alt-code-scroll" style={{ maxHeight }} {...region}>
      {said && <span className="alt-sr">{said}</span>}
      <div className="alt-code-grid" data-numbers={lineNumbers ? '' : undefined} style={{ ['--alt-lines' as any]: lines.length }}>
        {marked.map((n) => <span key={n} className="alt-code-band" aria-hidden="true" style={{ ['--l' as any]: n - 1 }} />)}
        {lineNumbers && <span className="alt-code-gutter" aria-hidden="true">{lines.map((_, i) => <span key={i}>{i + 1}</span>)}</span>}
        <pre className="alt-code-pre"><code data-language={language}>{syntax ? syntax(code, language) : lines.map((l, i) => <span key={i} className="alt-code-line">{l}{i < lines.length - 1 ? '\n' : ''}</span>)}</code></pre>
      </div>
    </div>
  );
}

/**
 * Code shown to read and copy is the record: it lies flush on the ground with a line rim, in mono, with no shadow.
 * Several forms of the same thing switch with segmented Tabs; copy is a CopyButton; code still arriving has a dashed rule.
 */
export function CodeBlock({ code = '', language, title, tabs, highlight, syntax, lineNumbers, streaming, maxHeight = 360, copyable = true, className, ...rest }: CodeBlockProps) {
  const [tab, setTab] = React.useState(tabs?.[0]?.label ?? '');
  const current = tabs?.find((t) => t.label === tab) ?? tabs?.[0];
  const shown = current?.code ?? code;
  const lang = current?.language ?? language;
  const id = React.useId();
  const name = `${typeof title === 'string' ? title : lang ?? 'Code'}${tabs ? `, ${current?.label}` : ''}`;
  const header = (title || lang || tabs || copyable || streaming) && (
    <div className="alt-code-head">
      {title ? <span id={`${id}-t`} className="alt-code-title">{title}</span> : lang && !tabs ? <span className="alt-code-title" data-language="">{lang}</span> : null}
      {tabs && <TabsList aria-label={typeof title === 'string' ? `${title}: choose a form` : 'Choose a form'}>{tabs.map((t) => <TabsTrigger key={t.label} value={t.label}>{t.label}</TabsTrigger>)}</TabsList>}
      <span className="alt-code-tools">
        {streaming && <span className="alt-code-writing">Writing…</span>}
        {copyable && <CopyButton size="sm" value={shown} label="Copy code" disabled={streaming} />}
      </span>
    </div>
  );
  const body = (c: string, l?: string) => <Body code={c} language={l} highlight={highlight} syntax={syntax} lineNumbers={lineNumbers} maxHeight={maxHeight} name={name} />;
  return (
    // The header can't be a figcaption: with tabs it sits inside the Tabs wrapper. The title names the figure instead.
    <figure className={cx('alt-code', className)} aria-labelledby={title ? `${id}-t` : undefined} data-streaming={streaming ? '' : undefined} aria-busy={streaming || undefined} {...rest}>
      {tabs
        ? <Tabs variant="segmented" value={tab} onValueChange={setTab} className="alt-code-tabs">
            {header}
            {tabs.map((t) => <TabsContent key={t.label} value={t.label} className="alt-code-panel">{body(t.code, t.language)}</TabsContent>)}
          </Tabs>
        : <>{header}{body(shown, lang)}</>}
    </figure>
  );
}
