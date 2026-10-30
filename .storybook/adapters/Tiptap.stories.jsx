// Hand-written, unlike the generated stories: it renders a real Tiptap editor, which the design system's previews
// can't load. The example is shared with build/checks/adapter-tiptap.mjs.
import { TiptapExample, EmptyTiptapExample } from './tiptap-example';

export default {
  title: 'Adapters/Tiptap',
  tags: ['autodocs'],
  parameters: { docs: { description: { component: "Altitude readings for a Tiptap rich text editor: `import 'altitude-design/adapters/tiptap.css'` after altitude.css. The editor is an opening that fills; the formatting bar is Altitude's Toolbar with latched toggles; mentions list at level 3. Tiptap is a peer dependency your app installs. See Guide/Theming, \"Rich text, code and canvases\"." } } },
};
export const Filled = { render: () => <TiptapExample /> };
export const Empty = { render: () => <EmptyTiptapExample /> };
