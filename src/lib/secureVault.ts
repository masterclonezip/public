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

export const ENCRYPTED_LINKS = "v2.f4aFRQ90Xz7MsZNQ._4hnxSKiAkvp-A9H-p9dnaUqL3MPtRfs23dQQ_xCYF2jR2GIzSOPOk-iSc95qoh5igTz8Bk76vQ3C0zumFipxb4IcGxi2mpe4xNdiQd9dmETQyrevxBn-Yf_oUEjgUk1fL8";
export const ENCRYPTED_VAULT = ENCRYPTED_LINKS;
export const ENCRYPTED_TURNSTILE_SECRET = "";
