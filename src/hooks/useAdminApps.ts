import { useState, useEffect, useRef } from 'react';
import { adminFetch } from '../services/adminAuthService';
import { sessionStore } from '../lib/sessionStore';
import { mockApps } from '../lib/staticData';
import { safeDecrypt } from '../lib/cryptoUtils';

// Pre-build O(1) lookup maps for static fallback once at module load
const STATIC_BY_ID = new Map<string, any>();
const STATIC_BY_SLUG = new Map<string, any>();
if (Array.isArray(mockApps)) {
  for (const m of mockApps) {
    if (m?.id) STATIC_BY_ID.set(String(m.id), m);
    if (m?.slug) STATIC_BY_SLUG.set(String(m.slug).toLowerCase(), m);
  }
}

// Global in-memory cache of decrypted AES ciphertexts to prevent repeated synchronous crypto on UI thread
const DECRYPTED_CIPHER_CACHE = new Map<string, string>();
function fastDecryptCached(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed.startsWith('U2FsdGVkX1')) return trimmed;
  const cached = DECRYPTED_CIPHER_CACHE.get(trimmed);
  if (cached !== undefined) return cached;
  const dec = safeDecrypt(trimmed) || '';
  DECRYPTED_CIPHER_CACHE.set(trimmed, dec);
  return dec;
}

export const useAdminApps = (apps: any[], loading: boolean, isAdminUser: boolean | null) => {
  const [appsList, setAppsList] = useState<any[]>(() => (Array.isArray(apps) && apps.length > 0 ? apps : (mockApps || [])));
  const [fetchFailed, setFetchFailed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const cachedSecureMapRef = useRef(new Map<string, string>());
  const deletedAppIdsRef = useRef(new Set<string>());

  const recordAppDeletion = (id: string) => {
    deletedAppIdsRef.current.add(id);
    setAppsList(prev => prev.filter(a => a.id !== id && a.slug !== id));
  };

  const syncSecureVault = async (_force = false, latestAppsList?: any[]) => {
    try {
      const currentList = latestAppsList || appsList;
      const byKey = new Map<string, any>();
      for (const a of currentList) {
        if (a?.id) byKey.set(a.id, a);
        if (a?.slug) byKey.set(a.slug, a);
      }
      const items = Array.from(cachedSecureMapRef.current.entries()).map(([k, v]) => {
        const app = byKey.get(k);
        return {
          id: app?.id || k,
          slug: app?.slug || k,
          url: v
        };
      });
      if (items.length === 0) return;
      await adminFetch('/api/v1/admin/encrypt-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
    } catch (_) {}
  };

  // 1. Initial vault links loader (O(N) with cached crypto)
  useEffect(() => {
    if (!loading && isAdminUser === true && !isInitialized) {
      const loadVault = async () => {
        try {
          const secureMap = new Map<string, string>();
          try {
            const debugRes = await adminFetch('/api/v1/admin/debug-links');
            if (debugRes.ok) {
              const debugData = await debugRes.json();
              if (Array.isArray(debugData?.decrypted)) {
                for (const it of debugData.decrypted) {
                  if (it?.id && it?.url) secureMap.set(it.id, it.url);
                }
              }
            }
          } catch (_) {}

          try {
            const recoveredStr = sessionStore.getItem('platform_recovered_links');
            if (recoveredStr) {
              const recovered = JSON.parse(recoveredStr);
              for (const [id, url] of Object.entries(recovered)) {
                if (url && typeof url === 'string' && !secureMap.has(id)) {
                  secureMap.set(id, url);
                }
              }
            }
          } catch (_) {}

          cachedSecureMapRef.current = secureMap;

          const sourceApps = Array.isArray(apps) && apps.length > 0 ? apps : (appsList.length > 0 ? appsList : (mockApps || []));
          const mergedApps = sourceApps.map(a => {
            const staticFallback = (a.id && STATIC_BY_ID.get(String(a.id))) || (a.slug && STATIC_BY_SLUG.get(String(a.slug).toLowerCase()));
            const rawUrl = a.more_information_url || a.encrypted_link || staticFallback?.more_information_url || staticFallback?.encrypted_link || '';
            const preservedCipher = (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('U2FsdGVkX1'))
              ? rawUrl
              : ((a.encrypted_link && typeof a.encrypted_link === 'string' && a.encrypted_link.startsWith('U2FsdGVkX1')) ? a.encrypted_link : '');
            const decryptedFromUrl = fastDecryptCached(rawUrl);
            const existingUrl = decryptedFromUrl || secureMap.get(a.id) || (a.slug && secureMap.get(a.slug)) || '';
            if (existingUrl) {
              if (a.id && !secureMap.has(a.id)) secureMap.set(a.id, existingUrl);
              if (a.slug && !secureMap.has(a.slug)) secureMap.set(a.slug, existingUrl);
            }
            const descHtml = a.description_html !== undefined && a.description_html !== null
              ? a.description_html
              : (staticFallback?.description_html ?? '');
            const featHtml = a.features_html !== undefined && a.features_html !== null
              ? a.features_html
              : (staticFallback?.features_html ?? '');

            return {
              ...(staticFallback || {}),
              ...a,
              description_html: descHtml,
              features_html: featHtml,
              more_information_url: existingUrl,
              encrypted_link: preservedCipher || a.encrypted_link || ''
            };
          });
          setAppsList(mergedApps);
          setIsInitialized(true);
        } catch (_) {
          setFetchFailed(true);
          setIsInitialized(true);
        }
      };
      loadVault();
    }
  }, [loading, isAdminUser, isInitialized, apps]);

  // 2. Fast O(N) Authoritative Sync when apps change
  useEffect(() => {
    if (Array.isArray(apps) && apps.length > 0) {
      const secureMap = cachedSecureMapRef.current;
      setAppsList(prev => {
        const existingById = new Map<string, any>();
        const existingBySlug = new Map<string, any>();
        for (const item of prev || []) {
          if (item?.id) existingById.set(String(item.id), item);
          if (item?.slug) existingBySlug.set(String(item.slug).toLowerCase(), item);
        }

        return apps
          .filter(a => !deletedAppIdsRef.current.has(a.id) && !deletedAppIdsRef.current.has(a.slug))
          .map(a => {
            const existingApp = (a.id && existingById.get(String(a.id))) || (a.slug && existingBySlug.get(String(a.slug).toLowerCase()));
            const staticFallback = (a.id && STATIC_BY_ID.get(String(a.id))) || (a.slug && STATIC_BY_SLUG.get(String(a.slug).toLowerCase()));
            const rawLink = a.more_information_url || a.encrypted_link || existingApp?.more_information_url || '';
            const preservedCipher = (rawLink && typeof rawLink === 'string' && rawLink.startsWith('U2FsdGVkX1'))
              ? rawLink
              : ((a.encrypted_link && typeof a.encrypted_link === 'string' && a.encrypted_link.startsWith('U2FsdGVkX1')) ? a.encrypted_link : '');
            const decryptedFromLink = fastDecryptCached(rawLink);
            const link = decryptedFromLink || secureMap.get(a.id) || (a.slug && secureMap.get(a.slug)) || '';
            if (link) {
              if (a.id && !secureMap.has(a.id)) secureMap.set(a.id, link);
              if (a.slug && !secureMap.has(a.slug)) secureMap.set(a.slug, link);
            }

            const descHtml = a.description_html !== undefined && a.description_html !== null
              ? a.description_html
              : (existingApp?.description_html ?? staticFallback?.description_html ?? '');
            const featHtml = a.features_html !== undefined && a.features_html !== null
              ? a.features_html
              : (existingApp?.features_html ?? staticFallback?.features_html ?? '');

            return {
              ...(staticFallback || {}),
              ...(existingApp || {}),
              ...a,
              description_html: descHtml,
              features_html: featHtml,
              more_information_url: link,
              encrypted_link: preservedCipher || a.encrypted_link || ''
            };
          });
      });
    }
  }, [apps]);

  return {
    appsList,
    setAppsList,
    fetchFailed,
    cachedSecureMapRef,
    syncSecureVault,
    recordAppDeletion,
    deletedAppIdsRef
  };
};
