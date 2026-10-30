// A CodeMirror 6 editor with altitude-design/adapters/codemirror: a JSON webhook payload with a lint error. Used by the
// Storybook story and by build/checks/adapter-codemirror.mjs.
import * as React from 'react';
import { EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import { altitudeTheme } from '../../project/components/src/adapter-codemirror';

const DOC = `{
  "event": "invoice.paid",
  "url": "https://api.acme.dev/hooks/altitude",
  "retries": 5,
  "active": true,
  "headers": { "X-Team": "billing" },
}`;

export function CodeMirrorExample({ doc = DOC }) {
  const host = React.useRef(null);
  React.useEffect(() => {
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({ doc, extensions: [
        lineNumbers(), highlightActiveLine(), highlightActiveLineGutter(), history(), keymap.of([...defaultKeymap, ...historyKeymap]),
        json(), linter(jsonParseLinter(), { delay: 100 }), lintGutter(),
        EditorView.contentAttributes.of({ 'aria-label': 'Webhook payload' }),
        altitudeTheme(),
      ] }),
    });
    return () => view.destroy();
  }, [doc]);
  return <div style={{ display: 'grid', gap: 6, maxWidth: 640 }}>
    <span style={{ font: '500 14px/20px var(--font-sans)' }}>Webhook payload</span>
    <div ref={host} />
    <p style={{ margin: 0, font: '400 13px/18px var(--font-sans)', color: 'var(--ink-muted)' }}>JSON. The trailing comma on line 6 is a lint error.</p>
  </div>;
}
