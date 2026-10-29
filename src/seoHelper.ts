import fs from 'fs';
import path from 'path';
import { getSafeFirebaseConfig } from './seo/firebaseConfig';
import { syncFromFirestore, mergeItemsByTimestamp } from './seo/sync';
import { getField, stripHtml, getYoutubeThumbnail, getOgImageUrl, isBotUserAgent, optimizeImageUrl, getAllSiteIconUrls } from './seo/utils';
import { getCleanCanonicalUrl, formatPageTitle } from './lib/seoUtils';
import { resolveAppSlug, SLUG_ALIAS_MAP } from './lib/slugResolver';
import { buildJsonLdSchema } from './seo/schemaBuilder';
import { buildMetaTags } from './seo/metaBuilder';
import { optimizeInitialDataForRoute } from './seo/initialDataOptimizer';
import { getPagePreRender } from './seo/preRenderEngine';
import { getCriticalCss } from './seo/criticalCss';
import { getLocalFallbackReviewsForApp } from './seo/reviewFallback';

export { resolveAppSlug, SLUG_ALIAS_MAP };
export { getField, getSafeFirebaseConfig, syncFromFirestore, getOgImageUrl, getYoutubeThumbnail };

// Dynamically resolve staticData directly from filesystem with caching
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
    const staticSettings = staticJsonData.mockSettings || staticJsonData.settings || {};
    const staticVideos = staticJsonData.mockVideos || staticJsonData.videos || [];
    const staticDevelopers = staticJsonData.developers || staticSettings.developers || [];
    return {
      apps: staticApps,
      mockApps: staticApps,
      settings: staticSettings,
      mockSettings: staticSettings,
      news: staticNews,
      mockNews: staticNews,
      videos: staticVideos,
      mockVideos: staticVideos,
      developers: staticDevelopers,
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

let cachedData: any = null;
let lastFetchTime = 0;
const CACHE_TTL = 300000; // 5 minutes (prevent quota exhaustion)
let isFetchingStoreData = false;

export function clearSeoCache() {
  cachedData = null;
  lastFetchTime = 0;
}

async function doFetchStoreData() {
  const now = Date.now();
  let liveData: any = null;
  try {
    liveData = await syncFromFirestore();
  } catch (err) {
    console.warn("[seoHelper] syncFromFirestore fallback to static backup:", err);
  }

  const freshStatic = getStaticData();
  const rawStaticSettings = freshStatic.settings || freshStatic.mockSettings || {};
  const rawLiveSettings = liveData?.settings || {};

  const mergedSettings = {
    ...rawStaticSettings,
    ...rawLiveSettings
  };

  // Guarantee arrays and custom SEO titles/descriptions are preserved
  if (!Array.isArray(mergedSettings.developers)) {
    mergedSettings.developers = rawLiveSettings.developers || rawStaticSettings.developers || freshStatic.developers || [];
  }
  if (!Array.isArray(mergedSettings.website_faqs)) {
    mergedSettings.website_faqs = rawLiveSettings.website_faqs || rawStaticSettings.website_faqs || [];
  }
  if (!Array.isArray(mergedSettings.quick_links)) {
    mergedSettings.quick_links = rawLiveSettings.quick_links || rawStaticSettings.quick_links || [];
  }
  if (!Array.isArray(mergedSettings.categories)) {
    mergedSettings.categories = rawLiveSettings.categories || rawStaticSettings.categories || [];
  }
  if (!Array.isArray(mergedSettings.banners)) {
    mergedSettings.banners = rawLiveSettings.banners || rawStaticSettings.banners || [];
  }

  const data = {
    apps: Array.isArray(liveData?.apps)
      ? liveData.apps
      : (freshStatic.apps || freshStatic.mockApps || []),
    settings: mergedSettings,
    news: Array.isArray(liveData?.news) ? liveData.news : (freshStatic.news || freshStatic.mockNews || []),
    videos: Array.isArray(liveData?.videos) ? liveData.videos : (freshStatic.videos || freshStatic.mockVideos || []),
    developers: mergedSettings.developers || []
  };
  
  cachedData = data;
  lastFetchTime = now;
  return data;
}

export async function fetchStoreData() {
  const now = Date.now();
  const isStale = (now - lastFetchTime) > CACHE_TTL;
  const isSuperStale = (now - lastFetchTime) > (CACHE_TTL * 15);

  if (cachedData && !isSuperStale) {
    if (isStale && !isFetchingStoreData) {
      isFetchingStoreData = true;
      doFetchStoreData()
        .then(() => { isFetchingStoreData = false; })
        .catch(e => {
          isFetchingStoreData = false;
          console.warn("Background store fetch failed safely:", e);
        });
    }
    return cachedData;
  }

  return await doFetchStoreData();
}

function cleanSeoDescription(desc: string): string {
  if (!desc) return '';
  const trimmed = desc.trim();
  if (trimmed.startsWith('<') || trimmed.includes('<meta ')) {
    const metaMatch = trimmed.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
    if (metaMatch && metaMatch[1]) return metaMatch[1].trim();
    const ogMatch = trimmed.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i);
    if (ogMatch && ogMatch[1]) return ogMatch[1].trim();
    return stripHtml(trimmed);
  }
  return trimmed;
}

export interface SeoInjectionResult {
  html: string;
  isNotFound: boolean;
  canonicalUrl?: string;
  pageType?: string;
  title?: string;
  description?: string;
}

export function cleanRootContainer(html: string): string {
  if (!html || typeof html !== 'string') return '';
  if (html.includes('<div id="root"></div>')) return html;

  const rootOpenTag = '<div id="root">';
  const rootIdx = html.indexOf(rootOpenTag);
  if (rootIdx === -1) return html;

  const afterRoot = html.substring(rootIdx + rootOpenTag.length);
  const bodyCloseIdx = afterRoot.lastIndexOf('</body>');

  if (bodyCloseIdx !== -1) {
    const contentBeforeBody = afterRoot.substring(0, bodyCloseIdx);
    const bodyCloseRest = afterRoot.substring(bodyCloseIdx);

    const scriptIdx = contentBeforeBody.search(/<script\b/i);
    if (scriptIdx !== -1) {
      const scripts = contentBeforeBody.substring(scriptIdx);
      return html.substring(0, rootIdx) + '<div id="root"></div>\n    ' + scripts + bodyCloseRest;
    }
    return html.substring(0, rootIdx) + '<div id="root"></div>\n  ' + bodyCloseRest;
  }

  return html.replace(/<div id="root">[\s\S]*?<\/div>(\s*(?:<script\b|<\/body>))/i, '<div id="root"></div>$1');
}

export async function injectSeoTags(template: string, urlPath: string, hostUrl?: string, userAgent: string = ''): Promise<SeoInjectionResult> {
  let data = await fetchStoreData();
  if (!data || !data.settings) return { html: template, isNotFound: false };

  let apps = (data.apps || []).filter((a: any) => a && a.sync_to_public !== false);
  let settings = data.settings || {};
  let news = (data.news || []).filter((n: any) => n && n.sync_to_public !== false);
  let videos = data.videos || [];
  const siteTitle = getField(settings, 'site_title') || (process.env.VITE_SITE_NAME || '').trim();
  const baseOrigin = (hostUrl || process.env.PUBLIC_DOMAIN || process.env.VITE_PUBLIC_DOMAIN || '').trim().replace(/\/+$/, '');
  let title = getField(settings, 'seo_title') || getField(settings, 'meta_title') || '';
  let description = getField(settings, 'seo_description') || getField(settings, 'meta_description', '');
  const keywords = getField(settings, 'seo_keywords', '');

  const iconSet = getAllSiteIconUrls(settings, baseOrigin);
  if (!settings.logo_url && iconSet.masterLogo) {
    settings.logo_url = iconSet.masterLogo;
  }
  if (!settings.favicon_url && iconSet.masterFavicon) {
    settings.favicon_url = iconSet.masterFavicon;
  }
  const faviconIco = iconSet.faviconIco;
  const favicon32 = iconSet.favicon32;
  const favicon16 = iconSet.favicon16;
  const favicon180 = iconSet.appleTouch180;
  const logoUrl = iconSet.searchLogo512;

  const cleanPath = urlPath.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  const cleanPathLower = cleanPath.toLowerCase();

  let isNotFound = false;
  let customCanonicalUrl: string | undefined = undefined;
  let pageType: 'home' | 'app' | 'news' | 'video' | 'static' | 'collection' | 'gateway' | '404' = 'static';
  let targetApp: any = null;
  let targetNews: any = null;
  let targetVideo: any = null;
  let collectionItems: Array<{ name: string; url: string; image?: string; description?: string }> | undefined = undefined;
  let breadcrumbItems: Array<{ name: string; url: string }> | undefined = undefined;

  if (cleanPathLower === '/' || cleanPathLower === '') {
    pageType = 'home';
    title = getField(settings, 'seo_title') || getField(settings, 'meta_title') || siteTitle;
    description = getField(settings, 'seo_description') || getField(settings, 'meta_description', '');
  } else if (cleanPathLower === '/new-apps') {
    pageType = 'collection';
    title = getField(settings, 'new_apps_meta_title') || `New Apps & Latest Releases`;
    description = getField(settings, 'new_apps_meta_description') || `Explore the newest released applications with verified ratings.`;
    customCanonicalUrl = `${baseOrigin}/new-apps`;
    const newAppsList = apps.filter((a: any) => a.is_new === true || (a.is_new && a.is_new.booleanValue === true) || a.is_hot === true).slice(0, 20);
    collectionItems = (newAppsList.length > 0 ? newAppsList : apps.slice(0, 20)).map((a: any) => ({
      name: getField(a, 'name'),
      url: `${baseOrigin}/app/${getField(a, 'slug')}`,
      image: getField(a, 'icon_url'),
      description: cleanSeoDescription(getField(a, 'seo_description') || getField(a, 'meta_description') || stripHtml(getField(a, 'description_html')).substring(0, 120))
    }));
    breadcrumbItems = [
      { name: 'Home', url: baseOrigin },
      { name: 'New Apps', url: `${baseOrigin}/new-apps` }
    ];
  } else if (cleanPathLower === '/categories') {
    pageType = 'collection';
    title = getField(settings, 'categories_meta_title') || `App Categories & Genres`;
    description = getField(settings, 'categories_meta_description') || `Browse all application categories.`;
    customCanonicalUrl = `${baseOrigin}/categories`;
    const catMap = new Map<string, string>();
    for (const a of apps) {
      const rawCat = getField(a, 'category', '');
      if (!rawCat) continue;
      const parts = rawCat.split(',').map((p: string) => p.trim()).filter(Boolean);
      for (const p of parts) {
        const slug = p.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (slug && !catMap.has(slug)) {
          catMap.set(slug, p);
        }
      }
    }
    const catEntries = Array.from(catMap.entries());
    collectionItems = catEntries.map(([cSlug, cName]) => ({
      name: cName,
      url: `${baseOrigin}/category/${cSlug}`,
      description: `Browse ${cName} applications and reviews`
    }));
    breadcrumbItems = [
      { name: 'Home', url: baseOrigin },
      { name: 'Categories', url: `${baseOrigin}/categories` }
    ];
  } else if (cleanPathLower.startsWith('/category/') || cleanPathLower.startsWith('/categories/')) {
    const rawCatSlug = cleanPathLower.replace(/^\/(category|categories)\/?/, '').replace(/^\/|\/$/g, '');
    const catName = rawCatSlug
      ? rawCatSlug.split(/[-_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'All Categories';
    pageType = 'collection';
    title = `${catName} - Download & Reviews`;
    description = `Explore top ${catName}, verified reviews, and download ratings.`;
    customCanonicalUrl = `${baseOrigin}/category/${rawCatSlug || 'all'}`;
    const categoryApps = apps.filter((a: any) => {
      const cat = getField(a, 'category', '');
      if (!cat) return false;
      const cats = cat.split(',').map((c: string) => c.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
      return cats.some((c: string) => c === rawCatSlug || c.includes(rawCatSlug) || rawCatSlug.includes(c));
    }).slice(0, 20);
    collectionItems = (categoryApps.length > 0 ? categoryApps : apps.slice(0, 20)).map((a: any) => ({
      name: getField(a, 'name'),
      url: `${baseOrigin}/app/${getField(a, 'slug')}`,
      image: getField(a, 'icon_url'),
      description: cleanSeoDescription(getField(a, 'seo_description') || getField(a, 'meta_description') || stripHtml(getField(a, 'description_html')).substring(0, 120))
    }));
    breadcrumbItems = [
      { name: 'Home', url: baseOrigin },
      { name: 'Categories', url: `${baseOrigin}/categories` },
      { name: catName, url: `${baseOrigin}/category/${rawCatSlug || 'all'}` }
    ];
  } else if (cleanPathLower.startsWith('/admin') || cleanPathLower.startsWith('/masterworld')) {
    title = `Admin Panel`;
    description = `Admin Control Dashboard`;
    pageType = 'static';
  } else if (cleanPathLower.startsWith('/s/')) {
    const slug = cleanPath.split('/s/')[1];
    const app = apps.find((a: any) => getField(a, 'slug').toLowerCase() === slug);
    if (app) {
      title = `Download ${getField(app, 'name')}`;
      description = `Secure download link for ${getField(app, 'name')}.`;
      customCanonicalUrl = getField(app, 'canonical_url');
      pageType = 'app';
      targetApp = app;
    } else {
      isNotFound = true;
      pageType = '404';
    }
  } else if (cleanPathLower === '/news') {
    title = getField(settings, 'news_meta_title') || `News & Updates`;
    description = getField(settings, 'news_meta_description') || `The latest news, reports, and platform updates.`;
    customCanonicalUrl = `${baseOrigin}/news`;
    pageType = 'collection';
    const sortedNews = [...news].sort((a: any, b: any) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const dateA = new Date(getField(a, 'date') || getField(a, 'published_at') || getField(a, 'created_at') || 0).getTime();
      const dateB = new Date(getField(b, 'date') || getField(b, 'published_at') || getField(b, 'created_at') || 0).getTime();
      return dateB - dateA;
    });
    collectionItems = sortedNews.slice(0, 30).map((n: any) => {
      const nSlug = getField(n, 'slug') || getField(n, 'id');
      const rawImg = getField(n, 'og_image_url') || getField(n, 'image_url') || getField(n, 'logo_url') || getField(n, 'image');
      return {
        name: getField(n, 'title'),
        url: `${baseOrigin}/news/${nSlug}`,
        image: rawImg ? optimizeImageUrl(rawImg, 600) : undefined,
        description: cleanSeoDescription(getField(n, 'seo_description') || getField(n, 'meta_description') || getField(n, 'description') || stripHtml(getField(n, 'content') || getField(n, 'description_html')).substring(0, 120))
      };
    });
    breadcrumbItems = [
      { name: 'Home', url: baseOrigin },
      { name: 'News', url: `${baseOrigin}/news` }
    ];
  } else if (cleanPathLower === '/videos') {
    title = getField(settings, 'videos_meta_title') || `Video Reviews`;
    description = getField(settings, 'videos_meta_description') || `Watch deep-dive reviews and gameplay analysis.`;
    pageType = 'static';
  } else if (cleanPathLower.startsWith('/news/')) {
    const rawNewsSlug = cleanPath.split('/news/')[1] || '';
    const cleanNewsSlug = decodeURIComponent(rawNewsSlug).toLowerCase().trim().replace(/\/+$/, '').split(/[?#]/)[0];

    let newsItem = news.find((n: any) => {
      const nSlug = (getField(n, 'slug') || '').toLowerCase().trim();
      const nId = (getField(n, 'id') || '').toLowerCase().trim();
      return (nSlug && nSlug === cleanNewsSlug) || (nId && nId === cleanNewsSlug);
    });

    if (!newsItem && cleanNewsSlug) {
      data = await doFetchStoreData();
      news = (data.news || []).filter((n: any) => n && n.sync_to_public !== false);
      newsItem = news.find((n: any) => {
        const nSlug = (getField(n, 'slug') || '').toLowerCase().trim();
        const nId = (getField(n, 'id') || '').toLowerCase().trim();
        return (nSlug && nSlug === cleanNewsSlug) || (nId && nId === cleanNewsSlug);
      });
    }

    if (newsItem) {
      title = getField(newsItem, 'seo_title') || getField(newsItem, 'meta_title') || getField(newsItem, 'title');
      description = cleanSeoDescription(
        getField(newsItem, 'seo_description') || 
        getField(newsItem, 'meta_description') || 
        getField(newsItem, 'description') || 
        stripHtml(getField(newsItem, 'content') || getField(newsItem, 'description_html')).substring(0, 160)
      );
      customCanonicalUrl = `${baseOrigin}/news/${getField(newsItem, 'slug') || getField(newsItem, 'id')}`;
      pageType = 'news';
      targetNews = newsItem;
    } else {
      isNotFound = true;
      pageType = '404';
      title = `News Article Not Found`;
      description = `The requested publication could not be located.`;
    }
  } else if (cleanPathLower.startsWith('/videos/')) {
    const slug = cleanPath.split('/videos/')[1];
    const videoItem = videos.find((v: any) => getField(v, 'slug').toLowerCase() === slug);
    if (videoItem) {
      title = getField(videoItem, 'seo_title') || getField(videoItem, 'meta_title') || getField(videoItem, 'title');
      description = getField(videoItem, 'seo_description') || getField(videoItem, 'meta_description') || getField(videoItem, 'description', '').substring(0, 160);
      pageType = 'video';
      targetVideo = videoItem;
    } else {
      isNotFound = true;
      pageType = '404';
    }
  } else if (['/about', '/contact', '/privacy', '/report-removal', '/terms', '/notice', '/ethics', '/disclaimer', '/responsibility', '/developers', '/developer', '/faq', '/faqs', '/safety', '/safety-status'].includes(cleanPathLower)) {
    pageType = 'static';
    if (cleanPathLower === '/about') {
      title = getField(settings, 'about_meta_title') || `About Us`;
      description = getField(settings, 'about_meta_description') || `Learn more about our platform, mission, and dedicated team.`;
    } else if (cleanPathLower === '/contact') {
      title = getField(settings, 'contact_meta_title') || `Contact Support`;
      description = getField(settings, 'contact_meta_description') || `Get in touch with customer support for any queries or assistance.`;
    } else if (cleanPathLower === '/privacy') {
      title = getField(settings, 'privacy_meta_title') || `Privacy Policy`;
      description = getField(settings, 'privacy_meta_description') || `Read our Privacy Policy to understand how we protect your data.`;
    } else if (cleanPathLower === '/report-removal') {
      title = getField(settings, 'report_removal_meta_title') || `Report & Removal`;
      description = getField(settings, 'report_removal_meta_description') || `Report content or request removal of specific applications.`;
    } else if (cleanPathLower === '/terms') {
      title = getField(settings, 'terms_meta_title') || `Terms of Service`;
      description = getField(settings, 'terms_meta_description') || `Review the Terms of Service and platform usage guidelines.`;
    } else if (cleanPathLower === '/notice') {
      title = getField(settings, 'notice_meta_title') || getField(settings, 'important_notice_heading') || `Legal Notice`;
      description = getField(settings, 'notice_meta_description') || `Important legal notices and compliance information.`;
    } else if (cleanPathLower === '/ethics') {
      title = getField(settings, 'ethics_meta_title') || getField(settings, 'ethics_heading') || `Ethics & Safety`;
      description = getField(settings, 'ethics_meta_description') || `Our commitment to ethics, safety, and transparent application reviews.`;
    } else if (cleanPathLower === '/disclaimer') {
      title = getField(settings, 'disclaimer_meta_title') || getField(settings, 'disclaimer_heading') || `Disclaimer`;
      description = getField(settings, 'disclaimer_meta_description') || `Read the official disclaimer regarding platform content and applications.`;
    } else if (cleanPathLower === '/responsibility') {
      title = getField(settings, 'responsibility_meta_title') || `Responsible Gaming`;
      description = getField(settings, 'responsibility_meta_description') || `Information and resources for responsible gaming and application usage.`;
    } else if (cleanPathLower === '/developers' || cleanPathLower === '/developer') {
      title = getField(settings, 'developers_meta_title') || `Developer Profiles`;
      description = getField(settings, 'developers_meta_description') || `Browse profiles of verified application developers and publishers.`;
      customCanonicalUrl = `${baseOrigin}/developers`;
    } else if (cleanPathLower === '/faq' || cleanPathLower === '/faqs') {
      title = getField(settings, 'faq_meta_title') || `Frequently Asked Questions`;
      description = getField(settings, 'faq_meta_description') || `Answers to common questions about application verification, ratings, and downloads.`;
    } else if (cleanPathLower === '/safety' || cleanPathLower === '/safety-status') {
      title = getField(settings, 'safety_meta_title') || `Platform Safety & Integrity Status`;
      description = getField(settings, 'safety_meta_description') || `Live verification, integrity hash checks, and safety ratings for catalog applications.`;
    }
  } else if (cleanPathLower.startsWith('/info/') || cleanPathLower.startsWith('/moreinfo/') || cleanPathLower.startsWith('/moredetail/') || cleanPathLower.startsWith('/gateway/') || cleanPathLower.startsWith('/download/')) {
    const parts = cleanPathLower.split('/');
    const slug = parts[parts.length - 1];
    const app = resolveAppSlug(slug, apps);
    if (app) {
      title = `Verification Portal: ${getField(app, 'name')}`;
      description = `Secure application verification portal.`;
      customCanonicalUrl = `${baseOrigin}/app/${getField(app, 'slug')}`;
      pageType = 'gateway';
      targetApp = app;
    } else {
      isNotFound = true;
      pageType = '404';
    }
  } else if (cleanPathLower.startsWith('/app/')) {
    const appSlug = cleanPathLower.replace(/^\/app\//, '/').replace(/^\/|\/$/g, '');
    let app = resolveAppSlug(appSlug, apps);
    if (!app && appSlug) {
      data = await doFetchStoreData();
      apps = (data.apps || []).filter((a: any) => a && a.sync_to_public !== false);
      app = resolveAppSlug(appSlug, apps);
    }
    if (app) {
      title = getField(app, 'seo_title') || getField(app, 'meta_title') || getField(app, 'name');
      description = cleanSeoDescription(getField(app, 'seo_description') || getField(app, 'meta_description') || stripHtml(getField(app, 'description_html')).substring(0, 160));
      customCanonicalUrl = `${baseOrigin}/app/${getField(app, 'slug')}`;
      pageType = 'app';
      targetApp = app;
    } else {
      isNotFound = true;
      pageType = '404';
      title = `404 - Page Not Found`;
      description = `The requested page could not be found.`;
    }
  } else {
    const appSlug = cleanPathLower.replace(/^\/|\/$/g, '');
    const app = resolveAppSlug(appSlug, apps) || apps.find((a: any) => getField(a, 'slug')?.toLowerCase() === appSlug);
    const newsItem = news.find((n: any) => getField(n, 'slug')?.toLowerCase() === appSlug);
    const videoItem = videos.find((v: any) => getField(v, 'slug')?.toLowerCase() === appSlug);

    if (app) {
      title = getField(app, 'seo_title') || getField(app, 'meta_title') || getField(app, 'name');
      description = cleanSeoDescription(getField(app, 'seo_description') || getField(app, 'meta_description') || stripHtml(getField(app, 'description_html')).substring(0, 160));
      customCanonicalUrl = `${baseOrigin}/app/${getField(app, 'slug')}`;
      pageType = 'app';
      targetApp = app;
    } else if (newsItem) {
      title = getField(newsItem, 'seo_title') || getField(newsItem, 'meta_title') || getField(newsItem, 'title');
      description = getField(newsItem, 'seo_description') || getField(newsItem, 'meta_description') || getField(newsItem, 'description', '').substring(0, 160);
      pageType = 'news';
      targetNews = newsItem;
    } else if (videoItem) {
      title = getField(videoItem, 'seo_title') || getField(videoItem, 'meta_title') || getField(videoItem, 'title');
      description = getField(videoItem, 'seo_description') || getField(videoItem, 'meta_description') || getField(videoItem, 'description', '').substring(0, 160);
      pageType = 'video';
      targetVideo = videoItem;
    } else {
      isNotFound = true;
      pageType = '404';
      title = `404 - Page Not Found`;
      description = `The requested page could not be found.`;
    }
  }

  if (isNotFound) {
    title = `404 - Page Not Found`;
    description = `The requested page ${cleanPath} could not be found.`;
  }

  title = formatPageTitle(title, '', siteTitle);

  let canonicalPath = urlPath;
  if (pageType === 'app' && targetApp) {
    const appSlug = getField(targetApp, 'slug');
    if (appSlug) {
      canonicalPath = `/app/${appSlug.replace(/^\/+|\/+$/g, '')}`;
    }
  } else if (pageType === 'news' && targetNews) {
    const nSlug = getField(targetNews, 'slug') || getField(targetNews, 'id');
    if (nSlug) {
      canonicalPath = `/news/${nSlug.replace(/^\/+|\/+$/g, '')}`;
    }
  } else if (pageType === 'video' && targetVideo) {
    const vSlug = getField(targetVideo, 'slug') || getField(targetVideo, 'id');
    if (vSlug) {
      canonicalPath = `/videos/${vSlug.replace(/^\/+|\/+$/g, '')}`;
    }
  }

  let canonicalUrl = '';
  if (pageType === 'gateway' || isNotFound) {
    canonicalUrl = '';
  } else if (pageType === 'app' && targetApp && getField(targetApp, 'slug')) {
    const rawAppCanonical = getField(targetApp, 'canonical_url');
    const expectedAppSlug = String(getField(targetApp, 'slug')).trim().toLowerCase();
    if (rawAppCanonical && typeof rawAppCanonical === 'string' && rawAppCanonical.toLowerCase().includes(`/app/${expectedAppSlug}`)) {
      canonicalUrl = getCleanCanonicalUrl(rawAppCanonical, `/app/${expectedAppSlug}`);
    } else {
      canonicalUrl = `${baseOrigin}/app/${expectedAppSlug}`;
    }
  } else if (pageType === 'news' && targetNews) {
    const nSlug = getField(targetNews, 'slug') || getField(targetNews, 'id');
    canonicalUrl = `${baseOrigin}/news/${nSlug}`;
  } else {
    canonicalUrl = getCleanCanonicalUrl(customCanonicalUrl, canonicalPath);
  }

  let pageOgImage = logoUrl;
  if (targetApp) {
    pageOgImage = getField(targetApp, 'og_image_url') || getField(targetApp, 'icon_url') || getField(targetApp, 'logo_url') || logoUrl;
  } else if (targetNews) {
    pageOgImage = getField(targetNews, 'og_image_url') || getField(targetNews, 'image_url') || getField(targetNews, 'logo_url') || getField(targetNews, 'image') || logoUrl;
  } else if (targetVideo) {
    const ytThumb = getYoutubeThumbnail(getField(targetVideo, 'youtube_url'));
    if (ytThumb) pageOgImage = ytThumb;
  }

  let domain = baseOrigin;
  try {
    domain = canonicalUrl ? new URL(canonicalUrl).origin : baseOrigin;
  } catch (e) {}
  
  if (!pageOgImage) {
    pageOgImage = logoUrl || `${domain}/logo.png`;
  }
  
  pageOgImage = getOgImageUrl(pageOgImage, domain, pageType === 'news');

  // Generate full pre-rendered semantic HTML directly from database for all public catalog & detail pages
  const isAdminPath = cleanPathLower.startsWith('/admin') || cleanPathLower.startsWith('/masterworld') || cleanPathLower === '/login' || cleanPathLower.startsWith('/login/');
  const preRenderedBody = (!isAdminPath && pageType !== 'gateway') ? await getPagePreRender(urlPath, data) : '';

  // Generate Schema.org JSON-LD structured data
  const jsonLdSchema = pageType === 'gateway' ? '' : await buildJsonLdSchema({
    pageType,
    title,
    description,
    url: canonicalUrl,
    logoUrl,
    siteTitle,
    app: targetApp,
    newsItem: targetNews,
    videoItem: targetVideo,
    settings,
    collectionItems,
    breadcrumbItems
  });

  const seoTags = buildMetaTags({
    title,
    description,
    keywords,
    canonicalUrl,
    pageOgImage,
    siteTitle,
    targetApp,
    targetNews,
    collectionItems,
    settings,
    faviconIco,
    favicon32,
    favicon16,
    favicon180,
    jsonLdSchema,
    isNotFound,
    getField,
    pageType
  });

  const seoReviewsFeed = targetApp ? getLocalFallbackReviewsForApp(getField(targetApp, 'id'), getField(targetApp, 'slug')) : null;
  const initialDataPayload = optimizeInitialDataForRoute(data, cleanPathLower, targetApp, targetNews, targetVideo, seoReviewsFeed);
  const initialDataJson = JSON.stringify(initialDataPayload || {}).replace(/</g, '\\u003c');
  const ssrPathJson = pageType === 'gateway' ? JSON.stringify('') : JSON.stringify(cleanPathLower);
  
  const initialDataScript = `<script>window.__SSR_PATH__ = ${ssrPathJson};window.__INITIAL_DATA__ = ${initialDataJson};</script>`;

  let finalHtml = template
    .replace(/<title[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\s+[^>]*name=["']description["'][^>]*\/?>/gi, '')
    .replace(/<meta\s+[^>]*content=["'][^"']*["']\s+name=["']description["'][^>]*\/?>/gi, '')
    .replace(/<meta\s+[^>]*property=["']description["'][^>]*\/?>/gi, '')
    .replace(/<meta\s+[^>]*name=["'](?:robots|googlebot|bingbot|slurp|baiduspider|yandex|duckduckbot|gptbot|claudebot|perplexitybot)["'][^>]*\/?>/gi, '')
    .replace(/<meta\s+[^>]*name=["']keywords["'][^>]*\/?>/gi, '')
    .replace(/<meta\s+[^>]*name=["']application-name["'][^>]*\/?>/gi, '')
    .replace(/<meta\s+[^>]*name=["']color-scheme["'][^>]*\/?>/gi, '')
    .replace(/<meta\s+[^>]*name=["']theme-color["'][^>]*\/?>/gi, '')
    .replace(/<meta\s+[^>]*name=["']thumbnail["'][^>]*\/?>/gi, '')
    .replace(/<meta\s+[^>]*itemprop=["'](?:image|thumbnailUrl)["'][^>]*\/?>/gi, '')
    .replace(/<meta\s+[^>]*property=["'](?:og|article):[^"']+["'][^>]*\/?>/gi, '')
    .replace(/<meta\s+[^>]*name=["']twitter:[^"']+["'][^>]*\/?>/gi, '')
    .replace(/<link\s+[^>]*rel=["']canonical["'][^>]*\/?>/gi, '')
    .replace(/<link\s+[^>]*rel=["']manifest["'][^>]*\/?>/gi, '')
    .replace(/<link\s+[^>]*rel=["']alternate["'][^>]*\/?>/gi, '')
    .replace(/<link\s+[^>]*rel=["']image_src["'][^>]*\/?>/gi, '')
    .replace(/<link\s+[^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*\/?>/gi, '')
    .replace(/<link\s+[^>]*rel=["']apple-touch-icon[^"']*["'][^>]*\/?>/gi, '')
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script>window\.(?:__SSR_PATH__|__INITIAL_DATA__)[\s\S]*?<\/script>/gi, '')
    .replace(/<style\s+id=["']server-critical-css["']>[\s\S]*?<\/style>/gi, '');

  const criticalCss = getCriticalCss();
  const headAdditions = `${seoTags}${criticalCss ? '\n' + criticalCss : ''}`;

  if (finalHtml.includes('<!--__SEO_HEAD__-->')) {
    finalHtml = finalHtml.replace('<!--__SEO_HEAD__-->', headAdditions);
  } else if (finalHtml.includes('</head>')) {
    finalHtml = finalHtml.replace('</head>', `${headAdditions}\n</head>`);
  } else {
    finalHtml = `${headAdditions}\n${finalHtml}`;
  }

  // High-performance server-side visible HTML shell injection:
  // First guarantee that any pre-existing SSR body in template is cleanly stripped back to <div id="root"></div>
  finalHtml = cleanRootContainer(finalHtml);

  if (finalHtml.includes('<div id="ssr-root"></div>')) {
    finalHtml = finalHtml.replace('<div id="ssr-root"></div>', '');
  } else if (finalHtml.includes('<div id="ssr-root">')) {
    finalHtml = finalHtml.replace(/<div id="ssr-root">[\s\S]*?<\/div>/i, '');
  }

  if (preRenderedBody) {
    if (finalHtml.includes('<!--__SEO_SSR_ROOT__-->')) {
      finalHtml = finalHtml.replace('<!--__SEO_SSR_ROOT__-->', () => preRenderedBody);
    } else if (finalHtml.includes('<div id="root"></div>')) {
      finalHtml = finalHtml.replace('<div id="root"></div>', () => `<div id="root">${preRenderedBody}</div>`);
    } else {
      finalHtml = finalHtml.replace(/<div id="root">[\s\S]*?<\/div>/i, () => `<div id="root">${preRenderedBody}</div>`);
    }
  }

  // Inject initialDataScript strictly at the bottom of <body> so it NEVER blocks the initial paint of the DOM!
  if (finalHtml.includes('<!--__SEO_INITIAL_DATA__-->')) {
    finalHtml = finalHtml.replace('<!--__SEO_INITIAL_DATA__-->', initialDataScript);
  } else if (finalHtml.includes('</body>')) {
    finalHtml = finalHtml.replace('</body>', `${initialDataScript}\n</body>`);
  } else {
    finalHtml += initialDataScript;
  }

  return { html: finalHtml, isNotFound, canonicalUrl, pageType, title, description };
}
