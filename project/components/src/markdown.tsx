import * as React from 'react';
import { cx, Icons } from './core';
import { CodeBlock } from './code-block';
import { Link } from './link';
import { CitationSource, InlineCitation } from './inline-citation';
import { Separator } from './separator';

/** The elements a caller can replace. `pre` gets the fenced code's parts rather than children. */
export interface MarkdownComponents {
  a?: React.ComponentType<React.AnchorHTMLAttributes<HTMLAnchorElement>>;
  img?: React.ComponentType<React.ImgHTMLAttributes<HTMLImageElement>>;
  code?: React.ComponentType<React.HTMLAttributes<HTMLElement>>;
  pre?: React.ComponentType<{ code: string; language?: string; streaming?: boolean }>;
  table?: React.ComponentType<React.TableHTMLAttributes<HTMLTableElement>>;
  blockquote?: React.ComponentType<React.BlockquoteHTMLAttributes<HTMLQuoteElement>>;
}

export interface MarkdownProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The Markdown source: CommonMark, plus GFM tables, task lists, strikethrough and bare links. */
  children: string;
  /**
   * The answer is still arriving: unfinished constructs render as unfinished, never as raw text. An open fence is a
   * streaming CodeBlock, a table shows nothing until its delimiter row arrives and never a half-received row, and an
   * unclosed `**`, backtick or link shows its text without the markers.
   */
  streaming?: boolean;
  /** Sources for `[n]` markers, which render as InlineCitation (1-based). */
  citations?: CitationSource[];
  /** Passed to InlineCitation, as in Sources. */
  idPrefix?: string;
  /** Passed to every CodeBlock. */
  syntax?: (code: string, language?: string) => React.ReactNode;
  /** The element level of a `#` heading. Default 3, so an answer's headings sit under the conversation's. */
  headingLevel?: number;
  /** Replace the element used for a kind of node, e.g. `{ a: RouterLink }`. */
  components?: MarkdownComponents;
  /** Render raw HTML blocks from the source. Default false: they show as text. Only for sources you trust. */
  allowHtml?: boolean;
  /** Rewrite or refuse (undefined) a link or image URL. Default: refuses javascript:, vbscript:, file: and data: (except images). */
  transformUrl?: (url: string, kind: 'link' | 'image') => string | undefined;
}

// ---- Blocks -------------------------------------------------------------------------------------------------------

type Align = 'left' | 'center' | 'right' | undefined;
type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; depth: number; text: string }
  | { t: 'hr' }
  | { t: 'code'; lang?: string; code: string; open: boolean }
  | { t: 'quote'; children: Block[] }
  | { t: 'list'; ordered: boolean; start: number; tight: boolean; items: { task?: boolean; children: Block[] }[] }
  | { t: 'table'; align: Align[]; head: string[]; rows: string[][] }
  | { t: 'html'; html: string };
interface Opts { streaming: boolean; partialLast: boolean; allowHtml: boolean }

const FENCE = /^( {0,3})(`{3,}|~{3,})[ \t]*([^\s`]*)[^`]*$/;
const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const QUOTE = /^ {0,3}> ?(.*)$/;
const BULLET = /^( {0,3})([-+*])(?:([ \t]+)(.*)|$)/;
const ORDERED = /^( {0,3})(\d{1,9})([.)])(?:([ \t]+)(.*)|$)/;
const DELIM = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
const HTML = /^ {0,3}<(?:\/?[a-zA-Z][\w-]*[\s/>]|\/?[a-zA-Z][\w-]*$|!--)/;

const indentOf = (l: string) => { let n = 0; for (const c of l) { if (c === ' ') n++; else if (c === '\t') n += 4 - (n % 4); else break; } return n; };
const dedent = (l: string, n: number) => { let i = 0, w = 0; while (i < l.length && w < n && (l[i] === ' ' || l[i] === '\t')) { w += l[i] === '\t' ? 4 - (w % 4) : 1; i++; } return l.slice(i); };
const listStart = (l: string, para: boolean) => {
  const b = BULLET.exec(l); if (b) return !para || !!b[4]?.trim();
  const o = ORDERED.exec(l); return !!o && (!para || (o[2] === '1' && !!o[5]?.trim()));
};
const startsBlock = (l: string, o: Opts) => FENCE.test(l) || ATX.test(l) || HR.test(l) || QUOTE.test(l) || listStart(l, true) || (o.allowHtml && HTML.test(l));
const splitRow = (l: string) => {
  let s = l.trim(); if (s.startsWith('|')) s = s.slice(1); if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const cells: string[] = []; let cur = '', code = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && s[i + 1] === '|') { cur += '|'; i++; continue; }
    if (c === '`') code ^= 1;
    if (c === '|' && !code) { cells.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  cells.push(cur.trim());
  return cells;
};

function parseBlocks(lines: string[], o: Opts): Block[] {
  const out: Block[] = [];
  let para: string[] | null = null;
  const flush = () => { if (para) { out.push({ t: 'p', text: para.join('\n') }); para = null; } };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const last = i === lines.length - 1;
    if (!line.trim()) { flush(); i++; continue; }
    let m: RegExpExecArray | null;
    if ((m = FENCE.exec(line))) {
      flush();
      const indent = m[1].length, fence = m[2], close = new RegExp(`^ {0,3}${fence[0] === '`' ? '`' : '~'}{${fence.length},}[ \\t]*$`);
      const body: string[] = [];
      let closed = false;
      for (i++; i < lines.length; i++) {
        if (close.test(lines[i])) { closed = true; i++; break; }
        body.push(dedent(lines[i], indent));
      }
      // A closing fence still arriving ("``") isn't code.
      if (!closed && o.partialLast && body.length && /^ {0,3}(`{1,}|~{1,})$/.test(body[body.length - 1])) body.pop();
      out.push({ t: 'code', lang: m[3] || undefined, code: body.join('\n'), open: !closed && o.streaming });
      continue;
    }
    if ((m = ATX.exec(line))) { flush(); out.push({ t: 'h', depth: m[1].length, text: m[2] ?? '' }); i++; continue; }
    if (para && /^ {0,3}(=+|-+)[ \t]*$/.test(line) && !(o.partialLast && last)) { out.push({ t: 'h', depth: line.trim()[0] === '=' ? 1 : 2, text: para.join('\n') }); para = null; i++; continue; }
    if (HR.test(line)) { flush(); out.push({ t: 'hr' }); i++; continue; }
    if (QUOTE.test(line)) {
      flush();
      const inner: string[] = [];
      while (i < lines.length && lines[i].trim()) {
        const q = QUOTE.exec(lines[i]);
        if (q) inner.push(q[1]);
        else if (inner.length && !startsBlock(lines[i], o)) inner.push(lines[i]); // a lazy continuation of its paragraph
        else break;
        i++;
      }
      out.push({ t: 'quote', children: parseBlocks(inner, { ...o, partialLast: o.partialLast && i === lines.length }) });
      continue;
    }
    if (listStart(line, !!para)) {
      flush();
      const first = BULLET.exec(line);
      const ordered = !first;
      const kind = (l: string) => { const b = BULLET.exec(l); if (b) return ordered ? null : b; const n = ORDERED.exec(l); return ordered && n ? n : null; };
      const marker = first ? first[2] : ORDERED.exec(line)![3];
      const start = ordered ? parseInt(ORDERED.exec(line)![2], 10) : 1;
      const items: { task?: boolean; children: Block[] }[] = [];
      let tight = true;
      while (i < lines.length) {
        const im = kind(lines[i]);
        if (!im || (ordered ? im[3] : im[2]) !== marker || HR.test(lines[i])) break;
        const lead = im[1].length, mark = ordered ? im[2].length + 1 : 1;
        const gap = (ordered ? im[4] : im[3]) ?? '', content = (ordered ? im[5] : im[4]) ?? '';
        const width = content && gap.length <= 4 ? gap.length : 1;
        const inset = lead + mark + width;
        const body = [content];
        let blank = false;
        for (i++; i < lines.length; i++) {
          const l = lines[i];
          if (!l.trim()) { body.push(''); blank = true; continue; }
          if (indentOf(l) >= inset) { body.push(dedent(l, inset)); blank = false; continue; }
          if (blank || kind(l) || startsBlock(l, o)) break;
          body.push(l.trimStart()); // a lazy continuation
        }
        let trailing = 0;
        while (body.length > 1 && !body[body.length - 1].trim()) { body.pop(); trailing++; }
        if (body.some((l, k) => k > 0 && !l.trim())) tight = false;
        if (trailing && i < lines.length && kind(lines[i])) tight = false;
        let task: boolean | undefined;
        const t = /^\[([ xX])\](?:[ \t]+|$)/.exec(body[0]);
        if (t) { task = t[1] !== ' '; body[0] = body[0].slice(t[0].length); }
        items.push({ task, children: parseBlocks(body, { ...o, partialLast: o.partialLast && i === lines.length }) });
      }
      out.push({ t: 'list', ordered, start, tight, items });
      continue;
    }
    if (line.includes('|') && i + 1 < lines.length && DELIM.test(lines[i + 1]) && (lines[i + 1].includes('|') || line.trim().startsWith('|'))) {
      const head = splitRow(line), delim = splitRow(lines[i + 1]);
      if (head.length === delim.length) {
        flush();
        const align = delim.map((d): Align => (d.startsWith(':') && d.endsWith(':') ? 'center' : d.endsWith(':') ? 'right' : d.startsWith(':') ? 'left' : undefined));
        const rows: string[][] = [];
        for (i += 2; i < lines.length && lines[i].trim() && !startsBlock(lines[i], o); i++) {
          const r = splitRow(lines[i]);
          rows.push(head.map((_, k) => r[k] ?? ''));
        }
        // The row still arriving isn't drawn; its cells would shift as they came in.
        if (o.partialLast && i === lines.length && rows.length) rows.pop();
        out.push({ t: 'table', align, head, rows });
        continue;
      }
    }
    // A table header without its delimiter row yet: nothing until it's known to be a table.
    if (o.streaming && line.trim().startsWith('|') && (last || (i === lines.length - 2 && o.partialLast && /^ {0,3}\|?[\s:|-]*$/.test(lines[i + 1])))) { flush(); break; }
    if (o.allowHtml && HTML.test(line) && !para) {
      const html: string[] = [];
      while (i < lines.length && lines[i].trim()) html.push(lines[i++]);
      out.push({ t: 'html', html: html.join('\n') });
      continue;
    }
    if (!para && indentOf(line) >= 4) {
      const body: string[] = [];
      while (i < lines.length && (!lines[i].trim() || indentOf(lines[i]) >= 4)) body.push(dedent(lines[i++], 4));
      while (body.length && !body[body.length - 1].trim()) body.pop();
      out.push({ t: 'code', code: body.join('\n'), open: false });
      continue;
    }
    (para ??= []).push(line.trim() ? line.replace(/^[ \t]+/, '') : line);
    i++;
  }
  flush();
  return out;
}

// ---- Inline -------------------------------------------------------------------------------------------------------

interface Ctx extends Opts {
  citations?: CitationSource[];
  idPrefix?: string;
  syntax?: MarkdownProps['syntax'];
  headingLevel: number;
  components: MarkdownComponents;
  url: (url: string, kind: 'link' | 'image') => string | undefined;
}

const PUNCT = /[!-/:-@[-`{-~]/;
const SPECIAL = /[\\`*_~[\]!<\nhw]/;
const BARE = /^(?:https?:\/\/|www\.)[^\s<]*[^\s<?!.,:*_~)'"]/i;

export function safeUrl(url: string, kind: 'link' | 'image'): string | undefined {
  const u = url.trim();
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(u.replace(/[\u0000- ]/g, ''))?.[1]?.toLowerCase();
  if (!scheme) return u;
  if (scheme === 'javascript' || scheme === 'vbscript' || scheme === 'file') return undefined;
  if (scheme === 'data') return kind === 'image' && /^data:image\/(?:png|gif|jpe?g|webp|avif)[;,]/i.test(u) ? u : undefined;
  return u;
}

// Skips a code span starting at i (a run of backticks); returns the index after it, or -1 if it isn't closed.
const codeEnd = (s: string, i: number) => {
  let n = 0; while (s[i + n] === '`') n++;
  for (let j = i + n; j < s.length; j++) {
    if (s[j] !== '`') continue;
    let k = 0; while (s[j + k] === '`') k++;
    if (k === n) return j + k;
    j += k - 1;
  }
  return -1;
};

// The ']' matching the '[' at i, skipping code spans and escapes; -1 when it hasn't arrived.
const labelEnd = (s: string, i: number) => {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === '\\') { j++; continue; }
    if (c === '`') { const e = codeEnd(s, j); if (e > 0) { j = e - 1; continue; } }
    if (c === '[') depth++;
    else if (c === ']' && --depth === 0) return j;
  }
  return -1;
};

// "(dest "title")" starting at i: the destination and the index after ')'; end -1 while it's still arriving.
const destination = (s: string, i: number): { url: string; title?: string; end: number } | null => {
  if (s[i] !== '(') return null;
  let j = i + 1;
  while (s[j] === ' ' || s[j] === '\n') j++;
  let url = '';
  if (s[j] === '<') { const e = s.indexOf('>', j); if (e < 0) return { url: '', end: -1 }; url = s.slice(j + 1, e); j = e + 1; }
  else {
    let depth = 0;
    for (; j < s.length; j++) {
      const c = s[j];
      if (c === '\\' && PUNCT.test(s[j + 1] ?? '')) { url += s[++j]; continue; }
      if (c === '(') depth++;
      else if (c === ')') { if (depth === 0) break; depth--; }
      else if (/\s/.test(c)) break;
      url += c;
    }
  }
  while (s[j] === ' ' || s[j] === '\n') j++;
  let title: string | undefined;
  if (s[j] === '"' || s[j] === "'") { const q = s[j], e = s.indexOf(q, j + 1); if (e < 0) return { url, end: -1 }; title = s.slice(j + 1, e); j = e + 1; while (s[j] === ' ') j++; }
  if (j >= s.length) return { url, end: -1 };
  return s[j] === ')' ? { url, title, end: j + 1 } : null;
};

// The closing delimiter for a run at i: same character, a closer (not after whitespace), outside code spans.
const closerOf = (s: string, i: number, d: string) => {
  const c = d[0], n = d.length;
  for (let j = i + n; j < s.length; j++) {
    const x = s[j];
    if (x === '\\') { j++; continue; }
    if (x === '`') { const e = codeEnd(s, j); if (e > 0) { j = e - 1; continue; } }
    if (x === '[') { const e = labelEnd(s, j); if (e > 0) { j = e; continue; } }
    if (x !== c) continue;
    let k = 0; while (s[j + k] === c) k++;
    const after = s[j + k] ?? '';
    const ok = !/\s/.test(s[j - 1]) && (c !== '_' || !/[\p{L}\p{N}]/u.test(after));
    if (ok && (n === 1 ? k === 1 || k >= 3 : k >= 2) && j > i + n) return j + (n === 1 && k >= 3 ? k - 1 : 0);
    j += k - 1;
  }
  return -1;
};

function inline(s: string, c: Ctx, key = 'i'): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let text = '';
  const push = (node: React.ReactNode) => { if (text) { out.push(text); text = ''; } out.push(node); };
  const k = () => `${key}.${out.length}`;
  const C = c.components;
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (!SPECIAL.test(ch)) { text += ch; i++; continue; }
    if (ch === '\\') {
      if (s[i + 1] === '\n') { push(<br key={k()} />); i += 2; continue; }
      if (PUNCT.test(s[i + 1] ?? '')) { text += s[i + 1]; i += 2; continue; }
      text += ch; i++; continue;
    }
    if (ch === '\n') {
      if (/ {2,}$/.test(text)) { text = text.replace(/ +$/, ''); push(<br key={k()} />); } else text += '\n';
      i++; continue;
    }
    if (ch === '`') {
      const e = codeEnd(s, i);
      let n = 0; while (s[i + n] === '`') n++;
      if (e < 0) { if (c.streaming) { const rest = s.slice(i + n); push(C.code ? <C.code key={k()}>{rest}</C.code> : <code key={k()} className="alt-md-code">{rest}</code>); i = s.length; } else { text += s.slice(i, i + n); i += n; } continue; }
      let body = s.slice(i + n, e - n).replace(/\n/g, ' ');
      if (/^ .*[^ ].* $/.test(body)) body = body.slice(1, -1);
      push(C.code ? <C.code key={k()}>{body}</C.code> : <code key={k()} className="alt-md-code">{body}</code>);
      i = e; continue;
    }
    if (ch === '<') {
      const a = /^<([a-z][a-z0-9+.-]{1,31}:[^\s<>]*)>/i.exec(s.slice(i)) || /^<([\w.!#$%&'*+/=?^`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+)>/i.exec(s.slice(i));
      if (a) { const href = a[1].includes('@') && !a[1].includes(':') ? `mailto:${a[1]}` : a[1]; push(renderLink(href, a[1], k(), c)); i += a[0].length; continue; }
      text += ch; i++; continue;
    }
    if (ch === 'h' || ch === 'w') {
      const before = text[text.length - 1];
      const b = (!before || /[\s(*_~]/.test(before)) ? BARE.exec(s.slice(i)) : null;
      if (b) { let u = b[0]; while (u.endsWith(')') && (u.match(/\)/g)!.length > (u.match(/\(/g) || []).length)) u = u.slice(0, -1); push(renderLink(u.startsWith('www.') ? `https://${u}` : u, u, k(), c)); i += u.length; continue; }
      text += ch; i++; continue;
    }
    if (ch === '!' && s[i + 1] === '[') {
      const e = labelEnd(s, i + 1);
      const d = e > 0 ? destination(s, e + 1) : null;
      if (d && d.end > 0) { const src = c.url(d.url, 'image'); push(src ? <MarkdownImage key={k()} src={src} alt={s.slice(i + 2, e)} title={d.title} as={C.img} /> : s.slice(i + 2, e)); i = d.end; continue; }
      if (c.streaming && (e < 0 || (d && d.end < 0))) { i = s.length; continue; } // an image still arriving: nothing yet
      text += ch; i++; continue;
    }
    if (ch === '[') {
      const e = labelEnd(s, i);
      if (e > 0) {
        const d = destination(s, e + 1);
        if (d && d.end > 0) { const href = c.url(d.url, 'link'); const label = inline(s.slice(i + 1, e), c, k()); push(href ? renderLink(href, label, k(), c, d.title) : <React.Fragment key={k()}>{label}</React.Fragment>); i = d.end; continue; }
        if (d && d.end < 0 && c.streaming) { push(<React.Fragment key={k()}>{inline(s.slice(i + 1, e), c, k())}</React.Fragment>); i = s.length; continue; }
        const n = /^\[(\d+)\]/.exec(s.slice(i));
        if (n && c.citations) {
          const idx = +n[1], src = c.citations[idx - 1];
          if (src) { push(<InlineCitation key={k()} index={idx} source={src} idPrefix={c.idPrefix} />); i += n[0].length; continue; }
        }
      } else if (c.streaming) {
        // A link whose label is still arriving: its words, without the bracket.
        push(<React.Fragment key={k()}>{inline(s.slice(i + 1), c, k())}</React.Fragment>); i = s.length; continue;
      }
      text += ch; i++; continue;
    }
    if (ch === ']') { text += ch; i++; continue; }
    if (ch === '*' || ch === '_' || ch === '~') {
      let n = 0; while (s[i + n] === ch) n++;
      const before = i === 0 ? ' ' : s[i - 1], after = s[i + n] ?? ' ';
      const opens = !/\s/.test(after) && (ch !== '_' || !/[\p{L}\p{N}]/u.test(before)) && (ch !== '~' || n === 2);
      if (!opens) { text += s.slice(i, i + n); i += n; continue; }
      const d = ch === '~' ? '~~' : n >= 2 ? ch + ch : ch;
      const e = closerOf(s, i + (n >= 3 ? n - d.length : 0), d);
      const at = i + (n >= 3 ? n - d.length : 0);
      if (e < 0) {
        // Unclosed: literal when complete; while streaming, its text without the markers until the closer arrives.
        if (c.streaming) { text += s.slice(i, at).replace(/[*_~]/g, ''); i = at + d.length; continue; }
        text += s.slice(i, i + n); i += n; continue;
      }
      text += s.slice(i, at);
      const body = inline(s.slice(at + d.length, e), c, k());
      push(d === '~~' ? <del key={k()}>{body}</del> : d.length === 2 ? <strong key={k()}>{body}</strong> : <em key={k()}>{body}</em>);
      i = e + d.length; continue;
    }
    text += ch; i++;
  }
  if (text) out.push(text);
  return out;
}

function renderLink(href: string, children: React.ReactNode, key: string, c: Ctx, title?: string) {
  const A = c.components.a;
  if (A) return <A key={key} href={href} title={title}>{children}</A>;
  let external = false;
  if (/^https?:\/\//i.test(href)) { try { external = typeof location === 'undefined' || new URL(href).origin !== location.origin; } catch { external = true; } }
  return <Link key={key} href={href} title={title} external={external}>{children}</Link>;
}

function MarkdownImage({ src, alt, title, as: Img }: { src: string; alt: string; title?: string; as?: MarkdownComponents['img'] }) {
  const [state, setState] = React.useState<'wait' | 'done' | 'failed'>('wait');
  if (Img) return <Img src={src} alt={alt} title={title} />;
  if (state === 'failed') return <span className="alt-md-img-failed">{alt || 'Image could not be loaded'}</span>;
  return (
    <span className="alt-md-img" data-state={state} aria-busy={state === 'wait' || undefined}>
      {state === 'wait' && <span className="alt-skeleton alt-md-img-imprint" data-shape="block" aria-hidden="true" />}
      <img src={src} alt={alt} title={title} loading="lazy" onLoad={() => setState('done')} onError={() => setState('failed')} />
    </span>
  );
}

// ---- Render -------------------------------------------------------------------------------------------------------

function renderBlocks(blocks: Block[], c: Ctx, tight = false, key = 'b'): React.ReactNode[] {
  const C = c.components;
  return blocks.map((b, n) => {
    const k = `${key}.${n}`;
    switch (b.t) {
      case 'p': return tight ? <React.Fragment key={k}>{inline(b.text, c, k)}</React.Fragment> : <p key={k}>{inline(b.text, c, k)}</p>;
      case 'h': {
        const level = Math.min(6, Math.max(1, c.headingLevel + b.depth - 1));
        return React.createElement(`h${level}`, { key: k, className: 'alt-md-h', 'data-depth': Math.min(b.depth, 3) }, inline(b.text, c, k));
      }
      case 'hr': return <Separator key={k} className="alt-md-hr" />;
      case 'code': return C.pre ? <C.pre key={k} code={b.code} language={b.lang} streaming={b.open} />
        : <CodeBlock key={k} className="alt-md-pre" code={b.code} language={b.lang} title={b.lang} syntax={c.syntax} streaming={b.open} />;
      case 'quote': return C.blockquote ? <C.blockquote key={k}>{renderBlocks(b.children, c, false, k)}</C.blockquote> : <blockquote key={k} className="alt-md-quote">{renderBlocks(b.children, c, false, k)}</blockquote>;
      case 'list': {
        const items = b.items.map((it, j) => (
          <li key={j} className={it.task !== undefined ? 'alt-md-task-item' : undefined}>
            {it.task !== undefined && <span className="alt-md-task" role="img" aria-label={it.task ? 'Done' : 'Not done'} data-done={it.task ? '' : undefined}>{it.task && <Icons.Check size={12} />}</span>}
            {it.task !== undefined ? <span className="alt-md-task-body">{renderBlocks(it.children, c, b.tight, `${k}.${j}`)}</span> : renderBlocks(it.children, c, b.tight, `${k}.${j}`)}
          </li>
        ));
        return b.ordered ? <ol key={k} className="alt-md-list" start={b.start !== 1 ? b.start : undefined}>{items}</ol> : <ul key={k} className="alt-md-list" data-tasks={b.items.every((it) => it.task !== undefined) ? '' : undefined}>{items}</ul>;
      }
      case 'table': {
        const T = C.table;
        const cells = (
          <>
            <thead className="alt-table-head"><tr className="alt-tr">{b.head.map((h, j) => <th key={j} scope="col" className="alt-th" data-align={b.align[j] === 'right' ? 'end' : undefined} style={b.align[j] === 'center' ? { textAlign: 'center' } : undefined}>{inline(h, c, `${k}.h${j}`)}</th>)}</tr></thead>
            <tbody>{b.rows.map((r, ri) => <tr key={ri} className="alt-tr">{r.map((cell, j) => <td key={j} className="alt-td" data-align={b.align[j] === 'right' ? 'end' : undefined} style={b.align[j] === 'center' ? { textAlign: 'center' } : undefined}>{inline(cell, c, `${k}.${ri}.${j}`)}</td>)}</tr>)}</tbody>
          </>
        );
        const name = b.head.map((h) => h.replace(/[*_`~[\]]/g, '')).filter(Boolean).slice(0, 3).join(', ');
        return (
          <div key={k} className="alt-md-table" role="region" tabIndex={0} aria-label={`Table: ${name}`}>
            {T ? <T>{cells}</T> : <table className="alt-table">{cells}</table>}
          </div>
        );
      }
      case 'html': return <div key={k} className="alt-md-html" dangerouslySetInnerHTML={{ __html: b.html }} />;
    }
  });
}

/** Parses Markdown into blocks; exported for tests and adapters. */
export function parseMarkdown(source: string, { streaming = false, allowHtml = false } = {}) {
  const src = source.replace(/\r\n?/g, '\n');
  return parseBlocks(src.split('\n'), { streaming, allowHtml, partialLast: streaming && !src.endsWith('\n') });
}

/**
 * An answer's Markdown, set as Altitude prose: the record's typography, adding no height. Code is CodeBlock, links are
 * Link, `[n]` markers are InlineCitation, tables use Table's flush rows, images rise from an imprint. While
 * `streaming`, unfinished constructs render as unfinished rather than as raw text.
 */
export const Markdown = React.forwardRef<HTMLDivElement, MarkdownProps>(function Markdown(
  { children, streaming = false, citations, idPrefix, syntax, headingLevel = 3, components, allowHtml = false, transformUrl = safeUrl, className, ...rest }, ref) {
  const blocks = React.useMemo(() => parseMarkdown(children ?? '', { streaming, allowHtml }), [children, streaming, allowHtml]);
  const c: Ctx = { streaming, partialLast: false, allowHtml, citations, idPrefix, syntax, headingLevel, components: components ?? {}, url: transformUrl };
  return <div ref={ref} className={cx('alt-md', className)} data-streaming={streaming ? '' : undefined} {...rest}>{renderBlocks(blocks, c)}</div>;
});
