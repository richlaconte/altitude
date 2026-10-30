// A React Flow canvas styled by altitude-design/adapters/react-flow.css: an automation with a trigger, a running step,
// a failed step and a finished one, with a dot grid, a minimap and controls. Used by the Storybook story and by
// build/checks/adapter-react-flow.mjs.
import * as React from 'react';
import { ReactFlow, Background, MiniMap, Controls, Position, useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import '../../project/components/adapters/react-flow.css';

const side = { sourcePosition: Position.Right, targetPosition: Position.Left };
const NODES = [
  { id: 'trigger', ...side, type: 'input', position: { x: 0, y: 60 }, data: { label: 'New order' } },
  { id: 'fetch', ...side, position: { x: 220, y: 0 }, data: { label: 'Fetch customer · Running' }, className: 'alt-node-pending' },
  { id: 'notify', ...side, position: { x: 220, y: 130 }, data: { label: 'Post to channel · Failed: token expired' }, className: 'alt-node-failed' },
  { id: 'done', ...side, type: 'output', position: { x: 500, y: 60 }, data: { label: 'Update CRM' } },
];
const EDGES = [
  { id: 'e1', source: 'trigger', target: 'fetch' },
  { id: 'e2', source: 'trigger', target: 'notify' },
  { id: 'e3', source: 'fetch', target: 'done', label: 'customer' },
];

export function ReactFlowExample() {
  const [nodes, , onNodesChange] = useNodesState(NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(EDGES);
  return (
    <div style={{ height: 420, maxWidth: 760, border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={(c) => setEdges((e) => addEdge(c, e))}
        fitView aria-label="Order automation" proOptions={{ hideAttribution: true }}>
        <Background variant="dots" gap={16} size={1.25} />
        <MiniMap pannable zoomable ariaLabel="Map of the automation" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
