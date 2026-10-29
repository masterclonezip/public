import React, { useCallback } from 'react';
import { AppConfig, GlobalSettings, NewsItem, VideoItem } from '../types';
import { adminFetch } from '../services/adminAuthService';
import { writeFirestoreDoc, deleteFirestoreDoc, hydrateFirebaseRuntimeConfig } from '../lib/firebase';
import { formatPageTitle, cleanSettingsMetaTitles } from '../lib/seoUtils';
import { structureHtmlFragment } from '../lib/safeHtmlPublic';

const ADMIN_BYPASS_KEY = 'aistudio_preview_bypass_key';

function stripCompareFields(item: any) {
  if (!item || typeof item !== 'object') return item;
  const copy = { ...item };
  delete copy.updated_at;
  delete copy._rest_admin_bypass;
  return copy;
}

function hasItemContentChanged(prevItem: any, nextItem: any): boolean {
  if (!prevItem) return true;
  try {
    return JSON.stringify(stripCompareFields(prevItem)) !== JSON.stringify(stripCompareFields(nextItem));
  } catch (_) {
    return true;
  }
}

export function useDataActions(
  apps: AppConfig[],
  setApps: React.Dispatch<React.SetStateAction<AppConfig[]>>,
  settings: GlobalSettings,
  setSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>,
  news: NewsItem[],
  setNews: React.Dispatch<React.SetStateAction<NewsItem[]>>,
  videos: VideoItem[],
  setVideos: React.Dispatch<React.SetStateAction<VideoItem[]>>,
  getAdminToken: () => Promise<string>
) {

  const saveAppSingle = useCallback(async (singleApp: any) => {
    await hydrateFirebaseRuntimeConfig();
    const brand = settings?.site_title || '';
    const rawTitle = (singleApp.seo_title || singleApp.meta_title || '').trim();
    const exactAdminTitle = rawTitle ? formatPageTitle(rawTitle, '', brand) : '';
    const normalizedApp = {
      ...singleApp,
      seo_title: exactAdminTitle,
      meta_title: exactAdminTitle,
      seo_description: (singleApp.seo_description || singleApp.meta_description || '').trim(),
      meta_description: (singleApp.seo_description || singleApp.meta_description || '').trim(),
      description_html: typeof singleApp.description_html === 'string' && singleApp.description_html.trim()
        ? structureHtmlFragment(singleApp.description_html)
        : (singleApp.description_html || ''),
      features_html: typeof singleApp.features_html === 'string' && singleApp.features_html.trim()
        ? structureHtmlFragment(singleApp.features_html)
        : (singleApp.features_html || ''),
      custom_admin_box_html: typeof singleApp.custom_admin_box_html === 'string' && singleApp.custom_admin_box_html.trim()
        ? structureHtmlFragment(singleApp.custom_admin_box_html)
        : (singleApp.custom_admin_box_html || ''),
      updated_at: new Date().toISOString()
    };

    let savedApp = { ...normalizedApp };
    let savedToServer = false;
    let savedToFirestore = false;
    let lastError: string | null = null;

    // 1. Targeted Firestore persistence FIRST: ONLY write the specific chunk containing this app (0 reads, 1 write)!
    try {
      const prevChunkSize = 25;
      const prevNumChunks = Math.max(1, Math.ceil(apps.length / prevChunkSize));
      const nextApps = [...apps];
      let targetIdx = nextApps.findIndex(a => a.id === savedApp.id || (savedApp.slug && a.slug === savedApp.slug));
      const isNewApp = targetIdx < 0;
      if (targetIdx >= 0) {
        nextApps[targetIdx] = { ...nextApps[targetIdx], ...savedApp };
      } else {
        targetIdx = nextApps.length;
        nextApps.push(savedApp);
      }

      const chunkSize = 25;
      const numChunks = Math.max(1, Math.ceil(nextApps.length / chunkSize));
      const targetChunkIdx = Math.floor(targetIdx / chunkSize);
      const slice = nextApps.slice(targetChunkIdx * chunkSize, (targetChunkIdx + 1) * chunkSize);
      const nowIso = new Date().toISOString();

      const chunkOk = await writeFirestoreDoc('store_data', `apps_chunk_${targetChunkIdx}`, {
        items: slice,
        count: slice.length,
        updated_at: nowIso,
        updatedAt: nowIso,
        _rest_admin_bypass: ADMIN_BYPASS_KEY
      });

      if (isNewApp || numChunks !== prevNumChunks || apps.length <= 1) {
        await writeFirestoreDoc('store_data', 'apps_meta', {
          count: nextApps.length,
          totalApps: nextApps.length,
          numChunks,
          updated_at: nowIso,
          updatedAt: nowIso,
          _rest_admin_bypass: ADMIN_BYPASS_KEY
        }, true);
      }

      if (chunkOk) {
        savedToFirestore = true;
      }
    } catch (err: any) {
      console.warn('[useDataActions] Targeted Firestore saveAppSingle notice:', err);
      lastError = err?.message || 'Firestore write failed';
    }

    // 2. Sync to backend server API (passes persistedToFirestore so Edge skips duplicate Firestore reads/writes)
    try {
      const idToken = await getAdminToken();
      const res = await adminFetch('/api/v1/admin/app/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ app: normalizedApp, persistedToFirestore: savedToFirestore })
      });
      const cType = res.headers.get('content-type') || '';
      const data = cType.includes('application/json') ? await res.json().catch(() => null) : null;
      if (res.ok && data && (data.app || data.success !== false)) {
        savedApp = { ...normalizedApp, ...(data.app || {}) };
        savedToServer = true;
      } else if (!savedToFirestore) {
        lastError = data?.error || lastError || `Server returned HTTP ${res.status}`;
      }
    } catch (err: any) {
      if (!savedToFirestore) {
        lastError = lastError || err?.message || 'Server endpoint unreachable';
      }
    }

    if (!savedToServer && !savedToFirestore) {
      throw new Error(lastError || 'Failed to save application to Firebase database.');
    }

    setApps(prev => {
      const idx = prev.findIndex(a => a.id === savedApp.id || (savedApp.slug && a.slug === savedApp.slug));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...savedApp };
        return next;
      }
      return [...prev, savedApp];
    });

    return savedApp;
  }, [getAdminToken, setApps, apps, settings?.site_title]);

  const deleteAppSingle = useCallback(async (appId: string) => {
    await hydrateFirebaseRuntimeConfig();
    let deletedOnServer = false;
    let deletedOnFirestore = false;
    let lastError: string | null = null;

    // 1. Targeted Firestore deletion FIRST: only rewrite chunks from the deleted index onward (0 reads)
    try {
      const prevChunkSize = 25;
      const prevNumChunks = Math.max(1, Math.ceil(apps.length / prevChunkSize));
      const deletedIdx = apps.findIndex(a => a.id === appId || a.slug === appId);
      const startChunkIdx = deletedIdx >= 0 ? Math.floor(deletedIdx / prevChunkSize) : 0;

      const nextApps = apps.filter(a => a.id !== appId && a.slug !== appId);
      const numChunks = Math.max(1, Math.ceil(nextApps.length / prevChunkSize));
      const nowIso = new Date().toISOString();

      let allOk = true;
      for (let i = startChunkIdx; i < numChunks; i++) {
        const slice = nextApps.slice(i * prevChunkSize, (i + 1) * prevChunkSize);
        const ok = await writeFirestoreDoc('store_data', `apps_chunk_${i}`, {
          items: slice,
          count: slice.length,
          updated_at: nowIso,
          updatedAt: nowIso,
          _rest_admin_bypass: ADMIN_BYPASS_KEY
        });
        if (!ok) allOk = false;
      }

      if (prevNumChunks > numChunks) {
        for (let i = numChunks; i < prevNumChunks; i++) {
          await deleteFirestoreDoc('store_data', `apps_chunk_${i}`);
        }
      }

      await writeFirestoreDoc('store_data', 'apps_meta', {
        count: nextApps.length,
        totalApps: nextApps.length,
        numChunks,
        updated_at: nowIso,
        updatedAt: nowIso,
        _rest_admin_bypass: ADMIN_BYPASS_KEY
      }, true);

      if (allOk) {
        deletedOnFirestore = true;
      }
    } catch (err: any) {
      console.warn('[useDataActions] Targeted Firestore delete notice:', err);
      lastError = err?.message || 'Firestore delete failed';
    }

    // 2. Sync deletion to backend server API (passes persistedToFirestore so Edge skips duplicate reads/writes)
    try {
      const idToken = await getAdminToken();
      const res = await adminFetch('/api/v1/admin/app/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ id: appId, persistedToFirestore: deletedOnFirestore })
      });
      const cType = res.headers.get('content-type') || '';
      const data = cType.includes('application/json') ? await res.json().catch(() => null) : null;
      if (res.ok && (!data || data.success !== false)) {
        deletedOnServer = true;
      } else if (!deletedOnFirestore) {
        lastError = data?.error || lastError || `Server returned HTTP ${res.status}`;
      }
    } catch (err: any) {
      if (!deletedOnFirestore) {
        lastError = lastError || err?.message || 'Server endpoint unreachable';
      }
    }

    if (!deletedOnServer && !deletedOnFirestore) {
      throw new Error(lastError || 'Failed to delete application from Firebase database.');
    }

    setApps(prev => prev.filter(a => a.id !== appId && a.slug !== appId));
  }, [getAdminToken, setApps, apps]);

  const saveSettingsSection = useCallback(async (section: string, data: any) => {
    await hydrateFirebaseRuntimeConfig();
    let savedToServer = false;
    let savedToFirestore = false;
    let resData: any = null;
    let lastError: string | null = null;

    const nowIso = new Date().toISOString();
    let mergedSettings: any = { ...settings };
    let sectionDelta: Record<string, any> = {};

    if (section === 'general' || section === 'seo') {
      const cleanedDelta = cleanSettingsMetaTitles({ ...(data || {}) });
      mergedSettings = { ...mergedSettings, ...cleanedDelta, last_updated: nowIso };
      sectionDelta = { ...cleanedDelta, last_updated: nowIso };
    } else {
      mergedSettings[section] = data;
      mergedSettings = cleanSettingsMetaTitles(mergedSettings);
      mergedSettings.last_updated = nowIso;
      sectionDelta = { [section]: data, last_updated: nowIso };
    }

    // 1. Targeted Firestore write FIRST: merge ONLY the modified section fields (0 reads)!
    try {
      const payloadToSave = {
        ...sectionDelta,
        _rest_admin_bypass: ADMIN_BYPASS_KEY,
      };
      const okSettings = await writeFirestoreDoc('store_data', 'settings', payloadToSave, true);

      const publicPayload = { ...payloadToSave } as any;
      delete publicPayload.turnstile_secret_key;
      delete publicPayload.cloudinary_api_secret;
      delete publicPayload.gemini_api_key;
      await writeFirestoreDoc('store_data', 'public_settings', publicPayload, true);

      // Keep dedicated collection documents in sync when saving those specific sections
      if (section === 'website_faqs' && Array.isArray(data)) {
        await writeFirestoreDoc('store_data', 'faqs', { items: data, count: data.length, updated_at: nowIso, updatedAt: nowIso, _rest_admin_bypass: ADMIN_BYPASS_KEY });
      } else if (section === 'quick_links' && Array.isArray(data)) {
        await writeFirestoreDoc('store_data', 'quick_links', { items: data, count: data.length, updated_at: nowIso, updatedAt: nowIso, _rest_admin_bypass: ADMIN_BYPASS_KEY });
      } else if (section === 'developers' && Array.isArray(data)) {
        await writeFirestoreDoc('store_data', 'developers', { items: data, count: data.length, updated_at: nowIso, updatedAt: nowIso, _rest_admin_bypass: ADMIN_BYPASS_KEY });
      }

      if (okSettings) {
        savedToFirestore = true;
      }
    } catch (err: any) {
      console.warn('[useDataActions] Targeted Firestore settings save notice:', err);
      lastError = err?.message || 'Firestore settings write failed';
    }

    // 2. Sync to backend server API
    try {
      const idToken = await getAdminToken();
      const res = await adminFetch('/api/v1/admin/settings/save-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ section, data, settings: mergedSettings, persistedToFirestore: savedToFirestore })
      });
      const cType = res.headers.get('content-type') || '';
      const parsed = cType.includes('application/json') ? await res.json().catch(() => null) : null;
      if (res.ok && (!parsed || parsed.success !== false)) {
        resData = parsed;
        savedToServer = true;
      } else if (!savedToFirestore) {
        lastError = parsed?.error || lastError || `Server returned HTTP ${res.status}`;
      }
    } catch (err: any) {
      if (!savedToFirestore) {
        lastError = lastError || err?.message || 'Server endpoint unreachable';
      }
    }

    if (!savedToServer && !savedToFirestore) {
      throw new Error(lastError || 'Failed to save settings to Firebase database.');
    }

    if (resData && resData.settings && Object.keys(resData.settings).length > 2) {
      setSettings(resData.settings);
    } else {
      setSettings(mergedSettings);
    }

    return resData || { success: true, settings: mergedSettings };
  }, [getAdminToken, setSettings, settings]);

  const saveApps = useCallback(async (newApps: AppConfig[]) => {
    await hydrateFirebaseRuntimeConfig();
    const now = new Date().toISOString();
    const existingById = new Map<string, any>();
    const existingBySlug = new Map<string, any>();
    for (const prev of apps || []) {
      if (prev?.id) existingById.set(String(prev.id).trim(), prev);
      if (prev?.slug) existingBySlug.set(String(prev.slug).trim().toLowerCase(), prev);
    }

    const normalizedApps: AppConfig[] = (newApps || []).map((a: any) => {
      const idKey = String(a?.id || '').trim();
      const slugKey = String(a?.slug || '').trim().toLowerCase();
      const prev = (idKey && existingById.get(idKey)) || (slugKey && existingBySlug.get(slugKey));
      const rawTitle = (a?.seo_title || a?.meta_title || '').trim();
      const exactTitle = rawTitle ? formatPageTitle(rawTitle, '', settings?.site_title || '') : '';
      const candidate = {
        ...a,
        slug: typeof a?.slug === 'string' ? a.slug.trim().replace(/^\/+|\/+$/g, '') : a?.slug,
        seo_title: exactTitle,
        meta_title: exactTitle,
        description_html: typeof a?.description_html === 'string' && a.description_html.trim()
          ? structureHtmlFragment(a.description_html)
          : (a?.description_html ?? ''),
        features_html: typeof a?.features_html === 'string' && a.features_html.trim()
          ? structureHtmlFragment(a.features_html)
          : (a?.features_html ?? ''),
        custom_admin_box_html: typeof a?.custom_admin_box_html === 'string' && a.custom_admin_box_html.trim()
          ? structureHtmlFragment(a.custom_admin_box_html)
          : (a?.custom_admin_box_html ?? '')
      };
      const changed = hasItemContentChanged(prev, candidate);
      const preservedDate = prev?.updated_at || a?.updated_at || a?.published_at || a?.publish_date || a?.created_at || a?.added_date || a?.date || now;
      return {
        ...candidate,
        updated_at: changed ? now : preservedDate
      };
    });

    let savedToServer = false;
    let savedToFirestore = false;
    let lastError: string | null = null;

    try {
      const chunkSize = 25;
      const prevNumChunks = Math.max(1, Math.ceil((apps?.length || 0) / chunkSize));
      const numChunks = Math.max(1, Math.ceil(normalizedApps.length / chunkSize));
      let allOk = true;
      for (let i = 0; i < numChunks; i++) {
        const slice = normalizedApps.slice(i * chunkSize, (i + 1) * chunkSize);
        const ok = await writeFirestoreDoc('store_data', `apps_chunk_${i}`, {
          items: slice,
          count: slice.length,
          updated_at: now,
          updatedAt: now,
          _rest_admin_bypass: ADMIN_BYPASS_KEY
        });
        if (!ok) allOk = false;
      }
      if (prevNumChunks > numChunks) {
        for (let i = numChunks; i < prevNumChunks; i++) {
          await deleteFirestoreDoc('store_data', `apps_chunk_${i}`);
        }
      }
      await writeFirestoreDoc('store_data', 'apps_meta', {
        count: normalizedApps.length,
        totalApps: normalizedApps.length,
        numChunks,
        updated_at: now,
        updatedAt: now,
        _rest_admin_bypass: ADMIN_BYPASS_KEY
      }, true);
      if (allOk) {
        savedToFirestore = true;
      }
    } catch (err: any) {
      console.warn('[useDataActions] Firestore saveApps notice:', err);
      lastError = err?.message || 'Firestore apps write failed';
    }

    try {
      const idToken = await getAdminToken();
      const res = await adminFetch('/api/v1/admin/save-apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ apps: normalizedApps, persistedToFirestore: savedToFirestore })
      });
      const cType = res.headers.get('content-type') || '';
      const data = cType.includes('application/json') ? await res.json().catch(() => null) : null;
      if (res.ok && (!data || data.success !== false)) {
        savedToServer = true;
      } else if (!savedToFirestore) {
        lastError = data?.error || lastError || `Server returned HTTP ${res.status}`;
      }
    } catch (err: any) {
      if (!savedToFirestore) {
        lastError = lastError || err?.message || 'Server endpoint unreachable';
      }
    }

    if (!savedToServer && !savedToFirestore) {
      throw new Error(lastError || 'Failed to save apps catalog to Firebase database.');
    }

    setApps(normalizedApps);

    const secureLinks = normalizedApps
      .filter(a => {
        const target = a.more_information_url || a.encrypted_link || '';
        return target && typeof target === 'string' && target.trim().length > 0 && !target.includes('com.example');
      })
      .map(a => ({ id: a.id, slug: a.slug, url: a.more_information_url || a.encrypted_link || '' }));

    if (secureLinks.length > 0) {
      try {
        const idToken = await getAdminToken();
        await adminFetch('/api/v1/admin/encrypt-links', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
          },
          body: JSON.stringify({ items: secureLinks })
        });
      } catch (e) {
        console.warn('Failed encrypting secure links:', e);
      }
    }
  }, [getAdminToken, setApps, apps, settings?.site_title]);

  const saveSettings = useCallback(async (newSettings: Partial<GlobalSettings>) => {
    await hydrateFirebaseRuntimeConfig();
    const now = new Date().toISOString();
    const currentSettings = settings || {} as GlobalSettings;
    const settingsWithTime: GlobalSettings = cleanSettingsMetaTitles({
      ...currentSettings,
      ...newSettings,
      banners: newSettings.banners !== undefined ? newSettings.banners : (currentSettings.banners || []),
      categories: newSettings.categories !== undefined ? newSettings.categories : (currentSettings.categories || []),
      quick_links: newSettings.quick_links !== undefined ? newSettings.quick_links : (currentSettings.quick_links || []),
      website_faqs: newSettings.website_faqs !== undefined ? newSettings.website_faqs : (currentSettings.website_faqs || []),
      developers: newSettings.developers !== undefined ? newSettings.developers : (currentSettings.developers || []),
      last_updated: now
    }) as GlobalSettings;

    let savedToServer = false;
    let savedToFirestore = false;
    let lastError: string | null = null;

    try {
      const payloadToSave = {
        ...settingsWithTime,
        _rest_admin_bypass: ADMIN_BYPASS_KEY
      };
      const ok = await writeFirestoreDoc('store_data', 'settings', payloadToSave, true);
      const publicPayload = { ...payloadToSave } as any;
      delete publicPayload.turnstile_secret_key;
      delete publicPayload.cloudinary_api_secret;
      delete publicPayload.gemini_api_key;
      await writeFirestoreDoc('store_data', 'public_settings', publicPayload, true);
      if (ok) {
        savedToFirestore = true;
      }
    } catch (err: any) {
      console.warn('[useDataActions] Firestore saveSettings notice:', err);
      lastError = err?.message || 'Firestore write failed';
    }

    try {
      const idToken = await getAdminToken();
      const res = await adminFetch('/api/v1/admin/save-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ settings: settingsWithTime, persistedToFirestore: savedToFirestore })
      });
      const cType = res.headers.get('content-type') || '';
      const data = cType.includes('application/json') ? await res.json().catch(() => null) : null;
      if (res.ok && (!data || data.success !== false)) {
        savedToServer = true;
      } else if (!savedToFirestore) {
        lastError = data?.error || lastError || `Server returned HTTP ${res.status}`;
      }
    } catch (err: any) {
      if (!savedToFirestore) {
        lastError = lastError || err?.message || 'Server endpoint unreachable';
      }
    }

    if (!savedToServer && !savedToFirestore) {
      throw new Error(lastError || 'Failed to save settings to Firebase database.');
    }

    setSettings(settingsWithTime);
  }, [settings, getAdminToken, setSettings]);

  const saveNews = useCallback(async (newNews: NewsItem[]) => {
    await hydrateFirebaseRuntimeConfig();
    const now = new Date().toISOString();
    const existingById = new Map<string, any>();
    const existingBySlug = new Map<string, any>();
    for (const prev of news || []) {
      if (prev?.id) existingById.set(String(prev.id).trim(), prev);
      if (prev?.slug) existingBySlug.set(String(prev.slug).trim().toLowerCase(), prev);
    }

    const cleanNews = JSON.parse(JSON.stringify(newNews || [])).map((n: any) => {
      const idKey = String(n?.id || '').trim();
      const slugKey = String(n?.slug || '').trim().replace(/^\/+|\/+$/g, '').toLowerCase();
      const prev = (idKey && existingById.get(idKey)) || (slugKey && existingBySlug.get(slugKey));
      const brand = settings?.site_title || '';
      const rawSeoTitle = (n?.seo_title || n?.meta_title || '').trim();
      const exactTitle = rawSeoTitle ? formatPageTitle(rawSeoTitle, '', brand) : '';
      const rawHeading = (n?.title || '').trim();
      const exactHeading = rawHeading ? formatPageTitle(rawHeading, '', brand) : '';
      const candidate = {
        ...n,
        slug: typeof n.slug === 'string' ? n.slug.trim().replace(/^\/+|\/+$/g, '') : n.slug,
        id: typeof n.id === 'string' ? n.id.trim() : n.id,
        title: exactHeading,
        seo_title: exactTitle,
        meta_title: exactTitle
      };
      const changed = hasItemContentChanged(prev, candidate);
      const preservedDate = prev?.updated_at || n?.updated_at || n?.published_at || n?.publish_date || n?.created_at || now;
      return {
        ...candidate,
        updated_at: changed ? now : preservedDate
      };
    });

    let savedToServer = false;
    let savedToFirestore = false;
    let lastError: string | null = null;

    try {
      const ok = await writeFirestoreDoc('store_data', 'news', {
        items: cleanNews,
        count: cleanNews.length,
        updated_at: now,
        updatedAt: now,
        _rest_admin_bypass: ADMIN_BYPASS_KEY
      });
      if (ok) {
        savedToFirestore = true;
      }
    } catch (err: any) {
      console.warn('[useDataActions] Firestore saveNews notice:', err);
      lastError = err?.message || 'Firestore news write failed';
    }

    try {
      const idToken = await getAdminToken();
      const res = await adminFetch('/api/v1/admin/save-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ news: cleanNews, persistedToFirestore: savedToFirestore })
      });
      const cType = res.headers.get('content-type') || '';
      const data = cType.includes('application/json') ? await res.json().catch(() => null) : null;
      if (res.ok && (!data || data.success !== false)) {
        savedToServer = true;
      } else if (!savedToFirestore) {
        lastError = data?.error || lastError || `Server returned HTTP ${res.status}`;
      }
    } catch (err: any) {
      if (!savedToFirestore) {
        lastError = lastError || err?.message || 'Server endpoint unreachable';
      }
    }

    if (!savedToServer && !savedToFirestore) {
      throw new Error(lastError || 'Failed to save news to Firebase database.');
    }

    setNews(cleanNews);
  }, [getAdminToken, setNews, news, settings?.site_title]);

  const saveVideos = useCallback(async (newVideos: VideoItem[]) => {
    await hydrateFirebaseRuntimeConfig();
    const now = new Date().toISOString();
    const existingById = new Map<string, any>();
    const existingBySlug = new Map<string, any>();
    for (const prev of videos || []) {
      if (prev?.id) existingById.set(String(prev.id).trim(), prev);
      if (prev?.slug) existingBySlug.set(String(prev.slug).trim().toLowerCase(), prev);
    }

    const cleanVideos = JSON.parse(JSON.stringify(newVideos || [])).map((v: any) => {
      const idKey = String(v?.id || '').trim();
      const slugKey = String(v?.slug || '').trim().replace(/^\/+|\/+$/g, '').toLowerCase();
      const prev = (idKey && existingById.get(idKey)) || (slugKey && existingBySlug.get(slugKey));
      const brand = settings?.site_title || '';
      const rawSeoTitle = (v?.seo_title || v?.meta_title || '').trim();
      const exactSeoTitle = rawSeoTitle ? formatPageTitle(rawSeoTitle, '', brand) : '';
      const rawTitle = (v?.title || '').trim();
      const exactTitle = rawTitle ? formatPageTitle(rawTitle, '', brand) : '';
      const candidate = {
        ...v,
        title: exactTitle || v?.title || '',
        ...(rawSeoTitle || v?.seo_title !== undefined || v?.meta_title !== undefined
          ? { seo_title: exactSeoTitle, meta_title: exactSeoTitle }
          : {}),
        slug: typeof v?.slug === 'string' ? v.slug.trim().replace(/^\/+|\/+$/g, '') : v?.slug,
        created_at: v?.created_at || prev?.created_at || now
      };
      const changed = hasItemContentChanged(prev, candidate);
      const preservedDate = prev?.updated_at || v?.updated_at || v?.published_at || v?.created_at || v?.date || now;
      return {
        ...candidate,
        updated_at: changed ? now : preservedDate
      };
    });
    let savedToServer = false;
    let savedToFirestore = false;
    let lastError: string | null = null;

    try {
      const ok = await writeFirestoreDoc('store_data', 'videos', {
        items: cleanVideos,
        count: cleanVideos.length,
        updated_at: now,
        updatedAt: now,
        _rest_admin_bypass: ADMIN_BYPASS_KEY
      });
      if (ok) {
        savedToFirestore = true;
      }
    } catch (err: any) {
      console.warn('[useDataActions] Firestore saveVideos notice:', err);
      lastError = err?.message || 'Firestore videos write failed';
    }

    try {
      const idToken = await getAdminToken();
      const res = await adminFetch('/api/v1/admin/save-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ videos: cleanVideos, persistedToFirestore: savedToFirestore })
      });
      const cType = res.headers.get('content-type') || '';
      const data = cType.includes('application/json') ? await res.json().catch(() => null) : null;
      if (res.ok && (!data || data.success !== false)) {
        savedToServer = true;
      } else if (!savedToFirestore) {
        lastError = data?.error || lastError || `Server returned HTTP ${res.status}`;
      }
    } catch (err: any) {
      if (!savedToFirestore) {
        lastError = lastError || err?.message || 'Server endpoint unreachable';
      }
    }

    if (!savedToServer && !savedToFirestore) {
      throw new Error(lastError || 'Failed to save videos to Firebase database.');
    }

    setVideos(cleanVideos);
  }, [getAdminToken, setVideos, videos, settings?.site_title]);

  const updateLocalContainerBackup = useCallback(async (
    targetApps?: AppConfig[],
    targetSettings?: Partial<GlobalSettings>,
    targetNews?: NewsItem[],
    targetVideos?: VideoItem[]
  ) => {
    try {
      const idToken = await getAdminToken();
      const res = await adminFetch('/api/v1/admin/sync-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({
          apps: targetApps || apps,
          settings: targetSettings || settings,
          news: targetNews || news,
          videos: targetVideos || videos
        })
      });
      if (!res.ok) {
        const text = await res.text();
        console.warn(`[useDataActions] Container backup sync notice: ${text}`);
      }
    } catch (err: any) {
      console.warn(`[useDataActions] Container backup network error: ${err.message}`);
    }
  }, [getAdminToken, apps, settings, news, videos]);

  return {
    saveAppSingle,
    deleteAppSingle,
    saveSettingsSection,
    saveApps,
    saveSettings,
    saveNews,
    saveVideos,
    updateLocalContainerBackup
  };
}

