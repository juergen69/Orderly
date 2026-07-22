export function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return fallbackId();
}

function fallbackId(): string {
  const timestamp = Date.now().toString(36);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const random = Array.from(bytes, b => b.toString(36)).join('');
    return `${timestamp}-${random}`;
  }
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}
