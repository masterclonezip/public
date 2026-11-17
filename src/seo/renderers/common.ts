import { getField, optimizeImageUrl, resolveSiteLogoUrl, getSizedLogoUrl } from '../utils';
import { structureHtmlFragment } from '../../lib/safeHtmlPublic';

export function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  let clean = structureHtmlFragment(html);
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<([a-zA-Z][a-zA-Z0-9:-]*)\b([^>]*)>/g, (_match, tag, attrs) => {
    const safeAttrs = String(attrs || '').replace(/\s+on\w+\s*=\s*(['"][^'"]*['"]|[^>\s]+)/gi, '');
    return `<${tag}${safeAttrs}>`;
  });
  clean = clean.replace(/href\s*=\s*['"]\s*javascript:[^'"]*['"]/gi, 'href="#"');
  clean = clean.replace(/<(iframe|object|embed|form|meta|link)\b[^>]*>([\s\S]*?)<\/\1>/gi, '');
  clean = clean.replace(/<(iframe|object|embed|form|meta|link)\b[^>]*>/gi, '');
  clean = clean.replace(/<!DOCTYPE\s+html[^>]*>/gi, '');
  clean = clean.replace(/<title>[^<]*<\/title>/gi, '');
  clean = clean.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '');
  clean = clean.replace(/<\/?(html|head|body)\b[^>]*>/gi, '');
  // Convert any <h1> inside user content to <h2> for strict single-H1 SEO compliance
  clean = clean.replace(/<h1([^>]*)>/gi, '<h2$1>').replace(/<\/h1>/gi, '</h2>');
  return clean.trim();
}

export function renderHeader(settings: any): string {
  const siteTitle = getField(settings, 'site_title') || '';
  const logoUrl = resolveSiteLogoUrl(settings);
  const optimizedLogo = logoUrl ? getSizedLogoUrl(logoUrl, 240, 'auto', 'c_fit') : '';
  const helplineTg = settings?.helpline_telegram ? String(settings.helpline_telegram) : '';
  const tgHref = helplineTg
    ? (helplineTg.startsWith('http') ? helplineTg : `https://t.me/${helplineTg.replace('@', '')}`)
    : '';
  return `
    <header class="sticky top-0 z-50 h-14 sm:h-16 flex items-center transition-shadow duration-200 bg-white dark:bg-[#090d16] sm:bg-white/90 sm:dark:bg-[#090d16]/90 border-b border-black/5 dark:border-white/10">
      <div class="w-full max-w-7xl px-2.5 sm:px-6 lg:px-8 mx-auto relative flex justify-between items-center gap-2">
        <a href="/" class="flex items-center gap-2 sm:gap-3 group min-w-0" aria-label="${escapeHtml(siteTitle || 'Home')}">
          <div class="p-0 transition-transform group-hover:scale-[1.03] duration-300 shrink-0">
            ${logoUrl ? `<img src="${escapeHtml(optimizedLogo)}" width="40" height="40" loading="eager" fetchpriority="high" decoding="async" class="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-sm" alt="${escapeHtml(siteTitle || 'Official')} Logo"/>` : `<div class="w-9 h-9 sm:w-10 sm:h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-semibold text-sm sm:text-base">${escapeHtml((siteTitle || 'A').substring(0, 1).toUpperCase())}</div>`}
          </div>
          <div class="flex flex-col leading-none min-w-0">
            <span class="text-[15px] xs:text-base sm:text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white truncate max-w-[165px] xs:max-w-[195px] sm:max-w-none">${escapeHtml(siteTitle)}</span>
          </div>
        </a>
        <nav class="hidden md:flex items-center gap-4 lg:gap-8 text-sm font-medium" aria-label="Primary Navigation">
          <a href="/" class="transition-all p-2 tracking-wide relative text-zinc-600 hover:text-blue-500 dark:text-zinc-300">Home</a>
          <a href="/news" class="transition-all p-2 tracking-wide relative text-zinc-600 hover:text-blue-500 dark:text-zinc-300">News</a>
          <div class="relative group/more">
            <button type="button" aria-expanded="false" aria-haspopup="true" aria-label="More navigation links" class="transition-all p-2 tracking-wide flex items-center gap-1 relative cursor-pointer text-zinc-600 hover:text-blue-500 dark:text-zinc-300">More <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></button>
          </div>
          <div class="flex items-center gap-3 ml-4 border-l border-zinc-200 dark:border-zinc-800 pl-4 h-6">
            <button type="button" class="flex items-center justify-between gap-2 bg-zinc-100/70 dark:bg-zinc-800/60 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-all text-left px-3.5 py-1.5 w-44 lg:w-56 rounded-full group outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer border border-black/5 dark:border-white/5" aria-label="Search Store">
              <span class="flex items-center gap-2 min-w-0">
                <svg class="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-500 transition-colors shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <span class="text-[13px] text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors truncate">Search</span>
              </span>
              <kbd class="hidden lg:inline-block text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 bg-white/80 dark:bg-zinc-900/80 px-1.5 py-0.5 rounded border border-black/5 dark:border-white/5 shrink-0">⌘K</kbd>
            </button>
            <div class="w-40" aria-hidden="true">
              <div class="h-8 rounded-lg bg-zinc-100/70 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5"></div>
            </div>
            ${tgHref ? `<a href="${escapeHtml(tgHref)}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center w-8 h-8 bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-500/25 transition-colors" aria-label="Telegram"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></a>` : ''}
            <div class="relative inline-block z-50">
              <button type="button" class="flex items-center gap-1.5 w-9 h-9 lg:w-auto lg:h-9 lg:px-3.5 justify-center bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-500/25 transition-colors cursor-pointer" aria-label="Support Widget">
                <svg class="w-[17px] h-[17px] lg:w-4 lg:h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                <span class="text-[13px] font-medium hidden lg:inline">Help</span>
              </button>
            </div>
          </div>
        </nav>
        <div class="md:hidden flex items-center gap-1.5 shrink-0">
          <button type="button" class="flex items-center justify-center w-9 h-9 bg-zinc-100 dark:bg-zinc-800 rounded-full active:scale-95 transition-all text-zinc-700 dark:text-zinc-200 cursor-pointer" aria-label="Search">
            <svg class="w-[17px] h-[17px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </button>
          ${tgHref ? `<a href="${escapeHtml(tgHref)}" target="_blank" rel="noopener noreferrer" class="hidden xs:flex items-center justify-center w-9 h-9 bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-full active:scale-95 transition-transform" aria-label="Telegram"><svg class="w-[17px] h-[17px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></a>` : ''}
          <div class="relative inline-block z-50">
            <button type="button" class="flex items-center gap-1.5 w-9 h-9 lg:w-auto lg:h-9 lg:px-3.5 justify-center bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-500/25 transition-colors cursor-pointer" aria-label="Support Widget">
              <svg class="w-[17px] h-[17px] lg:w-4 lg:h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            </button>
          </div>
          <button type="button" class="flex items-center justify-center w-9 h-9 bg-zinc-900 dark:bg-white rounded-full active:scale-95 transition-transform cursor-pointer" aria-label="Open menu">
            <svg class="w-[17px] h-[17px] text-white dark:text-zinc-900" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
        </div>
      </div>
    </header>
  `;
}

export function renderFooter(settings: any): string {
  const siteTitle = getField(settings, 'site_title') || '';
  const logoUrl = resolveSiteLogoUrl(settings);
  const optimizedFooterLogo = logoUrl ? getSizedLogoUrl(logoUrl, 160, 'auto', 'c_fit') : '';
  const socialLinks = settings?.social_links || {};
  const fb = socialLinks.facebook || 'https://facebook.com';
  const ig = socialLinks.instagram || 'https://instagram.com';
  const tw = socialLinks.twitter || '';
  const li = socialLinks.linkedin || '';
  const yt = socialLinks.youtube || 'https://youtube.com';

  return `
    <footer class="w-full mt-6 sm:mt-10 bg-zinc-100 dark:bg-[#060913] text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-white/[0.08] transition-colors select-none" aria-label="Site Footer">
      <div class="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-7">
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pb-4 border-b border-zinc-200/80 dark:border-white/[0.08] mb-4 sm:mb-6">
          <div class="flex items-center gap-2.5 flex-wrap">
            <a href="/" class="text-lg sm:text-xl font-black tracking-tight text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-2" aria-label="${escapeHtml(siteTitle || 'Homepage')}">
              ${optimizedFooterLogo ? `<img src="${escapeHtml(optimizedFooterLogo)}" width="28" height="28" loading="lazy" decoding="async" alt="${escapeHtml(siteTitle || 'Official')} Logo" class="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0" />` : ''}
              <span>${escapeHtml(siteTitle)}</span>
            </a>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold tracking-wider uppercase">
              <svg class="w-3 h-3 text-blue-600 dark:text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              <span>Verified</span>
            </span>
          </div>
          <p class="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
            Independent application transparency, safety benchmarking, and reviews.
          </p>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-8 mb-5 sm:mb-7 text-left">
          <div class="flex flex-col gap-0.5 sm:gap-1.5">
            <h3 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-1">
              Directory
            </h3>
            <a href="/" class="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-1 sm:py-0.5 min-h-[32px] sm:min-h-0 transition-colors group">
              <svg class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
              <span class="truncate">All Apps</span>
            </a>
            <a href="/new-apps" class="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-1 sm:py-0.5 min-h-[32px] sm:min-h-0 transition-colors group">
              <svg class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
              <span class="truncate">New Apps</span>
            </a>
            <a href="/categories" class="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-1 sm:py-0.5 min-h-[32px] sm:min-h-0 transition-colors group">
              <svg class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
              <span class="truncate">Categories</span>
            </a>
            <a href="/news" class="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-1 sm:py-0.5 min-h-[32px] sm:min-h-0 transition-colors group">
              <svg class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg>
              <span class="truncate">Industry News</span>
            </a>
            <a href="/videos" class="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-1 sm:py-0.5 min-h-[32px] sm:min-h-0 transition-colors group">
              <svg class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
              <span class="truncate">Video Reviews</span>
            </a>
          </div>

          <div class="flex flex-col gap-0.5 sm:gap-1.5">
            <h3 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-1">
              Compliance
            </h3>
            <a href="/privacy" class="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-1 sm:py-0.5 min-h-[32px] sm:min-h-0 transition-colors group">
              <svg class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              <span class="truncate">Privacy Policy</span>
            </a>
            <a href="/terms" class="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-1 sm:py-0.5 min-h-[32px] sm:min-h-0 transition-colors group">
              <svg class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span class="truncate">Terms of Service</span>
            </a>
            <a href="/ethics" class="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-1 sm:py-0.5 min-h-[32px] sm:min-h-0 transition-colors group">
              <svg class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
              <span class="truncate">Ethics Policy</span>
            </a>
            <a href="/notice" class="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-1 sm:py-0.5 min-h-[32px] sm:min-h-0 transition-colors group">
              <svg class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m14 13-7.5 7.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L11 10"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/></svg>
              <span class="truncate">Legal Notice</span>
            </a>
            <a href="/disclaimer" class="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-1 sm:py-0.5 min-h-[32px] sm:min-h-0 transition-colors group">
              <svg class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              <span class="truncate">Disclaimer</span>
            </a>
          </div>

          <div class="flex flex-col gap-0.5 sm:gap-1.5 col-span-2 sm:col-span-1">
            <h3 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-1">
              Company
            </h3>
            <a href="/about" class="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-1 sm:py-0.5 min-h-[32px] sm:min-h-0 transition-colors group">
              <svg class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span class="truncate">About Us</span>
            </a>
            <a href="/developers" class="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-1 sm:py-0.5 min-h-[32px] sm:min-h-0 transition-colors group">
              <svg class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span class="truncate">Developer Team</span>
            </a>
            <a href="/contact" class="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-1 sm:py-0.5 min-h-[32px] sm:min-h-0 transition-colors group">
              <svg class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>
              <span class="truncate">Contact Support</span>
            </a>
            <a href="/responsibility" class="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-1 sm:py-0.5 min-h-[32px] sm:min-h-0 transition-colors group">
              <svg class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>
              <span class="truncate">Responsible Gaming</span>
            </a>
            <a href="/report-removal" class="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-1 sm:py-0.5 min-h-[32px] sm:min-h-0 transition-colors group">
              <svg class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span class="truncate">Report / DMCA</span>
            </a>
          </div>
        </div>

        <div class="pt-4 border-t border-zinc-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p class="text-xs text-zinc-500 dark:text-zinc-400 text-center sm:text-left">
            &copy; ${new Date().getFullYear()} <span class="font-semibold text-zinc-700 dark:text-zinc-300">${escapeHtml(siteTitle)}</span>. All rights reserved.
          </p>

          <div class="flex items-center gap-2">
            <a href="${escapeHtml(fb)}" target="_blank" rel="noopener noreferrer" aria-label="Facebook" class="w-9 h-9 rounded-full bg-zinc-200 dark:bg-white/[0.06] hover:bg-blue-600 text-zinc-600 dark:text-zinc-300 hover:text-white flex items-center justify-center transition-all">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="${escapeHtml(ig)}" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="w-9 h-9 rounded-full bg-zinc-200 dark:bg-white/[0.06] hover:bg-pink-600 text-zinc-600 dark:text-zinc-300 hover:text-white flex items-center justify-center transition-all">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
            <a href="${escapeHtml(yt)}" target="_blank" rel="noopener noreferrer" aria-label="YouTube" class="w-9 h-9 rounded-full bg-zinc-200 dark:bg-white/[0.06] hover:bg-red-600 text-zinc-600 dark:text-zinc-300 hover:text-white flex items-center justify-center transition-all">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3v6Z"/></svg>
            </a>
            ${tw ? `
              <a href="${escapeHtml(tw)}" target="_blank" rel="noopener noreferrer" aria-label="Twitter" class="w-9 h-9 rounded-full bg-zinc-200 dark:bg-white/[0.06] hover:bg-sky-500 text-zinc-600 dark:text-zinc-300 hover:text-white flex items-center justify-center transition-all">
                <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
              </a>
            ` : ''}
            ${li ? `
              <a href="${escapeHtml(li)}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" class="w-9 h-9 rounded-full bg-zinc-200 dark:bg-white/[0.06] hover:bg-blue-700 text-zinc-600 dark:text-zinc-300 hover:text-white flex items-center justify-center transition-all">
                <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
            ` : ''}
          </div>
        </div>

      </div>
    </footer>
  `;
}

export function renderTicker(settings: any): string {
  if (settings?.ticker_enabled === false || !getField(settings, 'ticker_text')) return '';
  const tickerText = getField(settings, 'ticker_text');
  return `
    <div class="bg-transparent py-2.5 sm:py-3 overflow-hidden border-t border-black/5 dark:border-white/5 flex items-center relative z-[70] select-none pointer-events-none cv-auto" style="contain: paint">
      <div class="bg-blue-500 w-2 h-2 rounded-full absolute left-4 z-20"></div>
      <div class="flex whitespace-nowrap overflow-hidden pl-12 w-full relative">
        <div class="animate-marquee whitespace-nowrap min-w-full font-medium text-[13px] sm:text-[14px] tracking-wide text-zinc-600 dark:text-zinc-400">
          <span class="mx-10">${escapeHtml(tickerText)}</span>
          <span class="mx-10">${escapeHtml(tickerText)}</span>
          <span class="mx-10">${escapeHtml(tickerText)}</span>
          <span class="mx-10">${escapeHtml(tickerText)}</span>
        </div>
      </div>
    </div>
  `;
}


