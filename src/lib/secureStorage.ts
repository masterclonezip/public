// Secure Storage — client-side AES encryption for sensitive fields
// Uses the browser's Web Crypto API for encryption

async function getDerivedKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("rummy-store-salt-fixed"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export const secureStorage = {
  encryptPayload: async (data: any, key: string = "default-secure-key-123"): Promise<string> => {
    try {
      const payload = JSON.stringify(data);
      const enc = new TextEncoder();
      const cryptoKey = await getDerivedKey(key);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        cryptoKey,
        enc.encode(payload)
      );
      
      const encryptedArray = new Uint8Array(encrypted);
      const result = new Uint8Array(iv.length + encryptedArray.length);
      result.set(iv, 0);
      result.set(encryptedArray, iv.length);
      
      return btoa(String.fromCharCode.apply(null, Array.from(result)));
    } catch (e) {
      console.warn('secureStorage.encryptPayload failed:', e);
      return '';
    }
  },

  decryptPayload: async (ciphertext: string, key: string = "default-secure-key-123"): Promise<any> => {
    try {
      const binaryStr = atob(ciphertext);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      
      const iv = bytes.slice(0, 12);
      const data = bytes.slice(12);
      const cryptoKey = await getDerivedKey(key);
      
      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        cryptoKey,
        data
      );
      
      const dec = new TextDecoder();
      return JSON.parse(dec.decode(decrypted));
    } catch (e) {
      console.warn('secureStorage.decryptPayload failed:', e);
      return null;
    }
  },

  setItem: (storageKey: string, value: any): void => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (e) {}
  },

  getItem: (storageKey: string): any => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  removeItem: (storageKey: string): void => {
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {}
  }
};

export default secureStorage;
