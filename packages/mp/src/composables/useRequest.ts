import { ref } from 'vue';

export function useRequest<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>
) {
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const data = ref<TResult | null>(null);

  async function run(...args: TArgs): Promise<TResult | null> {
    loading.value = true;
    error.value = null;
    try {
      data.value = await fn(...args);
      return data.value;
    } catch (e) {
      error.value = e as Error;
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, data, run };
}