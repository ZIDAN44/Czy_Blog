import crypto from 'node:crypto';

export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const random = crypto.randomBytes(24).toString('base64url');
  const plaintext = `czk_${random}`;
  const prefix = plaintext.slice(0, 12);
  const hash = crypto.createHash('sha256').update(plaintext).digest('hex');
  return { plaintext, prefix, hash };
}

export function hashApiKey(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}
