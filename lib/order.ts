/** Reordering a set's problems, as pure functions shared by the editor and its action. */

/** A copy with the item at `index` moved one step by `delta` (-1 up, +1 down). Out of range is a no-op. */
export function moveItem<T>(items: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  const next = [...items];
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return next;
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

/** True only if `next` holds exactly the ids in `current`, each once, in any order. */
export function isReorderOf(current: string[], next: string[]): boolean {
  if (current.length !== next.length || new Set(next).size !== next.length) return false;
  const members = new Set(current);
  return next.every((id) => members.has(id));
}
