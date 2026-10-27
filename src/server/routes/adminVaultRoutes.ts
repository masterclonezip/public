import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { safeEncrypt, safeDecrypt, getAesSecret } from '../../lib/secureVault';
import { fetchStoreData, clearSeoCache } from '../../seoHelper';
import { compileCanonicalApp, compileCanonicalNews, generateStaticDataFileCode, sanitizePublicSettings, generateSecureVaultFile } from '../../lib/githubSync';
import { generateAllSitemaps } from '../../lib/sitemapGenerator';
import { cleanSettingsMetaTitles } from '../../lib/seoUtils';
import { getAllSiteIconUrls } from '../../seo/utils';

export const adminVaultRouter = Router();

const staticJsonPath = path.join(process.cwd(), 'src/lib/staticData.json');
const staticTsPath = path.join(process.cwd(), 'src/lib/staticData.ts');

function stripTimestampFields(item: any) {
  if (!item || typeof item !== 'object') return item;
  const copy = { ...item };
  delete copy.updated_at;
  delete copy._rest_admin_bypass;
  return copy;
}

function hasItemContentChanged(prevItem: any, nextItem: any): boolean {
  if (!prevItem) return true;
  try {
    return JSON.stringify(stripTimestampFields(prevItem)) !== JSON.stringify(stripTimestampFields(nextItem));
  } catch (_) {
    return true;
  }
}

function getMergedData() {
  let staticBase: any = {};
  if (fs.existsSync(staticJsonPath)) {
    try {
      staticBase = JSON.parse(fs.readFileSync(staticJsonPath, 'utf8'));
    } catch (_) {}
  }

  const apps = Array.isArray(staticBase.apps) ? staticBase.apps : (staticBase.mockApps || []);
  const settings = staticBase.settings || staticBase.mockSettings || {};
  const news = Array.isArray(staticBase.news) ? staticBase.news : (staticBase.mockNews || []);
  const videos = Array.isArray(staticBase.videos) ? staticBase.videos : (staticBase.mockVideos || []);
  const reviews = Array.isArray(staticBase.reviews) ? staticBase.reviews : [];

  return { apps, settings, news, videos, reviews };
}

function writeMergedData(data: any) {
  const siteTitle = typeof data.settings?.site_title === 'string' ? data.settings.site_title.trim() : '';
  const canonicalNews = Array.isArray(data.news)
    ? data.news.map((item: any) => compileCanonicalNews(item, siteTitle))
    : [];

  const updatedSettings = cleanSettingsMetaTitles({
    ...(data.settings || {}),
    last_updated: data.settings?.last_updated || new Date().toISOString()
  });

  const publicApps = Array.isArray(data.apps)
    ? data.apps
        .filter((app: any) => app && app.sync_to_public !== false)
        .map((app: any) => compileCanonicalApp(app, { stripDownloadLinks: true, siteTitle }))
    : [];

  const publicNews = canonicalNews.filter((item: any) => item && item.sync_to_public !== false);

  const publicSettings = sanitizePublicSettings(updatedSettings);

  const publicStaticPayload = {
    apps: publicApps,
    settings: publicSettings,
    news: publicNews,
    videos: Array.isArray(data.videos) ? data.videos : [],
    reviews: Array.isArray(data.reviews) ? data.reviews : []
  };

  try {
    fs.writeFileSync(staticJsonPath, JSON.stringify(publicStaticPayload), 'utf8');
  } catch (e) {
    console.error('[adminVaultRoutes] Failed to write staticData.json:', e);
  }
  try {
    const staticTsCode = generateStaticDataFileCode(
      publicApps,
      publicSettings,
      publicNews,
      publicStaticPayload.videos
    );
    fs.writeFileSync(staticTsPath, staticTsCode, 'utf8');
  } catch (e) {
    console.error('[adminVaultRoutes] Failed to write staticData.ts:', e);
  }

  // Automatically regenerate and save all XML + GZip sitemaps + site.webmanifest + opensearch.xml to disk
  try {
    const sitemaps = generateAllSitemaps(publicStaticPayload);
    const publicDir = path.join(process.cwd(), 'public');
    const distDir = path.join(process.cwd(), 'dist');
    for (const [filename, content] of Object.entries(sitemaps)) {
      const gzBuffer = zlib.gzipSync(Buffer.from(content, 'utf8'), { level: 9 });
      try {
        fs.writeFileSync(path.join(publicDir, filename), content, 'utf8');
        fs.writeFileSync(path.join(publicDir, `${filename}.gz`), gzBuffer);
      } catch (_) {}
      if (fs.existsSync(distDir)) {
        try {
          fs.writeFileSync(path.join(distDir, filename), content, 'utf8');
          fs.writeFileSync(path.join(distDir, `${filename}.gz`), gzBuffer);
        } catch (_) {}
      }
    }

    // Update site.webmanifest with auto-sized 192x192 & 512x512 icons and site_title
    const icons = getAllSiteIconUrls(publicSettings);
    const siteTitle = String(publicSettings?.site_title || process.env.VITE_SITE_NAME || '').trim();
    const manifestObj = {
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
    };
    const manifestJson = JSON.stringify(manifestObj, null, 2);
    try {
      fs.writeFileSync(path.join(publicDir, 'site.webmanifest'), manifestJson, 'utf8');
      if (fs.existsSync(distDir)) {
        fs.writeFileSync(path.join(distDir, 'site.webmanifest'), manifestJson, 'utf8');
      }
    } catch (_) {}
  } catch (e) {
    console.error('[adminVaultRoutes] Failed to write sitemaps/manifest:', e);
  }

  clearSeoCache();
}

adminVaultRouter.get('/api/v1/admin/data', async (req, res) => {
  try {
    clearSeoCache();
    const storeData = await fetchStoreData();
    res.json({
      success: true,
      source: 'live_firestore',
      apps: storeData.apps || [],
      settings: storeData.settings || {},
      news: storeData.news || [],
      videos: storeData.videos || []
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

adminVaultRouter.post('/api/v1/admin/save-news', (req, res) => {
  try {
    const { news } = req.body || {};
    if (Array.isArray(news)) {
      const now = new Date().toISOString();
      const current = getMergedData();
      const existingById = new Map<string, any>();
      const existingBySlug = new Map<string, any>();
      for (const prev of current.news || []) {
        if (prev?.id) existingById.set(String(prev.id).trim(), prev);
        if (prev?.slug) existingBySlug.set(String(prev.slug).trim().toLowerCase(), prev);
      }

      const siteTitle = typeof current.settings?.site_title === 'string' ? current.settings.site_title.trim() : '';
      current.news = news.map((n: any) => {
        const idKey = String(n?.id || '').trim();
        const slugKey = String(n?.slug || '').trim().toLowerCase();
        const prev = (idKey && existingById.get(idKey)) || (slugKey && existingBySlug.get(slugKey));
        const normalizedPrev = prev ? compileCanonicalNews(prev, siteTitle) : null;
        const normalizedNext = compileCanonicalNews(n, siteTitle);
        const changed = hasItemContentChanged(normalizedPrev, normalizedNext);
        const preservedDate = prev?.updated_at || n?.updated_at || n?.published_at || n?.publish_date || n?.created_at || now;
        return compileCanonicalNews({
          ...n,
          updated_at: changed ? now : preservedDate
        }, siteTitle);
      });

      writeMergedData(current);
      return res.json({ success: true, count: current.news.length, news: current.news });
    }
    res.status(400).json({ success: false, error: 'News array required' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

adminVaultRouter.post('/api/v1/admin/app/save', async (req, res) => {
  try {
    const { app } = req.body || {};
    if (app && (app.id || app.slug)) {
      const now = new Date().toISOString();
      const current = getMergedData();
      const siteTitle = typeof current.settings?.site_title === 'string' ? current.settings.site_title.trim() : '';
      const appWithTime = compileCanonicalApp({ ...app, updated_at: now }, { stripDownloadLinks: false, siteTitle });
      const idx = current.apps.findIndex((a: any) => a.id === appWithTime.id || (appWithTime.slug && a.slug === appWithTime.slug));
      if (idx >= 0) {
        current.apps[idx] = { ...current.apps[idx], ...appWithTime, updated_at: now };
      } else {
        current.apps.push(appWithTime);
      }
      writeMergedData(current);

      // Update RAM vault and re-seal src/lib/secureVault.ts if the app has a destination link
      try {
        const { encryptAesGcmV2, decryptVaultValue } = await import('../crypto.js');
        const { setRamVaultLink, isValidDestinationUrl } = await import('../services/linkService.js');
        const AES_SECRET = getAesSecret();
        const hasV2Key = Boolean(process.env.AES_KEY && process.env.AES_KEY.trim());
        const vaultMap: Record<string, string> = {};
        for (const item of current.apps) {
          if (!item || item.sync_to_public === false) continue;
          const id = String(item.id || '').trim();
          const slug = String(item.slug || '').trim();
          const rawUrl = item.more_information_url || item.encrypted_link || item.url || '';
          if (!rawUrl || typeof rawUrl !== 'string') continue;
          const trimmed = rawUrl.trim();
          if (trimmed.toLowerCase().includes('mediafire.com') || trimmed.includes('com.example')) continue;
          const plainUrl = trimmed.startsWith('v2.') || trimmed.startsWith('U2FsdGVkX1')
            ? (await decryptVaultValue(trimmed)) || safeDecrypt(trimmed, AES_SECRET) || ''
            : trimmed;
          if (!isValidDestinationUrl(plainUrl)) continue;
          if (id) {
            vaultMap[id] = plainUrl;
            setRamVaultLink(id, plainUrl);
          }
          if (slug) {
            vaultMap[slug] = plainUrl;
            setRamVaultLink(slug, plainUrl);
          }
        }
        const jsonPayload = JSON.stringify(vaultMap);
        const ciphertext = hasV2Key
          ? (await encryptAesGcmV2(jsonPayload, process.env as Record<string, string | undefined>)) || safeEncrypt(jsonPayload, AES_SECRET)
          : safeEncrypt(jsonPayload, AES_SECRET);
        if (ciphertext) {
          const vaultFilePath = path.join(process.cwd(), 'src/lib/secureVault.ts');
          fs.writeFileSync(vaultFilePath, generateSecureVaultFile(ciphertext), 'utf8');
        }
      } catch (vaultErr) {
        console.warn('[adminVaultRoutes] Notice updating vault on single app save:', vaultErr);
      }

      return res.json({ success: true, app: appWithTime });
    }
    res.status(400).json({ success: false, error: 'App object required' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

adminVaultRouter.post('/api/v1/admin/save-apps', (req, res) => {
  try {
    const { apps } = req.body || {};
    if (Array.isArray(apps)) {
      const now = new Date().toISOString();
      const current = getMergedData();
      const existingById = new Map<string, any>();
      const existingBySlug = new Map<string, any>();
      for (const prev of current.apps || []) {
        if (prev?.id) existingById.set(String(prev.id).trim(), prev);
        if (prev?.slug) existingBySlug.set(String(prev.slug).trim().toLowerCase(), prev);
      }

      const siteTitle = typeof current.settings?.site_title === 'string' ? current.settings.site_title.trim() : '';
      current.apps = apps.map((a: any) => {
        const idKey = String(a?.id || '').trim();
        const slugKey = String(a?.slug || '').trim().toLowerCase();
        const prev = (idKey && existingById.get(idKey)) || (slugKey && existingBySlug.get(slugKey));
        const normalizedPrev = prev ? compileCanonicalApp(prev, { stripDownloadLinks: false, siteTitle }) : null;
        const normalizedNext = compileCanonicalApp(a, { stripDownloadLinks: false, siteTitle });
        const changed = hasItemContentChanged(normalizedPrev, normalizedNext);
        const preservedDate = prev?.updated_at || a?.updated_at || a?.publish_date || a?.created_at || now;
        return compileCanonicalApp({
          ...a,
          updated_at: changed ? now : preservedDate
        }, { stripDownloadLinks: false, siteTitle });
      });

      writeMergedData(current);
      return res.json({ success: true, count: current.apps.length });
    }
    res.status(400).json({ success: false, error: 'Apps array required' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

adminVaultRouter.post('/api/v1/admin/app/delete', (req, res) => {
  try {
    const { id } = req.body || {};
    if (id) {
      const current = getMergedData();
      current.apps = current.apps.filter((a: any) => a.id !== id && a.slug !== id);
      writeMergedData(current);
      return res.json({ success: true, id });
    }
    res.status(400).json({ success: false, error: 'App ID required' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

adminVaultRouter.post('/api/v1/admin/save-settings', (req, res) => {
  try {
    const { settings } = req.body || {};
    if (settings) {
      const current = getMergedData();
      current.settings = { ...current.settings, ...settings, last_updated: new Date().toISOString() };
      writeMergedData(current);
      return res.json({ success: true, settings: current.settings });
    }
    res.status(400).json({ success: false, error: 'Settings object required' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

adminVaultRouter.post('/api/v1/admin/settings/save-section', (req, res) => {
  try {
    const { section, data, settings } = req.body || {};
    const current = getMergedData();
    if (settings && typeof settings === 'object') {
      current.settings = { ...current.settings, ...settings, last_updated: new Date().toISOString() };
    } else if (section) {
      if (section === 'general' || section === 'seo') {
        current.settings = { ...current.settings, ...(data || {}), last_updated: new Date().toISOString() };
      } else {
        current.settings = { ...current.settings, [section]: data, last_updated: new Date().toISOString() };
      }
    }
    writeMergedData(current);
    return res.json({ success: true, settings: current.settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

adminVaultRouter.post('/api/v1/admin/save-videos', (req, res) => {
  try {
    const { videos } = req.body || {};
    if (Array.isArray(videos)) {
      const current = getMergedData();
      current.videos = videos;
      writeMergedData(current);
      return res.json({ success: true, count: videos.length });
    }
    res.status(400).json({ success: false, error: 'Videos array required' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

adminVaultRouter.post('/api/v1/admin/save-data', (req, res) => {
  try {
    const { apps, settings, news, videos } = req.body || {};
    const current = getMergedData();
    if (Array.isArray(apps)) current.apps = apps;
    if (settings && typeof settings === 'object') current.settings = { ...current.settings, ...settings };
    if (Array.isArray(news)) current.news = news;
    if (Array.isArray(videos)) current.videos = videos;
    writeMergedData(current);
    return res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

adminVaultRouter.post('/api/v1/admin/encrypt', async (req, res) => {
  try {
    const { url } = req.body || {};
    const plainUrl = String(url || '').trim();
    if (!plainUrl) {
      return res.status(400).json({ status: 'ERROR', error: 'URL required' });
    }
    if (plainUrl.startsWith('v2.') || plainUrl.startsWith('U2FsdGVkX1')) {
      return res.json({ status: 'OK', encrypted: plainUrl });
    }
    const { encryptAesGcmV2 } = await import('../crypto.js');
    const AES_SECRET = getAesSecret();
    const hasV2Key = Boolean(process.env.AES_KEY && process.env.AES_KEY.trim());
    const encrypted = hasV2Key
      ? (await encryptAesGcmV2(plainUrl, process.env as Record<string, string | undefined>)) || safeEncrypt(plainUrl, AES_SECRET)
      : safeEncrypt(plainUrl, AES_SECRET);
    return res.json({ status: 'OK', encrypted });
  } catch (err: any) {
    res.status(500).json({ status: 'ERROR', error: err?.message });
  }
});

adminVaultRouter.post('/api/v1/admin/encrypt-links', async (req, res) => {
  try {
    const { items } = req.body || {};
    const { encryptAesGcmV2 } = await import('../crypto.js');
    const { setRamVaultLink } = await import('../services/linkService.js');
    const AES_SECRET = getAesSecret();
    const hasV2Key = Boolean(process.env.AES_KEY && process.env.AES_KEY.trim());

    const encryptedItems = [];
    if (Array.isArray(items)) {
      for (const item of items) {
        const plainUrl = String(item?.url || '').trim();
        if (plainUrl) {
          if (item.id) setRamVaultLink(String(item.id), plainUrl);
          if (item.slug) setRamVaultLink(String(item.slug), plainUrl);
        }
        let encrypted_link = '';
        if (plainUrl) {
          encrypted_link = hasV2Key
            ? (await encryptAesGcmV2(plainUrl, process.env as Record<string, string | undefined>)) || safeEncrypt(plainUrl, AES_SECRET)
            : safeEncrypt(plainUrl, AES_SECRET);
        }
        encryptedItems.push({
          id: item.id,
          slug: item.slug,
          encrypted_link,
        });
      }
    }
    return res.json({ success: true, count: encryptedItems.length, items: encryptedItems });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

adminVaultRouter.post('/api/v1/admin/seal-vault', async (req, res) => {
  try {
    const { items } = req.body || {};
    const { encryptAesGcmV2, decryptVaultValue } = await import('../crypto.js');
    const { setRamVaultLink, isValidDestinationUrl } = await import('../services/linkService.js');
    const AES_SECRET = getAesSecret();
    const hasV2Key = Boolean(process.env.AES_KEY && process.env.AES_KEY.trim());
    const vaultMap: Record<string, string> = {};

    if (Array.isArray(items)) {
      for (const item of items) {
        const id = String(item.id || '').trim();
        const slug = String(item.slug || '').trim();
        const rawUrl = item.more_information_url || item.encrypted_link || item.url || '';
        if (!rawUrl || typeof rawUrl !== 'string') continue;
        const trimmed = rawUrl.trim();
        if (
          trimmed.toLowerCase().includes('mediafire.com') ||
          trimmed.includes('com.example')
        ) {
          continue;
        }
        const plainUrl =
          trimmed.startsWith('v2.') || trimmed.startsWith('U2FsdGVkX1')
            ? (await decryptVaultValue(trimmed)) || safeDecrypt(trimmed, AES_SECRET) || ''
            : trimmed;
        if (!isValidDestinationUrl(plainUrl)) continue;
        if (id) {
          vaultMap[id] = plainUrl;
          setRamVaultLink(id, plainUrl);
        }
        if (slug) {
          vaultMap[slug] = plainUrl;
          setRamVaultLink(slug, plainUrl);
        }
      }
    }

    const jsonPayload = JSON.stringify(vaultMap);
    const ciphertext = hasV2Key
      ? (await encryptAesGcmV2(jsonPayload, process.env as Record<string, string | undefined>)) || safeEncrypt(jsonPayload, AES_SECRET)
      : safeEncrypt(jsonPayload, AES_SECRET);

    if (ciphertext) {
      try {
        const vaultFilePath = path.join(process.cwd(), 'src/lib/secureVault.ts');
        fs.writeFileSync(vaultFilePath, generateSecureVaultFile(ciphertext), 'utf8');
      } catch (e) {
        console.warn('[adminVaultRoutes] Could not write src/lib/secureVault.ts:', e);
      }
    }
    res.json({ success: true, ciphertext });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

adminVaultRouter.post('/api/v1/admin/build-public-api', async (req, res) => {
  try {
    const { ciphertext } = req.body || {};
    const content = generateSecureVaultFile(String(ciphertext || ''));
    res.json({ success: true, content });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

adminVaultRouter.post('/api/v1/admin/sync-local', (req, res) => {
  try {
    const { apps, settings, news, videos, catalogStats, staticReviews } = req.body || {};
    const current = getMergedData();
    if (Array.isArray(apps) && apps.length > 0) current.apps = apps;
    if (settings && Object.keys(settings).length > 0) current.settings = { ...(current.settings || {}), ...settings };
    if (Array.isArray(news) && news.length > 0) current.news = news;
    if (Array.isArray(videos) && videos.length > 0) current.videos = videos;
    writeMergedData(current);

    if (catalogStats && typeof catalogStats === 'object') {
      try {
        const statsPath = path.join(process.cwd(), 'src/lib/communityCatalogStats.json');
        fs.writeFileSync(statsPath, JSON.stringify(catalogStats), 'utf8');
      } catch (e) {
        console.warn('[adminVaultRoutes] Failed writing communityCatalogStats.json:', e);
      }
    }
    if (staticReviews && typeof staticReviews === 'object' && Object.keys(staticReviews).length > 0) {
      try {
        const revsPath = path.join(process.cwd(), 'src/lib/communityStaticReviews.json');
        fs.writeFileSync(revsPath, JSON.stringify(staticReviews), 'utf8');
      } catch (e) {
        console.warn('[adminVaultRoutes] Failed writing communityStaticReviews.json:', e);
      }
    }

    res.json({ success: true, message: 'Local files and SEO caches synchronized' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

adminVaultRouter.get('/api/v1/admin/backup-links-get', (req, res) => {
  const current = getMergedData();
  const items = (current.apps || [])
    .filter((a: any) => a && (a.more_information_url || a.encrypted_link))
    .map((a: any) => ({
      id: a.id,
      slug: a.slug,
      url: a.more_information_url || a.encrypted_link || ''
    }));
  res.json({ items });
});
