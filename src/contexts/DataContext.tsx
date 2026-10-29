import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db, isFirebaseReal } from '../lib/firebase';
import { AppConfig, GlobalSettings, NewsItem, VideoItem } from '../types';
import { useDataSync } from '../hooks/useDataSync';
import { useGitHubSync } from '../hooks/useGitHubSync';
import { useDataActions } from '../hooks/useDataActions';
import { fetchBackupData } from '../services/dataService';
import { adminFetch } from '../services/adminAuthService';
import { getAdminPath } from '../lib/utils';
import { toast } from '../components/Toast';
import { mockApps, mockSettings, mockNews, mockVideos } from '../lib/staticData';

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
  videosSyncedWithServer: boolean;
  serverAppsFetched: boolean;
  serverNewsFetched: boolean;
  serverVideosFetched: boolean;
  syncVersion: number;
  lastSyncTime: string | null;
  dataSource: 'firebase' | 'local_backup' | 'loading';
  isRefreshing: boolean;
  reloadServerData: (silent?: boolean) => Promise<void>;
  refreshAll: (silent?: boolean) => Promise<void>;
  testCloudConnection: () => Promise<boolean>;
  saveAppSingle: (app: any) => Promise<any>;
  deleteAppSingle: (id: string) => Promise<void>;
  saveSettingsSection: (section: string, data: any) => Promise<any>;
  saveApps: (apps: AppConfig[]) => Promise<void>;
  saveSettings: (settings: Partial<GlobalSettings>) => Promise<void>;
  saveNews: (news: NewsItem[]) => Promise<void>;
  saveVideos: (videos: VideoItem[]) => Promise<void>;
  isConnected: boolean | null;
  isLive: boolean;
  quotaExceeded: boolean;
  gitConfig: any;
  gitConfigLoading: boolean;
  saveGitConfig: (config: any) => Promise<void>;
  pushAllToGitHub: (customConfig?: any, onProgress?: any, ...args: any[]) => Promise<any>;
}


const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const sync = useDataSync();
  const github = useGitHubSync(
    sync.apps, 
    sync.settings, 
    sync.news, 
    sync.videos, 
    null // Placeholder for now, we will assign it below
  );
  
  const actions = useDataActions(
    sync.apps, sync.setApps,
    sync.settings, sync.setSettings,
    sync.news, sync.setNews,
    sync.videos, sync.setVideos,
    github.getAdminToken
  );

  // Update github's reference to updateLocalContainerBackup
  (github as any).updateLocalContainerBackup = actions.updateLocalContainerBackup;

  const testCloudConnection = React.useCallback(async () => {
    if (!isFirebaseReal || !db) return false;
    try {
      await getDocFromServer(doc(db, 'store_data', 'public_settings'));
      sync.setIsConnected(true);
      sync.setIsLive(true);
      return true;
    } catch {
      return false;
    }
  }, [sync.setIsConnected, sync.setIsLive]);

  const refreshAll = React.useCallback(async (silent = false) => {
    if (!silent) sync.setLoading(true);
    try {
      sync.setSyncVersion(v => v + 1);
      sync.setLastSyncTime(new Date().toLocaleTimeString());
      await sync.reloadServerData(true);
      toast('Platform data synchronized with Firestore.', 'success');
    } catch (err: any) {
      console.warn("Refresh error:", err);
      toast('Sync completed with local state.', 'info');
    } finally {
      sync.setLoading(false);
    }
  }, [sync.setLoading, sync.setSyncVersion, sync.setLastSyncTime, sync.reloadServerData]);

  const resolvedSettings = useMemo(() => {
    const envLogo = String((import.meta as any).env?.VITE_SITE_LOGO_URL || '').trim();
    const envFav = String((import.meta as any).env?.VITE_SITE_FAVICON_URL || envLogo || '').trim();
    const logo = String(sync.settings?.logo_url || sync.settings?.favicon_url || envLogo || '').trim();
    const fav = String(sync.settings?.favicon_url || sync.settings?.logo_url || envFav || logo || '').trim();
    return {
      ...sync.settings,
      favicon_url: fav,
      logo_url: logo
    };
  }, [sync.settings]);

  const value = useMemo(() => ({
    apps: sync.apps,
    settings: resolvedSettings,
    news: sync.news,
    videos: sync.videos,
    loading: sync.loading,
    loadedFromServer: sync.loadedFromServer,
    appsSyncedWithServer: sync.syncStates.apps,
    settingsSyncedWithServer: sync.syncStates.settings,
    newsSyncedWithServer: sync.syncStates.news,
    videosSyncedWithServer: sync.syncStates.videos,
    serverAppsFetched: sync.fetchedStates.apps,
    serverNewsFetched: sync.fetchedStates.news,
    serverVideosFetched: sync.fetchedStates.videos,
    syncVersion: sync.syncVersion,
    lastSyncTime: sync.lastSyncTime,
    dataSource: sync.dataSource,
    isRefreshing: sync.isRefreshing,
    reloadServerData: sync.reloadServerData,
    refreshAll,
    testCloudConnection,
    saveAppSingle: actions.saveAppSingle,
    deleteAppSingle: actions.deleteAppSingle,
    saveSettingsSection: actions.saveSettingsSection,
    saveApps: actions.saveApps,
    saveSettings: actions.saveSettings,
    saveNews: actions.saveNews,
    saveVideos: actions.saveVideos,
    isConnected: sync.isConnected,
    isLive: sync.isLive,
    quotaExceeded: sync.quotaExceeded,
    gitConfig: github.gitConfig,
    gitConfigLoading: github.gitConfigLoading,
    saveGitConfig: github.saveGitConfig,
    pushAllToGitHub: github.pushAllToGitHub
  }), [sync, actions, github, resolvedSettings, refreshAll, testCloudConnection]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    return {
      apps: mockApps,
      settings: mockSettings,
      news: mockNews,
      videos: mockVideos,
      loading: false,
      loadedFromServer: true,
      appsSyncedWithServer: true,
      settingsSyncedWithServer: true,
      newsSyncedWithServer: true,
      videosSyncedWithServer: true,
      serverAppsFetched: true,
      serverNewsFetched: true,
      serverVideosFetched: true,
      syncVersion: 1,
      lastSyncTime: null,
      dataSource: 'local_backup' as const,
      isRefreshing: false,
      reloadServerData: async () => {},
      refreshAll: async () => {},
      testCloudConnection: async () => true,
      saveAppSingle: async (app: any) => app,
      deleteAppSingle: async () => {},
      saveSettingsSection: async () => {},
      saveApps: async () => {},
      saveSettings: async () => {},
      saveNews: async () => {},
      saveVideos: async () => {},
      isConnected: true,
      isLive: true,
      quotaExceeded: false,
      gitConfig: null,
      gitConfigLoading: false,
      saveGitConfig: async () => {},
      pushAllToGitHub: async () => ({ success: false }),
    };
  }
  return context;
};

