import { http } from './http';
import type { VideoGenerateReq, VideoTask } from './types';

export const videoApi = {
  generate: (data: VideoGenerateReq) => http.post<VideoTask>('/video/generate', data),
  status: (id: string) => http.get<VideoTask>(`/video/status/${id}`)
};