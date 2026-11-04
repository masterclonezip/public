const getEnv = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return String(process.env[key]).trim();
  }
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
      return String((import.meta as any).env[key]).trim();
    }
  } catch {
    // ignore
  }
  return '';
};

export function getRawFirebaseConfig() {
  const projectId = (
    getEnv('VITE_FIREBASE_PROJECT_ID') ||
    getEnv('FIREBASE_PROJECT_ID') ||
    ''
  ).replace(/^["']|["']$/g, '').trim();

  const apiKey = (
    getEnv('VITE_FIREBASE_API_KEY') ||
    getEnv('FIREBASE_API_KEY') ||
    ''
  ).replace(/^["']|["']$/g, '').trim();

  const firestoreDatabaseId = (
    getEnv('VITE_FIREBASE_DATABASE_ID') ||
    getEnv('FIREBASE_DATABASE_ID') ||
    '(default)'
  ).replace(/^["']|["']$/g, '').trim();

  return {
    projectId,
    apiKey,
    appId: getEnv('VITE_FIREBASE_APP_ID') || getEnv('FIREBASE_APP_ID') || '',
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || getEnv('FIREBASE_AUTH_DOMAIN') || (projectId ? `${projectId}.firebaseapp.com` : ''),
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || getEnv('FIREBASE_STORAGE_BUCKET') || (projectId ? `${projectId}.firebasestorage.app` : ''),
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || getEnv('FIREBASE_MESSAGING_SENDER_ID') || '',
    measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID') || getEnv('FIREBASE_MEASUREMENT_ID') || '',
    firestoreDatabaseId,
    databaseId: firestoreDatabaseId,
  };
}

export function getSafeFirebaseConfig() {
  return getRawFirebaseConfig();
}

export const firebaseConfig = getRawFirebaseConfig();

export function parseFirestoreDoc(fields: any): any {
  if (!fields || typeof fields !== 'object') return {};
  const result: any = {};
  for (const [k, v] of Object.entries(fields)) {
    result[k] = parseValue(v);
  }
  return result;
}

function parseValue(val: any): any {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    const values = val.arrayValue?.values;
    return Array.isArray(values) ? values.map(parseValue) : [];
  }
  if ('mapValue' in val) {
    return parseFirestoreDoc(val.mapValue?.fields || {});
  }
  return val;
}
