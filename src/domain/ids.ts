export function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return fallbackId();
}

function fallbackId(): string {
  return Date.now().toString(36);
}
