/**
 * Symmetric encryption for sensitive provider credentials (OAuth tokens, IMAP passwords).
 *
 * Uses AES-256-GCM with a random 96-bit IV per encryption.
 * The key is read from EMAIL_ENCRYPTION_KEY (64 hex chars = 32 bytes).
 *
 * Generate a suitable key:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * NEVER log raw secrets. Use redactSecret() before logging credential fields.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm' as const;
const KEY_ENV = 'EMAIL_ENCRYPTION_KEY';

function getKey(): Buffer {
  const hex = process.env[KEY_ENV]?.trim();
  if (!hex) {
    throw new Error(
      `${KEY_ENV} is not set. Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
  if (hex.length !== 64) {
    throw new Error(`${KEY_ENV} must be exactly 64 hex characters (32 bytes). Got ${hex.length} chars.`);
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypts a plaintext string.
 * Returns a compact string in format: `iv_b64:authTag_b64:ciphertext_b64`
 */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypts a ciphertext string produced by encryptSecret.
 * Throws on decryption failure (tampered data, wrong key, malformed input).
 */
export function decryptSecret(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted value format (expected iv:tag:data)');
  const [ivB64, authTagB64, encB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const encrypted = Buffer.from(encB64, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

/**
 * Returns a safe-to-log redacted representation of a secret.
 * Shows at most 4 characters + asterisks. Never shows the full value.
 */
export function redactSecret(value: string | null | undefined): string {
  if (!value) return '(empty)';
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)}****`;
}

/**
 * Returns true when the encryption key is properly configured.
 * Use this to surface a configuration warning in the UI/API before attempting OAuth flows.
 */
export function isEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}
