import fs from 'fs';
import path from 'path';
import { getRawFirebaseConfig, parseFirestoreDoc } from './firebaseConfig';
import { formatPageTitle, cleanSettingsMetaTitles } from '../lib/seoUtils';

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
    const staticJsonPath = path.join(process.cwd(), 'src/lib/staticData.json');
    if (fs.existsSync(staticJsonPath)) {
      staticJsonData = JSON.parse(fs.readFileSync(staticJsonPath, 'utf8'));
    }
  } catch (_) {}

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
      if (metaRes.ok) {
        const metaJson: any = await metaRes.json();
        const parsedMeta = parseFirestoreDoc(metaJson.fields);
        if (parsedMeta.numChunks) numChunks = Number(parsedMeta.numChunks);
      }

      const chunksToProbe = Math.max(numChunks, 20);
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
      for (const c of chunkResults) {
        if (c && c.fields) {
          const parsed = parseFirestoreDoc(c.fields);
          if (Array.isArray(parsed.items)) {
            remoteApps.push(...parsed.items);
          }
        }
      }

      const [pubSettingsRes, rawSettingsRes, newsRes, videosRes] = await Promise.all([
        fetch(`${baseUrl}/public_settings${apiKeyParam}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${baseUrl}/settings${apiKeyParam}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${baseUrl}/news${apiKeyParam}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${baseUrl}/videos${apiKeyParam}`).then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      const settingsDoc = pubSettingsRes?.fields ? pubSettingsRes : (rawSettingsRes?.fields ? rawSettingsRes : null);
      const remoteSettings = settingsDoc?.fields ? parseFirestoreDoc(settingsDoc.fields) : {};
      delete remoteSettings.turnstile_secret_key;
      delete remoteSettings.cloudinary_api_secret;
      delete remoteSettings.gemini_api_key;
      delete remoteSettings.admin_password;
      delete remoteSettings.admin_totp_secret;

      const settings = cleanSettingsMetaTitles(
        (remoteSettings && Object.keys(remoteSettings).length > 0)
          ? { ...(fallbackData.settings || {}), ...remoteSettings }
          : (fallbackData.settings || {})
      );

      const newsParsed = newsRes?.fields ? parseFirestoreDoc(newsRes.fields) : null;
      const remoteNews = Array.isArray(newsParsed?.items) ? newsParsed.items : [];
      const news = remoteNews.length > 0 ? remoteNews.map((n: any) => cleanItemSeo({ ...n })) : fallbackData.news;

      const videosParsed = videosRes?.fields ? parseFirestoreDoc(videosRes.fields) : null;
      const videos = Array.isArray(videosParsed?.items) ? videosParsed.items : fallbackData.videos;

      const minFullCatalogThreshold = fallbackData.apps?.length > 0
        ? Math.max(1, Math.floor(fallbackData.apps.length * 0.85))
        : 0;
      const isAuthoritative = remoteApps.length >= minFullCatalogThreshold;
      const mergedApps = remoteApps.length > 0
        ? mergeItemsByTimestamp(fallbackData.apps, remoteApps, isAuthoritative)
        : (fallbackData.apps || []);

      return {
        apps: mergedApps,
        settings,
        news,
        videos,
        reviews: fallbackData.reviews || []
      };
    }
  } catch (restErr) {
    // REST API failed, return fallbackData
  }

  return fallbackData;
}

