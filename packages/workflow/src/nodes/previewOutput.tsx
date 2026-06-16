import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { TextPreview, ImagePreview, VideoPreview, extractImageUrl, extractVideoUrl } from '../components/NodePreview';
import { useWorkflowStore } from '../store/workflowStore';
import type { NodeMeta } from '../engine/types';

export const meta: NodeMeta = {
  type: 'previewOutput',
  label: '预览',
  category: 'output',
  icon: 'i-carbon-view',
  inputs: [
    { id: 'text', type: 'text', label: '文本' },
    { id: 'image', type: 'image', label: '图片' },
    { id: 'video', type: 'video', label: '视频' },
  ],
  outputs: [],
  params: {},
};

export const Component = memo(function PreviewOutputNode() {
  const id = useNodeId()!;
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const edges = useWorkflowStore((s) => s.edges);
  const nodes = useWorkflowStore((s) => s.nodes);
  const incoming = edges.filter((e) => e.target === id);
  const pick = (portId: string) => {
    const e = incoming.find((x) => x.targetHandle === portId);
    if (!e) return undefined;
    const src = nodes.find((n) => n.id === e.source);
    return src?.data.outputs?.[e.sourceHandle as string];
  };
  const text = pick('text') as string | undefined;
  const image = pick('image') as { url: string } | undefined;
  const video = pick('video') as { url: string } | undefined;

  return (
    <NodeShell meta={meta}>
      <div className="space-y-2">
        {text !== undefined && <TextPreview text={text} max={300} />}
        {image && extractImageUrl(image) && <ImagePreview value={image} maxHeight={160} />}
        {video && extractVideoUrl(video) && <VideoPreview value={video} maxHeight={160} />}
        {!text && !image && !video && <div className="text-gray-500 italic">（连接任一输入）</div>}
      </div>
    </NodeShell>
  );
});
