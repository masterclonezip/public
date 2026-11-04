import { resolveAppSlug } from './slugResolver';

export function calculateReadingTime(text?: string): string {
  if (!text) return '1 min read';
  const plain = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  if (!plain) return '1 min read';
  const words = plain.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} min read`;
}

export function resolveCanonicalNewsDate(itemOrDate?: any, publishedAt?: string, createdAt?: string): string {
  if (!itemOrDate) return publishedAt || createdAt || '';
  if (typeof itemOrDate === 'object') {
    return itemOrDate.published_at || itemOrDate.created_at || itemOrDate.date || '';
  }
  return publishedAt || createdAt || itemOrDate || '';
}

export function formatNewsDate(dateStr?: string, publishedAt?: string, createdAt?: string): string {
  const d = publishedAt || createdAt || dateStr;
  if (!d || d === 'Recent') return 'Recent';
  try {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
      });
    }
  } catch (e) {}
  return 'Recent';
}

export function getPlainTextSnippet(htmlOrText?: string, maxLength: number = 160): string {
  if (!htmlOrText) return '';
  const clean = htmlOrText
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return maxLength > 0 && clean.length > maxLength ? clean.slice(0, maxLength).trim() : clean;
}

/**
 * Deterministic "Next, Next, Next" Circular Daisy-Chain Internal Linking Engine
 *
 * Guarantees every news article links forward to the next N articles in the publication sequence,
 * wrapping around circularly so:
 * - When on article i, it displays articles (i+1), (i+2), ... (i+count) % total
 * - Navigating to the next article displays the subsequent 6 articles in the chain
 * - Every article in the catalog receives equal, balanced incoming internal backlinks and PageRank
 * - 100% deterministic between server SSR (newsRenderer.ts), initialDataOptimizer.ts, and client React (NewsDetailPage.tsx)
 */
export function getNextNewsChain(
  currentNewsItemOrKey: any,
  allNews: any[],
  count: number = 6
): any[] {
  if (!Array.isArray(allNews) || allNews.length === 0) return [];

  const validNews = allNews.filter((n: any) => n && n.sync_to_public !== false);
  if (validNews.length <= 1) return [];

  // Canonical sort: newest first, respecting is_pinned, then date/published_at descending, then slug/id for tie-breaking
  const sorted = [...validNews].sort((a: any, b: any) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    const dateA = new Date(a.published_at || a.date || a.created_at || 0).getTime();
    const dateB = new Date(b.published_at || b.date || b.created_at || 0).getTime();
    if (dateA !== dateB) return dateB - dateA;
    return String(a.slug || a.id || '').localeCompare(String(b.slug || b.id || ''));
  });

  const curKey = typeof currentNewsItemOrKey === 'string'
    ? currentNewsItemOrKey.toLowerCase().trim()
    : String(currentNewsItemOrKey?.slug || currentNewsItemOrKey?.id || '').toLowerCase().trim();

  const currentIndex = sorted.findIndex((n: any) => {
    const s = String(n.slug || n.id || '').toLowerCase().trim();
    const id = String(n.id || '').toLowerCase().trim();
    return s === curKey || id === curKey;
  });

  const targetCount = Math.min(count, sorted.length - 1);
  const result: any[] = [];

  if (currentIndex === -1) {
    return sorted.slice(0, targetCount);
  }

  // Circular forward progression: (currentIndex + step) % sorted.length
  for (let step = 1; step <= targetCount; step++) {
    const nextIdx = (currentIndex + step) % sorted.length;
    result.push(sorted[nextIdx]);
  }

  return result;
}

function unwrapVal(item: any, field: string): any {
  if (!item) return '';
  if (item[field] !== undefined && item[field] !== null && typeof item[field] !== 'object') return item[field];
  if (item.fields && item.fields[field]) {
    const f = item.fields[field];
    return f.stringValue ?? f.integerValue ?? f.doubleValue ?? f.booleanValue ?? '';
  }
  return item[field] ?? '';
}

/**
 * Canonical resolver to find the related App for a News article.
 * Shared across SSR (newsRenderer.ts), Payload Optimizer (initialDataOptimizer.ts), and Client (NewsDetailPage.tsx).
 */
export function resolveRelatedAppForNews(newsItem: any, apps: any[]): any | null {
  if (!newsItem || !Array.isArray(apps) || apps.length === 0) return null;

  // 1. Check explicit related_app_id via fuzzy/slug/id resolver
  const relId = String(unwrapVal(newsItem, 'related_app_id') || '').trim();
  if (relId) {
    const resolvedByRelId = resolveAppSlug(relId, apps);
    if (resolvedByRelId) return resolvedByRelId;
  }

  // 2. Check newsItem.link if it points to /app/:slug
  const rawLink = String(unwrapVal(newsItem, 'link') || '').trim();
  if (rawLink && rawLink.includes('/app/')) {
    const linkSlug = rawLink.replace(/^.*\/app\//, '').replace(/\/+$/, '').split(/[?#]/)[0].trim();
    if (linkSlug) {
      const resolvedByLink = resolveAppSlug(linkSlug, apps);
      if (resolvedByLink) return resolvedByLink;
    }
  }

  // 3. Check newsItem.tags for an exact app slug or name match
  if (Array.isArray(newsItem.tags)) {
    for (const tag of newsItem.tags) {
      const cleanTag = String(tag || '').trim();
      if (cleanTag) {
        const resolvedByTag = resolveAppSlug(cleanTag, apps);
        if (resolvedByTag) return resolvedByTag;
      }
    }
  }

  // 4. Check if news title explicitly mentions a catalog app name (longest match first)
  const titleLower = String(unwrapVal(newsItem, 'title') || '').toLowerCase().trim();
  if (titleLower) {
    const candidates = apps
      .filter((a: any) => a && a.sync_to_public !== false && String(unwrapVal(a, 'name') || '').trim().length >= 3)
      .sort((a: any, b: any) => String(unwrapVal(b, 'name') || '').length - String(unwrapVal(a, 'name') || '').length);

    for (const app of candidates) {
      const appNameLower = String(unwrapVal(app, 'name') || '').toLowerCase().trim();
      if (appNameLower && titleLower.includes(appNameLower)) {
        return app;
      }
    }
  }

  return null;
}

/**
 * Canonical resolver to find all related News articles for an App.
 * Shared across SSR (appDetailsRenderer.ts), Payload Optimizer (initialDataOptimizer.ts), and Client (AppDetails.tsx).
 */
export function getRelatedNewsForApp(app: any, allNews: any[]): any[] {
  if (!app || !Array.isArray(allNews) || allNews.length === 0) return [];

  const appNameLower = String(unwrapVal(app, 'name') || '').toLowerCase().trim();
  const appIdLower = String(unwrapVal(app, 'id') || '').toLowerCase().trim();
  const appSlugLower = String(unwrapVal(app, 'slug') || '').toLowerCase().trim();

  return allNews.filter((n: any) => {
    if (!n || n.sync_to_public === false) return false;

    const nRelId = String(unwrapVal(n, 'related_app_id') || '').trim();
    if (nRelId) {
      const nRelLower = nRelId.toLowerCase();
      if ((appIdLower && nRelLower === appIdLower) || (appSlugLower && nRelLower === appSlugLower)) {
        return true;
      }
      if (resolveAppSlug(nRelId, [app])) {
        return true;
      }
    }

    const nLink = String(unwrapVal(n, 'link') || '').trim();
    if (nLink && nLink.includes('/app/')) {
      const linkSlug = nLink.replace(/^.*\/app\//, '').replace(/\/+$/, '').split(/[?#]/)[0].trim();
      if (linkSlug && (linkSlug.toLowerCase() === appSlugLower || Boolean(resolveAppSlug(linkSlug, [app])))) {
        return true;
      }
    }

    if (!appNameLower) return false;
    const nTitle = String(unwrapVal(n, 'title') || '').toLowerCase();
    const nDesc = String(unwrapVal(n, 'description') || '').toLowerCase();
    if (nTitle.includes(appNameLower) || nDesc.includes(appNameLower)) {
      return true;
    }

    if (Array.isArray(n.tags)) {
      return n.tags.some((t: any) => {
        const tStr = String(t || '').toLowerCase().trim();
        return tStr === appNameLower || tStr === appSlugLower || Boolean(resolveAppSlug(tStr, [app]));
      });
    }

    return false;
  });
}


