import { getField, optimizeImageUrl, stripHtml, cleanFaqQuestion, generateNaturalStarDistribution } from '../utils';
import { resolveAppSlug } from '../../lib/slugResolver';
import communityCatalogStats from '../../lib/communityCatalogStats.json';
import { formatReviewDate } from '../../lib/communityFirebase';
import { escapeHtml, sanitizeHtml } from './common';

const AVATAR_COLORS = [
  'bg-emerald-500 text-emerald-100',
  'bg-sky-500 text-sky-100',
  'bg-violet-500 text-violet-100',
  'bg-amber-500 text-amber-100',
  'bg-rose-500 text-rose-100',
  'bg-indigo-500 text-indigo-100',
  'bg-teal-500 text-teal-100',
];

function getAvatarStyle(name: string): string {
  const index = name ? name.toLowerCase().charCodeAt(0) % AVATAR_COLORS.length : 0;
  return AVATAR_COLORS[index];
}

const RICH_HTML_CONTENT_STYLE = `
  w-full text-xs xs:text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed
  [&_strong]:text-blue-600 dark:[&_strong]:text-blue-400 [&_strong]:font-semibold
  [&_b]:text-blue-600 dark:[&_b]:text-blue-400 [&_b]:font-semibold
  [&_p]:mb-3 [&_p]:leading-relaxed [&_p]:text-zinc-700 dark:[&_p]:text-zinc-300
  [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:font-semibold [&_a]:underline [&_a]:hover:text-blue-700
  [&_h1]:text-base sm:[&_h1]:text-2xl [&_h1]:font-black [&_h1]:tracking-tight [&_h1]:text-zinc-900 dark:[&_h1]:text-zinc-100 [&_h1]:mt-4 [&_h1]:mb-2
  [&_h2]:text-sm sm:[&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-zinc-900 dark:[&_h2]:text-zinc-100 [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:pt-2.5 [&_h2]:border-t [&_h2]:border-zinc-200/80 dark:[&_h2]:border-zinc-800/80 [&_h2:first-child]:border-t-0 [&_h2:first-child]:pt-0 [&_h2:first-child]:mt-0
  [&_h3]:text-xs sm:[&_h3]:text-lg [&_h3]:font-bold [&_h3]:tracking-tight [&_h3]:text-zinc-900 dark:[&_h3]:text-zinc-100 [&_h3]:mt-3.5 [&_h3]:mb-1.5
  [&_h4]:text-[11px] sm:[&_h4]:text-base [&_h4]:font-semibold [&_h4]:tracking-tight [&_h4]:text-zinc-900 dark:[&_h4]:text-zinc-100 [&_h4]:mt-3 [&_h4]:mb-1
  [&_ul]:my-2.5 [&_ul]:space-y-1 [&_ul]:list-disc [&_ul]:pl-4 xs:[&_ul]:pl-5
  [&_ol]:my-2.5 [&_ol]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-4 xs:[&_ul]:pl-5
  [&_li]:leading-relaxed [&_li]:pl-1 [&_li::marker]:text-blue-600 dark:[&_li::marker]:text-blue-400 [&_li::marker]:font-bold
  [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-3.5 [&_blockquote]:py-1.5 [&_blockquote]:my-3 [&_blockquote]:bg-blue-50/50 dark:[&_blockquote]:bg-blue-950/20 [&_blockquote]:rounded-r-xl [&_blockquote]:italic
  [&_.art]:hidden [&_svg.art]:hidden
`.trim().replace(/\s+/g, ' ');

export function renderAppDetails(slug: string, apps: any[], _settings: any, sampleReviews: any[] = [], liveStats: any = null, news: any[] = []): string {
  const cleanSlug = decodeURIComponent(slug).toLowerCase().trim().replace(/\/+$/, '');
  const app = resolveAppSlug(cleanSlug, apps) || apps.find(a => getField(a, 'slug').toLowerCase() === cleanSlug || String(getField(a, 'id')).toLowerCase() === cleanSlug);
  if (!app) return `<div class="py-12 text-center"><h1 class="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">App Not Found</h1><a href="/" class="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Go Home</a></div>`;

  const name = getField(app, 'name');
  const cat = getField(app, 'category', 'Card Game');
  const version = getField(app, 'version', 'Latest');
  const size = getField(app, 'file_size', 'Variable');
  const developer = getField(app, 'developer', 'Verified Developer');
  const cleanId = String(getField(app, 'id')).toLowerCase().trim();
  const appIdExact = getField(app, 'id');

  // Compute relatedNewsArticles identically to AppDetails.tsx
  const nameLower = (name || '').toLowerCase().trim();
  const relatedNewsArticles = Array.isArray(news)
    ? news.filter((n: any) => {
        if (!n || n.sync_to_public === false) return false;
        const nRelId = getField(n, 'related_app_id');
        if (nRelId && (nRelId === appIdExact || String(nRelId).toLowerCase() === cleanSlug)) return true;
        if (!nameLower) return false;
        return (
          getField(n, 'title')?.toLowerCase().includes(nameLower) ||
          getField(n, 'description')?.toLowerCase().includes(nameLower) ||
          (Array.isArray(n.tags) && n.tags.some((t: string) => String(t).toLowerCase() === nameLower))
        );
      })
    : [];
  const relatedNewsCount = relatedNewsArticles.length;
  const primaryNewsSlug = (relatedNewsArticles.length > 0 && (getField(relatedNewsArticles[0], 'slug') || getField(relatedNewsArticles[0], 'id')))
    ? String(getField(relatedNewsArticles[0], 'slug') || getField(relatedNewsArticles[0], 'id')).trim()
    : '';
  const topNewsHref = primaryNewsSlug ? `/news/${encodeURIComponent(primaryNewsSlug)}` : `/news?q=${encodeURIComponent(name)}`;

  // Unified single source of truth for SEO ratings & counts
  const catStats = (communityCatalogStats as any)?.appCounts || {};
  const hit = (cleanId && catStats[cleanId]) || (cleanSlug && catStats[cleanSlug]);

  const rawRating = parseFloat(getField(app, 'rating')) || 4.5;
  const rawCount = parseInt(String(getField(app, 'review_count') || getField(app, 'reviews') || '0').replace(/[^0-9]/g, ''), 10) || 0;

  let finalRating = rawRating;
  let finalCount = rawCount;
  let rawStarCounts: Record<string, number> | null = null;

  if (liveStats && Number(liveStats.totalReviews) > 0) {
    finalRating = Number(liveStats.averageRating) || rawRating;
    finalCount = Number(liveStats.totalReviews) || rawCount;
    if (liveStats.starCounts && Object.values(liveStats.starCounts).some((v: any) => Number(v) > 0)) {
      rawStarCounts = liveStats.starCounts;
    }
  } else if (hit && Number(hit.published) > 0) {
    finalRating = Number(hit.avgRating) || rawRating;
    finalCount = Number(hit.published) || rawCount;
    if (hit.starCounts && Object.values(hit.starCounts).some((v: any) => Number(v) > 0)) {
      rawStarCounts = hit.starCounts;
    }
  } else if (sampleReviews.length > 0 && finalCount === 0) {
    finalCount = sampleReviews.length;
  }

  // Strictly slice to 5 initial reviews to match UserReviews.tsx (PAGE_SIZE = 5) and window.__INITIAL_DATA__.appReviews
  const validReviews = Array.isArray(sampleReviews)
    ? sampleReviews
        .filter((r: any) => r && stripHtml(r.reviewText || r.comment || '').trim().length >= 3)
        .slice(0, 5)
    : [];

  const totalCount = Math.max(finalCount, validReviews.length);
  const hasRealReviews = totalCount > 0;
  const ratingVal = finalRating || 4.8;
  const rating = ratingVal.toFixed(1);

  const starCounts: Record<string, number> = rawStarCounts || (hasRealReviews ? generateNaturalStarDistribution(ratingVal, totalCount) : { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 });
  const getPercentage = (starNum: number) => {
    if (!hasRealReviews || totalCount <= 0) return '0%';
    const count = starCounts[String(starNum)] || 0;
    const pct = Math.min(100, Math.max(0, Math.round((count / totalCount) * 100)));
    return `${pct}%`;
  };

  const rawIcon = getField(app, 'icon_url') || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=128&fit=crop';
  const icon = optimizeImageUrl(rawIcon, 512);

  const rawDesc = app.description_html ? sanitizeHtml(app.description_html) : `<p>Comprehensive application profile and details for <strong>${escapeHtml(name)}</strong>.</p>`;
  const desc = rawDesc;
  const rawFeatures = app.features_html ? sanitizeHtml(app.features_html) : '';
  const features = (rawFeatures && stripHtml(rawFeatures).toLowerCase() !== stripHtml(desc).toLowerCase()) ? rawFeatures : '';

  // Breadcrumbs category
  const mainCat = cat.split(',')[0].trim() || 'General';

  // Safety Advisory Messages
  const hasRed = Boolean(app.red_box_msg && app.red_box_msg.trim() !== '.' && app.red_box_msg.trim() !== '');
  const hasYellow = Boolean(app.yellow_box_msg && app.yellow_box_msg.trim() !== '.' && app.yellow_box_msg.trim() !== '');
  const hasIdea = Boolean(app.idea_box_msg && app.idea_box_msg.trim() !== '.' && app.idea_box_msg.trim() !== '');

  let alertsHtml = '';
  if (hasRed || hasYellow || hasIdea) {
    alertsHtml = `
      <div class="px-1 xs:px-2 sm:px-4 md:px-6 space-y-2.5 xs:space-y-3 mb-6 xs:mb-8 w-full text-left">
        ${hasRed ? `
          <div class="bg-rose-50/50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-3 xs:p-4 rounded-xl xs:rounded-2xl flex items-start gap-2.5 xs:gap-4 shadow-sm group">
            <div class="p-1.5 xs:p-2 bg-rose-100 dark:bg-rose-500/20 rounded-lg xs:rounded-xl text-rose-600 shrink-0">
              <svg class="w-4 h-4 xs:w-5 xs:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <div class="text-xs xs:text-sm font-medium text-rose-800 dark:text-rose-200 leading-relaxed pt-0.5">
              ${escapeHtml(app.red_box_msg)}
            </div>
          </div>
        ` : ''}
        ${hasYellow ? `
          <div class="bg-orange-50/50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 p-3 xs:p-4 rounded-xl xs:rounded-2xl flex items-start gap-2.5 xs:gap-4 shadow-sm group">
            <div class="p-1.5 xs:p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg xs:rounded-xl text-orange-600 shrink-0">
              <svg class="w-4 h-4 xs:w-5 xs:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div class="text-xs xs:text-sm font-medium text-orange-800 dark:text-orange-200 leading-relaxed pt-0.5">
              ${escapeHtml(app.yellow_box_msg)}
            </div>
          </div>
        ` : ''}
        ${hasIdea ? `
          <div class="bg-blue-50/50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 p-3 xs:p-4 rounded-xl xs:rounded-2xl flex items-start gap-2.5 xs:gap-4 shadow-sm group">
            <div class="p-1.5 xs:p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg xs:rounded-xl text-blue-600 shrink-0">
              <svg class="w-4 h-4 xs:w-5 xs:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
            </div>
            <div class="text-xs xs:text-sm font-medium text-blue-800 dark:text-blue-200 leading-relaxed pt-0.5">
              ${escapeHtml(app.idea_box_msg)}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // FAQs Accordion (strictly rendered from Admin database)
  let faqsHtml = '';
  const validFaqs = (Array.isArray(app.faqs) && app.faqs.length > 0)
    ? app.faqs.filter((f: any) => f && f.question && f.answer)
    : [];

  if (validFaqs.length > 0) {
    faqsHtml = `
      <section aria-labelledby="faq-heading" class="mb-8 sm:mb-12 px-1 sm:px-4 md:px-6 text-left">
        <div class="py-8 border-t border-black/5 dark:border-white/5">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h2 id="faq-heading" class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>
            <span class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
              ${validFaqs.length} FAQs
            </span>
          </div>
          <div class="space-y-3 sm:space-y-4">
            ${validFaqs.map((faq: any) => `
              <details class="group rounded-xl sm:rounded-2xl border transition-colors duration-200 overflow-hidden bg-slate-50/70 dark:bg-zinc-900/60 border-black/5 dark:border-white/5 open:bg-slate-50 open:dark:bg-zinc-900/90 open:border-blue-200 open:dark:border-blue-900/40 shadow-xs" open>
                <summary class="list-none [&::-webkit-details-marker]:hidden w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 select-none">
                  <h3 class="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-start gap-3">
                    <span class="text-blue-600 dark:text-blue-400 font-extrabold shrink-0 select-none">Q.</span>
                    <span class="leading-snug">${escapeHtml(cleanFaqQuestion(faq.question))}</span>
                  </h3>
                  <div class="p-1 rounded-lg transition-transform duration-200 shrink-0 text-zinc-400 dark:text-zinc-500 group-open:rotate-180 group-open:text-blue-600 group-open:dark:text-blue-400 group-open:bg-blue-50 group-open:dark:bg-blue-900/30">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </summary>
                <div class="px-4 sm:px-5 pb-5 pt-1 border-t border-black/5 dark:border-white/5 text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  <div class="pl-6 sm:pl-7 pt-2">
                    <div class="prose prose-zinc dark:prose-invert prose-sm sm:prose-base max-w-none w-full break-words overflow-wrap-anywhere whitespace-normal">
                      ${sanitizeHtml(faq.answer)}
                    </div>
                  </div>
                </div>
              </details>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  }

  // 1:1 SSR Match for UserReviews.tsx + ReviewScoreSummary.tsx + ReviewItem.tsx
  const renderStarSvg = (filled: boolean, sizeClass: string) =>
    `<svg class="${sizeClass} ${filled ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-700'}" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><polygon stroke-linecap="round" stroke-linejoin="round" stroke-width="2" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;

  let reviewsCardsHtml = '';
  if (validReviews.length > 0) {
    reviewsCardsHtml = validReviews.map((r: any) => {
      const rawName = (r.username && r.username.trim() && r.username.toLowerCase() !== 'player')
        ? r.username.trim()
        : ((r.userName && r.userName.trim()) ? r.userName.trim() : (r.username || 'Player'));
      const username = escapeHtml(rawName);
      const avatarStyle = getAvatarStyle(rawName);
      const revRating = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));
      const rawComment = (r.comment && r.comment.trim())
        ? r.comment.trim()
        : ((r.reviewText && r.reviewText.trim()) ? r.reviewText.trim() : '');
      const isLong = rawComment.length > 150;
      const displayedComment = isLong ? `${rawComment.substring(0, 150)}...` : rawComment;
      const dateStr = escapeHtml(formatReviewDate(r.created_at || r.timestamp));
      const helpfulCount = Number(r.helpful_count) || 0;
      const starsHtml = [1, 2, 3, 4, 5].map(s => renderStarSvg(s <= revRating, 'w-3 h-3')).join('');

      return `
        <div class="cv-auto p-3 xs:p-4 sm:p-5 border rounded-xl xs:rounded-2xl flex gap-2.5 xs:gap-3.5 sm:gap-4 transition-all text-left bg-zinc-50/50 dark:bg-zinc-900/30 border-black/5 dark:border-white/10">
          <div class="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-full font-black text-xs sm:text-sm flex items-center justify-center shrink-0 uppercase shadow-sm ${avatarStyle}">
            ${escapeHtml(rawName ? rawName.charAt(0).toUpperCase() : 'P')}
          </div>
          <div class="flex-1 flex flex-col min-w-0">
            <div class="flex items-center justify-between gap-4 mb-1">
              <div class="flex items-center gap-2 min-w-0">
                <span class="font-bold text-sm text-zinc-800 dark:text-zinc-200 truncate">${username}</span>
                ${r.isPinned ? '<span class="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0 select-none uppercase tracking-wide">Pinned</span>' : ''}
              </div>
              <span class="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase shrink-0">${dateStr}</span>
            </div>
            <div class="flex items-center gap-0.5 mb-2.5 text-amber-500">
              ${starsHtml}
            </div>
            <div class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed break-words whitespace-pre-wrap flex flex-col relative select-text">
              <p>${escapeHtml(displayedComment)}</p>
              ${isLong ? `
                <button type="button" class="self-start inline-flex items-center gap-0.5 text-[11px] font-black text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 mt-2 cursor-pointer transition-all uppercase tracking-wide select-none outline-none">
                  <span>Read more</span>
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
              ` : ''}
              ${r.adminReply && r.adminReply.text ? `
                <div class="mt-3 p-3 bg-zinc-100/80 dark:bg-zinc-800/60 rounded-xl border border-black/5 dark:border-white/5 text-[11px] text-zinc-700 dark:text-zinc-300">
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <span class="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      ${escapeHtml(r.adminReply.author || 'Developer Response')}
                    </span>
                    ${r.adminReply.timestamp ? `<span class="text-[9px] text-zinc-400">${escapeHtml(formatReviewDate(r.adminReply.timestamp))}</span>` : ''}
                  </div>
                  <p class="leading-relaxed whitespace-pre-wrap">${escapeHtml(r.adminReply.text)}</p>
                </div>
              ` : ''}
            </div>
            <div class="flex items-center gap-4 mt-4 pt-3.5 border-t border-black/[0.03] dark:border-white/[0.03]">
              <span class="text-[10px] text-zinc-400 dark:text-zinc-500">Was this review helpful?</span>
              <button type="button" class="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 active:scale-95 cursor-pointer">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                <span>Helpful ${helpfulCount > 0 ? `(${helpfulCount})` : ''}</span>
              </button>
              <button type="button" class="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ml-auto bg-black/5 hover:bg-rose-500/10 hover:text-rose-600 dark:bg-white/5 dark:hover:bg-rose-500/15 text-zinc-500 dark:text-zinc-400 active:scale-95 cursor-pointer">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15" stroke-width="2"></line></svg>
                <span>Report</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  const canLoadMoreReviews = totalCount > 5;
  const summaryStarsHtml = [1, 2, 3, 4, 5].map(s => renderStarSvg(s <= Math.round(Number(ratingVal)), 'w-2.5 h-2.5 xs:w-3.5 xs:h-3.5')).join('');
  const distBarsHtml = [5, 4, 3, 2, 1].map((star) => `
    <div class="flex items-center gap-2">
      <span class="w-2.5 font-bold text-zinc-500 text-right">${star}</span>
      <div class="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div class="h-full bg-blue-500 rounded-full transition-all duration-500" style="width: ${getPercentage(star)}"></div>
      </div>
    </div>
  `).join('');

  const reviewsSectionHtml = `
    <div class="px-1 xs:px-2 sm:px-4 md:px-6 mb-6 xs:mb-8">
      <div id="ratings-and-reviews-section" class="py-8 border-t border-black/5 dark:border-white/5 select-none text-left">
        <div class="flex flex-col gap-6 sm:gap-8">
          <div class="w-full">
            <div class="w-full">
              <h2 class="text-lg xs:text-xl font-bold mb-3 xs:mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 xs:gap-2">
                <svg class="w-4 h-4 xs:w-5 xs:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span>Ratings and reviews</span>
              </h2>
              <div class="flex items-center gap-2.5 xs:gap-4 sm:gap-6 p-3 xs:p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl xs:rounded-2xl border border-black/5 dark:border-white/10">
                <div class="text-center shrink-0">
                  <div class="text-3xl xs:text-4xl sm:text-5xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none mb-1">
                    ${escapeHtml(rating)}
                  </div>
                  <div class="flex justify-center gap-0.5 mb-1 text-amber-500">
                    ${summaryStarsHtml}
                  </div>
                  <div class="text-[9px] xs:text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                    ${escapeHtml(totalCount.toLocaleString())} ratings
                  </div>
                </div>
                <div class="flex-1 space-y-1.5 text-xs min-w-0">
                  ${distBarsHtml}
                </div>
              </div>
              <div class="mt-4 p-3 bg-green-500/5 border border-green-500/10 rounded-xl flex items-start gap-2.5">
                <svg class="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m9 12 2 2 4-4"></path></svg>
                <span class="text-[11px] font-semibold text-green-700 dark:text-green-400 leading-relaxed">
                  Ratings and reviews are contributed by players and moderated for safety and constructive gameplay feedback.
                </span>
              </div>
            </div>
          </div>

          <div class="w-full flex flex-col gap-4">
            <div class="space-y-4">
              ${validReviews.length > 0 ? `
                <div class="flex flex-col gap-3 pb-3 border-b border-black/5 dark:border-white/5">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                      <button type="button" class="px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm">
                        All Reviews
                      </button>
                      <button type="button" class="px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/10 hover:bg-emerald-500/10">
                        <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        Positive
                      </button>
                      <button type="button" class="px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 bg-rose-500/5 text-rose-600 dark:text-rose-400 dark:bg-rose-500/10 hover:bg-rose-500/10">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"></circle><line x1="12" y1="8" x2="12" y2="12" stroke-width="2"></line><line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2"></line></svg>
                        Critical
                      </button>
                    </div>
                    <div class="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 shrink-0 select-none">
                      <span>Sort:</span>
                      <div class="flex bg-zinc-100 dark:bg-zinc-800/80 rounded-lg p-0.5">
                        <button type="button" class="px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm">
                          Recent
                        </button>
                        <button type="button" class="px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                          <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                          <span>Most Helpful</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="space-y-3">
                  ${reviewsCardsHtml}
                  ${canLoadMoreReviews ? `
                    <div class="pt-4 flex flex-col items-center justify-center">
                      <button type="button" class="px-6 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]">
                        Load More Reviews
                      </button>
                    </div>
                  ` : ''}
                </div>
              ` : `
                <div class="text-center py-10 border border-dashed border-black/5 dark:border-white/10 rounded-2xl">
                  <span class="text-sm font-semibold text-zinc-400 dark:text-zinc-500">No community reviews yet. Be the first to share!</span>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Screenshots: 9:16 Portrait Gallery (Matching AppScreenshots.tsx)
  let screenshotsHtml = '';
  if (app.screenshots && Array.isArray(app.screenshots) && app.screenshots.length > 0) {
    screenshotsHtml = `
      <div class="w-full mb-6">
        <div class="flex overflow-x-auto hide-scrollbar gap-3 px-4 sm:px-0 pb-3 snap-x items-center -mx-4 sm:-mx-0">
          ${app.screenshots.map((imgUrl: string, i: number) => {
            const shotUrl = optimizeImageUrl(imgUrl, 400);
            return `
              <button type="button" class="flex-none w-[150px] sm:w-[220px] aspect-[9/16] rounded-xl overflow-hidden snap-center bg-zinc-100 dark:bg-zinc-800 shadow-sm border border-black/5 dark:border-white/10 active:scale-95 transition-transform" aria-label="View screenshot ${i + 1} fullscreen">
                <img src="${escapeHtml(shotUrl)}" alt="${escapeHtml(name)} screenshot ${i + 1} - gameplay preview" width="150" height="267" loading="lazy" decoding="async" class="w-full h-full object-cover select-none pointer-events-none" />
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // 16 Similar Applications: 2-Row Horizontal Scroll Grid (Matching AppSimilarCarousel.tsx)
  const checkAppIsNew = (item: any): boolean => {
    if (!item) return false;
    if (item.is_new === true || item.is_new === 'true' || item.is_new === 1) return true;
    if (item.isNew === true || item.isNew === 'true' || item.isNew === 1) return true;
    const isNewVal = String(getField(item, 'is_new', '')).trim().toLowerCase();
    if (isNewVal === 'true' || isNewVal === '1') return true;
    const badge = String(getField(item, 'badge', '')).trim().toLowerCase();
    return badge === 'new' || badge === 'hot';
  };

  const mainCatClean = (mainCat || 'Yono Apps').toLowerCase();
  const isAllCat = mainCatClean === 'all' || mainCatClean === 'all apps';

  const newApps: any[] = [];
  const regularApps: any[] = [];
  let totalCatCount = 0;

  for (let i = 0; i < apps.length; i++) {
    const a = apps[i];
    if (!a || a.sync_to_public === false || a.is_Safety_alert === true || a.status === 'flagged') continue;

    const aSlug = getField(a, 'slug').toLowerCase();
    const isCurrent = aSlug === cleanSlug;
    const aCat = getField(a, 'category', '').toLowerCase();
    const matches = isAllCat || aCat.includes(mainCatClean) || mainCatClean.includes(aCat);

    if (matches) {
      totalCatCount++;
      if (!isCurrent) {
        if (checkAppIsNew(a)) {
          newApps.push(a);
        } else {
          regularApps.push(a);
        }
      }
    }
  }

  newApps.sort((a: any, b: any) => (Number(getField(a, 'serial_number')) || 999999) - (Number(getField(b, 'serial_number')) || 999999));
  regularApps.sort((a: any, b: any) => (Number(getField(a, 'serial_number')) || 999999) - (Number(getField(b, 'serial_number')) || 999999));

  const maxCount = 16;
  const strSeed = String(cleanSlug || getField(app, 'id') || '');
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
    const currSerial = Number(getField(app, 'serial_number'));
    if (!isNaN(currSerial) && currSerial > 0) {
      const nextIdx = regularApps.findIndex((a: any) => (Number(getField(a, 'serial_number')) || 0) > currSerial);
      if (nextIdx !== -1) startIndex = nextIdx;
    }

    const countToPick = Math.min(remainingSlots, regularApps.length);
    for (let step = 0; step < countToPick; step++) {
      const idx = (startIndex + step) % regularApps.length;
      pickedRegular.push(regularApps[idx]);
    }
  }

  const displaySimilarApps = [...pinnedNew, ...pickedRegular];
  let recommendedAppsHtml = '';

  if (displaySimilarApps.length > 0) {
    recommendedAppsHtml = `
      <aside data-nosnippet aria-labelledby="related-apps-heading" class="my-5 xs:my-6 px-0 text-left">
        <div class="flex items-center justify-between gap-2 mb-3 px-1 xs:px-2 sm:px-4 md:px-6">
          <div class="flex items-center gap-2 min-w-0">
            <h2 id="related-apps-heading" class="text-base xs:text-lg sm:text-xl font-bold flex items-center gap-1.5 xs:gap-2 text-zinc-900 dark:text-zinc-100 truncate">
              <span>Similar Applications</span>
              ${mainCat && mainCat !== 'All Apps' ? `<span class="text-[10px] xs:text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 xs:px-2.5 py-0.5 rounded-full border border-blue-200/50 dark:border-blue-800/50 truncate">${escapeHtml(mainCat)}</span>` : ''}
            </h2>
          </div>
          <a href="/?tab=${encodeURIComponent(mainCat)}" class="inline-flex items-center gap-1.5 px-3 py-1 xs:px-3.5 xs:py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 active:scale-95 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-bold text-xs xs:text-xs transition-all border border-blue-200/70 dark:border-blue-800/70 shadow-2xs group shrink-0 no-underline" title="Explore all ${totalCatCount} ${escapeHtml(mainCat)} apps">
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
            const imgSrc = escapeHtml(simIcon);
            return `
              <a href="/app/${encodeURIComponent(simSlug)}" class="flex flex-col items-center justify-start gap-1 xxs:gap-1.5 xs:gap-2 w-[68px] xxs:w-[76px] xs:w-[86px] sm:w-[98px] snap-start group shrink-0 active:scale-95 transition-transform duration-150 ease-out no-underline">
                <div class="relative inline-block shrink-0">
                  <img src="${imgSrc}" alt="${escapeHtml(simName)}" width="86" height="86" decoding="async" fetchpriority="low" class="w-[58px] h-[58px] xxs:w-[66px] xxs:h-[66px] xs:w-[76px] xs:h-[76px] sm:w-[86px] sm:h-[86px] rounded-[24%] shadow-[0_2px_8px_rgba(0,0,0,0.08)] object-cover group-hover:scale-105 transition-transform duration-200 block pointer-events-none select-none" loading="lazy" />
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

  const relatedNewsSectionHtml = relatedNewsArticles.length > 0 ? `
    <aside data-nosnippet aria-labelledby="app-related-news-heading" class="px-1 xs:px-2 sm:px-4 md:px-6 mb-6 xs:mb-8 text-left">
      <div class="py-5 border-t border-black/5 dark:border-white/5">
        <h2 id="app-related-news-heading" class="text-base xs:text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-3">
          Related News &amp; Updates
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          ${relatedNewsArticles.slice(0, 6).map((rn: any) => {
            const rnSlug = (getField(rn, 'slug') || getField(rn, 'id') || '').trim();
            const rnTitle = getField(rn, 'title') || 'News Article';
            return `
              <a href="/news/${encodeURIComponent(rnSlug)}" class="p-3 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-colors flex items-center justify-between gap-2 no-underline">
                <span class="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2">${escapeHtml(rnTitle)}</span>
                <span class="text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">Read →</span>
              </a>
            `;
          }).join('')}
        </div>
      </div>
    </aside>
  ` : '';

  // 1:1 Layout Match with AppDetails.tsx
  return `
    <div class="w-full">
      <!-- 1. AppDetailsNavigation -->
      <div class="flex items-center justify-between gap-2 xs:gap-3 px-1 xs:px-2 sm:px-4 md:px-6 mb-3 xs:mb-4">
        <a href="/" class="inline-flex items-center gap-1.5 xs:gap-2 text-xs xs:text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors group shrink-0 no-underline">
          <div class="p-1 xs:p-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 group-hover:-translate-x-1 transition-transform">
            <svg class="w-3.5 h-3.5 xs:w-4 xs:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </div>
          <span>Back to storefront</span>
        </a>
        <a href="${topNewsHref}" class="inline-flex items-center gap-1 xs:gap-1.5 px-2 xs:px-3 py-1 xs:py-1.5 rounded-full text-[11px] xs:text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200/90 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 border border-black/5 dark:border-white/10 transition-all shadow-xs group cursor-pointer active:scale-95 shrink-0 no-underline" title="Read latest news and updates for ${escapeHtml(name)}">
          <div class="p-0.5 xs:p-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <svg class="w-3 h-3 xs:w-3.5 xs:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
          </div>
          <span>News</span>
          ${relatedNewsCount > 0 ? `<span class="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[9px] xs:text-[10px] font-bold leading-tight">${relatedNewsCount}</span>` : ''}
          <svg class="w-2.5 h-2.5 xs:w-3 xs:h-3 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </a>
      </div>

      <!-- 2. Main App Content Wrapper -->
      <div class="w-full">
        <!-- 2.1 AppHeader -->
        <div class="flex w-full items-center gap-2.5 xxs:gap-3 xs:gap-4 sm:gap-6 mb-3.5 sm:mb-6 px-1 xs:px-2 sm:px-4 md:px-6 mt-1 sm:mt-2 text-left">
          <div class="relative w-[56px] h-[56px] xxs:w-[66px] xxs:h-[66px] xs:w-[80px] xs:h-[80px] sm:w-[102px] sm:h-[102px] md:w-[116px] md:h-[116px] shrink-0">
            <div class="w-full h-full rounded-[14px] xxs:rounded-[16px] xs:rounded-[20px] sm:rounded-[24px] overflow-hidden shadow-sm bg-zinc-100 dark:bg-zinc-800 border border-black/5 dark:border-white/10 relative">
              <img src="${escapeHtml(icon)}" alt="${escapeHtml(name)} app icon" itemprop="image" loading="eager" fetchpriority="high" decoding="async" width="116" height="116" class="w-full h-full object-cover block relative z-10" />
            </div>
          </div>
          <div class="flex flex-col justify-center flex-1 min-w-0">
            <h1 class="text-base xxs:text-lg xs:text-2xl sm:text-3xl md:text-4xl font-black sm:font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug sm:leading-tight mb-0.5 xs:mb-1 break-words">
              ${escapeHtml(name)}
            </h1>
            <div class="text-[11px] xxs:text-xs xs:text-sm sm:text-base font-semibold text-blue-600 dark:text-blue-400 mb-0.5 xs:mb-1 truncate">
              ${escapeHtml(developer)}
            </div>
            <div class="text-[8px] xxs:text-[9px] xs:text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-x-1.5 xs:gap-x-2.5 gap-y-0.5 mt-0.5 font-medium">
              ${(() => {
                const isAppHot = app.is_hot === true || (app.is_hot && app.is_hot.booleanValue === true);
                const isAppNew = checkAppIsNew(app);
                if (isAppHot && isAppNew) {
                  return '<span class="inline-flex items-center rounded overflow-hidden shadow-xs font-black uppercase tracking-wider text-[8px] xxs:text-[9px] xs:text-[10px]"><span class="bg-[#d32f2f] text-white px-1.5 py-0.5">HOT</span><span class="bg-[#008738] text-white px-1.5 py-0.5">NEW</span></span>';
                }
                if (isAppHot) {
                  return '<span class="bg-[#d32f2f] text-white px-1.5 py-0.5 rounded uppercase font-black tracking-wider text-[8px] xxs:text-[9px] xs:text-[10px] shadow-xs">HOT</span>';
                }
                if (isAppNew) {
                  return '<span class="bg-[#008738] text-white px-1.5 py-0.5 rounded uppercase font-black tracking-wider text-[8px] xxs:text-[9px] xs:text-[10px] shadow-xs">NEW</span>';
                }
                return '';
              })()}
              <span class="flex items-center text-emerald-600 dark:text-emerald-400 gap-1 font-semibold">
                <svg class="w-3 h-3 xxs:w-3.5 xxs:h-3.5 xs:w-4 xs:h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg> Verified
              </span>
            </div>
          </div>
        </div>

        <!-- 2.2 AppSpecsBar -->
        <div class="w-full grid grid-cols-4 py-2 xxs:py-2.5 xs:py-3.5 sm:py-4 mb-3 sm:mb-6 border-y border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/10 dark:bg-zinc-900/10">
          <div class="flex flex-col items-center justify-center px-0.5 xxs:px-1 xs:px-2 text-center min-w-0">
            <div class="flex items-center gap-0.5 font-extrabold text-[11px] xxs:text-xs xs:text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
              <span>${escapeHtml(rating)}</span>
              <span class="text-orange-500 text-xs">★</span>
            </div>
            <div class="text-[7px] xxs:text-[8px] xs:text-[10px] sm:text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5 xs:mt-1 truncate max-w-full">Rating</div>
          </div>
          <div class="flex flex-col items-center justify-center px-0.5 xxs:px-1 xs:px-2 text-center border-l border-zinc-200 dark:border-zinc-800/80 min-w-0">
            <div class="font-extrabold text-[11px] xxs:text-xs xs:text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate max-w-full">${escapeHtml(size)}</div>
            <div class="text-[7px] xxs:text-[8px] xs:text-[10px] sm:text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5 xs:mt-1">Size</div>
          </div>
          <div class="flex flex-col items-center justify-center px-0.5 xxs:px-1 xs:px-2 text-center border-l border-zinc-200 dark:border-zinc-800/80 min-w-0">
            <a href="/?tab=${encodeURIComponent(mainCat)}" class="font-extrabold text-[9px] xxs:text-[10px] xs:text-xs sm:text-sm text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 px-1 xxs:px-1.5 xs:px-2.5 py-0.5 rounded-full leading-none truncate max-w-full transition-colors no-underline" title="View all ${escapeHtml(mainCat)} apps">${escapeHtml(mainCat)}</a>
            <div class="text-[7px] xxs:text-[8px] xs:text-[10px] sm:text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5 xs:mt-1.5">Type</div>
          </div>
          <div class="flex flex-col items-center justify-center px-0.5 xxs:px-1 xs:px-2 text-center border-l border-zinc-200 dark:border-zinc-800/80 min-w-0">
            <div class="font-extrabold text-[11px] xxs:text-xs xs:text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate max-w-full">${escapeHtml(version)}</div>
            <div class="text-[7px] xxs:text-[8px] xs:text-[10px] sm:text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5 xs:mt-1">Version</div>
          </div>
        </div>

        <!-- 2.3 AppActionButtons -->
        <div class="flex flex-col sm:flex-row w-full justify-center items-center gap-1.5 xxs:gap-2 xs:gap-3 select-none mb-3 sm:mb-5 px-1 xs:px-2 sm:px-4 md:px-6">
          <div class="w-full sm:flex-1 transition-transform duration-150">
            <div class="w-full flex flex-col items-center gap-1.5">
              ${Boolean(app.is_coming_soon && (!app.publish_date || new Date(app.publish_date).getTime() > Date.now())) ? `
                <button type="button" disabled class="w-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold py-2 xxs:py-2.5 px-3 xxs:px-4 xs:px-5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-[11px] xxs:text-xs xs:text-sm h-[38px] xxs:h-[40px] xs:h-[44px] cursor-not-allowed opacity-80">
                  <span>Coming Soon</span>
                </button>
              ` : `
                <button type="button" class="w-full premium-action-btn premium-action-btn-blowing cursor-pointer text-white !text-white font-bold py-2 xxs:py-2.5 px-3 xxs:px-4 xs:px-5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-[11px] xxs:text-xs xs:text-sm shadow-md h-[38px] xxs:h-[40px] xs:h-[44px]">
                  <span class="flex items-center gap-1.5 font-bold text-white !text-white">
                    <span>Download</span>
                    <svg class="w-3.5 h-3.5 xs:w-4 xs:h-4 text-white !text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </span>
                </button>
              `}
            </div>
          </div>
          <div class="flex w-full gap-1.5 xxs:gap-2 xs:gap-3 sm:w-auto shrink-0">
            <div class="flex-1 sm:w-auto sm:min-w-[100px] xxs:sm:min-w-[120px] sm:max-w-[150px]">
              <button type="button" class="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold py-2 xxs:py-2.5 px-2 xs:px-3 rounded-xl flex items-center justify-center gap-1 xs:gap-1.5 transition-all text-[11px] xxs:text-xs xs:text-sm border border-black/5 dark:border-white/5 shadow-sm h-[38px] xxs:h-[40px] xs:h-[44px] truncate cursor-pointer">
                <svg class="w-3 h-3 xs:w-4 xs:h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                <span class="truncate">Share</span>
              </button>
            </div>
            <div class="flex-1 sm:w-auto sm:min-w-[100px] xxs:sm:min-w-[120px] sm:max-w-[150px]">
              <a href="/report-removal" class="w-full bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold py-2 xxs:py-2.5 px-2 xs:px-3 rounded-xl flex items-center justify-center gap-1 xs:gap-1.5 transition-all text-[11px] xxs:text-xs xs:text-sm border border-rose-200/40 dark:border-rose-900/40 shadow-xs h-[38px] xxs:h-[40px] xs:h-[44px] truncate cursor-pointer no-underline">
                <svg class="w-3 h-3 xs:w-4 xs:h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>
                <span class="truncate">Flag</span>
              </a>
            </div>
          </div>
        </div>

        <!-- 2.4 AppSimilarCarousel (Positioned immediately after share & flag action buttons) -->
        ${recommendedAppsHtml}

        <!-- 2.5 AppScreenshots -->
        <div>
          ${screenshotsHtml}
        </div>

        <!-- 2.6 AppAboutSection -->
        <div>
          <section aria-labelledby="app-overview-heading" class="w-full my-3 px-0 sm:px-2 text-left">
            <div class="bg-slate-50/90 dark:bg-zinc-900/80 border border-black/5 dark:border-white/5 rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 shadow-xs">
              <div class="w-full p-3 xs:p-3.5 sm:p-5 flex items-center justify-between text-left select-none group border-b border-black/5 dark:border-white/5">
                <div class="flex items-center gap-2 xs:gap-2.5 sm:gap-3 flex-1 pr-2 sm:pr-3">
                  <div class="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <svg class="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  </div>
                  <div>
                    <h2 id="app-overview-heading" class="text-xs sm:text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">About this app</h2>
                    <p class="text-[10px] xs:text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Overview & features</p>
                  </div>
                </div>
              </div>
              <div class="p-3 xs:p-3.5 sm:p-6 space-y-5 xs:space-y-6 sm:space-y-8 bg-white/50 dark:bg-zinc-950/40">
                ${app.custom_admin_box_html ? `
                  <div class="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-xl p-3.5 sm:p-5 shadow-xs">
                    ${app.custom_admin_box_heading ? `<h3 class="text-sm sm:text-base font-bold mb-2 text-amber-900 dark:text-amber-200">${escapeHtml(app.custom_admin_box_heading)}</h3>` : ''}
                    <div class="${RICH_HTML_CONTENT_STYLE}">${sanitizeHtml(app.custom_admin_box_html)}</div>
                  </div>
                ` : ''}
                <div>
                  <div class="${RICH_HTML_CONTENT_STYLE}">${desc}</div>
                </div>
                ${features ? `
                  <div class="pt-5 sm:pt-6 border-t border-black/5 dark:border-white/5">
                    <h3 class="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2 sm:mb-3">Key App Features</h3>
                    <div class="${RICH_HTML_CONTENT_STYLE}">${features}</div>
                  </div>
                ` : ''}
                ${app.release_notes ? `
                  <div class="pt-5 sm:pt-6 border-t border-black/5 dark:border-white/5">
                    <h3 class="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2 sm:mb-3">What's New in Version ${escapeHtml(version)}</h3>
                    <div class="bg-slate-50 dark:bg-zinc-900 rounded-xl p-3.5 sm:p-4 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap border border-black/5 dark:border-white/5">${escapeHtml(app.release_notes)}</div>
                  </div>
                ` : ''}
              </div>
            </div>
          </section>
        </div>

        <!-- 2.7 AppSafetyBoxes -->
        <div>
          ${alertsHtml}
        </div>
      </div>

      ${relatedNewsSectionHtml}

      <!-- 3. Reviews Section -->
      ${reviewsSectionHtml}

      <!-- 4. FAQs Section -->
      <div>
        ${faqsHtml}
      </div>
    </div>
  `;
}

