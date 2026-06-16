import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { ImagePreview } from '../components/NodePreview';
import { useWorkflowStore } from '../store/workflowStore';
import { ImageUploadField } from '../components/ParamInput';
import type { NodeMeta } from '../engine/types';

export const meta: NodeMeta = {
  type: 'imageInput',
  label: '图像输入',
  category: 'input',
  icon: 'i-carbon-image-search',
  inputs: [],
  outputs: [{ id: 'image', type: 'image', label: '图片' }],
  params: {
    url: { kind: 'string', default: '', label: 'URL（自动填充）' },
    dataUri: { kind: 'string', default: '', label: 'Data URI（内部）' },
  },
};

export const Component = memo(function ImageInputNode() {
  const id = useNodeId()!;
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const updateParams = useWorkflowStore((s) => s.updateNodeParams);
  const params = node?.data?.params || {};
  const preview = (params.dataUri as string) || (params.url as string) || '';
  return (
    <NodeShell meta={meta}>
      <div className="space-y-2">
        <ImageUploadField
          initialUrl={preview}
          onUploaded={(info) => updateParams(id, { dataUri: info.dataUri, url: '' })}
        />
        {preview && <ImagePreview value={{ url: preview }} maxHeight={120} />}
      </div>
    </NodeShell>
  );
});
