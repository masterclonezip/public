import { useState, useEffect, useRef } from 'react';
import { adminFetch } from '../services/adminAuthService';
import { sessionStore } from '../lib/sessionStore';
import { mockApps } from '../lib/staticData';
import { safeDecrypt } from '../lib/cryptoUtils';

export const useAdminApps = (apps: any[], loading: boolean, isAdminUser: boolean | null) => {
  const [appsList, setAppsList] = useState<any[]>(() => (Array.isArray(apps) && apps.length > 0 ? apps : (mockApps || [])));
  const [fetchFailed, setFetchFailed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const cachedSecureMapRef = useRef(new Map());
  const deletedAppIdsRef = useRef(new Set<string>());

  const recordAppDeletion = (id: string) => {
    deletedAppIdsRef.current.add(id);
    setAppsList(prev => prev.filter(a => a.id !== id && a.slug !== id));
  };

  const syncSecureVault = async (force = false, latestAppsList?: any[]) => {
    try {
      const currentList = latestAppsList || appsList;
      const items = Array.from(cachedSecureMapRef.current.entries()).map(([k, v]) => {
        const app = currentList.find(a => a.id === k || a.slug === k);
        return {
          id: app?.id || k,
          slug: app?.slug || k,
          url: v
        };
      });
      if (items.length === 0) return;
      const res = await adminFetch('/api/v1/admin/encrypt-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items })
      });
      if (!res.ok) {
        console.warn("[AdminApps] Secure vault sync response notice:", await res.text());
      }
    } catch (e: any) {
      console.warn("[AdminApps] Secure vault sync network error:", e.message || e);
    }
  };

  // 1. Initial vault links loader
  useEffect(() => {
    if (!loading && isAdminUser === true && !isInitialized) {
      const loadVault = async () => {
        try {
          const secureMap = new Map();
          
          try {
            const debugRes = await adminFetch('/api/v1/admin/debug-links');
            if (debugRes.ok) {
              const debugData = await debugRes.json();
              if (debugData.decrypted && Array.isArray(debugData.decrypted)) {
                debugData.decrypted.forEach((it: any) => {
                  if (it && it.id && it.url) secureMap.set(it.id, it.url);
                });
              }
            }
          } catch (debugErr) {
            console.warn("Failed fetching debug-links, trying fallback...", debugErr);
          }

          // Fallback from container backup
          try {
            const bkRes = await adminFetch('/api/v1/admin/backup-links-get');
            if (bkRes.ok) {
              const bkJSON = await bkRes.json();
              if (bkJSON && bkJSON.items && Array.isArray(bkJSON.items)) {
                bkJSON.items.forEach((it: any) => {
                  if (it && it.id && it.url && !secureMap.has(it.id)) {
                    secureMap.set(it.id, it.url);
                  }
                });
              }
            }
          } catch (bkErr) {}

          // Session recovery
          try {
            const recoveredStr = sessionStore.getItem('rummystore_recovered_links');
            if (recoveredStr) {
              const recovered = JSON.parse(recoveredStr);
              Object.entries(recovered).forEach(([id, url]) => {
                if (url && typeof url === 'string' && !secureMap.has(id)) secureMap.set(id, url);
              });
            }
          } catch (e) {}

          cachedSecureMapRef.current = secureMap;
          
          // Map incoming apps with decrypted links
          const sourceApps = (Array.isArray(apps) && apps.length > 0) ? apps : (appsList.length > 0 ? appsList : (mockApps || []));
          const mergedApps = sourceApps.map(a => {
            const rawUrl = a.more_information_url || a.encrypted_link || '';
            const preservedCipher = (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('U2FsdGVkX1'))
              ? rawUrl
              : ((a.encrypted_link && typeof a.encrypted_link === 'string' && a.encrypted_link.startsWith('U2FsdGVkX1')) ? a.encrypted_link : '');
            const decryptedFromUrl = (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('U2FsdGVkX1')) ? safeDecrypt(rawUrl) : rawUrl;
            const existingUrl = decryptedFromUrl || secureMap.get(a.id) || (a.slug && secureMap.get(a.slug)) || '';
            if (existingUrl) {
              if (a.id && !secureMap.has(a.id)) secureMap.set(a.id, existingUrl);
              if (a.slug && !secureMap.has(a.slug)) secureMap.set(a.slug, existingUrl);
            }
            let descHtml = a.description_html ?? '';
            let featHtml = a.features_html ?? '';
            if (a.description_html === undefined || a.description_html === null) {
              const staticFallback = (mockApps || []).find((m: any) => (m.id && m.id === a.id) || (m.slug && a.slug && m.slug.toLowerCase() === a.slug.toLowerCase()));
              if (staticFallback?.description_html) descHtml = staticFallback.description_html;
            }
            if (a.features_html === undefined || a.features_html === null) {
              const staticFallback = (mockApps || []).find((m: any) => (m.id && m.id === a.id) || (m.slug && a.slug && m.slug.toLowerCase() === a.slug.toLowerCase()));
              if (staticFallback?.features_html) featHtml = staticFallback.features_html;
            }

            return {
              ...a, 
              description_html: descHtml,
              features_html: featHtml,
              more_information_url: existingUrl,
              encrypted_link: preservedCipher || a.encrypted_link || ''
            };
          });
          setAppsList(mergedApps);
          setIsInitialized(true);
        } catch (err) {
          setFetchFailed(true);
          setAppsList(prev => (Array.isArray(prev) && prev.length > 0 ? prev : (Array.isArray(apps) && apps.length > 0 ? apps : (mockApps || []))));
          setIsInitialized(true);
        }
      };
      loadVault();
    }
  }, [loading, isAdminUser, isInitialized, apps]);

  // 2. Authoritative Sync: Whenever fresh apps arrive from the server (multi-device sync), adopt them directly
  useEffect(() => {
    if (Array.isArray(apps) && apps.length > 0) {
      const secureMap = cachedSecureMapRef.current;
      const mapped = apps
        .filter(a => !deletedAppIdsRef.current.has(a.id) && !deletedAppIdsRef.current.has(a.slug))
        .map(a => {
          const rawLink = a.more_information_url || a.encrypted_link || '';
          const preservedCipher = (rawLink && typeof rawLink === 'string' && rawLink.startsWith('U2FsdGVkX1'))
            ? rawLink
            : ((a.encrypted_link && typeof a.encrypted_link === 'string' && a.encrypted_link.startsWith('U2FsdGVkX1')) ? a.encrypted_link : '');
          const decryptedFromLink = (rawLink && typeof rawLink === 'string' && rawLink.startsWith('U2FsdGVkX1')) ? safeDecrypt(rawLink) : rawLink;
          const link = decryptedFromLink || secureMap.get(a.id) || (a.slug && secureMap.get(a.slug)) || '';
          if (link) {
            if (a.id && !secureMap.has(a.id)) secureMap.set(a.id, link);
            if (a.slug && !secureMap.has(a.slug)) secureMap.set(a.slug, link);
          }

          let descHtml = a.description_html ?? '';
          let featHtml = a.features_html ?? '';
          if (a.description_html === undefined || a.description_html === null) {
            const existingApp = (appsList || []).find((m: any) => (m.id && m.id === a.id) || (m.slug && a.slug && m.slug.toLowerCase() === a.slug.toLowerCase()));
            if (existingApp?.description_html) {
              descHtml = existingApp.description_html;
            } else {
              const staticFallback = (mockApps || []).find((m: any) => (m.id && m.id === a.id) || (m.slug && a.slug && m.slug.toLowerCase() === a.slug.toLowerCase()));
              if (staticFallback?.description_html) descHtml = staticFallback.description_html;
            }
          }
          if (a.features_html === undefined || a.features_html === null) {
            const existingApp = (appsList || []).find((m: any) => (m.id && m.id === a.id) || (m.slug && a.slug && m.slug.toLowerCase() === a.slug.toLowerCase()));
            if (existingApp?.features_html) {
              featHtml = existingApp.features_html;
            } else {
              const staticFallback = (mockApps || []).find((m: any) => (m.id && m.id === a.id) || (m.slug && a.slug && m.slug.toLowerCase() === a.slug.toLowerCase()));
              if (staticFallback?.features_html) featHtml = staticFallback.features_html;
            }
          }

          return {
            ...a,
            description_html: descHtml,
            features_html: featHtml,
            more_information_url: link,
            encrypted_link: preservedCipher || a.encrypted_link || ''
          };
        });

      setAppsList(mapped);
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

