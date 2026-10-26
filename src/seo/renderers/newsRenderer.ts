import { getField, optimizeImageUrl } from '../utils';
import { escapeHtml, sanitizeHtml } from './common';
import { formatNewsDate, calculateReadingTime, getNextNewsChain } from '../../lib/newsUtils';

export function renderNewsList(news: any[], _settings: any, pageNum: number = 1): string {
  const publicNewsList = (Array.isArray(news) ? news : [])
    .filter(item => item && item.sync_to_public !== false)
    .sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const dateA = new Date(getField(a, 'date') || getField(a, 'published_at') || getField(a, 'created_at') || 0).getTime();
      const dateB = new Date(getField(b, 'date') || getField(b, 'published_at') || getField(b, 'created_at') || 0).getTime();
      return dateB - dateA;
    });

  const catSet = new Set<string>();
  publicNewsList.forEach(item => {
    const c = getField(item, 'category');
    if (c && c.trim()) catSet.add(c.trim());
  });
  const categories = ['All', ...Array.from(catSet)];

  const ITEMS_PER_PAGE = 9;
  const totalPages = Math.max(1, Math.ceil(publicNewsList.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(1, pageNum || 1), totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const currentSlice = publicNewsList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  let cards = '';
  currentSlice.forEach((n, idx) => {
    const title = getField(n, 'title');
    const slug = getField(n, 'slug') || getField(n, 'id');
    const logo = getField(n, 'image_url') || getField(n, 'logo_url') || getField(n, 'image');
    const optimizedLogo = logo ? optimizeImageUrl(logo, 600) : '';
    const dateLabel = formatNewsDate(getField(n, 'date'), getField(n, 'published_at'), getField(n, 'created_at'));
    const category = getField(n, 'category') || '';
    const desc = (getField(n, 'description') || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    const isEager = idx < 3;

    cards += `
      <article class="group relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80 overflow-hidden shadow-xs transition-all duration-300 flex flex-col text-left">
        <a href="/news/${encodeURIComponent(slug)}" class="block flex-1 flex flex-col focus:outline-none no-underline" aria-label="Read full news article: ${escapeHtml(title)}">
          <div class="w-full aspect-[16/9] overflow-hidden bg-zinc-100 dark:bg-zinc-800/60 relative shrink-0">
            ${optimizedLogo ? `
              <img src="${escapeHtml(optimizedLogo)}" alt="${escapeHtml(title)}" loading="${isEager ? 'eager' : 'lazy'}" decoding="async" width="600" height="338" class="w-full h-full object-cover object-center block" />
            ` : `
              <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
                <span class="text-xl font-black text-blue-600/30 dark:text-blue-400/30 tracking-widest uppercase">News</span>
              </div>
            `}
          </div>
          <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-2 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-2">
                ${category ? `<span class="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[10px]">${escapeHtml(category)}</span>` : '<span class="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">News</span>'}
                ${dateLabel ? `<span>•</span><span>${escapeHtml(dateLabel)}</span>` : ''}
              </div>
              <h2 class="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2 mb-2">${escapeHtml(title)}</h2>
              ${desc ? `<p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed font-normal">${escapeHtml(desc)}</p>` : ''}
            </div>
            <div class="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
              <span class="text-xs font-semibold text-blue-600 dark:text-blue-400">Read story</span>
            </div>
          </div>
        </a>
      </article>
    `;
  });

  let paginationHtml = '';
  if (totalPages > 1) {
    const delta = 1;
    const range: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safeCurrentPage - delta && i <= safeCurrentPage + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    const getPageUrl = (p: number) => (p <= 1 ? '/news' : `/news?page=${p}`);
    paginationHtml = `
      <nav aria-label="News pagination" class="mt-10 flex items-center justify-center gap-1.5 sm:gap-2">
        ${safeCurrentPage > 1 ? `
          <a href="${getPageUrl(safeCurrentPage - 1)}" class="p-2 sm:px-3 sm:py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer no-underline" aria-label="Previous page">
            <span class="hidden sm:inline">Previous</span>
          </a>
        ` : `
          <span class="p-2 sm:px-3 sm:py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 opacity-40 cursor-not-allowed flex items-center gap-1 text-xs font-semibold select-none" aria-disabled="true">
            <span class="hidden sm:inline">Previous</span>
          </span>
        `}
        ${range.map((p) => {
          if (p === '...') {
            return `<span class="px-2 py-1 text-xs text-zinc-400 select-none">...</span>`;
          }
          const pNum = Number(p);
          const isCurr = pNum === safeCurrentPage;
          return `<a href="${getPageUrl(pNum)}" ${isCurr ? 'aria-current="page"' : ''} class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer no-underline ${isCurr ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 pointer-events-none' : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'}">${p}</a>`;
        }).join('')}
        ${safeCurrentPage < totalPages ? `
          <a href="${getPageUrl(safeCurrentPage + 1)}" class="p-2 sm:px-3 sm:py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer no-underline" aria-label="Next page">
            <span class="hidden sm:inline">Next</span>
          </a>
        ` : `
          <span class="p-2 sm:px-3 sm:py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 opacity-40 cursor-not-allowed flex items-center gap-1 text-xs font-semibold select-none" aria-disabled="true">
            <span class="hidden sm:inline">Next</span>
          </span>
        `}
      </nav>
    `;
  }

  const remainingNews = publicNewsList.slice(ITEMS_PER_PAGE);
  const fullNewsArchiveHtml = remainingNews.length > 0 ? `
    <nav aria-label="Complete News Archive" data-nosnippet class="mt-10 pt-6 border-t border-zinc-200/80 dark:border-zinc-800/80 px-3 sm:px-0">
      <h2 class="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3 uppercase tracking-wider">More News &amp; Updates (${remainingNews.length})</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        ${remainingNews.map((n: any) => {
          const nTitle = getField(n, 'title') || 'News Article';
          const nSlug = getField(n, 'slug') || getField(n, 'id');
          return `<a href="/news/${encodeURIComponent(nSlug)}" class="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-zinc-200/60 dark:border-zinc-800/60 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 truncate no-underline transition-colors">${escapeHtml(nTitle)}</a>`;
        }).join('')}
      </div>
    </nav>
  ` : '';

  return `
    <div class="w-full text-zinc-900 dark:text-zinc-100 pb-20 text-left min-h-[70vh]">
      <div class="pt-0.5 pb-0.5 px-3 sm:px-0">
        <a href="/" class="inline-flex items-center gap-2 text-sm sm:text-base font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors group shrink-0 no-underline">
          <div class="p-1.5 sm:p-2 rounded-full bg-blue-50 dark:bg-blue-900/30 shadow-xs">
            <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5M12 19l-7-7 7-7"></path></svg>
          </div>
          <span>Back to storefront</span>
        </a>
      </div>
      <div class="px-3 sm:px-0 mt-0.5 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">News &amp; Updates</h1>
        <div class="relative w-full sm:w-80 shrink-0">
          <input type="text" readonly class="w-full py-2.5 pl-10 pr-9 text-sm text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/80 rounded-xl placeholder-zinc-400 font-medium" placeholder="Search news or topics..." aria-label="Search news articles" />
        </div>
      </div>
      ${categories.length > 1 ? `
        <div class="px-3 sm:px-0 mb-6 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          ${categories.map((cat, i) => `
            <span class="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${i === 0 ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400'}">${escapeHtml(cat)}</span>
          `).join('')}
        </div>
      ` : ''}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 px-3 sm:px-0">
        ${cards || '<p class="text-zinc-400 py-10 col-span-full text-center">No news articles found</p>'}
      </div>
      ${paginationHtml}
      ${fullNewsArchiveHtml}
    </div>
  `;
}

function checkAppIsNew(item: any): boolean {
  if (!item) return false;
  if (item.is_new === true || item.is_new === 'true' || item.is_new === 1) return true;
  if (item.isNew === true || item.isNew === 'true' || item.isNew === 1) return true;
  const isNewVal = String(getField(item, 'is_new', '')).trim().toLowerCase();
  if (isNewVal === 'true' || isNewVal === '1') return true;
  const badge = String(getField(item, 'badge', '')).trim().toLowerCase();
  return badge === 'new' || badge === 'hot';
}

export function renderNewsDetail(slug: string, news: any[], settings: any, apps: any[] = []): string {
  const cleanSlug = decodeURIComponent(slug).toLowerCase().trim().replace(/\/+$/, '');
  const item = news.find(n => (getField(n, 'slug') || '').toLowerCase().trim() === cleanSlug || (getField(n, 'id') || '').toLowerCase().trim() === cleanSlug);
  if (!item) return `<div class="py-12 text-center"><h1 class="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">News Article Not Found</h1><p class="text-sm text-zinc-500 mb-6">The requested news publication could not be located.</p><a href="/news" class="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:underline">View All News</a></div>`;
  
  const title = getField(item, 'title');
  const formattedDate = formatNewsDate(getField(item, 'date'), getField(item, 'published_at'), getField(item, 'created_at'));

  const author = getField(item, 'ceo_name') || getField(item, 'author') || 'Editorial Team';
  const cat = getField(item, 'category', 'General');
  const description = getField(item, 'description', '');

  // Calculate estimated reading time identically on SSR and client
  const readingTime = calculateReadingTime(getField(item, 'content') || getField(item, 'description_html') || description);

  // Find related app only if explicitly linked by related_app_id or link
  let relatedApp: any = null;
  const relId = getField(item, 'related_app_id');
  if (relId && Array.isArray(apps)) {
    relatedApp = apps.find(a => (getField(a, 'id') || '').toLowerCase() === relId.toLowerCase() || (getField(a, 'slug') || '').toLowerCase() === relId.toLowerCase());
  }
  if (!relatedApp && getField(item, 'link') && Array.isArray(apps)) {
    const linkSlug = getField(item, 'link').replace(/^.*\/app\//, '').replace(/\/$/, '').split(/[?#]/)[0].toLowerCase();
    if (linkSlug) {
      relatedApp = apps.find(a => (getField(a, 'slug') || '').toLowerCase() === linkSlug || (getField(a, 'id') || '').toLowerCase() === linkSlug);
    }
  }

  // Determine body content strictly from the news article itself
  let rawContent = getField(item, 'content') || getField(item, 'description_html');
  if (!rawContent || rawContent.trim().length === 0) {
    rawContent = `<p>${escapeHtml(description)}</p>`;
  }

  const sanitizedContent = sanitizeHtml(rawContent);
  const logo = getField(item, 'image') || getField(item, 'image_url') || getField(item, 'logo_url') || getField(item, 'og_image_url');
  const optimizedLogo480 = logo ? optimizeImageUrl(logo, 480) : '';
  const optimizedLogo800 = logo ? optimizeImageUrl(logo, 800) : '';
  const optimizedLogo1200 = logo ? optimizeImageUrl(logo, 1200) : '';

  // Download / Action box (Matching NewsRelatedAppBox.tsx 1:1 without crawlable /moreinfo link)
  const appSlug = relatedApp ? (getField(relatedApp, 'slug') || getField(relatedApp, 'id')) : '';
  const appName = relatedApp ? getField(relatedApp, 'name') : (title || 'Featured App');
  const appIcon = relatedApp ? optimizeImageUrl(getField(relatedApp, 'icon_url') || getField(relatedApp, 'logo_url') || '', 128) : '';
  const detailUrl = appSlug ? `/app/${encodeURIComponent(appSlug)}` : '#';

  const renderActionBox = (marginClass: string) => (relatedApp || appSlug) ? `
    <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-blue-50/80 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm ${marginClass}">
      <div class="flex items-center gap-3.5 w-full sm:w-auto">
        ${appIcon ? `
          <img src="${escapeHtml(appIcon)}" alt="${escapeHtml(appName)}" width="52" height="52" class="w-[52px] h-[52px] rounded-2xl object-cover shadow-sm shrink-0 border border-black/5 dark:border-white/10" loading="lazy" decoding="async" />
        ` : `
          <div class="w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
            ${escapeHtml(appName?.[0] || 'R')}
          </div>
        `}
        <div class="min-w-0">
          <h4 class="text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate">
            ${escapeHtml(appName)}
          </h4>
        </div>
      </div>
      <div class="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
        ${appSlug ? `
          <a href="${escapeHtml(detailUrl)}" class="flex-1 sm:flex-none px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all no-underline" title="View App Details">
            <svg class="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <span>App Details</span>
          </a>
          <button type="button" class="flex-1 sm:flex-none px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer" title="Download">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            <span>Download</span>
          </button>
        ` : ''}
      </div>
    </div>
  ` : '';

  // 16 Category Similar Apps (2-row horizontal scroll carousel matching AppSimilarCarousel.tsx 1:1)
  let recommendedAppsHtml = '';
  if (Array.isArray(apps) && apps.length > 0) {
    const targetCategory = (relatedApp ? getField(relatedApp, 'category') : (getField(item, 'category') || 'Yono Apps')).trim();
    const cleanTargetCat = targetCategory.toLowerCase();
    const isAll = cleanTargetCat === 'all' || cleanTargetCat === 'all apps';
    const relAppId = relatedApp ? (getField(relatedApp, 'id') || '').toLowerCase() : '';
    const relAppSlug = relatedApp ? (getField(relatedApp, 'slug') || '').toLowerCase() : '';

    const newApps: any[] = [];
    const regularApps: any[] = [];
    let totalCatCount = 0;

    for (let i = 0; i < apps.length; i++) {
      const a = apps[i];
      if (!a) continue;

      const aId = (getField(a, 'id') || '').toLowerCase();
      const aSlug = (getField(a, 'slug') || '').toLowerCase();
      const isBaseApp = Boolean(relatedApp && (aId === relAppId || aSlug === relAppSlug));

      const aCat = (getField(a, 'category') || '').toLowerCase();
      const matches = isAll || aCat.includes(cleanTargetCat) || cleanTargetCat.includes(aCat);

      if (matches) {
        totalCatCount++;
        if (!isBaseApp) {
          if (checkAppIsNew(a)) {
            newApps.push(a);
          } else {
            regularApps.push(a);
          }
        }
      }
    }

    newApps.sort((a, b) => (Number(getField(a, 'serial_number')) || 999999) - (Number(getField(b, 'serial_number')) || 999999));
    regularApps.sort((a, b) => (Number(getField(a, 'serial_number')) || 999999) - (Number(getField(b, 'serial_number')) || 999999));

    const maxCount = 16;
    const strSeed = String(cleanSlug || getField(item, 'id') || '');
    let seedHash = 0;
    for (let i = 0; i < strSeed.length; i++) seedHash = ((seedHash << 5) - seedHash) + strSeed.charCodeAt(i);
    const absSeed = Math.abs(seedHash);

    const maxNewSlots = Math.min(newApps.length, 6);
    const pinnedNew: any[] = [];
    if (maxNewSlots > 0 && newApps.length > 0) {
      const newStart = absSeed % newApps.length;
      for (let s = 0; s < maxNewSlots; s++) {
        pinnedNew.push(newApps[(newStart + s) % newApps.length]);
      }
    }
    const remainingSlots = maxCount - pinnedNew.length;

    const pickedRegular: any[] = [];
    if (remainingSlots > 0 && regularApps.length > 0) {
      let startIndex = absSeed % regularApps.length;
      const baseSerial = Number(relatedApp ? getField(relatedApp, 'serial_number') : null);
      if (!isNaN(baseSerial) && baseSerial > 0) {
        const nextIdx = regularApps.findIndex((a: any) => (Number(getField(a, 'serial_number')) || 0) > baseSerial);
        if (nextIdx !== -1) startIndex = nextIdx;
      }

      const countToPick = Math.min(remainingSlots, regularApps.length);
      for (let step = 0; step < countToPick; step++) {
        const idx = (startIndex + step) % regularApps.length;
        pickedRegular.push(regularApps[idx]);
      }
    }

    const displaySimilarApps = [...pinnedNew, ...pickedRegular];

    if (displaySimilarApps.length > 0) {
      recommendedAppsHtml = `
        <aside data-nosnippet aria-labelledby="related-apps-heading" class="my-5 xs:my-6 px-0 text-left">
          <div class="flex items-center justify-between gap-2 mb-3 px-1 xs:px-2 sm:px-4 md:px-6">
            <div class="flex items-center gap-2 min-w-0">
              <h2 id="related-apps-heading" class="text-base xs:text-lg sm:text-xl font-bold flex items-center gap-1.5 xs:gap-2 text-zinc-900 dark:text-zinc-100 truncate">
                <span>Similar Applications</span>
                ${targetCategory && targetCategory !== 'All Apps' ? `<span class="text-[10px] xs:text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 xs:px-2.5 py-0.5 rounded-full border border-blue-200/50 dark:border-blue-800/50 truncate">${escapeHtml(targetCategory)}</span>` : ''}
              </h2>
            </div>
            <a href="/?tab=${encodeURIComponent(targetCategory)}" class="inline-flex items-center gap-1.5 px-3 py-1 xs:px-3.5 xs:py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 active:scale-95 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-bold text-xs xs:text-xs transition-all border border-blue-200/70 dark:border-blue-800/70 shadow-2xs group shrink-0 no-underline" title="Explore all ${totalCatCount} ${escapeHtml(targetCategory)} apps">
              <span>View all (${totalCatCount})</span>
              <svg class="w-3 h-3 xs:w-3.5 xs:h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </a>
          </div>
          <div class="grid grid-rows-2 grid-flow-col gap-x-3 xxs:gap-x-4 xs:gap-x-5 gap-y-3 xxs:gap-y-3.5 xs:gap-y-4 overflow-x-auto pt-2.5 pb-2 snap-x snap-proximity [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-2 xs:-mx-4 px-2 xs:px-4 sm:mx-0 sm:px-0" style="-webkit-overflow-scrolling: touch;">
            ${displaySimilarApps.map((sim) => {
              const simName = getField(sim, 'name');
              const simSlug = getField(sim, 'slug');
              const simIcon = optimizeImageUrl(getField(sim, 'icon_url') || '', 96);
              const simIsHot = sim.is_hot === true || (sim.is_hot && sim.is_hot.booleanValue === true);
              const simIsNew = checkAppIsNew(sim);
              return `
                <a href="/app/${encodeURIComponent(simSlug)}" class="flex flex-col items-center justify-start gap-1 xxs:gap-1.5 xs:gap-2 w-[68px] xxs:w-[76px] xs:w-[86px] sm:w-[98px] snap-start group shrink-0 active:scale-95 transition-transform duration-150 ease-out no-underline">
                  <div class="relative inline-block shrink-0">
                    <img src="${escapeHtml(simIcon)}" alt="${escapeHtml(simName)}" width="86" height="86" decoding="async" fetchpriority="low" class="w-[58px] h-[58px] xxs:w-[66px] xxs:h-[66px] xs:w-[76px] xs:h-[76px] sm:w-[86px] sm:h-[86px] rounded-[24%] shadow-[0_2px_8px_rgba(0,0,0,0.08)] object-cover group-hover:scale-105 transition-transform duration-200 block pointer-events-none select-none" loading="lazy" />
                    ${simIsHot && simIsNew ? '<span class="absolute -top-1.5 -right-1.5 z-20 inline-flex items-center rounded-full overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.25)] border border-white dark:border-zinc-900 font-black text-[7.5px] xxs:text-[8px] xs:text-[9px] uppercase tracking-wider leading-none select-none pointer-events-none"><span class="bg-[#d32f2f] text-white px-1 xs:px-1.5 py-0.5">HOT</span><span class="bg-[#008738] text-white px-1 xs:px-1.5 py-0.5">NEW</span></span>' : simIsHot ? '<span class="absolute -top-1.5 -right-1.5 z-20 bg-[#d32f2f] text-white font-black text-[7.5px] xxs:text-[8px] xs:text-[9px] px-1.5 py-0.5 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.25)] border border-white dark:border-zinc-900 uppercase tracking-wider leading-none select-none pointer-events-none flex items-center justify-center">HOT</span>' : simIsNew ? '<span class="absolute -top-1.5 -right-1.5 z-20 bg-[#008738] text-white font-black text-[7.5px] xxs:text-[8px] xs:text-[9px] px-1.5 py-0.5 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.25)] border border-white dark:border-zinc-900 uppercase tracking-wider leading-none select-none pointer-events-none flex items-center justify-center">NEW</span>' : ''}
                  </div>
                  <span class="text-[9.5px] xxs:text-[10.5px] xs:text-[11.5px] sm:text-[12px] font-semibold text-center text-zinc-800 dark:text-zinc-200 line-clamp-2 w-full px-0.5 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors pointer-events-none select-none">${escapeHtml(simName)}</span>
                </a>
              `;
            }).join('')}
          </div>
        </aside>
      `;
    }
  }

  const recentNews = getNextNewsChain(item, news, 6);

  const recentNewsHtml = recentNews.length > 0 ? `
    <section aria-labelledby="recent-news-heading" class="mt-8 pt-6 border-t border-zinc-200/80 dark:border-zinc-800/80 text-left">
      <div class="flex items-center justify-between gap-2 mb-4">
        <h2 id="recent-news-heading" class="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Latest News &amp; Updates
        </h2>
        <a href="/news" class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline no-underline">
          View all news →
        </a>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${recentNews.map((rn: any) => {
          const rnSlug = (getField(rn, 'slug') || getField(rn, 'id') || '').trim();
          const rnTitle = getField(rn, 'title') || 'News Article';
          const rnCat = getField(rn, 'category') || 'Update';
          const rnDate = formatNewsDate(getField(rn, 'date'), getField(rn, 'published_at'), getField(rn, 'created_at'));
          return `
            <a href="/news/${encodeURIComponent(rnSlug)}" class="p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-colors flex flex-col justify-between gap-1.5 no-underline">
              <h3 class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">${escapeHtml(rnTitle)}</h3>
              <div class="flex items-center gap-2 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                <span class="text-blue-600 dark:text-blue-400 font-semibold">${escapeHtml(rnCat)}</span>
                ${rnDate ? `<span>•</span><span>${escapeHtml(rnDate)}</span>` : ''}
              </div>
            </a>
          `;
        }).join('')}
      </div>
    </section>
  ` : '';

  // 1:1 Layout Match with NewsDetailPage.tsx
  return `
    <article class="max-w-3xl mx-auto px-3 sm:px-0 pb-20 text-left">
      <!-- 1. NewsArticleHeader -->
      <div class="flex items-center justify-between gap-3 px-1 sm:px-4 mb-4">
        <a href="/news" class="inline-flex items-center gap-2 text-xs xs:text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors group shrink-0 no-underline">
          <div class="p-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 group-hover:-translate-x-1 transition-transform">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </div>
          <span>Back to News</span>
        </a>
        <button type="button" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all border border-black/5 dark:border-white/10 shrink-0 cursor-pointer" title="Share article">
          <svg class="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
          <span>Share</span>
        </button>
      </div>

      <header class="mb-4 text-left px-1 sm:px-4">
        <div class="flex flex-wrap items-center gap-2 mb-2 text-xs">
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
            ${escapeHtml(cat)}
          </span>
          <span class="text-zinc-400 dark:text-zinc-500 flex items-center gap-1 font-medium">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            ${escapeHtml(formattedDate)}
          </span>
          <span class="text-zinc-300 dark:text-zinc-700">•</span>
          <span class="text-zinc-400 dark:text-zinc-500 flex items-center gap-1 font-medium">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ${escapeHtml(readingTime)}
          </span>
        </div>

        <h1 class="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight mb-3">
          ${escapeHtml(title)}
        </h1>

        <div class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          <span>Reported by</span>
          <span class="font-bold text-zinc-800 dark:text-zinc-200">${escapeHtml(author)}</span>
        </div>
      </header>

      ${logo ? `
        <div class="w-full aspect-video max-h-[420px] overflow-hidden mb-5 sm:mb-6 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 relative">
          <img src="${escapeHtml(optimizedLogo800)}" srcset="${escapeHtml(optimizedLogo480)} 480w, ${escapeHtml(optimizedLogo800)} 800w, ${escapeHtml(optimizedLogo1200)} 1200w" sizes="(max-width: 640px) 100vw, 768px" alt="${escapeHtml(title)}" width="1200" height="675" loading="eager" fetchpriority="high" decoding="async" class="w-full h-full object-cover block rounded-2xl" />
        </div>
      ` : ''}

      <!-- 2. Top NewsRelatedAppBox -->
      ${renderActionBox('my-5 sm:my-6')}

      <!-- 3. Article Content Body -->
      <div class="prose dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200 leading-relaxed text-sm sm:text-base space-y-4 font-normal mt-6">
        ${sanitizedContent}
      </div>

      <!-- 4. Bottom NewsRelatedAppBox -->
      ${renderActionBox('my-8')}

      <!-- 5. Similar Applications (Isolated below primary article body) -->
      ${recommendedAppsHtml}

      <!-- 6. Latest News & Updates Internal Linking -->
      ${recentNewsHtml}
    </article>
  `;
}
