import { escapeHtml, getOptimizedImageUrl, normalizeIsoDate, getAllSiteIconUrls } from './utils';

export interface MetaBuilderParams {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  pageOgImage: string;
  siteTitle: string;
  targetApp?: any;
  targetNews?: any;
  collectionItems?: any[];
  settings?: any;
  faviconIco: string;
  favicon32: string;
  favicon16: string;
  favicon180: string;
  cssPreloadTag?: string;
  jsonLdSchema: string;
  isNotFound: boolean;
  getField: (obj: any, key: string, fallback?: any) => any;
  pageType?: string;
}

export function buildMetaTags(params: MetaBuilderParams): string {
  const {
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
  } = params;

  let origin = '';
  if (canonicalUrl) {
    try {
      origin = new URL(canonicalUrl).origin;
    } catch (_) {}
  }
  const iconSet = getAllSiteIconUrls(settings, origin);
  const resolvedFaviconIco = iconSet.masterFavicon ? iconSet.faviconIco : faviconIco;
  const resolvedFavicon16 = iconSet.masterFavicon ? iconSet.favicon16 : favicon16;
  const resolvedFavicon32 = iconSet.masterFavicon ? iconSet.favicon32 : favicon32;
  const resolvedFavicon48 = iconSet.masterFavicon ? iconSet.favicon48 : favicon32;
  const resolvedFavicon96 = iconSet.masterFavicon ? iconSet.favicon96 : favicon180;
  const resolvedFavicon144 = iconSet.masterFavicon ? iconSet.favicon144 : favicon180;
  const resolvedFavicon180 = iconSet.masterFavicon ? iconSet.appleTouch180 : favicon180;
  const resolvedFavicon192 = iconSet.masterFavicon ? iconSet.pwa192 : favicon180;
  const resolvedFavicon512 = iconSet.masterFavicon ? iconSet.pwa512 : favicon180;

  const escapedTitle = escapeHtml(title);
  const escapedDesc = escapeHtml(description);
  const escapedKeywords = escapeHtml(keywords);
  const resolvedSiteName = escapeHtml(siteTitle || '');

  const ogImageWidth = '1200';
  const ogImageHeight = '630';
  const ogType = pageType === 'news' ? 'article' : 'website';

  // Search engine thumbnails: exact 1:1 icon for app pages, clean 1200w banner for news articles without c_pad padding
  const rawTargetIcon = targetApp ? (getField(targetApp, 'icon_url') || getField(targetApp, 'og_image_url')) : '';
  const rawNewsHero = (pageType === 'news' && targetNews) ? (getField(targetNews, 'image') || getField(targetNews, 'image_url') || getField(targetNews, 'logo_url') || getField(targetNews, 'og_image_url')) : '';
  const searchThumbnail = rawTargetIcon
    ? getOptimizedImageUrl(rawTargetIcon, 512)
    : (rawNewsHero ? getOptimizedImageUrl(rawNewsHero, 1200) : (iconSet.masterLogo ? iconSet.searchLogo512 : pageOgImage));

  const articleMetaTags = (() => {
    if (pageType !== 'news' || !targetNews) return '';
    const rawPubTime = getField(targetNews, 'published_at') || getField(targetNews, 'publish_date') || getField(targetNews, 'created_at') || getField(targetNews, 'date') || '';
    const pubTime = rawPubTime ? normalizeIsoDate(rawPubTime, '') : '';
    const rawModTime = getField(targetNews, 'updated_at') || rawPubTime;
    const modTime = rawModTime ? normalizeIsoDate(rawModTime, pubTime) : pubTime;
    const author = getField(targetNews, 'ceo_name') || getField(targetNews, 'author') || 'Editorial Team';
    const section = getField(targetNews, 'category') || 'General';
    const tags = Array.isArray(targetNews.tags) ? targetNews.tags : [];
    return [
      pubTime ? `<meta data-rh="true" property="article:published_time" content="${escapeHtml(pubTime)}">` : '',
      modTime ? `<meta data-rh="true" property="article:modified_time" content="${escapeHtml(modTime)}">` : '',
      author ? `<meta data-rh="true" property="article:author" content="${escapeHtml(author)}">` : '',
      section ? `<meta data-rh="true" property="article:section" content="${escapeHtml(section)}">` : '',
      ...tags.filter((t: any) => typeof t === 'string' && t.trim()).map((t: string) => `<meta data-rh="true" property="article:tag" content="${escapeHtml(t.trim())}">`)
    ].filter(Boolean).join('\n    ');
  })();

  const iconLinksHtml = `
    <link data-rh="true" rel="icon" type="image/x-icon" href="${escapeHtml(resolvedFaviconIco)}">
    <link data-rh="true" rel="shortcut icon" href="${escapeHtml(resolvedFaviconIco)}">
    <link data-rh="true" rel="icon" type="image/png" sizes="48x48" href="${escapeHtml(resolvedFavicon48)}">
    <link data-rh="true" rel="icon" type="image/png" sizes="96x96" href="${escapeHtml(resolvedFavicon96)}">
    <link data-rh="true" rel="icon" type="image/png" sizes="144x144" href="${escapeHtml(resolvedFavicon144)}">
    <link data-rh="true" rel="icon" type="image/png" sizes="192x192" href="${escapeHtml(resolvedFavicon192)}">
    <link data-rh="true" rel="icon" type="image/png" sizes="512x512" href="${escapeHtml(resolvedFavicon512)}">
    <link data-rh="true" rel="icon" type="image/png" sizes="32x32" href="${escapeHtml(resolvedFavicon32)}">
    <link data-rh="true" rel="icon" type="image/png" sizes="16x16" href="${escapeHtml(resolvedFavicon16)}">
    <link data-rh="true" rel="apple-touch-icon" sizes="180x180" href="${escapeHtml(resolvedFavicon180)}">
    <link data-rh="true" rel="manifest" href="/site.webmanifest">`;

  if (pageType === 'gateway') {
    const noindexRule = 'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate';
    return `
    <title>${escapedTitle}</title>
    <meta name="description" content="Verification Portal">
    <meta data-rh="true" name="referrer" content="no-referrer">
    <meta data-rh="true" name="robots" content="${noindexRule}">
    <meta data-rh="true" name="googlebot" content="${noindexRule}">
    <meta data-rh="true" name="bingbot" content="${noindexRule}">
    <meta data-rh="true" name="slurp" content="${noindexRule}">
    <meta data-rh="true" name="baiduspider" content="${noindexRule}">
    <meta data-rh="true" name="yandex" content="${noindexRule}">
    <meta data-rh="true" name="duckduckbot" content="${noindexRule}">
    <meta data-rh="true" name="gptbot" content="${noindexRule}">
    <meta data-rh="true" name="claudebot" content="${noindexRule}">
    <meta data-rh="true" name="perplexitybot" content="${noindexRule}">
    ${iconLinksHtml}
  `;
  }

  const isHomePage = pageType === 'home';

  return `
    <title>${escapedTitle}</title>
    <meta name="description" content="${escapedDesc}">
    ${keywords ? `<meta name="keywords" content="${escapedKeywords}">` : ''}
    ${isHomePage && resolvedSiteName ? `<meta data-rh="true" name="application-name" content="${resolvedSiteName}">` : ''}
    <meta data-rh="true" name="color-scheme" content="light dark">
    ${isNotFound
      ? `<meta data-rh="true" name="robots" content="noindex, nofollow, noarchive, nosnippet">`
      : `<meta data-rh="true" name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">`
    }
    ${isHomePage && resolvedSiteName ? `<meta data-rh="true" property="og:site_name" content="${resolvedSiteName}">` : ''}
    <meta data-rh="true" property="og:locale" content="en_IN">
    <meta data-rh="true" property="og:title" content="${escapedTitle}">
    <meta data-rh="true" property="og:description" content="${escapedDesc}">
    <meta data-rh="true" property="og:type" content="${ogType}">
    <meta data-rh="true" property="og:url" content="${canonicalUrl}">
    <meta data-rh="true" property="og:image" content="${pageOgImage}">
    <meta data-rh="true" property="og:image:secure_url" content="${pageOgImage}">
    <meta data-rh="true" property="og:image:type" content="${pageOgImage.includes('.jpg') || pageOgImage.includes('f_jpg') ? 'image/jpeg' : 'image/png'}">
    <meta data-rh="true" property="og:image:width" content="${ogImageWidth}">
    <meta data-rh="true" property="og:image:height" content="${ogImageHeight}">
    ${articleMetaTags}
    <meta data-rh="true" name="twitter:card" content="summary_large_image">
    <meta data-rh="true" name="twitter:url" content="${canonicalUrl}">
    <meta data-rh="true" name="twitter:title" content="${escapedTitle}">
    <meta data-rh="true" name="twitter:description" content="${escapedDesc}">
    <meta data-rh="true" name="twitter:image" content="${pageOgImage}">
    <meta data-rh="true" name="thumbnail" content="${searchThumbnail}">
    <meta data-rh="true" itemprop="image" content="${searchThumbnail}">
    <meta data-rh="true" itemprop="thumbnailUrl" content="${searchThumbnail}">
    <link data-rh="true" rel="image_src" href="${searchThumbnail}">
    ${!isNotFound ? `<link data-rh="true" rel="canonical" href="${canonicalUrl}">` : ''}
    ${iconLinksHtml}
    ${(() => {
      if (targetApp && getField(targetApp, 'icon_url')) {
        return `<link rel="preload" as="image" href="${escapeHtml(getOptimizedImageUrl(getField(targetApp, 'icon_url'), 512))}" fetchpriority="high">`;
      }
      if (pageType === 'news' && targetNews) {
        const rawNewsHero = getField(targetNews, 'image') || getField(targetNews, 'image_url') || getField(targetNews, 'logo_url') || getField(targetNews, 'og_image_url');
        if (rawNewsHero) {
          const hero480 = escapeHtml(getOptimizedImageUrl(rawNewsHero, 480));
          const hero800 = escapeHtml(getOptimizedImageUrl(rawNewsHero, 800));
          const hero1200 = escapeHtml(getOptimizedImageUrl(rawNewsHero, 1200));
          return `<link rel="preload" as="image" href="${hero800}" imagesrcset="${hero480} 480w, ${hero800} 800w, ${hero1200} 1200w" imagesizes="(max-width: 640px) 100vw, 768px" fetchpriority="high">`;
        }
      }
      if (pageType === 'home' && settings && Array.isArray((settings as any).banners) && (settings as any).banners.length > 0 && ((settings as any).banners[0].image_url || (settings as any).banners[0].image)) {
        const rawBanner = (settings as any).banners[0].image_url || (settings as any).banners[0].image;
        const b400 = escapeHtml(getOptimizedImageUrl(rawBanner, 400));
        const b600 = escapeHtml(getOptimizedImageUrl(rawBanner, 600));
        const b800 = escapeHtml(getOptimizedImageUrl(rawBanner, 800));
        return `<link rel="preload" as="image" href="${b600}" imagesrcset="${b400} 400w, ${b600} 600w, ${b800} 800w" imagesizes="(max-width: 640px) 100vw, 800px" fetchpriority="high">`;
      }
      if (collectionItems && collectionItems.length > 0 && getField(collectionItems[0], 'icon_url')) {
        return `<link rel="preload" as="image" href="${escapeHtml(getOptimizedImageUrl(getField(collectionItems[0], 'icon_url'), 120))}" fetchpriority="high">`;
      }
      if (iconSet.headerLogo) {
        return `<link rel="preload" as="image" href="${escapeHtml(iconSet.headerLogo)}" fetchpriority="high">`;
      }
      return '';
    })()}
    ${!isNotFound ? jsonLdSchema : ''}
  `;
}

