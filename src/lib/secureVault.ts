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

export const ENCRYPTED_LINKS = "v2.OqZUYdNa-9CxhsaS.3S82JUdBxb4txh-DkKnzZJedblunAdSFMmxLB6s9p7w554riY6Xdu7AG1H0FIw5dHb24khzgrbtZddrMKexA4ZHMb6GmAWcdpeHW1ci7lUmSZPoRZNZPrm-p1V-jcdFNejQWJ39tw2D_P1VnrJ3zUhRFZGWsX5TNG8uFOBflQEBD4Lf4RV7kdbimqmruH3MsToSZ4FjH5EZiJgCHrk5Ii0y_cMoTg9LLVOofcvRTDuHc0FOQMqmIBn9PzkpjCmHMamDqBWyNkH9aIUAgX2dO2mhYP4y-fCOjBY5IQdkgtYVwZvyKdGQssvLJfAVyHUszQw";
export const ENCRYPTED_VAULT = ENCRYPTED_LINKS;
export const ENCRYPTED_TURNSTILE_SECRET = "";
