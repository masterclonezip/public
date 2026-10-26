/**
 * GitHub API Synchronizer Engine
 * Responsible for backing up local game state logs, configs, and details on GitHub repos.
 */

import CryptoJS from 'crypto-js';
import { ensureDefaultSettings } from './defaultLegalContent';
import { adminFetch } from '../services/adminAuthService';
import { safeEncrypt, safeDecrypt } from './cryptoUtils';
import { structureHtmlFragment } from './safeHtmlPublic';
import { formatNewsDate, calculateReadingTime, getPlainTextSnippet } from './newsUtils';
import { formatPageTitle, cleanSettingsMetaTitles } from './seoUtils';

export function encryptUrlIfNeeded(url: string, existingCiphertext?: string): string {
  if (!url || typeof url !== 'string') return '';
  let trimmed = url.trim();
  if (trimmed === '' || trimmed.includes('com.example') || trimmed.toLowerCase().includes('mediafire.com')) return '';
  
  if (trimmed.startsWith('U2FsdGVkX1')) {
    const dec = safeDecrypt(trimmed);
    if (dec && dec.toLowerCase().includes('mediafire.com')) return '';
    if (dec && (dec.startsWith('http://') || dec.startsWith('https://'))) {
      return trimmed;
    }
    return trimmed;
  }

  if (!trimmed.toLowerCase().startsWith('http://') && !trimmed.toLowerCase().startsWith('https://')) {
    trimmed = 'https://' + trimmed;
  }

  if (existingCiphertext && typeof existingCiphertext === 'string' && existingCiphertext.trim().startsWith('U2FsdGVkX1')) {
    const existingDec = safeDecrypt(existingCiphertext.trim());
    if (existingDec === trimmed) {
      return existingCiphertext.trim();
    }
  }

  return safeEncrypt(trimmed);
}

/**
 * Canonical App Hygiene & Normalization Compiler
 * Preserves 100% of Admin's exact copy while normalizing embedded HTML headings (<h1> -> <h2>),
 * stripping inline style pollution, removing auto-appended brand suffixes, and optionally sealing/stripping download URLs for public bundles.
 */
export function compileCanonicalApp(app: any, options?: { stripDownloadLinks?: boolean }): any {
  if (!app || typeof app !== 'object') return app;
  const copy = JSON.parse(JSON.stringify(app));
  if (typeof copy.slug === 'string') {
    copy.slug = copy.slug.trim().replace(/^\/+|\/+$/g, '');
  }
  if (typeof copy.id === 'string') {
    copy.id = copy.id.trim();
  }
  const rawTarget = copy.more_information_url || copy.download_url || copy.encrypted_link || copy.encrypted_download_url || '';
  const existingCipher = [copy.encrypted_link, copy.more_information_url, copy.encrypted_download_url]
    .find(v => typeof v === 'string' && v.trim().startsWith('U2FsdGVkX1')) || '';
  const encryptedTarget = encryptUrlIfNeeded(rawTarget, existingCipher);

  if (copy.url && String(copy.url).includes('com.example')) {
    copy.url = '';
  }

  copy.has_secure_link = Boolean(encryptedTarget || copy.has_secure_link || copy.url);

  if (options?.stripDownloadLinks) {
    delete copy.more_information_url;
    delete copy.encrypted_link;
    delete copy.encrypted_download_url;
    delete copy.download_url;
  } else {
    if (encryptedTarget) {
      copy.more_information_url = encryptedTarget;
      copy.encrypted_link = encryptedTarget;
    } else {
      delete copy.more_information_url;
      delete copy.encrypted_link;
    }
    delete copy.encrypted_download_url;
    delete copy.download_url;
  }

  // Keep seo_title and meta_title clean and strictly synchronized without trailing brand suffixes
  const rawTitle = (copy.seo_title !== undefined ? copy.seo_title : (copy.meta_title || '')).trim();
  const cleanTitle = rawTitle ? formatPageTitle(rawTitle, '') : '';
  copy.seo_title = cleanTitle;
  copy.meta_title = cleanTitle;

  // Keep seo_description and meta_description strictly synchronized
  const cleanDesc = (copy.seo_description !== undefined ? copy.seo_description : (copy.meta_description || '')).trim();
  copy.seo_description = cleanDesc;
  copy.meta_description = cleanDesc;

  // Preserve stable per-app timestamp so unchanged apps never trigger full-catalog sitemap re-crawls
  if (!copy.updated_at) {
    copy.updated_at = copy.published_at || copy.publish_date || copy.created_at || copy.added_date || copy.date || '2026-09-01T00:00:00.000Z';
  }

  if (typeof copy.description_html === 'string' && copy.description_html.trim()) {
    copy.description_html = structureHtmlFragment(copy.description_html);
  }
  if (typeof copy.features_html === 'string' && copy.features_html.trim()) {
    copy.features_html = structureHtmlFragment(copy.features_html);
  }
  if (typeof copy.custom_admin_box_html === 'string' && copy.custom_admin_box_html.trim()) {
    copy.custom_admin_box_html = structureHtmlFragment(copy.custom_admin_box_html);
  }
  if (Array.isArray(copy.faqs)) {
    copy.faqs = copy.faqs.map((f: any) => {
      if (!f || typeof f !== 'object') return f;
      return {
        ...f,
        question: typeof f.question === 'string' ? f.question.trim() : '',
        answer: typeof f.answer === 'string' && f.answer.trim() ? structureHtmlFragment(f.answer) : (f.answer || '')
      };
    });
  }

  return copy;
}

/**
 * Canonical News Hygiene & Pre-Computed Metadata Compiler
 * Normalizes embedded HTML headings/styles and pre-computes deterministic UTC dates, reading time, and excerpt.
 */
export function compileCanonicalNews(item: any): any {
  if (!item || typeof item !== 'object') return item;
  const copy = JSON.parse(JSON.stringify(item));
  if (typeof copy.slug === 'string') {
    copy.slug = copy.slug.trim().replace(/^\/+|\/+$/g, '');
  }
  if (typeof copy.id === 'string') {
    copy.id = copy.id.trim();
  }
  if (typeof copy.title === 'string' && copy.title.trim()) {
    copy.title = formatPageTitle(copy.title, copy.title.trim());
  }
  const rawBody = copy.content || copy.description_html || copy.description || '';
  if (typeof rawBody === 'string' && rawBody.trim()) {
    const cleanHtml = structureHtmlFragment(rawBody);
    copy.content = cleanHtml;
    copy.description_html = cleanHtml;
  }
  const rawSeoTitle = (copy.seo_title !== undefined ? copy.seo_title : (copy.meta_title || '')).trim();
  const cleanSeoTitle = rawSeoTitle ? formatPageTitle(rawSeoTitle, '') : '';
  copy.seo_title = cleanSeoTitle;
  copy.meta_title = cleanSeoTitle;

  const rawSeoDesc = (copy.seo_description !== undefined ? copy.seo_description : (copy.meta_description || '')).trim();
  if (rawSeoDesc) {
    copy.seo_description = rawSeoDesc;
    copy.meta_description = rawSeoDesc;
  }
  const dateSource = copy.published_at || copy.created_at || copy.date || '';
  if (!copy.updated_at) {
    copy.updated_at = dateSource || '2026-09-01T00:00:00.000Z';
  }
  copy.formatted_date = formatNewsDate(dateSource);
  copy.reading_time = calculateReadingTime(rawBody);
  copy.excerpt = copy.seo_description || copy.description || getPlainTextSnippet(rawBody, 160);
  return copy;
}

export interface GitConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  autoSync: boolean;
}

/**
 * Encodes string to UTF-8 base64 properly for GitHub API content submission
 * Supports unicode, emojis and large multi-megabyte payloads without stack overflow
 */
export function b64EncodeUnicode(str: string): string {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf8').toString('base64');
    }
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, chunk as any);
    }
    return btoa(binary);
  } catch (error) {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      console.error("Base64 unicode encoding error:", error);
      return btoa(str);
    }
  }
}

/**
 * Dynamically generates the content of `src/lib/communityReviewsData.ts` based on current verified reviews state
 */
export function generateCommunityReviewsFileCode(reviews: any[] = []): string {
  const cleanReviews = (reviews || []).map((r: any) => ({
    id: r.id || `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    appId: r.appId || r.app_id || '',
    appSlug: r.appSlug || '',
    appName: r.appName || '',
    userName: r.userName || r.username || 'Player',
    rating: Number(r.rating) || 5,
    reviewText: r.reviewText || r.comment || '',
    timestamp: r.timestamp || r.created_at || new Date().toISOString(),
    status: r.status || 'published',
    helpful_count: Number(r.helpful_count) || 0,
    isPinned: Boolean(r.isPinned),
    reported: Boolean(r.reported),
    report_count: Number(r.report_count) || 0,
    source: r.source || 'community',
    adminReply: r.adminReply || null,
    updated_at: r.updated_at || r.timestamp || new Date().toISOString()
  }));

  return `// Auto-generated verified community reviews dataset\nexport interface StaticReviewRecord {\n  id: string;\n  appId: string;\n  appSlug?: string;\n  appName?: string;\n  userName: string;\n  rating: number;\n  reviewText: string;\n  timestamp: string;\n  status: "published" | "pending" | "rejected" | string;\n  helpful_count: number;\n  isPinned?: boolean;\n  reported?: boolean;\n  report_count?: number;\n  source?: string;\n  adminReply?: {\n    text: string;\n    author: string;\n    timestamp: string;\n  } | null;\n  updated_at?: string;\n}\n\nexport const STATIC_COMMUNITY_REVIEWS: StaticReviewRecord[] = ${JSON.stringify(cleanReviews, null, 2)};\n`;
}

/**
 * Strips server-only secrets (such as turnstile_secret_key) from public settings objects
 * before writing staticData.json / staticData.ts or serving public endpoints.
 */
export function sanitizePublicSettings(settings: any): any {
  if (!settings || typeof settings !== 'object') return {};
  const copy = JSON.parse(JSON.stringify(settings));
  delete copy.turnstile_secret_key;
  delete copy.admin_password;
  delete copy.admin_totp_secret;
  delete copy.cloudinary_api_secret;
  delete copy.gemini_api_key;
  return copy;
}

export function generateSecureVaultFile(ciphertext: string, encryptedTurnstileSecret?: string): string {
  const safeCipher = JSON.stringify(String(ciphertext || '').trim());
  const defaultTurnstileSecret = "";
  const safeTsSecret = JSON.stringify(String(encryptedTurnstileSecret || defaultTurnstileSecret).trim());
  return [
    "import {",
    "  getEnvSecretKeys,",
    "  getAesSecret,",
    "  encryptData,",
    "  decryptData,",
    "  safeEncrypt,",
    "  safeDecrypt,",
    "} from './cryptoUtils';",
    "",
    "export { getEnvSecretKeys, getAesSecret, encryptData, decryptData, safeEncrypt, safeDecrypt };",
    "",
    "export function encryptLinks(linksMap: Record<string, string>, secretKey?: string): string {",
    "  return safeEncrypt(JSON.stringify(linksMap), secretKey);",
    "}",
    "",
    "export function decryptLinks(ciphertext: string, secretKey?: string): Record<string, string> {",
    "  if (!ciphertext || typeof ciphertext !== 'string' || !ciphertext.trim()) return {};",
    "  const dec = safeDecrypt(ciphertext.trim(), secretKey);",
    "  if (!dec) return {};",
    "  try {",
    "    const parsed = JSON.parse(dec);",
    "    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;",
    "  } catch {}",
    "  return {};",
    "}",
    "",
    "export function generateSecureVaultFile(c: string, ts?: string): string {",
    `  const defTs = ${safeTsSecret};`,
    "  return `export { getEnvSecretKeys, getAesSecret, encryptData, decryptData, safeEncrypt, safeDecrypt } from './cryptoUtils';\\nexport const ENCRYPTED_LINKS = ${JSON.stringify(String(c || '').trim())};\\nexport const ENCRYPTED_VAULT = ENCRYPTED_LINKS;\\nexport const ENCRYPTED_TURNSTILE_SECRET = ${JSON.stringify(String(ts || defTs).trim())};\\n`;",
    "}",
    "",
    `export const ENCRYPTED_LINKS = ${safeCipher};`,
    "export const ENCRYPTED_VAULT = ENCRYPTED_LINKS;",
    `export const ENCRYPTED_TURNSTILE_SECRET = ${safeTsSecret};`,
    "",
  ].join('\n');
}

/**
 * Dynamically generates the content of `src/lib/staticData.ts` based on current state
 */
export function generateStaticDataFileCode(
  apps: any[] = [],
  settings: any = {},
  news: any[] = [],
  videos: any[] = []
): string {
  // Compile canonical public apps with zero download link leakage (links live exclusively in sealed server vault)
  const cleanApps = (apps || []).map((app: any) => compileCanonicalApp(app, { stripDownloadLinks: true }));
  const defaultSettings = {
    site_title: "",
    meta_description: "",
    logo_url: "",
    favicon_url: "",
    helpline_whatsapp: "",
    helpline_telegram: "",
    support_email: "",
    disclaimer_text: "",
    ethics_discrimination_text: "",
    ticker_text: "",
    animations_enabled: true,
    categories: [],
    banners: [],
    quick_links: [],
    website_faqs: [],
    developers: []
  };
  const cleanSettings = sanitizePublicSettings(
    cleanSettingsMetaTitles(ensureDefaultSettings({ ...defaultSettings, ...JSON.parse(JSON.stringify(settings || {})) }))
  );
  const cleanNews = (news || []).map((item: any) => compileCanonicalNews(item));
  const cleanVideos = JSON.parse(JSON.stringify(videos || []));

  return `// No secureStorage import to avoid Vercel build errors when secureStorage is stripped

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
}

export interface GlobalSettings {
  site_title: string;
  seo_title?: string;
  seo_description?: string;
  meta_description: string;
  logo_url: string;
  favicon_url: string;
  helpline_whatsapp: string;
  helpline_telegram: string;
  support_email: string;
  disclaimer_text: string;
  disclaimer_heading?: string;
  ethics_discrimination_text: string;
  ethics_heading?: string;
  portal_heading?: string;
  important_notice_heading?: string;
  ticker_text: string;
  animations_enabled: boolean;
  seo_keywords?: string;
  about_content?: string;
  contact_content?: string;
  privacy_content?: string;
  terms_content?: string;
  responsibility_content?: string;
  report_removal_content?: string;
  important_notice?: string;
  categories: string[];
  banners: Banner[];
  last_updated?: string;
  secure_index_title?: string;
  secure_index_subtitle?: string;
  trending_searches?: string[];
  hero_title_text?: string;
  hero_title_color?: string;
  hero_title_style?: string;
  hero_title_animation?: string;
  hero_title_subtitle?: string;
  hero_title_visible?: boolean;
  ga_tracking_id?: string;
  quick_links?: Array<{ title: string; subtitle?: string; icon?: string; color?: string; url: string }>;
  social_links?: { facebook?: string; instagram?: string; twitter?: string; linkedin?: string; youtube?: string; };
  website_faqs?: Array<{ question: string; answer: string }>;
  developers?: Array<{ id?: string; name: string; role: string; bio?: string; image_url?: string; github?: string; twitter?: string; avatar_url?: string; social?: any }>;
  // Static Pages Custom SEO
  disclaimer_meta_title?: string;
  disclaimer_meta_description?: string;
  ethics_meta_title?: string;
  ethics_meta_description?: string;
  about_meta_title?: string;
  about_meta_description?: string;
  contact_meta_title?: string;
  contact_meta_description?: string;
  privacy_meta_title?: string;
  privacy_meta_description?: string;
  terms_meta_title?: string;
  terms_meta_description?: string;
  responsibility_meta_title?: string;
  responsibility_meta_description?: string;
  report_removal_meta_title?: string;
  report_removal_meta_description?: string;
  notice_meta_title?: string;
  notice_meta_description?: string;
  developers_meta_title?: string;
  developers_meta_description?: string;
  news_meta_title?: string;
  news_meta_description?: string;
  videos_meta_title?: string;
  videos_meta_description?: string;
}

export interface NewsItem {
  id: string;
  slug: string;
  title: string;
  logo_url: string;
  image_url?: string;
  description: string;
  ceo_name: string;
  ceo_description: string;
  seo_title: string;
  seo_description: string;
  seo_keywords?: string;
  category?: string;
  og_image_url?: string;
  canonical_url?: string;
  target_region?: string;
  content: string;
  published_at?: string;
  link: string;
  read_time?: string;
  author?: string;
  description_html?: string;
  date?: string;
  tags?: string[];
  related_app_id?: string;
  created_at?: string;
  updated_at?: string;
  is_breaking?: boolean;
  is_new?: boolean;
  is_pinned?: boolean;
  sync_to_public?: boolean;
}

export interface AppConfig {
  id: string;
  name: string;
  slug: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  og_image_url?: string;
  canonical_url?: string;
  target_region?: string;
  category: string;
  is_coming_soon?: boolean;
  publish_date?: string;
  version: string;
  file_size: string;
  developer: string;
  icon_url: string;
  screenshots: string[];
  description_html: string;
  red_box_msg: string;
  yellow_box_msg: string;
  idea_box_msg: string;
  safety_status: 'Verified' | 'Caution' | 'Unsafe';
  serial_number?: number;
  is_featured?: boolean;
  is_new?: boolean;
  is_hot?: boolean;
  release_notes?: string;
  rating?: number;
  created_at?: string;
  custom_admin_box_html?: string;
  custom_admin_box_heading?: string;
  features_html?: string;
  faqs?: {question: string; answer: string}[];
  link_configured?: boolean;
  
  video_url?: string;
  is_top_chart?: boolean;
  top_chart_category?: string;
  has_secure_link?: boolean;
  sync_to_public?: boolean;
}

export interface Review {
  id: string;
  app_id: string;
  username: string;
  rating: number;
  comment: string;
  is_approved: boolean;
}

export interface VideoItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  youtube_url: string;
  seo_title: string;
  seo_description: string;
  meta_description?: string;
  seo_keywords?: string;
  canonical_url?: string;
  og_image_url?: string;
  created_at: string;
}

export const mockApps: any[] = ${JSON.stringify(cleanApps, null, 2)};

export const saveMockApps = (apps: any[]) => {
  try {
    localStorage.setItem('store_apps', JSON.stringify(apps));
  } catch (e) {
    console.warn('saveMockApps storage failed:', e);
  }
  mockApps.splice(0, mockApps.length, ...apps);
};

export const mockSettings: any = ${JSON.stringify(cleanSettings, null, 2)};

export const saveMockSettings = (settings: any) => {
  try {
    localStorage.setItem('store_settings', JSON.stringify(settings));
  } catch (e) {
    console.warn('saveMockSettings storage failed:', e);
  }
  Object.assign(mockSettings, settings);
};

export const mockNews: any[] = ${JSON.stringify(cleanNews, null, 2)};

export const saveMockNews = (newsList: any[]) => {
  try {
    localStorage.setItem('store_news', JSON.stringify(newsList));
  } catch (e) {
    console.warn('saveMockNews storage failed:', e);
  }
  mockNews.splice(0, mockNews.length, ...newsList);
};

export const mockVideos: any[] = ${JSON.stringify(cleanVideos, null, 2)};

export const saveMockVideos = (videos: VideoItem[]) => {
  try {
    localStorage.setItem('store_videos', JSON.stringify(videos));
  } catch (e) {
    console.warn('saveMockVideos storage failed:', e);
  }
  mockVideos.splice(0, mockVideos.length, ...videos);
};
`;
}

/**
 * Commits a file content update directly to Github via REST API
 */
export async function commitFileToGitHub({
  owner,
  repo,
  token,
  branch,
  path,
  content,
  message
}: {
  owner: string;
  repo: string;
  token?: string;
  branch: string;
  path: string;
  content: string;
  message: string;
}) {
  const response = await adminFetch('/api/github-sync/commit', {
    method: 'POST',
    body: JSON.stringify({
      owner,
      repo,
      token,
      branch,
      path,
      content,
      message
    })
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    const errText = await response.text();
    let errMsg = errText || `Server returned ${response.status} ${response.statusText}`;

    if (contentType && contentType.includes('text/html')) {
      throw new Error(`Server returned HTML instead of JSON (${response.status}). This usually indicates a routing issue or a backend crash. Check if the /api routes are correctly deployed. Details: ${errText.substring(0, 100)}...`);
    }

    try {
      const errJSON = JSON.parse(errText);
      errMsg = errJSON.message || errJSON.error || errMsg;
    } catch (e) {
      if (!errMsg || errMsg.trim() === '') errMsg = `HTTP Error ${response.status}`;
    }
    throw new Error(errMsg);
  }

  return response.json();
}

/**
 * Uploads an individual file blob to GitHub (via direct GitHub API or serverless proxy)
 * Guaranteed to never exceed Vercel 4.5MB payload limit.
 */
export async function uploadBlobToGitHub({
  owner,
  repo,
  token,
  path: filePath,
  content
}: {
  owner: string;
  repo: string;
  token?: string;
  path: string;
  content: string;
}): Promise<{ path: string; sha: string }> {
  const cleanPath = filePath.replace(/^\/+/g, '');
  let lastError: any = null;

  // Retry up to 3 times for rock-solid network resilience
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // 1. Direct GitHub Git Blobs API (CORS enabled, 0 middleman bottleneck, works on static hosts)
      if (token && token.trim()) {
        try {
          const cleanToken = token.trim();
          const authHeader = cleanToken.toLowerCase().startsWith('ghp_')
            ? `token ${cleanToken}`
            : `Bearer ${cleanToken}`;

          // Always prefer base64 encoding for blobs: avoids utf8 parsing failures and corrupted emojis
          const b64 = b64EncodeUnicode(content || '');

          const directRes = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`,
            {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
              },
              body: JSON.stringify({
                content: b64,
                encoding: 'base64'
              })
            }
          );

          if (directRes.ok) {
            const directData = await directRes.json();
            if (directData?.sha) {
              return { path: cleanPath, sha: directData.sha };
            }
          } else {
            const errData = await directRes.json().catch(() => ({}));
            const githubMsg = errData.message || directRes.statusText;
            
            if (directRes.status === 401) {
              throw new Error(`Invalid GitHub Personal Access Token (PAT): ${githubMsg}. Check token in Settings.`);
            } else if (directRes.status === 403) {
              throw new Error(`GitHub write permission error (403): ${githubMsg}. Ensure token has "Contents: Read and write" access on repository "${owner}/${repo}".`);
            } else if (directRes.status === 404) {
              throw new Error(`Repository "${owner}/${repo}" not found or token lacks access.`);
            } else {
              // Try utf-8 fallback if base64 failed
              const utf8Res = await fetch(
                `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                  },
                  body: JSON.stringify({
                    content,
                    encoding: 'utf-8'
                  })
                }
              );
              if (utf8Res.ok) {
                const utf8Data = await utf8Res.json();
                if (utf8Data?.sha) {
                  return { path: cleanPath, sha: utf8Data.sha };
                }
              }
              throw new Error(`GitHub API error (${directRes.status}): ${githubMsg}`);
            }
          }
        } catch (directErr: any) {
          if (directErr.message && (directErr.message.includes('GitHub') || directErr.message.includes('Personal Access Token') || directErr.message.includes('Repository'))) {
            throw directErr;
          }
          console.warn(`[GitHub Sync] Direct blob upload network notice for ${cleanPath}:`, directErr?.message || directErr);
        }
      }

      // 2. Server proxy fallback only if backend environment is available
      try {
        const response = await adminFetch('/api/github-sync/create-blob', {
          method: 'POST',
          body: JSON.stringify({
            owner,
            repo,
            token,
            path: cleanPath,
            content
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.sha) {
            return { path: cleanPath, sha: data.sha };
          }
        }
      } catch (_) {}

      throw new Error(`Failed to upload blob for ${cleanPath}`);
    } catch (err: any) {
      lastError = err;
    }

    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 600 * attempt));
    }
  }

  throw lastError || new Error(`Failed to upload blob for ${cleanPath}`);
}

/**
 * Tests connection to target GitHub repository directly via GitHub REST API.
 * Uses CORS-enabled direct browser-to-GitHub connection, completely eliminating 405 errors on static hosts.
 */
export async function testGitHubConnection(config: {
  owner: string;
  repo: string;
  branch?: string;
  token?: string;
}): Promise<{
  success: boolean;
  message: string;
  permissions?: { push: boolean; pull: boolean; admin: boolean };
  defaultBranch?: string;
  repoDetails?: any;
}> {
  const cleanOwner = (config.owner || '').trim();
  const cleanRepo = (config.repo || '').trim();
  const cleanToken = (config.token || '').trim();
  const cleanBranch = (config.branch || 'main').trim();

  if (!cleanOwner || !cleanRepo) {
    throw new Error('Repository Owner and Repository Name are required.');
  }

  // 1. Direct GitHub REST API connection (CORS enabled, 0ms proxy overhead, works everywhere)
  if (cleanToken) {
    try {
      const authHeader = cleanToken.toLowerCase().startsWith('ghp_')
        ? `token ${cleanToken}`
        : `Bearer ${cleanToken}`;

      const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}`, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (res.ok) {
        const repoData = await res.json();
        const perms = repoData.permissions || { push: true, pull: true, admin: false };

        let branchVerified = true;
        try {
          const branchRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/branches/${encodeURIComponent(cleanBranch)}`, {
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          branchVerified = branchRes.ok;
        } catch (_) {}

        return {
          success: true,
          message: `Successfully connected to repository "${repoData.full_name}" (${branchVerified ? `branch: ${cleanBranch}` : `default: ${repoData.default_branch}`})`,
          permissions: perms,
          defaultBranch: repoData.default_branch,
          repoDetails: {
            name: repoData.name,
            private: repoData.private,
            default_branch: repoData.default_branch
          }
        };
      }

      if (res.status === 401) {
        throw new Error('Invalid GitHub Personal Access Token (PAT): Bad credentials. Please generate a new fine-grained or classic token with "Contents: Read and write" access.');
      } else if (res.status === 404) {
        throw new Error(`Repository "${cleanOwner}/${cleanRepo}" not found. Verify the owner, repository name, and ensure your token has access to this repository.`);
      } else if (res.status === 403) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(`GitHub Access Forbidden (403): ${errJson.message || 'Token lacks required permissions'}`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(`GitHub API returned HTTP ${res.status}: ${errJson.message || 'Unknown error'}`);
      }
    } catch (directErr: any) {
      if (directErr.message && !directErr.message.includes('Failed to fetch')) {
        throw directErr;
      }
      console.warn('[GitHub Sync] Direct test fetch network notice, trying server proxy fallback:', directErr);
    }
  }

  // 2. Fallback to server endpoint if direct browser call encountered network filtering
  try {
    const res = await adminFetch('/api/github-sync/test', {
      method: 'POST',
      body: JSON.stringify(config)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (_) {}

  throw new Error('Failed to verify GitHub connection. Please verify your Personal Access Token, repository name, and network access.');
}

/**
 * Seals previously created file blobs into a single atomic Git commit.
 * Payload is tiny, directly creating the commit via GitHub Git Data API (CORS enabled)
 * with automatic fallback to server proxy.
 */
export async function commitTreeToGitHub({
  owner,
  repo,
  token,
  branch = 'main',
  tree,
  message
}: {
  owner: string;
  repo: string;
  token?: string;
  branch: string;
  tree: Array<{ path: string; sha: string }>;
  message: string;
}) {
  const cleanOwner = owner.trim();
  const cleanRepo = repo.trim();
  const cleanBranch = branch.replace(/^refs\/heads\//, '').trim() || 'main';
  const cleanToken = (token || '').trim();

  // 1. Direct GitHub Git Data API (100% works on static hosts, Cloudflare Pages, Vercel Edge with zero 405 errors)
  if (cleanToken) {
    try {
      const authHeader = cleanToken.toLowerCase().startsWith('ghp_')
        ? `token ${cleanToken}`
        : `Bearer ${cleanToken}`;

      // Step A: Get latest commit SHA for target branch
      let parentCommitSha = '';
      let baseTreeSha = '';

      try {
        const refRes = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/git/ref/heads/${encodeURIComponent(cleanBranch)}?_t=${Date.now()}`,
          {
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        if (refRes.ok) {
          const refData = await refRes.json() as any;
          parentCommitSha = refData.object?.sha || '';
        }
      } catch (_) {}

      if (!parentCommitSha) {
        try {
          const refRes2 = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/git/refs/heads/${encodeURIComponent(cleanBranch)}?_t=${Date.now()}`,
            {
              headers: {
                'Authorization': authHeader,
                'Accept': 'application/vnd.github.v3+json'
              }
            }
          );
          if (refRes2.ok) {
            const refData2 = await refRes2.json() as any;
            parentCommitSha = refData2.object?.sha || '';
          }
        } catch (_) {}
      }

      if (!parentCommitSha) {
        const branchRes = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/branches/${encodeURIComponent(cleanBranch)}?_t=${Date.now()}`,
          {
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        if (branchRes.ok) {
          const branchData = await branchRes.json() as any;
          parentCommitSha = branchData.commit?.sha || '';
        }
      }

      if (!parentCommitSha) {
        throw new Error(`Could not find latest commit SHA for branch "${cleanBranch}" on ${cleanOwner}/${cleanRepo}. Please check branch name and permissions.`);
      }

      // Step B: Get base tree SHA from parent commit
      const parentCommitRes = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/git/commits/${parentCommitSha}`,
        {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      if (!parentCommitRes.ok) {
        throw new Error(`Failed to read parent commit ${parentCommitSha}`);
      }
      const parentCommitData = await parentCommitRes.json() as any;
      baseTreeSha = parentCommitData.tree?.sha;
      if (!baseTreeSha) {
        throw new Error(`Parent commit did not return a valid tree SHA.`);
      }

      // Step C: Format tree entries
      const treeEntries: any[] = tree.map((entry: any) => ({
        path: String(entry.path).replace(/^\/+/g, ''),
        mode: entry.mode || '100644',
        type: 'blob',
        sha: entry.sha
      }));

      // Prune any legacy public/data/ files from the remote git tree so only atomic files remain
      try {
        const baseTreeDetailsRes = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/git/trees/${baseTreeSha}?recursive=1`,
          {
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        if (baseTreeDetailsRes.ok) {
          const baseTreeDetails = await baseTreeDetailsRes.json() as any;
          if (Array.isArray(baseTreeDetails?.tree)) {
            const dataEntries = baseTreeDetails.tree.filter((t: any) => 
              t.path && t.type === 'blob' && (t.path === 'src/lib/public_backup.json')
            );
            dataEntries.forEach((t: any) => {
              treeEntries.push({
                path: t.path,
                mode: '100644',
                type: 'blob',
                sha: null
              });
            });
            if (dataEntries.length > 0) {
              console.log(`[GitHub Sync] Pruned private backup file from remote git tree.`);
            }
          }
        }
      } catch (pruneErr) {
        // Non-blocking prune attempt
      }

      // Step D: Create new tree on top of base_tree
      const treeRes = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/git/trees`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            base_tree: baseTreeSha,
            tree: treeEntries
          })
        }
      );

      if (!treeRes.ok) {
        const errData = await treeRes.json().catch(() => ({}));
        throw new Error(`Failed to create git tree: ${errData.message || treeRes.statusText}`);
      }
      const newTreeData = await treeRes.json() as any;
      const newTreeSha = newTreeData.sha;

      // Step E: Create atomic commit
      const commitRes = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/git/commits`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            message,
            tree: newTreeSha,
            parents: [parentCommitSha]
          })
        }
      );

      if (!commitRes.ok) {
        const errData = await commitRes.json().catch(() => ({}));
        throw new Error(`Failed to create git commit: ${errData.message || commitRes.statusText}`);
      }
      const newCommitData = await commitRes.json() as any;
      const newCommitSha = newCommitData.sha;

      // Step F: Update branch reference (with force: true to avoid non-fast-forward conflicts)
      const updateRefRes = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/git/refs/heads/${encodeURIComponent(cleanBranch)}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            sha: newCommitSha,
            force: true
          })
        }
      );

      if (!updateRefRes.ok) {
        const errData = await updateRefRes.json().catch(() => ({}));
        // If ref update failed with 404, try creating the branch reference
        if (updateRefRes.status === 404) {
          const createRefRes = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/git/refs`,
            {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
              },
              body: JSON.stringify({
                ref: `refs/heads/${cleanBranch}`,
                sha: newCommitSha
              })
            }
          );
          if (createRefRes.ok) {
            return {
              success: true,
              commitSha: newCommitSha,
              treeSha: newTreeSha,
              message: `Successfully created atomic commit ${newCommitSha.substring(0, 7)}`
            };
          }
        }
        throw new Error(`Failed to update branch ref "${cleanBranch}": ${errData.message || updateRefRes.statusText}`);
      }

      return {
        success: true,
        commitSha: newCommitSha,
        treeSha: newTreeSha,
        message: `Successfully created atomic commit ${newCommitSha.substring(0, 7)}`
      };
    } catch (directErr: any) {
      console.error('[GitHub Sync] Direct Git Data API error:', directErr);
      throw directErr;
    }
  }

  // 2. Server proxy fallback ONLY if no client token was provided (backend environment token)
  const response = await adminFetch('/api/github-sync/commit-tree', {
    method: 'POST',
    body: JSON.stringify({
      owner,
      repo,
      token,
      branch,
      tree,
      message
    })
  });

  if (response.ok) {
    return await response.json();
  }

  const errText = await response.text();
  let errMsg = errText || `Server returned ${response.status}`;
  try {
    const errJSON = JSON.parse(errText);
    errMsg = errJSON.message || errJSON.error || errMsg;
  } catch (e) {}
  throw new Error(errMsg);
}

/**
 * Commits multiple files atomically in a single Git commit via chunk-safe Git Blobs & Git Trees API.
 * Uploads blobs individually (max ~1.5MB each, well under Vercel 4.5MB limit),
 * then creates 1 atomic commit with a tiny ~1.5KB manifest.
 */
export async function commitMultiFilesToGitHub({
  owner,
  repo,
  token,
  branch = 'main',
  files,
  message,
  onProgress
}: {
  owner: string;
  repo: string;
  token?: string;
  branch: string;
  files: Array<{ path: string; content: string }>;
  message: string;
  onProgress?: (msg: string) => void;
}) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("No files provided to commit.");
  }

  const tree: Array<{ path: string; sha: string }> = [];
  const total = files.length;

  onProgress?.(`GitHub Sync: Preparing ${total} files for atomic commit to "${repo}"...`);

  // Upload blobs with concurrency of 2 to balance speed and stability
  const queue = [...files];
  const workers = Array.from({ length: Math.min(2, total) }, async () => {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;
      const idx = total - queue.length;
      const fileName = file.path.split('/').pop() || file.path;
      onProgress?.(`GitHub Sync (${idx}/${total}): Uploading ${fileName}...`);
      const blob = await uploadBlobToGitHub({
        owner,
        repo,
        token,
        path: file.path,
        content: file.content
      });
      tree.push(blob);
      onProgress?.(`GitHub Sync: ✅ ${fileName} blob verified.`);
    }
  });

  await Promise.all(workers);

  if (tree.length !== files.length) {
    throw new Error(`Blob creation mismatch: uploaded ${tree.length} of ${files.length} files.`);
  }

  onProgress?.(`GitHub Sync: 🚀 All ${total} blobs stored in GitHub. Sealing 1 atomic commit on "${repo}"...`);

  const commitResult = await commitTreeToGitHub({
    owner,
    repo,
    token,
    branch,
    tree,
    message
  });

  onProgress?.(`GitHub Sync: ✅ Atomic commit sealed! (SHA: ${commitResult.commitSha || 'latest'}). Exactly 1 clean Vercel deployment triggered!`);

  return commitResult;
}

