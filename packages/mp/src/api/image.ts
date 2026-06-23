import { http } from './http';
import type { ImageGenerateReq, ImageGenerateResp } from './types';

export const imageApi = {
  generate: (data: ImageGenerateReq) => http.post<ImageGenerateResp>('/image/generate', data)
};