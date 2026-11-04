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

export function normalizeNonWwwDomain(domain: string): string {
  if (!domain) return '';
  let d = domain.trim().replace(/^["']+|["']+$/g, '').replace(/\/+$/, '');
  if (!d) return '';
  const hasHttp = /^https?:\/\//i.test(d);
  if (!hasHttp) d = `https://${d}`;
  try {
    const parsed = new URL(d);
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^(?:www\.|admin\.|masterworld\.)+/i, '');
    const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    const protocol = isLocal ? parsed.protocol : 'https:';
    return `${protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
  } catch {
    return d
      .replace(/^http:\/\/(?!localhost|127\.0\.0\.1)/i, 'https://')
      .replace(/^(https?:\/\/)?(?:www\.|admin\.|masterworld\.)+/i, '$1');
  }
}

export function getConfiguredPrimaryDomain(): string {
  try {
    if (typeof __APP_BUILD_ENV__ !== 'undefined' && __APP_BUILD_ENV__) {
      const d = (__APP_BUILD_ENV__.PUBLIC_DOMAIN || __APP_BUILD_ENV__.VITE_PUBLIC_DOMAIN || '').trim();
      if (d) return normalizeNonWwwDomain(d);
    }
  } catch {
    // ignore
  }
  if (typeof process !== 'undefined' && process.env) {
    const d = (
      process.env.PUBLIC_DOMAIN ||
      process.env.VITE_PUBLIC_DOMAIN ||
      process.env.SITE_DOMAIN ||
      process.env.DOMAIN ||
      ''
    ).trim();
    if (d) return normalizeNonWwwDomain(d);
  }
  try {
    const metaEnv = import.meta.env as Record<string, any> | undefined;
    if (metaEnv) {
      const d = String(metaEnv.VITE_PUBLIC_DOMAIN || metaEnv.PUBLIC_DOMAIN || '').trim();
      if (d) return normalizeNonWwwDomain(d);
    }
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeNonWwwDomain(window.location.origin);
  }
  return '';
}

export function getCleanCanonicalUrl(rawUrl?: string, fallbackPath: string = '/', overrideDomain?: string): string {
  const primaryDomain = (overrideDomain ? normalizeNonWwwDomain(overrideDomain) : '') || getConfiguredPrimaryDomain();
  let input = (rawUrl || '').trim();

  if (!input) {
    const cleanPath = fallbackPath.split('?')[0].split('#')[0];
    const formattedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    input = primaryDomain ? `${primaryDomain}${formattedPath}` : formattedPath;
  }

  if (!primaryDomain) {
    let clean = input.split('?')[0].split('#')[0];
    clean = clean
      .replace(/^http:\/\/(?!localhost|127\.0\.0\.1)/i, 'https://')
      .replace(/^(https?:\/\/)(?:www\.|admin\.|masterworld\.)+/i, '$1');
    if (clean.length > 1 && clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    return clean;
  }

  try {
    const parsed = new URL(input, primaryDomain);
    const targetDomain = new URL(primaryDomain);

    parsed.hostname = targetDomain.hostname.toLowerCase().replace(/^(?:www\.|admin\.|masterworld\.)+/i, '');
    const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    parsed.protocol = isLocal ? targetDomain.protocol : 'https:';

    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    return `${parsed.origin}${pathname}`;
  } catch {
    let clean = input.split('?')[0].split('#')[0];
    clean = clean
      .replace(/^http:\/\/(?!localhost|127\.0\.0\.1)/i, 'https://')
      .replace(/^https?:\/\/[^\/]+/i, primaryDomain)
      .replace(/^(https?:\/\/)(?:www\.|admin\.|masterworld\.)+/i, '$1');
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

export function isPublicReadyApp(app: any): boolean {
  if (!app || typeof app !== 'object') return false;
  if (app.sync_to_public === false || app.sync_to_public === 'false' || app.sync_to_public === 0 || app.sync_to_public === '0') return false;
  if (app.is_published === false || app.is_published === 'false') return false;
  if (app.is_draft === true || app.is_draft === 'true') return false;
  if (app.is_hidden === true || app.is_hidden === 'true') return false;
  if (typeof app.status === 'string') {
    const st = app.status.trim().toLowerCase();
    if (st === 'draft' || st === 'unpublished' || st === 'hidden' || st === 'archived') return false;
  }
  return true;
}

export function isPublicReadyNews(newsItem: any): boolean {
  if (!newsItem || typeof newsItem !== 'object') return false;
  if (newsItem.sync_to_public === false || newsItem.sync_to_public === 'false' || newsItem.sync_to_public === 0 || newsItem.sync_to_public === '0') return false;
  if (newsItem.is_published === false || newsItem.is_published === 'false') return false;
  if (newsItem.is_draft === true || newsItem.is_draft === 'true') return false;
  if (typeof newsItem.status === 'string') {
    const st = newsItem.status.trim().toLowerCase();
    if (st === 'draft' || st === 'unpublished' || st === 'hidden' || st === 'archived') return false;
  }
  return true;
}

export function isValidPublicProductionDomain(rawHost: string): boolean {
  if (!rawHost || typeof rawHost !== 'string') return false;
  try {
    const normalized = normalizeNonWwwDomain(rawHost);
    if (!normalized) return false;
    const u = new URL(normalized);
    const h = u.hostname.toLowerCase();
    if (
      !h ||
      !h.includes('.') ||
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h === 'example.com' ||
      h.endsWith('.pages.dev') ||
      h.endsWith('.workers.dev') ||
      h.endsWith('.run.app') ||
      h.endsWith('.vercel.app') ||
      h.endsWith('.netlify.app') ||
      h.endsWith('.local') ||
      h.startsWith('admin.') ||
      h.startsWith('masterworld.')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function resolvePublicSiteDomain(settings?: any, apps?: any[], news?: any[]): string {
  const candidates: string[] = [
    settings?.site_domain,
    settings?.domain,
    settings?.public_domain,
    settings?.canonical_domain,
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  try {
    if (typeof __APP_BUILD_ENV__ !== 'undefined' && __APP_BUILD_ENV__) {
      if (__APP_BUILD_ENV__.PUBLIC_DOMAIN) candidates.push(__APP_BUILD_ENV__.PUBLIC_DOMAIN);
      if (__APP_BUILD_ENV__.VITE_PUBLIC_DOMAIN) candidates.push(__APP_BUILD_ENV__.VITE_PUBLIC_DOMAIN);
    }
  } catch {}

  if (typeof process !== 'undefined' && process.env) {
    if (process.env.PUBLIC_DOMAIN) candidates.push(process.env.PUBLIC_DOMAIN);
    if (process.env.VITE_PUBLIC_DOMAIN) candidates.push(process.env.VITE_PUBLIC_DOMAIN);
    if (process.env.SITE_DOMAIN) candidates.push(process.env.SITE_DOMAIN);
    if (process.env.DOMAIN) candidates.push(process.env.DOMAIN);
  }

  try {
    const metaEnv = import.meta.env as Record<string, any> | undefined;
    if (metaEnv) {
      if (metaEnv.VITE_PUBLIC_DOMAIN) candidates.push(String(metaEnv.VITE_PUBLIC_DOMAIN));
      if (metaEnv.PUBLIC_DOMAIN) candidates.push(String(metaEnv.PUBLIC_DOMAIN));
    }
  } catch {}

  if (Array.isArray(apps)) {
    for (const a of apps) {
      if (a && typeof a.canonical_url === 'string' && a.canonical_url.startsWith('http')) {
        try {
          const u = new URL(a.canonical_url.trim());
          candidates.push(u.origin);
          break;
        } catch {}
      }
    }
  }

  if (Array.isArray(news)) {
    for (const n of news) {
      if (n && typeof n.canonical_url === 'string' && n.canonical_url.startsWith('http')) {
        try {
          const u = new URL(n.canonical_url.trim());
          candidates.push(u.origin);
          break;
        } catch {}
      }
    }
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    candidates.push(window.location.origin);
  }

  for (const c of candidates) {
    if (isValidPublicProductionDomain(c)) {
      return normalizeNonWwwDomain(c);
    }
  }

  return 'https://yonoappdex.com';
}


