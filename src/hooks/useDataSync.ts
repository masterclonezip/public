import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppConfig, GlobalSettings, NewsItem, VideoItem } from '../types';
import { mockApps, mockSettings, mockNews, mockVideos } from '../lib/staticData';
import { adminFetch } from '../services/adminAuthService';
import { db, isFirebaseReal, hydrateFirebaseRuntimeConfig, readFirestoreDoc } from '../lib/firebase';

export function useDataSync() {
  const initialData = (typeof window !== 'undefined' && (window as any).__INITIAL_DATA__) || null;

  const [apps, setApps] = useState<AppConfig[]>(() => Array.isArray(initialData?.apps) ? initialData.apps : (mockApps || []));
  const [settings, setSettings] = useState<GlobalSettings>(() => initialData?.settings || mockSettings || {} as GlobalSettings);
  const [news, setNews] = useState<NewsItem[]>(() => Array.isArray(initialData?.news) ? initialData.news : (mockNews || []));
  const [videos, setVideos] = useState<VideoItem[]>(() => Array.isArray(initialData?.videos) ? initialData.videos : (mockVideos || []));
  
  const [loading, setLoading] = useState(!initialData);
  const [loadedFromServer, setLoadedFromServer] = useState(!!initialData);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [syncVersion, setSyncVersion] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'firebase' | 'local_backup' | 'loading'>('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [syncStates, setSyncStates] = useState({
    apps: !!initialData?.apps,
    settings: !!initialData?.settings,
    news: !!initialData?.news,
    videos: !!initialData?.videos
  });

  const [fetchedStates, setFetchedStates] = useState({
    apps: false,
    settings: false,
    news: false,
    videos: false
  });

  const checkIsQuotaError = useCallback((err: any) => {
    const msg = String(err?.message || err || '').toLowerCase();
    const code = String(err?.code || '').toLowerCase();
    return msg.includes('quota') || msg.includes('exhausted') || code.includes('quota') || code.includes('exhausted') || msg.includes('429');
  }, []);

  const withServerConfirmation = useCallback(async (operation: () => Promise<any>, timeoutMs: number = 30000) => {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Cloud Sync Timeout")), timeoutMs)
    );
    return Promise.race([operation(), timeoutPromise]);
  }, []);

  const checkLoaded = useCallback((key: keyof typeof syncStates) => {
    setSyncStates(prev => ({ ...prev, [key]: true }));
  }, []);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      await hydrateFirebaseRuntimeConfig();

      let data: any = null;
      try {
        const res = await adminFetch('/api/v1/admin/data');
        if (res.ok) {
          data = await res.json();
        }
      } catch (adminErr) {
        console.warn("adminFetch /api/v1/admin/data error:", adminErr);
      }

      // If admin data fetch succeeded with real Firestore or local_backup data (not an empty static_fallback)
      if (data && data.source !== 'static_fallback' && (Array.isArray(data.apps) || data.settings)) {
        if (data.source === 'firebase' || data.source === 'local_backup') {
          setDataSource(data.source);
        } else {
          setDataSource('firebase');
        }
        if (data.quotaExceeded) {
          setQuotaExceeded(true);
        }
        if (Array.isArray(data.apps)) {
          setApps(data.apps);
        }
        if (data.settings && typeof data.settings === 'object' && Object.keys(data.settings).length > 0) {
          setSettings(data.settings);
        }
        if (Array.isArray(data.news)) {
          setNews(data.news);
        }
        if (Array.isArray(data.videos)) {
          setVideos(data.videos);
        }
      } else {
        // Direct Firestore load (SDK + REST fallback) for static hosts / Cloudflare Pages
        let loadedFromDirectFirestore = false;
        if (isFirebaseReal) {
          try {
            const [
              metaSnap,
              settingsSnap,
              publicSettingsSnap,
              faqsSnap,
              devsSnap,
              linksSnap,
              newsSnap,
              videosSnap
            ] = await Promise.all([
              readFirestoreDoc('store_data', 'apps_meta'),
              readFirestoreDoc('store_data', 'settings'),
              readFirestoreDoc('store_data', 'public_settings'),
              readFirestoreDoc('store_data', 'faqs'),
              readFirestoreDoc('store_data', 'developers'),
              readFirestoreDoc('store_data', 'quick_links'),
              readFirestoreDoc('store_data', 'news'),
              readFirestoreDoc('store_data', 'videos')
            ]);

            const metaExists = metaSnap.exists && metaSnap.data;
            const maxChunks = metaExists && Number(metaSnap.data?.numChunks) >= 0
              ? Number(metaSnap.data?.numChunks)
              : 4;

            const chunkSnaps = maxChunks > 0
              ? await Promise.all(
                  Array.from({ length: maxChunks }, (_, i) =>
                    readFirestoreDoc('store_data', `apps_chunk_${i}`)
                  )
                )
              : [];

            let loadedApps: AppConfig[] = [];
            let anyChunkExists = false;
            const seenAppKeys = new Set<string>();
            chunkSnaps.forEach(chunk => {
              if (chunk.exists && chunk.data) {
                anyChunkExists = true;
                const items = chunk.data.items || chunk.data.apps || [];
                if (Array.isArray(items)) {
                  items.forEach((item: any) => {
                    const key = item.id || item.slug;
                    if (key && !seenAppKeys.has(key)) {
                      seenAppKeys.add(key);
                      loadedApps.push(item);
                    }
                  });
                }
              }
            });

            if (loadedApps.length > 0) {
              setApps(loadedApps);
              loadedFromDirectFirestore = true;
            }

            let loadedSettings: any = {};
            if (settingsSnap.exists && settingsSnap.data) {
              loadedSettings = { ...loadedSettings, ...settingsSnap.data };
              loadedFromDirectFirestore = true;
            }
            if (publicSettingsSnap.exists && publicSettingsSnap.data) {
              loadedSettings = { ...loadedSettings, ...publicSettingsSnap.data };
              loadedFromDirectFirestore = true;
            }
            if (faqsSnap.exists && faqsSnap.data) {
              if (Array.isArray(faqsSnap.data.items) && faqsSnap.data.items.length > 0) loadedSettings.website_faqs = faqsSnap.data.items;
              loadedFromDirectFirestore = true;
            }
            if (devsSnap.exists && devsSnap.data) {
              if (Array.isArray(devsSnap.data.items) && devsSnap.data.items.length > 0) loadedSettings.developers = devsSnap.data.items;
              loadedFromDirectFirestore = true;
            }
            if (linksSnap.exists && linksSnap.data) {
              if (Array.isArray(linksSnap.data.items) && linksSnap.data.items.length > 0) loadedSettings.quick_links = linksSnap.data.items;
              loadedFromDirectFirestore = true;
            }

            if (Object.keys(loadedSettings).length > 0) {
              setSettings(prev => ({ ...prev, ...loadedSettings }));
              loadedFromDirectFirestore = true;
            }

            if (newsSnap.exists && newsSnap.data) {
              const items = newsSnap.data.items || newsSnap.data.news || [];
              if (Array.isArray(items) && items.length > 0) {
                setNews(items);
                loadedFromDirectFirestore = true;
              }
            }

            if (videosSnap.exists && videosSnap.data) {
              const items = videosSnap.data.items || videosSnap.data.videos || [];
              if (Array.isArray(items) && items.length > 0) {
                setVideos(items);
                loadedFromDirectFirestore = true;
              }
            }

            if (loadedFromDirectFirestore) {
              setDataSource('firebase');
              setIsConnected(true);
              setIsLive(true);
            }
          } catch (directErr) {
            console.warn("[useDataSync] Direct Firestore load notice:", directErr);
          }
        }

        // If direct Firestore had 0 apps, load backup catalog data
        setApps(prev => {
          if (Array.isArray(prev) && prev.length > 0) return prev;
          return (mockApps as any) || [];
        });
        setNews(prev => {
          if (Array.isArray(prev) && prev.length > 0) return prev;
          return (mockNews as any) || [];
        });
        setVideos(prev => {
          if (Array.isArray(prev) && prev.length > 0) return prev;
          return (mockVideos as any) || [];
        });

        if (!loadedFromDirectFirestore) {
          // Fallback: try public backup-data endpoint
          try {
            const publicRes = await fetch('/api/v1/public/backup-data');
            const cType = publicRes.headers.get('content-type') || '';
            if (publicRes.ok && cType.includes('application/json')) {
              const publicData = await publicRes.json();
              if (Array.isArray(publicData.apps) && publicData.apps.length > 0) {
                setApps(publicData.apps);
              }
              if (publicData.settings && Object.keys(publicData.settings).length > 0) {
                setSettings(publicData.settings);
              }
              if (Array.isArray(publicData.news) && publicData.news.length > 0) {
                setNews(publicData.news);
              }
              if (Array.isArray(publicData.videos) && publicData.videos.length > 0) {
                setVideos(publicData.videos);
              }
            }
          } catch (_) {}

          setApps(prev => (Array.isArray(prev) && prev.length > 0 ? prev : (mockApps as any || [])));
          setSettings(prev => (prev && Object.keys(prev).length > 0 ? prev : (mockSettings as any || {} as GlobalSettings)));
          setNews(prev => (Array.isArray(prev) && prev.length > 0 ? prev : (mockNews as any || [])));
          setVideos(prev => (Array.isArray(prev) && prev.length > 0 ? prev : (mockVideos as any || [])));
          setDataSource(isFirebaseReal ? 'firebase' : 'local_backup');
        }
      }

      setFetchedStates({ apps: true, settings: true, news: true, videos: true });
      setSyncStates({ apps: true, settings: true, news: true, videos: true });
      setLastSyncTime(new Date().toLocaleTimeString());
      setIsConnected(true);
      setIsLive(true);
    } catch (err: any) {
      console.error("useDataSync fetch error:", err);
      setApps(prev => (prev && prev.length > 0 ? prev : (mockApps as any || [])));
      setSettings(prev => (prev && Object.keys(prev).length > 0 ? prev : (mockSettings as any || {} as GlobalSettings)));
      setNews(prev => (prev && prev.length > 0 ? prev : (mockNews as any || [])));
      setVideos(prev => (prev && prev.length > 0 ? prev : (mockVideos as any || [])));
      setDataSource('local_backup');
      if (checkIsQuotaError(err)) {
        setQuotaExceeded(true);
      }
    } finally {
      setLoading(false);
      setLoadedFromServer(true);
      if (!silent) setIsRefreshing(false);
    }
  }, [checkIsQuotaError]);

  // Initial load and runtime hydration listener
  useEffect(() => {
    loadData(false);
    const handleHydrated = () => {
      loadData(true);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('firebase_runtime_hydrated', handleHydrated);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('firebase_runtime_hydrated', handleHydrated);
      }
    };
  }, [loadData]);

  // Monitor syncStates to clear loading
  useEffect(() => {
    if (syncStates.apps && syncStates.settings && syncStates.news) {
      setLoading(false);
      setLoadedFromServer(true);
      setIsConnected(true);
      setIsLive(true);
    }
  }, [syncStates]);

  return {
    apps, setApps,
    settings, setSettings,
    news, setNews,
    videos, setVideos,
    loading, setLoading,
    loadedFromServer, setLoadedFromServer,
    isConnected, setIsConnected,
    isLive, setIsLive,
    quotaExceeded, setQuotaExceeded,
    syncStates, setSyncStates,
    fetchedStates, setFetchedStates,
    syncVersion, setSyncVersion,
    lastSyncTime, setLastSyncTime,
    dataSource, setDataSource,
    isRefreshing,
    reloadServerData: loadData,
    checkIsQuotaError,
    withServerConfirmation
  };
}
