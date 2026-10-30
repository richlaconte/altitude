// A Tiptap editor styled by altitude-design/adapters/tiptap.css: the formatting bar is Altitude's Toolbar with latched
// toggles, the editor is an opening that fills, and @mentions list in a floating .alt-rte-mentions list. Used by the
// Storybook story and by build/checks/adapter-tiptap.mjs.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { Toolbar, ToolbarGroup, ToolbarToggle, ToolbarSeparator } from '../../project/components/src/index';
import '../../project/components/adapters/tiptap.css';

const PEOPLE = ['Maya Chen', 'Theo Marsh', 'Ines Duarte', 'Sam Okafor'];

/** The mention list, rendered into a floating .alt-rte-mentions listbox. */
function MentionList({ items, index, onPick }) {
  return <div className="alt-rte-mentions" role="listbox" aria-label="People">
    {items.length ? items.map((p, i) => <div key={p} role="option" aria-selected={i === index} onMouseDown={(e) => { e.preventDefault(); onPick(p); }}>{p}</div>)
      : <div role="option" aria-disabled="true" aria-selected="false">No one matches</div>}
  </div>;
}
const suggestion = {
  items: ({ query }) => PEOPLE.filter((p) => p.toLowerCase().startsWith(query.toLowerCase())),
  render: () => {
    let host, root, state;
    const draw = () => root.render(<MentionList items={state.items} index={state.index} onPick={(p) => state.command({ id: p, label: p })} />);
    const place = (rect) => { if (!rect) return; Object.assign(host.style, { position: 'fixed', left: rect.left + 'px', top: rect.bottom + 6 + 'px', zIndex: 50 }); };
    return {
      onStart: (props) => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); state = { ...props, index: 0 }; place(props.clientRect?.()); draw(); },
      onUpdate: (props) => { state = { ...props, index: 0 }; place(props.clientRect?.()); draw(); },
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowDown') { state.index = (state.index + 1) % Math.max(1, state.items.length); draw(); return true; }
        if (event.key === 'ArrowUp') { state.index = (state.index - 1 + state.items.length) % Math.max(1, state.items.length); draw(); return true; }
        if (event.key === 'Enter' && state.items[state.index]) { state.command({ id: state.items[state.index], label: state.items[state.index] }); return true; }
        return false;
      },
      onExit: () => { root.unmount(); host.remove(); },
    };
  },
};

export function TiptapExample({ content = '<p>The launch moves to <strong>11 December</strong>. <a href="#/brief">Read the brief</a>, then reply here.</p><ul><li><p>Venue confirmed</p></li><li><p>Press kit: <code>v3.pdf</code></p></li></ul>' }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false } }), Mention.configure({ suggestion })],
    content, immediatelyRender: true,
    editorProps: { attributes: { 'aria-label': 'Reply', 'aria-multiline': 'true', role: 'textbox' } },
  });
  const active = useEditorState({ editor, selector: ({ editor: e }) => ({ bold: e.isActive('bold'), italic: e.isActive('italic'), code: e.isActive('code'), bullet: e.isActive('bulletList'), ordered: e.isActive('orderedList') }) });
  const chain = () => editor.chain().focus();
  return (
    <div style={{ display: 'grid', gap: 8, maxWidth: 640 }}>
      <Toolbar aria-label="Formatting">
        <ToolbarGroup>
          <ToolbarToggle pressed={active.bold} onPressedChange={() => chain().toggleBold().run()} aria-label="Bold"><b>B</b></ToolbarToggle>
          <ToolbarToggle pressed={active.italic} onPressedChange={() => chain().toggleItalic().run()} aria-label="Italic"><i>I</i></ToolbarToggle>
          <ToolbarToggle pressed={active.code} onPressedChange={() => chain().toggleCode().run()} aria-label="Code"><code>{'<>'}</code></ToolbarToggle>
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarGroup>
          <ToolbarToggle pressed={active.bullet} onPressedChange={() => chain().toggleBulletList().run()} aria-label="Bulleted list">•</ToolbarToggle>
          <ToolbarToggle pressed={active.ordered} onPressedChange={() => chain().toggleOrderedList().run()} aria-label="Numbered list">1.</ToolbarToggle>
        </ToolbarGroup>
      </Toolbar>
      <EditorContent editor={editor} />
      <p style={{ margin: 0, font: '400 13px/18px var(--font-sans)', color: 'var(--ink-muted)' }}>Type @ to mention someone.</p>
    </div>
  );
}
export function EmptyTiptapExample() { return <TiptapExample content="" />; }
