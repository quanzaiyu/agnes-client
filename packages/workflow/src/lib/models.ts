/** Model registry used by ModelSelector and resolvers. */

export type ModelKind = 'text' | 'image' | 'video';

export interface ModelEntry {
  value: string;
  label: string;
  kind: ModelKind;
  description?: string;
}

export const MODELS: ModelEntry[] = [
  {
    value: 'agnes-1.5-flash',
    label: 'Agnes 1.5 Flash (轻量高速)',
    kind: 'text',
    description: '适合高并发场景',
  },
  {
    value: 'agnes-2.0-flash',
    label: 'Agnes 2.0 Flash (推荐)',
    kind: 'text',
    description: '支持智能体/工具调用/图片理解/Thinking',
  },
  {
    value: 'agnes-image-2.0-flash',
    label: 'Agnes Image 2.0 Flash',
    kind: 'image',
    description: '文生图/图生图/多图合成',
  },
  {
    value: 'agnes-image-2.1-flash',
    label: 'Agnes Image 2.1 Flash (高密度)',
    kind: 'image',
    description: '高信息密度优化版',
  },
  {
    value: 'agnes-video-v2.0',
    label: 'Agnes Video V2.0',
    kind: 'video',
    description: '文/图生视频，关键帧动画',
  },
];

export const DEFAULT_MODEL: Record<ModelKind, string> = {
  text: 'agnes-2.0-flash',
  image: 'agnes-image-2.1-flash',
  video: 'agnes-video-v2.0',
};
