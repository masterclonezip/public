import { getOgImageUrl } from '../seo/utils';

export { getOgImageUrl };

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getBrandCandidates(dynamicBrand?: string): string[] {
  const candidates = new Set<string>();

  if (dynamicBrand && typeof dynamicBrand === 'string' && dynamicBrand.trim()) {
    candidates.add(dynamicBrand.trim());
  }

  try {
    if (typeof window !== 'undefined' && (window as any).__INITIAL_DATA__?.settings?.site_title) {
      const st = String((window as any).__INITIAL_DATA__.settings.site_title).trim();
      if (st) candidates.add(st);
    }
  } catch {}

  try {
    if (typeof process !== 'undefined' && process.env?.VITE_SITE_NAME) {
      const envSite = String(process.env.VITE_SITE_NAME).trim();
      if (envSite) candidates.add(envSite);
    }
  } catch {}

  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SITE_NAME) {
      const metaSite = String((import.meta as any).env.VITE_SITE_NAME).trim();
      if (metaSite) candidates.add(metaSite);
    }
  } catch {}

  return Array.from(candidates).filter(b => b.length >= 2);
}

export function stripBrandSuffix(rawTitle: string, dynamicBrand?: string): string {
  if (!rawTitle) return '';
  let result = rawTitle.trim();
  const brands = getBrandCandidates(dynamicBrand);

  let changed = true;
  while (changed) {
    changed = false;
    for (const brand of brands) {
      const escaped = escapeRegex(brand);
      const suffixPattern = new RegExp(`(?:\\s*[\\-|–—•:]\\s*${escaped})+$`, 'i');
      if (suffixPattern.test(result)) {
        const stripped = result.replace(suffixPattern, '').trim();
        if (stripped.length > 0) {
          result = stripped;
          changed = true;
        }
      }
    }
  }

  return result;
}

export function formatPageTitle(rawTitle?: string, fallbackTitle: string = '', dynamicBrand?: string): string {
  if (!rawTitle || !rawTitle.trim()) return fallbackTitle;
  // If title contains multiple lines or linebreaks, take only the primary first line
  const firstLine = rawTitle.split(/\r?\n/)[0] || rawTitle;
  let clean = firstLine.trim().replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

  // Strip any automatically appended trailing brand suffix (e.g. "| Brand", "- Brand")
  clean = stripBrandSuffix(clean, dynamicBrand);

  // Clean any leading or trailing stray separator punctuation without removing Admin-authored words
  clean = clean.replace(/^[:\s\-|–—•]+/, '').replace(/[:\s\-|–—•]+$/, '').trim();

  return clean || fallbackTitle;
}

const SETTINGS_META_TITLE_KEYS = [
  'seo_title',
  'meta_title',
  'disclaimer_meta_title',
  'ethics_meta_title',
  'about_meta_title',
  'contact_meta_title',
  'privacy_meta_title',
  'terms_meta_title',
  'responsibility_meta_title',
  'report_removal_meta_title',
  'notice_meta_title',
  'developers_meta_title',
  'news_meta_title',
  'videos_meta_title',
  'faq_meta_title',
  'safety_meta_title',
  'new_apps_meta_title',
  'categories_meta_title'
];

export function cleanSettingsMetaTitles<T extends Record<string, any>>(settings: T): T {
  if (!settings || typeof settings !== 'object') return settings;
  const copy: any = { ...settings };
  const brand = typeof copy.site_title === 'string' ? copy.site_title.trim() : '';
  for (const key of SETTINGS_META_TITLE_KEYS) {
    if (typeof copy[key] === 'string' && copy[key].trim()) {
      copy[key] = formatPageTitle(copy[key], '', brand);
    }
  }
  return copy as T;
}

declare const __APP_BUILD_ENV__: Record<string, string> | undefined;

function getConfiguredPrimaryDomain(): string {
  try {
    if (typeof __APP_BUILD_ENV__ !== 'undefined' && __APP_BUILD_ENV__) {
      const d = (__APP_BUILD_ENV__.PUBLIC_DOMAIN || __APP_BUILD_ENV__.VITE_PUBLIC_DOMAIN || '').trim().replace(/\/+$/, '');
      if (d) return d.startsWith('http') ? d : `https://${d}`;
    }
  } catch {
    // ignore
  }
  if (typeof process !== 'undefined' && process.env) {
    const d = (process.env.PUBLIC_DOMAIN || process.env.VITE_PUBLIC_DOMAIN || '').trim().replace(/\/+$/, '');
    if (d) return d.startsWith('http') ? d : `https://${d}`;
  }
  try {
    const metaEnv = import.meta.env as Record<string, any> | undefined;
    if (metaEnv) {
      const d = String(metaEnv.VITE_PUBLIC_DOMAIN || metaEnv.PUBLIC_DOMAIN || '').trim().replace(/\/+$/, '');
      if (d) return d.startsWith('http') ? d : `https://${d}`;
    }
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

export function getCleanCanonicalUrl(rawUrl?: string, fallbackPath: string = '/'): string {
  const primaryDomain = getConfiguredPrimaryDomain();
  let input = (rawUrl || '').trim();

  if (!input) {
    const cleanPath = fallbackPath.split('?')[0].split('#')[0];
    const formattedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    input = primaryDomain ? `${primaryDomain}${formattedPath}` : formattedPath;
  }

  if (!primaryDomain) {
    return input.split('?')[0].split('#')[0];
  }

  try {
    const parsed = new URL(input, primaryDomain);
    const targetDomain = new URL(primaryDomain);

    parsed.hostname = targetDomain.hostname;
    parsed.protocol = targetDomain.protocol;

    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    return `${parsed.origin}${pathname}`;
  } catch {
    let clean = input.split('?')[0].split('#')[0];
    clean = clean
      .replace(/^http:\/\//i, 'https://')
      .replace(/^https:\/\/[^\/]+/i, primaryDomain);
    if (clean.length > 1 && clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    return clean || primaryDomain;
  }
}

export function cleanFaqQuestion(q?: string): string {
  if (!q || typeof q !== 'string') return '';
  return q
    .trim()
    .replace(/^(?:Q\s*[:.-]?\s*|\d+\s*[:.)-]\s*|Q\d+\s*[:.)-]?\s*)+/i, '')
    .trim();
}

