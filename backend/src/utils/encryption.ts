import crypto from 'crypto';
import { config } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: salt:iv:authTag:encryptedData
 */
export function encrypt(text: string): string {
  if (!config.encryption.masterKey) {
    throw new Error('MASTER_KEY not configured');
  }

  // Generate random salt for key derivation
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Derive key from master key using PBKDF2
  const key = crypto.pbkdf2Sync(
    config.encryption.masterKey,
    salt,
    100000,
    32,
    'sha512'
  );

  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Return format: salt:iv:authTag:encryptedData
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted
  ].join(':');
}

/**
 * Decrypts data encrypted with encrypt()
 * @param encryptedData - Encrypted string in format: salt:iv:authTag:encryptedData
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string): string {
  if (!config.encryption.masterKey) {
    throw new Error('MASTER_KEY not configured');
  }

  // Parse encrypted data
  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }

  const [saltHex, ivHex, authTagHex, encrypted] = parts;

  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  // Derive the same key using salt
  const key = crypto.pbkdf2Sync(
    config.encryption.masterKey,
    salt,
    100000,
    32,
    'sha512'
  );

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt the data
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates a secure random token for webhook verification
 */
export function generateWebhookToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
