import CryptoJS from 'crypto-js';

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function fromBase64Url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const full = b64 + pad;
  if (typeof atob === 'function') {
    const bin = atob(full);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      out[i] = bin.charCodeAt(i);
    }
    return out;
  }
  return new Uint8Array(Buffer.from(full, 'base64'));
}

export function isRealEnvKey(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  const clean = val.trim();
  if (
    !clean ||
    clean === 'PLACEHOLDER' ||
    clean === 'undefined' ||
    clean === 'null' ||
    clean.includes('REPLACE_WITH_YOUR_REAL_KEY') ||
    clean.includes('YOUR_API_KEY')
  ) {
    return false;
  }
  return true;
}

export const INTERNAL_VAULT_FALLBACK_KEY = 'default-v12-vault-aes-fallback-secret-32-bytes';
export const LEGACY_VAULT_FALLBACK_KEY = 'default-v12-vault-aes-legacy-secret-32-bytes';

export function getCandidateAesKeys(env?: Record<string, any>, explicitKey?: string): string[] {
  const e = env || (typeof process !== 'undefined' ? process.env : {}) || {};
  const p = (typeof process !== 'undefined' && process.env) ? process.env : {};
  const raw = [
    explicitKey,
    e.AES_KEY,
    e.AES_KEY_PREVIOUS,
    e.AES_SECRET,
    e.VAULT_SECRET_KEY,
    e.VITE_VAULT_SECRET_KEY,
    e.VITE_AES_SECRET,
    p.AES_KEY,
    p.AES_KEY_PREVIOUS,
    p.AES_SECRET,
    p.VAULT_SECRET_KEY,
    p.VITE_VAULT_SECRET_KEY,
    p.VITE_AES_SECRET,
    INTERNAL_VAULT_FALLBACK_KEY,
    LEGACY_VAULT_FALLBACK_KEY,
  ];
  const valid: string[] = [];
  for (const k of raw) {
    if (isRealEnvKey(k)) {
      const trimmed = String(k).trim();
      if (!valid.includes(trimmed)) valid.push(trimmed);
    }
  }
  return valid;
}

async function deriveAes256KeyBytes(rawSecret: string): Promise<Uint8Array> {
  const trimmed = rawSecret.trim();
  try {
    const decoded = fromBase64Url(trimmed);
    if (decoded.byteLength === 32) {
      return decoded;
    }
  } catch {
    // Fall through to SHA-256 key derivation
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(trimmed));
  return new Uint8Array(digest);
}

/**
 * Encrypts plaintext using Web Crypto AES-256-GCM (v2 envelope: v2.<base64url(iv)>.<base64url(ciphertext+tag)>)
 */
export async function encryptAesGcmV2(
  plaintext: string,
  env?: Record<string, any>,
  explicitKey?: string
): Promise<string> {
  if (!plaintext) return '';
  if (plaintext.startsWith('v2.')) return plaintext;

  const keys = getCandidateAesKeys(env, explicitKey);
  if (keys.length === 0) {
    throw new Error('AES_KEY is not configured in environment');
  }

  const keyBytes = await deriveAes256KeyBytes(keys[0]);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoded);

  return `v2.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(cipherBuffer))}`;
}

/**
 * Decrypts a v2 AES-256-GCM envelope using Web Crypto (`AES_KEY` -> `AES_KEY_PREVIOUS` -> `AES_SECRET`)
 */
export async function decryptAesGcmV2(
  envelope: string,
  env?: Record<string, any>,
  explicitKey?: string
): Promise<string> {
  if (!envelope || !envelope.startsWith('v2.')) return '';
  const parts = envelope.split('.');
  if (parts.length !== 3) return '';

  let iv: Uint8Array;
  let cipherBytes: Uint8Array;
  try {
    iv = fromBase64Url(parts[1]);
    cipherBytes = fromBase64Url(parts[2]);
    if (iv.byteLength !== 12 || cipherBytes.byteLength < 16) return '';
  } catch {
    return '';
  }

  const keys = getCandidateAesKeys(env, explicitKey);
  for (const k of keys) {
    try {
      const keyBytes = await deriveAes256KeyBytes(k);
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        cipherBytes
      );
      const text = new TextDecoder().decode(plainBuffer).trim();
      if (text) return text;
    } catch {
      // Try next rotation key
    }
  }
  return '';
}

/**
 * Decrypts either v2 Web Crypto AES-256-GCM or legacy U2FsdGVkX1 CryptoJS ciphertexts during migration.
 */
export async function decryptVaultValue(
  ciphertext: string,
  env?: Record<string, any>,
  explicitKey?: string
): Promise<string> {
  if (!ciphertext || typeof ciphertext !== 'string') return '';
  const clean = ciphertext.trim().replace(/^["']|["']$/g, '');
  if (!clean) return '';

  if (clean.startsWith('v2.')) {
    return decryptAesGcmV2(clean, env, explicitKey);
  }

  if (clean.startsWith('U2FsdGVkX1')) {
    const keys = getCandidateAesKeys(env, explicitKey);
    for (const k of keys) {
      try {
        const bytes = CryptoJS.AES.decrypt(clean, k);
        const text = bytes.toString(CryptoJS.enc.Utf8);
        if (text && text.trim().length > 0) return text.trim();
      } catch {
        // Continue trying keys
      }
    }
    return '';
  }

  return clean;
}
