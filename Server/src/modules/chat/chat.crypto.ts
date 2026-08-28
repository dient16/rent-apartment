/**
 * Encryption at rest for the chat: AES-256-GCM with a random 12-byte IV per item and the
 * GCM auth tag stored next to the ciphertext. Text messages and image bytes use the same
 * scheme. The key is SHA-256(CHAT_ENCRYPTION_KEY) - keep that env value stable, rotating
 * it makes existing messages undecryptable.
 *
 * Image URLs are signed (HMAC, short expiry) so <img> tags can load them without an
 * Authorization header while non-members cannot guess or reuse them.
 */
import crypto from 'node:crypto';

import { env } from '@/config/env.config';
import { logger } from '@/utils/logger';

export interface EncryptedText {
  iv: string;
  tag: string;
  data: string;
}

const ALGORITHM = 'aes-256-gcm';

/** CHAT_ENCRYPTION_KEY, or a key derived from JWT_ACCESS_KEY when it is not configured. */
const keyMaterial = (() => {
  if (env.CHAT_ENCRYPTION_KEY) return env.CHAT_ENCRYPTION_KEY;
  logger.warn('CHAT_ENCRYPTION_KEY is not set - deriving the chat key from JWT_ACCESS_KEY. Set it explicitly (and keep it stable).');
  return `${env.JWT_ACCESS_KEY}:chat-at-rest`;
})();
const key = crypto.createHash('sha256').update(keyMaterial).digest();
const signingKey = crypto.createHash('sha256').update(`${keyMaterial}:image-url`).digest();

export const encryptText = (plain: string): EncryptedText => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
};

/** null when written with another key or tampered with */
export const decryptText = (payload: EncryptedText | null | undefined): string | null => {
  if (!payload?.iv || !payload.tag || !payload.data) return null;
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
};

export const encryptBuffer = (plain: Buffer): { iv: string; tag: string; data: Buffer } => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data };
};

export const decryptBuffer = (data: Buffer, iv: string, tag: string): Buffer | null => {
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(data), decipher.final()]);
  } catch {
    return null;
  }
};

const IMAGE_URL_TTL_SECONDS = 60 * 60;

const imageSignature = (fileId: string, exp: number) =>
  crypto.createHmac('sha256', signingKey).update(`${fileId}:${exp}`).digest('base64url');

/** `/api/chat/images/<id>?exp=<unix>&sig=<hmac>` valid for one hour. */
export const signImagePath = (fileId: string): string => {
  const exp = Math.floor(Date.now() / 1000) + IMAGE_URL_TTL_SECONDS;
  return `/api/chat/images/${fileId}?exp=${exp}&sig=${imageSignature(fileId, exp)}`;
};

export const verifyImageSignature = (fileId: string, exp: unknown, sig: unknown): boolean => {
  const expiry = Number(exp);
  if (!Number.isFinite(expiry) || expiry < Math.floor(Date.now() / 1000) || typeof sig !== 'string') return false;
  const expected = imageSignature(fileId, expiry);
  return expected.length === sig.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
};
