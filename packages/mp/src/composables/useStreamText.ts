import { ref } from 'vue';
import { isH5, getClientId } from '@/utils/platform';
import { BASE } from '@/api/http-base';
import type { TextGenerateReq } from '@/api/types';

export function useStreamText() {
  const text = ref('');
  const streaming = ref(false);
  const error = ref<Error | null>(null);
  let abort: (() => void) | null = null;

  async function start(req: TextGenerateReq) {
    text.value = '';
    streaming.value = true;
    error.value = null;
    const headers = { 'Content-Type': 'application/json', 'X-Client-Id': getClientId(), 'Accept': 'text/event-stream' };

    if (isH5() && typeof fetch === 'function') {
      const controller = new AbortController();
      abort = () => controller.abort();
      try {
        const res = await fetch(BASE + '/text/generate', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...req, stream: true }),
          signal: controller.signal
        });
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          text.value += decoder.decode(value, { stream: true });
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') error.value = e as Error;
      } finally {
        streaming.value = false;
      }
    } else {
      // 小程序端：使用 uni.request 的 onChunkReceived
      const task = uni.request({
        url: BASE + '/text/generate',
        method: 'POST',
        header: headers,
        data: { ...req, stream: true },
        timeout: 300_000,
        // #ifdef MP-WEIXIN
        // @ts-ignore — 微信小程序专属 API
        enableChunked: true,
        // @ts-ignore
        success: () => {},
        // @ts-ignore
        fail: (err: any) => { error.value = new Error(err.errMsg || '请求失败'); },
        // @ts-ignore
        complete: () => { streaming.value = false; }
      });
      // @ts-ignore
      task.onChunkReceived?.((res: any) => {
        const arr = new Uint8Array(res.data);
        text.value += new TextDecoder().decode(arr, { stream: true });
      });
      abort = () => task.abort();
    }
  }

  function stop() { abort?.(); streaming.value = false; }

  return { text, streaming, error, start, stop };
}