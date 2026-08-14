import crypto from 'node:crypto';

export function hashApiKey(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}

export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const random = crypto.randomBytes(24).toString('base64url');
  const plaintext = `czk_${random}`;
  const prefix = plaintext.slice(0, 12);
  // Must be the same function the auth plugin hashes incoming keys with —
  // a second inline `createHash` here could drift and silently reject every key.
  return { plaintext, prefix, hash: hashApiKey(plaintext) };
}
