import CryptoJS from 'crypto-js';

export const INTERNAL_VAULT_FALLBACK_KEY = 'default-v12-vault-aes-fallback-secret-32-bytes';

export function getEnvSecretKeys(explicitKey?: string): string[] {
  const keys: string[] = [];
  const add = (k?: string) => {
    if (k && typeof k === 'string' && k.trim().length > 0 && !keys.includes(k.trim())) {
      keys.push(k.trim());
    }
  };
  add(explicitKey);
  if (typeof process !== 'undefined' && process.env) {
    add(process.env.VAULT_SECRET_KEY);
    add(process.env.VITE_VAULT_SECRET_KEY);
    add(process.env.AES_KEY);
    add(process.env.AES_KEY_PREVIOUS);
    add(process.env.AES_SECRET);
    add(process.env.VITE_AES_SECRET);
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    add((import.meta as any).env.VITE_VAULT_SECRET_KEY);
    add((import.meta as any).env.VAULT_SECRET_KEY);
    add((import.meta as any).env.VITE_AES_SECRET);
    add((import.meta as any).env.AES_SECRET);
  }
  add(INTERNAL_VAULT_FALLBACK_KEY);
  return keys;
}

export function getAesSecret(): string {
  const keys = getEnvSecretKeys();
  return keys[0] || INTERNAL_VAULT_FALLBACK_KEY;
}

export function encryptData(plainText: string, secretKey?: string): string {
  if (!plainText || typeof plainText !== 'string') return '';
  const trimmed = plainText.trim();
  if (!trimmed) return '';
  const keys = getEnvSecretKeys(secretKey);
  const key = keys[0];
  if (!key) {
    return trimmed;
  }
  return CryptoJS.AES.encrypt(trimmed, key).toString();
}

export function decryptData(cipherText: string, secretKey?: string): string {
  if (!cipherText || typeof cipherText !== 'string') return '';
  const cleanText = cipherText.trim();
  if (!cleanText) return '';

  if (cleanText.startsWith('http://') || cleanText.startsWith('https://')) {
    return cleanText;
  }

  const keysToTry = getEnvSecretKeys(secretKey);
  for (const key of keysToTry) {
    try {
      const bytes = CryptoJS.AES.decrypt(cleanText, key);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      if (
        originalText &&
        (originalText.startsWith('http://') ||
          originalText.startsWith('https://') ||
          originalText.startsWith('{') ||
          originalText.startsWith('['))
      ) {
        return originalText.trim();
      }
    } catch {
      // Try next configured env key
    }
  }

  return '';
}

export function generateSha1(input: string): string {
  return CryptoJS.SHA1(input).toString(CryptoJS.enc.Hex);
}

export function getFallbackAes(): string {
  return getAesSecret();
}

export const safeEncrypt = encryptData;
export const safeDecrypt = decryptData;
