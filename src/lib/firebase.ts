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
  firestoreDatabaseId:
    getEnv('VITE_FIREBASE_DATABASE_ID') ||
    getEnv('FIREBASE_DATABASE_ID') ||
    getEnv('VITE_COMMUNITY_FIREBASE_DATABASE_ID') ||
    '(default)',
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

  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
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
  if (runtimeConfigHydratedOnce) return isFirebaseConfigured;
  if (typeof window === 'undefined') return false;
  if (hydratedPromise) return hydratedPromise;

  hydratedPromise = (async () => {
    runtimeConfigHydratedOnce = true;
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
        const prevProjectId = firebaseConfig.projectId;
        firebaseConfig.projectId = data.firebase.projectId;
        firebaseConfig.apiKey = data.firebase.apiKey;
        if (data.firebase.appId) firebaseConfig.appId = data.firebase.appId;
        if (data.firebase.authDomain) firebaseConfig.authDomain = data.firebase.authDomain;
        if (data.firebase.databaseId) firebaseConfig.firestoreDatabaseId = data.firebase.databaseId;
        if (data.firebase.storageBucket) firebaseConfig.storageBucket = data.firebase.storageBucket;
        if (data.firebase.messagingSenderId) firebaseConfig.messagingSenderId = data.firebase.messagingSenderId;

        isFirebaseConfigured = true;
        isFirebaseReal = true;

        bindLiveFirebaseApp();

        window.dispatchEvent(new CustomEvent('firebase_runtime_hydrated', { detail: data }));
        return true;
      }
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
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(dbId)}/documents/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`;
  const url = new URL(baseUrl);
  if (firebaseConfig.apiKey) url.searchParams.set('key', firebaseConfig.apiKey);

  if (shouldMerge) {
    for (const key of Object.keys(data)) {
      if (data[key] !== undefined) {
        url.searchParams.append('updateMask.fieldPaths', key);
      }
    }
  }

  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      fields[k] = toFirestoreRestValue(v);
    }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    if (auth && (auth as any).currentUser && typeof (auth as any).currentUser.getIdToken === 'function') {
      const token = await Promise.race([
        (auth as any).currentUser.getIdToken(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('token timeout')), 2000))
      ]);
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (_) {}

  let res = await fetchWithTimeout(url.toString(), {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields })
  }, 8000);

  if (!res.ok && headers['Authorization']) {
    delete headers['Authorization'];
    res = await fetchWithTimeout(url.toString(), {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields })
    }, 8000);
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
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(dbId)}/documents/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}${firebaseConfig.apiKey ? `?key=${encodeURIComponent(firebaseConfig.apiKey)}` : ''}`;
    const res = await fetchWithTimeout(url, {}, 6000);
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
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(dbId)}/documents/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}${firebaseConfig.apiKey ? `?key=${encodeURIComponent(firebaseConfig.apiKey)}` : ''}`;
    const res = await fetchWithTimeout(url, { method: 'DELETE' }, 6000);
    return res.ok || res.status === 404;
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
