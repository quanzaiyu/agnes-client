import type { Resolver } from '../types';
import { textGeneration } from './text';
import { imageGeneration } from './image';
import { videoGeneration } from './video';
import {
  promptInput, variableInput, textInput, textCombine,
  imageInput, sizeSelector, numberInput, modelSelector,
  videoFrameExtract, previewOutput, previewText, saveOutput,
} from './utility';

export const RESOLVERS: Record<string, Resolver> = {
  promptInput,
  variableInput,
  textInput,
  textCombine,
  textGeneration,
  imageGeneration,
  videoGeneration,
  imageInput,
  sizeSelector,
  numberInput,
  modelSelector,
  videoFrameExtract,
  previewOutput,
  previewText,
  saveOutput,
};
