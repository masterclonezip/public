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
    const raw = (process.env.PUBLIC_DOMAIN || process.env.VITE_PUBLIC_DOMAIN || '').trim().replace(/^["']+|["']+$/g, '').replace(/\/+$/, '');
    if (!raw) return '';
    const hasHttp = /^https?:\/\//i.test(raw);
    const withHttp = hasHttp ? raw : `https://${raw}`;
    try {
      const parsed = new URL(withHttp);
      parsed.hostname = parsed.hostname.toLowerCase().replace(/^(?:www\.|admin\.|masterworld\.)+/i, '');
      const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      const protocol = isLocal ? parsed.protocol : 'https:';
      return `${protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
    } catch {
      return raw.replace(/^http:\/\/(?!localhost|127\.0\.0\.1)/i, 'https://').replace(/^(https?:\/\/)?(?:www\.|admin\.|masterworld\.)+/i, '$1');
    }
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
  cropMode: 'c_fill' | 'c_fit' | 'c_pad' = 'c_pad'
): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/upload/')) {
    const cleanUrl = trimmed.replace(/\/upload\/(?:(?:[a-z]{1,3}_[a-zA-Z0-9_.:-]+,?)+\/)*/, '/upload/');
    const fmt = format === 'auto' ? 'f_auto' : `f_${format}`;
    if (size <= 0) {
      return cleanUrl.replace('/upload/', `/upload/${fmt},q_auto:best/`);
    }
    const modeTransform = cropMode === 'c_pad' ? 'c_pad,b_transparent' : cropMode;
    return cleanUrl.replace('/upload/', `/upload/${fmt},q_auto:best,w_${size},h_${size},${modeTransform}/`);
  }
  if (trimmed.includes('images.unsplash.com')) {
    const fmt = format === 'png' ? 'png' : 'webp';
    if (size <= 0) {
      return `${trimmed}${trimmed.includes('?') ? '&' : '?'}fm=${fmt}&q=92`;
    }
    return `${trimmed}${trimmed.includes('?') ? '&' : '?'}fm=${fmt}&q=92&w=${size}&h=${size}&fit=max`;
  }
  return trimmed;
}

/**
 * Wraps one or more PNG buffers (e.g. 48x48, 32x32, 16x16) into a spec-compliant
 * Microsoft .ICO container binary (00 00 01 00 header + 16-byte ICONDIRENTRY per image).
 */
export function wrapPngsInIco(entries: Array<{ size: number; png: Uint8Array }>): Uint8Array {
  const valid = entries.filter(e => e && e.png && e.png.byteLength > 64);
  if (valid.length === 0) return new Uint8Array(0);

  const count = valid.length;
  const headerSize = 6 + count * 16;
  const totalPayload = valid.reduce((acc, e) => acc + e.png.byteLength, 0);
  const ico = new Uint8Array(headerSize + totalPayload);
  const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);

  // ICONDIR (6 bytes): Reserved=0, Type=1 (ICO), Count=count
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, count, true);

  let currentOffset = headerSize;
  for (let i = 0; i < count; i++) {
    const { size, png } = valid[i];
    const entryPos = 6 + i * 16;
    const dim = size >= 256 || size <= 0 ? 0 : size;
    ico[entryPos] = dim; // Width
    ico[entryPos + 1] = dim; // Height
    ico[entryPos + 2] = 0; // ColorCount (0 for >=8bpp)
    ico[entryPos + 3] = 0; // Reserved
    view.setUint16(entryPos + 4, 1, true); // Color planes = 1
    view.setUint16(entryPos + 6, 32, true); // Bits per pixel = 32
    view.setUint32(entryPos + 8, png.byteLength, true); // BytesInRes
    view.setUint32(entryPos + 12, currentOffset, true); // ImageOffset

    ico.set(png, currentOffset);
    currentOffset += png.byteLength;
  }

  return ico;
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

  const pwa512Url = absFavicon ? getSizedLogoUrl(absFavicon, 512, 'png', 'c_pad') : ensureAbsoluteUrl('/android-chrome-512x512.png', origin);
  const pwa192Url = absFavicon ? getSizedLogoUrl(absFavicon, 192, 'png', 'c_pad') : ensureAbsoluteUrl('/android-chrome-192x192.png', origin);

  return {
    masterLogo: absLogo ? getSizedLogoUrl(absLogo, 0, 'auto', 'c_fit') : '',
    masterFavicon: absFavicon ? getSizedLogoUrl(absFavicon, 0, 'png', 'c_pad') : '',
    headerLogo: absLogo ? getSizedLogoUrl(absLogo, 240, 'auto', 'c_fit') : '',
    searchLogo512: absFavicon ? getSizedLogoUrl(absFavicon, 512, 'png', 'c_pad') : ensureAbsoluteUrl('/logo.png', origin),
    pwa512: pwa512Url,
    pwa192: pwa192Url,
    android512: pwa512Url,
    android192: pwa192Url,
    appleTouch180: absFavicon ? getSizedLogoUrl(absFavicon, 180, 'png', 'c_pad') : ensureAbsoluteUrl('/apple-touch-icon.png', origin),
    favicon144: absFavicon ? getSizedLogoUrl(absFavicon, 144, 'png', 'c_pad') : ensureAbsoluteUrl('/favicon-144x144.png', origin),
    favicon96: absFavicon ? getSizedLogoUrl(absFavicon, 96, 'png', 'c_pad') : ensureAbsoluteUrl('/favicon-96x96.png', origin),
    favicon48: absFavicon ? getSizedLogoUrl(absFavicon, 48, 'png', 'c_pad') : ensureAbsoluteUrl('/favicon-48x48.png', origin),
    favicon32: absFavicon ? getSizedLogoUrl(absFavicon, 32, 'png', 'c_pad') : ensureAbsoluteUrl('/favicon-32x32.png', origin),
    favicon16: absFavicon ? getSizedLogoUrl(absFavicon, 16, 'png', 'c_pad') : ensureAbsoluteUrl('/favicon-16x16.png', origin),
    faviconIco: ensureAbsoluteUrl('/favicon.ico', origin),
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
    // Strip existing transformations cleanly
    let cleanUrl = absUrl.replace(/\/upload\/(?:(?:[a-z]{1,3}_[a-zA-Z0-9_.:-]+,?)+\/)*/, '/upload/');
    // Social crawlers (WhatsApp, Facebook, Twitter, iMessage) strictly require .jpg or .png extension in URL
    if (/\.(webp|png|jpeg|gif|avif)$/i.test(cleanUrl)) {
      cleanUrl = cleanUrl.replace(/\.(webp|png|jpeg|gif|avif)$/i, '.jpg');
    } else if (!cleanUrl.toLowerCase().endsWith('.jpg')) {
      cleanUrl = `${cleanUrl}.jpg`;
    }
    if (isNews) {
      return cleanUrl.replace('/upload/', '/upload/w_1200,h_630,c_fill,f_jpg,q_auto:good/');
    }
    return cleanUrl.replace('/upload/', '/upload/w_1200,h_630,c_pad,b_auto,f_jpg,q_auto:good/');
  }
  if (absUrl.includes('images.unsplash.com')) {
    return `${absUrl}${absUrl.includes('?') ? '&' : '?'}fm=jpg&q=85&w=1200&h=630&fit=crop`;
  }
  return absUrl;
}

export function getOgSquareImageUrl(url?: string, origin = getDefaultOrigin()): string {
  if (!url) return '';
  let absUrl = ensureAbsoluteUrl(url, origin);
  if (absUrl.includes('res.cloudinary.com') && absUrl.includes('/upload/')) {
    let cleanUrl = absUrl.replace(/\/upload\/(?:(?:[a-z]{1,3}_[a-zA-Z0-9_.:-]+,?)+\/)*/, '/upload/');
    if (/\.(webp|png|jpeg|gif|avif)$/i.test(cleanUrl)) {
      cleanUrl = cleanUrl.replace(/\.(webp|png|jpeg|gif|avif)$/i, '.jpg');
    } else if (!cleanUrl.toLowerCase().endsWith('.jpg')) {
      cleanUrl = `${cleanUrl}.jpg`;
    }
    return cleanUrl.replace('/upload/', '/upload/w_600,h_600,c_pad,b_auto,f_jpg,q_auto:good/');
  }
  if (absUrl.includes('images.unsplash.com')) {
    return `${absUrl}${absUrl.includes('?') ? '&' : '?'}fm=jpg&q=85&w=600&h=600&fit=crop`;
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
