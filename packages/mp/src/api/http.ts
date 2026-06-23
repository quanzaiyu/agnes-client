import { getClientId } from '@/utils/platform';
import { BASE } from './http-base';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  stream?: boolean;
}

export function request<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = BASE + path;
  const headers: Record<string, string> = {
    'X-Client-Id': getClientId(),
    ...(opts.headers || {})
  };
  if (opts.data && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: opts.method || 'GET',
      data: opts.data,
      header: headers,
      timeout: 60_000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else {
          const err = (res.data as any)?.error || `请求失败 (${res.statusCode})`;
          reject(new Error(err));
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '网络请求失败'))
    });
  });
}

export const http = {
  get: <T = any>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T = any>(path: string, data?: any, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'POST', data }),
  put: <T = any>(path: string, data?: any, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'PUT', data }),
  del: <T = any>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'DELETE' })
};