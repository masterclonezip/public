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

try {
  app = getApps().length === 0 ? initializeApp(safeInitConfig) : getApp();
  try {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId || '(default)');
  } catch {
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
  }
  auth = getAuth(app);
  storage = getStorage(app);
} catch (error) {
  console.warn('[Firebase] Initialization skipped or running in offline mode:', error);
  app = {} as FirebaseApp;
  db = {} as Firestore;
  auth = {} as Auth;
  storage = {} as FirebaseStorage;
}

let hydratedPromise: Promise<boolean> | null = null;

export async function hydrateFirebaseRuntimeConfig(): Promise<boolean> {
  if (isFirebaseConfigured) return true;
  if (typeof window === 'undefined') return false;
  if (hydratedPromise) return hydratedPromise;

  hydratedPromise = (async () => {
    try {
      let data: any = null;
      try {
        const res = await fetch('/api/v1/admin/runtime-config');
        if (res.ok) data = await res.json();
      } catch (_) {}

      if (!data?.firebase?.projectId) {
        try {
          const res = await fetch('/api/v1/public/runtime-config');
          if (res.ok) data = await res.json();
        } catch (_) {}
      }

      if (data?.firebase?.projectId && data?.firebase?.apiKey) {
        firebaseConfig.projectId = data.firebase.projectId;
        firebaseConfig.apiKey = data.firebase.apiKey;
        if (data.firebase.appId) firebaseConfig.appId = data.firebase.appId;
        if (data.firebase.authDomain) firebaseConfig.authDomain = data.firebase.authDomain;
        if (data.firebase.databaseId) firebaseConfig.firestoreDatabaseId = data.firebase.databaseId;
        if (data.firebase.storageBucket) firebaseConfig.storageBucket = data.firebase.storageBucket;
        if (data.firebase.messagingSenderId) firebaseConfig.messagingSenderId = data.firebase.messagingSenderId;

        isFirebaseConfigured = true;
        isFirebaseReal = true;

        try {
          const existingApps = getApps();
          app = existingApps.length === 0 ? initializeApp(firebaseConfig) : getApp();
          try {
            db = initializeFirestore(app, {
              experimentalForceLongPolling: true,
            }, firebaseConfig.firestoreDatabaseId || '(default)');
          } catch {
            db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
          }
          auth = getAuth(app);
          storage = getStorage(app);
        } catch (initErr) {
          console.warn('[Firebase] Runtime re-init warning:', initErr);
        }

        window.dispatchEvent(new CustomEvent('firebase_runtime_hydrated', { detail: data }));
        return true;
      }
    } catch (e) {
      console.warn('[Firebase] Runtime config hydration failed:', e);
    }
    return false;
  })();

  return hydratedPromise;
}

if (typeof window !== 'undefined' && !isFirebaseConfigured) {
  setTimeout(() => {
    hydrateFirebaseRuntimeConfig();
  }, 0);
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
