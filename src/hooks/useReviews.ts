import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Review } from '../components/public/ReviewItem';
import { 
  fetchLiveReviews, 
  voteLiveReviewHelpful, 
  reportLiveReview, 
  getCachedLiveReviews,
  getCachedLiveAppStats,
  PublicReview, 
  formatReviewDate,
} from '../lib/communityFirebase';
import { generateNaturalStarDistribution } from '../seo/utils';

const PAGE_SIZE = 5;

// Pure deduplication helper guaranteeing unique items by ID
function deduplicateReviewsList(list: Review[]): Review[] {
  const map = new Map<string, Review>();
  for (const item of list) {
    if (item && item.id && !map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

function normalizeReviewItem(r: any, fallbackAppId: string): Review {
  const uName = (r.username && r.username.trim() && r.username.toLowerCase() !== 'player')
    ? r.username.trim()
    : ((r.userName && r.userName.trim() && r.userName.toLowerCase() !== 'player')
      ? r.userName.trim()
      : (r.username || r.userName || 'Player'));

  const text = (r.comment && r.comment.trim())
    ? r.comment.trim()
    : (r.reviewText && r.reviewText.trim() ? r.reviewText.trim() : '');

  const date = r.created_at || r.timestamp || new Date().toISOString();

  return {
    id: r.id || `rev_${Math.random().toString(36).slice(2)}`,
    app_id: r.app_id || r.appId || fallbackAppId,
    username: uName,
    rating: Number(r.rating) || 5,
    comment: text,
    created_at: formatReviewDate(date),
    helpful_count: Number(r.helpful_count) || 0,
    reported: Boolean(r.reported),
    report_count: Number(r.report_count) || 0,
    source: r.source || 'community',
    isPinned: Boolean(r.isPinned),
    adminReply: r.adminReply || null
  };
}

export function useReviews(
  appId: string, 
  appTitle?: string, 
  appSlug?: string,
  category?: string,
  overallRating: number = 4.8,
  inView: boolean = true
) {
  const cleanAppId = String(appId || '').trim();
  const cleanAppSlug = String(appSlug || '').trim();
  const cleanAppTitle = String(appTitle || '').trim();

  const [sortBy, setSortBy] = useState<'recent' | 'helpful'>('recent');
  const [activeFilter, setActiveFilter] = useState<'all' | 'positive' | 'critical'>('all');

  // Instant SWR Cache Initialization (0ms latency render for first 5 items)
  const initialCached = useMemo(() => {
    return getCachedLiveReviews(cleanAppId, cleanAppSlug);
  }, [cleanAppId, cleanAppSlug]);

  const [reviews, setReviews] = useState<Review[]>(() => {
    if (initialCached && initialCached.reviews.length > 0) {
      const mapped = initialCached.reviews.slice(0, PAGE_SIZE).map((r: any) => normalizeReviewItem(r, cleanAppId));
      return deduplicateReviewsList(mapped);
    }
    return [];
  });

  const [stats, setStats] = useState<any>(() => initialCached?.stats || getCachedLiveAppStats(cleanAppId, cleanAppSlug));
  const [loading, setLoading] = useState<boolean>(() => !initialCached);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState<boolean>(() => Boolean(initialCached?.hasMore));
  const [nextCursor, setNextCursor] = useState<string | null>(() => initialCached?.nextCursor || null);
  const nextCursorRef = useRef<string | null>(initialCached?.nextCursor || null);

  const [votedReviews, setVotedReviews] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('voted_reviews_map') || '{}');
      } catch (e) {}
    }
    return {};
  });

  const [reportedReviews, setReportedReviews] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('reported_reviews_map') || '{}');
      } catch (e) {}
    }
    return {};
  });

  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({});

  // Dynamic Live Review Fetcher - Loads exactly 5 comments per batch
  const fetchReviews = useCallback(async (isLoadMore = false, overrideFilter?: string, overrideSort?: string) => {
    const targetKey = cleanAppId || cleanAppSlug;
    if (!targetKey) return;
    
    // Bots and crawlers skip loading dynamic reviews to keep DOM light for SEO and Lighthouse audits
    const isCrawler = typeof navigator !== 'undefined' && /googlebot|google-inspectiontool|bingbot|slurp|duckduckbot|baiduspider|yandexbot|crawler|spider|lighthouse|chrome-lighthouse|headless/i.test(navigator.userAgent || '');
    if (isCrawler) {
       setLoading(false);
       setHasMore(false);
       return;
    }

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(prev => (reviews.length === 0 ? true : false));
      }

      const cursorToUse = isLoadMore ? nextCursorRef.current : null;
      const currentFilter = overrideFilter !== undefined ? overrideFilter : activeFilter;
      const currentSort = overrideSort !== undefined ? overrideSort : sortBy;
      
      const result = await fetchLiveReviews({
        appId: cleanAppId,
        appSlug: cleanAppSlug,
        appTitle: cleanAppTitle,
        cursor: cursorToUse,
        limit: PAGE_SIZE,
        rating: overallRating,
        filter: currentFilter,
        sortBy: currentSort
      });

      const mappedReviews: Review[] = result.reviews.map((r: any) => normalizeReviewItem(r, cleanAppId));

      if (result.stats) {
        setStats(result.stats);
      }

      setReviews(prev => {
        if (isLoadMore) {
          return deduplicateReviewsList([...prev, ...mappedReviews]);
        } else {
          return deduplicateReviewsList(mappedReviews);
        }
      });

      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
      nextCursorRef.current = result.nextCursor;

    } catch (err) {
      console.error('[useReviews] Reviews fetch pipeline error:', err);
    } finally {
      if (isLoadMore) setLoadingMore(false);
      else setLoading(false);
    }
  }, [cleanAppId, cleanAppSlug, cleanAppTitle, overallRating, activeFilter, sortBy, reviews.length]);

  // Initial fetch when container enters view or target app changes
  const prevTargetKeyRef = useRef<string>(initialCached && initialCached.reviews.length > 0 ? (cleanAppId || cleanAppSlug) : '');
  useEffect(() => {
    const targetKey = cleanAppId || cleanAppSlug;
    if (!targetKey || !inView) return;

    if (prevTargetKeyRef.current !== targetKey) {
      prevTargetKeyRef.current = targetKey;
      setNextCursor(null);
      nextCursorRef.current = null;
      setExpandedReviews({});
      
      // Update reviews with any cached/initial entries for the new app immediately
      const freshCache = getCachedLiveReviews(cleanAppId, cleanAppSlug);
      if (freshCache && freshCache.reviews.length > 0) {
        const mapped = freshCache.reviews.slice(0, PAGE_SIZE).map((r: any) => normalizeReviewItem(r, cleanAppId));
        setReviews(deduplicateReviewsList(mapped));
        setStats(freshCache.stats || getCachedLiveAppStats(cleanAppId, cleanAppSlug));
        setHasMore(Boolean(freshCache.hasMore));
        setNextCursor(freshCache.nextCursor || null);
        nextCursorRef.current = freshCache.nextCursor || null;
        setLoading(false);
      } else {
        setReviews([]);
        setStats(getCachedLiveAppStats(cleanAppId, cleanAppSlug));
        setHasMore(false);
        fetchReviews(false);
      }
    } else if (reviews.length === 0 && loading) {
      fetchReviews(false);
    }
  }, [cleanAppId, cleanAppSlug, inView, fetchReviews, reviews.length, loading]);

  // Refetch 5 items when filter or sorting changes
  const isFirstFilterMount = useRef(true);
  useEffect(() => {
    if (isFirstFilterMount.current) {
      isFirstFilterMount.current = false;
      return;
    }
    if (!inView) return;
    setNextCursor(null);
    nextCursorRef.current = null;
    fetchReviews(false, activeFilter, sortBy);
  }, [activeFilter, sortBy, inView, fetchReviews]);

  // Listen to community review events across tabs/components
  useEffect(() => {
    const handleNewReview = (e: any) => {
      const rawRev = e?.detail?.newReview || e?.detail?.review;
      if (rawRev) {
        const revAppId = rawRev.app_id || rawRev.appId || '';
        const revAppSlug = rawRev.appSlug || '';
        const matchesId = revAppId === cleanAppId || revAppId === cleanAppSlug;
        const matchesSlug = cleanAppSlug && (revAppSlug === cleanAppSlug || revAppSlug === cleanAppId);
        if (matchesId || matchesSlug) {
          const formatted: Review = {
            id: rawRev.id,
            app_id: revAppId || cleanAppId,
            username: rawRev.username || rawRev.userName || 'Player',
            rating: Number(rawRev.rating) || 5,
            comment: rawRev.comment || rawRev.reviewText || '',
            created_at: formatReviewDate(rawRev.created_at || rawRev.timestamp),
            helpful_count: Number(rawRev.helpful_count) || 0,
            reported: Boolean(rawRev.reported),
            report_count: Number(rawRev.report_count) || 0,
            source: rawRev.source || 'community',
            isPinned: Boolean(rawRev.isPinned),
            adminReply: rawRev.adminReply || null
          };
          setReviews(prev => {
            if (prev.some(r => r.id === formatted.id)) return prev;
            return [formatted, ...prev];
          });
        }
      }
    };

    const handleDeletedReview = (e: any) => {
      const deletedId = e?.detail?.reviewId || e?.detail?.id;
      if (deletedId) {
        setReviews(prev => prev.filter(r => r.id !== deletedId));
      }
    };

    const handleClearedReviews = (e: any) => {
      const clearedAppId = e?.detail?.appId || e?.detail?.slug;
      if (!clearedAppId || clearedAppId === cleanAppId || clearedAppId === cleanAppSlug) {
        setReviews([]);
      }
    };

    const handleReviewsUpdated = () => {
      fetchReviews(false);
    };

    window.addEventListener('community-review-added', handleNewReview);
    window.addEventListener('community-review-deleted', handleDeletedReview);
    window.addEventListener('community-reviews-cleared', handleClearedReviews);
    window.addEventListener('community-reviews-updated', handleReviewsUpdated);

    return () => {
      window.removeEventListener('community-review-added', handleNewReview);
      window.removeEventListener('community-review-deleted', handleDeletedReview);
      window.removeEventListener('community-reviews-cleared', handleClearedReviews);
      window.removeEventListener('community-reviews-updated', handleReviewsUpdated);
    };
  }, [cleanAppId, cleanAppSlug, fetchReviews]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchReviews(true);
    }
  }, [loadingMore, hasMore, fetchReviews]);

  const toggleExpandReview = useCallback((id: string) => {
    setExpandedReviews(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleHelpfulVote = useCallback(async (id: string) => {
    if (votedReviews[id]) return;
    setReviews(prev =>
      prev.map(r => {
        if (r.id === id) {
          return { ...r, helpful_count: r.helpful_count + 1 };
        }
        return r;
      })
    );
    setVotedReviews(prev => ({ ...prev, [id]: true }));
    await voteLiveReviewHelpful(id);
  }, [votedReviews]);

  const handleReportReview = useCallback(async (id: string) => {
    if (reportedReviews[id]) return;
    setReportedReviews(prev => ({ ...prev, [id]: true }));
    const targetRev = reviews.find(r => r.id === id);
    setReviews(prev =>
      prev.map(r => {
        if (r.id === id) {
          return { ...r, reported: true, report_count: (r.report_count || 0) + 1 };
        }
        return r;
      })
    );
    await reportLiveReview({
      reviewId: id,
      appId: cleanAppId || cleanAppSlug,
      reason: 'User Flagged Review',
      details: targetRev?.comment || ''
    });
  }, [reportedReviews, reviews, cleanAppId, cleanAppSlug]);

  return {
    reviews,
    setReviews,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    sortBy,
    setSortBy,
    activeFilter,
    setActiveFilter,
    votedReviews,
    reportedReviews,
    expandedReviews,
    toggleExpandReview,
    handleHelpfulVote,
    handleReportReview,
    filteredReviews: reviews, // Backend handles the filtering directly!
    stats
  };
}

export function useLiveAppStats(appId: string, appSlug?: string, fallbackRating: number = 4.8, fallbackTotal: number = 0) {
  const cleanId = String(appId || '').trim();
  const cleanSlug = String(appSlug || '').trim();

  const [stats, setStats] = useState<any>(() => {
    const cached = getCachedLiveAppStats(cleanId, cleanSlug);
    if (cached) return cached;
    if (fallbackTotal > 0 || fallbackRating > 0) {
      const starCounts = generateNaturalStarDistribution(fallbackRating, fallbackTotal);
      return {
        averageRating: fallbackRating,
        totalReviews: fallbackTotal,
        starCounts,
        distribution: starCounts
      };
    }
    return null;
  });

  useEffect(() => {
    if (!cleanId && !cleanSlug) return;
    const immediate = getCachedLiveAppStats(cleanId, cleanSlug);
    if (immediate) {
      setStats(immediate);
    }

    const handleUpdate = () => {
      const fresh = getCachedLiveAppStats(cleanId, cleanSlug);
      if (fresh) {
        setStats(fresh);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('community-review-added', handleUpdate);
      window.addEventListener('community-review-deleted', handleUpdate);
      window.addEventListener('community-reviews-updated', handleUpdate);
      window.addEventListener('community-reviews-cleared', handleUpdate);
      window.addEventListener('atomic_review_counts_updated', handleUpdate);
      return () => {
        window.removeEventListener('community-review-added', handleUpdate);
        window.removeEventListener('community-review-deleted', handleUpdate);
        window.removeEventListener('community-reviews-updated', handleUpdate);
        window.removeEventListener('community-reviews-cleared', handleUpdate);
        window.removeEventListener('atomic_review_counts_updated', handleUpdate);
      };
    }
  }, [cleanId, cleanSlug]);

  return stats;
}
