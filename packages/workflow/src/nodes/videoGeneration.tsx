import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { useWorkflowStore } from '../store/workflowStore';
import { renderParamInput } from '../components/ParamInput';
import type { NodeMeta } from '../engine/types';

export const meta: NodeMeta = {
  type: 'videoGeneration',
  label: '视频生成',
  category: 'generation',
  icon: 'i-carbon-video',
  inputs: [
    { id: 'prompt', type: 'text', label: '提示词', required: true },
    { id: 'image', type: 'image', label: '参考图' },
    { id: 'size', type: 'size', label: '尺寸' },
    { id: 'model', type: 'text', label: '模型' },
  ],
  outputs: [{ id: 'video', type: 'video', label: '视频' }],
  params: {
    model: { kind: 'model', default: 'agnes-video-v2.0', label: '模型' },
    size: { kind: 'size', default: '1216x832', label: '尺寸' },
    numFrames: { kind: 'enum', default: 121, label: '帧数', options: [
      { label: '81 (~3s)', value: 81 }, { label: '121 (~5s)', value: 121 },
      { label: '241 (~10s)', value: 241 }, { label: '441 (~18s)', value: 441 },
    ] },
    frameRate: { kind: 'enum', default: 24, label: 'FPS', options: [
      { label: '24', value: 24 }, { label: '30', value: 30 }, { label: '60', value: 60 },
    ] },
    mode: { kind: 'enum', default: '', label: '模式', options: [
      { label: '默认', value: '' }, { label: '关键帧', value: 'keyframes' },
    ] },
    negativePrompt: { kind: 'text', default: '', label: '负向提示词' },
    seed: { kind: 'number', default: '', label: '随机种子' },
  },
};

export const Component = memo(function VideoGenerationNode() {
  const id = useNodeId()!;
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const params = node?.data?.params || {};
  const progress = (node?.data?.progress as number | undefined) ?? 0;
  const status = node?.data?.status;
  return (
    <NodeShell meta={meta}>
      <div className="space-y-1">
        <div className="text-[10px] text-gray-500">视频任务</div>
        {status === 'running' ? (
          <div className="text-yellow-400">生成中… {progress}%</div>
        ) : status === 'success' ? (
          <div className="text-green-400">已完成</div>
        ) : (
          <div className="text-gray-500">（未运行）</div>
        )}
      </div>
    </NodeShell>
  );
});
