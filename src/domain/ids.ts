export function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
<<<<<<< ours
  return fallbackId();
}

function fallbackId(): string {
  const timestamp = Date.now().toString(36);
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes, b => b.toString(36)).join('');
  return `${timestamp}-${random}`;
=======
  throw new Error('crypto.randomUUID is required to generate IDs');
>>>>>>> theirs
}
