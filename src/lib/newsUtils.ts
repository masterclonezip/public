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

