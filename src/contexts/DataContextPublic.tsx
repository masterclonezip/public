import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppConfig, GlobalSettings, NewsItem, VideoItem } from '../typesPublic';
import { mockApps, mockApps as staticMockApps, mockSettings, mockNews, mockVideos, loadFullStaticDataset } from '../lib/lightFallback';

interface DataContextType {
  apps: AppConfig[];
  settings: GlobalSettings;
  news: NewsItem[];
  videos: VideoItem[];
  loading: boolean;
  loadedFromServer: boolean;
  appsSyncedWithServer: boolean;
  settingsSyncedWithServer: boolean;
  newsSyncedWithServer: boolean;
  videosSyncedWithServer?: boolean;
  serverAppsFetched?: boolean;
  serverNewsFetched?: boolean;
  serverVideosFetched?: boolean;
  isConnected?: boolean;
  isLive?: boolean;
  quotaExceeded?: boolean;
  lastSyncTime?: string;
  refreshAll?: (silent?: boolean) => Promise<void>;
  testCloudConnection?: () => Promise<boolean>;

  saveSettings: (s: GlobalSettings) => Promise<void>;
  saveApp: (a: AppConfig, n?: boolean) => Promise<void>;
  deleteApp: (id: string) => Promise<void>;
  saveNews: (n: NewsItem) => Promise<void>;
  deleteNews: (id: string) => Promise<void>;
  saveVideo: (v: VideoItem) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
  syncDataToGithub: () => Promise<{ success: boolean; log: string }>;
  fetchApps: () => void;
  fetchSettings: () => void;
  fetchNews: () => void;
  fetchVideos: () => void;
  updateAppDetail?: (app: AppConfig) => void;
  mergeCatalogApps?: (incomingApps: AppConfig[]) => void;
  updateNewsDetail?: (newsItem: NewsItem) => void;
}

const DataContext = createContext<DataContextType | null>(null);

const DATA_CACHE_KEY = 'platform_public_data_cache_v5';

// Strict canonical deduplication utilities to guarantee zero duplicate app cards or news items
const mergeUniqueApps = (baseList: AppConfig[], incomingList: AppConfig[]): AppConfig[] => {
  const map = new Map<string, AppConfig>();
  const idToKey = new Map<string, string>();

  // 1. Seed base apps keyed by clean canonical slug / id
  for (const app of (baseList || [])) {
    if (!app) continue;
    const key = (app.slug || app.id || '').toLowerCase().trim();
    const idKey = (app.id || '').toLowerCase().trim();
    if (key) {
      map.set(key, { ...app });
      if (idKey) idToKey.set(idKey, key);
    }
  }

  const incomingKeys = new Set<string>();

  // 2. Merge incoming / updated items by ID or canonical key
  for (const app of (incomingList || [])) {
    if (!app) continue;
    const key = (app.slug || app.id || '').toLowerCase().trim();
    const idKey = (app.id || '').toLowerCase().trim();
    if (key) {
      incomingKeys.add(key);
      const prevKeyById = idKey ? idToKey.get(idKey) : undefined;
      const existing = map.get(key) || (prevKeyById ? map.get(prevKeyById) : undefined);
      if (prevKeyById && prevKeyById !== key) {
        map.delete(prevKeyById);
      }
      if (idKey) idToKey.set(idKey, key);

      if (existing) {
        map.set(key, {
          ...existing,
          ...app,
          description_html: (app.description_html && app.description_html.trim().length > 10)
            ? app.description_html
            : (existing.description_html || ''),
          features_html: (app.features_html && app.features_html.trim().length > 5)
            ? app.features_html
            : (existing.features_html || ''),
          screenshots: (Array.isArray(app.screenshots) && app.screenshots.length > 0)
            ? app.screenshots
            : (existing.screenshots || []),
          faqs: (Array.isArray(app.faqs) && app.faqs.length > 0)
            ? app.faqs
            : (existing.faqs || []),
          custom_admin_box_html: app.custom_admin_box_html || existing.custom_admin_box_html || '',
          custom_admin_box_heading: app.custom_admin_box_heading || existing.custom_admin_box_heading || '',
          release_notes: app.release_notes || existing.release_notes || '',
          yellow_box_msg: app.yellow_box_msg || existing.yellow_box_msg || '',
          red_box_msg: app.red_box_msg || existing.red_box_msg || '',
          idea_box_msg: app.idea_box_msg || existing.idea_box_msg || '',
        });
      } else {
        map.set(key, { ...app });
      }
    }
  }

  // When incomingList is a full catalog snapshot (not a trimmed route slice or partial chunk), enforce authoritative membership
  const isFullCatalogIncoming = Array.isArray(incomingList) && incomingList.length > 0 && incomingList.length >= (baseList?.length || 0) * 0.8;
  if (isFullCatalogIncoming) {
    return Array.from(map.entries())
      .filter(([k]) => incomingKeys.has(k))
      .map(([, v]) => v);
  }

  return Array.from(map.values());
};

const mergeUniqueNews = (baseList: NewsItem[], incomingList: NewsItem[]): NewsItem[] => {
  const map = new Map<string, NewsItem>();
  const idToKey = new Map<string, string>();

  for (const item of (baseList || [])) {
    if (!item) continue;
    const key = (item.slug || item.id || '').toLowerCase().trim();
    const idKey = (item.id || '').toLowerCase().trim();
    if (key) {
      map.set(key, { ...item });
      if (idKey) idToKey.set(idKey, key);
    }
  }

  const incomingKeys = new Set<string>();

  for (const item of (incomingList || [])) {
    if (!item) continue;
    const key = (item.slug || item.id || '').toLowerCase().trim();
    const idKey = (item.id || '').toLowerCase().trim();
    if (key) {
      incomingKeys.add(key);
      const prevKeyById = idKey ? idToKey.get(idKey) : undefined;
      const existing = map.get(key) || (prevKeyById ? map.get(prevKeyById) : undefined);
      if (prevKeyById && prevKeyById !== key) {
        map.delete(prevKeyById);
      }
      if (idKey) idToKey.set(idKey, key);

      if (existing) {
        const incomingContent = item.content || item.description_html || '';
        const existingContent = existing.content || existing.description_html || '';

        const isIncomingFull = incomingContent.trim().length > 250 && incomingContent.trim() !== (item.description || '').trim();
        const isExistingFull = existingContent.trim().length > 250 && existingContent.trim() !== (existing.description || '').trim();

        let finalContent = existingContent;
        if (isIncomingFull) {
          finalContent = incomingContent;
        } else if (!isExistingFull) {
          finalContent = incomingContent || existingContent;
        }

        map.set(key, {
          ...existing,
          ...item,
          content: finalContent,
          description_html: finalContent,
        });
      } else {
        map.set(key, { ...item });
      }
    }
  }

  const isFullNewsIncoming = Array.isArray(incomingList) && incomingList.length > 10 && incomingList.length >= (baseList?.length || 0) * 0.8;
  if (isFullNewsIncoming) {
    return Array.from(map.entries())
      .filter(([k]) => incomingKeys.has(k))
      .map(([, v]) => v);
  }

  return Array.from(map.values());
};

const getInitialCache = () => {
  try {
    if (typeof window !== 'undefined' && (window as any).__INITIAL_DATA__) {
      const initData = (window as any).__INITIAL_DATA__;
      if (initData && ((Array.isArray(initData.apps) && initData.apps.length > 0) || (Array.isArray(initData.news) && initData.news.length > 0))) {
        return initData;
      }
    }
  } catch (e) {}
  return null;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialCache = React.useMemo(() => getInitialCache(), []);

  const [apps, setApps] = useState<AppConfig[]>(() => {
    const initApps = (initialCache?.apps && Array.isArray(initialCache.apps)) ? initialCache.apps : [];
    const staticApps = (staticMockApps && Array.isArray(staticMockApps) && staticMockApps.length > 0) ? staticMockApps : mockApps;
    return mergeUniqueApps(staticApps, initApps);
  });
  
  const [settings, setSettings] = useState<GlobalSettings>(() => {
    if (initialCache?.settings && Object.keys(initialCache.settings).length > 0) {
      return { ...mockSettings, ...initialCache.settings };
    }
    return mockSettings;
  });
  
  const [news, setNews] = useState<NewsItem[]>(() => {
    const initNews = (initialCache?.news && Array.isArray(initialCache.news)) ? initialCache.news : [];
    const staticNews = (mockNews && Array.isArray(mockNews)) ? mockNews : [];
    return mergeUniqueNews(staticNews, initNews);
  });
  
  const [videos, setVideos] = useState<VideoItem[]>(() => {
    if (initialCache?.videos && Array.isArray(initialCache.videos) && initialCache.videos.length > 0) {
      return initialCache.videos;
    }
    return mockVideos;
  });

  const [loading, setLoading] = useState(() => apps.length === 0);
  const [loadedFromServer, setLoadedFromServer] = useState(() => apps.length > 0);
  const [isLive, setIsLive] = useState(true);

  // Dedicated lightweight fetchers for each section on-demand when URL/route changes
  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/public/news', {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const payload = await res.json();
        if (payload?.news && Array.isArray(payload.news) && payload.news.length > 0) {
          setNews(prev => mergeUniqueNews(prev, payload.news));
        }
      }
    } catch (e) {
      console.warn("Public news fetch warning:", e);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/public/settings', {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const payload = await res.json();
        if (payload?.settings && Object.keys(payload.settings).length > 0) {
          setSettings(prev => ({ ...prev, ...payload.settings }));
        }
      }
    } catch (e) {
      console.warn("Public settings fetch warning:", e);
    }
  }, []);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/public/videos', {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const payload = await res.json();
        if (payload?.videos && Array.isArray(payload.videos) && payload.videos.length > 0) {
          setVideos(payload.videos);
        }
      }
    } catch (e) {
      console.warn("Public videos fetch warning:", e);
    }
  }, []);

  // Fetch from server backup endpoint with fast memory caching (zero main-thread localStorage serialization stall)
  const fetchBackupData = useCallback(async (silent = false) => {
    try {
      if (!silent && apps.length === 0) setLoading(true);
      const res = await fetch('/api/v1/public/backup-data', {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const backup = await res.json();
        if (backup) {
          try {
            // Remove legacy multi-megabyte localStorage entry if present to free browser storage and avoid main-thread stalls
            localStorage.removeItem(DATA_CACHE_KEY);
          } catch (e) {}

          if (backup.apps && Array.isArray(backup.apps)) {
            if (backup.apps.length > 0) {
              setApps(prev => {
                if (prev.length === backup.apps.length) {
                  const prevHasNewerOrEqual = prev.every((p, idx) => {
                    const b = backup.apps[idx];
                    return b && p.slug === b.slug && p.seo_title === b.seo_title && p.updated_at === b.updated_at && Boolean(p.description_html) === Boolean(b.description_html);
                  });
                  if (prevHasNewerOrEqual) return prev;
                }
                return mergeUniqueApps(prev, backup.apps);
              });
            }
          } else {
            loadFullStaticDataset().then(full => {
              if (full?.apps && full.apps.length > 0) {
                setApps(prev => mergeUniqueApps(prev, full.apps));
              }
            });
          }
          if (backup.settings && Object.keys(backup.settings).length > 0) {
            setSettings(prev => {
              const prevStr = JSON.stringify(prev);
              const nextObj = { ...prev, ...backup.settings };
              return JSON.stringify(nextObj) === prevStr ? prev : nextObj;
            });
          }
          if (backup.news && Array.isArray(backup.news) && backup.news.length > 0) {
            setNews(prev => {
              if (prev.length === backup.news.length && prev[0]?.slug === backup.news[0]?.slug && prev[0]?.updated_at === backup.news[0]?.updated_at) {
                return prev;
              }
              return mergeUniqueNews(prev, backup.news);
            });
          }
          if (backup.videos && Array.isArray(backup.videos) && backup.videos.length > 0) {
            setVideos(prev => {
              if (prev.length === backup.videos.length && prev[0]?.id === backup.videos[0]?.id) {
                return prev;
              }
              return backup.videos;
            });
          }
          setLoadedFromServer(true);
        }
      }
    } catch (e) {
      console.warn("Public backup data fetch failed, falling back to static dataset:", e);
      loadFullStaticDataset().then(full => {
        if (full?.apps && full.apps.length > 0) {
          setApps(prev => mergeUniqueApps(prev, full.apps));
        }
      });
    } finally {
      setLoading(false);
    }
  }, [apps.length]);

  useEffect(() => {
    // Pre-warm the offline static dataset in background idle time so client navigation has 0ms instant content
    const timer = setTimeout(() => {
      loadFullStaticDataset().then(full => {
        if (full?.apps && full.apps.length > 0) {
          setApps(prev => mergeUniqueApps(prev, full.apps));
        }
        if (full?.news && full.news.length > 0) {
          setNews(prev => mergeUniqueNews(prev, full.news));
        }
      }).catch(() => {});
    }, 200);

    // Only fetch backup data if initial SSR cache was completely empty or has a trimmed route slice (< 50 apps on catalog route)
    const p = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';
    const isCatalog = p === '/' || p === '/new-apps' || p.startsWith('/categories') || p.startsWith('/category');
    if (apps.length === 0 || (isCatalog && apps.length < 50)) {
      fetchBackupData(false);
    }
    return () => clearTimeout(timer);
  }, [apps.length, fetchBackupData]);

  // Ensure full catalog is loaded if user navigates to catalog listing routes or opens search
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkCatalogRoute = () => {
      const p = window.location.pathname.toLowerCase();
      const isCatalog = p === '/' || p === '/new-apps' || p.startsWith('/categories') || p.startsWith('/category');
      if (isCatalog && apps.length > 0 && apps.length < 50) {
        fetchBackupData(true);
      }
    };
    const handleSearchOpen = () => {
      if (apps.length > 0 && apps.length < 50) {
        fetchBackupData(true);
      }
    };
    window.addEventListener('popstate', checkCatalogRoute);
    window.addEventListener('open-search-modal', handleSearchOpen);
    return () => {
      window.removeEventListener('popstate', checkCatalogRoute);
      window.removeEventListener('open-search-modal', handleSearchOpen);
    };
  }, [apps.length, fetchBackupData]);

  const resolvedSettings = React.useMemo(() => {
    const envLogo = String((import.meta as any).env?.VITE_SITE_LOGO_URL || '').trim();
    const envFav = String((import.meta as any).env?.VITE_SITE_FAVICON_URL || envLogo || '').trim();
    const logo = String(settings?.logo_url || settings?.favicon_url || envLogo || '').trim();
    const fav = String(settings?.favicon_url || settings?.logo_url || envFav || logo || '').trim();
    return {
      ...settings,
      favicon_url: fav,
      logo_url: logo
    };
  }, [settings]);

  const updateAppDetail = useCallback((updatedApp: AppConfig) => {
    if (!updatedApp || (!updatedApp.slug && !updatedApp.id)) return;
    const updateId = updatedApp.id ? String(updatedApp.id).trim() : '';
    const updateSlug = updatedApp.slug ? String(updatedApp.slug).toLowerCase().trim() : '';

    setApps(prevApps => {
      const index = prevApps.findIndex(a => 
        (updateId && a.id && String(a.id).trim() === updateId) ||
        (updateSlug && a.slug && String(a.slug).toLowerCase().trim() === updateSlug)
      );
      if (index >= 0) {
        const existing = prevApps[index];
        if (
          existing.description_html === updatedApp.description_html &&
          existing.features_html === updatedApp.features_html &&
          existing.updated_at === updatedApp.updated_at &&
          existing.version === updatedApp.version
        ) {
          return prevApps;
        }
        const next = [...prevApps];
        next[index] = { ...next[index], ...updatedApp };
        return next;
      }
      return [...prevApps, updatedApp];
    });
  }, []);

  const updateNewsDetail = useCallback((updatedNews: NewsItem) => {
    if (!updatedNews || (!updatedNews.slug && !updatedNews.id)) return;
    const updateId = updatedNews.id ? String(updatedNews.id).trim().toLowerCase() : '';
    const updateSlug = updatedNews.slug ? String(updatedNews.slug).toLowerCase().trim() : '';

    setNews(prevNews => {
      const index = prevNews.findIndex(n => 
        (updateId && n.id && String(n.id).trim().toLowerCase() === updateId) ||
        (updateSlug && n.slug && String(n.slug).toLowerCase().trim() === updateSlug)
      );
      if (index >= 0) {
        const next = [...prevNews];
        next[index] = { ...next[index], ...updatedNews };
        return next;
      }
      return [updatedNews, ...prevNews];
    });
  }, []);

  const mergeCatalogApps = useCallback((incomingApps: AppConfig[]) => {
    if (!Array.isArray(incomingApps) || incomingApps.length === 0) return;
    setApps(prev => mergeUniqueApps(prev, incomingApps));
    setLoadedFromServer(true);
    setLoading(false);
  }, []);

  const value = React.useMemo<DataContextType>(() => ({
    apps,
    settings: resolvedSettings,
    news,
    videos,
    loading,
    loadedFromServer,
    serverAppsFetched: true,
    serverNewsFetched: true,
    serverVideosFetched: true,
    appsSyncedWithServer: true,
    settingsSyncedWithServer: true,
    newsSyncedWithServer: true,
    isLive,
    refreshAll: fetchBackupData,
    updateAppDetail,
    mergeCatalogApps,
    updateNewsDetail,

    // Dummy admin handlers for public view interface compliance
    saveSettings: async () => {},
    saveApp: async () => {},
    deleteApp: async () => {},
    saveNews: async () => {},
    deleteNews: async () => {},
    saveVideo: async () => {},
    deleteVideo: async () => {},
    syncDataToGithub: async () => ({ success: false, log: 'Not available in public repo' }),
    fetchApps: fetchBackupData,
    fetchSettings,
    fetchNews,
    fetchVideos,
  }), [apps, resolvedSettings, news, videos, loading, loadedFromServer, isLive, fetchBackupData, fetchSettings, fetchNews, fetchVideos, updateAppDetail, mergeCatalogApps, updateNewsDetail]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    return {
      apps: mockApps as any,
      settings: mockSettings as any,
      news: mockNews as any,
      videos: mockVideos as any,
      loading: false,
      loadedFromServer: true,
      appsSyncedWithServer: true,
      settingsSyncedWithServer: true,
      newsSyncedWithServer: true,
      videosSyncedWithServer: true,
      serverAppsFetched: true,
      serverNewsFetched: true,
      serverVideosFetched: true,
      isConnected: true,
      isLive: true,
      quotaExceeded: false,
      lastSyncTime: '',
      testCloudConnection: async () => true,
      refreshAll: async () => {},
      saveSettings: async () => {},
      saveApp: async () => {},
      deleteApp: async () => {},
      saveNews: async () => {},
      deleteNews: async () => {},
      saveVideo: async () => {},
      deleteVideo: async () => {},
      syncDataToGithub: async () => ({ success: false, log: '' }),
      fetchApps: () => {},
      fetchSettings: () => {},
      fetchNews: () => {},
      fetchVideos: () => {},
      updateAppDetail: () => {},
    };
  }
  return context;
};
