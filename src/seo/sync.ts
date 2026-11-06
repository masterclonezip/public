import fs from 'fs';
import path from 'path';
import { getRawFirebaseConfig, parseFirestoreDoc } from './firebaseConfig';
import { formatPageTitle, cleanSettingsMetaTitles, isPublicReadyApp, isPublicReadyNews } from '../lib/seoUtils';

function cleanItemSeo(item: any): any {
  if (!item || typeof item !== 'object') return item;
  if (typeof item.slug === 'string') {
    item.slug = item.slug.trim().replace(/^\/+|\/+$/g, '');
  }
  if (typeof item.id === 'string') {
    item.id = item.id.trim();
  }
  if (typeof item.title === 'string' && item.title.trim()) {
    item.title = formatPageTitle(item.title.trim(), '');
  }
  const rawTitle = (item.seo_title || item.meta_title || '').trim();
  if (rawTitle) {
    const cleanTitle = formatPageTitle(rawTitle, '');
    item.seo_title = cleanTitle;
    item.meta_title = cleanTitle;
  }
  const rawDesc = (item.seo_description || item.meta_description || '').trim();
  if (rawDesc) {
    item.seo_description = rawDesc;
    item.meta_description = rawDesc;
  }
  return item;
}

function getItemTimestampMs(item: any): number {
  if (!item || typeof item !== 'object') return 0;
  const raw = item.updated_at || item.published_at || item.publish_date || item.created_at || item.added_date || item.date || '';
  if (!raw) return 0;
  const parsed = Date.parse(String(raw));
  return isNaN(parsed) ? 0 : parsed;
}

export function mergeItemsByTimestamp(localItems: any[], remoteItems: any[], isAuthoritativeRemote = false): any[] {
  const localMap = new Map<string, any>();
  for (const local of (localItems || [])) {
    if (!local) continue;
    const cleaned = cleanItemSeo({ ...local });
    const key = String(cleaned.id || cleaned.slug || '').toLowerCase().trim();
    if (key) localMap.set(key, cleaned);
  }

  // When remoteItems come from live Firestore, treat remoteItems as the authoritative catalog set
  // so deleted items in Firestore are not resurrected from local static fallbacks.
  if (isAuthoritativeRemote && Array.isArray(remoteItems) && remoteItems.length > 0) {
    const authoritativeMap = new Map<string, any>();
    for (const item of remoteItems) {
      if (!item) continue;
      const cleaned = cleanItemSeo({ ...item });
      const key = String(cleaned.id || cleaned.slug || '').toLowerCase().trim();
      if (!key) continue;
      const existingLocal = localMap.get(key);
      if (!existingLocal) {
        authoritativeMap.set(key, cleaned);
      } else {
        const localTime = getItemTimestampMs(existingLocal);
        const remoteTime = getItemTimestampMs(cleaned);
        const merged = remoteTime >= localTime
          ? { ...existingLocal, ...cleaned }
          : { ...cleaned, ...existingLocal };
        authoritativeMap.set(key, cleanItemSeo(merged));
      }
    }
    return Array.from(authoritativeMap.values());
  }

  const map = new Map<string, any>(localMap);
  for (const item of (remoteItems || [])) {
    if (!item) continue;
    const cleaned = cleanItemSeo({ ...item });
    const key = String(cleaned.id || cleaned.slug || '').toLowerCase().trim();
    if (!key) continue;
    const existingLocal = map.get(key);
    if (!existingLocal) {
      map.set(key, cleaned);
    } else {
      const localTime = getItemTimestampMs(existingLocal);
      const remoteTime = getItemTimestampMs(cleaned);
      const merged = remoteTime >= localTime
        ? { ...existingLocal, ...cleaned }
        : { ...cleaned, ...existingLocal };
      map.set(key, cleanItemSeo(merged));
    }
  }

  return Array.from(map.values());
}

// Dynamically resolve staticData directly from filesystem to bypass caching
const getStaticData = () => {
  let staticJsonData: any = null;

  try {
    const adminStorePath = path.join(process.cwd(), '.data/adminStore.json');
    if (fs.existsSync(adminStorePath)) {
      staticJsonData = JSON.parse(fs.readFileSync(adminStorePath, 'utf8'));
    }
  } catch (_) {}

  if (!staticJsonData) {
    try {
      const staticJsonPath = path.join(process.cwd(), 'src/lib/staticData.json');
      if (fs.existsSync(staticJsonPath)) {
        staticJsonData = JSON.parse(fs.readFileSync(staticJsonPath, 'utf8'));
      }
    } catch (_) {}
  }

  if (staticJsonData && typeof staticJsonData === 'object') {
    const staticApps = staticJsonData.mockApps || staticJsonData.apps || [];
    const staticNews = staticJsonData.mockNews || staticJsonData.news || [];
    const staticSettings = cleanSettingsMetaTitles(staticJsonData.mockSettings || staticJsonData.settings || {});
    const staticVideos = staticJsonData.mockVideos || staticJsonData.videos || [];
    return {
      apps: staticApps,
      mockApps: staticApps,
      settings: staticSettings,
      mockSettings: staticSettings,
      news: staticNews,
      mockNews: staticNews,
      videos: staticVideos,
      mockVideos: staticVideos,
      reviews: staticJsonData.reviews || []
    };
  }

  try {
    const staticDataModulePath = path.join(process.cwd(), 'src/lib/staticData');
    try {
      delete require.cache[require.resolve(staticDataModulePath)];
    } catch (_) {}
    return require(staticDataModulePath);
  } catch (e) {
    return { mockApps: [], mockSettings: {}, mockNews: [], mockVideos: [] };
  }
};

export async function syncFromFirestore(): Promise<any> {
  const freshStatic = getStaticData();
  let fallbackData: any = {
    apps: freshStatic.apps || freshStatic.mockApps || [],
    settings: freshStatic.settings || freshStatic.mockSettings || {},
    news: freshStatic.news || freshStatic.mockNews || [],
    videos: freshStatic.videos || freshStatic.mockVideos || [],
    reviews: freshStatic.reviews || []
  };

  // Query Firestore REST API directly (100% compatible with both Admin and Public repos)
  try {
    const config = getRawFirebaseConfig();
    if (config && config.projectId) {
      const apiKeyParam = config.apiKey ? `?key=${encodeURIComponent(config.apiKey)}` : '';
      const rawDb = config.firestoreDatabaseId || config.databaseId;
      const primaryDbId = (rawDb && rawDb.trim() !== '') ? rawDb.trim() : '(default)';
      let baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${primaryDbId}/documents/store_data`;

      let metaRes = await fetch(`${baseUrl}/apps_meta${apiKeyParam}`);
      if (metaRes.status === 404 && primaryDbId !== '(default)') {
        baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/store_data`;
        metaRes = await fetch(`${baseUrl}/apps_meta${apiKeyParam}`);
      }
      let numChunks = 1;
      let metaExists = false;
      if (metaRes.ok) {
        metaExists = true;
        const metaJson: any = await metaRes.json();
        const parsedMeta = parseFirestoreDoc(metaJson.fields);
        if (parsedMeta.numChunks !== undefined) numChunks = Number(parsedMeta.numChunks);
      }

      const chunksToProbe = metaExists ? Math.max(1, numChunks || 1) : 4;
      const chunkFetches = [];
      for (let i = 0; i < chunksToProbe; i++) {
        chunkFetches.push(
          fetch(`${baseUrl}/apps_chunk_${i}${apiKeyParam}`)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        );
      }
      const chunkResults = await Promise.all(chunkFetches);
      const remoteApps: any[] = [];
      let anyChunkFound = false;
      for (const c of chunkResults) {
        if (c && c.fields) {
          anyChunkFound = true;
          const parsed = parseFirestoreDoc(c.fields);
          if (Array.isArray(parsed.items)) {
            remoteApps.push(...parsed.items);
          }
        }
      }

      const [pubSettingsRes, rawSettingsRes, newsRes, videosRes, secLinksRes] = await Promise.all([
        fetch(`${baseUrl}/public_settings${apiKeyParam}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${baseUrl}/settings${apiKeyParam}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${baseUrl}/news${apiKeyParam}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${baseUrl}/videos${apiKeyParam}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${baseUrl}/secure_links${apiKeyParam}`).then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      const pubParsed = pubSettingsRes?.fields ? parseFirestoreDoc(pubSettingsRes.fields) : {};
      const rawParsed = rawSettingsRes?.fields ? parseFirestoreDoc(rawSettingsRes.fields) : {};
      const remoteSettings: Record<string, any> = { ...rawParsed, ...pubParsed };
      if (!remoteSettings.logo_url && rawParsed.logo_url) remoteSettings.logo_url = rawParsed.logo_url;
      if (!remoteSettings.favicon_url && rawParsed.favicon_url) remoteSettings.favicon_url = rawParsed.favicon_url;
      delete remoteSettings.turnstile_secret_key;
      delete remoteSettings.turnstile_site_key;
      delete remoteSettings.cloudinary_api_secret;
      delete remoteSettings.gemini_api_key;
      delete remoteSettings.admin_password;
      delete remoteSettings.admin_totp_secret;

      const sanitizeSiteKey = (raw: unknown): string => {
        let s = String(raw || '').replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
        s = s.replace(/^[A-Za-z0-9_]+\s*=\s*/, '').trim();
        s = s.replace(/^["'`]+|["'`]+$/g, '').trim();
        const match = s.match(/(0x4[A-Za-z0-9_-]{16,25})/);
        return match ? match[1] : '';
      };

      const envTurnstileSiteKey = [
        process.env.VITE_TURNSTILE_SITE_KEY,
        process.env.TURNSTILE_SITE_KEY,
        process.env.CF_TURNSTILE_SITE_KEY,
        process.env.CLOUDFLARE_TURNSTILE_SITE_KEY,
        process.env.PUBLIC_TURNSTILE_SITE_KEY,
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        process.env.VITE_TURNSTILE_KEY,
        process.env.TURNSTILE_KEY,
      ]
        .map(sanitizeSiteKey)
        .find((k) => /^0x4[A-Za-z0-9_-]{16,25}$/.test(k));

      const baseStaticSettings = fallbackData.settings || {};
      const mergedRawSettings =
        remoteSettings && Object.keys(remoteSettings).length > 0
          ? { ...baseStaticSettings, ...remoteSettings }
          : { ...baseStaticSettings };
      if (!mergedRawSettings.logo_url && baseStaticSettings.logo_url) {
        mergedRawSettings.logo_url = baseStaticSettings.logo_url;
      }
      if (!mergedRawSettings.favicon_url && baseStaticSettings.favicon_url) {
        mergedRawSettings.favicon_url = baseStaticSettings.favicon_url;
      }

      if (envTurnstileSiteKey) {
        mergedRawSettings.turnstile_site_key = envTurnstileSiteKey;
      } else {
        delete mergedRawSettings.turnstile_site_key;
      }

      const settings = cleanSettingsMetaTitles(mergedRawSettings);

      const fallbackNewsMap = new Map<string, any>();
      for (const fn of (fallbackData.news || [])) {
        if (fn?.id) fallbackNewsMap.set(String(fn.id).trim().toLowerCase(), fn);
        if (fn?.slug) fallbackNewsMap.set(String(fn.slug).trim().toLowerCase(), fn);
      }

      const newsParsed = newsRes?.fields ? parseFirestoreDoc(newsRes.fields) : null;
      const newsFromFirestore = Boolean(newsParsed && Array.isArray(newsParsed.items));
      const allNews = (newsFromFirestore ? newsParsed!.items : (fallbackData.news || [])).map((n: any) => {
        const cleaned = cleanItemSeo({ ...n });
        const bodyHtml = cleaned.content || cleaned.description_html || '';
        if (!bodyHtml) {
          const fb =
            (cleaned.id && fallbackNewsMap.get(String(cleaned.id).trim().toLowerCase())) ||
            (cleaned.slug && fallbackNewsMap.get(String(cleaned.slug).trim().toLowerCase()));
          if (fb) {
            const recoveredHtml = fb.content || fb.description_html || '';
            if (recoveredHtml) {
              cleaned.content = recoveredHtml;
              cleaned.description_html = recoveredHtml;
            }
            if (!cleaned.seo_title && (fb.seo_title || fb.meta_title)) {
              cleaned.seo_title = fb.seo_title || fb.meta_title;
              cleaned.meta_title = cleaned.seo_title;
            }
            if (!cleaned.seo_description && (fb.seo_description || fb.meta_description)) {
              cleaned.seo_description = fb.seo_description || fb.meta_description;
              cleaned.meta_description = cleaned.seo_description;
            }
          }
        } else {
          cleaned.content = bodyHtml;
          cleaned.description_html = bodyHtml;
        }
        return cleaned;
      });
      const news = allNews.filter(isPublicReadyNews);

      const videosParsed = videosRes?.fields ? parseFirestoreDoc(videosRes.fields) : null;
      const videos = Array.isArray(videosParsed?.items) ? videosParsed.items : fallbackData.videos;

      const secLinksParsed = secLinksRes?.fields ? parseFirestoreDoc(secLinksRes.fields) : null;
      const secureLinks = secLinksParsed?.items || secLinksParsed?.links || secLinksParsed || null;

      const fromFirestore = Boolean(metaExists || anyChunkFound);
      const allApps = fromFirestore ? remoteApps : (fallbackData.apps || []);
      const mergedApps = allApps.filter(isPublicReadyApp);

      return {
        apps: mergedApps,
        allApps,
        settings,
        news,
        allNews,
        videos,
        secureLinks,
        reviews: fallbackData.reviews || [],
        fromFirestore,
        newsFromFirestore
      };
    }
  } catch (restErr) {
    // REST API failed, return fallbackData
  }

  const rawAllApps = fallbackData.apps || [];
  const rawAllNews = fallbackData.news || [];
  return {
    ...fallbackData,
    apps: rawAllApps.filter(isPublicReadyApp),
    allApps: rawAllApps,
    news: rawAllNews.filter(isPublicReadyNews),
    allNews: rawAllNews,
    fromFirestore: false,
    newsFromFirestore: false
  };
}


