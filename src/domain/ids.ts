export function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  throw new Error('crypto.randomUUID is required to generate IDs');
}
