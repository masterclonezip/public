import { getField, optimizeImageUrl, cleanFaqQuestion } from '../utils';
import { escapeHtml } from './common';

export function renderHome(apps: any[], settings: any, news: any[], _videos: any[], pageNum: number = 1): string {
  const siteTitle = getField(settings, 'site_title') || '';
  const heroVisible = settings?.hero_title_visible !== false;
  const heroText = getField(settings, 'hero_title_text') || '';
  const heroSubtitle = getField(settings, 'hero_title_subtitle') || '';
  const bannerItems = settings?.banners || [];

  let appsHtml = '';
  const sorted = [...apps].sort((a, b) => {
    const rawA = parseInt(getField(a, 'serial_number', '999999'), 10);
    const rawB = parseInt(getField(b, 'serial_number', '999999'), 10);
    const sa = !isNaN(rawA) && rawA > 0 ? rawA : 999999;
    const sb = !isNaN(rawB) && rawB > 0 ? rawB : 999999;
    return sa - sb;
  });
  
  const pageSize = 24;
  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const currentPage = Math.max(1, Math.min(pageNum, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const pageApps = sorted.slice(startIndex, startIndex + pageSize);

  // Render paginated apps with 1:1 PlayStoreUI styling matching AppListItem
  pageApps.forEach((app, idx) => {
    const i = startIndex + idx;
    const name = getField(app, 'name');
    const slug = getField(app, 'slug');
    const category = getField(app, 'category', 'Game');
    const ratingRaw = getField(app, 'rating', '5.0');
    const ratingVal = typeof ratingRaw === 'number' ? ratingRaw : (parseFloat(String(ratingRaw)) || 5.0);
    const rating = ratingVal.toFixed(1);
    const rawIcon = getField(app, 'icon_url') || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=128&fit=crop';
    const icon = optimizeImageUrl(rawIcon, 120);
    const isNew = app.is_new === true || (app.is_new && app.is_new.booleanValue === true);
    const isHot = app.is_hot === true || (app.is_hot && app.is_hot.booleanValue === true);
    const isVerified = getField(app, 'safety_status', 'Verified') === 'Verified';
    const isTopItem = i < 6;
    
    appsHtml += `
      <div class="relative group z-1 [content-visibility:auto] [contain-intrinsic-size:auto_84px]">
        <a href="/app/${encodeURIComponent(slug)}" class="flex items-center gap-1.5 xxs:gap-2 xs:gap-2.5 sm:gap-4 py-1.5 xxs:py-2 pl-1 pr-8 xxs:pr-9 xs:py-2.5 xs:pl-2 xs:pr-12 sm:pl-4 sm:pr-14 sm:py-3.5 mb-0 sm:mb-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200 rounded-xl sm:rounded-2xl relative active:bg-black/5 dark:active:bg-white/5 w-full" title="${escapeHtml(name)}">
          <div class="w-3.5 xxs:w-4 xs:w-5 sm:w-7 text-[11px] xxs:text-xs xs:text-[14px] sm:text-[17px] font-black text-zinc-400 dark:text-zinc-500 text-center shrink-0">
            ${i + 1}
          </div>
          <div class="relative w-[52px] h-[52px] xxs:w-[60px] xxs:h-[60px] xs:w-[72px] xs:h-[72px] sm:w-[88px] sm:h-[88px] shrink-0">
            <div class="w-full h-full rounded-[14px] xxs:rounded-[16px] xs:rounded-[18px] sm:rounded-[22px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-sm border border-black/5 dark:border-white/10 relative z-10 transition-transform group-hover:-translate-y-0.5 duration-300">
              <img src="${escapeHtml(icon)}" ${isTopItem ? 'loading="eager" fetchpriority="high"' : 'loading="lazy" fetchpriority="low"'} decoding="async" width="88" height="88" referrerpolicy="no-referrer" class="w-full h-full object-cover block" alt="${escapeHtml(name)} app icon"/>
            </div>
            ${isHot && isNew ? `<div class="absolute -top-1.5 -right-2 z-20 pointer-events-none"><span class="inline-flex items-center rounded-[6px] xs:rounded-[8px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.18)] font-black text-[7px] xxs:text-[8px] xs:text-[9px] sm:text-[10px] uppercase tracking-wider block"><span class="bg-[#d32f2f] text-white px-1 xs:px-1.5 py-0.5">HOT</span><span class="bg-[#008738] text-white px-1 xs:px-1.5 py-0.5">NEW</span></span></div>` : isHot ? `<div class="absolute -top-1.5 -right-2 z-20 pointer-events-none"><span class="bg-[#d32f2f] text-white text-[7px] xxs:text-[8px] xs:text-[9px] sm:text-[10px] font-black px-1.5 xs:px-2 py-0.5 rounded-[6px] xs:rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.15)] uppercase tracking-wider block">HOT</span></div>` : isNew ? `<div class="absolute -top-1.5 -right-2 z-20 pointer-events-none"><span class="bg-[#008738] text-white text-[7px] xxs:text-[8px] xs:text-[9px] sm:text-[10px] font-black px-1.5 xs:px-2 py-0.5 rounded-[6px] xs:rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.15)] uppercase tracking-wider block">NEW</span></div>` : ''}
          </div>
          <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
            <h3 class="font-semibold text-xs xxs:text-sm xs:text-base sm:text-[17px] tracking-tight text-zinc-900 dark:text-zinc-100 truncate w-full">${escapeHtml(name)}</h3>
            <div class="text-[10px] xxs:text-[11px] xs:text-xs sm:text-[13px] font-normal text-zinc-500 dark:text-zinc-400 truncate">${escapeHtml(category)}</div>
            <div class="flex items-center gap-1 text-[9px] xxs:text-[10px] xs:text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
              <span>${rating}</span>
              <svg class="w-2.5 h-2.5 xs:w-3 xs:h-3 fill-current text-zinc-400" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              ${isVerified ? `<svg class="w-2.5 h-2.5 xs:w-3 xs:h-3 text-blue-500 shrink-0 ml-0.5 xs:ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>` : ''}
            </div>
          </div>
          <div class="absolute bottom-0 right-4 left-[70px] xxs:left-[80px] xs:left-[96px] sm:left-[144px] border-b border-black/5 dark:border-white/5 opacity-50 transition-opacity group-hover:opacity-0"></div>
        </a>
        <div class="absolute right-1 xs:right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20">
          <button type="button" aria-expanded="false" aria-haspopup="true" class="p-1.5 xs:p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-full transition-all cursor-pointer relative" aria-label="More options">
            <svg class="w-3.5 h-3.5 xs:w-4 xs:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>
      </div>
    `;
  });

  const newApps = sorted.filter(a => a.is_new === true || (a.is_new && a.is_new.booleanValue === true));
  let newAdditionsHtml = '';
  if (newApps.length > 0) {
    newAdditionsHtml = `
      <aside data-nosnippet class="px-0 animate-fade-in">
        <h2 class="text-base xxs:text-lg xs:text-xl font-bold mb-2.5 xs:mb-4 mt-3 xs:mt-6 text-zinc-900 dark:text-zinc-100 flex items-center px-0">
          New Additions <svg class="w-4 h-4 xs:w-5 xs:h-5 text-blue-500 fill-blue-500/20 ml-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>
        </h2>
        <div class="flex overflow-x-auto gap-2 xxs:gap-2.5 xs:gap-3.5 sm:gap-4 px-2 xxs:px-3 xs:px-4 sm:px-1 pt-1.5 pb-2 mb-2 scrollbar-none snap-x snap-mandatory scroll-smooth -mx-2 xxs:-mx-3 xs:-mx-4 sm:-mx-0">
          ${newApps.slice(0, 10).map((app, index) => {
            const nSlug = getField(app, 'slug');
            const nName = getField(app, 'name');
            const nIcon = optimizeImageUrl(getField(app, 'icon_url'), 120);
            const nIsHot = app.is_hot === true || (app.is_hot && app.is_hot.booleanValue === true);
            const nIsNew = app.is_new === true || (app.is_new && app.is_new.booleanValue === true);
            return `
              <div class="flex-none w-[64px] xxs:w-[74px] xs:w-[88px] sm:w-[104px] snap-start">
                <a href="/app/${encodeURIComponent(nSlug)}" class="flex flex-col gap-1 xxs:gap-1.5 xs:gap-2 group" title="${escapeHtml(nName)}">
                  <div class="relative w-full aspect-square">
                    <div class="w-full h-full rounded-[14px] xxs:rounded-[16px] xs:rounded-[20px] sm:rounded-[24px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-black/5 dark:border-white/10 shadow-sm">
                      <img src="${escapeHtml(nIcon)}" ${index < 6 ? 'loading="eager"' : 'loading="lazy"'} ${index === 0 ? 'fetchpriority="high"' : 'fetchpriority="low"'} decoding="async" width="104" height="104" class="w-full h-full object-cover block" alt="${escapeHtml(nName)}"/>
                    </div>
                    ${nIsHot && nIsNew ? `<div class="absolute -top-1.5 -right-1.5 z-20 pointer-events-none"><span class="inline-flex items-center rounded-[6px] xs:rounded-[8px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.18)] font-black text-[7px] xs:text-[8px] sm:text-[9px] uppercase tracking-wider block"><span class="bg-[#d32f2f] text-white px-1 xs:px-1.5 py-0.5">HOT</span><span class="bg-[#008738] text-white px-1 xs:px-1.5 py-0.5">NEW</span></span></div>` : nIsHot ? `<div class="absolute -top-1.5 -right-1.5 z-20 pointer-events-none"><span class="bg-[#d32f2f] text-white text-[7px] xs:text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-[6px] xs:rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.15)] uppercase tracking-wider block">HOT</span></div>` : `<div class="absolute -top-1.5 -right-1.5 z-20 pointer-events-none"><span class="bg-[#008738] text-white text-[7px] xs:text-[8px] sm:text-[9px] font-black px-1.5 xs:px-2 py-0.5 rounded-[6px] xs:rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.15)] uppercase tracking-wider block">NEW</span></div>`}
                  </div>
                  <div class="px-0.5 text-center"><h3 class="text-[9px] xs:text-[10px] sm:text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">${escapeHtml(nName)}</h3></div>
                </a>
              </div>
            `;
          }).join('')}
        </div>
      </aside>
    `;
  }

  let featuredBannerHtml = '';
  if (Array.isArray(bannerItems) && bannerItems.length > 0) {
    const rawBannerImg = bannerItems[0]?.image_url || bannerItems[0]?.image || '';
    const bannerSrc = optimizeImageUrl(rawBannerImg, 600);
    const bannerSrcSet = rawBannerImg ? `${escapeHtml(optimizeImageUrl(rawBannerImg, 400))} 400w, ${escapeHtml(optimizeImageUrl(rawBannerImg, 600))} 600w, ${escapeHtml(optimizeImageUrl(rawBannerImg, 800))} 800w` : '';
    const bannerTitle = bannerItems[0]?.title || '';
    const bannerSubtitle = bannerItems[0]?.subtitle || '';
    featuredBannerHtml = `
      <div class="w-full relative px-0 sm:px-4 max-w-4xl mx-auto mb-5 group/carousel select-none">
        <div class="w-full overflow-hidden rounded-2xl sm:rounded-[20px] shadow-sm sm:border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/40 relative h-[110px] xxs:h-[120px] xs:h-[135px] sm:h-[160px] md:h-[185px]">
          <div class="flex h-full w-full">
            <div class="w-full shrink-0 h-full relative">
              <a href="${escapeHtml(bannerItems[0]?.link || '#')}" class="block w-full h-full relative">
                <div class="w-full h-full relative overflow-hidden select-none pointer-events-none">
                  <img src="${escapeHtml(bannerSrc)}" ${bannerSrcSet ? `srcset="${bannerSrcSet}" sizes="(max-width: 640px) 100vw, 800px"` : ''} alt="${escapeHtml(bannerTitle || 'Featured banner')}" width="800" height="400" loading="eager" fetchpriority="high" decoding="async" class="absolute inset-0 w-full h-full object-cover pointer-events-none"/>
                  <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pt-10 pb-3 px-4 sm:px-6 flex flex-col justify-end"></div>
                  <div class="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex flex-col justify-end">
                    <div class="flex items-center gap-1.5 mb-1 bg-black/40 px-2 py-0.5 rounded-full border border-white/10 w-fit">
                      <span class="text-white text-[9px] font-bold uppercase tracking-wider">Featured App</span>
                    </div>
                    <div>
                      <h3 class="text-white text-base sm:text-lg md:text-xl font-black tracking-tight leading-none mb-1 text-left">${escapeHtml(bannerTitle)}</h3>
                      <p class="text-white/80 text-[11px] sm:text-xs font-semibold leading-tight line-clamp-1 text-left">${escapeHtml(bannerSubtitle)}</p>
                    </div>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  const rawCategories = Array.isArray(settings?.categories) && settings.categories.length > 0
    ? settings.categories
    : ['All Apps', 'Games', 'Apps', 'Entertainment'];

  const categories = rawCategories.some((c: string) => c.toLowerCase() === 'all' || c.toLowerCase() === 'all apps')
    ? rawCategories
    : ['All Apps', ...rawCategories];

  const categoryTabsHtml = `
    <div class="mb-2 sticky top-[42px] xxs:top-[46px] xs:top-[50px] sm:top-16 z-40 bg-[var(--bg-primary)] py-1 xxs:py-1.5 xs:py-2 px-0">
      <div class="flex overflow-x-auto no-scrollbar gap-1 xxs:gap-1.5 xs:gap-2">
        ${categories.map((c: string, idx: number) => {
          const isAll = c.toLowerCase() === 'all' || c.toLowerCase() === 'all apps' || idx === 0;
          const catSlug = c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const link = isAll ? '/' : `/category/${encodeURIComponent(catSlug)}`;
          return `<a href="${link}" class="whitespace-nowrap px-2.5 xxs:px-3 xs:px-4 py-1 xxs:py-1.5 xs:py-2 text-[11px] xxs:text-xs xs:text-sm font-medium transition-all rounded-full border no-underline inline-flex items-center ${isAll ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-white/10 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'}">${escapeHtml(c)}</a>`;
        }).join('')}
      </div>
    </div>
  `;

  const heroHtml = (heroVisible && (heroText || heroSubtitle)) ? `
    <div class="w-full relative py-1 sm:py-1.5 px-4 overflow-hidden flex flex-col items-center justify-center text-center my-0">
      <div class="absolute inset-0 pointer-events-none flex items-center justify-center -z-10 overflow-hidden">
        <div class="w-[200px] sm:w-[300px] h-[100px] sm:h-[150px] rounded-full blur-[40px] sm:blur-[60px] mix-blend-multiply dark:mix-blend-screen opacity-8 transition-colors duration-500 bg-zinc-500/15 dark:bg-zinc-700/15"></div>
      </div>
      <div class="max-w-4xl mx-auto flex flex-col items-center justify-center gap-1">
        <h1 class="font-sans font-black uppercase text-center tracking-tighter leading-none text-base xs:text-xl sm:text-3xl md:text-4xl bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-900 bg-clip-text text-transparent dark:from-white dark:via-zinc-200 dark:to-zinc-300 select-text block max-w-3xl filter drop-shadow-sm">
          ${escapeHtml(heroText)}
        </h1>
        ${heroSubtitle ? `<p class="text-[9px] sm:text-[10px] font-bold tracking-[0.18em] text-zinc-900/60 dark:text-zinc-100/60 uppercase max-w-2xl select-text pt-0.5 leading-tight">${escapeHtml(heroSubtitle)}</p>` : ''}
        <div class="h-[2px] w-12 rounded-full mt-1 bg-zinc-200 dark:bg-zinc-800 transition-all duration-300"></div>
      </div>
    </div>
  ` : `<h1 class="sr-only">${escapeHtml(siteTitle)}</h1>`;

  const filterBarHtml = `
    <div class="px-0 mb-3 xs:mb-4 mt-1 xs:mt-2 flex flex-wrap items-center justify-end gap-2 xs:gap-4">
      <div class="flex items-center gap-2 xs:gap-3 flex-wrap">
        <div class="relative">
          <div class="flex items-center gap-1 xs:gap-1.5 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-xl px-2 xs:px-3 py-1 xs:py-1.5 shadow-sm text-[11px] xs:text-xs font-medium text-zinc-700 dark:text-zinc-300 select-none">
            <span class="flex items-center gap-1">
              <svg class="w-3 h-3 xs:w-3.5 xs:h-3.5 fill-amber-400 text-amber-400 shrink-0" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>Rating: All</span>
            </span>
            <svg class="w-3 h-3 xs:w-3.5 xs:h-3.5 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
        <div class="relative">
          <div class="flex items-center gap-1 xs:gap-1.5 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-xl px-2 xs:px-3 py-1 xs:py-1.5 shadow-sm text-[11px] xs:text-xs font-medium text-zinc-700 dark:text-zinc-300 select-none">
            <span class="flex items-center gap-1">
              <svg class="w-3 h-3 xs:w-3.5 xs:h-3.5 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/></svg>
              <span>Recommended</span>
            </span>
            <svg class="w-3 h-3 xs:w-3.5 xs:h-3.5 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>
    </div>
  `;

  const remainingApps = sorted.slice(pageSize);
  const fullDirectoryHtml = remainingApps.length > 0 ? `
    <nav aria-label="Complete Application Directory" data-nosnippet class="mt-8 pt-6 border-t border-black/5 dark:border-white/5 px-2 max-w-5xl mx-auto">
      <h2 class="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3 uppercase tracking-wider">More Applications in Catalog (${remainingApps.length})</h2>
      <div class="flex flex-wrap gap-2">
        ${remainingApps.map((app) => {
          const rSlug = getField(app, 'slug');
          const rName = getField(app, 'name');
          return `<a href="/app/${encodeURIComponent(rSlug)}" class="px-2.5 py-1 rounded-lg bg-zinc-100/80 dark:bg-zinc-900/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 text-[11px] font-medium border border-black/5 dark:border-white/5 no-underline transition-colors">${escapeHtml(rName)}</a>`;
        }).join('')}
      </div>
    </nav>
  ` : '';

  return `
    <div class="select-none min-h-screen">
      ${heroHtml}
      ${featuredBannerHtml}
      ${newAdditionsHtml}
      ${categoryTabsHtml}
      ${filterBarHtml}

      <div class="px-0 sm:px-1">
        <div class="space-y-2">
          ${appsHtml}
        </div>
      </div>

      ${totalPages > 1 ? `
        <nav aria-label="Catalog pagination" class="py-8 min-h-[72px] flex items-center justify-center gap-2">
          ${currentPage > 1 ? `<a href="${currentPage === 2 ? '/' : `/?page=${currentPage - 1}`}" class="px-3.5 py-1.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">Previous</a>` : ''}
          <span class="text-xs text-zinc-500 font-medium px-2">Page ${currentPage} of ${totalPages}</span>
          ${currentPage < totalPages ? `<a href="/?page=${currentPage + 1}" class="px-3.5 py-1.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">Next</a>` : ''}
        </nav>
      ` : ''}

      ${fullDirectoryHtml}

      ${Array.isArray(settings?.website_faqs) && settings.website_faqs.filter((f: any) => f && f.question && f.answer).length > 0 ? `
        <section aria-labelledby="home-faq-heading" class="mt-10 sm:mt-14 mb-8 px-2 max-w-5xl mx-auto w-full select-none">
          <div class="bg-zinc-50/80 dark:bg-[#080c18]/80 border border-zinc-200/80 dark:border-white/[0.08] rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs">
            <div class="flex items-center justify-between mb-5 sm:mb-7 pb-3.5 border-b border-zinc-200/80 dark:border-white/[0.08]">
              <div class="flex items-center gap-2.5 sm:gap-3">
                <div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                  <svg class="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                </div>
                <div>
                  <h2 id="home-faq-heading" class="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Frequently Asked Questions</h2>
                </div>
              </div>
              <span class="text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-200/70 dark:bg-white/[0.06] px-2.5 py-1 rounded-full">${settings.website_faqs.filter((f: any) => f && f.question && f.answer).length} FAQs</span>
            </div>
            <div class="space-y-2.5 sm:space-y-3">
              ${settings.website_faqs.filter((f: any) => f && f.question && f.answer).map((faq: any) => `
                <details class="group rounded-xl sm:rounded-2xl border border-zinc-200/90 dark:border-white/[0.07] bg-white dark:bg-[#0c101d] overflow-hidden shadow-xs" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                  <summary class="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-3 p-3.5 sm:p-4 text-left cursor-pointer select-none">
                    <span class="flex items-center gap-2.5 min-w-0 pr-1">
                      <span class="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-cyan-400 text-[11px] font-black flex items-center justify-center shrink-0">Q</span>
                      <span itemprop="name" class="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">${escapeHtml(cleanFaqQuestion(faq.question))}</span>
                    </span>
                    <div class="w-6 h-6 rounded-full bg-zinc-100 dark:bg-white/[0.06] text-zinc-500 dark:text-zinc-400 flex items-center justify-center shrink-0">
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </summary>
                  <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer" class="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-white/[0.05] text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50/30 dark:bg-black/10">
                    <div itemprop="text" class="pl-7">
                      ${escapeHtml(faq.answer)}
                    </div>
                  </div>
                </details>
              `).join('')}
            </div>
          </div>
        </section>
      ` : ''}
    </div>
  `;
}

export function renderCategory(categoryName: string, _categorySlug: string, categoryApps: any[], settings: any): string {
  const siteTitle = getField(settings, 'site_title') || '';
  
  let appsHtml = '';
  const sorted = [...categoryApps].sort((a, b) => {
    const rawA = parseInt(getField(a, 'serial_number', '999999'), 10);
    const rawB = parseInt(getField(b, 'serial_number', '999999'), 10);
    const sa = !isNaN(rawA) && rawA > 0 ? rawA : 999999;
    const sb = !isNaN(rawB) && rawB > 0 ? rawB : 999999;
    return sa - sb;
  });
  
  sorted.forEach((app, i) => {
    const name = getField(app, 'name');
    const slug = getField(app, 'slug');
    const category = getField(app, 'category');
    const rating = getField(app, 'rating', '5.0');
    const rawIcon = getField(app, 'icon_url') || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=128&fit=crop';
    const icon = optimizeImageUrl(rawIcon, 128);
    const isNew = app.is_new === true || (app.is_new && app.is_new.booleanValue === true);
    const isTopItem = i < 4;
    
    appsHtml += `
      <a href="/app/${encodeURIComponent(slug)}" class="flex items-center gap-4 p-4 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition border-b border-black/5 dark:border-white/5 text-left" title="${escapeHtml(name)} review and details">
        <span class="text-sm font-bold text-zinc-400 shrink-0 w-8 text-center">${i + 1}</span>
        <img src="${escapeHtml(icon)}" ${isTopItem ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" width="64" height="64" class="w-16 h-16 rounded-[18px] object-cover bg-white shadow-sm shrink-0" alt="${escapeHtml(name)} app icon"/>
        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-base text-zinc-900 dark:text-zinc-100 truncate">${escapeHtml(name)}</h3>
          <p class="text-xs text-zinc-500 truncate">${escapeHtml(category)}</p>
          <div class="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
            <span>${escapeHtml(rating)}</span><span class="text-amber-500 font-bold">★</span>
            ${isNew ? `<span class="bg-blue-500/10 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded">NEW</span>` : ''}
          </div>
        </div>
        <span class="bg-black/5 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 px-4 py-1 text-xs font-bold rounded-full select-none">DETAILS</span>
      </a>
    `;
  });

  return `
    <div class="max-w-4xl mx-auto py-6 px-2 sm:px-4">
      <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-6">
        <a href="/" class="hover:text-blue-600">Home</a>
        <span>/</span>
        <a href="/categories" class="hover:text-blue-600">Categories</a>
        <span>/</span>
        <span class="font-bold text-zinc-800 dark:text-zinc-200">${escapeHtml(categoryName)}</span>
      </nav>
      <div class="text-center py-8 mb-6 bg-white dark:bg-zinc-900 rounded-[28px] border border-black/5 p-6 shadow-sm">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white mb-2">${escapeHtml(categoryName)} Apps & Reviews</h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">Explore all ${categoryApps.length} verified ${escapeHtml(categoryName)} applications, ratings, download specifications, and reviews.</p>
      </div>
      <div class="bg-white dark:bg-zinc-900 p-6 rounded-[28px] border border-black/5 shadow-sm">
        <div class="flex flex-col">${appsHtml || '<p class="text-center text-zinc-400 py-10">No applications listed under this category.</p>'}</div>
      </div>
    </div>
  `;
}

export function renderNewApps(newApps: any[], settings: any): string {
  const siteTitle = getField(settings, 'site_title') || '';
  
  let appsHtml = '';
  newApps.forEach((app, i) => {
    const name = getField(app, 'name');
    const slug = getField(app, 'slug');
    const category = getField(app, 'category');
    const rating = getField(app, 'rating', '5.0');
    const rawIcon = getField(app, 'icon_url') || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=128&fit=crop';
    const icon = optimizeImageUrl(rawIcon, 128);
    const isTopItem = i < 4;
    
    appsHtml += `
      <a href="/app/${encodeURIComponent(slug)}" class="flex items-center gap-4 p-4 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition border-b border-black/5 dark:border-white/5 text-left" title="${escapeHtml(name)} review and details">
        <span class="text-sm font-bold text-zinc-400 shrink-0 w-8 text-center">${i + 1}</span>
        <img src="${escapeHtml(icon)}" ${isTopItem ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" width="64" height="64" class="w-16 h-16 rounded-[18px] object-cover bg-white shadow-sm shrink-0" alt="${escapeHtml(name)} app icon"/>
        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-base text-zinc-900 dark:text-zinc-100 truncate">${escapeHtml(name)}</h3>
          <p class="text-xs text-zinc-500 truncate">${escapeHtml(category)}</p>
          <div class="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
            <span>${escapeHtml(rating)}</span><span class="text-amber-500 font-bold">★</span>
            <span class="bg-blue-500/10 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded">NEW</span>
          </div>
        </div>
        <span class="bg-black/5 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 px-4 py-1 text-xs font-bold rounded-full select-none">DETAILS</span>
      </a>
    `;
  });

  return `
    <div class="max-w-4xl mx-auto py-6 px-2 sm:px-4">
      <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-6">
        <a href="/" class="hover:text-blue-600">Home</a>
        <span>/</span>
        <span class="font-bold text-zinc-800 dark:text-zinc-200">New Apps</span>
      </nav>
      <div class="text-center py-8 mb-6 bg-white dark:bg-zinc-900 rounded-[28px] border border-black/5 p-6 shadow-sm">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white mb-2">Newly Added & Updated Applications</h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">Discover the latest verified applications.</p>
      </div>
      <div class="bg-white dark:bg-zinc-900 p-6 rounded-[28px] border border-black/5 shadow-sm">
        <div class="flex flex-col">${appsHtml || '<p class="text-center text-zinc-400 py-10">No new applications available.</p>'}</div>
      </div>
    </div>
  `;
}
