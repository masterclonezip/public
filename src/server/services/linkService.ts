import { ENCRYPTED_LINKS, ENCRYPTED_TURNSTILE_SECRET } from '../../lib/secureVault.js';
import { decryptVaultValue } from '../crypto.js';

export interface LinkResolutionResult {
  url: string | null;
  tier: 'T0_RAM' | 'T1_VAULT' | 'T2_BACKUP' | 'T3_SEC_VAULT' | 'T4_STORE_DATA' | 'NONE';
}

const ramCache = new Map<string, string>();
let t1Loaded = false;
let t2Loaded = false;
let cachedTurnstileSecretFromStore: { secret: string; expiresAt: number } | null = null;

function normalizeIdentifier(id: string): string {
  return String(id || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Validates that a resolved URL is an external http(s) destination and never
 * points back to the configured public domain, /moreinfo, or /gateway (loop guard per §5.8).
 */
export function isValidDestinationUrl(rawUrl: unknown): rawUrl is string {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const configuredDomain = (typeof process !== 'undefined' && process.env)
      ? (process.env.PUBLIC_DOMAIN || process.env.VITE_PUBLIC_DOMAIN || '').trim()
      : '';
    if (configuredDomain) {
      try {
        const cfgHost = new URL(configuredDomain.startsWith('http') ? configuredDomain : `https://${configuredDomain}`).hostname.toLowerCase().replace(/^www\./, '');
        if (cfgHost && (host === cfgHost || host === `www.${cfgHost}` || host.endsWith(`.${cfgHost}`))) {
          return false;
        }
      } catch {
        // ignore invalid domain config
      }
    }
    const pathname = parsed.pathname.toLowerCase();
    if (pathname.startsWith('/moreinfo') || pathname.startsWith('/gateway')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function setRamVaultLink(key: string, url: string): void {
  if (!key || !isValidDestinationUrl(url)) return;
  const cleanUrl = url.trim();
  ramCache.set(String(key).trim(), cleanUrl);
  ramCache.set(String(key).trim().toLowerCase(), cleanUrl);
  const norm = normalizeIdentifier(key);
  if (norm) ramCache.set(norm, cleanUrl);
}

export function primeRamVaultMap(linksMap: Record<string, string>): void {
  if (!linksMap || typeof linksMap !== 'object') return;
  for (const [k, v] of Object.entries(linksMap)) {
    if (isValidDestinationUrl(v)) {
      setRamVaultLink(k, v);
    }
  }
}

function lookupInMap(map: Map<string, string>, identifier: string): string | null {
  const exact = map.get(identifier) || map.get(identifier.toLowerCase());
  if (exact && isValidDestinationUrl(exact)) return exact;
  const norm = normalizeIdentifier(identifier);
  if (norm) {
    const byNorm = map.get(norm);
    if (byNorm && isValidDestinationUrl(byNorm)) return byNorm;
  }
  return null;
}

function lookupInRecord(record: Record<string, unknown>, identifier: string): string | null {
  if (!record || typeof record !== 'object') return null;
  const direct = record[identifier] ?? record[identifier.toLowerCase()];
  if (isValidDestinationUrl(direct)) return direct.trim();

  const targetNorm = normalizeIdentifier(identifier);
  if (!targetNorm) return null;

  for (const [k, v] of Object.entries(record)) {
    if (normalizeIdentifier(k) === targetNorm && isValidDestinationUrl(v)) {
      return v.trim();
    }
  }
  return null;
}

async function decodeLinkField(
  rawVal: unknown,
  env?: Record<string, string | undefined>
): Promise<string | null> {
  if (!rawVal || typeof rawVal !== 'string') return null;
  const trimmed = rawVal.trim();
  if (!trimmed) return null;
  if (isValidDestinationUrl(trimmed)) return trimmed;

  const decrypted = await decryptVaultValue(trimmed, env);
  if (decrypted && isValidDestinationUrl(decrypted)) {
    return decrypted.trim();
  }
  return null;
}

async function normalizeVaultPayloadToMap(
  parsed: unknown,
  env?: Record<string, string | undefined>
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!parsed || typeof parsed !== 'object') return out;

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const idStr = String(obj.id ?? '').trim();
      const slugStr = String(obj.slug ?? '').trim();
      const candidates = [
        obj.more_information_url,
        obj.download_url,
        obj.link,
        obj.encrypted_link,
        obj.url,
      ];
      for (const c of candidates) {
        const resolved = await decodeLinkField(c, env);
        if (resolved) {
          if (idStr) out[idStr] = resolved;
          if (slugStr) out[slugStr] = resolved;
          break;
        }
      }
    }
    return out;
  }

  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    const resolved = await decodeLinkField(v, env);
    if (resolved) {
      out[k] = resolved;
    }
  }
  return out;
}

async function loadT1Vault(
  env?: Record<string, string | undefined>
): Promise<Record<string, string>> {
  const vaultCipher: string = String(ENCRYPTED_LINKS || '').trim();
  if (!vaultCipher) {
    return {};
  }
  const plain = await decryptVaultValue(vaultCipher, env);
  if (!plain) return {};
  try {
    const parsed = JSON.parse(plain);
    const mapObj = await normalizeVaultPayloadToMap(parsed, env);
    if (!t1Loaded && Object.keys(mapObj).length > 0) {
      t1Loaded = true;
      primeRamVaultMap(mapObj);
    }
    return mapObj;
  } catch {
    // Ignore malformed JSON
  }
  return {};
}

async function resolveFromT2Backup(
  identifier: string,
  env?: Record<string, string | undefined>
): Promise<string | null> {
  try {
    // Dynamic import so Cloudflare Workers/Pages without Node fs never fail at module load
    if (typeof process === 'undefined' || typeof process.cwd !== 'function') {
      return null;
    }
    const fsMod = await import('fs').catch(() => null);
    const pathMod = await import('path').catch(() => null);
    if (!fsMod || !pathMod) return null;

    const backupPath = pathMod.join(process.cwd(), 'src', 'lib', 'staticData.json');
    if (!fsMod.existsSync(backupPath)) return null;
    const raw = fsMod.readFileSync(backupPath, 'utf-8');
    const data = JSON.parse(raw);

    if (
      data?.settings?.turnstile_secret_key &&
      typeof data.settings.turnstile_secret_key === 'string'
    ) {
      cachedTurnstileSecretFromStore = {
        secret: data.settings.turnstile_secret_key.trim(),
        expiresAt: Date.now() + 300_000,
      };
    }

    // 1. Check encrypted_links inside staticData.json if present
    if (data?.encrypted_links && typeof data.encrypted_links === 'string') {
      const decMapStr = await decryptVaultValue(data.encrypted_links, env);
      if (decMapStr) {
        try {
          const parsed = JSON.parse(decMapStr);
          const mapObj = await normalizeVaultPayloadToMap(parsed, env);
          primeRamVaultMap(mapObj);
          const found = lookupInRecord(mapObj, identifier);
          if (found) {
            setRamVaultLink(identifier, found);
            return found;
          }
        } catch {
          // Continue to apps array
        }
      }
    }

    // 2. Check apps array inside staticData.json
    const apps: Record<string, unknown>[] = Array.isArray(data?.apps) ? data.apps : [];
    const targetNorm = normalizeIdentifier(identifier);

    for (const app of apps) {
      const idStr = String(app.id ?? '');
      const slugStr = String(app.slug ?? '');
      const nameStr = String(app.name ?? '');
      const matched =
        idStr === identifier ||
        slugStr.toLowerCase() === identifier.toLowerCase() ||
        (targetNorm &&
          (normalizeIdentifier(idStr) === targetNorm ||
            normalizeIdentifier(slugStr) === targetNorm ||
            normalizeIdentifier(nameStr) === targetNorm));

      if (matched) {
        const candidates = [
          app.more_information_url,
          app.download_url,
          app.link,
          app.encrypted_link,
        ];
        for (const candidate of candidates) {
          const resolved = await decodeLinkField(candidate, env);
          if (resolved) {
            setRamVaultLink(identifier, resolved);
            if (idStr) setRamVaultLink(idStr, resolved);
            if (slugStr) setRamVaultLink(slugStr, resolved);
            return resolved;
          }
        }
      }
    }

    if (!t2Loaded && apps.length > 0) {
      t2Loaded = true;
    }
  } catch {
    // Ignore filesystem errors in edge environments without fs
  }
  return null;
}

/**
 * Resolves all candidate Cloudflare Turnstile secret keys across:
 * 1. Sealed `ENCRYPTED_TURNSTILE_SECRET` in `src/lib/secureVault.ts` (zero-Firebase static edge resolution)
 * 2. Admin Settings `turnstile_secret_key` (from local `staticData.json` on Node server)
 * 3. Environment variable `TURNSTILE_SECRET_KEY`
 *
 * Completely independent of Firebase/Firestore so Firebase quota exhaustion (429)
 * has zero impact on the /moreinfo gateway.
 */
export async function getCandidateTurnstileSecrets(
  env?: Record<string, string | undefined>
): Promise<string[]> {
  const procEnv =
    typeof process !== 'undefined' && process.env
      ? (process.env as Record<string, string | undefined>)
      : {};
  const secrets: string[] = [];
  const addSecret = (s: unknown) => {
    if (typeof s === 'string' && s.trim() && !secrets.includes(s.trim())) {
      secrets.push(s.trim());
    }
  };

  // 1. Check in-memory cached secret first
  if (
    cachedTurnstileSecretFromStore &&
    cachedTurnstileSecretFromStore.secret &&
    Date.now() < cachedTurnstileSecretFromStore.expiresAt
  ) {
    addSecret(cachedTurnstileSecretFromStore.secret);
    addSecret(env?.TURNSTILE_SECRET_KEY);
    addSecret(procEnv.TURNSTILE_SECRET_KEY);
    return secrets;
  }

  // 2. Decrypt sealed ENCRYPTED_TURNSTILE_SECRET from src/lib/secureVault.ts (works on Cloudflare Edge & Node with 0 I/O)
  try {
    if (ENCRYPTED_TURNSTILE_SECRET && typeof ENCRYPTED_TURNSTILE_SECRET === 'string') {
      const decSecret = await decryptVaultValue(ENCRYPTED_TURNSTILE_SECRET, env);
      if (decSecret && decSecret.trim()) {
        cachedTurnstileSecretFromStore = {
          secret: decSecret.trim(),
          expiresAt: Date.now() + 3_600_000,
        };
        addSecret(decSecret);
      }
    }
  } catch {
    // Ignore decryption error and continue to local backup / env var
  }

  // 3. Try reading from local staticData.json (Node server)
  try {
    if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
      const fsMod = await import('fs').catch(() => null);
      const pathMod = await import('path').catch(() => null);
      if (fsMod && pathMod) {
        const backupPath = pathMod.join(process.cwd(), 'src', 'lib', 'staticData.json');
        if (fsMod.existsSync(backupPath)) {
          const raw = fsMod.readFileSync(backupPath, 'utf-8');
          const parsed = JSON.parse(raw);
          const sec = parsed?.settings?.turnstile_secret_key;
          if (typeof sec === 'string' && sec.trim()) {
            cachedTurnstileSecretFromStore = {
              secret: sec.trim(),
              expiresAt: Date.now() + 3_600_000,
            };
            addSecret(sec);
          }
        }
      }
    }
  } catch {
    // Ignore local fs errors on Edge
  }

  addSecret(env?.TURNSTILE_SECRET_KEY);
  addSecret(procEnv.TURNSTILE_SECRET_KEY);

  return secrets;
}

/**
 * Resolves an app identifier (ID or slug) purely across static/in-memory tiers:
 * T0 (RAM Cache) -> T1 (ENCRYPTED_LINKS in src/lib/secureVault.ts) -> T2 (local staticData.json).
 * Zero Firebase / Firestore requests are ever made on the /moreinfo gateway path.
 */
export async function resolveDestinationUrl(
  appId: string,
  env?: Record<string, string | undefined>
): Promise<LinkResolutionResult> {
  const cleanId = String(appId || '').trim();
  if (!cleanId) return { url: null, tier: 'NONE' };

  // T0: RAM Cache
  const t0 = lookupInMap(ramCache, cleanId);
  if (t0) {
    return { url: t0, tier: 'T0_RAM' };
  }

  // T1: ENCRYPTED_LINKS from src/lib/secureVault.ts
  const t1Map = await loadT1Vault(env);
  const t1 = lookupInRecord(t1Map, cleanId);
  if (t1) {
    setRamVaultLink(cleanId, t1);
    return { url: t1, tier: 'T1_VAULT' };
  }

  // T2: src/lib/staticData.json (Node server fallback)
  const t2 = await resolveFromT2Backup(cleanId, env);
  if (t2) {
    return { url: t2, tier: 'T2_BACKUP' };
  }

  return { url: null, tier: 'NONE' };
}
