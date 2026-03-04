const idCounters: Record<string, number> = {};

/**
 * Creates deterministic, auto-incrementing unique IDs grouped by a specific key.
 * Used internally via $id('groupName') to bind input-labels dynamically.
 */
export function $id(groupName: string = 'default'): string {
  if (!idCounters[groupName]) {
    idCounters[groupName] = 1;
  } else {
    idCounters[groupName]++;
  }
  return `${groupName}-${idCounters[groupName]}`;
}
