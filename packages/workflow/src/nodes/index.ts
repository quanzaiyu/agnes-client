/**
 * Node registry: aggregate meta + components for React Flow.
 */

import type { NodeTypes } from '@xyflow/react';
import * as promptInput from './promptInput';
import * as variableInput from './variableInput';
import * as textInput from './textInput';
import * as textCombine from './textCombine';
import * as textGeneration from './textGeneration';
import * as imageGeneration from './imageGeneration';
import * as videoGeneration from './videoGeneration';
import * as imageInput from './imageInput';
import * as sizeSelector from './sizeSelector';
import * as numberInput from './numberInput';
import * as modelSelector from './modelSelector';
import * as videoFrameExtract from './videoFrameExtract';
import * as previewOutput from './previewOutput';
import * as saveOutput from './saveOutput';
import type { NodeMeta } from '../engine/types';

interface NodeModule {
  meta: NodeMeta;
  Component: React.ComponentType;
}

const all: NodeModule[] = [
  promptInput, variableInput, textInput, textCombine,
  textGeneration, imageGeneration, videoGeneration,
  imageInput, sizeSelector, numberInput, modelSelector,
  videoFrameExtract, previewOutput, saveOutput,
];

export const nodeTypes = Object.fromEntries(
  all.map((m) => [m.meta.type, m.Component]),
) as unknown as NodeTypes;

export const allMeta: NodeMeta[] = all.map((m) => m.meta);
export const metaByType: Record<string, NodeMeta> = Object.fromEntries(
  all.map((m) => [m.meta.type, m.meta]),
);
export function getNodeMeta(type: string): NodeMeta | undefined {
  return metaByType[type];
}

export interface NodePanelGroup {
  category: NodeMeta['category'];
  label: string;
  items: NodeMeta[];
}

const CATEGORY_LABEL: Record<NodeMeta['category'], string> = {
  input: '输入',
  generation: '生成',
  output: '输出',
  utility: '工具',
};

export const nodePanelGroups: NodePanelGroup[] = (['input', 'generation', 'output', 'utility'] as const).map((cat) => ({
  category: cat,
  label: CATEGORY_LABEL[cat],
  items: allMeta.filter((m) => m.category === cat),
}));
