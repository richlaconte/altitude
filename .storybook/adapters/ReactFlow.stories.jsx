// Hand-written, unlike the generated stories: it renders a real React Flow canvas, which the design system's previews
// can't load. The example is shared with build/checks/adapter-react-flow.mjs.
import { ReactFlowExample } from './react-flow-example';

export default {
  title: 'Adapters/React Flow',
  tags: ['autodocs'],
  parameters: { docs: { description: { component: "Altitude readings for a React Flow canvas: `import 'altitude-design/adapters/react-flow.css'` after altitude.css and React Flow's own stylesheet. The canvas is ground; nodes are Cards at level 1 that lift when pointed at; a dragged node is in your hand at level 3; ports are openings; running and failed nodes use the commitment signal. @xyflow/react is a peer dependency your app installs. See Guide/Theming, \"Rich text, code and canvases\"." } } },
};
export const Automation = { render: () => <ReactFlowExample /> };
