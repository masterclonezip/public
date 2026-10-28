export function escapeHtml(unsafe: string) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function isBotUserAgent(userAgent?: string): boolean {
  if (!userAgent) return false;
  return /googlebot|google-inspectiontool|google-extended|googleother|bingbot|yandexbot|yandex|duckduckbot|duckduckgo|baiduspider|slurp|facebookexternalhit|facebot|twitterbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest\/|slackbot|vkShare|W3C_Validator|whatsapp|telegrambot|discordbot|applebot|petalbot|crawler|spider|screaming frog|semrushbot|ahrefsbot|rogerbot|exabot|dotbot|chatgpt|gptbot|oai-searchbot|anthropic|claude|claude-web|cohere|perplexity|perplexitybot|amazonbot|bytespider|diffbot|meta-externalagent|meta-externalfetcher|deepseek|mistral|ai2bot|ccbot|lighthouse|chrome-lighthouse|headlesschrome|pagespeed|pingdom|gtmetrix/i.test(userAgent);
}

export function getField(obj: any, key: string, fallback = ''): string {
  if (!obj) return fallback;
  const value = obj[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'object') {
    if ('stringValue' in value) return value.stringValue ?? fallback;
    if ('integerValue' in value) return String(value.integerValue) ?? fallback;
    if ('doubleValue' in value) return String(value.doubleValue) ?? fallback;
    if ('booleanValue' in value) return String(value.booleanValue) ?? fallback;
    return fallback;
  }
  return String(value);
}

export function stripHtml(html: string) {
  if (!html) return '';
  const stripped = html.replace(/<[^>]*>?/gm, ' ');
  return stripped.replace(/\s+/g, ' ').trim();
}

export function normalizeSchemaCategory(rawCategory?: string): string {
  if (!rawCategory || typeof rawCategory !== 'string') return 'GameApplication';
  const clean = rawCategory.replace(/[\r\n\t]+/g, ' ').trim();
  const lower = clean.toLowerCase();
  
  if (
    lower.includes('card') ||
    lower.includes('game') ||
    lower.includes('arcade') ||
    lower.includes('board') ||
    lower.includes('puzzle') ||
    lower.includes('casual') ||
    lower.includes('action') ||
    lower.includes('strategy') ||
    lower.includes('simulation') ||
    lower.includes('sports') ||
    lower.includes('adventure') ||
    lower.includes('racing') ||
    lower.includes('trivia')
  ) {
    return 'GameApplication';
  }
  
  if (lower.includes('tool') || lower.includes('utilit')) {
    return 'UtilitiesApplication';
  }
  if (lower.includes('social') || lower.includes('chat') || lower.includes('communication')) {
    return 'SocialNetworkingApplication';
  }
  if (lower.includes('finance') || lower.includes('money') || lower.includes('wallet') || lower.includes('pay')) {
    return 'FinanceApplication';
  }
  if (lower.includes('business') || lower.includes('productivity')) {
    return 'BusinessApplication';
  }
  if (lower.includes('shop') || lower.includes('store') || lower.includes('ecommerce')) {
    return 'ShoppingApplication';
  }
  if (lower.includes('entertain') || lower.includes('media') || lower.includes('video') || lower.includes('music')) {
    return 'EntertainmentApplication';
  }
  
  return 'GameApplication';
}

export function optimizeImageUrl(url: string, width = 128): string {
  return getOptimizedImageUrl(url, width);
}

export function getYoutubeThumbnail(urlStr: string): string {
  if (!urlStr) return '';
  let id = '';
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/live/') || url.pathname.startsWith('/embed/') || url.pathname.startsWith('/v/')) {
        id = url.pathname.split('/')[2] || url.pathname.split('/')[1] || '';
      } else {
        id = url.searchParams.get('v') || '';
      }
    } else if (url.hostname.includes('youtu.be')) {
      id = url.pathname.slice(1);
    }
  } catch (e) {
    if (urlStr.length === 11 && !urlStr.includes('/')) id = urlStr;
  }
  if (!id) {
    const m = urlStr.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
    if (m && m[1]) id = m[1];
    else id = urlStr.split('/').pop()?.split('?')[0] || '';
  }
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : '';
}

export const getDefaultOrigin = (): string => {
  if (typeof process !== 'undefined' && process.env) {
    return (process.env.PUBLIC_DOMAIN || process.env.VITE_PUBLIC_DOMAIN || '').trim().replace(/\/+$/, '');
  }
  return '';
};

export function getEnvLogoUrl(): string {
  if (typeof process !== 'undefined' && process.env) {
    const v = (process.env.SITE_LOGO_URL || process.env.VITE_SITE_LOGO_URL || '').trim();
    if (v) return v;
  }
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const v = String((import.meta as any).env.VITE_SITE_LOGO_URL || '').trim();
      if (v) return v;
    }
  } catch (_) {}
  return '';
}

export function getEnvFaviconUrl(): string {
  if (typeof process !== 'undefined' && process.env) {
    const v = (process.env.SITE_FAVICON_URL || process.env.VITE_SITE_FAVICON_URL || '').trim();
    if (v) return v;
  }
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const v = String((import.meta as any).env.VITE_SITE_FAVICON_URL || '').trim();
      if (v) return v;
    }
  } catch (_) {}
  return getEnvLogoUrl();
}

export function resolveSiteLogoUrl(settings?: any): string {
  const sLogo = getField(settings, 'logo_url').trim();
  const sFav = getField(settings, 'favicon_url').trim();
  return sLogo || sFav || getEnvLogoUrl() || '';
}

export function resolveSiteFaviconUrl(settings?: any): string {
  const sFav = getField(settings, 'favicon_url').trim();
  const sLogo = getField(settings, 'logo_url').trim();
  return sFav || sLogo || getEnvFaviconUrl() || '';
}

export function getSizedLogoUrl(
  rawUrl?: string,
  size = 512,
  format: 'png' | 'webp' | 'auto' = 'png',
  cropMode: 'c_fill' | 'c_fit' | 'c_pad' = 'c_fill'
): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/upload/')) {
    const cleanUrl = trimmed.replace(/\/upload\/(?:(?:[a-z]{1,3}_[a-zA-Z0-9_.:-]+,?)+\/)*/, '/upload/');
    const fmt = format === 'auto' ? 'f_auto' : `f_${format}`;
    return cleanUrl.replace('/upload/', `/upload/${fmt},q_auto,w_${size},h_${size},${cropMode}/`);
  }
  if (trimmed.includes('images.unsplash.com')) {
    const fmt = format === 'png' ? 'png' : 'webp';
    return `${trimmed}${trimmed.includes('?') ? '&' : '?'}fm=${fmt}&q=85&w=${size}&h=${size}&fit=crop`;
  }
  return trimmed;
}

export interface SiteIconSet {
  masterLogo: string;
  masterFavicon: string;
  headerLogo: string;
  searchLogo512: string;
  pwa512: string;
  pwa192: string;
  android512: string;
  android192: string;
  appleTouch180: string;
  favicon144: string;
  favicon96: string;
  favicon48: string;
  favicon32: string;
  favicon16: string;
  faviconIco: string;
  ogBanner1200: string;
}

export function getAllSiteIconUrls(settings?: any, origin = getDefaultOrigin()): SiteIconSet {
  const rawLogo = resolveSiteLogoUrl(settings);
  const rawFavicon = resolveSiteFaviconUrl(settings);

  const absLogo = rawLogo ? ensureAbsoluteUrl(rawLogo, origin) : '';
  const absFavicon = rawFavicon ? ensureAbsoluteUrl(rawFavicon, origin) : absLogo;

  const pwa512Url = absFavicon ? getSizedLogoUrl(absFavicon, 512, 'png', 'c_fill') : '/android-chrome-512x512.png';
  const pwa192Url = absFavicon ? getSizedLogoUrl(absFavicon, 192, 'png', 'c_fill') : '/android-chrome-192x192.png';

  return {
    masterLogo: absLogo,
    masterFavicon: absFavicon,
    headerLogo: absLogo ? getOptimizedImageUrl(absLogo, 120) : '',
    searchLogo512: absFavicon ? getSizedLogoUrl(absFavicon, 512, 'png', 'c_fill') : '/logo.png',
    pwa512: pwa512Url,
    pwa192: pwa192Url,
    android512: pwa512Url,
    android192: pwa192Url,
    appleTouch180: absFavicon ? getSizedLogoUrl(absFavicon, 180, 'png', 'c_fill') : '/apple-touch-icon.png',
    favicon144: absFavicon ? getSizedLogoUrl(absFavicon, 144, 'png', 'c_fill') : '/favicon.png',
    favicon96: absFavicon ? getSizedLogoUrl(absFavicon, 96, 'png', 'c_fill') : '/favicon.png',
    favicon48: absFavicon ? getSizedLogoUrl(absFavicon, 48, 'png', 'c_fill') : '/favicon.ico',
    favicon32: absFavicon ? getSizedLogoUrl(absFavicon, 32, 'png', 'c_fill') : '/favicon-32x32.png',
    favicon16: absFavicon ? getSizedLogoUrl(absFavicon, 16, 'png', 'c_fill') : '/favicon-16x16.png',
    faviconIco: absFavicon ? getSizedLogoUrl(absFavicon, 48, 'png', 'c_fill') : '/favicon.ico',
    ogBanner1200: absLogo ? getOgImageUrl(absLogo, origin) : ''
  };
}

export function ensureAbsoluteUrl(imgUrl?: string, origin = getDefaultOrigin()): string {
  if (!imgUrl) return '';
  if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://') || imgUrl.startsWith('data:')) {
    return imgUrl;
  }
  return `${origin}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
}

export function getOgImageUrl(url?: string, origin = getDefaultOrigin(), isNews = false): string {
  if (!url) return '';
  let absUrl = ensureAbsoluteUrl(url, origin);
  if (absUrl.includes('res.cloudinary.com') && absUrl.includes('/upload/')) {
    if (absUrl.includes('w_1200') && absUrl.includes('h_630') && (isNews ? !absUrl.includes('c_pad') : true)) {
      return absUrl;
    }
    const cleanUrl = absUrl.replace(/\/upload\/(?:(?:[a-z]{1,3}_[a-zA-Z0-9_.:-]+,?)+\/)*/, '/upload/');
    if (isNews) {
      return cleanUrl.replace('/upload/', '/upload/f_auto,q_auto,w_1200,h_630,c_fill/');
    }
    return cleanUrl.replace('/upload/', '/upload/f_jpg,q_auto,w_1200,h_630,c_pad,b_auto/');
  }
  if (absUrl.includes('images.unsplash.com')) {
    return `${absUrl}${absUrl.includes('?') ? '&' : '?'}fm=jpg&q=85&w=1200&h=630&fit=crop`;
  }
  return absUrl;
}

export function getOptimizedImageUrl(url?: string, width = 160): string {
  if (!url) return '';
  // Cloudinary dynamic optimization: strip only transformation parameters while preserving folder paths & version segments
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    const cleanUrl = url.replace(/\/upload\/(?:(?:[a-z]{1,3}_[a-zA-Z0-9_.:-]+,?)+\/)*/, '/upload/');
    if (width > 0) {
      return cleanUrl.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
    }
    return cleanUrl.replace('/upload/', '/upload/f_auto,q_auto/');
  }
  // Unsplash dynamic optimization
  if (url.includes('images.unsplash.com')) {
    if (!url.includes('fm=webp') && !url.includes('auto=format')) {
      return `${url}${url.includes('?') ? '&' : '?'}auto=format&fit=crop&q=80&w=${width}`;
    }
  }
  return url;
}

/**
 * Synthesizes a natural, mathematically balanced 5-star distribution
 * matching the target average rating and total ratings count.
 * Sum of distribution always equals total.
 */
export function generateNaturalStarDistribution(
  rating: number,
  total: number
): Record<string, number> {
  const t = Math.max(0, Math.round(Number(total) || 0));
  if (t <= 0) return { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  const r = Math.max(1.0, Math.min(5.0, Number(rating) || 5.0));
  if (t === 1) {
    const s = String(Math.round(r));
    return {
      '5': s === '5' ? 1 : 0,
      '4': s === '4' ? 1 : 0,
      '3': s === '3' ? 1 : 0,
      '2': s === '2' ? 1 : 0,
      '1': s === '1' ? 1 : 0
    };
  }

  // Weight according to exponential distance from target rating
  const weights = [1, 2, 3, 4, 5].map(star => {
    const dist = Math.abs(star - r);
    return Math.exp(-dist * 1.6);
  });
  const sumW = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map(w => Math.round((w / sumW) * t));

  // Adjust sum to match exactly total
  let currentSum = counts.reduce((a, b) => a + b, 0);
  let iterations = 0;
  while (currentSum !== t && iterations < 50) {
    iterations++;
    if (currentSum < t) {
      const idx = Math.round(r) - 1;
      counts[Math.max(0, Math.min(4, idx))]++;
      currentSum++;
    } else {
      let maxDist = -1;
      let targetIdx = -1;
      counts.forEach((c, idx) => {
        if (c > 0) {
          const dist = Math.abs((idx + 1) - r);
          if (dist > maxDist) {
            maxDist = dist;
            targetIdx = idx;
          }
        }
      });
      if (targetIdx >= 0) {
        counts[targetIdx]--;
        currentSum--;
      } else {
        break;
      }
    }
  }

  return {
    '5': counts[4],
    '4': counts[3],
    '3': counts[2],
    '2': counts[1],
    '1': counts[0]
  };
}

export function cleanFaqQuestion(q?: string): string {
  if (!q || typeof q !== 'string') return '';
  return q
    .trim()
    .replace(/^(?:Q\s*[:.-]?\s*|\d+\s*[:.)-]\s*|Q\d+\s*[:.)-]?\s*)+/i, '')
    .trim();
}

export function normalizeIsoDate(rawDate?: any, fallback = '2026-09-01T00:00:00+05:30'): string {
  if (!rawDate) return fallback;
  const str = String(rawDate).trim();
  if (!str) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return `${str}T00:00:00+05:30`;
  }
  const parsed = Date.parse(str);
  if (!isNaN(parsed) && parsed > 0) {
    return new Date(parsed).toISOString();
  }
  return fallback;
}
