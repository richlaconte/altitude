// Hand-written, unlike the generated stories: it renders a real CodeMirror editor, which the design system's previews
// can't load. The example is shared with build/checks/adapter-codemirror.mjs.
import { CodeMirrorExample } from './codemirror-example';

export default {
  title: 'Adapters/CodeMirror',
  tags: ['autodocs'],
  parameters: { docs: { description: { component: "Altitude readings for a CodeMirror 6 editor: `import { altitudeTheme } from 'altitude-design/adapters/codemirror'` and add `altitudeTheme()` to the editor's extensions. The editor is an opening; the active line is a tint; syntax is ink, ink-muted and accent-ink; lint errors sink to a trench. CodeMirror is a peer dependency your app installs. See Guide/Theming, \"Rich text, code and canvases\"." } } },
};
export const WebhookPayload = { render: () => <CodeMirrorExample /> };
