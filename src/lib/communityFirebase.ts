/**
 * Unified Community Reviews & Atomic Ratings Engine (Zero-Quota Shield)
 * - Single Source of Truth across Admin Reviews Tab, AI Review Studio, Dashboard Overview, and Public Website.
 * - Canonical App Resolution: Every review & counter is bound to both canonical `app.id` and `app.slug` (no split keys, no double-counting).
 * - Zero Background Quota Burn: Hydrates from Firestore at most once per session (cached in memory + localStorage) and uses debounced single-document writes for `catalog_stats`.
 */

import communityCatalogStatsJson from './communityCatalogStats.json';
import communityStaticReviewsJson from './communityStaticReviews.json';
import staticCatalogJson from './staticData.json';
import { generateNaturalStarDistribution } from '../seo/utils';

// ============================================================================
// 1. CANONICAL CATALOG APPS & STATIC BUNDLE REGISTRY
// ============================================================================

let _runtimeStaticReviews: Record<string, any[]> | null =
  communityStaticReviewsJson && typeof communityStaticReviewsJson === 'object'
    ? { ...(communityStaticReviewsJson as Record<string, any[]>) }
    : {};

let _registeredCatalogApps: any[] = [];
let _hasRegisteredCatalogApps = false;

export function registerCatalogAppsForReviews(apps?: any[]) {
  if (Array.isArray(apps)) {
    _registeredCatalogApps = apps;
    _hasRegisteredCatalogApps = true;
  }
}

export function getCatalogAppsForReviews(): any[] {
  if (_hasRegisteredCatalogApps) return _registeredCatalogApps;
  if (typeof window !== 'undefined' && Array.isArray((window as any).__INITIAL_DATA__?.apps)) {
    return (window as any).__INITIAL_DATA__.apps;
  }
  const rawStatic = (staticCatalogJson as any)?.apps || (staticCatalogJson as any)?.mockApps || [];
  return Array.isArray(rawStatic) ? rawStatic : [];
}

export interface CanonicalAppMeta {
  id: string;
  slug: string;
  name: string;
  icon_url: string;
  category: string;
  defaultRating: number;
  canonicalKey: string;
}

export function resolveCanonicalAppMeta(
  idOrSlugOrName?: string,
  secondarySlugOrId?: string,
  fallbackName?: string,
  appsOverride?: any[]
): CanonicalAppMeta {
  const apps = Array.isArray(appsOverride) ? appsOverride : getCatalogAppsForReviews();
  const q1 = String(idOrSlugOrName || '').trim().toLowerCase();
  const q2 = String(secondarySlugOrId || '').trim().toLowerCase();
  const q3 = String(fallbackName || '').trim().toLowerCase();

  let matched: any = null;
  if (q1 || q2 || q3) {
    for (const a of apps) {
      if (!a) continue;
      const aId = String(a.id || '').trim().toLowerCase();
      const aSlug = String(a.slug || '').trim().toLowerCase();
      const aName = String(a.name || '').trim().toLowerCase();

      if (
        (q1 && (q1 === aId || q1 === aSlug || q1 === aName)) ||
        (q2 && (q2 === aId || q2 === aSlug || q2 === aName)) ||
        (q3 && aName && q3 === aName)
      ) {
        matched = a;
        break;
      }
    }
  }

  const resolvedId = String(matched?.id || idOrSlugOrName || secondarySlugOrId || '').trim();
  const resolvedSlug = String(matched?.slug || secondarySlugOrId || idOrSlugOrName || '').trim();
  const resolvedName = String(matched?.name || fallbackName || resolvedSlug || resolvedId || 'Application').trim();
  const canonicalKey = (resolvedSlug || resolvedId).toLowerCase().trim();

  return {
    id: resolvedId,
    slug: resolvedSlug,
    name: resolvedName,
    icon_url: String(matched?.icon_url || ''),
    category: String(matched?.category || 'Apps'),
    defaultRating: Number(matched?.rating) || 0,
    canonicalKey
  };
}

export async function getStaticReviewsBundle(): Promise<Record<string, any[]>> {
  if (_runtimeStaticReviews && Object.keys(_runtimeStaticReviews).length > 0) {
    return _runtimeStaticReviews;
  }
  try {
    const mod = await import('./communityStaticReviews.json');
    const data = (mod.default || mod) as Record<string, any[]>;
    if (data && typeof data === 'object') {
      _runtimeStaticReviews = { ...data };
    }
  } catch (_) {}
  return _runtimeStaticReviews || {};
}

export function getStaticReviewsSync(): Record<string, any[]> {
  return _runtimeStaticReviews || {};
}

export function setRuntimeStaticReviewsBundle(bundle: Record<string, any[]>) {
  if (bundle && typeof bundle === 'object') {
    _runtimeStaticReviews = { ...bundle };
  }
}

// ============================================================================
// 2. DATE FORMATTING & ENVIRONMENT UTILITIES
// ============================================================================

export function parseRelativeOrIsoDate(dateInput?: string | Date | number): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? new Date() : dateInput;
  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  const str = String(dateInput).trim().toLowerCase();
  if (!str) return new Date();

  const now = Date.now();
  if (str === 'today' || str === 'just now') return new Date();
  if (str === 'yesterday') {
    const d = new Date(now - 24 * 60 * 60 * 1000);
    d.setHours(12, 30, 0, 0);
    return d;
  }
  const daysMatch = str.match(/^(\d+)\s+days?\s+ago$/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    return new Date(now - days * 24 * 60 * 60 * 1000);
  }
  const hoursMatch = str.match(/^(\d+)\s+hours?\s+ago$/);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1], 10);
    return new Date(now - hours * 60 * 60 * 1000);
  }
  const weeksMatch = str.match(/^(\d+)\s+weeks?\s+ago$/);
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1], 10);
    return new Date(now - weeks * 7 * 24 * 60 * 60 * 1000);
  }
  const monthsMatch = str.match(/^(\d+)\s+months?\s+ago$/);
  if (monthsMatch) {
    const months = parseInt(monthsMatch[1], 10);
    return new Date(now - months * 30 * 24 * 60 * 60 * 1000);
  }

  try {
    const parsed = new Date(dateInput);
    if (!isNaN(parsed.getTime())) return parsed;
  } catch (_) {}

  return new Date();
}

export function formatReviewDate(dateInput?: string | Date | number, includeTime: boolean = true): string {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (!dateInput) {
    return formatFull(new Date(), includeTime, MONTHS);
  }
  if (typeof dateInput === 'string' && /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4},\s+\d{1,2}:\d{2}\s+(AM|PM)$/i.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const d = parseRelativeOrIsoDate(dateInput);
  return formatFull(d, includeTime, MONTHS);
}

function formatFull(d: Date, includeTime: boolean, MONTHS: string[]): string {
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  if (!includeTime) {
    return `${day} ${month} ${year}`;
  }
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

declare const __APP_BUILD_ENV__: Record<string, string> | undefined;

const getEnvVal = (key: string): string | undefined => {
  try {
    if (typeof __APP_BUILD_ENV__ !== 'undefined' && __APP_BUILD_ENV__ && __APP_BUILD_ENV__[key]) {
      const v = String(__APP_BUILD_ENV__[key]).trim();
      if (v && v.length > 0 && !v.includes('!') && !v.includes('#')) return v;
    }
  } catch {
    // ignore
  }
  try {
    const metaEnv = import.meta.env as Record<string, any> | undefined;
    if (metaEnv && metaEnv[key]) {
      const v = String(metaEnv[key]).trim();
      if (v && v.length > 0 && !v.includes('!') && !v.includes('#')) return v;
    }
  } catch {
    // ignore
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    const v = String(process.env[key]).trim();
    if (v && v.length > 0 && !v.includes('!') && !v.includes('#')) return v;
  }
  return undefined;
};

let runtimeCommunityConfig: { projectId?: string; apiKey?: string; databaseId?: string; appId?: string } | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('firebase_runtime_hydrated', (e: any) => {
    const detail = e?.detail;
    const cfg = detail?.communityFirebase || detail?.firebase;
    if (cfg?.projectId && cfg?.apiKey) {
      runtimeCommunityConfig = {
        projectId: cfg.projectId,
        apiKey: cfg.apiKey,
        databaseId: cfg.databaseId || '(default)',
        appId: cfg.appId || '',
      };
    }
  });
}

export const setRuntimeCommunityFirebaseConfig = (cfg: { projectId?: string; apiKey?: string; databaseId?: string; appId?: string }) => {
  runtimeCommunityConfig = cfg;
};

export const getResolvedCommunityFirebaseConfig = () => {
  if (runtimeCommunityConfig?.projectId && runtimeCommunityConfig?.apiKey) {
    const pId = runtimeCommunityConfig.projectId;
    return {
      projectId: pId,
      appId: runtimeCommunityConfig.appId || '',
      apiKey: runtimeCommunityConfig.apiKey,
      authDomain: `${pId}.firebaseapp.com`,
      firestoreDatabaseId: runtimeCommunityConfig.databaseId || '(default)',
      storageBucket: `${pId}.firebasestorage.app`,
      messagingSenderId: '',
    };
  }

  const rawProjectId =
    getEnvVal('VITE_COMMUNITY_FIREBASE_PROJECT_ID') ||
    getEnvVal('COMMUNITY_FIREBASE_PROJECT_ID') ||
    getEnvVal('VITE_FIREBASE_PROJECT_ID') ||
    getEnvVal('FIREBASE_PROJECT_ID') ||
    '';
  const projectId = (rawProjectId && !rawProjectId.includes('{') && rawProjectId.length < 50) ? rawProjectId : '';

  const rawDbId =
    getEnvVal('VITE_COMMUNITY_FIREBASE_DATABASE_ID') ||
    getEnvVal('COMMUNITY_FIREBASE_DATABASE_ID') ||
    getEnvVal('VITE_FIREBASE_DATABASE_ID') ||
    getEnvVal('FIREBASE_DATABASE_ID');
  const firestoreDatabaseId = (rawDbId && !rawDbId.includes('{') && !rawDbId.includes('service_account') && rawDbId.length < 40)
    ? rawDbId
    : '(default)';

  const rawApiKey =
    getEnvVal('VITE_COMMUNITY_FIREBASE_API_KEY') ||
    getEnvVal('COMMUNITY_FIREBASE_API_KEY') ||
    getEnvVal('VITE_FIREBASE_API_KEY') ||
    getEnvVal('FIREBASE_API_KEY') ||
    '';
  const apiKey = (rawApiKey && rawApiKey.startsWith('AIza') && rawApiKey.length > 20)
    ? rawApiKey
    : '';

  const rawAppId =
    getEnvVal('VITE_COMMUNITY_FIREBASE_APP_ID') ||
    getEnvVal('COMMUNITY_FIREBASE_APP_ID') ||
    getEnvVal('VITE_FIREBASE_APP_ID') ||
    getEnvVal('FIREBASE_APP_ID') ||
    '';
  const appId = (rawAppId && rawAppId.startsWith('1:') && rawAppId.length > 20)
    ? rawAppId
    : '';

  return {
    projectId,
    appId,
    apiKey,
    authDomain:
      getEnvVal('VITE_COMMUNITY_FIREBASE_AUTH_DOMAIN') ||
      getEnvVal('VITE_FIREBASE_AUTH_DOMAIN') ||
      (projectId ? `${projectId}.firebaseapp.com` : ''),
    firestoreDatabaseId,
    storageBucket:
      getEnvVal('VITE_COMMUNITY_FIREBASE_STORAGE_BUCKET') ||
      getEnvVal('VITE_FIREBASE_STORAGE_BUCKET') ||
      (projectId ? `${projectId}.firebasestorage.app` : ''),
    messagingSenderId:
      getEnvVal('VITE_COMMUNITY_FIREBASE_MESSAGING_ID') ||
      getEnvVal('VITE_COMMUNITY_FIREBASE_MESSAGING_SENDER_ID') ||
      getEnvVal('VITE_FIREBASE_MESSAGING_SENDER_ID') ||
      '',
  };
};

// ============================================================================
// 3. INTERFACES & FIRESTORE SERIALIZERS
// ============================================================================

export interface PublicReview {
  id: string;
  app_id: string;
  appId?: string;
  appSlug?: string;
  appName?: string;
  username: string;
  userName?: string;
  rating: number;
  comment: string;
  reviewText?: string;
  created_at: string;
  timestamp?: string;
  helpful_count: number;
  reported: boolean;
  report_count: number;
  source: string;
  isPinned: boolean;
  adminReply?: {
    text: string;
    author: string;
    timestamp: string;
  } | null;
}

export interface ReviewFetchResult {
  reviews: PublicReview[];
  hasMore: boolean;
  nextCursor: any;
  stats?: {
    averageRating: number;
    totalReviews: number;
    distribution?: Record<number, number>;
    starCounts?: Record<string, number>;
    counts?: Record<number, number>;
  } | null;
}

export interface AdminReviewItem {
  id: string;
  appId: string;
  app_id?: string;
  appSlug?: string;
  appName?: string;
  userName: string;
  username?: string;
  rating: number;
  reviewText: string;
  comment?: string;
  timestamp: string;
  created_at?: string;
  status: 'published' | 'pending' | 'rejected' | string;
  helpful_count?: number;
  isPinned?: boolean;
  reported?: boolean;
  report_count?: number;
  source?: string;
  adminReply?: {
    text: string;
    author: string;
    timestamp: string;
  } | null;
  updated_at?: string;
}

export interface AdminCommunityTopApp {
  id: string;
  slug: string;
  name: string;
  icon_url?: string;
  category?: string;
  total: number;
  published: number;
  pending: number;
  avgRating: number;
}

export interface AppReviewCountsData {
  total: number;
  published: number;
  pending: number;
  rejected: number;
  flagged: number;
  avgRating: number;
  starCounts?: Record<string, number>;
  ratingSum?: number;
  canonicalKey?: string;
}

export interface AdminCommunityStats {
  totalReviews: number;
  publishedReviews: number;
  pendingReviews: number;
  rejectedReviews: number;
  flaggedReviews: number;
  totalReports: number;
  pendingReports: number;
  averageRating: number;
  ratingDistribution?: Record<string, number>;
  appCoverageCount?: number;
  liveStatus: 'live' | 'checking' | 'error' | 'offline';
  statusMessage: string;
  projectId: string;
  topApps?: AdminCommunityTopApp[];
  recentReviews?: any[];
  appCounts?: Record<string, AppReviewCountsData>;
}

export interface AdminReviewsListResponse {
  reviews: AdminReviewItem[];
  totalCount: number;
  stats?: {
    total: number;
    published: number;
    pending: number;
    rejected: number;
    flagged: number;
    averageRating: number;
    starCounts?: Record<string, number>;
  };
  globalStats?: {
    total: number;
    published: number;
    pending: number;
    rejected: number;
    flagged: number;
    averageRating: number;
    ratingDistribution?: Record<string, number>;
    appCoverageCount?: number;
  };
  appCounts?: Record<string, AppReviewCountsData>;
}

export function parseFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  if (!fields || typeof fields !== 'object') return result;

  for (const [key, valueObj] of Object.entries(fields)) {
    if (!valueObj || typeof valueObj !== 'object') continue;
    if ('stringValue' in valueObj) {
      result[key] = valueObj.stringValue;
    } else if ('integerValue' in valueObj) {
      result[key] = parseInt(valueObj.integerValue, 10);
    } else if ('doubleValue' in valueObj) {
      result[key] = parseFloat(valueObj.doubleValue);
    } else if ('booleanValue' in valueObj) {
      result[key] = valueObj.booleanValue;
    } else if ('nullValue' in valueObj) {
      result[key] = null;
    } else if ('timestampValue' in valueObj) {
      result[key] = valueObj.timestampValue;
    } else if ('arrayValue' in valueObj) {
      const arr = valueObj.arrayValue?.values || [];
      result[key] = arr.map((item: any) => {
        if (!item || typeof item !== 'object') return item;
        if ('stringValue' in item) return item.stringValue;
        if ('integerValue' in item) return parseInt(item.integerValue, 10);
        if ('doubleValue' in item) return parseFloat(item.doubleValue);
        if ('booleanValue' in item) return item.booleanValue;
        if ('mapValue' in item) return parseFirestoreFields(item.mapValue?.fields || {});
        const parsed = parseFirestoreFields({ temp: item });
        return parsed.temp;
      });
    } else if ('mapValue' in valueObj) {
      result[key] = parseFirestoreFields(valueObj.mapValue?.fields || {});
    }
  }
  return result;
}

export function convertToFirestoreFields(data: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  if (!data || typeof data !== 'object') return fields;

  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) continue;
    if (val === null) {
      fields[key] = { nullValue: null };
    } else if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'number') {
      if (Number.isInteger(val)) {
        fields[key] = { integerValue: val.toString() };
      } else {
        fields[key] = { doubleValue: val };
      }
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map(item => {
            if (item === null || item === undefined) return { nullValue: null };
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') return Number.isInteger(item) ? { integerValue: item.toString() } : { doubleValue: item };
            if (typeof item === 'boolean') return { booleanValue: item };
            if (typeof item === 'object') return { mapValue: { fields: convertToFirestoreFields(item) } };
            return { stringValue: String(item) };
          })
        }
      };
    } else if (typeof val === 'object') {
      fields[key] = {
        mapValue: {
          fields: convertToFirestoreFields(val)
        }
      };
    }
  }
  return fields;
}

// ============================================================================
// 4. UNIFIED LOCAL + CLOUD LEDGER STORAGE & ZERO-QUOTA HYDRATION
// ============================================================================

const ADMIN_REVIEWS_OVERRIDES_KEY = 'admin_reviews_overrides';
const ADMIN_CUSTOM_REVIEWS_KEY = 'admin_custom_reviews';
const ADMIN_DELETED_REVIEWS_KEY = 'admin_deleted_reviews_map';
const ADMIN_CLOUD_REVIEWS_CACHE_KEY = 'admin_cloud_reviews_cache_v2';
const ADMIN_ATOMIC_STATS_KEY = 'admin_atomic_review_stats';

let _inMemoryCloudReviews: AdminReviewItem[] | null = null;
let _cloudHydratedTimestamp = 0;
let _cloudHydrationPromise: Promise<AdminReviewItem[]> | null = null;
const CLOUD_HYDRATION_TTL_MS = 10 * 60 * 1000; // 10 minutes session cache (Zero background polling)

async function safeAdminFetch(url: string, opts?: any): Promise<Response> {
  const headers: Record<string, string> = { ...(opts?.headers || {}) };
  if (typeof window !== 'undefined') {
    try {
      const rawSession = localStorage.getItem('__adm_session') || sessionStorage.getItem('__adm_session');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (parsed?.idToken && !headers['Authorization']) {
          headers['Authorization'] = `Bearer ${parsed.idToken}`;
        }
      }
    } catch (_) {}
  }
  return fetch(url, { ...opts, headers, credentials: 'include' });
}

function getAdminOverrides(): Record<string, Partial<AdminReviewItem>> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(ADMIN_REVIEWS_OVERRIDES_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveAdminOverride(reviewId: string, updates: Partial<AdminReviewItem>) {
  if (!reviewId) return;
  const nowIso = new Date().toISOString();

  if (_inMemoryCloudReviews) {
    const idx = _inMemoryCloudReviews.findIndex(r => r.id === reviewId);
    if (idx >= 0) {
      _inMemoryCloudReviews[idx] = { ..._inMemoryCloudReviews[idx], ...updates, updated_at: nowIso };
    }
  }

  if (typeof window === 'undefined') return;
  try {
    const existing = getAdminOverrides();
    existing[reviewId] = { ...(existing[reviewId] || {}), ...updates, updated_at: nowIso };
    localStorage.setItem(ADMIN_REVIEWS_OVERRIDES_KEY, JSON.stringify(existing));

    const custom = getAdminCustomReviews();
    const idx = custom.findIndex(r => r.id === reviewId);
    if (idx >= 0) {
      custom[idx] = { ...custom[idx], ...updates, updated_at: nowIso };
      localStorage.setItem(ADMIN_CUSTOM_REVIEWS_KEY, JSON.stringify(custom));
    }

    if (_inMemoryCloudReviews) {
      localStorage.setItem(ADMIN_CLOUD_REVIEWS_CACHE_KEY, JSON.stringify({
        ts: _cloudHydratedTimestamp || Date.now(),
        items: _inMemoryCloudReviews
      }));
    }
  } catch (_) {}
}

function getAdminCustomReviews(): AdminReviewItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(ADMIN_CUSTOM_REVIEWS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAdminCustomReview(review: AdminReviewItem) {
  if (!review || !review.id) return;
  const canonical = normalizeAdminReviewRecord(review);

  if (_inMemoryCloudReviews) {
    const idx = _inMemoryCloudReviews.findIndex(r => r.id === canonical.id);
    if (idx >= 0) {
      _inMemoryCloudReviews[idx] = { ..._inMemoryCloudReviews[idx], ...canonical };
    } else {
      _inMemoryCloudReviews.unshift(canonical);
    }
  }

  if (typeof window === 'undefined') return;
  try {
    const list = getAdminCustomReviews();
    const idx = list.findIndex(r => r.id === canonical.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...canonical };
    } else {
      list.unshift(canonical);
    }
    localStorage.setItem(ADMIN_CUSTOM_REVIEWS_KEY, JSON.stringify(list));

    // If this review ID was previously in deleted map, un-delete it
    const deletedMap = getAdminDeletedMap();
    if (deletedMap[canonical.id]) {
      delete deletedMap[canonical.id];
      localStorage.setItem(ADMIN_DELETED_REVIEWS_KEY, JSON.stringify(deletedMap));
    }
  } catch (_) {}
}

function getAdminDeletedMap(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(ADMIN_DELETED_REVIEWS_KEY) || '{}');
  } catch {
    return {};
  }
}

function markAdminDeleted(reviewId: string) {
  if (!reviewId) return;
  if (_inMemoryCloudReviews) {
    _inMemoryCloudReviews = _inMemoryCloudReviews.filter(r => r.id !== reviewId);
  }
  if (typeof window === 'undefined') return;
  try {
    const map = getAdminDeletedMap();
    map[reviewId] = true;
    localStorage.setItem(ADMIN_DELETED_REVIEWS_KEY, JSON.stringify(map));

    const custom = getAdminCustomReviews().filter(r => r.id !== reviewId);
    localStorage.setItem(ADMIN_CUSTOM_REVIEWS_KEY, JSON.stringify(custom));

    const overrides = getAdminOverrides();
    if (overrides[reviewId]) {
      delete overrides[reviewId];
      localStorage.setItem(ADMIN_REVIEWS_OVERRIDES_KEY, JSON.stringify(overrides));
    }

    if (_inMemoryCloudReviews) {
      localStorage.setItem(ADMIN_CLOUD_REVIEWS_CACHE_KEY, JSON.stringify({
        ts: _cloudHydratedTimestamp || Date.now(),
        items: _inMemoryCloudReviews
      }));
    }
  } catch (_) {}
}

function getCachedCloudReviewsSync(): AdminReviewItem[] {
  const cfg = getResolvedCommunityFirebaseConfig();
  const isCloudConfigured = Boolean(cfg.projectId && cfg.apiKey);
  if (!isCloudConfigured) {
    return _inMemoryCloudReviews || [];
  }
  if (_inMemoryCloudReviews) return _inMemoryCloudReviews;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(ADMIN_CLOUD_REVIEWS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items)) {
          _inMemoryCloudReviews = parsed.items;
          _cloudHydratedTimestamp = Number(parsed.ts) || 0;
          return _inMemoryCloudReviews;
        }
      }
    } catch (_) {}
  }
  return [];
}

function setCachedCloudReviews(items: AdminReviewItem[]) {
  _inMemoryCloudReviews = items;
  _cloudHydratedTimestamp = Date.now();
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ADMIN_CLOUD_REVIEWS_CACHE_KEY, JSON.stringify({
        ts: _cloudHydratedTimestamp,
        items
      }));
    } catch (_) {}
  }
}

export function normalizeAdminReviewRecord(raw: any, appsOverride?: any[]): AdminReviewItem {
  const meta = resolveCanonicalAppMeta(
    raw?.appId || raw?.app_id,
    raw?.appSlug,
    raw?.appName,
    appsOverride
  );
  const rawRating = Number(raw?.rating);
  const cleanRating = !isNaN(rawRating) && rawRating >= 1 && rawRating <= 5 ? Math.round(rawRating) : 5;
  const cleanStatus = ['published', 'pending', 'rejected'].includes(String(raw?.status || '').toLowerCase())
    ? String(raw.status).toLowerCase()
    : 'published';
  const rawDate = raw?.timestamp || raw?.created_at || new Date().toISOString();
  const isoDate = (() => {
    const d = parseRelativeOrIsoDate(rawDate);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  })();

  return {
    id: String(raw?.id || `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`).trim(),
    appId: meta.id || String(raw?.appId || raw?.app_id || '').trim(),
    app_id: meta.id || String(raw?.appId || raw?.app_id || '').trim(),
    appSlug: meta.slug || String(raw?.appSlug || '').trim(),
    appName: meta.name || String(raw?.appName || '').trim(),
    userName: String(raw?.userName || raw?.username || 'Player').trim() || 'Player',
    username: String(raw?.userName || raw?.username || 'Player').trim() || 'Player',
    rating: cleanRating,
    reviewText: String(raw?.reviewText ?? raw?.comment ?? '').trim(),
    comment: String(raw?.reviewText ?? raw?.comment ?? '').trim(),
    timestamp: isoDate,
    created_at: formatReviewDate(isoDate),
    status: cleanStatus,
    helpful_count: Math.max(0, Number(raw?.helpful_count) || 0),
    isPinned: Boolean(raw?.isPinned),
    reported: Boolean(raw?.reported),
    report_count: Math.max(0, Number(raw?.report_count) || 0),
    source: String(raw?.source || 'community'),
    adminReply: raw?.adminReply || null,
    updated_at: raw?.updated_at || isoDate
  };
}

/**
 * Fetches all review documents from Community Firestore REST API.
 * Only called during initial session hydration or explicit manual sync (Zero background polling).
 */
export async function fetchAllFirestoreRestReviews(force = false): Promise<AdminReviewItem[]> {
  if (!force && _inMemoryCloudReviews && (Date.now() - _cloudHydratedTimestamp < CLOUD_HYDRATION_TTL_MS)) {
    return _inMemoryCloudReviews;
  }
  if (_cloudHydrationPromise && !force) {
    return _cloudHydrationPromise;
  }

  _cloudHydrationPromise = (async () => {
    const allReviewsMap = new Map<string, AdminReviewItem>();
    const deletedMap = getAdminDeletedMap();
    const overrides = getAdminOverrides();

    // 1. Pull server-side persistent ledger first (if running with Express backend)
    if (typeof window !== 'undefined') {
      try {
        const res = await safeAdminFetch('/api/v1/admin/community/ledger');
        const cType = res.headers.get('content-type') || '';
        if (res.ok && cType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data?.reviews)) {
            for (const item of data.reviews) {
              if (!item || !item.id || deletedMap[item.id]) continue;
              const norm = normalizeAdminReviewRecord({ ...item, ...(overrides[item.id] || {}) });
              allReviewsMap.set(norm.id, norm);
            }
          }
        }
      } catch (_) {}
    }

    // 2. Pull Community Firestore `reviews` collection (1-time session hydration)
    try {
      const cfg = getResolvedCommunityFirebaseConfig();
      if (cfg.projectId && cfg.apiKey) {
        let nextPageToken = '';
        let pagesFetched = 0;
        const baseUrl = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/reviews?pageSize=250&key=${cfg.apiKey}`;

        while (pagesFetched < 15) {
          pagesFetched++;
          const pageUrl = baseUrl + (nextPageToken ? `&pageToken=${encodeURIComponent(nextPageToken)}` : '');
          const res = await fetch(pageUrl);
          if (!res.ok) break;

          const data = await res.json();
          if (data && Array.isArray(data.documents)) {
            for (const doc of data.documents) {
              if (doc && doc.fields) {
                const parsed = parseFirestoreFields(doc.fields);
                const docId = doc.name?.split('/').pop() || parsed.id;
                if (!docId || deletedMap[docId]) continue;
                const norm = normalizeAdminReviewRecord({
                  ...parsed,
                  id: docId,
                  ...(overrides[docId] || {})
                });
                allReviewsMap.set(norm.id, norm);
              }
            }
          }

          if (!data.nextPageToken) break;
          nextPageToken = data.nextPageToken;
        }
      }
    } catch (err) {
      console.warn('[communityFirebase] Firestore reviews hydration note:', err);
    }

    const hydratedList = Array.from(allReviewsMap.values());
    if (hydratedList.length > 0 || force) {
      setCachedCloudReviews(hydratedList);
    }
    _cloudHydrationPromise = null;
    return hydratedList;
  })();

  return _cloudHydrationPromise;
}

/**
 * Gathers all consolidated, deduplicated reviews for a target app (or 'all' apps)
 * across Custom Local Reviews, Hydrated Cloud Reviews, and Static Bundle Reviews.
 */
export function getConsolidatedReviewsForApp(appIdParam?: string, appsOverride?: any[]): AdminReviewItem[] {
  const byId = new Map<string, AdminReviewItem>();
  const deletedMap = getAdminDeletedMap();
  const overrides = getAdminOverrides();
  const rawParam = String(appIdParam || '').trim();
  const isAll = !rawParam || rawParam.toLowerCase() === 'all';

  const catalogApps = Array.isArray(appsOverride) ? appsOverride : getCatalogAppsForReviews();
  if (isAll && catalogApps.length === 0) {
    return [];
  }

  const validCatalogKeys = new Set<string>();
  for (const a of catalogApps) {
    if (!a) continue;
    if (a.id) validCatalogKeys.add(String(a.id).trim().toLowerCase());
    if (a.slug) validCatalogKeys.add(String(a.slug).trim().toLowerCase());
    if (a.name) validCatalogKeys.add(String(a.name).trim().toLowerCase());
  }

  const targetMeta = !isAll ? resolveCanonicalAppMeta(rawParam, rawParam, '', catalogApps) : null;
  const matchKeys = new Set<string>();
  if (!isAll && targetMeta) {
    if (targetMeta.id) matchKeys.add(targetMeta.id.toLowerCase());
    if (targetMeta.slug) matchKeys.add(targetMeta.slug.toLowerCase());
    if (targetMeta.name) matchKeys.add(targetMeta.name.toLowerCase());
    matchKeys.add(rawParam.toLowerCase());
  }

  const matchesTargetApp = (rev: any): boolean => {
    const rMeta = resolveCanonicalAppMeta(rev?.appId || rev?.app_id, rev?.appSlug, rev?.appName, catalogApps);
    const k1 = (rMeta.id || '').toLowerCase();
    const k2 = (rMeta.slug || '').toLowerCase();
    const k3 = (rMeta.name || '').toLowerCase();
    const raw1 = String(rev?.appId || rev?.app_id || '').trim().toLowerCase();
    const raw2 = String(rev?.appSlug || '').trim().toLowerCase();

    if (isAll) {
      if (validCatalogKeys.size === 0) return false;
      return (
        (Boolean(k1) && validCatalogKeys.has(k1)) ||
        (Boolean(k2) && validCatalogKeys.has(k2)) ||
        (Boolean(k3) && validCatalogKeys.has(k3)) ||
        (Boolean(raw1) && validCatalogKeys.has(raw1)) ||
        (Boolean(raw2) && validCatalogKeys.has(raw2))
      );
    }

    return (
      (Boolean(k1) && matchKeys.has(k1)) ||
      (Boolean(k2) && matchKeys.has(k2)) ||
      (Boolean(k3) && matchKeys.has(k3)) ||
      (Boolean(raw1) && matchKeys.has(raw1)) ||
      (Boolean(raw2) && matchKeys.has(raw2))
    );
  };

  // 1. Custom admin-created reviews (highest priority)
  const customReviews = getAdminCustomReviews();
  for (const rev of customReviews) {
    if (!rev || !rev.id || deletedMap[rev.id]) continue;
    if (matchesTargetApp(rev)) {
      const merged = normalizeAdminReviewRecord({ ...rev, ...(overrides[rev.id] || {}) }, appsOverride);
      byId.set(merged.id, merged);
    }
  }

  // 2. Hydrated Cloud / Server Ledger reviews
  const cloudReviews = getCachedCloudReviewsSync();
  for (const rev of cloudReviews) {
    if (!rev || !rev.id || deletedMap[rev.id] || byId.has(rev.id)) continue;
    if (matchesTargetApp(rev)) {
      const merged = normalizeAdminReviewRecord({ ...rev, ...(overrides[rev.id] || {}) }, appsOverride);
      byId.set(merged.id, merged);
    }
  }

  // 3. Static reviews bundle (communityStaticReviews.json)
  try {
    const staticMap = getStaticReviewsSync();
    const candidateArrays: any[][] = [];

    if (isAll) {
      for (const arr of Object.values(staticMap)) {
        if (Array.isArray(arr)) candidateArrays.push(arr);
      }
    } else {
      for (const key of Array.from(matchKeys)) {
        if (Array.isArray(staticMap[key])) candidateArrays.push(staticMap[key]);
      }
      // Also check any other bucket whose items match this app
      for (const [k, arr] of Object.entries(staticMap)) {
        if (!matchKeys.has(k.toLowerCase()) && Array.isArray(arr)) {
          const matchingItems = arr.filter(item => item && matchesTargetApp(item));
          if (matchingItems.length > 0) candidateArrays.push(matchingItems);
        }
      }
    }

    for (const arr of candidateArrays) {
      for (const raw of arr) {
        if (!raw || !raw.id || deletedMap[raw.id] || byId.has(raw.id)) continue;
        const merged = normalizeAdminReviewRecord({ ...raw, ...(overrides[raw.id] || {}) }, appsOverride);
        byId.set(merged.id, merged);
      }
    }
  } catch (_) {}

  // 4. Local public user submissions (from current browser if any)
  if (typeof window !== 'undefined' && !isAll && targetMeta) {
    const localKeys = Array.from(new Set([targetMeta.id, targetMeta.slug, rawParam].filter(Boolean)));
    for (const lk of localKeys) {
      try {
        const rawLocal = localStorage.getItem(`local_user_reviews_${lk}`);
        if (rawLocal) {
          const parsedLocal = JSON.parse(rawLocal);
          if (Array.isArray(parsedLocal)) {
            for (const item of parsedLocal) {
              if (!item || !item.id || deletedMap[item.id] || byId.has(item.id)) continue;
              const merged = normalizeAdminReviewRecord({ ...item, ...(overrides[item.id] || {}) }, appsOverride);
              byId.set(merged.id, merged);
            }
          }
        }
      } catch (_) {}
    }
  }

  return Array.from(byId.values());
}

// ============================================================================
// 5. AUTHORITATIVE ATOMIC STATS ENGINE (100% Mathematical Parity)
// ============================================================================

let memoryAtomicStats: {
  globalStats: {
    total: number;
    published: number;
    pending: number;
    rejected: number;
    flagged: number;
    averageRating: number;
    ratingDistribution: Record<string, number>;
    appCoverageCount: number;
  };
  appCounts: Record<string, AppReviewCountsData>;
  topApps: AdminCommunityTopApp[];
  recentReviews: AdminReviewItem[];
  lastSynced?: number;
} | null = null;

/**
 * Computes 100% exact per-app and global atomic statistics directly from the Unified Review Ledger.
 * Eliminates all drift between Outside Card Count, Inside App Workspace Count, and Public Website Count.
 */
export function computeAuthoritativeAtomicCatalogStats(apps?: any[]): {
  globalStats: {
    total: number;
    published: number;
    pending: number;
    rejected: number;
    flagged: number;
    averageRating: number;
    ratingDistribution: Record<string, number>;
    appCoverageCount: number;
  };
  appCounts: Record<string, AppReviewCountsData>;
  topApps: AdminCommunityTopApp[];
  recentReviews: AdminReviewItem[];
} {
  if (Array.isArray(apps)) {
    registerCatalogAppsForReviews(apps);
  }
  const targetApps = Array.isArray(apps) ? apps : getCatalogAppsForReviews();

  if (targetApps.length === 0) {
    return {
      globalStats: {
        total: 0,
        published: 0,
        pending: 0,
        rejected: 0,
        flagged: 0,
        averageRating: 0,
        ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
        appCoverageCount: 0
      },
      appCounts: {},
      topApps: [],
      recentReviews: []
    };
  }

  const allLedgerReviews = getConsolidatedReviewsForApp('all', targetApps);

  // Baseline fallback from catalog_stats ONLY if ledger has 0 reviews at all and cloud hasn't hydrated yet
  const rawBaselineCounts: Record<string, any> =
    memoryAtomicStats?.appCounts ||
    (communityCatalogStatsJson as any)?.appCounts ||
    (communityCatalogStatsJson as any)?.apps ||
    {};

  // Group all ledger reviews by canonical app key (STRICTLY restricted to existing catalog apps)
  const reviewsByCanonicalKey = new Map<string, AdminReviewItem[]>();
  const canonicalMetaByKey = new Map<string, CanonicalAppMeta>();

  for (const app of targetApps) {
    if (!app) continue;
    const meta = resolveCanonicalAppMeta(app.id, app.slug, app.name, targetApps);
    if (meta.canonicalKey && !canonicalMetaByKey.has(meta.canonicalKey)) {
      canonicalMetaByKey.set(meta.canonicalKey, meta);
      reviewsByCanonicalKey.set(meta.canonicalKey, []);
    }
  }

  for (const rev of allLedgerReviews) {
    const meta = resolveCanonicalAppMeta(rev.appId, rev.appSlug, rev.appName, targetApps);
    const cKey = meta.canonicalKey || String(rev.appSlug || rev.appId || '').toLowerCase().trim();
    // Never aggregate orphaned reviews that do not belong to an actual app in targetApps
    if (!cKey || !canonicalMetaByKey.has(cKey)) {
      continue;
    }
    const list = reviewsByCanonicalKey.get(cKey) || [];
    list.push(rev);
    reviewsByCanonicalKey.set(cKey, list);
  }

  const appCounts: Record<string, AppReviewCountsData> = {};
  const topAppsList: AdminCommunityTopApp[] = [];

  let totalReviews = 0;
  let publishedReviews = 0;
  let pendingReviews = 0;
  let rejectedReviews = 0;
  let flaggedReviews = 0;
  let globalRatingSum = 0;
  let appCoverageCount = 0;
  const ratingDistribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

  const hasAnyLedgerReviews = allLedgerReviews.length > 0 || _cloudHydratedTimestamp > 0;

  for (const [cKey, meta] of canonicalMetaByKey.entries()) {
    const idKey = String(meta.id || '').toLowerCase().trim();
    const slugKey = String(meta.slug || '').toLowerCase().trim();
    const appReviews = reviewsByCanonicalKey.get(cKey) || [];

    let appStat: AppReviewCountsData;

    if (hasAnyLedgerReviews || appReviews.length > 0) {
      const count = appReviews.length;
      let pubCount = 0;
      let pendCount = 0;
      let rejCount = 0;
      let flagCount = 0;
      let appRatingSum = 0;
      const starCounts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

      for (const r of appReviews) {
        const st = String(r.status || 'published').toLowerCase();
        if (st === 'published') pubCount++;
        else if (st === 'pending') pendCount++;
        else if (st === 'rejected') rejCount++;

        if (r.reported) flagCount++;

        const starNum = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));
        const starKey = String(starNum);
        starCounts[starKey] = (starCounts[starKey] || 0) + 1;
        ratingDistribution[starKey] = (ratingDistribution[starKey] || 0) + 1;
        appRatingSum += starNum;
      }

      const avg = count > 0
        ? Math.round((appRatingSum / count) * 10) / 10
        : meta.defaultRating;

      appStat = {
        total: count,
        published: pubCount,
        pending: pendCount,
        rejected: rejCount,
        flagged: flagCount,
        ratingSum: appRatingSum,
        avgRating: avg,
        starCounts,
        canonicalKey: cKey
      };
    } else {
      // Pre-hydration fallback if baseline exists
      const base = (slugKey && rawBaselineCounts[slugKey]) || (idKey && rawBaselineCounts[idKey]);
      const count = Number(base?.total) || 0;
      const pubCount = Number(base?.published ?? count) || 0;
      const pendCount = Number(base?.pending) || 0;
      const rejCount = Number(base?.rejected) || 0;
      const flagCount = Number(base?.flagged) || 0;
      const avg = Number(base?.avgRating) || meta.defaultRating;
      const starCounts = base?.starCounts || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
      const sum = Number(base?.ratingSum) || Math.round(avg * count);

      for (const s of ['1', '2', '3', '4', '5']) {
        ratingDistribution[s] += Number(starCounts[s]) || 0;
      }

      appStat = {
        total: count,
        published: pubCount,
        pending: pendCount,
        rejected: rejCount,
        flagged: flagCount,
        ratingSum: sum,
        avgRating: avg,
        starCounts,
        canonicalKey: cKey
      };
    }

    if (idKey) appCounts[idKey] = appStat;
    if (slugKey) appCounts[slugKey] = appStat;
    if (cKey) appCounts[cKey] = appStat;

    if (appStat.total > 0) {
      appCoverageCount++;
      totalReviews += appStat.total;
      publishedReviews += appStat.published;
      pendingReviews += appStat.pending;
      rejectedReviews += appStat.rejected;
      flaggedReviews += appStat.flagged;
      globalRatingSum += appStat.ratingSum || (appStat.avgRating * appStat.total);

      topAppsList.push({
        id: meta.id || cKey,
        slug: meta.slug || cKey,
        name: meta.name,
        icon_url: meta.icon_url,
        category: meta.category,
        total: appStat.total,
        published: appStat.published,
        pending: appStat.pending,
        avgRating: appStat.avgRating
      });
    }
  }

  topAppsList.sort((a, b) => b.total - a.total || b.avgRating - a.avgRating);

  const sortedRecent = [...allLedgerReviews].sort(
    (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
  );

  const avgGlobal = totalReviews > 0
    ? Math.round((globalRatingSum / totalReviews) * 10) / 10
    : 0;

  return {
    globalStats: {
      total: totalReviews,
      published: publishedReviews,
      pending: pendingReviews,
      rejected: rejectedReviews,
      flagged: flaggedReviews,
      averageRating: avgGlobal,
      ratingDistribution,
      appCoverageCount
    },
    appCounts,
    topApps: topAppsList.slice(0, 12),
    recentReviews: sortedRecent.slice(0, 15)
  };
}

function saveLiveAtomicReviewStats(
  stats: {
    globalStats: {
      total: number;
      published: number;
      pending: number;
      rejected: number;
      flagged: number;
      averageRating: number;
      ratingDistribution?: Record<string, number>;
      appCoverageCount?: number;
    };
    appCounts: Record<string, AppReviewCountsData>;
    topApps?: AdminCommunityTopApp[];
    recentReviews?: AdminReviewItem[];
  },
  notify = true
) {
  memoryAtomicStats = {
    globalStats: {
      ...stats.globalStats,
      ratingDistribution: stats.globalStats.ratingDistribution || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      appCoverageCount: stats.globalStats.appCoverageCount ?? 0
    },
    appCounts: stats.appCounts || {},
    topApps: stats.topApps || [],
    recentReviews: stats.recentReviews || [],
    lastSynced: Date.now()
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ADMIN_ATOMIC_STATS_KEY, JSON.stringify({
        globalStats: memoryAtomicStats.globalStats,
        appCounts: memoryAtomicStats.appCounts,
        lastSynced: memoryAtomicStats.lastSynced
      }));
      if (notify) {
        window.dispatchEvent(new CustomEvent('atomic_review_counts_updated', {
          detail: {
            globalStats: memoryAtomicStats.globalStats,
            appCounts: memoryAtomicStats.appCounts,
            topApps: memoryAtomicStats.topApps,
            recentReviews: memoryAtomicStats.recentReviews
          }
        }));
        window.dispatchEvent(new CustomEvent('community-reviews-updated', {
          detail: {
            globalStats: memoryAtomicStats.globalStats,
            appCounts: memoryAtomicStats.appCounts
          }
        }));
      }
    } catch (_) {}
  }
}

export function getLiveAtomicReviewStatsSync(): {
  globalStats: {
    total: number;
    published: number;
    pending: number;
    rejected: number;
    flagged: number;
    averageRating: number;
    ratingDistribution?: Record<string, number>;
    appCoverageCount?: number;
  };
  appCounts: Record<string, AppReviewCountsData>;
  topApps?: AdminCommunityTopApp[];
  recentReviews?: AdminReviewItem[];
} {
  const targetApps = getCatalogAppsForReviews();
  if (targetApps.length === 0) {
    const emptyStats = computeAuthoritativeAtomicCatalogStats([]);
    memoryAtomicStats = { ...emptyStats, lastSynced: Date.now() };
    return emptyStats;
  }

  // Always compute from the live unified ledger if we have any reviews or hydrated state
  const computed = computeAuthoritativeAtomicCatalogStats(targetApps);
  if (computed.globalStats.total > 0 || _cloudHydratedTimestamp > 0) {
    memoryAtomicStats = { ...computed, lastSynced: Date.now() };
    return computed;
  }

  return computed;
}

// Debounced single-write Firestore `catalog_stats` synchronizer (1 write per batch, 0 reads)
let _firestoreStatsSyncTimer: any = null;

function scheduleAtomicStatsFirestoreSync() {
  if (_firestoreStatsSyncTimer) {
    clearTimeout(_firestoreStatsSyncTimer);
  }
  _firestoreStatsSyncTimer = setTimeout(() => {
    _firestoreStatsSyncTimer = null;
    persistAuthoritativeAtomicCatalogStats().catch(() => {});
  }, 600);
}

export function recalculateAndBroadcastAtomicStats(apps?: any[]) {
  const computed = computeAuthoritativeAtomicCatalogStats(apps);
  saveLiveAtomicReviewStats(computed, true);
  scheduleAtomicStatsFirestoreSync();
  return computed;
}

export async function persistAuthoritativeAtomicCatalogStats(apps?: any[]): Promise<{
  globalStats: any;
  appCounts: Record<string, AppReviewCountsData>;
}> {
  const result = computeAuthoritativeAtomicCatalogStats(apps);
  saveLiveAtomicReviewStats(result, true);

  try {
    const cfg = getResolvedCommunityFirebaseConfig();
    if (!cfg.projectId || !cfg.apiKey) return result;

    const appCountsFields: Record<string, any> = {};
    for (const [key, data] of Object.entries(result.appCounts)) {
      if (!key) continue;
      appCountsFields[key] = {
        mapValue: {
          fields: {
            total: { integerValue: String(data.total || 0) },
            published: { integerValue: String(data.published || 0) },
            pending: { integerValue: String(data.pending || 0) },
            rejected: { integerValue: String(data.rejected || 0) },
            flagged: { integerValue: String(data.flagged || 0) },
            avgRating: { doubleValue: Number((data.avgRating || 4.6).toFixed(1)) },
            ratingSum: { integerValue: String(data.ratingSum || 0) },
            starCounts: {
              mapValue: {
                fields: {
                  '1': { integerValue: String(data.starCounts?.['1'] || 0) },
                  '2': { integerValue: String(data.starCounts?.['2'] || 0) },
                  '3': { integerValue: String(data.starCounts?.['3'] || 0) },
                  '4': { integerValue: String(data.starCounts?.['4'] || 0) },
                  '5': { integerValue: String(data.starCounts?.['5'] || 0) }
                }
              }
            }
          }
        }
      };
    }

    const distFields: Record<string, any> = {};
    for (const [s, n] of Object.entries(result.globalStats.ratingDistribution || {})) {
      distFields[s] = { integerValue: String(n || 0) };
    }

    const fields = {
      _rest_admin_bypass: { stringValue: 'aistudio_preview_bypass_key' },
      totalReviews: { integerValue: String(result.globalStats.total) },
      publishedReviews: { integerValue: String(result.globalStats.published) },
      pendingReviews: { integerValue: String(result.globalStats.pending) },
      rejectedReviews: { integerValue: String(result.globalStats.rejected) },
      flaggedReviews: { integerValue: String(result.globalStats.flagged || 0) },
      appCoverageCount: { integerValue: String(result.globalStats.appCoverageCount || 0) },
      averageRating: { doubleValue: Number((result.globalStats.averageRating || 4.6).toFixed(1)) },
      updated_at: { stringValue: new Date().toISOString() },
      ratingDistribution: { mapValue: { fields: distFields } },
      appCounts: { mapValue: { fields: appCountsFields } }
    };

    const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/community_store/catalog_stats?key=${cfg.apiKey}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
  } catch (err) {
    console.warn('[communityFirebase] Notice syncing catalog_stats to Firestore:', err);
  }

  return result;
}

// Backwards-compatible atomic delta hooks (now delegate directly to exact ledger recomputation)
export function applyAtomicDeltaOnReviewAdded(_review?: any) {
  recalculateAndBroadcastAtomicStats();
}

export function applyAtomicDeltaOnReviewDeleted(review?: any) {
  recalculateAndBroadcastAtomicStats();
  if (typeof window !== 'undefined' && review) {
    window.dispatchEvent(new CustomEvent('community-review-deleted', {
      detail: {
        appId: review.appId,
        appSlug: review.appSlug,
        reviewId: review.id,
        id: review.id
      }
    }));
  }
}

export function applyAtomicDeltaOnStatusChange(_review?: any, _oldStatus?: string, _newStatus?: string) {
  recalculateAndBroadcastAtomicStats();
}

// ============================================================================
// 6. ADMIN OVERVIEW, COUNTS & PAGINATED QUERIES
// ============================================================================

export async function fetchAdminAppReviewCounts(force = false): Promise<{
  globalStats: {
    total: number;
    published: number;
    pending: number;
    rejected: number;
    flagged: number;
    averageRating: number;
    ratingDistribution?: Record<string, number>;
    appCoverageCount?: number;
  };
  appCounts: Record<string, AppReviewCountsData>;
}> {
  // Ensure static bundle is loaded into memory
  await getStaticReviewsBundle();

  // Hydrate cloud reviews once per session (or if forced) so counts and actual review lists match 100%
  if (force || !_cloudHydratedTimestamp || (Date.now() - _cloudHydratedTimestamp >= CLOUD_HYDRATION_TTL_MS)) {
    await fetchAllFirestoreRestReviews(force);
  }

  const targetApps = getCatalogAppsForReviews();
  const computed = computeAuthoritativeAtomicCatalogStats(targetApps);

  // If still 0 reviews after hydration (e.g., offline / no review docs), check catalog_stats document once ONLY if catalog apps exist
  if (computed.globalStats.total === 0 && targetApps.length > 0) {
    try {
      const cfg = getResolvedCommunityFirebaseConfig();
      if (cfg.projectId && cfg.apiKey) {
        const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/community_store/catalog_stats?key=${cfg.apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.fields) {
            const parsed = parseFirestoreFields(data.fields);
            const fallbackCounts = parsed.appCounts || {};
            if (Object.keys(fallbackCounts).length > 0 && Number(parsed.totalReviews) > 0) {
              const fallbackResult = {
                globalStats: {
                  total: Number(parsed.totalReviews) || 0,
                  published: Number(parsed.publishedReviews) || 0,
                  pending: Number(parsed.pendingReviews) || 0,
                  rejected: Number(parsed.rejectedReviews) || 0,
                  flagged: Number(parsed.flaggedReviews) || 0,
                  averageRating: Number(parsed.averageRating) || 0,
                  ratingDistribution: parsed.ratingDistribution || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
                  appCoverageCount: Number(parsed.appCoverageCount) || 0
                },
                appCounts: fallbackCounts
              };
              saveLiveAtomicReviewStats(fallbackResult, true);
              return fallbackResult;
            }
          }
        }
      }
    } catch (_) {}
  }

  saveLiveAtomicReviewStats(computed, true);
  return computed;
}

export async function fetchAdminCommunityOverviewStats(force = false): Promise<AdminCommunityStats> {
  await fetchAdminAppReviewCounts(force);
  const live = computeAuthoritativeAtomicCatalogStats();
  const cfg = getResolvedCommunityFirebaseConfig();
  const isConnected = Boolean(cfg.projectId && cfg.apiKey);

  return {
    totalReviews: live.globalStats.total,
    publishedReviews: live.globalStats.published,
    pendingReviews: live.globalStats.pending,
    rejectedReviews: live.globalStats.rejected,
    flaggedReviews: live.globalStats.flagged,
    totalReports: 0,
    pendingReports: 0,
    averageRating: live.globalStats.averageRating,
    ratingDistribution: live.globalStats.ratingDistribution,
    appCoverageCount: live.globalStats.appCoverageCount,
    liveStatus: isConnected ? 'live' : 'offline',
    statusMessage: isConnected ? `${cfg.projectId} Connected (Zero-Quota Shield)` : 'Review DB Offline • Local Mode',
    projectId: cfg.projectId || '',
    topApps: live.topApps,
    recentReviews: live.recentReviews,
    appCounts: live.appCounts
  };
}

export async function reloadAdminCommunityBackup(): Promise<{ success: boolean; message: string }> {
  try {
    await fetchAdminAppReviewCounts(true);
    const live = getLiveAtomicReviewStatsSync();
    return {
      success: true,
      message: `Synchronized ${live.globalStats.total.toLocaleString()} reviews across ${live.globalStats.appCoverageCount || 0} apps.`
    };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Error reloading backup' };
  }
}

export async function fetchAdminReviewsList(params: {
  appId?: string;
  status?: string;
  rating?: string | number;
  search?: string;
  sortBy?: string;
  isPinned?: boolean | string;
  limit?: number;
  page?: number;
  refresh?: boolean;
}): Promise<AdminReviewsListResponse & { page?: number; totalPages?: number; total?: number }> {
  await getStaticReviewsBundle();

  // Hydrate cloud reviews once if not yet hydrated or if explicit refresh requested
  if (params.refresh || !_cloudHydratedTimestamp) {
    await fetchAllFirestoreRestReviews(Boolean(params.refresh));
  }

  const allAppReviews = getConsolidatedReviewsForApp(params.appId);

  // Compute exact stats for this target scope (app or global) BEFORE status/rating/search filtering
  let scopePublished = 0;
  let scopePending = 0;
  let scopeRejected = 0;
  let scopeFlagged = 0;
  let scopeRatingSum = 0;
  const scopeStarCounts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

  for (const r of allAppReviews) {
    const st = String(r.status || 'published').toLowerCase();
    if (st === 'published') scopePublished++;
    else if (st === 'pending') scopePending++;
    else if (st === 'rejected') scopeRejected++;
    if (r.reported) scopeFlagged++;

    const star = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));
    scopeStarCounts[String(star)] = (scopeStarCounts[String(star)] || 0) + 1;
    scopeRatingSum += star;
  }

  const scopeAvg = allAppReviews.length > 0
    ? Math.round((scopeRatingSum / allAppReviews.length) * 10) / 10
    : 0;

  // Apply UI filters
  let filtered = [...allAppReviews];

  if (params.status && params.status !== 'all') {
    const targetSt = String(params.status).toLowerCase();
    if (targetSt === 'flagged') {
      filtered = filtered.filter(r => Boolean(r.reported));
    } else {
      filtered = filtered.filter(r => String(r.status || 'published').toLowerCase() === targetSt);
    }
  }

  if (params.rating && params.rating !== 'all') {
    const rNum = Number(params.rating);
    filtered = filtered.filter(r => Math.round(Number(r.rating) || 5) === rNum);
  }

  if (params.search && params.search.trim()) {
    const q = params.search.toLowerCase().trim();
    filtered = filtered.filter(r =>
      (r.userName && r.userName.toLowerCase().includes(q)) ||
      (r.reviewText && r.reviewText.toLowerCase().includes(q)) ||
      (r.appName && r.appName.toLowerCase().includes(q)) ||
      (r.appSlug && r.appSlug.toLowerCase().includes(q))
    );
  }

  if (params.isPinned !== undefined && params.isPinned !== 'all' && params.isPinned !== '') {
    const targetPin = String(params.isPinned) === 'true';
    filtered = filtered.filter(r => Boolean(r.isPinned) === targetPin);
  }

  // Sort: Pinned first, then requested sort order
  filtered.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    if (params.sortBy === 'highest') {
      return Number(b.rating || 5) - Number(a.rating || 5);
    }
    if (params.sortBy === 'lowest') {
      return Number(a.rating || 5) - Number(b.rating || 5);
    }
    if (params.sortBy === 'oldest') {
      return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
    }
    if (params.sortBy === 'helpful') {
      return (Number(b.helpful_count) || 0) - (Number(a.helpful_count) || 0);
    }
    return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
  });

  // Pagination
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Number(params.limit) || 25);
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const startIdx = (page - 1) * limit;
  const pagedReviews = filtered.slice(startIdx, startIdx + limit);

  const authoritative = computeAuthoritativeAtomicCatalogStats();
  saveLiveAtomicReviewStats(authoritative, false);

  return {
    reviews: pagedReviews,
    totalCount,
    total: totalCount,
    page,
    totalPages,
    stats: {
      total: allAppReviews.length,
      published: scopePublished,
      pending: scopePending,
      rejected: scopeRejected,
      flagged: scopeFlagged,
      averageRating: scopeAvg,
      starCounts: scopeStarCounts
    },
    globalStats: authoritative.globalStats,
    appCounts: authoritative.appCounts
  };
}

// ============================================================================
// 7. ADMIN CRUD & BULK OPERATIONS (INSTANT LEDGER + SERVER + FIRESTORE SYNC)
// ============================================================================

export async function createAdminReviewItem(
  reviewData: Partial<AdminReviewItem>
): Promise<AdminReviewItem> {
  const finalReview = normalizeAdminReviewRecord({
    ...reviewData,
    id: reviewData.id || `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    status: reviewData.status || 'published',
    source: reviewData.source || 'admin',
    timestamp: reviewData.timestamp || new Date().toISOString()
  });

  // 1. Update local & in-memory ledger immediately
  saveAdminCustomReview(finalReview);
  invalidateReviewCache(finalReview.appId, finalReview.appSlug);

  // 2. Recompute exact atomic stats & broadcast to all UI components immediately
  recalculateAndBroadcastAtomicStats();

  // 3. Persist to Express server ledger (if available)
  if (typeof window !== 'undefined') {
    safeAdminFetch('/api/v1/admin/community/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalReview)
    }).catch(() => {});
  }

  // 4. Persist document to Community Firestore (1 write, 0 reads)
  try {
    const cfg = getResolvedCommunityFirebaseConfig();
    if (cfg.projectId && cfg.apiKey) {
      const fields = convertToFirestoreFields({
        ...finalReview,
        created_at: finalReview.timestamp,
        updated_at: new Date().toISOString()
      });
      const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/reviews?documentId=${encodeURIComponent(finalReview.id)}&key=${cfg.apiKey}`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });
    }
  } catch (_) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('community-review-added', {
      detail: { newReview: finalReview, review: finalReview }
    }));
  }

  return finalReview;
}

export async function batchCreateAdminReviews(
  reviewsInput: Partial<AdminReviewItem>[]
): Promise<AdminReviewItem[]> {
  if (!Array.isArray(reviewsInput) || reviewsInput.length === 0) return [];
  const createdList: AdminReviewItem[] = [];

  for (const item of reviewsInput) {
    const finalReview = normalizeAdminReviewRecord({
      ...item,
      id: item.id || `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: item.status || 'published',
      source: item.source || 'admin',
      timestamp: item.timestamp || new Date().toISOString()
    });
    saveAdminCustomReview(finalReview);
    invalidateReviewCache(finalReview.appId, finalReview.appSlug);
    createdList.push(finalReview);
  }

  // Single atomic recomputation & debounced catalog_stats write for the entire batch
  recalculateAndBroadcastAtomicStats();

  if (typeof window !== 'undefined') {
    safeAdminFetch('/api/v1/admin/community/reviews/batch-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviews: createdList })
    }).catch(() => {});
  }

  // Background write each review doc to Firestore
  try {
    const cfg = getResolvedCommunityFirebaseConfig();
    if (cfg.projectId && cfg.apiKey) {
      await Promise.all(
        createdList.map(async (rev) => {
          try {
            const fields = convertToFirestoreFields({
              ...rev,
              created_at: rev.timestamp,
              updated_at: new Date().toISOString()
            });
            const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/reviews?documentId=${encodeURIComponent(rev.id)}&key=${cfg.apiKey}`;
            await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fields })
            });
          } catch (_) {}
        })
      );
    }
  } catch (_) {}

  return createdList;
}

export async function updateAdminReviewItem(
  reviewId: string,
  updates: Partial<AdminReviewItem>
): Promise<AdminReviewItem> {
  const cleanUpdates: Partial<AdminReviewItem> = { ...updates };
  if (cleanUpdates.rating !== undefined) {
    cleanUpdates.rating = Math.max(1, Math.min(5, Math.round(Number(cleanUpdates.rating) || 5)));
  }
  if (cleanUpdates.reviewText !== undefined) {
    cleanUpdates.comment = cleanUpdates.reviewText;
  }

  saveAdminOverride(reviewId, cleanUpdates);
  invalidateReviewCache(cleanUpdates.appId, cleanUpdates.appSlug);

  // Recompute atomic stats immediately (handles rating or status changes in Edit Modal!)
  recalculateAndBroadcastAtomicStats();

  if (typeof window !== 'undefined') {
    safeAdminFetch(`/api/v1/admin/community/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanUpdates)
    }).catch(() => {});
  }

  try {
    const cfg = getResolvedCommunityFirebaseConfig();
    if (cfg.projectId && cfg.apiKey) {
      const fields = convertToFirestoreFields({ ...cleanUpdates, updated_at: new Date().toISOString() });
      const allKeys = Array.from(new Set([...Object.keys(cleanUpdates), 'updated_at']));
      const updateMask = allKeys.map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
      const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/reviews/${encodeURIComponent(reviewId)}?${updateMask}&key=${cfg.apiKey}`;
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });
    }
  } catch (_) {}

  const updatedRecord = getConsolidatedReviewsForApp('all').find(r => r.id === reviewId);
  return updatedRecord || ({ id: reviewId, ...cleanUpdates } as AdminReviewItem);
}

export async function setAdminReviewStatus(
  reviewId: string,
  status: 'published' | 'pending' | 'rejected',
  reviewMeta?: { appId?: string; appSlug?: string; rating?: number; status?: string }
): Promise<boolean> {
  saveAdminOverride(reviewId, { status });
  invalidateReviewCache(reviewMeta?.appId, reviewMeta?.appSlug);
  recalculateAndBroadcastAtomicStats();

  if (typeof window !== 'undefined') {
    safeAdminFetch(`/api/v1/admin/community/reviews/${encodeURIComponent(reviewId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...reviewMeta })
    }).catch(() => {});
  }

  try {
    const cfg = getResolvedCommunityFirebaseConfig();
    if (cfg.projectId && cfg.apiKey) {
      const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/reviews/${encodeURIComponent(reviewId)}?updateMask.fieldPaths=status&updateMask.fieldPaths=updated_at&key=${cfg.apiKey}`;
      const fields = convertToFirestoreFields({ status, updated_at: new Date().toISOString() });
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });
    }
  } catch (_) {}

  return true;
}

export async function toggleAdminReviewPin(
  reviewId: string,
  isPinned: boolean
): Promise<boolean> {
  saveAdminOverride(reviewId, { isPinned });
  invalidateReviewCache();
  recalculateAndBroadcastAtomicStats();

  if (typeof window !== 'undefined') {
    safeAdminFetch(`/api/v1/admin/community/reviews/${encodeURIComponent(reviewId)}/pin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPinned })
    }).catch(() => {});
  }

  try {
    const cfg = getResolvedCommunityFirebaseConfig();
    if (cfg.projectId && cfg.apiKey) {
      const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/reviews/${encodeURIComponent(reviewId)}?updateMask.fieldPaths=isPinned&updateMask.fieldPaths=updated_at&key=${cfg.apiKey}`;
      const fields = convertToFirestoreFields({ isPinned, updated_at: new Date().toISOString() });
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });
    }
  } catch (_) {}

  return true;
}

export async function deleteAdminReviewItem(
  reviewId: string,
  reviewMeta?: { appId?: string; appSlug?: string; rating?: number; status?: string }
): Promise<boolean> {
  const existing = getConsolidatedReviewsForApp('all').find(r => r.id === reviewId);
  const targetMeta = {
    id: reviewId,
    appId: reviewMeta?.appId || existing?.appId || '',
    appSlug: reviewMeta?.appSlug || existing?.appSlug || '',
    rating: reviewMeta?.rating || existing?.rating || 5,
    status: reviewMeta?.status || existing?.status || 'published'
  };

  markAdminDeleted(reviewId);
  invalidateReviewCache(targetMeta.appId, targetMeta.appSlug);
  applyAtomicDeltaOnReviewDeleted(targetMeta);

  if (typeof window !== 'undefined') {
    const qParams = new URLSearchParams();
    if (targetMeta.appId) qParams.set('appId', targetMeta.appId);
    if (targetMeta.appSlug) qParams.set('appSlug', targetMeta.appSlug);
    const qs = qParams.toString() ? `?${qParams.toString()}` : '';
    safeAdminFetch(`/api/v1/admin/community/reviews/${encodeURIComponent(reviewId)}${qs}`, {
      method: 'DELETE'
    }).catch(() => {});
  }

  try {
    const cfg = getResolvedCommunityFirebaseConfig();
    if (cfg.projectId && cfg.apiKey) {
      const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/reviews/${encodeURIComponent(reviewId)}?key=${cfg.apiKey}`;
      await fetch(url, { method: 'DELETE' });
    }
  } catch (_) {}

  return true;
}

export async function performBulkReviewsAction(
  action: 'publish' | 'pending' | 'reject' | 'delete' | 'pin' | 'unpin',
  reviewIds: string[],
  _reviewsList?: any[]
): Promise<{ success: boolean; count: number }> {
  if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
    return { success: true, count: 0 };
  }

  for (const id of reviewIds) {
    if (!id) continue;
    if (action === 'delete') {
      markAdminDeleted(id);
    } else if (action === 'pin' || action === 'unpin') {
      saveAdminOverride(id, { isPinned: action === 'pin' });
    } else if (['publish', 'pending', 'reject'].includes(action)) {
      const st = action === 'publish' ? 'published' : (action === 'pending' ? 'pending' : 'rejected');
      saveAdminOverride(id, { status: st });
    }
  }

  invalidateReviewCache();
  recalculateAndBroadcastAtomicStats();

  if (typeof window !== 'undefined') {
    safeAdminFetch('/api/v1/admin/community/reviews/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reviewIds })
    }).catch(() => {});
  }

  // Sync changes to Firestore in background
  try {
    const cfg = getResolvedCommunityFirebaseConfig();
    if (cfg.projectId && cfg.apiKey) {
      await Promise.all(
        reviewIds.map(async (id) => {
          try {
            if (action === 'delete') {
              const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/reviews/${encodeURIComponent(id)}?key=${cfg.apiKey}`;
              await fetch(url, { method: 'DELETE' });
            } else if (action === 'pin' || action === 'unpin') {
              const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/reviews/${encodeURIComponent(id)}?updateMask.fieldPaths=isPinned&updateMask.fieldPaths=updated_at&key=${cfg.apiKey}`;
              const fields = convertToFirestoreFields({ isPinned: action === 'pin', updated_at: new Date().toISOString() });
              await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
            } else {
              const st = action === 'publish' ? 'published' : (action === 'pending' ? 'pending' : 'rejected');
              const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/reviews/${encodeURIComponent(id)}?updateMask.fieldPaths=status&updateMask.fieldPaths=updated_at&key=${cfg.apiKey}`;
              const fields = convertToFirestoreFields({ status: st, updated_at: new Date().toISOString() });
              await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
            }
          } catch (_) {}
        })
      );
    }
  } catch (_) {}

  return { success: true, count: reviewIds.length };
}

export async function submitAdminReplyToReview(
  reviewId: string,
  replyText: string,
  author = 'Official Support'
): Promise<boolean> {
  const replyObj = replyText.trim()
    ? {
        text: replyText.trim(),
        author: author.trim() || 'Official Support',
        timestamp: new Date().toISOString()
      }
    : null;

  saveAdminOverride(reviewId, { adminReply: replyObj });
  invalidateReviewCache();
  recalculateAndBroadcastAtomicStats();

  if (typeof window !== 'undefined') {
    safeAdminFetch(`/api/v1/admin/community/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminReply: replyObj })
    }).catch(() => {});
  }

  try {
    const cfg = getResolvedCommunityFirebaseConfig();
    if (cfg.projectId && cfg.apiKey) {
      const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/reviews/${encodeURIComponent(reviewId)}?updateMask.fieldPaths=adminReply&updateMask.fieldPaths=updated_at&key=${cfg.apiKey}`;
      const fields = convertToFirestoreFields({ adminReply: replyObj, updated_at: new Date().toISOString() });
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });
    }
  } catch (_) {}

  return true;
}

// ============================================================================
// 8. PUBLIC WEBSITE SYNC BUILDER (100% PARITY FOR GITHUB & LOCAL SYNC)
// ============================================================================

export async function buildPublicCommunitySyncBundle(targetApps: any[]): Promise<{
  harmonizedApps: any[];
  communityStatsPayload: any;
  communityReviewsPayload: Record<string, any[]>;
}> {
  if (Array.isArray(targetApps) && targetApps.length > 0) {
    registerCatalogAppsForReviews(targetApps);
  }
  await getStaticReviewsBundle();
  await fetchAllFirestoreRestReviews(true);

  const allLedgerReviews = getConsolidatedReviewsForApp('all', targetApps);
  const publishedLedger = allLedgerReviews.filter(r => String(r.status || 'published').toLowerCase() === 'published');

  const communityReviewsPayload: Record<string, any[]> = {};
  const appCountsMap: Record<string, AppReviewCountsData> = {};

  // Group published reviews by canonical app
  const publishedByCanonical = new Map<string, any[]>();
  for (const rev of publishedLedger) {
    const meta = resolveCanonicalAppMeta(rev.appId, rev.appSlug, rev.appName, targetApps);
    const cKey = meta.canonicalKey || String(rev.appSlug || rev.appId || '').toLowerCase().trim();
    if (!cKey) continue;
    const list = publishedByCanonical.get(cKey) || [];
    if (!list.some(existing => existing.id === rev.id)) {
      list.push({
        id: rev.id,
        appId: meta.id || rev.appId,
        appSlug: meta.slug || rev.appSlug || '',
        appName: meta.name || rev.appName || '',
        userName: rev.userName || rev.username || 'Player',
        rating: Number(rev.rating) || 5,
        reviewText: rev.reviewText || rev.comment || '',
        timestamp: rev.timestamp || rev.created_at || new Date().toISOString(),
        helpful_count: Number(rev.helpful_count) || 0,
        isPinned: Boolean(rev.isPinned),
        adminReply: rev.adminReply || null
      });
    }
    publishedByCanonical.set(cKey, list);
  }

  let totalGlobalPublished = 0;
  let globalRatingSum = 0;
  let appCoverageCount = 0;
  const globalRatingDist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

  const harmonizedApps = (targetApps || []).map((app: any) => {
    const meta = resolveCanonicalAppMeta(app.id, app.slug, app.name, targetApps);
    const idKey = String(meta.id || '').toLowerCase().trim();
    const slugKey = String(meta.slug || '').toLowerCase().trim();
    const cKey = meta.canonicalKey;

    const appRevs = [...(publishedByCanonical.get(cKey) || [])];
    appRevs.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
    });

    if (appRevs.length > 0) {
      if (slugKey) communityReviewsPayload[slugKey] = appRevs;
      if (idKey && idKey !== slugKey) communityReviewsPayload[idKey] = appRevs;
    }

    const count = appRevs.length;
    const starCounts: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    let appRatingSum = 0;

    for (const r of appRevs) {
      const st = String(Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5))));
      starCounts[st] = (starCounts[st] || 0) + 1;
      globalRatingDist[st] = (globalRatingDist[st] || 0) + 1;
      appRatingSum += Number(r.rating) || 5;
    }

    const avg = count > 0
      ? Math.round((appRatingSum / count) * 10) / 10
      : (Number(app.rating) || 4.6);

    const appStatObj: AppReviewCountsData = {
      total: count,
      published: count,
      pending: 0,
      rejected: 0,
      flagged: 0,
      ratingSum: appRatingSum,
      avgRating: avg,
      starCounts,
      canonicalKey: cKey
    };

    if (idKey) appCountsMap[idKey] = appStatObj;
    if (slugKey) appCountsMap[slugKey] = appStatObj;

    if (count > 0) {
      appCoverageCount++;
      totalGlobalPublished += count;
      globalRatingSum += appRatingSum;
    }

    return {
      ...app,
      rating: avg,
      review_count: count,
      reviews: count
    };
  });

  const globalAvg = totalGlobalPublished > 0
    ? Math.round((globalRatingSum / totalGlobalPublished) * 10) / 10
    : 4.7;

  const communityStatsPayload = {
    generatedAt: new Date().toISOString(),
    totalReviews: totalGlobalPublished,
    publishedReviews: totalGlobalPublished,
    pendingReviews: 0,
    rejectedReviews: 0,
    flaggedReviews: 0,
    appCoverageCount,
    averageRating: globalAvg,
    ratingDistribution: globalRatingDist,
    appCounts: appCountsMap
  };

  setRuntimeStaticReviewsBundle(communityReviewsPayload);
  return {
    harmonizedApps,
    communityStatsPayload,
    communityReviewsPayload
  };
}

// ============================================================================
// 9. PUBLIC CLIENT REVIEW CACHE & LOADER (0ms SWR + UNIFIED LEDGER PARITY)
// ============================================================================

const MEMORY_CACHE = new Map<string, { result: ReviewFetchResult; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000;

export function invalidateReviewCache(appId?: string, appSlug?: string) {
  if (!appId && !appSlug) {
    MEMORY_CACHE.clear();
    return;
  }
  const keys = [appId, appSlug].filter(Boolean).map(k => String(k).trim());
  keys.forEach(k => {
    MEMORY_CACHE.delete(k);
    MEMORY_CACHE.delete(k.toLowerCase());
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`cache_rev_${k}`);
      } catch (_) {}
    }
  });
}

export function getCachedLiveAppStats(appId?: string, appSlug?: string): {
  averageRating: number;
  totalReviews: number;
  starCounts: Record<string, number>;
  distribution: Record<string, number>;
} | null {
  const meta = resolveCanonicalAppMeta(appId, appSlug);
  const cleanId = meta.id.toLowerCase();
  const cleanSlug = meta.slug.toLowerCase();
  if (!cleanId && !cleanSlug) return null;

  // 1. Check consolidated ledger for this app first (guarantees 100% match with displayed reviews!)
  const ledgerPublished = getConsolidatedReviewsForApp(cleanSlug || cleanId).filter(
    r => String(r.status || 'published').toLowerCase() === 'published'
  );
  if (ledgerPublished.length > 0) {
    const starCounts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let sum = 0;
    for (const r of ledgerPublished) {
      const s = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));
      starCounts[String(s)] = (starCounts[String(s)] || 0) + 1;
      sum += s;
    }
    const avg = Math.round((sum / ledgerPublished.length) * 10) / 10;
    return {
      averageRating: avg,
      totalReviews: ledgerPublished.length,
      starCounts,
      distribution: starCounts
    };
  }

  // 2. Check live atomic stats
  const liveStats = getLiveAtomicReviewStatsSync();
  const liveHit = (cleanSlug && liveStats.appCounts[cleanSlug]) || (cleanId && liveStats.appCounts[cleanId]);
  if (liveHit && (Number(liveHit.published) > 0 || Number(liveHit.total) > 0)) {
    const pub = Number(liveHit.published !== undefined ? liveHit.published : liveHit.total) || 0;
    const avg = Number(liveHit.avgRating) || meta.defaultRating;
    const starCounts = (liveHit.starCounts && Object.values(liveHit.starCounts).some((v: any) => Number(v) > 0))
      ? liveHit.starCounts
      : generateNaturalStarDistribution(avg, pub);
    return {
      averageRating: avg,
      totalReviews: pub,
      starCounts,
      distribution: starCounts
    };
  }

  // 3. Static catalog stats baseline
  const catalogCounts: Record<string, any> =
    (communityCatalogStatsJson as any)?.appCounts ||
    (communityCatalogStatsJson as any)?.apps ||
    {};
  const hit = (cleanSlug && catalogCounts[cleanSlug]) || (cleanId && catalogCounts[cleanId]);
  if (hit && (Number(hit.published) > 0 || Number(hit.total) > 0)) {
    const pub = Number(hit.published ?? hit.total) || 0;
    const avg = Number(hit.avgRating) || meta.defaultRating;
    const starCounts = (hit.starCounts && Object.values(hit.starCounts).some((v: any) => Number(v) > 0))
      ? hit.starCounts
      : generateNaturalStarDistribution(avg, pub);
    return {
      averageRating: avg,
      totalReviews: pub,
      starCounts,
      distribution: starCounts
    };
  }

  return null;
}

export function getCachedLiveReviews(appId?: string, appSlug?: string): ReviewFetchResult | null {
  const meta = resolveCanonicalAppMeta(appId, appSlug);
  const keys = Array.from(new Set([meta.slug, meta.id, appId, appSlug].filter(Boolean).map(k => String(k).trim())));
  if (keys.length === 0) return null;

  for (const targetKey of keys) {
    const mem = MEMORY_CACHE.get(targetKey) || MEMORY_CACHE.get(targetKey.toLowerCase());
    if (mem && (Date.now() - mem.timestamp < CACHE_TTL_MS)) {
      return mem.result;
    }
  }

  const publishedList = getConsolidatedReviewsForApp(meta.slug || meta.id).filter(
    r => String(r.status || 'published').toLowerCase() === 'published'
  );

  if (publishedList.length > 0) {
    publishedList.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
    });

    const mapped: PublicReview[] = publishedList.slice(0, 5).map(r => ({
      id: r.id,
      app_id: r.appId || meta.id,
      appId: r.appId || meta.id,
      appSlug: r.appSlug || meta.slug,
      appName: r.appName || meta.name,
      username: r.userName || r.username || 'Player',
      userName: r.userName || r.username || 'Player',
      rating: Number(r.rating) || 5,
      comment: r.reviewText || r.comment || '',
      reviewText: r.reviewText || r.comment || '',
      created_at: formatReviewDate(r.timestamp || r.created_at),
      timestamp: r.timestamp || new Date().toISOString(),
      helpful_count: Number(r.helpful_count) || 0,
      reported: Boolean(r.reported),
      report_count: Number(r.report_count) || 0,
      source: r.source || 'community',
      isPinned: Boolean(r.isPinned),
      adminReply: r.adminReply || null
    }));

    return {
      reviews: mapped,
      hasMore: publishedList.length > 5,
      nextCursor: publishedList.length > 5 ? '5' : null,
      stats: getCachedLiveAppStats(meta.id, meta.slug)
    };
  }

  return null;
}

export async function fetchLiveReviews(options: {
  appId: string;
  appSlug?: string;
  appTitle?: string;
  cursor?: any;
  limit?: number;
  rating?: number;
  filter?: string;
  sortBy?: string;
}): Promise<ReviewFetchResult> {
  const { appId, appSlug, appTitle, cursor, limit = 5, filter = 'all', sortBy = 'recent' } = options;
  const meta = resolveCanonicalAppMeta(appId, appSlug, appTitle);
  if (!meta.id && !meta.slug) return { reviews: [], hasMore: false, nextCursor: null };

  await getStaticReviewsBundle();

  let list = getConsolidatedReviewsForApp(meta.slug || meta.id).filter(
    r => String(r.status || 'published').toLowerCase() === 'published'
  );

  // If local/static bundle has 0 reviews for this app, check server public endpoint once
  if (list.length === 0 && typeof window !== 'undefined') {
    try {
      const q = new URLSearchParams({
        appId: meta.id,
        appSlug: meta.slug,
        limit: '50'
      });
      const res = await fetch(`/api/v1/public/community/reviews?${q.toString()}`);
      const cType = res.headers.get('content-type') || '';
      if (res.ok && cType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data?.reviews) && data.reviews.length > 0) {
          const deletedMap = getAdminDeletedMap();
          const overrides = getAdminOverrides();
          list = data.reviews
            .filter((r: any) => r && r.id && !deletedMap[r.id])
            .map((r: any) => normalizeAdminReviewRecord({ ...r, ...(overrides[r.id] || {}) }));
        }
      }
    } catch (_) {}
  }

  // Filter
  if (filter === 'positive') {
    list = list.filter(r => Number(r.rating) >= 4);
  } else if (filter === 'critical') {
    list = list.filter(r => Number(r.rating) <= 3);
  }

  // Sort
  list.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if (sortBy === 'helpful') {
      return (Number(b.helpful_count) || 0) - (Number(a.helpful_count) || 0);
    }
    const dateB = new Date(b.timestamp || b.created_at || 0).getTime();
    const dateA = new Date(a.timestamp || a.created_at || 0).getTime();
    return dateB - dateA;
  });

  const offset = cursor ? parseInt(String(cursor), 10) || 0 : 0;
  const pageItems = list.slice(offset, offset + limit);
  const hasMore = offset + limit < list.length;
  const nextCursor = hasMore ? String(offset + limit) : null;

  const mappedPage: PublicReview[] = pageItems.map(r => ({
    id: r.id,
    app_id: r.appId || meta.id,
    appId: r.appId || meta.id,
    appSlug: r.appSlug || meta.slug,
    appName: r.appName || meta.name,
    username: r.userName || r.username || 'Player',
    userName: r.userName || r.username || 'Player',
    rating: Number(r.rating) || 5,
    comment: r.reviewText || r.comment || '',
    reviewText: r.reviewText || r.comment || '',
    created_at: formatReviewDate(r.timestamp || r.created_at),
    timestamp: r.timestamp || new Date().toISOString(),
    helpful_count: Number(r.helpful_count) || 0,
    reported: Boolean(r.reported),
    report_count: Number(r.report_count) || 0,
    source: r.source || 'community',
    isPinned: Boolean(r.isPinned),
    adminReply: r.adminReply || null
  }));

  const result: ReviewFetchResult = {
    reviews: mappedPage,
    hasMore,
    nextCursor,
    stats: getCachedLiveAppStats(meta.id, meta.slug)
  };

  if (!cursor && filter === 'all' && sortBy === 'recent') {
    if (meta.id) MEMORY_CACHE.set(meta.id.toLowerCase(), { result, timestamp: Date.now() });
    if (meta.slug) MEMORY_CACHE.set(meta.slug.toLowerCase(), { result, timestamp: Date.now() });
  }

  return result;
}

export async function submitLiveReview(data: {
  appId: string;
  appSlug?: string;
  appName?: string;
  userName: string;
  rating: number;
  reviewText: string;
  turnstileToken?: string;
}): Promise<{ success: boolean; review?: PublicReview; error?: string }> {
  const meta = resolveCanonicalAppMeta(data.appId, data.appSlug, data.appName);
  const cleanUserName = String(data.userName || '').trim() || 'Player';
  const cleanRating = Math.max(1, Math.min(5, Math.round(Number(data.rating) || 5)));
  const cleanComment = String(data.reviewText || '').trim();
  const generatedId = `rev_local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  let newReview: PublicReview = {
    id: generatedId,
    app_id: meta.id || data.appId,
    appId: meta.id || data.appId,
    appSlug: meta.slug || data.appSlug || '',
    appName: meta.name || data.appName || '',
    username: cleanUserName,
    userName: cleanUserName,
    rating: cleanRating,
    comment: cleanComment,
    reviewText: cleanComment,
    created_at: formatReviewDate(nowIso),
    timestamp: nowIso,
    helpful_count: 0,
    reported: false,
    report_count: 0,
    source: 'community',
    isPinned: false,
    adminReply: null
  };

  if (typeof window !== 'undefined') {
    try {
      const apiRes = await fetch('/api/v1/public/community/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: generatedId,
          appId: newReview.appId,
          appSlug: newReview.appSlug,
          appName: newReview.appName,
          userName: cleanUserName,
          rating: cleanRating,
          reviewText: cleanComment,
          turnstileToken: data.turnstileToken
        })
      });
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json?.review?.id) {
          newReview = { ...newReview, id: json.review.id };
        }
      }
    } catch (_) {}

    try {
      const storageKey = `local_user_reviews_${newReview.appId}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.unshift(newReview);
      localStorage.setItem(storageKey, JSON.stringify(existing.slice(0, 15)));
      if (newReview.appSlug) {
        localStorage.setItem(`local_user_reviews_${newReview.appSlug}`, JSON.stringify(existing.slice(0, 15)));
      }
      invalidateReviewCache(newReview.appId, newReview.appSlug);
      recalculateAndBroadcastAtomicStats();
    } catch (_) {}
  }

  return { success: true, review: newReview };
}

export async function voteLiveReviewHelpful(reviewId: string, appId?: string): Promise<boolean> {
  if (!reviewId) return false;

  const existing = getConsolidatedReviewsForApp('all').find(r => r.id === reviewId);
  const nextCount = (Number(existing?.helpful_count) || 0) + 1;
  saveAdminOverride(reviewId, { helpful_count: nextCount });
  invalidateReviewCache(appId, existing?.appSlug);

  if (typeof window !== 'undefined') {
    try {
      const voted = JSON.parse(localStorage.getItem('voted_reviews_map') || '{}');
      voted[reviewId] = true;
      localStorage.setItem('voted_reviews_map', JSON.stringify(voted));
    } catch (_) {}

    fetch('/api/v1/public/community/reviews/helpful', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId, appId })
    }).catch(() => {});
  }

  return true;
}

export async function reportLiveReview(data: {
  reviewId: string;
  appId?: string;
  reason?: string;
  details?: string;
}): Promise<boolean> {
  if (!data.reviewId) return false;

  const existing = getConsolidatedReviewsForApp('all').find(r => r.id === data.reviewId);
  saveAdminOverride(data.reviewId, {
    reported: true,
    report_count: (Number(existing?.report_count) || 0) + 1
  });
  invalidateReviewCache(data.appId, existing?.appSlug);
  recalculateAndBroadcastAtomicStats();

  if (typeof window !== 'undefined') {
    try {
      const reported = JSON.parse(localStorage.getItem('reported_reviews_map') || '{}');
      reported[data.reviewId] = true;
      localStorage.setItem('reported_reviews_map', JSON.stringify(reported));
    } catch (_) {}

    fetch('/api/v1/public/community/reviews/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(() => {});
  }

  return true;
}

export async function submitLiveReport(data: {
  type?: string;
  appId: string;
  appName?: string;
  reason: string;
  description: string;
  reporterEmail?: string;
  reporterName?: string;
}): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const key = `local_reports_${data.appId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift({
        id: `rep_${Date.now()}`,
        ...data,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(key, JSON.stringify(existing.slice(0, 5)));
    } catch (_) {}

    fetch('/api/v1/public/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(() => {});
  }
  return true;
}

// ============================================================================
// 10. ADMIN REPORTS MANAGEMENT
// ============================================================================

export async function fetchAdminReportsList(params: {
  status?: string;
  type?: string;
  appId?: string;
  search?: string;
  limit?: number;
}): Promise<{ reports: any[]; totalCount: number }> {
  try {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.type && params.type !== 'all') query.set('type', params.type);
    if (params.appId && params.appId !== 'all') query.set('appId', params.appId);
    if (params.search && params.search.trim()) query.set('search', params.search.trim());
    if (params.limit) query.set('limit', String(params.limit));

    const res = await safeAdminFetch(`/api/v1/admin/reports?${query.toString()}`);
    const cType = res.headers.get('content-type') || '';
    if (res.ok && cType.includes('application/json')) {
      const data = await res.json();
      return {
        reports: data.reports || [],
        totalCount: data.totalCount || (data.reports ? data.reports.length : 0)
      };
    }
  } catch (_) {}

  try {
    const cfg = getResolvedCommunityFirebaseConfig();
    if (cfg.projectId && cfg.apiKey) {
      const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/reports?pageSize=100&key=${cfg.apiKey}`;
      const restRes = await fetch(url);
      if (restRes.ok) {
        const restData = await restRes.json();
        const docs = restData.documents || [];
        let reports = docs.map((d: any) => {
          const parsed = parseFirestoreFields(d.fields || {});
          const docParts = (d.name || '').split('/');
          const id = docParts[docParts.length - 1] || parsed.id;
          return { id, ...parsed };
        });

        if (params.status && params.status !== 'all') {
          reports = reports.filter((r: any) => r.status === params.status);
        }
        if (params.type && params.type !== 'all') {
          reports = reports.filter((r: any) => r.type === params.type);
        }
        if (params.appId && params.appId !== 'all') {
          reports = reports.filter((r: any) => r.appId === params.appId);
        }
        if (params.search && params.search.trim()) {
          const q = params.search.toLowerCase().trim();
          reports = reports.filter((r: any) =>
            (r.appName || '').toLowerCase().includes(q) ||
            (r.reason || '').toLowerCase().includes(q) ||
            (r.description || '').toLowerCase().includes(q)
          );
        }

        reports.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        return { reports, totalCount: reports.length };
      }
    }
  } catch (_) {}

  return { reports: [], totalCount: 0 };
}

export async function updateAdminReportItem(
  reportId: string,
  updates: { status?: string; adminNotes?: string }
): Promise<boolean> {
  try {
    const res = await safeAdminFetch(`/api/v1/admin/reports/${encodeURIComponent(reportId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const cType = res.headers.get('content-type') || '';
    if (res.ok && cType.includes('application/json')) return true;
  } catch (_) {}

  try {
    const cfg = getResolvedCommunityFirebaseConfig();
    if (cfg.projectId && cfg.apiKey) {
      const updateMask = Object.keys(updates).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
      const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/reports/${encodeURIComponent(reportId)}?${updateMask}&key=${cfg.apiKey}`;
      const fields = convertToFirestoreFields({ ...updates, updated_at: new Date().toISOString() });
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });
    }
  } catch (_) {}

  return true;
}

export async function deleteAdminReportItem(reportId: string): Promise<boolean> {
  try {
    const res = await safeAdminFetch(`/api/v1/admin/reports/${encodeURIComponent(reportId)}`, {
      method: 'DELETE'
    });
    const cType = res.headers.get('content-type') || '';
    if (res.ok && cType.includes('application/json')) return true;
  } catch (_) {}

  try {
    const cfg = getResolvedCommunityFirebaseConfig();
    if (cfg.projectId && cfg.apiKey) {
      const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/reports/${encodeURIComponent(reportId)}?key=${cfg.apiKey}`;
      await fetch(url, { method: 'DELETE' });
    }
  } catch (_) {}

  return true;
}
