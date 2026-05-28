import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function normalizeKey(secret: string): Buffer {
  try {
    const asBase64 = Buffer.from(secret, 'base64');
    if (asBase64.length === 32) {
      return asBase64;
    }
  } catch {
    // Fall through to hash-based derivation for local development secrets.
  }

  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptText(plainText: string, secret: string): string {
  const key = normalizeKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptText(payload: string, secret: string): string {
  const [ivPart, tagPart, encryptedPart] = payload.split('.');
  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error('Invalid encrypted payload');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    normalizeKey(secret),
    Buffer.from(ivPart, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64')),
    decipher.final()
  ]).toString('utf8');
}
