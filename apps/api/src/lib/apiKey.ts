import crypto from 'node:crypto';

export function hashApiKey(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}

export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const random = crypto.randomBytes(24).toString('base64url');
  const plaintext = `czk_${random}`;
  const prefix = plaintext.slice(0, 12);
  // Reuse hashApiKey so this can't drift from how the auth plugin hashes incoming keys.
  return { plaintext, prefix, hash: hashApiKey(plaintext) };
}
