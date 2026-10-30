import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

/* ───────────────────────── CodeMirror adapter ───────────────────────── */

/*
 * altitude-design/adapters/codemirror: Altitude readings for a CodeMirror 6 editor. Every value is one of the scheme's
 * custom properties, so the editor follows the active scheme, a custom accent and contrast="more" without re-creating
 * it. It imports only CodeMirror (@codemirror/view, @codemirror/language, @lezer/highlight), which your app installs.
 */
const wall = 'inset 0 4px 0 0 var(--alt-wall-in), inset 0 7px 3px -2px var(--alt-cast), 0 1px 0 0 var(--alt-lip)';

/**
 * The editor is an opening: a well with its inside wall, the floor lit while focused and a 2px neutral rim for keyboard
 * focus. Gutter and lines are ground; the active line is a tint, never a height; the selection is accent. Lint errors
 * sink their gutter marker into a trench on critical-soft and say the problem in words. Tooltips and completion lists
 * float at level 3.
 */
export const altitudeEditorTheme: Extension = EditorView.theme({
  '&': { color: 'var(--ink)', backgroundColor: 'var(--surface-well)', border: '1px solid var(--line-control)', borderRadius: 'var(--radius-md)',
    boxShadow: wall, outline: '1px solid transparent' },
  '&:hover': { borderColor: 'var(--ink-muted)' },
  '&.cm-focused': { outline: '1px solid transparent', backgroundColor: 'var(--surface-raised)' },
  '&:has(.cm-content:focus-visible)': { borderColor: 'var(--alt-rim-held)', outlineColor: 'var(--alt-rim-held)' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '20px', paddingTop: '4px' },
  '.cm-content': { caretColor: 'var(--ink)', padding: 'var(--space-2) 0' },
  '.cm-line': { padding: '0 var(--space-3)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--ink)', borderLeftWidth: '2px' },
  '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--ink-muted)', border: 'none', borderRight: '1px solid var(--line)' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 var(--space-2) 0 var(--space-3)' },
  '.cm-activeLine': { backgroundColor: 'color-mix(in oklab, var(--accent-soft) 60%, transparent)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--ink)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'color-mix(in oklab, var(--accent-ink) 24%, transparent)' },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': { backgroundColor: 'transparent', outline: '1px solid var(--accent-ink)', borderRadius: '2px' },
  '.cm-searchMatch': { backgroundColor: 'color-mix(in oklab, var(--caution) 22%, transparent)', outline: '1px solid var(--caution)' },
  '.cm-placeholder': { color: 'var(--ink-muted)' },
  '.cm-lintRange-error': { backgroundImage: 'none', textDecoration: 'underline wavy var(--critical)', textUnderlineOffset: '3px' },
  '.cm-lintRange-warning': { backgroundImage: 'none', textDecoration: 'underline wavy var(--caution)', textUnderlineOffset: '3px' },
  '.cm-lint-marker': { width: '12px', height: '12px', borderRadius: '3px', backgroundImage: 'none !important' },
  '.cm-lint-marker-error': { backgroundColor: 'var(--critical-soft)', boxShadow: 'var(--trench), inset 0 0 0 1px var(--critical)' },
  '.cm-lint-marker-warning': { backgroundColor: 'var(--caution-soft)', boxShadow: 'inset 0 0 0 1px var(--caution)' },
  '.cm-diagnostic': { padding: 'var(--space-1) var(--space-3)', font: '500 13px/18px var(--font-sans)', color: 'var(--ink)' },
  '.cm-diagnostic-error': { borderLeft: '3px solid var(--critical)' },
  '.cm-diagnostic-warning': { borderLeft: '3px solid var(--caution)' },
  '.cm-tooltip': { border: 'none', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-floating)', color: 'var(--ink)', boxShadow: 'var(--elev-3)', overflow: 'hidden' },
  '.cm-tooltip-autocomplete > ul': { fontFamily: 'var(--font-mono)', fontSize: '13px' },
  '.cm-tooltip-autocomplete > ul > li': { padding: '4px var(--space-2)' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--accent-soft)', color: 'var(--ink)' },
  '.cm-panels': { backgroundColor: 'var(--surface-ground)', color: 'var(--ink)' },
  '.cm-panels.cm-panels-bottom': { borderTop: '1px solid var(--line)' },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--line)' },
  '.cm-foldPlaceholder': { backgroundColor: 'var(--surface-raised)', border: '1px solid var(--line)', color: 'var(--ink-muted)' },
  // Nothing here moves, so reduced motion needs no rule: the editor changes state without transitions.
  '@media (forced-colors: active)': { '.cm-lint-marker-error': { border: '2px dashed CanvasText' }, '.cm-tooltip': { border: '1px solid CanvasText' } },
});

/** Syntax in ink, ink-muted and accent-ink only: code is text to read, not data to compare, so no data-* hues. */
export const altitudeHighlightStyle: HighlightStyle = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: 'var(--accent-ink)', fontWeight: '600' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--accent-ink)' },
  { tag: [t.string, t.special(t.string), t.regexp], color: 'var(--ink)' },
  { tag: [t.propertyName, t.attributeName, t.definition(t.variableName), t.function(t.variableName)], color: 'var(--ink)', fontWeight: '550' },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: 'var(--ink-muted)', fontStyle: 'italic' },
  { tag: [t.punctuation, t.bracket, t.separator, t.operator], color: 'var(--ink-muted)' },
  { tag: [t.typeName, t.className, t.tagName], color: 'var(--accent-ink)' },
  { tag: t.invalid, color: 'var(--critical)' },
]);

/** The whole adapter: `new EditorView({ extensions: [altitudeTheme(), …] })`. */
export function altitudeTheme(): Extension {
  return [altitudeEditorTheme, syntaxHighlighting(altitudeHighlightStyle)];
}
