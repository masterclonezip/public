import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppConfig, GlobalSettings, NewsItem, VideoItem } from '../types';
import { mockApps, mockSettings, mockNews, mockVideos } from '../lib/staticData';
import { adminFetch } from '../services/adminAuthService';
import { db, isFirebaseReal } from '../lib/firebase';

export function useDataSync() {
  const initialData = (typeof window !== 'undefined' && (window as any).__INITIAL_DATA__) || null;

  const [apps, setApps] = useState<AppConfig[]>(() => (initialData?.apps && initialData.apps.length > 0) ? initialData.apps : (mockApps || []));
  const [settings, setSettings] = useState<GlobalSettings>(() => initialData?.settings || mockSettings || {} as GlobalSettings);
  const [news, setNews] = useState<NewsItem[]>(() => (initialData?.news && Array.isArray(initialData.news) && initialData.news.length > 0) ? initialData.news : (mockNews || []));
  const [videos, setVideos] = useState<VideoItem[]>(() => (initialData?.videos && Array.isArray(initialData.videos) && initialData.videos.length > 0) ? initialData.videos : (mockVideos || []));
  
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
      let data: any = null;
      try {
        const res = await adminFetch('/api/v1/admin/data');
        if (res.ok) {
          data = await res.json();
        }
      } catch (adminErr) {
        console.warn("adminFetch /api/v1/admin/data error:", adminErr);
      }

      // If admin data fetch succeeded
      if (data && (Array.isArray(data.apps) || data.settings)) {
        if (data.source === 'firebase' || data.source === 'local_backup') {
          setDataSource(data.source);
        } else {
          setDataSource('firebase');
        }
        if (data.quotaExceeded) {
          setQuotaExceeded(true);
        }
        if (Array.isArray(data.apps) && data.apps.length > 0) {
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
        // Direct Firestore load for static hosts (Cloudflare Pages)
        let loadedFromDirectFirestore = false;
        if (isFirebaseReal && db) {
          try {
            const { doc, getDoc } = await import('firebase/firestore');
            const chunkPromises = Array.from({ length: 16 }, (_, i) => 
              getDoc(doc(db, 'store_data', `apps_chunk_${i}`)).catch(() => null)
            );
            const [
              metaSnap,
              chunks, 
              settingsSnap, 
              publicSettingsSnap, 
              faqsSnap, 
              devsSnap, 
              linksSnap, 
              newsSnap, 
              videosSnap
            ] = await Promise.all([
              getDoc(doc(db, 'store_data', 'apps_meta')).catch(() => null),
              Promise.all(chunkPromises),
              getDoc(doc(db, 'store_data', 'settings')).catch(() => null),
              getDoc(doc(db, 'store_data', 'public_settings')).catch(() => null),
              getDoc(doc(db, 'store_data', 'faqs')).catch(() => null),
              getDoc(doc(db, 'store_data', 'developers')).catch(() => null),
              getDoc(doc(db, 'store_data', 'quick_links')).catch(() => null),
              getDoc(doc(db, 'store_data', 'news')).catch(() => null),
              getDoc(doc(db, 'store_data', 'videos')).catch(() => null)
            ]);

            const maxChunks = (metaSnap && metaSnap.exists && metaSnap.exists() && Number(metaSnap.data()?.numChunks) > 0)
              ? Number(metaSnap.data()?.numChunks)
              : chunks.length;

            let loadedApps: AppConfig[] = [];
            const seenAppKeys = new Set<string>();
            chunks.slice(0, maxChunks).forEach(chunk => {
              if (chunk && chunk.exists && chunk.exists()) {
                const chunkData = chunk.data();
                const items = chunkData.items || chunkData.apps || [];
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
            if (settingsSnap && settingsSnap.exists && settingsSnap.exists()) {
              loadedSettings = { ...loadedSettings, ...settingsSnap.data() };
              loadedFromDirectFirestore = true;
            }
            if (publicSettingsSnap && publicSettingsSnap.exists && publicSettingsSnap.exists()) {
              loadedSettings = { ...loadedSettings, ...publicSettingsSnap.data() };
              loadedFromDirectFirestore = true;
            }
            if (faqsSnap && faqsSnap.exists && faqsSnap.exists()) {
              const fData = faqsSnap.data();
              if (Array.isArray(fData?.items)) loadedSettings.website_faqs = fData.items;
              loadedFromDirectFirestore = true;
            }
            if (devsSnap && devsSnap.exists && devsSnap.exists()) {
              const dData = devsSnap.data();
              if (Array.isArray(dData?.items)) loadedSettings.developers = dData.items;
              loadedFromDirectFirestore = true;
            }
            if (linksSnap && linksSnap.exists && linksSnap.exists()) {
              const lData = linksSnap.data();
              if (Array.isArray(lData?.items)) loadedSettings.quick_links = lData.items;
              loadedFromDirectFirestore = true;
            }

            if (Object.keys(loadedSettings).length > 0) {
              setSettings(prev => ({ ...prev, ...loadedSettings }));
              loadedFromDirectFirestore = true;
            }

            if (newsSnap && newsSnap.exists && newsSnap.exists()) {
              const newsData = newsSnap.data();
              const items = newsData.items || newsData.news || [];
              if (Array.isArray(items)) {
                setNews(items);
                loadedFromDirectFirestore = true;
              }
            }

            if (videosSnap && videosSnap.exists && videosSnap.exists()) {
              const vidData = videosSnap.data();
              const items = vidData.items || vidData.videos || [];
              if (Array.isArray(items)) {
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

          // Guarantee mockApps fallback if apps are still empty
          setApps(prev => (prev && prev.length > 0 ? prev : (mockApps as any || [])));
          setSettings(prev => (prev && Object.keys(prev).length > 0 ? prev : (mockSettings as any || {} as GlobalSettings)));
          setNews(prev => (prev && prev.length > 0 ? prev : (mockNews as any || [])));
          setVideos(prev => (prev && prev.length > 0 ? prev : (mockVideos as any || [])));
          setDataSource('local_backup');
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

  // Initial load
  useEffect(() => {
    loadData(false);
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
