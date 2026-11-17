import { getField } from '../utils';
import { escapeHtml } from './common';

function extractYoutubeId(urlStr: string): string {
  if (!urlStr) return '';
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/live/') || url.pathname.startsWith('/embed/') || url.pathname.startsWith('/v/')) {
        return url.pathname.split('/')[2] || url.pathname.split('/')[1] || '';
      }
      return url.searchParams.get('v') || '';
    } else if (url.hostname.includes('youtu.be')) {
      return url.pathname.slice(1);
    }
  } catch (e) {
    if (urlStr.length === 11 && !urlStr.includes('/')) return urlStr;
  }
  const m = urlStr.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  if (m && m[1]) return m[1];
  return urlStr.split('/').pop()?.split('?')[0] || '';
}

export function renderVideosList(videos: any[], _settings: any): string {
  const publicVideos = (Array.isArray(videos) ? videos : []).filter(
    video =>
      video &&
      video.sync_to_public !== false &&
      String(video.sync_to_public) !== 'false' &&
      video.is_published !== false &&
      video.is_draft !== true
  );
  const safeVideos = publicVideos.slice(0, 6);
  let cards = '';
  safeVideos.forEach(v => {
    const title = getField(v, 'title');
    const slug = getField(v, 'slug') || getField(v, 'id');
    const desc = getField(v, 'description', '');
    const videoUrl = getField(v, 'youtube_url') || getField(v, 'url', '');
    const videoId = extractYoutubeId(videoUrl);
    const thumb = getField(v, 'og_image_url') || getField(v, 'thumbnail_url') || getField(v, 'image_url') || (videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : '');
    const createdAt = getField(v, 'created_at');
    const dateLabel = createdAt ? new Date(createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent';
    const shortId = String(getField(v, 'id') || slug || '').substring(0, 8).toUpperCase();

    cards += `
      <div class="group flex flex-col bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden hover:shadow-lg hover:border-blue-500/30 transition-all duration-300 animate-fade-in">
        <a href="/videos/${encodeURIComponent(slug)}" class="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 block">
          ${thumb ? `
            <img src="${escapeHtml(thumb)}" alt="${escapeHtml(title)}" referrerpolicy="no-referrer" decoding="async" loading="lazy" width="400" height="225" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ` : `
            <div class="w-full h-full bg-gradient-to-br from-blue-600/20 via-indigo-500/15 to-zinc-900/20 flex items-center justify-center"></div>
          `}
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-70 group-hover:opacity-90 transition-opacity"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="p-3.5 rounded-full bg-black/50 text-white border border-white/20 shadow-xl scale-95 group-hover:scale-110 group-hover:bg-blue-600 group-hover:border-transparent transition-all duration-300">
              <svg class="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
            </div>
          </div>
          <div class="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-0.5 bg-black/70 rounded-full border border-white/10">
            <svg class="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path></svg>
            <span class="text-[10px] font-semibold text-white/90">Verified</span>
          </div>
        </a>
        <div class="p-5 flex-1 flex flex-col">
          <div class="flex items-center gap-2 mb-2 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
            <span>${escapeHtml(dateLabel)}</span>
          </div>
          <h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
            <a href="/videos/${encodeURIComponent(slug)}">${escapeHtml(title)}</a>
          </h3>
          ${desc ? `<p class="text-zinc-500 dark:text-zinc-400 text-xs font-normal leading-relaxed mb-4 line-clamp-2">${escapeHtml(desc)}</p>` : ''}
          <div class="mt-auto pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
            <span class="text-[10px] font-medium text-zinc-400">ID: ${escapeHtml(shortId)}</span>
            <a href="/videos/${encodeURIComponent(slug)}" class="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
              Watch Guide
              <svg class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </a>
          </div>
        </div>
      </div>
    `;
  });

  return `
    <div class="animate-fade-in min-h-screen max-w-[1550px] mx-auto pt-1 sm:pt-3 pb-16 px-0 sm:px-2 md:px-4">
      <div class="mb-2 sm:mb-4">
        <a href="/" class="inline-flex items-center gap-1.5 min-h-[36px] py-1 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline transition-colors group">
          <div class="p-1 rounded-full bg-blue-50 dark:bg-blue-950/50 group-hover:-translate-x-1 transition-transform">
            <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5M12 19l-7-7 7-7"></path></svg>
          </div>
          Home
        </a>
      </div>
      <div class="mb-6 sm:mb-8">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <div class="flex items-center gap-3">
            <div class="p-2.5 sm:p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400">
              <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"></path><rect x="2" y="6" width="14" height="12" rx="2"></rect></svg>
            </div>
            <div>
              <h1 class="text-xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white m-0">Videos &amp; Guides</h1>
              <p class="text-xs sm:text-sm text-zinc-500 mt-0.5">Verified visual walkthroughs and platform guides</p>
            </div>
          </div>
          <div class="relative w-full sm:w-80">
            <input type="text" readonly class="block w-full min-h-[44px] py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-black/10 dark:border-white/10 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium text-base sm:text-sm rounded-xl px-4 pr-11 text-zinc-900 dark:text-zinc-100" placeholder="Search videos..." value="" aria-label="Search videos" />
            <svg class="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke-width="2"></circle><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-4.3-4.3"></path></svg>
          </div>
        </div>
      </div>
      ${safeVideos.length === 0 ? `
        <div class="text-center py-24 max-w-md mx-auto">
          <div class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-400">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"></path><rect x="2" y="6" width="14" height="12" rx="2"></rect></svg>
          </div>
          <h3 class="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">No videos found</h3>
          <p class="text-sm text-zinc-500 mb-6">No videos have been published yet.</p>
        </div>
      ` : `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${cards}</div>
      `}
    </div>
  `;
}

export function renderVideoDetail(slug: string, videos: any[], _settings: any): string {
  const cleanSlug = decodeURIComponent(slug).toLowerCase();
  const v = (Array.isArray(videos) ? videos : []).find(item =>
    item &&
    item.sync_to_public !== false &&
    String(item.sync_to_public) !== 'false' &&
    item.is_published !== false &&
    item.is_draft !== true &&
    ((getField(item, 'slug') || '').toLowerCase() === cleanSlug || (getField(item, 'id') || '').toLowerCase() === cleanSlug)
  );
  if (!v) return `<div class="py-20 text-center max-w-md mx-auto min-h-[60vh]"><h1 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Transmission Not Found</h1><a href="/videos" class="text-blue-500 hover:underline">View other videos</a></div>`;
  const title = getField(v, 'title');
  const desc = getField(v, 'description', '');
  const videoUrl = getField(v, 'youtube_url') || getField(v, 'url', '');
  const videoId = extractYoutubeId(videoUrl);
  const createdAt = getField(v, 'created_at');
  const dateLabel = createdAt ? new Date(createdAt).toLocaleDateString() : 'Recently Published';

  return `
    <div class="animate-fade-in max-w-[1550px] mx-auto px-0 sm:px-2 md:px-4 pb-12">
      <div class="mb-3 sm:mb-5 pt-1 sm:pt-3">
        <a href="/videos" class="inline-flex items-center gap-2 min-h-[40px] py-1 text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors group">
          <div class="p-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 group-hover:-translate-x-1 transition-transform">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5M12 19l-7-7 7-7"></path></svg>
          </div>
          Videos
        </a>
      </div>
      <div class="bg-transparent sm:bg-zinc-50 sm:dark:bg-zinc-800/30 rounded-none sm:rounded-[32px] overflow-hidden shadow-none sm:shadow-sm border-0 sm:border sm:border-black/5 sm:dark:border-white/5 relative">
        <div class="relative w-full bg-black rounded-2xl sm:rounded-none overflow-hidden">
          <div class="aspect-video w-full max-w-5xl mx-auto">
            ${videoId ? `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${escapeHtml(videoId)}?autoplay=0" title="${escapeHtml(title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>` : `<div class="flex items-center justify-center h-full text-zinc-500 font-medium text-sm">Invalid video URL</div>`}
          </div>
        </div>
        <div class="py-4 px-0.5 sm:p-10">
          <div class="flex items-center gap-2 mb-3">
            <span class="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Video Hub</span>
          </div>
          <h1 class="text-xl sm:text-4xl font-bold leading-tight mb-3 tracking-tight text-zinc-900 dark:text-zinc-100">${escapeHtml(title)}</h1>
          <div class="flex items-center gap-2 mb-8 text-sm font-medium text-zinc-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
            <span>${escapeHtml(dateLabel)}</span>
          </div>
          <div class="prose prose-zinc dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-400 leading-relaxed text-base">
            <p>${escapeHtml(desc)}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}
