// src/lib/sitemapGenerator.ts
// Standardized XML Sitemap Generation
import { resolveSiteLogoUrl, getOptimizedImageUrl } from '../seo/utils';
import { resolvePublicSiteDomain, isValidPublicProductionDomain } from './seoUtils';

export interface SitemapGenOptions {
  host?: string;
  defaultLogo?: string;
}

export const normalizeSitemapHost = (host: string): string => {
  if (!host) return '';
  let h = host.trim().replace(/^["']+|["']+$/g, '').replace(/\/+$/, '');
  if (!h) return '';
  const hasHttp = /^https?:\/\//i.test(h);
  if (!hasHttp) h = `https://${h}`;
  try {
    const parsed = new URL(h);
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^(?:www\.|admin\.|masterworld\.)+/i, '');
    const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    const protocol = isLocal ? parsed.protocol : 'https:';
    return `${protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
  } catch {
    return h
      .replace(/^http:\/\/(?!localhost|127\.0\.0\.1)/i, 'https://')
      .replace(/^(https?:\/\/)(?:www\.|admin\.|masterworld\.)+/i, '$1');
  }
};

export const enforceNonWwwXml = (xml: string): string => {
  if (!xml) return '';
  return xml.replace(
    /(<(?:loc|image:loc|video:thumbnail_loc)>\s*https?:\/\/)(?:www\.|admin\.|masterworld\.)+([^<\s]+\s*<\/(?:loc|image:loc|video:thumbnail_loc)>)/gi,
    (_, openTag, rest) => `${openTag.replace(/^<(loc|image:loc|video:thumbnail_loc)>\s*http:\/\/(?!localhost|127\.0\.0\.1)/i, '<$1>https://')}${rest}`
  );
};

const getDefaultSitemapHost = (): string => {
  return normalizeSitemapHost(resolvePublicSiteDomain());
};

export const escapeXml = (unsafe: any): string => {
  if (typeof unsafe !== 'string') unsafe = String(unsafe || '');
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const cleanSlug = (slug: string): string => {
  if (!slug) return '';
  return escapeXml(encodeURI(slug.trim().replace(/^\/+|\/+$/g, '')));
};

export const normalizeSitemapImageUrl = (
  rawUrl: any,
  cleanHost: string,
  width: number = 800,
  fallbackUrl: string = ''
): string => {
  let candidate = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!candidate) {
    candidate = typeof fallbackUrl === 'string' ? fallbackUrl.trim() : '';
  }
  if (!candidate) {
    return cleanHost ? `${cleanHost}/logo.png` : '/logo.png';
  }
  if (!candidate.startsWith('http://') && !candidate.startsWith('https://')) {
    candidate = `${cleanHost}${candidate.startsWith('/') ? '' : '/'}${candidate}`;
  } else if (!candidate.includes('res.cloudinary.com') && !candidate.includes('img.youtube.com') && !candidate.includes('images.unsplash.com')) {
    candidate = candidate.replace(/^(https?:\/\/)(?:www\.|admin\.|masterworld\.)+/i, '$1');
  }
  if (candidate.includes('res.cloudinary.com')) {
    return getOptimizedImageUrl(candidate, width);
  }
  return candidate;
};

export const STABLE_BASELINE_DATE = '2026-09-01T00:00:00+00:00';

export const formatSitemapDate = (dateVal: any, fallbackDate?: string): string => {
  const fallback = fallbackDate || STABLE_BASELINE_DATE;
  if (!dateVal) return fallback;

  try {
    if (typeof dateVal === 'object' && dateVal !== null) {
      if ((dateVal as any).seconds) {
        return new Date((dateVal as any).seconds * 1000).toISOString().replace(/\.\d{3}Z$/, '+00:00');
      }
      if ((dateVal as any)._seconds) {
        return new Date((dateVal as any)._seconds * 1000).toISOString().replace(/\.\d{3}Z$/, '+00:00');
      }
      if (typeof (dateVal as any).toMillis === 'function') {
        return new Date((dateVal as any).toMillis()).toISOString().replace(/\.\d{3}Z$/, '+00:00');
      }
    }
    if (typeof dateVal === 'number' && dateVal > 0) {
      const ms = dateVal > 1e11 ? dateVal : dateVal * 1000;
      return new Date(ms).toISOString().replace(/\.\d{3}Z$/, '+00:00');
    }
    if (typeof dateVal === 'string' && dateVal.trim().length > 0) {
      const parsed = new Date(dateVal.trim()).getTime();
      if (!isNaN(parsed) && parsed > 0) {
        return new Date(parsed).toISOString().replace(/\.\d{3}Z$/, '+00:00');
      }
    }
  } catch (e) {}

  return fallback;
};

export const resolveItemTimestamp = (item: any, fallbackDate: string = STABLE_BASELINE_DATE): string => {
  if (!item || typeof item !== 'object') return fallbackDate;
  const raw = item.updated_at || item.published_at || item.publish_date || item.created_at || item.added_date || item.date;
  return formatSitemapDate(raw, fallbackDate);
};

export const isSitemapPublicApp = (a: any): boolean => {
  if (!a || typeof a !== 'object') return false;
  if (!a.slug && !a.id) return false;
  if (a.sync_to_public === false || a.sync_to_public === 'false' || a.sync_to_public === 0 || a.sync_to_public === '0') return false;
  if (a.is_published === false || a.is_published === 'false') return false;
  if (a.is_draft === true || a.is_draft === 'true') return false;
  if (a.is_hidden === true || a.is_hidden === 'true') return false;
  if (typeof a.status === 'string') {
    const st = a.status.trim().toLowerCase();
    if (st === 'draft' || st === 'unpublished' || st === 'hidden' || st === 'archived') return false;
  }
  return true;
};

export const isSitemapPublicNews = (n: any): boolean => {
  if (!n || typeof n !== 'object') return false;
  if (!n.slug && !n.id) return false;
  if (n.sync_to_public === false || n.sync_to_public === 'false' || n.sync_to_public === 0 || n.sync_to_public === '0') return false;
  if (n.is_published === false || n.is_published === 'false') return false;
  if (n.is_draft === true || n.is_draft === 'true') return false;
  if (typeof n.status === 'string') {
    const st = n.status.trim().toLowerCase();
    if (st === 'draft' || st === 'unpublished' || st === 'hidden' || st === 'archived') return false;
  }
  return true;
};

export const getLatestItemDate = (items: any[], fallbackDate: string = STABLE_BASELINE_DATE): string => {
  if (!Array.isArray(items) || items.length === 0) return fallbackDate;
  let maxTs = 0;
  for (const item of items) {
    if (!item || !isSitemapPublicApp(item)) continue;
    const raw = item.updated_at || item.published_at || item.publish_date || item.created_at || item.added_date || item.date;
    if (raw) {
      const d = new Date(formatSitemapDate(raw, fallbackDate)).getTime();
      if (!isNaN(d) && d > maxTs) maxTs = d;
    }
  }
  return maxTs > 0 ? new Date(maxTs).toISOString().replace(/\.\d{3}Z$/, '+00:00') : fallbackDate;
};

// 1. Master Sitemap Index (sitemap.xml)
export function generateMasterSitemapXml(
  apps: any[] = [],
  news: any[] = [],
  videos: any[] = [],
  host: string = getDefaultSitemapHost(),
  settings?: any
): string {
  const cleanHost = normalizeSitemapHost(host);
  const latestAppDate = getLatestItemDate(apps, STABLE_BASELINE_DATE);
  const latestNewsDate = getLatestItemDate(news, STABLE_BASELINE_DATE);
  const latestVideoDate = getLatestItemDate(videos, STABLE_BASELINE_DATE);
  const settingsDate = formatSitemapDate(settings?.last_updated || settings?.updated_at, STABLE_BASELINE_DATE);
  const latestStaticDate = settingsDate;
  const latestDevDate = getLatestItemDate(settings?.developers || [], STABLE_BASELINE_DATE);

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${cleanHost}/sitemap-apps.xml</loc>
    <lastmod>${latestAppDate}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${cleanHost}/sitemap-static.xml</loc>
    <lastmod>${latestStaticDate}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${cleanHost}/sitemap-news.xml</loc>
    <lastmod>${latestNewsDate}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${cleanHost}/sitemap-videos.xml</loc>
    <lastmod>${latestVideoDate}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${cleanHost}/sitemap-developers.xml</loc>
    <lastmod>${latestDevDate}</lastmod>
  </sitemap>
</sitemapindex>`;
}

// 2. Apps Sitemap (sitemap-apps.xml)
export function generateAppsSitemapXml(
  apps: any[] = [],
  host: string = getDefaultSitemapHost(),
  siteLogo: string = '',
  siteTitle: string = ''
): string {
  const cleanHost = normalizeSitemapHost(host);
  const fallbackLogo = normalizeSitemapImageUrl(siteLogo, cleanHost, 512);
  const brandTitle = siteTitle || 'Official Brand Logo';

  // Filter public-ready apps
  const publicApps = apps.filter(isSitemapPublicApp);
  
  // Sort latest updated first
  publicApps.sort((a, b) => {
    const ta = new Date(resolveItemTimestamp(a, STABLE_BASELINE_DATE)).getTime();
    const tb = new Date(resolveItemTimestamp(b, STABLE_BASELINE_DATE)).getTime();
    return tb - ta;
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  const seenUrls = new Set<string>();
  for (const app of publicApps) {
    const slug = app.slug || app.id;
    if (!slug) continue;
    const cSlug = cleanSlug(String(slug));
    const loc = `${cleanHost}/app/${cSlug}`;
    if (seenUrls.has(loc)) continue;
    seenUrls.add(loc);

    const appDate = resolveItemTimestamp(app, STABLE_BASELINE_DATE);
    const appImage = normalizeSitemapImageUrl(app.og_image_url || app.icon_url, cleanHost, 800, fallbackLogo);
    const appName = app.name || 'Application';

    const isFeatured = app.is_featured === true || app.is_hot === true;
    const priority = isFeatured ? '0.9' : '0.8';
    const changefreq = isFeatured ? 'daily' : 'weekly';

    xml += `  <url>\n`;
    xml += `    <loc>${loc}</loc>\n`;
    xml += `    <lastmod>${appDate}</lastmod>\n`;
    xml += `    <changefreq>${changefreq}</changefreq>\n`;
    xml += `    <priority>${priority}</priority>\n`;
    if (appImage) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(appImage)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(appName)}</image:title>\n`;
      xml += `    </image:image>\n`;
    }
    if (Array.isArray(app.screenshots)) {
      app.screenshots.forEach((s: string, idx: number) => {
        if (!s || typeof s !== 'string' || !s.trim()) return;
        const shotImage = normalizeSitemapImageUrl(s, cleanHost, 800);
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${escapeXml(shotImage)}</image:loc>\n`;
        xml += `      <image:caption>Screenshot ${idx + 1} of ${escapeXml(appName)} showing gameplay</image:caption>\n`;
        xml += `    </image:image>\n`;
      });
    }
    xml += `  </url>\n`;
  }

  // Safety: If no apps matched, add fallback so XML is never empty
  if (seenUrls.size === 0) {
    xml += `  <url>\n`;
    xml += `    <loc>${cleanHost}/</loc>\n`;
    xml += `    <lastmod>${STABLE_BASELINE_DATE}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    if (fallbackLogo) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(fallbackLogo)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(brandTitle)}</image:title>\n`;
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;
  return xml;
}

// 3. News Sitemap (sitemap-news.xml)
export function generateNewsSitemapXml(
  news: any[] = [],
  host: string = getDefaultSitemapHost(),
  siteLogo: string = '',
  siteTitle: string = ''
): string {
  const cleanHost = normalizeSitemapHost(host);
  const fallbackLogo = normalizeSitemapImageUrl(siteLogo, cleanHost, 512);
  const brandTitle = siteTitle || 'News & Updates';
  const publicNews = news.filter(isSitemapPublicNews);

  publicNews.sort((a, b) => {
    const ta = new Date(formatSitemapDate(a.updated_at || a.published_at || a.publish_date || a.created_at || a.date, STABLE_BASELINE_DATE)).getTime();
    const tb = new Date(formatSitemapDate(b.updated_at || b.published_at || b.publish_date || b.created_at || b.date, STABLE_BASELINE_DATE)).getTime();
    return tb - ta;
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  const seenUrls = new Set<string>();
  for (const item of publicNews) {
    const slug = item.slug;
    if (!slug) continue;
    const cSlug = cleanSlug(slug);
    const loc = `${cleanHost}/news/${cSlug}`;
    if (seenUrls.has(loc)) continue;
    seenUrls.add(loc);

    const itemDate = formatSitemapDate(item.updated_at || item.published_at || item.publish_date || item.created_at || item.date, STABLE_BASELINE_DATE);
    const rawItemImg = item.logo_url || item.image_url || item.thumbnail_url || item.og_image_url || item.image || '';
    const itemImage = normalizeSitemapImageUrl(rawItemImg, cleanHost, 800, fallbackLogo);
    const itemTitle = item.title || 'News Article';

    xml += `  <url>\n`;
    xml += `    <loc>${loc}</loc>\n`;
    xml += `    <lastmod>${itemDate}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    if (itemImage) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(itemImage)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(itemTitle)}</image:title>\n`;
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  }

  if (seenUrls.size === 0) {
    xml += `  <url>\n`;
    xml += `    <loc>${cleanHost}/news</loc>\n`;
    xml += `    <lastmod>${STABLE_BASELINE_DATE}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    if (fallbackLogo) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(fallbackLogo)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(brandTitle)}</image:title>\n`;
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;
  return xml;
}

// 4. Videos Sitemap (sitemap-videos.xml) - Guaranteed non-empty with Google Video Sitemap extension
export function generateVideosSitemapXml(
  videos: any[] = [],
  host: string = getDefaultSitemapHost(),
  siteLogo: string = '',
  siteTitle: string = ''
): string {
  const cleanHost = normalizeSitemapHost(host);
  const now = STABLE_BASELINE_DATE;
  const fallbackLogo = normalizeSitemapImageUrl(siteLogo, cleanHost, 512);
  const brandTitle = siteTitle || 'Video Reviews';

  const extractYoutubeIdForSitemap = (urlStr: string): string => {
    if (!urlStr) return '';
    const m = String(urlStr).match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
    return (m && m[1]) ? m[1] : '';
  };

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n`;

  const seenUrls = new Set<string>();
  for (const item of (videos || [])) {
    if (!item || item.sync_to_public === false) continue;
    const slug = item.slug || item.id;
    if (!slug) continue;
    const cSlug = cleanSlug(String(slug));
    const loc = `${cleanHost}/videos/${cSlug}`;
    if (seenUrls.has(loc)) continue;
    seenUrls.add(loc);

    const itemDate = resolveItemTimestamp(item, now);
    const ytUrl = item.youtube_url || item.video_url || item.url || '';
    const ytId = extractYoutubeIdForSitemap(ytUrl);
    const rawThumb = item.thumbnail_url || item.image_url || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '');
    const itemImage = normalizeSitemapImageUrl(rawThumb, cleanHost, 800, fallbackLogo);
    const itemTitle = item.title || 'Video Walkthrough';
    const itemDesc = (item.seo_description || item.description || itemTitle).replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    const playerLoc = ytId ? `https://www.youtube.com/embed/${ytId}` : (ytUrl && ytUrl.startsWith('http') ? ytUrl : '');

    xml += `  <url>\n`;
    xml += `    <loc>${loc}</loc>\n`;
    xml += `    <lastmod>${itemDate}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    if (itemImage) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(itemImage)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(itemTitle)}</image:title>\n`;
      xml += `    </image:image>\n`;
    }
    if (itemImage && playerLoc) {
      xml += `    <video:video>\n`;
      xml += `      <video:thumbnail_loc>${escapeXml(itemImage)}</video:thumbnail_loc>\n`;
      xml += `      <video:title>${escapeXml(itemTitle)}</video:title>\n`;
      xml += `      <video:description>${escapeXml(itemDesc)}</video:description>\n`;
      xml += `      <video:player_loc>${escapeXml(playerLoc)}</video:player_loc>\n`;
      xml += `      <video:publication_date>${itemDate}</video:publication_date>\n`;
      xml += `    </video:video>\n`;
    }
    xml += `  </url>\n`;
  }

  // ALWAYS ensure at least the main /videos landing page is present if no video detail routes exist
  if (seenUrls.size === 0) {
    xml += `  <url>\n`;
    xml += `    <loc>${cleanHost}/videos</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    if (fallbackLogo) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(fallbackLogo)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(brandTitle)}</image:title>\n`;
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;
  return xml;
}

export interface StaticSitemapDates {
  latestAppDate?: string;
  latestNewsDate?: string;
  latestVideoDate?: string;
  settingsDate?: string;
}

// 5. Static Pages Sitemap (sitemap-static.xml)
export function generateStaticSitemapXml(
  host: string = getDefaultSitemapHost(),
  datesOrFallback?: string | StaticSitemapDates,
  siteLogo: string = '',
  siteTitle: string = ''
): string {
  const cleanHost = normalizeSitemapHost(host);
  const isObj = typeof datesOrFallback === 'object' && datesOrFallback !== null;
  const fallback = !isObj && typeof datesOrFallback === 'string'
    ? formatSitemapDate(datesOrFallback, STABLE_BASELINE_DATE)
    : STABLE_BASELINE_DATE;

  const infoDate = isObj ? formatSitemapDate(datesOrFallback.settingsDate, STABLE_BASELINE_DATE) : fallback;
  const newsDate = isObj && datesOrFallback.latestNewsDate ? formatSitemapDate(datesOrFallback.latestNewsDate, infoDate) : infoDate;
  const videoDate = isObj && datesOrFallback.latestVideoDate ? formatSitemapDate(datesOrFallback.latestVideoDate, infoDate) : infoDate;
  const resolvedLogo = normalizeSitemapImageUrl(siteLogo, cleanHost, 512);
  const brandPrefix = siteTitle ? `${siteTitle} - ` : '';

  const staticPages = [
    { path: '/', title: siteTitle || 'Official Portal', priority: '1.0', changefreq: 'daily', lastmod: infoDate },
    { path: '/new-apps', title: `${brandPrefix}New Apps`, priority: '0.8', changefreq: 'daily', lastmod: infoDate },
    { path: '/categories', title: `${brandPrefix}App Categories`, priority: '0.8', changefreq: 'weekly', lastmod: infoDate },
    { path: '/news', title: `${brandPrefix}Industry News`, priority: '0.8', changefreq: 'daily', lastmod: newsDate },
    { path: '/videos', title: `${brandPrefix}Video Reviews`, priority: '0.7', changefreq: 'weekly', lastmod: videoDate },
    { path: '/about', title: `${brandPrefix}About Us`, priority: '0.5', changefreq: 'monthly', lastmod: infoDate },
    { path: '/contact', title: `${brandPrefix}Contact Support`, priority: '0.5', changefreq: 'monthly', lastmod: infoDate },
    { path: '/faq', title: `${brandPrefix}Frequently Asked Questions`, priority: '0.5', changefreq: 'monthly', lastmod: infoDate },
    { path: '/privacy', title: `${brandPrefix}Privacy Policy`, priority: '0.3', changefreq: 'monthly', lastmod: infoDate },
    { path: '/terms', title: `${brandPrefix}Terms of Service`, priority: '0.3', changefreq: 'monthly', lastmod: infoDate },
    { path: '/disclaimer', title: `${brandPrefix}Disclaimer`, priority: '0.3', changefreq: 'monthly', lastmod: infoDate },
    { path: '/notice', title: `${brandPrefix}Legal Notice`, priority: '0.3', changefreq: 'monthly', lastmod: infoDate },
    { path: '/ethics', title: `${brandPrefix}Ethics Policy`, priority: '0.3', changefreq: 'monthly', lastmod: infoDate },
    { path: '/responsibility', title: `${brandPrefix}Responsible Gaming`, priority: '0.3', changefreq: 'monthly', lastmod: infoDate },
    { path: '/report-removal', title: `${brandPrefix}Report & Removal`, priority: '0.3', changefreq: 'monthly', lastmod: infoDate }
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
  for (const page of staticPages) {
    xml += `  <url>\n`;
    xml += `    <loc>${cleanHost}${page.path === '/' ? '/' : page.path}</loc>\n`;
    xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    if (resolvedLogo) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(resolvedLogo)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(page.title)}</image:title>\n`;
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  }
  xml += `</urlset>\n`;
  return xml;
}

// 6. Developers Sitemap (sitemap-developers.xml)
export function generateDevelopersSitemapXml(
  host: string = getDefaultSitemapHost(),
  latestDate?: string,
  siteLogo: string = '',
  siteTitle: string = '',
  developers: any[] = []
): string {
  const cleanHost = normalizeSitemapHost(host);
  const now = formatSitemapDate(latestDate, STABLE_BASELINE_DATE);
  const resolvedLogo = normalizeSitemapImageUrl(siteLogo, cleanHost, 512);
  const pageTitle = siteTitle ? `${siteTitle} - Developer Profiles` : 'Developer Profiles';

  let devImagesXml = '';
  if (resolvedLogo) {
    devImagesXml += `    <image:image>\n      <image:loc>${escapeXml(resolvedLogo)}</image:loc>\n      <image:title>${escapeXml(pageTitle)}</image:title>\n    </image:image>\n`;
  }
  if (Array.isArray(developers)) {
    developers.forEach((dev: any) => {
      const rawAvatar = dev?.avatar_url || dev?.image_url || dev?.photo_url || dev?.logo_url || '';
      if (rawAvatar && typeof rawAvatar === 'string' && rawAvatar.trim()) {
        const avatarLoc = normalizeSitemapImageUrl(rawAvatar, cleanHost, 512);
        const devName = dev?.name || dev?.role || 'Developer';
        devImagesXml += `    <image:image>\n      <image:loc>${escapeXml(avatarLoc)}</image:loc>\n      <image:title>${escapeXml(devName)}</image:title>\n    </image:image>\n`;
      }
    });
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${cleanHost}/developers</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
${devImagesXml}  </url>
</urlset>
`;
}

// Helper to generate all sitemaps into a dictionary
export function generateAllSitemaps(
  data: { apps?: any[]; news?: any[]; videos?: any[]; settings?: any },
  host: string = getDefaultSitemapHost()
) {
  const apps = data.apps || [];
  const news = data.news || [];
  const videos = data.videos || [];
  const settings = data.settings || {};
  const siteLogo = resolveSiteLogoUrl(settings);
  const siteTitle = String(settings?.site_title || '').trim();
  const developers = Array.isArray(settings?.developers) ? settings.developers : [];
  const latestAppDate = getLatestItemDate(apps, STABLE_BASELINE_DATE);
  const latestNewsDate = getLatestItemDate(news, STABLE_BASELINE_DATE);
  const latestVideoDate = getLatestItemDate(videos, STABLE_BASELINE_DATE);
  const settingsDate = formatSitemapDate(settings?.last_updated || settings?.updated_at, STABLE_BASELINE_DATE);
  const latestDevDate = getLatestItemDate(developers, STABLE_BASELINE_DATE);

  const candidateHost = isValidPublicProductionDomain(host)
    ? host
    : resolvePublicSiteDomain(settings, apps, news);
  const resolvedHost = normalizeSitemapHost(candidateHost || 'https://yonoappdex.com');

  return {
    'sitemap.xml': enforceNonWwwXml(generateMasterSitemapXml(apps, news, videos, resolvedHost, settings)),
    'sitemap-apps.xml': enforceNonWwwXml(generateAppsSitemapXml(apps, resolvedHost, siteLogo, siteTitle)),
    'sitemap-news.xml': enforceNonWwwXml(generateNewsSitemapXml(news, resolvedHost, siteLogo, siteTitle)),
    'sitemap-videos.xml': enforceNonWwwXml(generateVideosSitemapXml(videos, resolvedHost, siteLogo, siteTitle)),
    'sitemap-static.xml': enforceNonWwwXml(
      generateStaticSitemapXml(
        resolvedHost,
        {
          latestAppDate,
          latestNewsDate,
          latestVideoDate,
          settingsDate
        },
        siteLogo,
        siteTitle
      )
    ),
    'sitemap-developers.xml': enforceNonWwwXml(generateDevelopersSitemapXml(resolvedHost, latestDevDate, siteLogo, siteTitle, developers))
  };
}
