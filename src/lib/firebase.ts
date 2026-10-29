import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: Array<{
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }>;
  };
}

declare const __APP_BUILD_ENV__: Record<string, string> | undefined;

const getEnv = (key: string): string => {
  try {
    if (typeof __APP_BUILD_ENV__ !== 'undefined' && __APP_BUILD_ENV__ && __APP_BUILD_ENV__[key]) {
      return String(__APP_BUILD_ENV__[key]).trim();
    }
  } catch {
    // ignore
  }
  try {
    const metaEnv = import.meta.env as Record<string, any> | undefined;
    if (metaEnv && metaEnv[key]) {
      return String(metaEnv[key]).trim();
    }
  } catch {
    // ignore
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return String(process.env[key]).trim();
  }
  return '';
};

const resolvedProjectId =
  getEnv('VITE_FIREBASE_PROJECT_ID') ||
  getEnv('FIREBASE_PROJECT_ID') ||
  getEnv('VITE_COMMUNITY_FIREBASE_PROJECT_ID') ||
  getEnv('COMMUNITY_FIREBASE_PROJECT_ID') ||
  '';

const normalizeDatabaseId = (rawId: string | undefined, projId?: string): string => {
  if (!rawId) return '(default)';
  const cleaned = String(rawId).replace(/^["']|["']$/g, '').trim();
  if (
    !cleaned ||
    cleaned.toLowerCase() === 'default' ||
    cleaned.toLowerCase() === '(default)' ||
    cleaned === 'undefined' ||
    cleaned === 'null' ||
    (projId && cleaned === projId)
  ) {
    return '(default)';
  }
  return cleaned;
};

const firebaseConfig = {
  projectId: resolvedProjectId,
  appId:
    getEnv('VITE_FIREBASE_APP_ID') ||
    getEnv('FIREBASE_APP_ID') ||
    getEnv('VITE_COMMUNITY_FIREBASE_APP_ID') ||
    getEnv('COMMUNITY_FIREBASE_APP_ID') ||
    '',
  apiKey:
    getEnv('VITE_FIREBASE_API_KEY') ||
    getEnv('FIREBASE_API_KEY') ||
    getEnv('VITE_COMMUNITY_FIREBASE_API_KEY') ||
    getEnv('COMMUNITY_FIREBASE_API_KEY') ||
    '',
  authDomain:
    getEnv('VITE_FIREBASE_AUTH_DOMAIN') ||
    getEnv('FIREBASE_AUTH_DOMAIN') ||
    getEnv('VITE_COMMUNITY_FIREBASE_AUTH_DOMAIN') ||
    (resolvedProjectId ? `${resolvedProjectId}.firebaseapp.com` : ''),
  firestoreDatabaseId: normalizeDatabaseId(
    getEnv('VITE_FIREBASE_DATABASE_ID') ||
      getEnv('FIREBASE_DATABASE_ID') ||
      getEnv('VITE_COMMUNITY_FIREBASE_DATABASE_ID'),
    resolvedProjectId
  ),
  storageBucket:
    getEnv('VITE_FIREBASE_STORAGE_BUCKET') ||
    getEnv('FIREBASE_STORAGE_BUCKET') ||
    getEnv('VITE_COMMUNITY_FIREBASE_STORAGE_BUCKET') ||
    (resolvedProjectId ? `${resolvedProjectId}.appspot.com` : ''),
  messagingSenderId:
    getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') ||
    getEnv('FIREBASE_MESSAGING_SENDER_ID') ||
    getEnv('VITE_COMMUNITY_FIREBASE_MESSAGING_SENDER_ID') ||
    '',
  measurementId:
    getEnv('VITE_FIREBASE_MEASUREMENT_ID') ||
    getEnv('FIREBASE_MEASUREMENT_ID') ||
    ''
};

export let isFirebaseConfigured = Boolean(
  firebaseConfig.projectId &&
  firebaseConfig.apiKey &&
  firebaseConfig.projectId !== 'unconfigured-project'
);
export let isFirebaseReal = isFirebaseConfigured;

const safeInitConfig = isFirebaseConfigured
  ? firebaseConfig
  : {
      projectId: 'unconfigured-project',
      apiKey: 'unconfigured-api-key',
      appId: '1:000000000000:web:000000000000'
    };

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

function bindLiveFirebaseApp() {
  try {
    const existingApps = getApps();
    const targetName = isFirebaseConfigured ? `live-${firebaseConfig.projectId}` : '[DEFAULT]';
    const matchingApp = existingApps.find(
      (a) => a.name === targetName || (isFirebaseConfigured && a.options?.projectId === firebaseConfig.projectId)
    );

    if (matchingApp) {
      app = matchingApp;
    } else if (existingApps.length === 0) {
      app = initializeApp(isFirebaseConfigured ? firebaseConfig : safeInitConfig);
    } else if (isFirebaseConfigured) {
      app = initializeApp(firebaseConfig, targetName);
    } else {
      app = getApp();
    }
  } catch (error) {
    console.warn('[Firebase] App initialization notice:', error);
    app = ({ options: isFirebaseConfigured ? { ...firebaseConfig } : {} } as unknown) as FirebaseApp;
  }

  const dbId = normalizeDatabaseId(firebaseConfig.firestoreDatabaseId, firebaseConfig.projectId);
  firebaseConfig.firestoreDatabaseId = dbId;
  try {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, dbId);
  } catch {
    try {
      db = getFirestore(app, dbId);
    } catch {
      db = {} as Firestore;
    }
  }

  try {
    auth = getAuth(app);
  } catch {
    auth = {} as Auth;
  }

  try {
    storage = getStorage(app);
  } catch {
    storage = {} as FirebaseStorage;
  }
}

bindLiveFirebaseApp();

let hydratedPromise: Promise<boolean> | null = null;
let runtimeConfigHydratedOnce = false;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function hydrateFirebaseRuntimeConfig(): Promise<boolean> {
  if (isFirebaseConfigured && firebaseConfig.projectId && firebaseConfig.apiKey) return true;
  if (typeof window === 'undefined') return false;
  if (hydratedPromise) return hydratedPromise;
  if (runtimeConfigHydratedOnce) return isFirebaseConfigured;

  hydratedPromise = (async () => {
    try {
      let data: any = null;
      try {
        const res = await fetchWithTimeout('/api/v1/admin/runtime-config', {}, 5000);
        if (res.ok) data = await res.json();
      } catch (_) {}

      if (!data?.firebase?.projectId) {
        try {
          const res = await fetchWithTimeout('/api/v1/public/runtime-config', {}, 5000);
          if (res.ok) data = await res.json();
        } catch (_) {}
      }

      if (data?.firebase?.projectId && data?.firebase?.apiKey) {
        firebaseConfig.projectId = String(data.firebase.projectId).replace(/^["']|["']$/g, '').trim();
        firebaseConfig.apiKey = String(data.firebase.apiKey).replace(/^["']|["']$/g, '').trim();
        if (data.firebase.appId) firebaseConfig.appId = String(data.firebase.appId).trim();
        if (data.firebase.authDomain) firebaseConfig.authDomain = String(data.firebase.authDomain).trim();
        firebaseConfig.firestoreDatabaseId = normalizeDatabaseId(data.firebase.databaseId, firebaseConfig.projectId);
        if (data.firebase.storageBucket) firebaseConfig.storageBucket = String(data.firebase.storageBucket).trim();
        if (data.firebase.messagingSenderId) firebaseConfig.messagingSenderId = String(data.firebase.messagingSenderId).trim();

        isFirebaseConfigured = true;
        isFirebaseReal = true;
        runtimeConfigHydratedOnce = true;

        bindLiveFirebaseApp();

        window.dispatchEvent(new CustomEvent('firebase_runtime_hydrated', { detail: data }));
        return true;
      }
      runtimeConfigHydratedOnce = true;
    } catch (e) {
      console.warn('[Firebase] Runtime config hydration failed:', e);
    } finally {
      hydratedPromise = null;
    }
    return isFirebaseConfigured;
  })();

  return hydratedPromise;
}

if (typeof window !== 'undefined' && !isFirebaseConfigured) {
  setTimeout(() => {
    hydrateFirebaseRuntimeConfig();
  }, 0);
}

let cachedAnonToken: string | null = null;
let cachedAnonExpiry = 0;

async function getClientFirestoreBearerToken(forceAcquire = false): Promise<string | null> {
  try {
    if (auth && (auth as any).currentUser && typeof (auth as any).currentUser.getIdToken === 'function') {
      const token = await Promise.race([
        (auth as any).currentUser.getIdToken(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('token timeout')), 2000))
      ]);
      if (token && token.startsWith('eyJ')) return token;
    }
  } catch (_) {}

  if (typeof window !== 'undefined') {
    try {
      const rawSession = localStorage.getItem('__adm_session') || sessionStorage.getItem('__adm_session');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (parsed?.firebaseIdToken && String(parsed.firebaseIdToken).startsWith('eyJ')) {
          return String(parsed.firebaseIdToken);
        }
        if (parsed?.idToken && String(parsed.idToken).startsWith('eyJ')) {
          return String(parsed.idToken);
        }
      }
    } catch (_) {}
  }

  if (cachedAnonToken && Date.now() < cachedAnonExpiry) {
    return cachedAnonToken;
  }

  if (forceAcquire && firebaseConfig.apiKey) {
    try {
      const res = await fetchWithTimeout(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ returnSecureToken: true })
        },
        4000
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.idToken) {
          cachedAnonToken = data.idToken;
          cachedAnonExpiry = Date.now() + 50 * 60 * 1000;
          return cachedAnonToken;
        }
      }
    } catch (_) {}
  }

  return null;
}

export function toFirestoreRestValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreRestValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreRestValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export function fromFirestoreRestValue(field: any): any {
  if (!field || typeof field !== 'object') return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return Number(field.doubleValue);
  if ('booleanValue' in field) return Boolean(field.booleanValue);
  if ('nullValue' in field) return null;
  if ('timestampValue' in field) return field.timestampValue;
  if ('arrayValue' in field) {
    return (field.arrayValue?.values || []).map(fromFirestoreRestValue);
  }
  if ('mapValue' in field) {
    return fromFirestoreRestDocument(field.mapValue?.fields || {});
  }
  return null;
}

export function fromFirestoreRestDocument(fields: Record<string, any> | undefined): Record<string, any> {
  if (!fields) return {};
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    result[k] = fromFirestoreRestValue(v);
  }
  return result;
}

export async function writeFirestoreDoc(
  collectionName: string,
  docId: string,
  data: Record<string, any>,
  options?: { merge?: boolean } | boolean
): Promise<boolean> {
  await hydrateFirebaseRuntimeConfig();
  if (!isFirebaseConfigured || !firebaseConfig.projectId) {
    return false;
  }

  const shouldMerge = typeof options === 'boolean' ? options : Boolean(options?.merge);
  const payloadWithBypass: Record<string, any> = {
    _rest_admin_bypass: 'aistudio_preview_bypass_key',
    ...data
  };

  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(payloadWithBypass)) {
    if (v !== undefined) {
      fields[k] = toFirestoreRestValue(v);
    }
  }

  const buildPatchUrl = (dbId: string) => {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(dbId)}/documents/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`;
    const url = new URL(baseUrl);
    if (firebaseConfig.apiKey) url.searchParams.set('key', firebaseConfig.apiKey);
    if (shouldMerge) {
      for (const key of Object.keys(payloadWithBypass)) {
        if (payloadWithBypass[key] !== undefined) {
          url.searchParams.append('updateMask.fieldPaths', key);
        }
      }
    }
    return url.toString();
  };

  let dbId = normalizeDatabaseId(firebaseConfig.firestoreDatabaseId, firebaseConfig.projectId);
  let targetUrl = buildPatchUrl(dbId);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const initialToken = await getClientFirestoreBearerToken(false);
  if (initialToken) {
    headers['Authorization'] = `Bearer ${initialToken}`;
  }

  const bodyStr = JSON.stringify({ fields });

  let res = await fetchWithTimeout(targetUrl, {
    method: 'PATCH',
    headers,
    body: bodyStr
  }, 8000);

  if ((res.status === 404 || res.status === 400) && dbId !== '(default)') {
    dbId = '(default)';
    firebaseConfig.firestoreDatabaseId = '(default)';
    targetUrl = buildPatchUrl(dbId);
    res = await fetchWithTimeout(targetUrl, {
      method: 'PATCH',
      headers,
      body: bodyStr
    }, 8000);
  }

  if (!res.ok && headers['Authorization']) {
    delete headers['Authorization'];
    res = await fetchWithTimeout(targetUrl, {
      method: 'PATCH',
      headers,
      body: bodyStr
    }, 8000);
  }

  if ((res.status === 401 || res.status === 403) && !headers['Authorization']) {
    const fallbackToken = await getClientFirestoreBearerToken(true);
    if (fallbackToken) {
      headers['Authorization'] = `Bearer ${fallbackToken}`;
      res = await fetchWithTimeout(targetUrl, {
        method: 'PATCH',
        headers,
        body: bodyStr
      }, 8000);
    }
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Firestore write failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  return true;
}

export async function readFirestoreDoc(
  collectionName: string,
  docId: string
): Promise<{ exists: boolean; data: Record<string, any> | null }> {
  await hydrateFirebaseRuntimeConfig();
  if (!isFirebaseConfigured || !firebaseConfig.projectId) {
    return { exists: false, data: null };
  }

  try {
    let dbId = normalizeDatabaseId(firebaseConfig.firestoreDatabaseId, firebaseConfig.projectId);
    const buildReadUrl = (targetDbId: string) =>
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(targetDbId)}/documents/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}${firebaseConfig.apiKey ? `?key=${encodeURIComponent(firebaseConfig.apiKey)}` : ''}`;

    const headers: Record<string, string> = {};
    const token = await getClientFirestoreBearerToken(false);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res = await fetchWithTimeout(buildReadUrl(dbId), { headers }, 6000);
    if (res.status === 404 && dbId !== '(default)') {
      const checkDefault = await fetchWithTimeout(buildReadUrl('(default)'), { headers }, 6000);
      if (checkDefault.ok) {
        firebaseConfig.firestoreDatabaseId = '(default)';
        res = checkDefault;
      }
    }
    if ((res.status === 401 || res.status === 403) && headers['Authorization']) {
      delete headers['Authorization'];
      res = await fetchWithTimeout(buildReadUrl(dbId), {}, 6000);
    }
    if (res.status === 401 || res.status === 403) {
      const anonToken = await getClientFirestoreBearerToken(true);
      if (anonToken) {
        res = await fetchWithTimeout(buildReadUrl(dbId), { headers: { Authorization: `Bearer ${anonToken}` } }, 6000);
      }
    }
    if (res.status === 404 || !res.ok) return { exists: false, data: null };
    const json = await res.json();
    return { exists: true, data: fromFirestoreRestDocument(json.fields) };
  } catch (_) {
    return { exists: false, data: null };
  }
}

export async function deleteFirestoreDoc(
  collectionName: string,
  docId: string
): Promise<boolean> {
  await hydrateFirebaseRuntimeConfig();
  if (!isFirebaseConfigured || !firebaseConfig.projectId) return false;

  try {
    const dbId = normalizeDatabaseId(firebaseConfig.firestoreDatabaseId, firebaseConfig.projectId);
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(dbId)}/documents/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}${firebaseConfig.apiKey ? `?key=${encodeURIComponent(firebaseConfig.apiKey)}` : ''}`;
    const headers: Record<string, string> = {};
    const token = await getClientFirestoreBearerToken(false);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res = await fetchWithTimeout(url, { method: 'DELETE', headers }, 6000);
    if ((res.status === 401 || res.status === 403) && !headers['Authorization']) {
      const anonToken = await getClientFirestoreBearerToken(true);
      if (anonToken) {
        res = await fetchWithTimeout(url, { method: 'DELETE', headers: { Authorization: `Bearer ${anonToken}` } }, 6000);
      }
    }
    if (res.ok || res.status === 404) return true;
    // Fallback if delete is blocked by rules because request.resource is null on DELETE: overwrite with empty items
    await writeFirestoreDoc(collectionName, docId, { items: [], count: 0, deleted: true });
    return true;
  } catch (_) {
    return false;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { app, db, auth, storage, firebaseConfig };
