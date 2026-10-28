import { getField, optimizeImageUrl } from '../utils';
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
  clean = clean.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (_match, tag, attrs) => {
    const safeAttrs = String(attrs || '').replace(/\s+on\w+\s*=\s*(['"][^'"]*['"]|[^>\s]+)/gi, '');
    return `<${tag}${safeAttrs}>`;
  });
  clean = clean.replace(/href\s*=\s*['"]\s*javascript:[^'"]*['"]/gi, 'href="#"');
  clean = clean.replace(/<(iframe|object|embed|form|meta|link|style)\b[^>]*>([\s\S]*?)<\/\1>/gi, '');
  clean = clean.replace(/<(iframe|object|embed|form|meta|link|style)\b[^>]*>/gi, '');
  clean = clean.replace(/<!DOCTYPE\s+html[^>]*>/gi, '');
  clean = clean.replace(/<title>[^<]*<\/title>/gi, '');
  clean = clean.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '');
  clean = clean.replace(/<\/?(html|head|body)\b[^>]*>/gi, '');
  clean = clean.replace(/<svg[^>]*class=["'][^"']*art[^"']*["'][^>]*>[\s\S]*?<\/svg>/gi, '');
  clean = clean.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
  // Convert any <h1> inside user content to <h2> for strict single-H1 SEO compliance
  clean = clean.replace(/<h1([^>]*)>/gi, '<h2$1>').replace(/<\/h1>/gi, '</h2>');
  return clean.trim();
}

export function renderHeader(settings: any): string {
  const siteTitle = getField(settings, 'site_title') || '';
  const logoUrl = getField(settings, 'logo_url');
  const optimizedLogo = logoUrl ? optimizeImageUrl(logoUrl, 120) : '';
  return `
    <header class="sticky top-0 z-50 transition-transform duration-200 ease-out will-change-transform translate-y-0 pointer-events-auto bg-white dark:bg-[#090d16] sm:bg-white/90 sm:dark:bg-[#090d16]/90 border-b border-black/5 dark:border-white/10 py-2.5 sm:py-3">
      <div class="w-full max-w-7xl px-1.5 xxs:px-2.5 xs:px-4 sm:px-6 lg:px-8 mx-auto relative flex justify-between items-center">
        <a href="/" class="flex items-center gap-1 xxs:gap-1.5 xs:gap-2.5 sm:gap-3 group min-w-0" aria-label="${escapeHtml(siteTitle || 'Home')}">
          <div class="p-0 transition-transform group-hover:scale-[1.03] duration-300 shrink-0">
            ${logoUrl ? `<img src="${escapeHtml(optimizedLogo)}" loading="eager" fetchpriority="high" decoding="async" width="40" height="40" class="w-6 h-6 xxs:w-7 xxs:h-7 xs:w-8 xs:h-8 sm:w-11 sm:h-11 object-contain drop-shadow-sm" alt="${escapeHtml(siteTitle)} Official Logo"/>` : `<div class="w-6 h-6 xxs:w-7 xxs:h-7 xs:w-8 xs:h-8 sm:w-11 sm:h-11 bg-blue-500 rounded-xl flex items-center justify-center text-white font-semibold text-xs sm:text-base">${escapeHtml(siteTitle.charAt(0))}</div>`}
          </div>
          <div class="flex flex-col leading-none min-w-0">
            <span class="text-xs xxs:text-sm xs:text-base sm:text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white truncate max-w-[90px] xxs:max-w-[120px] xs:max-w-[170px] sm:max-w-none">${escapeHtml(siteTitle)}</span>
          </div>
        </a>
        <div class="hidden md:flex items-center gap-2 lg:gap-4 flex-1 max-w-2xl mx-4 lg:mx-8 justify-end">
          <nav class="flex items-center gap-0.5 lg:gap-1 mr-1 lg:mr-2 shrink-0" aria-label="Primary Navigation">
            <a href="/" class="px-2.5 lg:px-4 py-2 rounded-full text-xs lg:text-sm font-medium transition-colors flex items-center gap-1.5 lg:gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50">Home</a>
            <a href="/news" class="px-2.5 lg:px-4 py-2 rounded-full text-xs lg:text-sm font-medium transition-colors flex items-center gap-1.5 lg:gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50">News</a>
            <a href="/new-apps" class="sr-only">New Apps</a>
            <a href="/categories" class="sr-only">Categories</a>
            <a href="/about" class="sr-only">About</a>
          </nav>
          <button type="button" class="flex items-center gap-2 lg:gap-3 w-full max-w-[160px] lg:max-w-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 text-zinc-500 dark:text-zinc-400 px-3 lg:px-4 py-2 lg:py-2.5 rounded-full transition-all text-xs lg:text-sm font-medium border border-black/5 dark:border-white/5 shadow-inner" aria-label="Search applications">
            <svg class="w-3.5 h-3.5 lg:w-4 lg:h-4 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <span class="truncate">Search apps...</span>
          </button>
        </div>
        <div class="md:hidden flex items-center gap-1 xxs:gap-1.5 xs:gap-2 sm:gap-3 shrink-0">
          <button type="button" class="flex items-center justify-center w-7 h-7 xxs:w-8 xxs:h-8 xs:w-9 xs:h-9 bg-zinc-100 dark:bg-zinc-800 rounded-full active:scale-95 transition-all text-zinc-600 dark:text-zinc-300" aria-label="Search">
            <svg class="w-3 h-3 xxs:w-3.5 xxs:h-3.5 xs:w-4 xs:h-4 text-zinc-500 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </button>
          <div class="relative inline-block z-50">
            <button type="button" class="flex items-center gap-2 w-8 h-8 xs:w-9 xs:h-9 lg:w-auto lg:h-11 lg:px-4 justify-center bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-500/25 transition-colors shrink-0" aria-label="Support Widget">
              <svg class="w-3.5 h-3.5 xs:w-4 xs:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            </button>
          </div>
          <button type="button" class="flex items-center justify-center w-7 h-7 xxs:w-8 xxs:h-8 xs:w-9 xs:h-9 bg-zinc-900 dark:bg-white rounded-full active:scale-95 transition-transform" aria-label="Open menu">
            <svg class="w-3 h-3 xxs:w-3.5 xxs:h-3.5 xs:w-4 xs:h-4 text-white dark:text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
        </div>
      </div>
    </header>
  `;
}

export function renderFooter(settings: any): string {
  const siteTitle = getField(settings, 'site_title') || '';
  const socialLinks = settings?.social_links || {};
  const fb = socialLinks.facebook || 'https://facebook.com';
  const ig = socialLinks.instagram || 'https://instagram.com';
  const tw = socialLinks.twitter || 'https://twitter.com';
  const li = socialLinks.linkedin || 'https://linkedin.com';
  const yt = socialLinks.youtube || 'https://youtube.com';
  const tg = socialLinks.telegram || '';

  return `
    <footer class="w-full mt-8 sm:mt-12 bg-zinc-100 dark:bg-[#060913] text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-white/[0.08] transition-colors select-none" aria-label="Site Footer">
      <div class="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 pb-5 border-b border-zinc-200/80 dark:border-white/[0.08] mb-5 sm:mb-6">
          <div class="flex items-center gap-2.5 flex-wrap">
            <a href="/" class="text-lg sm:text-xl font-black tracking-tight text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1" aria-label="${escapeHtml(siteTitle || 'Homepage')}">
              <span>${escapeHtml(siteTitle)}</span>
            </a>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold tracking-wider uppercase">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              <span>Verified</span>
            </span>
          </div>
          <p class="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
            Independent application transparency, safety benchmarking, and reviews.
          </p>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-8 mb-6 sm:mb-8 text-left">
          <div class="flex flex-col gap-1.5">
            <h3 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
              <span>Directory</span>
            </h3>
            <a href="/" class="text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors">All Apps</a>
            <a href="/new-apps" class="text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors">New Apps</a>
            <a href="/categories" class="text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors">Categories</a>
            <a href="/news" class="text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors">Industry News</a>
            <a href="/videos" class="text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors">Video Reviews</a>
          </div>

          <div class="flex flex-col gap-1.5">
            <h3 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>Compliance</span>
            </h3>
            <a href="/privacy" class="text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors">Privacy Policy</a>
            <a href="/terms" class="text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors">Terms of Service</a>
            <a href="/ethics" class="text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors">Ethics Policy</a>
            <a href="/notice" class="text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors">Legal Notice</a>
            <a href="/disclaimer" class="text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors">Disclaimer</a>
          </div>

          <div class="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
            <h3 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Company</span>
            </h3>
            <a href="/about" class="text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors">About Us</a>
            <a href="/developers" class="text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors">Developer Team</a>
            <a href="/contact" class="text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors">Contact Support</a>
            <a href="/responsibility" class="text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors">Responsible Gaming</a>
            <a href="/report-removal" class="text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white py-0.5 transition-colors">Report / DMCA</a>
          </div>
        </div>

        <div class="pt-4 border-t border-zinc-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <a href="${escapeHtml(fb)}" target="_blank" rel="noopener noreferrer" aria-label="Facebook" class="w-8 h-8 rounded-lg bg-zinc-200/70 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400 hover:text-white hover:bg-[#1877F2] flex items-center justify-center transition-all">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="${escapeHtml(ig)}" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="w-8 h-8 rounded-lg bg-zinc-200/70 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400 hover:text-white hover:bg-[#E4405F] flex items-center justify-center transition-all">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
            <a href="${escapeHtml(tw)}" target="_blank" rel="noopener noreferrer" aria-label="Twitter" class="w-8 h-8 rounded-lg bg-zinc-200/70 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400 hover:text-white hover:bg-[#1DA1F2] flex items-center justify-center transition-all">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
            </a>
            <a href="${escapeHtml(li)}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" class="w-8 h-8 rounded-lg bg-zinc-200/70 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400 hover:text-white hover:bg-[#0A66C2] flex items-center justify-center transition-all">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
            <a href="${escapeHtml(yt)}" target="_blank" rel="noopener noreferrer" aria-label="YouTube" class="w-8 h-8 rounded-lg bg-zinc-200/70 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400 hover:text-white hover:bg-[#FF0000] flex items-center justify-center transition-all">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3v6Z"/></svg>
            </a>
            ${tg ? `
              <a href="${escapeHtml(tg)}" target="_blank" rel="noopener noreferrer" aria-label="Telegram" class="w-8 h-8 rounded-lg bg-zinc-200/70 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400 hover:text-white hover:bg-[#229ED9] flex items-center justify-center transition-all">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              </a>
            ` : ''}
          </div>

          <p class="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-500 text-center sm:text-right">
            &copy; ${new Date().getFullYear()} <span class="font-semibold text-zinc-700 dark:text-zinc-300">${escapeHtml(siteTitle)}</span>. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  `;
}

export function renderTicker(settings: any): string {
  if (settings?.ticker_enabled === false || !getField(settings, 'ticker_text')) return '';
  const tickerText = getField(settings, 'ticker_text');
  return `
    <div class="bg-transparent py-3 overflow-hidden border-t border-black/5 dark:border-white/5 flex items-center relative z-10 select-none">
      <div class="bg-blue-500 w-2 h-2 rounded-full ml-4 mr-2 animate-pulse shrink-0"></div>
      <div class="animate-marquee whitespace-nowrap text-xs font-medium text-zinc-500 dark:text-zinc-400 tracking-wide">
        <span class="mx-10">${escapeHtml(tickerText)}</span>
        <span class="mx-10">${escapeHtml(tickerText)}</span>
        <span class="mx-10">${escapeHtml(tickerText)}</span>
        <span class="mx-10">${escapeHtml(tickerText)}</span>
        <span class="mx-10">${escapeHtml(tickerText)}</span>
      </div>
    </div>
  `;
}


