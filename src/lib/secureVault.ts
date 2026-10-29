import {
  getEnvSecretKeys,
  getAesSecret,
  encryptData,
  decryptData,
  safeEncrypt,
  safeDecrypt,
} from './cryptoUtils';

export { getEnvSecretKeys, getAesSecret, encryptData, decryptData, safeEncrypt, safeDecrypt };

export function encryptLinks(linksMap: Record<string, string>, secretKey?: string): string {
  return safeEncrypt(JSON.stringify(linksMap), secretKey);
}

export function decryptLinks(ciphertext: string, secretKey?: string): Record<string, string> {
  if (!ciphertext || typeof ciphertext !== 'string' || !ciphertext.trim()) return {};
  const dec = safeDecrypt(ciphertext.trim(), secretKey);
  if (!dec) return {};
  try {
    const parsed = JSON.parse(dec);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {}
  return {};
}

export function generateSecureVaultFile(c: string, ts?: string): string {
  const defTs = "";
  return `export { getEnvSecretKeys, getAesSecret, encryptData, decryptData, safeEncrypt, safeDecrypt } from './cryptoUtils';\nexport const ENCRYPTED_LINKS = ${JSON.stringify(String(c || '').trim())};\nexport const ENCRYPTED_VAULT = ENCRYPTED_LINKS;\nexport const ENCRYPTED_TURNSTILE_SECRET = ${JSON.stringify(String(ts || defTs).trim())};\n`;
}

export const ENCRYPTED_LINKS = "U2FsdGVkX1/amAun8tC1iFIM3ZdkyE0gLWhS5oBDIGYhghYv4um5Y5nbwLo7yNx3d/1ne5V8FFyZK2YjpiRXTy2gHJrH7XgzjypYBpjot/gYTcw1UJ+4WUPducgEsdpHLYMDnwnmYO1NZTKg3GQpEQ==";
export const ENCRYPTED_VAULT = ENCRYPTED_LINKS;
export const ENCRYPTED_TURNSTILE_SECRET = "";
