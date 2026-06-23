import { usePointsStore } from '@/stores/points';
import { storeToRefs } from 'pinia';

export function useLocalPoints() {
  const store = usePointsStore();
  const { balance, checkedInToday, history } = storeToRefs(store);
  return { balance, checkedInToday, history, store };
}