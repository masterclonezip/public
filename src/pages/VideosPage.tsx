/**
 * VideosPage interactive walkthrough directory
 * Displays lists of embedded gameplay instruction videos and interactive previews.
 * Enhanced with URL-synced pagination (6 per page), search filtering, and optimized thumbnails.
 */

import React, { useState, useMemo, useEffect } from 'react';
import Meta from '../components/Meta';
import { useData } from '../contexts/DataContextPublic';
import { Video, Search, ArrowLeft, ArrowRight, Play, Calendar, ShieldCheck, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

const ITEMS_PER_PAGE = 6;

function getYoutubeId(urlStr: string) {
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

export default function VideosPage() {
  const { videos: mockVideos = [], settings: mockSettings, loading, fetchVideos } = useData();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if ((!mockVideos || mockVideos.length === 0) && fetchVideos) {
      fetchVideos();
    }
  }, [mockVideos.length, fetchVideos]);

  const urlPage = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = isNaN(urlPage) || urlPage < 1 ? 1 : urlPage;
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');

  // Keep search in URL query
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim());
    } else {
      params.delete('q');
    }
    setSearchParams(params, { replace: true });
  }, [searchTerm]);

  const filteredVideos = useMemo(() => {
    return mockVideos.filter(video => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        video.title?.toLowerCase().includes(term) ||
        video.description?.toLowerCase().includes(term)
      );
    });
  }, [mockVideos, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedVideos = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredVideos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVideos, safeCurrentPage]);

  const setPage = (pageNumber: number) => {
    const nextP = Math.max(1, Math.min(pageNumber, totalPages));
    const params = new URLSearchParams(searchParams);
    if (nextP > 1) {
      params.set('page', nextP.toString());
    } else {
      params.delete('page');
    }
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="animate-fade-in min-h-screen max-w-[1550px] mx-auto plain-content px-3 sm:px-6 md:px-10 pb-20">
      <div className="mb-8 pt-4">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline transition-colors group"
        >
          <div className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 group-hover:-translate-x-1 transition-transform">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Home
        </Link>
      </div>

      <Meta 
        title={mockSettings?.videos_meta_title || "Video Reviews"}
        description={mockSettings?.videos_meta_description || "Watch deep-dive reviews and gameplay analysis."}
        canonical={window.location.origin + "/videos"}
      />

      <div className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400">
              <Video className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white m-0">
                Videos & Guides
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Verified visual walkthroughs and platform guides
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-80">
            <input
              type="text"
              className="block w-full py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-black/10 dark:border-white/10 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium text-sm rounded-xl px-4 pr-10 text-zinc-900 dark:text-zinc-100"
              placeholder="Search videos..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
            {searchTerm ? (
              <button 
                onClick={() => { setSearchTerm(''); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            )}
          </div>
        </div>
      </div>

      {loading && filteredVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 min-h-[40vh]">
          <div className="w-8 h-8 border-[3px] border-black/10 dark:border-white/10 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-medium tracking-wide text-zinc-500 animate-pulse">Loading videos...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-24 max-w-md mx-auto">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-400">
            <Video className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">No videos found</h3>
          <p className="text-sm text-zinc-500 mb-6">
            {searchTerm ? "No videos matched your query." : "No videos have been published yet."}
          </p>
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setPage(1); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all"
            >
              Clear filter
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedVideos.map((video, index) => {
              const ytId = getYoutubeId(video.youtube_url);
              const thumbUrl = ytId 
                ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` 
                : 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80';

              return (
                <div
                  key={video.id || video.slug || `vid-${index}`}
                  className="group flex flex-col bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden hover:shadow-lg hover:border-blue-500/30 transition-all duration-300 animate-fade-in"
                >
                  {/* Visual Thumbnail Frame */}
                  <Link to={`/videos/${video.slug || video.id}`} className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 block">
                    <img 
                      src={thumbUrl} 
                      alt={video.title}
                      referrerPolicy="no-referrer"
                      decoding="async"
                      loading="lazy"
                      width={400}
                      height={225}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-70 group-hover:opacity-90 transition-opacity" />
                    
                    {/* Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="p-3.5 rounded-full bg-black/50 text-white border border-white/20 shadow-xl scale-95 group-hover:scale-110 group-hover:bg-blue-600 group-hover:border-transparent transition-all duration-300">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* Verified Status Tag */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-0.5 bg-black/70 rounded-full border border-white/10">
                      <ShieldCheck className="w-3 h-3 text-blue-400" />
                      <span className="text-[10px] font-semibold text-white/90">Verified</span>
                    </div>
                  </Link>

                  {/* Info Panel */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {video.created_at ? new Date(video.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : 'Recent'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
                      <Link to={`/videos/${video.slug || video.id}`}>
                        {video.title}
                      </Link>
                    </h3>
                    
                    {video.description && (
                      <p className="text-zinc-500 dark:text-zinc-400 text-xs font-normal leading-relaxed mb-4 line-clamp-2">
                        {video.description}
                      </p>
                    )}

                    <div className="mt-auto pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-medium text-zinc-400">
                        ID: {String(video.id || video.slug || '').substring(0, 8).toUpperCase()}
                      </span>
                      <Link 
                        to={`/videos/${video.slug || video.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline"
                      >
                        Watch Guide
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Numbered Pagination (1, 2, 3...) */}
          {totalPages > 1 && (
            <div className="mt-14 pt-8 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Showing <span className="text-zinc-900 dark:text-zinc-100">{((safeCurrentPage - 1) * ITEMS_PER_PAGE) + 1}</span>–
                <span className="text-zinc-900 dark:text-zinc-100">{Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredVideos.length)}</span> of{' '}
                <span className="text-zinc-900 dark:text-zinc-100">{filteredVideos.length}</span> guides
              </p>

              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <button
                  onClick={() => setPage(safeCurrentPage - 1)}
                  disabled={safeCurrentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  const isCurrent = p === safeCurrentPage;
                  if (
                    p === 1 ||
                    p === totalPages ||
                    (p >= safeCurrentPage - 1 && p <= safeCurrentPage + 1)
                  ) {
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                          isCurrent
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                        aria-label={`Go to page ${p}`}
                        aria-current={isCurrent ? 'page' : undefined}
                      >
                        {p}
                      </button>
                    );
                  } else if (
                    (p === safeCurrentPage - 2 && safeCurrentPage > 3) ||
                    (p === safeCurrentPage + 2 && safeCurrentPage < totalPages - 2)
                  ) {
                    return (
                      <span key={p} className="px-1 text-xs text-zinc-400 select-none">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}

                <button
                  onClick={() => setPage(safeCurrentPage + 1)}
                  disabled={safeCurrentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
                  aria-label="Next page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
