import { customAlphabet } from 'nanoid';

const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const nano = customAlphabet(alphabet, 10);

export function newId(prefix = ''): string {
  return prefix ? `${prefix}_${nano()}` : nano();
}
