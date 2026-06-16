/**
 * Tiny helpers shared across the loader.
 */

export function findNode<T>(nodes: T[], id: string): T | undefined {
  return nodes.find((n) => (n as { id?: string }).id === id);
}

export function shortId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
