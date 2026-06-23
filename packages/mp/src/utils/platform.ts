export const isMpWeixin = () => typeof uni !== 'undefined' && !!uni.getSystemInfoSync && (uni.getSystemInfoSync().platform === 'mp-weixin');
export const isMpAlipay = () => typeof uni !== 'undefined' && !!uni.getSystemInfoSync && (uni.getSystemInfoSync().platform === 'mp-alipay');
export const isH5 = () => typeof window !== 'undefined' && typeof document !== 'undefined';
export const isApp = () => typeof uni !== 'undefined' && !!uni.getSystemInfoSync && (uni.getSystemInfoSync().platform === 'app' || uni.getSystemInfoSync().platform === 'app-plus');

export function getClientId(): string {
  let id = storage.get<string>('client_id', '');
  if (!id) {
    id = 'cid_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    storage.set('client_id', id);
  }
  return id;
}