import { getField, optimizeImageUrl, cleanFaqQuestion } from '../utils';
import { escapeHtml, sanitizeHtml } from './common';

export interface HomeRenderOptions {
  activeTab?: string;
  isNewAppsRoute?: boolean;
}

export function renderHome(
  apps: any[],
  settings: any,
  _news: any[],
  _videos: any[],
  pageNum: number = 1,
  options?: HomeRenderOptions
): string {
  const heroVisible = settings?.hero_title_visible !== false;
  const heroText = getField(settings, 'hero_title_text') || '';
  const heroSubtitle = getField(settings, 'hero_title_subtitle') || '';
  const bannerItems = settings?.banners || [];

  const activeTab = (options?.activeTab || 'All Apps').trim();
  const activeTabLower = activeTab.toLowerCase();
  const isHomeTab =
    activeTabLower === 'all apps' ||
    activeTabLower === 'all' ||
    activeTabLower === 'home' ||
    activeTabLower === 'apps';
  const isCategoriesTab = activeTabLower === 'categories';
  const isTopChartsTab = activeTabLower === 'top charts';
  const isNewAppsRoute = Boolean(options?.isNewAppsRoute);

  const sortedAll = [...apps].sort((a, b) => {
    const rawA = parseInt(getField(a, 'serial_number', '999999'), 10);
    const rawB = parseInt(getField(b, 'serial_number', '999999'), 10);
    const sa = !isNaN(rawA) && rawA > 0 ? rawA : 999999;
    const sb = !isNaN(rawB) && rawB > 0 ? rawB : 999999;
    return sa - sb;
  });

  let sorted = sortedAll;
  if (isNewAppsRoute && isHomeTab) {
    const newOrHot = sortedAll.filter((a: any) => {
      const isNew = a.is_new === true || (a.is_new && typeof a.is_new === 'object' && a.is_new.booleanValue === true);
      const isHot = a.is_hot === true || (a.is_hot && typeof a.is_hot === 'object' && a.is_hot.booleanValue === true);
      return isNew || isHot;
    });
    sorted = newOrHot.length > 0 ? newOrHot : sortedAll;
  } else if (!isHomeTab && !isCategoriesTab && !isTopChartsTab) {
    sorted = sortedAll.filter((app: any) => {
      const catStr = String(getField(app, 'category', '') || '').toLowerCase();
      const appCategories = catStr ? catStr.split(',').map((c) => c.trim()) : [];
      return appCategories.some(
        (cat) => cat === activeTabLower || cat.includes(activeTabLower) || activeTabLower.includes(cat)
      );
    });
  }

  let appsHtml = '';
  const pageSize = 24;
  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const currentPage = Math.max(1, Math.min(pageNum, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const pageApps = sorted.slice(startIndex, startIndex + pageSize);

  pageApps.forEach((app, idx) => {
    const i = startIndex + idx;
    const name = getField(app, 'name');
    const slug = getField(app, 'slug');
    const category = getField(app, 'category', 'Game');
    const ratingRaw = getField(app, 'rating', '5.0');
    const ratingVal = typeof ratingRaw === 'number' ? ratingRaw : parseFloat(String(ratingRaw));
    const rating = !isNaN(ratingVal) && ratingVal > 0 ? ratingVal.toFixed(1) : '5.0';
    const rawIcon = getField(app, 'icon_url') || '/logo.png';
    const icon = optimizeImageUrl(rawIcon, 120);
    const isNew = app.is_new === true || (app.is_new && app.is_new.booleanValue === true);
    const isHot = app.is_hot === true || (app.is_hot && app.is_hot.booleanValue === true);
    const isComingSoonFlag = app.is_coming_soon === true || (app.is_coming_soon && app.is_coming_soon.booleanValue === true);
    const publishDateVal = getField(app, 'publish_date');
    const isActuallyComingSoon = Boolean(isComingSoonFlag && (!publishDateVal || new Date(publishDateVal).getTime() > Date.now()));
    const isVerified = getField(app, 'safety_status', 'Verified') === 'Verified';
    const isTopItem = idx <= 6;

    appsHtml += `
      <div class="relative group z-1">
        <a href="/app/${encodeURIComponent(slug)}" class="flex items-center gap-2 xs:gap-2.5 sm:gap-4 py-2 xs:py-2.5 pl-0.5 pr-10 sm:pl-3 sm:pr-12 sm:py-3 mb-0 sm:mb-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200 rounded-xl sm:rounded-2xl relative active:bg-black/5 dark:active:bg-white/5 w-full" title="${escapeHtml(name)}">
          <div class="w-4 xs:w-5 sm:w-6 text-xs xs:text-[13px] sm:text-base font-black text-zinc-400 dark:text-zinc-500 text-center shrink-0 tabular-nums">
            ${i + 1}
          </div>
          <div class="relative w-[54px] h-[54px] xs:w-[60px] xs:h-[60px] sm:w-[76px] sm:h-[76px] shrink-0">
            <div class="w-full h-full rounded-[14px] xs:rounded-[16px] sm:rounded-[20px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-sm border border-black/5 dark:border-white/10 relative z-10 transition-transform group-hover:-translate-y-0.5 duration-300 flex items-center justify-center">
              <img src="${escapeHtml(icon)}" ${isTopItem ? 'loading="eager" fetchpriority="high"' : 'loading="lazy" fetchpriority="low"'} decoding="async" width="76" height="76" class="w-full h-full object-cover block" alt="${escapeHtml(name)} app icon"/>
            </div>
            ${isHot && isNew ? `<div class="absolute -top-1.5 -right-1.5 z-20 pointer-events-none"><span class="inline-flex items-center rounded-[6px] xs:rounded-[7px] overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.18)] font-black text-[8px] xs:text-[9px] uppercase tracking-wider"><span class="bg-[#d32f2f] text-white px-1.5 py-0.5">HOT</span><span class="bg-[#008738] text-white px-1.5 py-0.5">NEW</span></span></div>` : isHot ? `<div class="absolute -top-1.5 -right-1.5 z-20 pointer-events-none"><span class="bg-[#d32f2f] text-white text-[8px] xs:text-[9px] font-black px-1.5 py-0.5 rounded-[6px] xs:rounded-[8px] shadow-[0_2px_6px_rgba(0,0,0,0.15)] uppercase tracking-wider block">HOT</span></div>` : isNew ? `<div class="absolute -top-1.5 -right-1.5 z-20 pointer-events-none"><span class="bg-[#008738] text-white text-[8px] xs:text-[9px] font-black px-1.5 py-0.5 rounded-[6px] xs:rounded-[8px] shadow-[0_2px_6px_rgba(0,0,0,0.15)] uppercase tracking-wider block">NEW</span></div>` : ''}
          </div>
          <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
            <h3 class="font-semibold text-[14px] xs:text-[15px] sm:text-base tracking-tight text-zinc-900 dark:text-zinc-100 truncate w-full">${escapeHtml(name)}</h3>
            <div class="text-xs sm:text-[13px] font-normal text-zinc-500 dark:text-zinc-400 truncate">${escapeHtml(category)}</div>
            <div class="flex items-center gap-1 text-[11px] xs:text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
              <span>${rating}</span>
              <svg class="w-3 h-3 fill-current text-amber-400" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              ${isVerified ? `<svg class="w-3.5 h-3.5 text-blue-500 shrink-0 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>` : ''}
            </div>
          </div>
          ${isActuallyComingSoon ? `<div class="shrink-0 pr-1"><div class="bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 text-[10px] font-black rounded-full tracking-wider">SOON</div></div>` : ''}
          <div class="absolute bottom-0 right-4 left-[84px] xs:left-[98px] sm:left-[140px] border-b border-black/5 dark:border-white/5 opacity-50 transition-opacity group-hover:opacity-0"></div>
        </a>
        <div class="absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 z-20">
          <button type="button" aria-expanded="false" aria-haspopup="true" class="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-full transition-colors cursor-pointer relative" aria-label="More options">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>
      </div>
    `;
  });

  const newApps = sortedAll.filter(a => a.is_new === true || (a.is_new && a.is_new.booleanValue === true));
  let newAdditionsHtml = '';
  if (isHomeTab && newApps.length > 0) {
    newAdditionsHtml = `
      <aside data-nosnippet class="px-0 animate-fade-in">
        <h2 class="text-base xs:text-lg sm:text-xl font-bold mb-2 xs:mb-3 mt-1.5 xs:mt-3 sm:mt-4 text-zinc-900 dark:text-zinc-100 flex items-center px-0">
          New Additions <svg class="w-4 h-4 xs:w-5 xs:h-5 text-blue-500 fill-blue-500/20 ml-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>
        </h2>
        <div class="flex overflow-x-auto gap-2.5 xs:gap-3 sm:gap-4 px-2.5 sm:px-1 pt-2 pb-2 mb-1.5 scrollbar-none snap-x snap-mandatory -mx-2.5 sm:mx-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          ${newApps.slice(0, 10).map((app, index) => {
            const nSlug = getField(app, 'slug');
            const nName = getField(app, 'name');
            const nIcon = optimizeImageUrl(getField(app, 'icon_url'), 120);
            const nIsHot = app.is_hot === true || (app.is_hot && app.is_hot.booleanValue === true);
            const nIsNew = app.is_new === true || (app.is_new && app.is_new.booleanValue === true);
            return `
              <div class="flex-none w-[70px] xs:w-[78px] sm:w-[96px] snap-start">
                <a href="/app/${encodeURIComponent(nSlug)}" class="flex flex-col gap-1.5 xs:gap-2 group" title="${escapeHtml(nName)}">
                  <div class="relative w-full aspect-square">
                    <div class="w-full h-full rounded-[16px] xs:rounded-[20px] sm:rounded-[24px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-black/5 dark:border-white/10 shadow-sm group-hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.1)] transition-all flex items-center justify-center">
                      <img src="${escapeHtml(nIcon)}" ${index < 6 ? 'loading="eager"' : 'loading="lazy"'} ${index === 0 ? 'fetchpriority="high"' : 'fetchpriority="low"'} decoding="async" width="104" height="104" class="w-full h-full object-cover group-hover:-translate-y-0.5 transition-transform duration-300 block" alt="${escapeHtml(nName)}"/>
                    </div>
                    ${nIsHot && nIsNew ? `<div class="absolute -top-1.5 -right-1.5 z-20 pointer-events-none"><span class="inline-flex items-center rounded-[7px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.18)] font-black text-[8px] sm:text-[9px] uppercase tracking-wider"><span class="bg-[#d32f2f] text-white px-1.5 py-0.5">HOT</span><span class="bg-[#008738] text-white px-1.5 py-0.5">NEW</span></span></div>` : nIsHot ? `<div class="absolute -top-1.5 -right-1.5 z-20 pointer-events-none"><span class="bg-[#d32f2f] text-white text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-[7px] shadow-[0_2px_8px_rgba(0,0,0,0.15)] uppercase tracking-wider block">HOT</span></div>` : `<div class="absolute -top-1.5 -right-1.5 z-20 pointer-events-none"><span class="bg-[#008738] text-white text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-[7px] shadow-[0_2px_8px_rgba(0,0,0,0.15)] uppercase tracking-wider block">NEW</span></div>`}
                  </div>
                  <div class="px-0.5 text-center"><h3 class="text-[11px] xs:text-xs font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-tight">${escapeHtml(nName)}</h3></div>
                </a>
              </div>
            `;
          }).join('')}
        </div>
      </aside>
    `;
  }

  let featuredBannerHtml = '';
  if (!isCategoriesTab && !isTopChartsTab && Array.isArray(bannerItems) && bannerItems.length > 0) {
    const rawBannerImg = bannerItems[0]?.image || bannerItems[0]?.image_url || '';
    const bannerSrc = optimizeImageUrl(rawBannerImg, 600);
    const bannerSrcSet = rawBannerImg ? `${escapeHtml(optimizeImageUrl(rawBannerImg, 400))} 400w, ${escapeHtml(optimizeImageUrl(rawBannerImg, 600))} 600w, ${escapeHtml(optimizeImageUrl(rawBannerImg, 800))} 800w` : '';
    const bannerTitle = bannerItems[0]?.title || '';
    const bannerSubtitle = bannerItems[0]?.subtitle || '';
    featuredBannerHtml = `
      <div class="w-full relative px-0 sm:px-4 max-w-4xl mx-auto mb-3.5 sm:mb-5 group/carousel select-none">
        <div class="w-full overflow-hidden rounded-2xl sm:rounded-[20px] shadow-sm sm:border border-zinc-100 dark:border-zinc-800/80 bg-zinc-900 relative h-[144px] xs:h-[156px] sm:h-[175px] md:h-[195px] touch-pan-y">
          <div class="flex h-full w-full">
            <div class="w-full shrink-0 h-full relative">
              <a href="${escapeHtml(bannerItems[0]?.link || '/')}" class="h-full block flex-shrink-0">
                <div class="w-full h-full relative overflow-hidden select-none pointer-events-none bg-gradient-to-br from-slate-900 via-blue-950 to-zinc-900">
                  ${rawBannerImg ? `<img src="${escapeHtml(bannerSrc)}" ${bannerSrcSet ? `srcset="${bannerSrcSet}" sizes="(max-width: 640px) 100vw, 800px"` : ''} alt="${escapeHtml(bannerTitle || 'Featured banner')}" width="800" height="400" loading="eager" fetchpriority="high" decoding="async" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 pointer-events-none"/>` : ''}
                  <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent"></div>
                  <div class="absolute inset-x-0 bottom-0 p-3.5 pb-6 sm:p-5 sm:pb-7 flex flex-col justify-end">
                    <div class="flex items-center gap-1.5 mb-1.5 bg-black/45 px-2.5 py-0.5 rounded-full border border-white/15 w-fit">
                      <svg class="w-3 h-3 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                      <span class="text-white text-[10px] font-bold uppercase tracking-wider">Featured</span>
                    </div>
                    <div>
                      <h3 class="text-white text-base sm:text-lg md:text-xl font-black tracking-tight leading-snug mb-0.5 text-left line-clamp-1">${escapeHtml(bannerTitle)}</h3>
                      ${bannerSubtitle ? `<p class="text-white/85 text-xs font-medium leading-tight line-clamp-1 text-left">${escapeHtml(bannerSubtitle)}</p>` : ''}
                    </div>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
        ${bannerItems.length > 1 ? `
          <div class="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1.5 z-10">
            ${bannerItems.map((_: any, bi: number) => `
              <button type="button" class="group/dot focus:outline-none cursor-pointer p-1.5" aria-label="Go to slide ${bi + 1}">
                <div class="h-1.5 rounded-full transition-all duration-300 ${bi === 0 ? 'w-[18px] bg-white' : 'w-[6px] bg-white/45'}"></div>
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  const rawCategories = Array.isArray(settings?.categories) && settings.categories.length > 0
    ? settings.categories
    : ['All Apps', 'Games', 'Apps', 'Entertainment'];

  const hasRootTab = rawCategories.some((c: string) => {
    const l = String(c || '').toLowerCase();
    return l === 'all' || l === 'all apps' || l === 'home' || l === 'apps';
  });
  const baseCategories = hasRootTab ? [...rawCategories] : ['All Apps', ...rawCategories];
  if (
    activeTab &&
    !isHomeTab &&
    !baseCategories.some((t: string) => String(t || '').toLowerCase().trim() === activeTabLower)
  ) {
    baseCategories.push(activeTab);
  }
  const seenTab = new Set<string>();
  const categories = baseCategories.filter((tab: string) => {
    const l = String(tab || '').toLowerCase().trim();
    if (seenTab.has(l)) return false;
    seenTab.add(l);
    return true;
  });

  const getTabHref = (tab: string): string => {
    const lower = String(tab || '').toLowerCase().trim();
    if (lower === 'all apps' || lower === 'all' || lower === 'home' || lower === 'apps') return '/';
    if (lower === 'categories') return '/categories';
    if (lower === 'top charts') return '/?tab=Top%20Charts';
    const slug = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug ? `/category/${encodeURIComponent(slug)}` : '/';
  };

  const categoryTabsHtml = `
    <div class="h-0 w-full" aria-hidden="true"></div>
    <div class="mb-2.5 sm:mb-3 sticky top-14 sm:top-16 z-30 bg-[var(--bg-primary)] -mx-2.5 px-2.5 sm:mx-0 sm:px-0 py-1.5 border-b border-black/[0.05] dark:border-white/[0.06]">
      <div class="flex overflow-x-auto no-scrollbar gap-1.5 sm:gap-2">
        ${categories.map((c: string) => {
          const lower = String(c || '').toLowerCase().trim();
          const isSelected = lower === activeTabLower || (isHomeTab && (lower === 'all apps' || lower === 'all' || lower === 'home'));
          return `<a href="${getTabHref(c)}" class="whitespace-nowrap min-h-[34px] px-3 sm:px-3.5 text-xs sm:text-[13px] font-semibold transition-colors rounded-full border no-underline inline-flex items-center cursor-pointer shrink-0 ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-700/60 hover:bg-zinc-200/80 dark:hover:bg-zinc-700'}">${escapeHtml(c)}</a>`;
        }).join('')}
      </div>
    </div>
  `;

  const heroStyle = getField(settings, 'hero_title_style') || 'modern';
  const heroColor = getField(settings, 'hero_title_color') || 'classic-dark';
  let heroStyleClasses = 'font-sans font-black tracking-tight text-center leading-none text-base xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl';
  if (heroStyle === 'modern') {
    heroStyleClasses = 'font-sans font-black uppercase text-center tracking-tighter leading-none text-base xs:text-xl sm:text-3xl md:text-4xl';
  } else if (heroStyle === 'serif') {
    heroStyleClasses = 'font-serif font-black text-center italic leading-tight text-base xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl';
  } else if (heroStyle === 'mono') {
    heroStyleClasses = 'font-mono font-extrabold uppercase text-center tracking-tight leading-none text-sm xs:text-lg sm:text-2xl md:text-3xl';
  }

  let heroColorClasses = 'bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-900 bg-clip-text text-transparent dark:from-white dark:via-zinc-200 dark:to-zinc-300';
  let heroAmbientClasses = 'bg-zinc-500/15 dark:bg-zinc-700/15';
  let heroLineClasses = '';
  if (heroColor === 'emerald-indigo') {
    heroColorClasses = 'bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 bg-clip-text text-transparent';
    heroAmbientClasses = 'bg-emerald-500/30 dark:bg-indigo-500/15';
    heroLineClasses = 'bg-gradient-to-r from-emerald-400 to-indigo-500';
  } else if (heroColor === 'neon-sky') {
    heroColorClasses = 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 bg-clip-text text-transparent';
    heroAmbientClasses = 'bg-cyan-500/30 dark:bg-blue-500/15';
    heroLineClasses = 'bg-gradient-to-r from-cyan-400 to-blue-500';
  } else if (heroColor === 'sunset-fire') {
    heroColorClasses = 'bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 bg-clip-text text-transparent';
    heroAmbientClasses = 'bg-amber-500/30 dark:bg-rose-500/15';
    heroLineClasses = 'bg-gradient-to-r from-amber-400 to-rose-500';
  } else if (heroColor === 'cosmic-purple') {
    heroColorClasses = 'bg-gradient-to-r from-pink-500 via-fuchsia-600 to-purple-600 bg-clip-text text-transparent';
    heroAmbientClasses = 'bg-pink-500/30 dark:bg-purple-500/15';
    heroLineClasses = 'bg-gradient-to-r from-pink-400 to-purple-500';
  }

  const heroHtml = (heroVisible && (heroText || heroSubtitle)) ? `
    <div class="w-full relative py-1 sm:py-1.5 px-3 sm:px-4 overflow-hidden flex flex-col items-center justify-center text-center my-0">
      <div class="hidden sm:flex absolute inset-0 pointer-events-none items-center justify-center -z-10 overflow-hidden">
        <div class="w-[300px] h-[150px] rounded-full blur-[60px] mix-blend-multiply dark:mix-blend-screen opacity-8 transition-colors duration-500 ${heroAmbientClasses}"></div>
      </div>
      <div class="max-w-4xl mx-auto flex flex-col items-center justify-center gap-1">
        <h1 class="${heroStyleClasses} ${heroColorClasses} select-text block max-w-3xl filter drop-shadow-sm">
          ${escapeHtml(heroText)}
        </h1>
        ${heroSubtitle ? `<p class="text-[9px] sm:text-[10px] font-bold tracking-[0.18em] text-zinc-900/60 dark:text-zinc-100/60 uppercase max-w-2xl select-text pt-0.5 leading-tight">${escapeHtml(heroSubtitle)}</p>` : ''}
        <div class="h-[2px] w-12 rounded-full mt-1 bg-zinc-200 dark:bg-zinc-800 transition-all duration-300 ${heroLineClasses}"></div>
      </div>
    </div>
  ` : '';

  const filterBarHtml = isCategoriesTab ? '' : `
    <div class="px-0 mb-2.5 xs:mb-3.5 mt-0.5 xs:mt-1.5 flex flex-wrap items-center gap-2 xs:gap-3 justify-end">
      <div class="flex items-center gap-1.5 xs:gap-2.5 flex-wrap">
        <div class="relative">
          <div class="flex items-center gap-1.5 min-h-[36px] bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-1 shadow-xs text-xs sm:text-[13px] font-medium text-zinc-700 dark:text-zinc-300 select-none">
            <span class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>Rating: All</span>
            </span>
            <svg class="w-3.5 h-3.5 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
        <div class="relative">
          <div class="flex items-center gap-1.5 min-h-[36px] bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-1 shadow-xs text-xs sm:text-[13px] font-medium text-zinc-700 dark:text-zinc-300 select-none">
            <span class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/></svg>
              <span>Recommended</span>
            </span>
            <svg class="w-3.5 h-3.5 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>
    </div>
  `;

  let mainContentHtml = '';
  if (isCategoriesTab) {
    const seenGridCat = new Set<string>();
    const rawGridCats: string[] = Array.isArray(settings?.categories) ? settings.categories : [];
    const firstCatLower = String(rawGridCats[0] || 'all apps').toLowerCase();
    const uniqueGridCats = rawGridCats.filter((c: string) => {
      const l = String(c || '').toLowerCase();
      if (seenGridCat.has(l)) return false;
      seenGridCat.add(l);
      return l !== firstCatLower && l !== 'top charts' && l !== 'categories';
    });
    mainContentHtml = `
      <div class="grid grid-cols-2 gap-2.5 sm:gap-4 animate-fade-in px-0">
        ${uniqueGridCats.map((cat: string) => {
          const slug = String(cat || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          const href = slug ? `/category/${slug}` : '/categories';
          return `
            <a href="${href}" class="flex items-center gap-2.5 sm:gap-3.5 p-3 sm:p-4 min-h-[52px] glass-panel text-left active:scale-[0.98] transition-all duration-300 cursor-pointer no-underline">
              <div class="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 shrink-0">
                <svg class="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
              <span class="font-semibold text-xs xs:text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate">${escapeHtml(cat)}</span>
            </a>
          `;
        }).join('')}
      </div>
    `;
  } else if (isHomeTab) {
    mainContentHtml = `
      <div class="px-0 sm:px-1">
        <div class="space-y-2">
          ${appsHtml}
        </div>
      </div>
    `;
  } else {
    mainContentHtml = `
      <div class="animate-fade-in space-y-2 px-0 sm:px-1">
        ${sorted.length > 0 ? appsHtml : `
          <div class="text-center py-12 px-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800">
            <p class="text-base font-semibold text-zinc-700 dark:text-zinc-200 mb-3">No apps found in ${escapeHtml(activeTab)}</p>
            <a href="/" class="min-h-[40px] inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer no-underline">Browse All Apps</a>
          </div>
        `}
      </div>
    `;
  }

  const remainingApps = isCategoriesTab ? [] : sorted.slice(startIndex + pageSize);
  const fullDirectoryHtml = remainingApps.length > 0 ? `
    <nav aria-label="Complete Application Directory" data-nosnippet class="mt-8 pt-6 border-t border-zinc-200/80 dark:border-zinc-800/80">
      <h2 class="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3 uppercase tracking-wider">More Applications in Catalog (${remainingApps.length})</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        ${remainingApps.map((app) => {
          const rSlug = getField(app, 'slug');
          const rName = getField(app, 'name');
          return `<a href="/app/${encodeURIComponent(rSlug)}" class="min-h-[38px] flex items-center px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-zinc-200/60 dark:border-zinc-800/60 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 truncate no-underline transition-colors"><span class="truncate">${escapeHtml(rName)}</span></a>`;
        }).join('')}
      </div>
    </nav>
  ` : '';

  const paginationOrCaughtUpHtml = isCategoriesTab ? '' : (totalPages > 1 ? `
    <div class="py-8 flex flex-col items-center justify-center min-h-[72px]">
      <nav aria-label="Catalog pagination" class="flex items-center justify-center gap-2">
        ${currentPage > 1 ? `<a href="${currentPage === 2 ? '/' : `/?page=${currentPage - 1}`}" class="px-3.5 py-1.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition no-underline">Previous</a>` : ''}
        <span class="text-xs text-zinc-500 font-medium px-2">Page ${currentPage} of ${totalPages}</span>
        ${currentPage < totalPages ? `<a href="/?page=${currentPage + 1}" class="px-3.5 py-1.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition no-underline">Next</a>` : ''}
      </nav>
    </div>
  ` : (sorted.length > 0 ? `
    <div class="pt-4 pb-2 flex flex-col items-center justify-center text-center">
      <div class="flex items-center gap-3 w-full max-w-xs justify-center mb-1">
        <div class="h-px flex-1 bg-slate-200 dark:bg-zinc-800"></div>
        <span class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">You&#039;re all caught up</span>
        <div class="h-px flex-1 bg-slate-200 dark:bg-zinc-800"></div>
      </div>
      <p class="text-xs text-slate-400 dark:text-zinc-600">Showing all ${sorted.length} verified applications</p>
    </div>
  ` : ''));

  const validFaqs = Array.isArray(settings?.website_faqs)
    ? settings.website_faqs.filter((f: any) => f && f.question && f.answer)
    : [];

  return `
    <div class="select-none min-h-screen">
      ${heroHtml}
      ${featuredBannerHtml}
      ${newAdditionsHtml}
      ${categoryTabsHtml}
      ${filterBarHtml}
      ${mainContentHtml}
      ${paginationOrCaughtUpHtml}
      ${fullDirectoryHtml}

      ${validFaqs.length > 0 ? `
        <section aria-labelledby="home-faq-heading" class="mt-7 sm:mt-12 mb-6 px-0 max-w-5xl mx-auto w-full select-none">
          <div class="bg-zinc-50/80 dark:bg-[#080c18]/80 border border-zinc-200/80 dark:border-white/[0.08] rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-xs">
            <div class="flex items-center justify-between mb-3.5 sm:mb-5 pb-3 border-b border-zinc-200/80 dark:border-white/[0.08]">
              <div class="flex items-center gap-2 sm:gap-3">
                <div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                  <svg class="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                </div>
                <div>
                  <h2 id="home-faq-heading" class="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Frequently Asked Questions</h2>
                </div>
              </div>
              <span class="text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-200/70 dark:bg-white/[0.06] px-2.5 py-0.5 rounded-full shrink-0">${validFaqs.length} FAQs</span>
            </div>
            <div class="space-y-2 sm:space-y-3">
              ${validFaqs.map((faq: any) => `
                <details class="group rounded-xl sm:rounded-2xl border border-zinc-200/90 dark:border-white/[0.07] bg-white dark:bg-[#0c101d] hover:border-blue-500/30 dark:hover:border-cyan-500/30 transition-all duration-200 overflow-hidden shadow-xs" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                  <summary class="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2.5 p-3 sm:p-4 min-h-[46px] text-left cursor-pointer focus:outline-hidden select-none group-open:bg-zinc-50/50 dark:group-open:bg-white/[0.02]">
                    <span class="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-1">
                      <span class="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-cyan-400 text-[11px] font-black flex items-center justify-center shrink-0">Q</span>
                      <span itemprop="name" class="text-[13.5px] sm:text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">${escapeHtml(cleanFaqQuestion(faq.question))}</span>
                    </span>
                    <div class="w-7 h-7 rounded-full bg-zinc-100 dark:bg-white/[0.06] text-zinc-500 dark:text-zinc-400 flex items-center justify-center shrink-0">
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </summary>
                  <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer" class="px-3.5 sm:px-4 pb-3.5 pt-2.5 border-t border-zinc-100 dark:border-white/[0.05] text-[13.5px] sm:text-[15px] text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50/30 dark:bg-black/10">
                    <div itemprop="text" class="prose prose-zinc dark:prose-invert prose-sm max-w-none w-full break-words leading-relaxed pl-0 sm:pl-7">
                      ${sanitizeHtml(String(faq.answer || ''))}
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
    const rawIcon = getField(app, 'icon_url') || '/logo.png';
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
    const rawIcon = getField(app, 'icon_url') || '/logo.png';
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
