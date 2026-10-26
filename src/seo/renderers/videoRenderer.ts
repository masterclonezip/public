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
  const safeVideos = Array.isArray(videos) ? videos.slice(0, 6) : [];
  let cards = '';
  safeVideos.forEach(v => {
    const title = getField(v, 'title');
    const slug = getField(v, 'slug') || getField(v, 'id');
    const desc = getField(v, 'description', '');
    const videoUrl = getField(v, 'youtube_url') || getField(v, 'url', '');
    const videoId = extractYoutubeId(videoUrl);
    const thumb = videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80';
    const createdAt = getField(v, 'created_at');
    const dateLabel = createdAt ? new Date(createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent';
    const shortId = String(getField(v, 'id') || slug || '').substring(0, 8).toUpperCase();

    cards += `
      <div class="group flex flex-col bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden hover:shadow-lg hover:border-blue-500/30 transition-all duration-300 animate-fade-in text-left">
        <a href="/videos/${encodeURIComponent(slug)}" class="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 block">
          <img src="${escapeHtml(thumb)}" alt="${escapeHtml(title)}" referrerpolicy="no-referrer" decoding="async" loading="lazy" width="400" height="225" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-70 group-hover:opacity-90 transition-opacity"></div>
          <div class="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-0.5 bg-black/70 rounded-full border border-white/10">
            <span class="text-[10px] font-semibold text-white/90">Verified</span>
          </div>
        </a>
        <div class="p-5 flex-1 flex flex-col">
          <div class="flex items-center gap-2 mb-2 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
            <span>${escapeHtml(dateLabel)}</span>
          </div>
          <h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2 mb-2">
            <a href="/videos/${encodeURIComponent(slug)}">${escapeHtml(title)}</a>
          </h3>
          ${desc ? `<p class="text-zinc-500 dark:text-zinc-400 text-xs font-normal leading-relaxed mb-4 line-clamp-2">${escapeHtml(desc)}</p>` : ''}
          <div class="mt-auto pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
            <span class="text-[10px] font-medium text-zinc-400">ID: ${escapeHtml(shortId)}</span>
            <a href="/videos/${encodeURIComponent(slug)}" class="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">Watch Guide →</a>
          </div>
        </div>
      </div>
    `;
  });

  return `
    <div class="animate-fade-in min-h-screen max-w-[1550px] mx-auto plain-content px-3 sm:px-6 md:px-10 pb-20 text-left">
      <div class="mb-8 pt-4">
        <a href="/" class="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline transition-colors group">
          Home
        </a>
      </div>
      <div class="mb-10">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 class="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white m-0">Videos &amp; Guides</h1>
            <p class="text-xs sm:text-sm text-zinc-500 mt-1">Verified visual walkthroughs and platform guides</p>
          </div>
        </div>
      </div>
      ${safeVideos.length === 0 ? `
        <div class="text-center py-24 max-w-md mx-auto">
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
  const v = (Array.isArray(videos) ? videos : []).find(item => (getField(item, 'slug') || '').toLowerCase() === cleanSlug || (getField(item, 'id') || '').toLowerCase() === cleanSlug);
  if (!v) return `<div class="py-20 text-center max-w-md mx-auto min-h-[60vh]"><h1 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Transmission Not Found</h1><a href="/videos" class="text-blue-500 hover:underline">View other videos</a></div>`;
  const title = getField(v, 'title');
  const desc = getField(v, 'description', '');
  const videoUrl = getField(v, 'youtube_url') || getField(v, 'url', '');
  const videoId = extractYoutubeId(videoUrl);
  const createdAt = getField(v, 'created_at');
  const dateLabel = createdAt ? new Date(createdAt).toLocaleDateString() : 'Recently Published';

  return `
    <div class="animate-fade-in max-w-[1550px] mx-auto px-3 sm:px-6 md:px-10 pb-12 text-left">
      <div class="mb-6 pt-4">
        <a href="/videos" class="inline-flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors group">Videos</a>
      </div>
      <div class="bg-zinc-50 dark:bg-zinc-800/30 rounded-[32px] overflow-hidden shadow-sm border border-black/5 dark:border-white/5 relative">
        <div class="relative w-full bg-black">
          <div class="aspect-video w-full max-w-5xl mx-auto">
            ${videoId ? `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${escapeHtml(videoId)}?autoplay=0" title="${escapeHtml(title)}" frameborder="0" allowfullscreen></iframe>` : `<div class="flex items-center justify-center h-full text-zinc-500 font-medium text-sm">Invalid video URL</div>`}
          </div>
        </div>
        <div class="p-6 sm:p-10">
          <div class="flex items-center gap-2 mb-4">
            <span class="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Video Hub</span>
          </div>
          <h1 class="text-2xl sm:text-4xl font-bold leading-tight mb-4 tracking-tight text-zinc-900 dark:text-zinc-100">${escapeHtml(title)}</h1>
          <div class="flex items-center gap-2 mb-8 text-sm font-medium text-zinc-500">
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
