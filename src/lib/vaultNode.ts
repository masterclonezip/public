/**
 * Neutral Vault Node Manager
 * Handles in-memory sync of encrypted resource nodes with zero database latency.
 */

import fs from 'fs';
import path from 'path';
import { safeDecrypt, getAesSecret } from './cryptoUtils';
import { ENCRYPTED_LINKS } from './secureVault';

interface SecureNode {
  id: string;
  payload: string; // Encrypted link
  updatedAt: number;
}

class VaultNodeManager {
  private cache: Map<string, string> = new Map();
  private vaultPath = path.join(process.cwd(), 'src', 'server', 'secure_vault.json');

  constructor() {
    this.initialize();
    this.watchVault();
  }

  private initialize() {
    try {
      const newCache = new Map<string, string>();

      const setInCache = (key: any, val: any) => {
        if (key === undefined || key === null || val === undefined || val === null) return;
        const strKey = String(key).trim();
        const strVal = String(val).trim();
        if (!strKey || !strVal) return;
        if (strVal.toLowerCase().includes('mediafire.com')) return;

        const kExact = strKey;
        const kLower = kExact.toLowerCase();
        const kClean = kLower.replace(/[-_ ]+$/, '');
        const kNoSep = kLower.replace(/[-_ ]/g, '');

        if (kExact) newCache.set(kExact, strVal);
        if (kLower) newCache.set(kLower, strVal);
        if (kClean) newCache.set(kClean, strVal);
        if (kNoSep) newCache.set(kNoSep, strVal);
      };

      // 1. Try memory from imported static vault (ENCRYPTED_LINKS)
      const staticVault = ENCRYPTED_LINKS as string;
      if (staticVault && staticVault.length > 50) {
        try {
          const secret = getAesSecret();
          const decrypted = safeDecrypt(ENCRYPTED_LINKS, secret);
          if (decrypted) {
            const data = JSON.parse(decrypted);
            if (Array.isArray(data)) {
              data.forEach((node: any) => {
                const target = node.more_information_url || node.encrypted_link || node.download_url || node.payload || node.url;
                setInCache(node.id, target);
                setInCache(node.slug, target);
                if (node.serial_number !== undefined && node.serial_number !== null) {
                  setInCache(node.serial_number, target);
                }
              });
            } else if (typeof data === 'object') {
              Object.entries(data).forEach(([key, node]: [string, any]) => {
                const target = typeof node === 'string' ? node : (node.more_information_url || node.encrypted_link || node.download_url || node.payload || node.url);
                setInCache(key, target);
                if (node && typeof node === 'object') {
                  setInCache(node.id, target);
                  setInCache(node.slug, target);
                  if (node.serial_number !== undefined && node.serial_number !== null) {
                    setInCache(node.serial_number, target);
                  }
                }
              });
            }
          }
        } catch (e) {
          console.warn("[VaultNode] Static vault load warning:", e);
        }
      }

      // 2. Pre-seed from staticData.mockApps for instant zero-latency lookup
      try {
        const staticDataPath = path.join(process.cwd(), 'src', 'lib', 'staticData');
        const staticData = require(staticDataPath);
        const staticDataApps = (staticData && (Array.isArray(staticData.apps) ? staticData.apps : staticData.mockApps)) || [];
        if (Array.isArray(staticDataApps)) {
          staticDataApps.forEach((app: any) => {
            const target = app.more_information_url || app.encrypted_link || app.download_url || app.url;
            setInCache(app.id, target);
            setInCache(app.slug, target);
            if (app.serial_number !== undefined && app.serial_number !== null) {
              setInCache(app.serial_number, target);
            }
          });
        }
      } catch (e) {}

      // 3. Fallback to file for local dev and persistent runtime backups
      const diskBackupPaths = [
        this.vaultPath,
        path.join(process.cwd(), '.local', 'secure_vault.json'),
        path.join(process.cwd(), '.local', 'secure_links_backup.json'),
        path.join(process.cwd(), 'src', 'lib', 'secure_links_backup.json')
      ];

      for (const p of diskBackupPaths) {
        if (fs.existsSync(p)) {
          try {
            const raw = fs.readFileSync(p, 'utf8');
            const data = JSON.parse(raw);
            if (Array.isArray(data)) {
              data.forEach((node: any) => {
                const target = node.more_information_url || node.encrypted_link || node.download_url || node.payload || node.url;
                setInCache(node.id, target);
                setInCache(node.slug, target);
                if (node.serial_number !== undefined && node.serial_number !== null) {
                  setInCache(node.serial_number, target);
                }
              });
            } else if (data && typeof data === 'object') {
              Object.entries(data).forEach(([key, node]: [string, any]) => {
                const target = typeof node === 'string' ? node : (node.more_information_url || node.encrypted_link || node.download_url || node.payload || node.url);
                setInCache(key, target);
                if (node && typeof node === 'object') {
                  setInCache(node.id, target);
                  setInCache(node.slug, target);
                  if (node.serial_number !== undefined && node.serial_number !== null) {
                    setInCache(node.serial_number, target);
                  }
                }
              });
            }
          } catch (e) {}
        }
      }

      this.cache = newCache;
      console.log(`[VaultNode] Loaded ${this.cache.size} node key mappings into memory.`);
    } catch (error) {
      console.error('[VaultNode] Initialization failed:', error);
    }
  }

  /**
   * Directly injects or updates a key-value mapping in memory for instant resolution.
   */
  public setPayload(key: any, url: any) {
    if (key === undefined || key === null || url === undefined || url === null) return;
    const strKey = String(key).trim();
    const cleanUrl = String(url).trim();
    if (!strKey || !cleanUrl) return;

    const kExact = strKey;
    const kLower = kExact.toLowerCase();
    const kClean = kLower.replace(/[-_ ]+$/, '');
    const kNoSep = kLower.replace(/[-_ ]/g, '');

    if (kExact) this.cache.set(kExact, cleanUrl);
    if (kLower) this.cache.set(kLower, cleanUrl);
    if (kClean) this.cache.set(kClean, cleanUrl);
    if (kNoSep) this.cache.set(kNoSep, cleanUrl);
  }

  /**
   * Ingests an array or object of item mappings directly into memory.
   */
  public setPayloads(items: any) {
    if (!items) return;
    const secret = getAesSecret();

    const processItem = (node: any) => {
      if (!node) return;
      let target = typeof node === 'string' ? node : (node.more_information_url || node.encrypted_link || node.download_url || node.payload || node.url);
      if (!target || typeof target !== 'string') return;

      let trimmed = target.trim();
      if (trimmed.startsWith('U2FsdGVkX1')) {
        const dec = safeDecrypt(trimmed, secret);
        if (dec && dec.trim().length > 0) {
          trimmed = dec.trim();
        }
      }

      if (typeof node === 'object') {
        if (node.id) this.setPayload(node.id, trimmed);
        if (node.slug) this.setPayload(node.slug, trimmed);
      }
    };

    if (Array.isArray(items)) {
      items.forEach(processItem);
    } else if (typeof items === 'object') {
      Object.entries(items).forEach(([key, node]: [string, any]) => {
        this.setPayload(key, typeof node === 'string' ? node : (node.more_information_url || node.encrypted_link || node.download_url || node.payload || node.url));
        if (node && typeof node === 'object') {
          processItem(node);
        }
      });
    }
  }

  private watchVault() {
    try {
      fs.watchFile(this.vaultPath, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          console.log('[VaultNode] Vault file changed, refreshing cache...');
          this.initialize();
        }
      });
    } catch (e) {}
  }

  /**
   * Retrieves and decrypts a resource node instantly from memory.
   */
  public async getSyncPayload(slug: any): Promise<string | null> {
    if (slug === undefined || slug === null) return null;
    const strSlug = String(slug).trim();
    if (!strSlug) return null;
    const candidates = Array.from(new Set([
      strSlug,
      strSlug.toLowerCase(),
      strSlug.toLowerCase().replace(/[-_ ]+$/, ''),
      strSlug.toLowerCase().replace(/[-_ ]/g, '')
    ])).filter(Boolean);

    let cachedPayload: string | undefined;
    for (const cand of candidates) {
      if (this.cache.has(cand)) {
        cachedPayload = this.cache.get(cand);
        if (cachedPayload && cachedPayload.trim().length > 0) break;
      }
    }

    if (!cachedPayload) return null;

    const trimmed = cachedPayload.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      if (trimmed.toLowerCase().includes('mediafire.com')) return null;
      return trimmed;
    }

    if (trimmed.startsWith('U2FsdGVkX1')) {
      try {
        const secret = getAesSecret();
        const decrypted = safeDecrypt(trimmed, secret);
        if (decrypted && decrypted.trim().length > 0) {
          const decTrimmed = decrypted.trim();
          if (decTrimmed.toLowerCase().includes('mediafire.com')) return null;
          return decTrimmed;
        }
      } catch (error) {
        return null;
      }
    }

    if (trimmed.toLowerCase().includes('mediafire.com')) return null;
    if (trimmed.toLowerCase().includes('/download/') || trimmed.toLowerCase().includes('/moreinfo/')) return null;
    return trimmed;
  }

  /**
   * Synchronously retrieves a resource URL from memory, decrypting if stored as ciphertext.
   */
  public getPayload(key: string | undefined | null): string {
    if (!key || typeof key !== 'string') return '';
    const candidates = [
      key,
      key.trim(),
      key.toLowerCase().trim(),
      key.toLowerCase().trim().replace(/[-_ ]+$/, ''),
      key.toLowerCase().trim().replace(/[-_ ]/g, '')
    ];
    for (const cand of candidates) {
      if (this.cache.has(cand)) {
        const val = this.cache.get(cand);
        if (val && val.trim().length > 0) {
          const trimmed = val.trim();
          if (trimmed.toLowerCase().includes('mediafire.com')) return '';
          if (trimmed.startsWith('U2FsdGVkX1')) {
            try {
              const secret = getAesSecret();
              const dec = safeDecrypt(trimmed, secret);
              if (dec && dec.trim().length > 0) {
                const decTrimmed = dec.trim();
                if (decTrimmed.toLowerCase().includes('mediafire.com')) return '';
                return decTrimmed;
              }
            } catch (_) {}
          }
          return trimmed;
        }
      }
    }
    return '';
  }

  /**
   * Refreshes the in-memory cache.
   */
  public refresh() {
    this.cache.clear();
    this.initialize();
  }
}

export const vaultNode = new VaultNodeManager();
