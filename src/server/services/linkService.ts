import { ENCRYPTED_LINKS, ENCRYPTED_TURNSTILE_SECRET } from '../../lib/secureVault.js';
import { decryptVaultValue } from '../crypto.js';
import bundledStaticData from '../../lib/staticData.json';

export interface LinkResolutionResult {
  url: string | null;
  tier: 'T0_RAM' | 'T1_VAULT' | 'T2_BACKUP' | 'T3_SEC_VAULT' | 'T4_STORE_DATA' | 'NONE';
}

const ramCache = new Map<string, string>();
let t1Loaded = false;
let t2Loaded = false;
let t3CircuitBrokenUntil = 0;
let cachedTurnstileSecretFromStore: { secret: string; expiresAt: number } | null = null;
let cachedTurnstileSiteKeyFromStore: { siteKey: string; expiresAt: number } | null = null;

function normalizeIdentifier(id: string): string {
  return String(id || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function sanitizeKey(raw: unknown): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().replace(/^["'`]+|["'`]+$/g, '').trim();
}

function isTestTurnstileKey(k: string): boolean {
  return (
    k.startsWith('1x00000000000000000000') ||
    k.startsWith('2x00000000000000000000') ||
    k.startsWith('3x00000000000000000000')
  );
}

function isRealTurnstileKeyValue(k: unknown): k is string {
  const trimmed = sanitizeKey(k);
  if (trimmed.length < 10) return false;
  if (
    trimmed.includes('<') ||
    trimmed.includes('>') ||
    trimmed.includes('REPLACE_') ||
    trimmed.includes('YOUR_') ||
    trimmed === 'PLACEHOLDER' ||
    trimmed === 'undefined' ||
    trimmed === 'null'
  ) {
    return false;
  }
  return true;
}

/**
 * Cloudflare Turnstile Site Keys start with `0x4` and are 24 characters long (e.g. `0x4AAAAAAA...`).
 * Secret Keys are 35 characters (`0x4...`) and Cloudflare API Tokens are 40 characters (not `0x4...`).
 * Strict format validation prevents Secret Keys or API Tokens from ever being rendered as a widget sitekey.
 */
export function isValidTurnstileSiteKey(k: unknown): k is string {
  const clean = sanitizeKey(k);
  if (!isRealTurnstileKeyValue(clean) || isTestTurnstileKey(clean)) return false;
  return /^0x4[A-Za-z0-9_-]{17,24}$/.test(clean);
}

/**
 * Cloudflare Turnstile Secret Keys start with `0x4` and are 35 characters long.
 */
export function isValidTurnstileSecretKey(k: unknown): k is string {
  const clean = sanitizeKey(k);
  if (!isRealTurnstileKeyValue(clean)) return false;
  if (isTestTurnstileKey(clean)) return true;
  return /^0x4[A-Za-z0-9_-]{25,42}$/.test(clean);
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
    if (pathname.startsWith('/moreinfo')) {
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
      const serialStr = String(obj.serial_number ?? '').trim();
      const nameStr = String(obj.name ?? '').trim();
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
          if (serialStr) out[serialStr] = resolved;
          if (nameStr) out[nameStr] = resolved;
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

async function loadStaticDataSnapshot(): Promise<Record<string, any> | null> {
  try {
    if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
      const fsMod = await import('fs').catch(() => null);
      const pathMod = await import('path').catch(() => null);
      if (fsMod && pathMod) {
        const backupPath = pathMod.join(process.cwd(), 'src', 'lib', 'staticData.json');
        if (fsMod.existsSync(backupPath)) {
          const raw = fsMod.readFileSync(backupPath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      }
    }
  } catch {
    // Fall through to bundledStaticData on Cloudflare Workers/Pages
  }
  if (bundledStaticData && typeof bundledStaticData === 'object') {
    return bundledStaticData as Record<string, any>;
  }
  return null;
}

async function resolveFromT2Backup(
  identifier: string,
  env?: Record<string, string | undefined>
): Promise<string | null> {
  try {
    const data = await loadStaticDataSnapshot();
    if (!data) return null;

    if (
      data?.settings?.turnstile_secret_key &&
      typeof data.settings.turnstile_secret_key === 'string'
    ) {
      cachedTurnstileSecretFromStore = {
        secret: data.settings.turnstile_secret_key.trim(),
        expiresAt: Date.now() + 300_000,
      };
    }
    if (
      data?.settings?.turnstile_site_key &&
      typeof data.settings.turnstile_site_key === 'string' &&
      isValidTurnstileSiteKey(data.settings.turnstile_site_key)
    ) {
      cachedTurnstileSiteKeyFromStore = {
        siteKey: sanitizeKey(data.settings.turnstile_site_key),
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
    // Ignore errors
  }
  return null;
}

function getFirestoreRestConfig(env?: Record<string, string | undefined>) {
  const procEnv =
    typeof process !== 'undefined' && process.env
      ? (process.env as Record<string, string | undefined>)
      : {};
  const projectId = String(
    env?.VITE_FIREBASE_PROJECT_ID ||
      env?.FIREBASE_PROJECT_ID ||
      procEnv.VITE_FIREBASE_PROJECT_ID ||
      procEnv.FIREBASE_PROJECT_ID ||
      ''
  )
    .replace(/^["']|["']$/g, '')
    .trim();
  const apiKey = String(
    env?.VITE_FIREBASE_API_KEY ||
      env?.FIREBASE_API_KEY ||
      procEnv.VITE_FIREBASE_API_KEY ||
      procEnv.FIREBASE_API_KEY ||
      ''
  )
    .replace(/^["']|["']$/g, '')
    .trim();
  const rawDbId = String(
    env?.VITE_FIREBASE_DATABASE_ID ||
      env?.FIREBASE_DATABASE_ID ||
      procEnv.VITE_FIREBASE_DATABASE_ID ||
      procEnv.FIREBASE_DATABASE_ID ||
      '(default)'
  )
    .replace(/^["']|["']$/g, '')
    .trim();
  const dbId =
    !rawDbId ||
    rawDbId.toLowerCase() === 'default' ||
    rawDbId.toLowerCase() === '(default)' ||
    rawDbId === 'undefined' ||
    rawDbId === 'null' ||
    rawDbId === projectId
      ? '(default)'
      : rawDbId;

  if (!projectId) return null;
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(dbId)}/documents/store_data`;
  const keyParam = apiKey ? `?key=${encodeURIComponent(apiKey)}` : '';
  return { baseUrl, keyParam };
}

function fromFirestoreRestVal(v: any): any {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return Boolean(v.booleanValue);
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue?.values || []).map(fromFirestoreRestVal);
  if ('mapValue' in v) {
    const out: Record<string, any> = {};
    const fields = v.mapValue?.fields || {};
    for (const [k, fv] of Object.entries(fields)) out[k] = fromFirestoreRestVal(fv);
    return out;
  }
  return null;
}

async function fetchTurnstileKeysFromFirestoreRest(
  env?: Record<string, string | undefined>
): Promise<{ siteKey?: string; secretKey?: string } | null> {
  const cfg = getFirestoreRestConfig(env);
  if (!cfg) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);
  try {
    const [settingsRes, pubSettingsRes] = await Promise.all([
      fetch(`${cfg.baseUrl}/settings${cfg.keyParam}`, { signal: controller.signal }).catch(() => null),
      fetch(`${cfg.baseUrl}/public_settings${cfg.keyParam}`, { signal: controller.signal }).catch(() => null),
    ]);
    let siteKey = '';
    let secretKey = '';

    for (const r of [settingsRes, pubSettingsRes]) {
      if (r && r.ok) {
        const j = await r.json().catch(() => null);
        if (j?.fields) {
          const d = fromFirestoreRestVal({ mapValue: { fields: j.fields } }) || {};
          const sk = sanitizeKey(d.turnstile_site_key);
          const sec = sanitizeKey(d.turnstile_secret_key);
          if (!siteKey && isValidTurnstileSiteKey(sk)) {
            siteKey = sk;
            cachedTurnstileSiteKeyFromStore = {
              siteKey: sk,
              expiresAt: Date.now() + 600_000,
            };
          }
          if (!secretKey && isValidTurnstileSecretKey(sec) && !isTestTurnstileKey(sec)) {
            secretKey = sec;
            cachedTurnstileSecretFromStore = {
              secret: sec,
              expiresAt: Date.now() + 600_000,
            };
          }
        }
      }
    }
    return { siteKey, secretKey };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Last-resort T3 fallback for clone/edge deployments where an app was added via Admin to Firestore
 * (`store_data/secure_links` or `store_data/apps_chunk_0..3`) before a full GitHub vault code sync.
 * Strictly guarded by a 60s circuit breaker and caches all discovered links in `ramCache` so
 * subsequent requests resolve in T0_RAM (0ms, 0 external requests).
 */
async function resolveFromT3FirestoreRest(
  identifier: string,
  env?: Record<string, string | undefined>
): Promise<string | null> {
  if (Date.now() < t3CircuitBrokenUntil) return null;
  const cfg = getFirestoreRestConfig(env);
  if (!cfg) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      const [secRes, chunk0Res, chunk1Res, chunk2Res] = await Promise.all([
        fetch(`${cfg.baseUrl}/secure_links${cfg.keyParam}`, { signal: controller.signal }).catch(() => null),
        fetch(`${cfg.baseUrl}/apps_chunk_0${cfg.keyParam}`, { signal: controller.signal }).catch(() => null),
        fetch(`${cfg.baseUrl}/apps_chunk_1${cfg.keyParam}`, { signal: controller.signal }).catch(() => null),
        fetch(`${cfg.baseUrl}/apps_chunk_2${cfg.keyParam}`, { signal: controller.signal }).catch(() => null),
      ]);

      // 1. Parse store_data/secure_links if present
      if (secRes && secRes.ok) {
        const secJson = await secRes.json().catch(() => null);
        if (secJson?.fields) {
          const secData = fromFirestoreRestVal({ mapValue: { fields: secJson.fields } }) || {};
          const items = Array.isArray(secData.items) ? secData.items : [];
          const mapObj = await normalizeVaultPayloadToMap(items.length > 0 ? items : secData.links || secData, env);
          primeRamVaultMap(mapObj);
        }
      }

      // 2. Parse store_data/apps_chunk_0..2 and cross-index id <-> slug <-> serial_number <-> name
      const allApps: Record<string, unknown>[] = [];
      for (const cRes of [chunk0Res, chunk1Res, chunk2Res]) {
        if (cRes && cRes.ok) {
          const cJson = await cRes.json().catch(() => null);
          if (cJson?.fields) {
            const cData = fromFirestoreRestVal({ mapValue: { fields: cJson.fields } }) || {};
            const apps = Array.isArray(cData.items) ? cData.items : [];
            for (const a of apps) {
              if (a && typeof a === 'object') allApps.push(a as Record<string, unknown>);
            }
            const mapObj = await normalizeVaultPayloadToMap(apps, env);
            primeRamVaultMap(mapObj);
          }
        }
      }

      // 3. Cross-bind any link already in ramCache by app.id to app.slug / serial_number / name (and vice versa)
      for (const app of allApps) {
        const idStr = String(app.id ?? '').trim();
        const slugStr = String(app.slug ?? '').trim();
        const serialStr = String(app.serial_number ?? '').trim();
        const nameStr = String(app.name ?? '').trim();
        const existingUrl =
          (idStr && lookupInMap(ramCache, idStr)) ||
          (slugStr && lookupInMap(ramCache, slugStr)) ||
          (serialStr && lookupInMap(ramCache, serialStr)) ||
          (nameStr && lookupInMap(ramCache, nameStr));
        if (existingUrl) {
          if (idStr) setRamVaultLink(idStr, existingUrl);
          if (slugStr) setRamVaultLink(slugStr, existingUrl);
          if (serialStr) setRamVaultLink(serialStr, existingUrl);
          if (nameStr) setRamVaultLink(nameStr, existingUrl);
        }
      }

      const resolved = lookupInMap(ramCache, identifier);
      if (resolved) return resolved;

      // If Firestore returned 403/429 on chunk0, engage 60s circuit breaker
      if (chunk0Res && (chunk0Res.status === 403 || chunk0Res.status === 429 || chunk0Res.status >= 500)) {
        t3CircuitBrokenUntil = Date.now() + 60_000;
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    t3CircuitBrokenUntil = Date.now() + 60_000;
  }
  return null;
}

function collectAllTurnstileEnvValues(
  env?: Record<string, string | undefined>
): unknown[] {
  const procEnv =
    typeof process !== 'undefined' && process.env
      ? (process.env as Record<string, string | undefined>)
      : {};
  return [
    env?.VITE_TURNSTILE_SITE_KEY,
    env?.TURNSTILE_SITE_KEY,
    env?.CF_TURNSTILE_SITE_KEY,
    env?.CLOUDFLARE_TURNSTILE_SITE_KEY,
    env?.PUBLIC_TURNSTILE_SITE_KEY,
    env?.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    env?.VITE_TURNSTILE_KEY,
    env?.TURNSTILE_KEY,
    env?.CLOUDFLARE_TURNSTILE_KEY,
    env?.TURNSTILE_SECRET_KEY,
    env?.VITE_TURNSTILE_SECRET_KEY,
    env?.CF_TURNSTILE_SECRET_KEY,
    env?.CLOUDFLARE_TURNSTILE_SECRET_KEY,
    env?.TURNSTILE_SECRET,
    env?.VITE_TURNSTILE_SECRET,
    env?.CF_TURNSTILE_SECRET,
    env?.CLOUDFLARE_TURNSTILE_SECRET,
    env?.TURNSTILE_TOKEN,
    env?.VITE_TURNSTILE_TOKEN,
    env?.CF_TURNSTILE_TOKEN,
    env?.CLOUDFLARE_TURNSTILE_TOKEN,
    procEnv.VITE_TURNSTILE_SITE_KEY,
    procEnv.TURNSTILE_SITE_KEY,
    procEnv.CF_TURNSTILE_SITE_KEY,
    procEnv.CLOUDFLARE_TURNSTILE_SITE_KEY,
    procEnv.PUBLIC_TURNSTILE_SITE_KEY,
    procEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    procEnv.VITE_TURNSTILE_KEY,
    procEnv.TURNSTILE_KEY,
    procEnv.CLOUDFLARE_TURNSTILE_KEY,
    procEnv.TURNSTILE_SECRET_KEY,
    procEnv.VITE_TURNSTILE_SECRET_KEY,
    procEnv.CF_TURNSTILE_SECRET_KEY,
    procEnv.CLOUDFLARE_TURNSTILE_SECRET_KEY,
    procEnv.TURNSTILE_SECRET,
    procEnv.VITE_TURNSTILE_SECRET,
    procEnv.CF_TURNSTILE_SECRET,
    procEnv.CLOUDFLARE_TURNSTILE_SECRET,
    procEnv.TURNSTILE_TOKEN,
    procEnv.VITE_TURNSTILE_TOKEN,
    procEnv.CF_TURNSTILE_TOKEN,
    procEnv.CLOUDFLARE_TURNSTILE_TOKEN,
  ];
}

/**
 * Resolves the primary public Turnstile site key strictly from environment variables (ignoring staticData.json).
 * Used to ensure environment variable keys always override any stale key stored in database/static settings.
 */
export function getEnvOnlyTurnstileSiteKey(
  env?: Record<string, string | undefined>
): string {
  for (const c of collectAllTurnstileEnvValues(env)) {
    const clean = sanitizeKey(c);
    if (isValidTurnstileSiteKey(clean)) {
      return clean;
    }
  }
  return '';
}

/**
 * Resolves all candidate public Turnstile site keys across environment variables and Admin Settings.
 * Strictly validates the 24-character `0x4...` Site Key format so 35-character Secret Keys or 40-character
 * API Tokens are never sent to the browser, even if Site Key and Secret Key env vars were swapped.
 */
export function getCandidateTurnstileSiteKeys(
  env?: Record<string, string | undefined>
): string[] {
  const settingsSiteKey = (bundledStaticData as any)?.settings?.turnstile_site_key;
  const cachedStoreSiteKey =
    cachedTurnstileSiteKeyFromStore && Date.now() < cachedTurnstileSiteKeyFromStore.expiresAt
      ? cachedTurnstileSiteKeyFromStore.siteKey
      : '';
  const rawCandidates = [
    ...collectAllTurnstileEnvValues(env),
    cachedStoreSiteKey,
    settingsSiteKey,
  ];
  const realKeys: string[] = [];
  for (const c of rawCandidates) {
    const clean = sanitizeKey(c);
    if (isValidTurnstileSiteKey(clean)) {
      if (!realKeys.includes(clean)) {
        realKeys.push(clean);
      }
    }
  }
  return realKeys;
}

/**
 * Async variant that also checks Firestore `store_data/settings` & `public_settings` when no site key
 * is present in environment variables or `staticData.json` (e.g. on a fresh Master Clone deployment).
 */
export async function getCandidateTurnstileSiteKeysAsync(
  env?: Record<string, string | undefined>
): Promise<string[]> {
  const syncKeys = getCandidateTurnstileSiteKeys(env);
  if (syncKeys.length > 0) return syncKeys;

  const fsKeys = await fetchTurnstileKeysFromFirestoreRest(env);
  if (fsKeys?.siteKey && isValidTurnstileSiteKey(fsKeys.siteKey)) {
    return [fsKeys.siteKey];
  }
  return [];
}

/**
 * Resolves the primary public Turnstile site key from runtime environment variables or bundled/local staticData.json
 * so `/api/v1/app/session-init` can supply it to clients even when `VITE_TURNSTILE_SITE_KEY` was added
 * in Cloudflare Pages / Vercel environment settings after build time.
 */
export function getPublicTurnstileSiteKey(
  env?: Record<string, string | undefined>
): string {
  const keys = getCandidateTurnstileSiteKeys(env);
  return keys[0] || '';
}

/**
 * Resolves all candidate Cloudflare Turnstile secret keys across:
 * 1. Environment variables (auto-classified by 35-char `0x4...` Secret Key format across all Turnstile env vars)
 * 2. Sealed `ENCRYPTED_TURNSTILE_SECRET` in `src/lib/secureVault.ts` (zero-Firebase static edge resolution)
 * 3. Admin Settings `turnstile_secret_key` (from local or bundled `staticData.json`, or cached Firestore `store_data/settings`)
 */
export async function getCandidateTurnstileSecrets(
  env?: Record<string, string | undefined>
): Promise<string[]> {
  const realSecrets: string[] = [];
  const testSecrets: string[] = [];

  const addSecret = (s: unknown) => {
    const clean = sanitizeKey(s);
    if (!isValidTurnstileSecretKey(clean)) return;
    if (isTestTurnstileKey(clean)) {
      if (!testSecrets.includes(clean)) testSecrets.push(clean);
    } else {
      if (!realSecrets.includes(clean)) realSecrets.push(clean);
    }
  };

  // 1. Always check runtime environment variables FIRST so any dashboard update is active immediately
  for (const c of collectAllTurnstileEnvValues(env)) {
    addSecret(c);
  }

  // If a real secret key is explicitly configured in environment variables, return it immediately
  // so old/deleted secrets in vault or staticData never cause unnecessary fallback round-trips.
  if (realSecrets.length > 0) {
    return [...realSecrets, ...testSecrets];
  }

  // 2. Check in-memory cached secret from store/vault
  if (
    cachedTurnstileSecretFromStore &&
    cachedTurnstileSecretFromStore.secret &&
    Date.now() < cachedTurnstileSecretFromStore.expiresAt
  ) {
    addSecret(cachedTurnstileSecretFromStore.secret);
    return [...realSecrets, ...testSecrets];
  }

  // 3. Decrypt sealed ENCRYPTED_TURNSTILE_SECRET from src/lib/secureVault.ts (works on Cloudflare Edge & Node with 0 I/O)
  try {
    if (ENCRYPTED_TURNSTILE_SECRET && typeof ENCRYPTED_TURNSTILE_SECRET === 'string') {
      const decSecret = await decryptVaultValue(ENCRYPTED_TURNSTILE_SECRET, env);
      const cleanDec = sanitizeKey(decSecret);
      if (cleanDec && isValidTurnstileSecretKey(cleanDec) && !isTestTurnstileKey(cleanDec)) {
        cachedTurnstileSecretFromStore = {
          secret: cleanDec,
          expiresAt: Date.now() + 3_600_000,
        };
        addSecret(cleanDec);
      }
    }
  } catch {
    // Ignore decryption error and continue to local backup / env var
  }

  // 4. Try reading from local or bundled staticData.json
  try {
    const parsed = await loadStaticDataSnapshot();
    const sec = sanitizeKey(parsed?.settings?.turnstile_secret_key);
    if (sec && isValidTurnstileSecretKey(sec) && !isTestTurnstileKey(sec)) {
      cachedTurnstileSecretFromStore = {
        secret: sec,
        expiresAt: Date.now() + 3_600_000,
      };
      addSecret(sec);
    }
  } catch {
    // Ignore local fs errors on Edge
  }

  // 5. Try reading from Firestore REST (store_data/settings) if still empty on a clone deployment
  if (realSecrets.length === 0) {
    const fsKeys = await fetchTurnstileKeysFromFirestoreRest(env);
    if (fsKeys?.secretKey) {
      addSecret(fsKeys.secretKey);
    }
  }

  return [...realSecrets, ...testSecrets];
}

/**
 * Resolves an app identifier (ID or slug) across:
 * T0 (RAM Cache) -> T1 (ENCRYPTED_LINKS in src/lib/secureVault.ts) -> T2 (staticData.json) -> T3 (Edge REST cache-on-miss).
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

  // T2: src/lib/staticData.json (Node disk or Edge bundle)
  const t2 = await resolveFromT2Backup(cleanId, env);
  if (t2) {
    return { url: t2, tier: 'T2_BACKUP' };
  }

  // T3: Last-resort Edge REST lookup (for newly added apps on clones before GitHub vault rebuild)
  const t3 = await resolveFromT3FirestoreRest(cleanId, env);
  if (t3) {
    return { url: t3, tier: 'T4_STORE_DATA' };
  }

  return { url: null, tier: 'NONE' };
}
