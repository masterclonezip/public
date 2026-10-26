/**
 * NewsPage listings
 * Google Discover-inspired visual layout with edge-to-edge full-freedom imagery,
 * snug top navigation, spacious search bar, and 1-tap direct article navigation.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, ArrowLeft, Check, X } from 'lucide-react';
import { useData } from '../contexts/DataContextPublic';
import { Link, useSearchParams } from 'react-router-dom';
import Meta from '../components/Meta';
import NewsCard from '../components/public/news/NewsCard';
import NewsPagination from '../components/public/news/NewsPagination';
import { getPlainTextSnippet } from '../components/public/news/newsUtils';

const ITEMS_PER_PAGE = 9;

export default function NewsPage() {
  const { news: mockNews = [], settings: mockSettings, fetchNews } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const contentTopRef = useRef<HTMLDivElement>(null);
  const [copyToast, setCopyToast] = useState(false);

  // Trigger dedicated news fetch only when full news list is not already in memory
  useEffect(() => {
    if (fetchNews && (!mockNews || mockNews.length <= 8)) {
      fetchNews();
    }
  }, [fetchNews, mockNews?.length]);

  // Instantly prefetch the NewsDetailPage chunk into memory
  // so any news card click opens instantaneously with 0ms latency
  useEffect(() => {
    import('./NewsDetailPage').catch(() => {});
  }, []);

  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const activeCategory = searchParams.get('category') || 'All';
  const searchTerm = searchParams.get('q') || '';

  const publicNewsList = useMemo(() => {
    return (mockNews || [])
      .filter(item => item && item.sync_to_public !== false)
      .sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        const dateA = new Date(a.date || a.published_at || a.created_at || 0).getTime();
        const dateB = new Date(b.date || b.published_at || b.created_at || 0).getTime();
        return dateB - dateA;
      });
  }, [mockNews]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    publicNewsList.forEach(item => {
      if (item.category && item.category.trim()) {
        set.add(item.category.trim());
      }
    });
    return ['All', ...Array.from(set)];
  }, [publicNewsList]);

  const filteredNews = useMemo(() => {
    return publicNewsList.filter(item => {
      const matchesCategory = activeCategory === 'All' || 
        (item.category && item.category.toLowerCase() === activeCategory.toLowerCase());
      
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        item.title?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.ceo_name?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [publicNewsList, activeCategory, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredNews.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const currentNewsSlice = useMemo(() => {
    return filteredNews.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredNews, startIndex]);

  const handlePageChange = (page: number) => {
    const nextParams = new URLSearchParams(searchParams);
    if (page <= 1) {
      nextParams.delete('page');
    } else {
      nextParams.set('page', String(page));
    }
    setSearchParams(nextParams, { replace: false });
    
    if (contentTopRef.current) {
      const topOffset = contentTopRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
    }
  };

  const handleCategoryChange = (cat: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (cat === 'All') {
      nextParams.delete('category');
    } else {
      nextParams.set('category', cat);
    }
    nextParams.delete('page');
    setSearchParams(nextParams);
  };

  const handleSearchChange = (val: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (!val.trim()) {
      nextParams.delete('q');
    } else {
      nextParams.set('q', val);
    }
    nextParams.delete('page');
    setSearchParams(nextParams);
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const handleShare = useCallback((item: any) => {
    const url = `${window.location.origin}/news/${item.slug || item.id}`;
    if (navigator.share) {
      navigator.share({
        title: item.title,
        text: getPlainTextSnippet(item.description).slice(0, 100),
        url: url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopyToast(true);
        setTimeout(() => setCopyToast(false), 2000);
      }).catch(() => {});
    }
  }, []);

  const paginationRange = useMemo(() => {
    const delta = 1;
    const range: (number | string)[] = [];
    
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= safeCurrentPage - delta && i <= safeCurrentPage + delta)
      ) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  }, [totalPages, safeCurrentPage]);

  const baseTitle = mockSettings?.news_meta_title || "News & Updates";
  const seoTitle = safeCurrentPage > 1 ? `${baseTitle} - Page ${safeCurrentPage}` : baseTitle;
  const seoDescription = mockSettings?.news_meta_description || "The latest gaming news, reports, and transparency updates.";
  const canonicalUrl = `${window.location.origin}/news${safeCurrentPage > 1 ? `?page=${safeCurrentPage}` : ''}`;

  return (
    <div className="w-full text-zinc-900 dark:text-zinc-100 pb-20 min-h-[70vh]">
      <Meta 
        title={seoTitle}
        description={seoDescription}
        canonical={canonicalUrl}
      />

      {copyToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-full shadow-xl flex items-center gap-2 border border-white/10 dark:border-black/5 animate-fade-in text-xs font-semibold"
        >
          <Check className="w-3.5 h-3.5 text-green-500" />
          <span>Link copied to clipboard</span>
        </div>
      )}

      <div ref={contentTopRef} className="pt-0.5 pb-0.5 px-3 sm:px-0">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors group shrink-0"
        >
          <div className="p-1.5 sm:p-2 rounded-full bg-blue-50 dark:bg-blue-900/30 group-hover:-translate-x-1 transition-transform shadow-xs">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span>Back to storefront</span>
        </Link>
      </div>

      <div className="px-3 sm:px-0 mt-0.5 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          News &amp; Updates
        </h1>

        <div className="relative w-full sm:w-80 shrink-0">
          <input
            type="text"
            className="w-full py-2.5 pl-10 pr-9 text-sm text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/80 rounded-xl placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            placeholder="Search news or topics..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="Search news articles"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          {searchTerm && (
            <button 
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {categories.length > 1 && (
        <div className="px-3 sm:px-0 mb-6 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {currentNewsSlice.length === 0 ? (
        <div className="py-16 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 mx-3 sm:mx-0">
          <p className="text-base font-bold text-zinc-800 dark:text-zinc-200">No news articles found</p>
          <p className="text-xs text-zinc-400 mt-1 mb-4">Try adjusting your category or search keywords</p>
          {(activeCategory !== 'All' || searchTerm) && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 px-3 sm:px-0">
          {currentNewsSlice.map((item, idx) => (
            <NewsCard key={item.id || item.slug} item={item} index={idx} onShare={handleShare} />
          ))}
        </div>
      )}

      <NewsPagination 
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        paginationRange={paginationRange}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
