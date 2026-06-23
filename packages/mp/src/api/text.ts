import { BASE } from './http-base';
import { getClientId } from '@/utils/platform';
import type { TextGenerateReq, TextGenerateResp } from './types';

export const textApi = {
  generate: (data: TextGenerateReq) =>
    uni.request({
      url: BASE + '/text/generate',
      method: 'POST',
      data,
      header: { 'Content-Type': 'application/json', 'X-Client-Id': getClientId() },
      timeout: 120_000
    }),

  generateStream: (data: TextGenerateReq, onChunk: (text: string) => void, onDone: () => void, onError: (e: Error) => void) => {
    // 小程序端：使用 RequestTask.onChunkReceived
    // H5 端：使用 fetch + ReadableStream
    // 这里给出统一抽象，平台实现在 useStreamText 中
    uni.request({
      url: BASE + '/text/generate',
      method: 'POST',
      data: { ...data, stream: true },
      header: { 'Content-Type': 'application/json', 'X-Client-Id': getClientId(), 'Accept': 'text/event-stream' },
      timeout: 300_000,
      success: (res) => onChunk(typeof res.data === 'string' ? res.data : JSON.stringify(res.data)),
      fail: (err) => onError(new Error(err.errMsg || 'stream failed')),
      complete: () => onDone()
    });
  }
};