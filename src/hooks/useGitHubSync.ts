import React, { useState, useEffect, useCallback } from 'react';
import { auth, db, isFirebaseReal, readFirestoreDoc, writeFirestoreDoc, handleFirestoreError, OperationType } from '../lib/firebase';
import { adminFetch, getValidAdminToken, loadSession } from '../services/adminAuthService';
import { GitConfig, generateStaticDataFileCode, generateCommunityReviewsFileCode, commitFileToGitHub, commitMultiFilesToGitHub, encryptUrlIfNeeded, compileCanonicalApp, compileCanonicalNews, generateSecureVaultFile, sanitizePublicSettings } from '../lib/githubSync';
import { getAesSecret, safeDecrypt, safeEncrypt } from '../lib/cryptoUtils';
import { generateAllSitemaps } from '../lib/sitemapGenerator';
import { ensureDefaultSettings } from '../lib/defaultLegalContent';
import { AppConfig, GlobalSettings, NewsItem, VideoItem } from '../types';
import { getResolvedCommunityFirebaseConfig, parseFirestoreFields } from '../lib/communityFirebase';

import communityCatalogStats from '../lib/communityCatalogStats.json';
import communityStaticReviews from '../lib/communityStaticReviews.json';

export function useGitHubSync(
  apps: AppConfig[],
  settings: GlobalSettings,
  news: NewsItem[],
  videos: VideoItem[],
  updateLocalContainerBackup: any
) {
  const [gitConfig, setGitConfig] = useState<GitConfig | null>(null);
  const [gitConfigLoading, setGitConfigLoading] = useState(false);

  const getAdminToken = async (): Promise<string> => {
    try {
      if (auth && (auth as any).currentUser && typeof (auth as any).currentUser.getIdToken === 'function') {
        const tok = await Promise.race([
          (auth as any).currentUser.getIdToken(),
          new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
        if (tok) return tok;
      }
    } catch (e) {}
    try {
      const validTok = await getValidAdminToken();
      if (validTok) return validTok;
    } catch (e) {}
    return loadSession()?.idToken || '';
  };

  // Load Git Sync Configuration on mount
  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      setGitConfigLoading(true);

      // 1. Fetch from server API endpoint (uses Admin SDK)
      try {
        const res = await adminFetch('/api/github-sync/config');
        if (res.ok) {
          const data = await res.json();
          if (data.config && isMounted && (data.config.token || data.config.owner)) {
            setGitConfig(data.config);
            try {
              localStorage.setItem('cached_git_config', JSON.stringify(data.config));
            } catch (e) {}
            setGitConfigLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn("[GitHub Sync] Failed to fetch config from server:", e);
      }

      // 2. Direct Firestore REST read from sec_git/cfg for static hosts (Cloudflare Pages)
      try {
        const snap = await readFirestoreDoc('sec_git', 'cfg');
        if (snap.exists && snap.data && isMounted) {
          const data = snap.data as any;
          if (data && (data.token || data.owner || data.repo)) {
            const loadedConfig: GitConfig = {
              owner: data.owner || (import.meta as any).env?.VITE_GITHUB_OWNER || "",
              repo: data.repo || (import.meta as any).env?.VITE_GITHUB_PUBLIC_REPO || "",
              branch: data.branch || "main",
              token: data.token || "",
              autoSync: Boolean(data.autoSync)
            };
            setGitConfig(loadedConfig);
            try {
              localStorage.setItem('cached_git_config', JSON.stringify(loadedConfig));
            } catch (e) {}
            setGitConfigLoading(false);
            return;
          }
        }
      } catch (dbErr) {
        console.warn("[GitHub Sync] Firestore direct config load warning:", dbErr);
      }

      // 3. Fallback to localStorage
      try {
        const cached = localStorage.getItem('cached_git_config');
        if (cached && isMounted) {
          setGitConfig(JSON.parse(cached));
          setGitConfigLoading(false);
          return;
        }
      } catch (e) {}

      // 4. Default fallback
      if (isMounted) {
        setGitConfig({
          owner: (import.meta as any).env?.VITE_GITHUB_OWNER || "",
          repo: (import.meta as any).env?.VITE_GITHUB_PUBLIC_REPO || "",
          branch: "main",
          token: "",
          autoSync: false
        });
      }
      setGitConfigLoading(false);
    };

    loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  const saveGitConfig = useCallback(async (newConfig: GitConfig) => {
    let savedSuccessfully = false;
    let lastError: string | null = null;

    try {
      setGitConfig(newConfig);
      try {
        localStorage.setItem('cached_git_config', JSON.stringify(newConfig));
      } catch (e) {}

      // 1. Try saving to server endpoint (Admin SDK) if running on full Express server
      try {
        const res = await adminFetch('/api/github-sync/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newConfig)
        });
        if (res.ok) {
          savedSuccessfully = true;
        } else {
          lastError = `Server returned HTTP ${res.status}`;
        }
      } catch (serverErr: any) {
        lastError = serverErr?.message || 'Server endpoint unreachable';
      }

      // 2. Direct Firestore REST write fallback for static hosts (Cloudflare Pages)
      if (!savedSuccessfully) {
        try {
          const payload = {
            ...newConfig,
            updatedAt: new Date().toISOString()
          };
          const ok = await writeFirestoreDoc('sec_git', 'cfg', payload, { merge: true });
          if (ok) savedSuccessfully = true;
        } catch (dbErr: any) {
          console.error("[GitHub Sync] Direct Firestore config save error:", dbErr);
          lastError = `Firestore write failed: ${dbErr?.message || 'Unknown Firestore error'}`;
        }
      }

      if (!savedSuccessfully) {
        throw new Error(`Failed to save GitHub credentials to database: ${lastError || 'Could not connect to server or Firestore'}`);
      }
    } catch (err: any) {
      console.error("Save Git Config Error:", err);
      throw err;
    }
  }, []);

  const pushAllToGitHub = useCallback(async (
    customConfig?: GitConfig, 
    onProgress?: (msg: string) => void, 
    overrideApps?: any[],
    overrideSettings?: any,
    overrideNews?: any[],
    overrideVideos?: any[]
  ) => {
    const configToUse = customConfig || gitConfig;
    if (!configToUse) {
      throw new Error("GitHub synchronization is not configured.");
    }
    const log = (msg: string) => {
      console.log(msg);
      if (onProgress) onProgress(msg);
    };

    log("GitHub Sync: Querying live database for complete catalog (Apps, News, Settings, Videos)...");
    let liveBackup: any = null;
    try {
      const liveRes = await fetch('/api/v1/public/backup-data-full');
      if (liveRes.ok) {
        liveBackup = await liveRes.json();
        log("GitHub Sync: Live complete catalog retrieved from server backup.");
      } else {
        const fallbackRes = await fetch('/api/v1/public/backup-data');
        if (fallbackRes.ok) {
          liveBackup = await fallbackRes.json();
        }
      }
    } catch (e) {
      log("GitHub Sync Notice: Could not fetch server backup endpoint, querying Firestore directly.");
    }

    // Direct Firestore multi-chunk read to guarantee all 230+ apps, settings, faqs, news, videos are retrieved
    if (isFirebaseReal && db) {
      try {
        log("GitHub Sync: Pulling live chunks directly from Firestore (chunks 0 to 15)...");
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
          videosSnap,
          secureLinksSnap
        ] = await Promise.all([
          getDoc(doc(db, 'store_data', 'apps_meta')).catch(() => null),
          Promise.all(chunkPromises),
          getDoc(doc(db, 'store_data', 'settings')).catch(() => null),
          getDoc(doc(db, 'store_data', 'public_settings')).catch(() => null),
          getDoc(doc(db, 'store_data', 'faqs')).catch(() => null),
          getDoc(doc(db, 'store_data', 'developers')).catch(() => null),
          getDoc(doc(db, 'store_data', 'quick_links')).catch(() => null),
          getDoc(doc(db, 'store_data', 'news')).catch(() => null),
          getDoc(doc(db, 'store_data', 'videos')).catch(() => null),
          getDoc(doc(db, 'store_data', 'secure_links')).catch(() => null)
        ]);

        const maxChunks = (metaSnap && metaSnap.exists && metaSnap.exists() && Number(metaSnap.data()?.numChunks) > 0)
          ? Number(metaSnap.data()?.numChunks)
          : chunks.length;

        let firestoreApps: any[] = [];
        const seenKeys = new Set<string>();
        chunks.slice(0, maxChunks).forEach((chunk) => {
          if (chunk && chunk.exists && chunk.exists()) {
            const cData = chunk.data();
            const items = cData?.items || cData?.apps || [];
            if (Array.isArray(items)) {
              items.forEach((item: any) => {
                const k = item.id || item.slug;
                if (k && !seenKeys.has(k)) {
                  seenKeys.add(k);
                  firestoreApps.push(item);
                }
              });
            }
          }
        });

        let fsSettings: any = {};
        if (settingsSnap && settingsSnap.exists && settingsSnap.exists()) {
          fsSettings = { ...fsSettings, ...settingsSnap.data() };
        }
        if (publicSettingsSnap && publicSettingsSnap.exists && publicSettingsSnap.exists()) {
          fsSettings = { ...fsSettings, ...publicSettingsSnap.data() };
        }
        // Only use separate legacy docs as fallback if settings doesn't already have them
        if ((!fsSettings.website_faqs || fsSettings.website_faqs.length === 0) && faqsSnap && faqsSnap.exists && faqsSnap.exists()) {
          const fData = faqsSnap.data();
          if (Array.isArray(fData?.items)) fsSettings.website_faqs = fData.items;
        }
        if ((!fsSettings.developers || fsSettings.developers.length === 0) && devsSnap && devsSnap.exists && devsSnap.exists()) {
          const dData = devsSnap.data();
          if (Array.isArray(dData?.items)) fsSettings.developers = dData.items;
        }
        if ((!fsSettings.quick_links || fsSettings.quick_links.length === 0) && linksSnap && linksSnap.exists && linksSnap.exists()) {
          const lData = linksSnap.data();
          if (Array.isArray(lData?.items)) fsSettings.quick_links = lData.items;
        }

        let fsNews: any[] = [];
        if (newsSnap && newsSnap.exists && newsSnap.exists()) {
          const nData = newsSnap.data();
          if (Array.isArray(nData?.items)) fsNews = nData.items;
          else if (Array.isArray(nData?.news)) fsNews = nData.news;
        }

        let fsVideos: any[] = [];
        if (videosSnap && videosSnap.exists && videosSnap.exists()) {
          const vData = videosSnap.data();
          if (Array.isArray(vData?.items)) fsVideos = vData.items;
          else if (Array.isArray(vData?.videos)) fsVideos = vData.videos;
        }

        const secureMap = new Map();
        if (secureLinksSnap && secureLinksSnap.exists && secureLinksSnap.exists()) {
          const sData = secureLinksSnap.data();
          if (Array.isArray(sData?.items)) {
            sData.items.forEach((it: any) => {
              if (it?.id && it?.url) secureMap.set(it.id, it.url);
              if (it?.slug && it?.url) secureMap.set(it.slug, it.url);
            });
          }
        }

        if (firestoreApps.length > 0) {
          log(`GitHub Sync: Pulled ${firestoreApps.length} live app(s) directly from Firestore across all chunks.`);
          if (secureMap.size > 0) {
            firestoreApps = firestoreApps.map((a: any) => ({
              ...a,
              more_information_url: a.more_information_url || secureMap.get(a.id) || secureMap.get(a.slug) || ''
            }));
          }
        }

        if (!liveBackup) {
          liveBackup = {
            apps: firestoreApps,
            settings: fsSettings,
            news: fsNews,
            videos: fsVideos
          };
        } else {
          if (firestoreApps.length > 0) {
            liveBackup.apps = firestoreApps;
          }
          liveBackup.settings = { ...fsSettings, ...(liveBackup.settings || {}) };
          if (fsNews.length > 0) liveBackup.news = fsNews;
          if (fsVideos.length > 0) liveBackup.videos = fsVideos;
        }
      } catch (directFsErr: any) {
        log(`GitHub Sync Notice: Direct Firestore query note: ${directFsErr?.message || directFsErr}`);
      }
    }

    const stateApps = (overrideApps && Array.isArray(overrideApps) && overrideApps.length > 0) ? overrideApps : apps;
    const stateSettings = overrideSettings || settings;
    const stateNews = (overrideNews && Array.isArray(overrideNews) && overrideNews.length > 0) ? overrideNews : news;
    const stateVideos = (overrideVideos && Array.isArray(overrideVideos) && overrideVideos.length > 0) ? overrideVideos : videos;

    // Merge targetApps: stateApps (Admin's live dashboard memory) is authoritative for edits, additions, & deletions!
    const backupAppById = new Map<string, any>();
    const backupAppBySlug = new Map<string, any>();
    if (Array.isArray(liveBackup?.apps) && liveBackup.apps.length > 0) {
      liveBackup.apps.forEach((a: any) => {
        if (!a) return;
        const kId = a.id ? String(a.id).toLowerCase().trim() : '';
        const kSlug = a.slug ? String(a.slug).toLowerCase().trim() : '';
        if (kId) backupAppById.set(kId, a);
        if (kSlug) backupAppBySlug.set(kSlug, a);
      });
    }

    let targetApps: any[] = [];
    if (Array.isArray(stateApps) && stateApps.length > 0) {
      const seenAppKeys = new Set<string>();
      for (const sa of stateApps) {
        if (!sa) continue;
        const kId = sa.id ? String(sa.id).toLowerCase().trim() : '';
        const kSlug = sa.slug ? String(sa.slug).toLowerCase().trim() : '';
        const primaryKey = kId || kSlug;
        if (!primaryKey || seenAppKeys.has(primaryKey)) continue;
        seenAppKeys.add(primaryKey);
        if (kSlug) seenAppKeys.add(kSlug);

        const existing = (kId ? backupAppById.get(kId) : null) || (kSlug ? backupAppBySlug.get(kSlug) : null) || {};
        targetApps.push({
          ...existing,
          ...sa,
          more_information_url: sa.more_information_url || existing.more_information_url || '',
          encrypted_link: sa.encrypted_link || existing.encrypted_link || '',
          updated_at: sa.updated_at || existing.updated_at || sa.published_at || existing.published_at || sa.publish_date || existing.publish_date || sa.created_at || existing.created_at || sa.added_date || existing.added_date || sa.date || existing.date || '2026-09-01T00:00:00.000Z'
        });
      }
    } else if (Array.isArray(liveBackup?.apps) && liveBackup.apps.length > 0) {
      targetApps = liveBackup.apps;
    }
    log(`GitHub Sync: Assembled ${targetApps.length} application(s) combining cloud chunks and live admin modifications.`);

    // Target Settings: Live Admin stateSettings is 100% AUTHORITATIVE over stale server backup!
    const targetSettings = {
      ...(liveBackup?.settings || {}),
      ...(stateSettings || {})
    };

    // Explicitly guarantee arrays from stateSettings (developers, faqs, quick_links, categories, banners) take precedence
    if (Array.isArray(stateSettings?.developers)) {
      targetSettings.developers = stateSettings.developers;
    } else if (Array.isArray(liveBackup?.settings?.developers)) {
      targetSettings.developers = liveBackup.settings.developers;
    }

    if (Array.isArray(stateSettings?.website_faqs)) {
      targetSettings.website_faqs = stateSettings.website_faqs;
    } else if (Array.isArray(liveBackup?.settings?.website_faqs)) {
      targetSettings.website_faqs = liveBackup.settings.website_faqs;
    }

    if (Array.isArray(stateSettings?.quick_links)) {
      targetSettings.quick_links = stateSettings.quick_links;
    } else if (Array.isArray(liveBackup?.settings?.quick_links)) {
      targetSettings.quick_links = liveBackup.settings.quick_links;
    }

    if (Array.isArray(stateSettings?.categories)) {
      targetSettings.categories = stateSettings.categories;
    } else if (Array.isArray(liveBackup?.settings?.categories)) {
      targetSettings.categories = liveBackup.settings.categories;
    }

    if (Array.isArray(stateSettings?.banners)) {
      targetSettings.banners = stateSettings.banners;
    } else if (Array.isArray(liveBackup?.settings?.banners)) {
      targetSettings.banners = liveBackup.settings.banners;
    }

    // Social links (Footer)
    if (stateSettings?.social_links && typeof stateSettings.social_links === 'object') {
      targetSettings.social_links = {
        ...(liveBackup?.settings?.social_links || {}),
        ...stateSettings.social_links
      };
    }

    // News: Admin stateNews is authoritative (matches backup by id first so slug edits or deletions never leave ghost entries)
    let targetNews: any[] = [];
    if (Array.isArray(stateNews) && stateNews.length > 0) {
      const backupNewsById = new Map<string, any>();
      const backupNewsBySlug = new Map<string, any>();
      for (const cn of (liveBackup?.news || [])) {
        if (!cn) continue;
        const kId = cn.id ? String(cn.id).toLowerCase().trim() : '';
        const kSlug = cn.slug ? String(cn.slug).toLowerCase().trim() : '';
        if (kId) backupNewsById.set(kId, cn);
        if (kSlug) backupNewsBySlug.set(kSlug, cn);
      }

      const seenNewsKeys = new Set<string>();
      for (const sn of stateNews) {
        if (!sn) continue;
        const kId = sn.id ? String(sn.id).toLowerCase().trim() : '';
        const kSlug = sn.slug ? String(sn.slug).toLowerCase().trim() : '';
        const primaryKey = kId || kSlug;
        if (!primaryKey || seenNewsKeys.has(primaryKey)) continue;
        seenNewsKeys.add(primaryKey);
        if (kSlug) seenNewsKeys.add(kSlug);

        const prev = (kId ? backupNewsById.get(kId) : null) || (kSlug ? backupNewsBySlug.get(kSlug) : null) || {};
        const bestContent = sn.content || sn.description_html || prev.content || prev.description_html || '';
        targetNews.push({
          ...prev,
          ...sn,
          content: bestContent,
          description_html: bestContent,
          updated_at: sn.updated_at || prev.updated_at || sn.published_at || prev.published_at || sn.publish_date || prev.publish_date || sn.created_at || prev.created_at || sn.added_date || prev.added_date || sn.date || prev.date || '2026-09-01T00:00:00.000Z'
        });
      }
    } else if (Array.isArray(liveBackup?.news) && liveBackup.news.length > 0) {
      targetNews = liveBackup.news;
    }

    // Videos: Admin stateVideos is authoritative
    let targetVideos = (Array.isArray(stateVideos) && stateVideos.length > 0)
      ? stateVideos
      : (Array.isArray(liveBackup?.videos) && liveBackup.videos.length > 0)
        ? liveBackup.videos
        : [];

    let finalApps = targetApps;
    if (targetApps.length > 0) {
      log("GitHub Sync: Performing secure merge with local and cloud backups...");
      try {
        const idToken = await getAdminToken();
        if (idToken) {
          const bkRes = await adminFetch('/api/v1/admin/backup-links-get', {
            headers: { 'Authorization': `Bearer ${idToken}` }
          });
          if (bkRes.ok) {
            const bkText = await bkRes.text();
            let bkJSON;
            try {
              bkJSON = JSON.parse(bkText);
            } catch (e) {
              throw new Error(`Backup server returned invalid data (${bkRes.status})`);
            }
            
            if (bkJSON && bkJSON.items) {
              const secureMap = new Map();
              bkJSON.items.forEach((it: any) => {
                if (it.url) secureMap.set(it.id, it.url);
              });
              finalApps = targetApps.map((a: any) => {
                const backupUrl = secureMap.get(a.id) || '';
                return {
                  ...a,
                  more_information_url: a.more_information_url || backupUrl
                };
              });
              log("GitHub Sync: Secure link verification and merging completed.");
            }
          }
        }
      } catch (bkErr: any) {
        log(`GitHub Sync Warning: Secure link merge bypass: ${bkErr.message}`);
      }
    }

    // Pull live community reviews, comments, and atomic rating distributions via unified engine
    let communityStatsPayload: any = null;
    let communityReviewsPayload: Record<string, any> = {};

    try {
      log("GitHub Sync: Compiling unified community reviews ledger & atomic ratings...");
      const { buildPublicCommunitySyncBundle } = await import('../lib/communityFirebase');
      const syncBundle = await buildPublicCommunitySyncBundle(finalApps);
      finalApps = syncBundle.harmonizedApps;
      communityStatsPayload = syncBundle.communityStatsPayload;
      communityReviewsPayload = syncBundle.communityReviewsPayload;
      log(
        `GitHub Sync: Harmonized ${communityStatsPayload.totalReviews || 0} published review(s) across ${communityStatsPayload.appCoverageCount || 0} app(s) (Overall Avg: ${communityStatsPayload.averageRating || 4.7}★).`
      );
    } catch (e: any) {
      log(`GitHub Sync Notice: Rating harmonization note: ${e?.message || 'bypassed'}`);
    }

    // Filter apps and news based on sync_to_public status (default is true for live public)
    const publicApps = finalApps.filter((app: any) => app.sync_to_public !== false);
    const publicNews = targetNews
      .filter((item: any) => item.sync_to_public !== false)
      .map((item: any) => compileCanonicalNews(item));
    const unpushedAppsCount = finalApps.length - publicApps.length;
    const unpushedNewsCount = targetNews.length - publicNews.length;

    if (unpushedAppsCount > 0 || unpushedNewsCount > 0) {
      log(`GitHub Sync: Kept ${unpushedAppsCount} draft app(s) and ${unpushedNewsCount} draft news item(s) in Admin Only (Public Sync = OFF). Pushing ${publicApps.length} live app(s) and ${publicNews.length} live news item(s) to public website.`);
    }

    const finalSettings = ensureDefaultSettings(targetSettings);
    const updatedCode = generateStaticDataFileCode(publicApps, finalSettings, publicNews, targetVideos);

    // Server backup retains AES-encrypted link fields for backend resolution
    const safeBackupApps = publicApps.map((app: any) => compileCanonicalApp(app, { stripDownloadLinks: false }));
    // Public static bundle strips all download URLs completely (Zero-Leak Link Security)
    const cleanPublicStaticApps = publicApps.map((app: any) => compileCanonicalApp(app, { stripDownloadLinks: true }));

    // Fallback: If reviews payload is empty, load from existing communityStaticReviews without artificial limits
    if (!communityReviewsPayload || Object.keys(communityReviewsPayload).length === 0) {
      try {
        const existingReviews = await import('../lib/communityStaticReviews.json');
        const rawMap = (existingReviews.default || existingReviews) as Record<string, any[]>;
        const slicedMap: Record<string, any[]> = {};
        for (const [key, list] of Object.entries(rawMap)) {
          if (Array.isArray(list)) {
            slicedMap[key] = list;
          }
        }
        communityReviewsPayload = slicedMap;
      } catch (_) {}
    }

    const consolidatedBackupPayload = {
      apps: safeBackupApps,
      settings: finalSettings,
      news: publicNews,
      videos: targetVideos,
      reviews: []
    };

    const consolidatedStaticPayload = {
      apps: cleanPublicStaticApps,
      settings: sanitizePublicSettings(finalSettings),
      news: publicNews,
      videos: targetVideos,
      reviews: []
    };

    // Compact minified JSON encoding with zero duplicate mock* keys (50%+ smaller payload)
    const backupJsonCode = JSON.stringify(consolidatedBackupPayload);
    const staticJsonCode = JSON.stringify(consolidatedStaticPayload);
    const catalogStatsCode = JSON.stringify(communityStatsPayload || { appCounts: {}, totalReviews: 0 });
    const staticReviewsCode = JSON.stringify(communityReviewsPayload);

    try {
      const idToken = await getAdminToken();
      if (idToken) {
        log("GitHub Sync: Synchronizing local static files and sitemaps...");
        await adminFetch('/api/v1/admin/sync-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
          body: JSON.stringify({
            apps: safeBackupApps,
            settings: finalSettings,
            news: publicNews,
            videos: targetVideos,
            catalogStats: communityStatsPayload || null,
            staticReviews: communityReviewsPayload || null
          })
        });
      }
    } catch (localSyncErr: any) {
      log(`GitHub Sync Notice: Local files backup note: ${localSyncErr?.message || 'skipped'}`);
    }

    let targetRepo = (configToUse.repo || (import.meta as any).env?.VITE_GITHUB_PUBLIC_REPO || '').trim();
    if (!configToUse.owner || !targetRepo) throw new Error("Missing GitHub repository owner or repository name configuration.");

    try {
      log(`GitHub Sync: Preparing complete compressed release bundle for "${targetRepo}"...`);

      // 1. Pre-build AES Encrypted Vault & Public API bundle so all files can be committed together
      let vaultCode = "";
      let apiBundleContent = "";

      try {
        log(`GitHub Sync: Building AES Encrypted Vault...`);
        let vaultCiphertext = "";

        try {
          const idToken = await getAdminToken();
          const vaultRes = await adminFetch('/api/v1/admin/seal-vault', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}) },
             body: JSON.stringify({ items: publicApps })
          });

          if (vaultRes.ok) {
            const vaultData = await vaultRes.json();
            if (vaultData.ciphertext) {
              vaultCiphertext = vaultData.ciphertext;
            }
          }
        } catch (_) {}

        // Fallback: If server returned 405 (static host / edge), seal vault directly on client
        if (!vaultCiphertext) {
          const AES_SECRET = getAesSecret();
          const vaultMap: Record<string, string> = {};
          publicApps.forEach((item: any) => {
            const id = String(item.id || '').trim();
            const slug = String(item.slug || '').trim();
            const rawUrl = item.more_information_url || item.encrypted_link || item.url || '';
            if (!rawUrl || typeof rawUrl !== 'string') return;
            const trimmed = rawUrl.trim();
            if (trimmed.toLowerCase().includes('mediafire.com') || trimmed.includes('com.example')) return;
            const plainUrl = trimmed.startsWith('U2FsdGVkX1') ? (safeDecrypt(trimmed, AES_SECRET) || safeDecrypt(trimmed) || trimmed) : trimmed;
            if (!plainUrl || (!plainUrl.startsWith('http://') && !plainUrl.startsWith('https://'))) return;
            if (id) vaultMap[id] = plainUrl;
            if (slug) vaultMap[slug] = plainUrl;
          });
          vaultCiphertext = safeEncrypt(JSON.stringify(vaultMap), AES_SECRET);
        }

        if (vaultCiphertext) {
          vaultCode = generateSecureVaultFile(vaultCiphertext);
          log(`GitHub Sync: ✅ AES Encrypted Vault sealed.`);
        }
      } catch (vaultErr: any) {
        log(`GitHub Sync Warning (Vault build): ${vaultErr?.message || 'skipped'}`);
      }

      // 2. Assemble ALL primary files together for 1 single atomic commit
      const primaryBatchFiles: { path: string; content: string }[] = [
        {
          path: 'src/lib/staticData.ts',
          content: updatedCode
        },
        {
          path: 'src/lib/communityCatalogStats.json',
          content: catalogStatsCode
        },
        {
          path: 'src/lib/communityStaticReviews.json',
          content: staticReviewsCode
        },
        {
          path: 'src/lib/staticData.json',
          content: staticJsonCode
        },
        {
          path: 'public-api/staticData.json',
          content: staticJsonCode
        }
      ];

      // Pull latest public core source code (App.tsx, lazyWithRetry, GlobalErrorBoundary, PublicFooter) for Dex
      try {
        const idToken = await getAdminToken();
        const coreRes = await adminFetch('/api/github-sync/public-core-files', {
          headers: idToken ? { 'Authorization': `Bearer ${idToken}` } : {}
        });
        if (coreRes.ok) {
          const coreData = await coreRes.json();
          if (coreData?.files) {
            for (const [fPath, fContent] of Object.entries(coreData.files)) {
              if (fContent && typeof fContent === 'string') {
                primaryBatchFiles.push({ path: fPath, content: fContent });
              }
            }
            log(`GitHub Sync: Added ${Object.keys(coreData.files).length} public core source files to sync bundle.`);
          }
        }
      } catch (coreErr: any) {
        log(`GitHub Sync Note: Core files fetch note: ${coreErr?.message || 'skipped'}`);
      }

      if (vaultCode) {
        primaryBatchFiles.push({
          path: 'src/lib/secureVault.ts',
          content: vaultCode
        });
      }

      if (apiBundleContent) {
        primaryBatchFiles.push({
          path: 'api/index.js',
          content: apiBundleContent
        });
      }

      // Generate XML sitemaps, site.webmanifest, and opensearch.xml for instant static hosting and search engine discoverability
      try {
        const sitemaps = generateAllSitemaps({
          apps: publicApps,
          settings: finalSettings,
          news: publicNews,
          videos: targetVideos
        });
        for (const [filename, xmlContent] of Object.entries(sitemaps)) {
          primaryBatchFiles.push({
            path: `public/${filename}`,
            content: xmlContent
          });
        }

        const publicDomain = ((import.meta as any).env?.VITE_PUBLIC_DOMAIN || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/+$/, '');
        const sitemapLines = publicDomain
          ? `\nSitemap: ${publicDomain}/sitemap.xml\nSitemap: ${publicDomain}/sitemap-news.xml\nSitemap: ${publicDomain}/sitemap-apps.xml\nSitemap: ${publicDomain}/sitemap-static.xml\nSitemap: ${publicDomain}/sitemap-videos.xml\nSitemap: ${publicDomain}/sitemap-developers.xml\n`
          : '';
        const robotsContent = `User-agent: *\nAllow: /\nAllow: /api/v1/public/\nDisallow: /api/\nDisallow: /admin/\nDisallow: /login/\nDisallow: /masterworld/\nDisallow: /s/\nDisallow: /s/*\nDisallow: /dl/\nDisallow: /dl/*\nDisallow: /out/\nDisallow: /out/*\nDisallow: /download/\nDisallow: /download/*\nDisallow: /gateway/\nDisallow: /gateway/*\nDisallow: /moreinfo/\nDisallow: /moreinfo/*\nDisallow: /info/\nDisallow: /info/*\nDisallow: /moredetail/\nDisallow: /moredetail/*\n${sitemapLines}`;
        primaryBatchFiles.push({
          path: 'public/robots.txt',
          content: robotsContent
        });

        const { getAllSiteIconUrls } = await import('../seo/utils');
        const icons = getAllSiteIconUrls(finalSettings, publicDomain);
        const siteTitle = String(finalSettings?.site_title || (import.meta as any).env?.VITE_SITE_NAME || '').trim();
        const manifestContent = JSON.stringify({
          id: '/',
          start_url: '/',
          scope: '/',
          name: siteTitle,
          short_name: siteTitle,
          display: 'standalone',
          orientation: 'portrait',
          lang: 'en-IN',
          icons: [
            {
              src: icons.android192 || '/android-chrome-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: icons.android512 || '/android-chrome-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          theme_color: '#2563eb',
          background_color: '#ffffff',
          shortcuts: [
            {
              name: 'News',
              url: '/news'
            }
          ]
        }, null, 2);
        primaryBatchFiles.push({
          path: 'public/site.webmanifest',
          content: manifestContent
        });

        const openSearchTitle = (siteTitle || 'Search').replace(/[<>&'"]/g, '');
        const openSearchIcon = icons.favicon16
          ? `\n  <Image width="16" height="16" type="image/png">${icons.favicon16.replace(/&/g, '&amp;')}</Image>`
          : '';
        const openSearchXml = `<?xml version="1.0" encoding="UTF-8"?>\n<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">\n  <ShortName>${openSearchTitle}</ShortName>\n  <Description>Search applications</Description>\n  <InputEncoding>UTF-8</InputEncoding>${openSearchIcon}\n  <Url type="text/html" template="${publicDomain || ''}/?s={searchTerms}"/>\n</OpenSearchDescription>\n`;
        primaryBatchFiles.push({
          path: 'public/opensearch.xml',
          content: openSearchXml
        });
      } catch (sitemapErr) {
        log(`GitHub Sync Warning: Could not auto-generate public XML sitemaps: ${(sitemapErr as any)?.message}`);
      }

      // 3. Push ALL primary files together in 1 SINGLE ATOMIC COMMIT to Public Website Repo
      await commitMultiFilesToGitHub({
        owner: configToUse.owner,
        repo: targetRepo,
        token: configToUse.token,
        branch: configToUse.branch || 'main',
        files: primaryBatchFiles,
        message: `Public Release: Complete Catalog, Community Data & Secure Vault Synchronization`,
        onProgress: (m) => log(m)
      });
      log(`GitHub Sync: ✅ Success! All ${primaryBatchFiles.length} files committed together to public repo "${targetRepo}" in 1 commit (Exactly 1 deployment). Admin remains fully isolated on Firebase.`);
    } catch (err: any) {
      throw new Error(`Failed to sync data to public repository (${targetRepo}): ${err.message}`);
    }

    try {
      await updateLocalContainerBackup(finalApps, targetSettings, targetNews, targetVideos);
    } catch (err: any) {}

    return { success: true, targetRepo, timestamp: new Date().toISOString() };
  }, [gitConfig, apps, settings, news, videos, updateLocalContainerBackup]);

  return {
    gitConfig,
    gitConfigLoading,
    saveGitConfig,
    pushAllToGitHub,
    getAdminToken
  };
}
