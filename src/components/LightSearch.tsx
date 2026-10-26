import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Zap, TrendingUp } from 'lucide-react';
import { useData } from '../contexts/DataContextPublic';
import { useNavigate } from 'react-router-dom';
import { getOptimizedImageUrl } from '../seo/utils';
import { preloadAppDetails } from '../lib/preloadHelper';

interface LightSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LightSearch({ isOpen, onClose }: LightSearchProps) {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const { apps, settings, fetchApps } = useData();
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      if (apps.length < 25 && fetchApps) {
        fetchApps();
      }
      document.body.style.overflow = 'hidden';
      // Fast auto-focus
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      try {
        const stored = localStorage.getItem('recent_searches');
        if (stored) {
          setHistory(JSON.parse(stored));
        }
      } catch (e) {
        // Ignore
      }
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!isOpen) return null;

  const saveToHistory = (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    setHistory(prev => {
      const next = [trimmed, ...prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem('recent_searches', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const removeFromHistory = (itemToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => {
      const next = prev.filter(item => item !== itemToRemove);
      try {
        localStorage.setItem('recent_searches', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('recent_searches');
    } catch (e) {}
  };

  const getTrendingSearches = () => {
    let trends: string[] = [];
    if (settings?.trending_searches && Array.isArray(settings.trending_searches) && settings.trending_searches.length > 0) {
      trends = settings.trending_searches.filter(Boolean);
    } else if (settings?.trending_searches && typeof settings.trending_searches === 'string') {
      trends = (settings.trending_searches as string).split(',').map(s => s.trim()).filter(Boolean);
    }
    
    if (trends.length === 0 && (apps || []).length > 0) {
      const allAppKeywords = new Set<string>();
      (apps || []).forEach(a => {
        if (a && a.seo_keywords) {
          a.seo_keywords.split(',').forEach(k => allAppKeywords.add(k.trim()));
        }
      });
      trends = Array.from(allAppKeywords).filter(Boolean);
    }
    
    return trends.slice(0, 6);
  };

  const trendingSearches = getTrendingSearches();

  // Instant lightweight scored search (Play Store search algorithm)
  const results = query.trim().length > 0
    ? (apps || []).filter(app => {
        if (!app || !app.name) return false;
        const q = query.toLowerCase().trim();
        return (
          app.name.toLowerCase().includes(q) ||
          app.category?.toLowerCase().includes(q) ||
          app.seo_keywords?.toLowerCase().includes(q)
        );
      }).sort((a, b) => {
        const q = query.toLowerCase().trim();
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        if (aName === q) return -1;
        if (bName === q) return 1;
        if (aName.startsWith(q)) return -1;
        if (bName.startsWith(q)) return 1;
        return (a.serial_number || 0) - (b.serial_number || 0);
      }).slice(0, 6)
    : [];

  const handleSelectTerm = (term: string) => {
    saveToHistory(term);
    document.body.style.overflow = '';
    navigate(`/?q=${encodeURIComponent(term)}`);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center pt-3 sm:pt-12 px-3 sm:px-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div 
        className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-98 slide-in-from-top-3 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input Bar */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) {
              handleSelectTerm(query.trim());
            }
          }}
          className="flex items-center gap-3 px-4 py-3.5 border-b border-black/5 dark:border-white/5 shrink-0"
        >
          <Search className="w-5 h-5 text-blue-500 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games, apps, categories..."
            className="flex-1 bg-transparent text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none border-none p-0 focus:ring-0"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              aria-label="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button 
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Close search"
          >
            Esc
          </button>
        </form>

        {/* Scrollable Result / Trends Area */}
        <div className="overflow-y-auto overscroll-contain p-2 sm:p-3 space-y-3">
          {/* Query Live Results */}
          {query.trim().length > 0 ? (
            results.length > 0 ? (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 px-3 pt-1 uppercase tracking-wider">
                  Top Matches
                </div>
                {results.map((app) => (
                  <div
                    key={app.id}
                    onMouseEnter={() => preloadAppDetails(app)}
                    onTouchStart={() => preloadAppDetails(app)}
                    onClick={() => {
                      saveToHistory(app.name);
                      document.body.style.overflow = '';
                      navigate(`/app/${app.slug || app.id}`);
                      onClose();
                    }}
                    className="flex items-center justify-between gap-3 p-2 sm:p-2.5 rounded-xl hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={getOptimizedImageUrl(app.icon_url, 96) || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=128&h=128&fit=crop"}
                        alt={app.name}
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                        className="w-10 h-10 rounded-xl object-cover shrink-0 border border-black/5 dark:border-white/5 bg-zinc-100 dark:bg-zinc-800"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (app.icon_url && target.src !== app.icon_url) {
                            target.src = app.icon_url;
                          }
                        }}
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-500 transition-colors">
                          {app.name}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {app.category?.split(',')[0] || 'Game'} • ★ {app.rating || '4.8'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 rounded-lg shrink-0">
                      View
                    </span>
                  </div>
                ))}

                {/* View all search results button */}
                <button
                  type="button"
                  onClick={() => handleSelectTerm(query.trim())}
                  className="w-full mt-2 p-2.5 text-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-colors"
                >
                  View all results for "{query.trim()}" →
                </button>
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                <Search className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-sm font-medium">No results for "{query}"</p>
                <p className="text-xs text-zinc-400 mt-0.5">Try searching with a different term or keyword</p>
              </div>
            )
          ) : (
            <>
              {/* Recent Searches */}
              {history.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-3 py-1 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    <span>Recent Searches</span>
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="text-red-500 hover:text-red-600 transition-colors font-medium lowercase first-letter:uppercase"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {history.map((term, idx) => (
                      <div
                        key={`hist-${idx}`}
                        onClick={() => handleSelectTerm(term)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-500 transition-colors shrink-0" />
                          <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                            {term}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => removeFromHistory(term, e)}
                          aria-label={`Remove ${term}`}
                          className="p-1 text-zinc-400 hover:text-red-500 transition-colors rounded-md"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Searches */}
              {trendingSearches.length > 0 && (
                <div className="px-3 pt-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                    <span>Popular & Trending</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {trendingSearches.map((tag, idx) => (
                      <button
                        key={`trend-${idx}`}
                        type="button"
                        onClick={() => handleSelectTerm(tag)}
                        className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-all border border-black/5 dark:border-white/5 active:scale-95"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
