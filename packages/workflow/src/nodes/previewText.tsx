import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { useWorkflowStore } from '../store/workflowStore';
import { TextPreview } from '../components/NodePreview';
import type { NodeMeta } from '../engine/types';

export const meta: NodeMeta = {
  type: 'previewText',
  label: '预览文本',
  category: 'output',
  icon: 'i-carbon-document-blank',
  inputs: [
    { id: 'text', type: 'text', label: '文本' },
  ],
  outputs: [],
  params: {},
};

export const Component = memo(function PreviewTextNode() {
  const id = useNodeId()!;
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const edges = useWorkflowStore((s) => s.edges);
  const nodes = useWorkflowStore((s) => s.nodes);
  // Read from the upstream node's data.outputs.text (already executed)
  const incoming = edges.filter((e) => e.target === id && (e.targetHandle || '') === 'text');
  const text = incoming
    .map((e) => nodes.find((n) => n.id === e.source)?.data?.outputs?.[e.sourceHandle || ''] as string | undefined)
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join('\n');

  return (
    <NodeShell meta={meta}>
      <TextPreview text={text} max={400} />
    </NodeShell>
  );
});
