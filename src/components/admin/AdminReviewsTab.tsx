import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Star,
  Search,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Pin,
  Trash2,
  Edit3,
  CornerDownRight,
  Sparkles,
  Check,
  X,
  AlertTriangle,
  ThumbsUp,
  ArrowUpDown,
  ShieldCheck,
  ExternalLink,
  Layers,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  BarChart3
} from 'lucide-react';
import {
  fetchAdminReviewsList,
  fetchAdminAppReviewCounts,
  createAdminReviewItem,
  updateAdminReviewItem,
  setAdminReviewStatus,
  toggleAdminReviewPin,
  deleteAdminReviewItem,
  performBulkReviewsAction,
  submitAdminReplyToReview,
  persistAuthoritativeAtomicCatalogStats,
  getLiveAtomicReviewStatsSync,
  registerCatalogAppsForReviews,
  buildPublicCommunitySyncBundle,
  AdminReviewItem,
  AppReviewCountsData,
  formatReviewDate
} from '../../lib/adminCommunityFirebase';
import { toast } from '../Toast';
import { getOptimizedImageUrl } from '../../seo/utils';
import { adminFetch } from '../../services/adminAuthService';

export type ReviewData = AdminReviewItem;

interface AdminReviewsTabProps {
  appsList: any[];
  onNavigateToAIStudio?: () => void;
  pushAllToGitHub?: (customConfig?: any, onProgress?: (msg: string) => void) => Promise<any>;
  gitConfig?: any;
}

export const AdminReviewsTab: React.FC<AdminReviewsTabProps> = ({
  appsList = [],
  onNavigateToAIStudio,
  pushAllToGitHub,
  gitConfig
}) => {
  // Register live catalog apps immediately so canonical ID/Slug resolution has 100% coverage
  useEffect(() => {
    if (Array.isArray(appsList) && appsList.length > 0) {
      registerCatalogAppsForReviews(appsList);
    }
  }, [appsList]);

  // 1. Atomic Stats State (Initialized synchronously from Unified Review Ledger)
  const initialAtomic = useMemo(() => {
    if (Array.isArray(appsList) && appsList.length > 0) {
      registerCatalogAppsForReviews(appsList);
    }
    return getLiveAtomicReviewStatsSync();
  }, [appsList]);

  const [appCountsMap, setAppCountsMap] = useState<Record<string, AppReviewCountsData>>(
    () => initialAtomic?.appCounts || {}
  );
  const [globalAtomicStats, setGlobalAtomicStats] = useState<{
    total: number;
    published: number;
    pending: number;
    rejected: number;
    flagged: number;
    averageRating: number;
    ratingDistribution?: Record<string, number>;
    appCoverageCount?: number;
  }>(() => ({
    total: initialAtomic?.globalStats?.total ?? 0,
    published: initialAtomic?.globalStats?.published ?? 0,
    pending: initialAtomic?.globalStats?.pending ?? 0,
    rejected: initialAtomic?.globalStats?.rejected ?? 0,
    flagged: initialAtomic?.globalStats?.flagged ?? 0,
    averageRating: initialAtomic?.globalStats?.averageRating || 4.7,
    ratingDistribution: initialAtomic?.globalStats?.ratingDistribution || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    appCoverageCount: initialAtomic?.globalStats?.appCoverageCount ?? 0
  }));

  // 2. Navigation & Filter States
  const [selectedAppId, setSelectedAppId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [pinnedFilter, setPinnedFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Catalog Matrix States
  const [appGridSearch, setAppGridSearch] = useState<string>('');
  const [appMatrixFilter, setAppMatrixFilter] = useState<'all' | 'with_reviews' | 'pending' | 'empty'>('all');
  const [appMatrixSort, setAppMatrixSort] = useState<'most_reviews' | 'highest_rating' | 'lowest_rating' | 'pending_first' | 'empty_first' | 'name'>('most_reviews');
  const [showAllCatalogApps, setShowAllCatalogApps] = useState<boolean>(false);

  // Reviews Feed & Scope Stats States
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [scopeStats, setScopeStats] = useState<{
    total: number;
    published: number;
    pending: number;
    rejected: number;
    flagged: number;
    averageRating: number;
    starCounts: Record<string, number>;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [syncingPublic, setSyncingPublic] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');

  // Selection & Modals
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingReview, setEditingReview] = useState<AdminReviewItem | null>(null);
  const [replyingReview, setReplyingReview] = useState<AdminReviewItem | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [replyAuthor, setReplyAuthor] = useState<string>('Official Support');
  const [submittingModal, setSubmittingModal] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    appId: '',
    userName: '',
    rating: 5,
    reviewText: '',
    status: 'published' as 'published' | 'pending' | 'rejected',
    isPinned: false,
    helpful_count: 0,
    timestamp: new Date().toISOString().slice(0, 16)
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 220);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAppId, statusFilter, ratingFilter, pinnedFilter, sortBy]);

  // Listen for external navigation events (e.g. from AdminCommunityOverviewCard)
  useEffect(() => {
    const handleSelectAppEvent = (e: any) => {
      if (e.detail && e.detail.appId) {
        setSelectedAppId(String(e.detail.appId));
      }
    };
    window.addEventListener('admin-select-app-reviews', handleSelectAppEvent);
    return () => window.removeEventListener('admin-select-app-reviews', handleSelectAppEvent);
  }, []);

  // Listen for real-time atomic counter updates from anywhere in the app
  useEffect(() => {
    const handleAtomicUpdate = (e: any) => {
      if (e.detail) {
        if (e.detail.appCounts) {
          setAppCountsMap({ ...e.detail.appCounts });
        }
        if (e.detail.globalStats) {
          setGlobalAtomicStats(prev => ({
            ...prev,
            ...e.detail.globalStats
          }));
        }
      }
    };
    window.addEventListener('atomic_review_counts_updated', handleAtomicUpdate);
    return () => window.removeEventListener('atomic_review_counts_updated', handleAtomicUpdate);
  }, []);

  // Load reviews for current scope (works for BOTH 'all' and a specific app!)
  const loadReviewsScope = useCallback(async (isForceRefresh = false) => {
    if (isForceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const listRes = await fetchAdminReviewsList({
        appId: selectedAppId,
        status: statusFilter,
        rating: ratingFilter,
        isPinned: pinnedFilter === 'all' ? undefined : pinnedFilter === 'pinned',
        sortBy,
        search: debouncedSearch,
        limit: 25,
        page: currentPage,
        refresh: isForceRefresh
      });

      setReviews(listRes.reviews || []);
      setTotalCount(listRes.total ?? listRes.totalCount ?? (listRes.reviews ? listRes.reviews.length : 0));
      setTotalPages(listRes.totalPages || 1);

      if (listRes.stats) {
        setScopeStats({
          total: listRes.stats.total,
          published: listRes.stats.published,
          pending: listRes.stats.pending,
          rejected: listRes.stats.rejected,
          flagged: listRes.stats.flagged,
          averageRating: listRes.stats.averageRating,
          starCounts: listRes.stats.starCounts || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
        });
      }

      if (listRes.appCounts) {
        setAppCountsMap(listRes.appCounts);
      }
      if (listRes.globalStats) {
        setGlobalAtomicStats(prev => ({
          ...prev,
          ...listRes.globalStats
        }));
      }

      setSelectedIds(new Set());
    } catch (e) {
      console.error('[AdminReviewsTab] Error loading reviews:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedAppId, statusFilter, ratingFilter, pinnedFilter, sortBy, debouncedSearch, currentPage]);

  useEffect(() => {
    loadReviewsScope(false);
  }, [loadReviewsScope]);

  // Initial session hydration check
  useEffect(() => {
    fetchAdminAppReviewCounts(false)
      .then(res => {
        if (res.appCounts) setAppCountsMap(res.appCounts);
        if (res.globalStats) setGlobalAtomicStats(prev => ({ ...prev, ...res.globalStats }));
      })
      .catch(() => {});
  }, []);

  // Resolve per-app stats with 100% canonical parity
  const getAppStat = useCallback((app: any): AppReviewCountsData => {
    if (!app) {
      return { total: 0, published: 0, pending: 0, rejected: 0, flagged: 0, avgRating: 4.6, starCounts: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } };
    }
    const slugKey = String(app.slug || '').toLowerCase().trim();
    const idKey = String(app.id || '').toLowerCase().trim();
    const hit = (slugKey && appCountsMap[slugKey]) || (idKey && appCountsMap[idKey]);

    if (hit) {
      return {
        total: Number(hit.total) || 0,
        published: Number(hit.published) || 0,
        pending: Number(hit.pending) || 0,
        rejected: Number(hit.rejected) || 0,
        flagged: Number(hit.flagged) || 0,
        avgRating: Number(hit.avgRating) || Number(app.rating) || 4.6,
        starCounts: hit.starCounts || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
      };
    }

    return {
      total: 0,
      published: 0,
      pending: 0,
      rejected: 0,
      flagged: 0,
      avgRating: Number(app.rating) || 4.6,
      starCounts: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    };
  }, [appCountsMap]);

  const selectedAppObj = useMemo(() => {
    if (selectedAppId === 'all') return null;
    const q = selectedAppId.toLowerCase().trim();
    return appsList.find(
      a =>
        String(a.id || '').toLowerCase().trim() === q ||
        String(a.slug || '').toLowerCase().trim() === q ||
        String(a.name || '').toLowerCase().trim() === q
    ) || null;
  }, [selectedAppId, appsList]);

  // Inside Workspace Stats: Guaranteed 100% reconciled with scopeStats and appCountsMap!
  const selectedAppStats = useMemo(() => {
    if (!selectedAppObj) return null;
    const fromMap = getAppStat(selectedAppObj);
    if (scopeStats && selectedAppId !== 'all') {
      return {
        total: scopeStats.total,
        published: scopeStats.published,
        pending: scopeStats.pending,
        rejected: scopeStats.rejected,
        flagged: scopeStats.flagged,
        avgRating: scopeStats.total > 0 ? scopeStats.averageRating : fromMap.avgRating,
        starCounts: scopeStats.starCounts || fromMap.starCounts || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
      };
    }
    return fromMap;
  }, [selectedAppObj, getAppStat, scopeStats, selectedAppId]);

  // Enrich all catalog apps with their exact atomic stats
  const enrichedCatalogApps = useMemo(() => {
    return appsList.map(app => {
      const st = getAppStat(app);
      return {
        ...app,
        _stats: st
      };
    });
  }, [appsList, getAppStat]);

  // Matrix filter counts (deduplicated per real catalog app!)
  const matrixCounts = useMemo(() => {
    let withReviews = 0;
    let pendingApps = 0;
    let emptyApps = 0;
    for (const app of enrichedCatalogApps) {
      if (app._stats.total > 0) withReviews++;
      else emptyApps++;
      if (app._stats.pending > 0) pendingApps++;
    }
    return {
      all: enrichedCatalogApps.length,
      withReviews,
      pendingApps,
      emptyApps
    };
  }, [enrichedCatalogApps]);

  const filteredCatalogApps = useMemo(() => {
    let list = [...enrichedCatalogApps];

    if (appMatrixFilter === 'with_reviews') {
      list = list.filter(a => a._stats.total > 0);
    } else if (appMatrixFilter === 'pending') {
      list = list.filter(a => a._stats.pending > 0);
    } else if (appMatrixFilter === 'empty') {
      list = list.filter(a => a._stats.total === 0);
    }

    if (appGridSearch.trim()) {
      const q = appGridSearch.toLowerCase().trim();
      list = list.filter(
        a =>
          (a.name || '').toLowerCase().includes(q) ||
          (a.slug || '').toLowerCase().includes(q) ||
          (a.category || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (appMatrixSort === 'pending_first') {
        if (b._stats.pending !== a._stats.pending) return b._stats.pending - a._stats.pending;
        return b._stats.total - a._stats.total;
      }
      if (appMatrixSort === 'highest_rating') {
        if (b._stats.avgRating !== a._stats.avgRating) return b._stats.avgRating - a._stats.avgRating;
        return b._stats.total - a._stats.total;
      }
      if (appMatrixSort === 'lowest_rating') {
        const aHas = a._stats.total > 0 ? 0 : 1;
        const bHas = b._stats.total > 0 ? 0 : 1;
        if (aHas !== bHas) return aHas - bHas;
        return a._stats.avgRating - b._stats.avgRating;
      }
      if (appMatrixSort === 'empty_first') {
        if (a._stats.total !== b._stats.total) return a._stats.total - b._stats.total;
        return String(a.name || '').localeCompare(String(b.name || ''));
      }
      if (appMatrixSort === 'name') {
        return String(a.name || '').localeCompare(String(b.name || ''));
      }
      // Default: most_reviews
      if (b._stats.total !== a._stats.total) return b._stats.total - a._stats.total;
      return b._stats.avgRating - a._stats.avgRating;
    });

    return list;
  }, [enrichedCatalogApps, appMatrixFilter, appGridSearch, appMatrixSort]);

  // Actions
  const handleCloudRecalculate = async () => {
    setRefreshing(true);
    try {
      await fetchAdminAppReviewCounts(true);
      const synced = await persistAuthoritativeAtomicCatalogStats(appsList);
      setAppCountsMap(synced.appCounts);
      setGlobalAtomicStats(synced.globalStats);
      await loadReviewsScope(true);
      toast(
        `Atomic Index verified: ${synced.globalStats.total.toLocaleString()} reviews across ${synced.globalStats.appCoverageCount || 0} apps (${synced.globalStats.averageRating}★)`,
        'success'
      );
    } catch (e: any) {
      toast('Error recalculating atomic stats: ' + (e?.message || 'Unknown error'), 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSyncReviewsToPublicSite = async () => {
    if (syncingPublic) return;
    setSyncingPublic(true);
    setSyncStatusMsg('Building atomic bundle...');
    try {
      const bundle = await buildPublicCommunitySyncBundle(appsList);

      // 1. Always sync local server static files first
      setSyncStatusMsg('Updating local public static files...');
      try {
        await adminFetch('/api/v1/admin/sync-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apps: bundle.harmonizedApps,
            catalogStats: bundle.communityStatsPayload,
            staticReviews: bundle.communityReviewsPayload
          })
        });
      } catch (_) {}

      // 2. If GitHub Sync is configured and passed, push to public repository as well
      if (pushAllToGitHub && gitConfig && (gitConfig.owner || gitConfig.repo)) {
        setSyncStatusMsg('Pushing to GitHub Public Repo...');
        await pushAllToGitHub(gitConfig, (msg: string) => {
          setSyncStatusMsg(msg.replace(/^GitHub Sync:\s*/i, ''));
        });
        toast(
          `Synced ${bundle.communityStatsPayload.totalReviews} published reviews & atomic ratings to Public Website & GitHub!`,
          'success'
        );
      } else {
        toast(
          `Synchronized ${bundle.communityStatsPayload.totalReviews} published reviews & atomic ratings to Public Website bundle!`,
          'success'
        );
      }

      await loadReviewsScope(false);
    } catch (e: any) {
      toast('Public sync error: ' + (e?.message || 'Could not complete sync'), 'error');
    } finally {
      setSyncingPublic(false);
      setSyncStatusMsg('');
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === reviews.length && reviews.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reviews.map(r => r.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkAction = async (action: 'publish' | 'pending' | 'reject' | 'delete' | 'pin' | 'unpin') => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      setBulkProcessing(true);
      const res = await performBulkReviewsAction(action, ids, reviews);
      if (res.success) {
        toast(`Applied "${action}" to ${res.count} review(s)`, 'success');
        await loadReviewsScope(false);
      } else {
        toast('Bulk action failed', 'error');
      }
    } catch (_) {
      toast('Error performing bulk action', 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleOpenCreateModal = (prefillAppId?: string) => {
    const defaultApp =
      prefillAppId ||
      (selectedAppObj ? String(selectedAppObj.id) : (appsList[0]?.id ? String(appsList[0].id) : ''));
    setFormData({
      appId: defaultApp,
      userName: '',
      rating: 5,
      reviewText: '',
      status: 'published',
      isPinned: false,
      helpful_count: 0,
      timestamp: new Date().toISOString().slice(0, 16)
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (rev: AdminReviewItem) => {
    const matchedApp = appsList.find(
      a =>
        String(a.id || '').toLowerCase() === String(rev.appId || '').toLowerCase() ||
        String(a.slug || '').toLowerCase() === String(rev.appSlug || rev.appId || '').toLowerCase()
    );
    let formattedDate = new Date().toISOString().slice(0, 16);
    try {
      if (rev.timestamp) {
        formattedDate = new Date(rev.timestamp).toISOString().slice(0, 16);
      }
    } catch (_) {}

    setFormData({
      appId: matchedApp ? String(matchedApp.id) : (rev.appId || ''),
      userName: rev.userName || 'Player',
      rating: Number(rev.rating) || 5,
      reviewText: rev.reviewText || rev.comment || '',
      status: (rev.status as any) || 'published',
      isPinned: Boolean(rev.isPinned),
      helpful_count: Number(rev.helpful_count) || 0,
      timestamp: formattedDate
    });
    setEditingReview(rev);
  };

  const handleSaveModalForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.appId || !formData.reviewText.trim()) {
      toast('Please select an application and write review text', 'error');
      return;
    }

    const targetApp = appsList.find(
      a =>
        String(a.id) === String(formData.appId) ||
        String(a.slug || '').toLowerCase() === String(formData.appId).toLowerCase()
    );

    try {
      setSubmittingModal(true);
      const isoTimestamp = formData.timestamp ? new Date(formData.timestamp).toISOString() : new Date().toISOString();

      if (editingReview) {
        await updateAdminReviewItem(editingReview.id, {
          appId: targetApp ? String(targetApp.id) : formData.appId,
          appSlug: targetApp?.slug || editingReview.appSlug || '',
          appName: targetApp?.name || editingReview.appName || '',
          userName: formData.userName.trim() || 'Player',
          rating: Number(formData.rating) || 5,
          reviewText: formData.reviewText.trim(),
          status: formData.status,
          isPinned: formData.isPinned,
          helpful_count: Number(formData.helpful_count) || 0,
          timestamp: isoTimestamp
        });
        toast('Review updated & atomic index recalculated', 'success');
        setEditingReview(null);
      } else {
        await createAdminReviewItem({
          appId: targetApp ? String(targetApp.id) : formData.appId,
          appSlug: targetApp?.slug || '',
          appName: targetApp?.name || '',
          userName: formData.userName.trim() || 'Player',
          rating: Number(formData.rating) || 5,
          reviewText: formData.reviewText.trim(),
          status: formData.status,
          isPinned: formData.isPinned,
          helpful_count: Number(formData.helpful_count) || 0,
          timestamp: isoTimestamp
        });
        toast('Review created & added to live atomic index', 'success');
        setIsCreateModalOpen(false);
      }

      await loadReviewsScope(false);
    } catch (err: any) {
      toast('Error saving review: ' + (err?.message || 'Failed'), 'error');
    } finally {
      setSubmittingModal(false);
    }
  };

  const handleQuickStatusChange = async (rev: AdminReviewItem, newStatus: 'published' | 'pending' | 'rejected') => {
    try {
      await setAdminReviewStatus(rev.id, newStatus, {
        appId: rev.appId,
        appSlug: rev.appSlug,
        rating: rev.rating,
        status: rev.status
      });
      toast(`Review marked as ${newStatus}`, 'success');
      await loadReviewsScope(false);
    } catch (_) {
      toast('Failed to update status', 'error');
    }
  };

  const handleQuickTogglePin = async (rev: AdminReviewItem) => {
    try {
      const nextPin = !rev.isPinned;
      await toggleAdminReviewPin(rev.id, nextPin);
      toast(nextPin ? 'Review pinned to top' : 'Review unpinned', 'success');
      await loadReviewsScope(false);
    } catch (_) {
      toast('Failed to toggle pin', 'error');
    }
  };

  const handleDeleteReview = async (rev: AdminReviewItem) => {
    try {
      await deleteAdminReviewItem(rev.id, {
        appId: rev.appId,
        appSlug: rev.appSlug,
        rating: rev.rating,
        status: rev.status
      });
      toast('Review deleted & atomic count decremented', 'success');
      await loadReviewsScope(false);
    } catch (_) {
      toast('Error deleting review', 'error');
    }
  };

  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingReview) return;
    try {
      setSubmittingModal(true);
      await submitAdminReplyToReview(replyingReview.id, replyText, replyAuthor);
      toast(replyText.trim() ? 'Official reply saved' : 'Official reply cleared', 'success');
      setReplyingReview(null);
      await loadReviewsScope(false);
    } catch (_) {
      toast('Error saving reply', 'error');
    } finally {
      setSubmittingModal(false);
    }
  };

  const globalDist = globalAtomicStats.ratingDistribution || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  const publishedPct = globalAtomicStats.total > 0
    ? Math.round((globalAtomicStats.published / globalAtomicStats.total) * 100)
    : 100;

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in pb-12">
      {/* =====================================================================
          1. TOP COMMAND HEADER & GLOBAL ATOMIC KPI DASHBOARD
         ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Reviews & Atomic Ratings Console
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Zero-Quota Unified Ledger
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                100% synchronized atomic counts across Outside Cards, Inside App Workspaces, and Public Website.
              </p>
            </div>
          </div>

          {/* Primary Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToAIStudio && (
              <button
                type="button"
                onClick={onNavigateToAIStudio}
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer border-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Review Studio</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenCreateModal(selectedAppId !== 'all' ? selectedAppId : undefined)}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer border-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Review</span>
            </button>

            <button
              type="button"
              onClick={handleSyncReviewsToPublicSite}
              disabled={syncingPublic || refreshing}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer border-0 disabled:opacity-60"
              title="Compile published reviews & atomic ratings and sync to Public Website"
            >
              <UploadCloud className={`w-3.5 h-3.5 ${syncingPublic ? 'animate-bounce' : ''}`} />
              <span>{syncingPublic ? (syncStatusMsg || 'Syncing...') : 'Sync Public Site'}</span>
            </button>

            <button
              type="button"
              onClick={handleCloudRecalculate}
              disabled={refreshing || syncingPublic}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border-0 disabled:opacity-50"
              title="Verify & recalculate atomic stats from Cloud Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-500' : ''}`} />
              <span className="hidden xs:inline">Verify Index</span>
            </button>
          </div>
        </div>

        {/* 4-Card Live Atomic Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Reviews */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Reviews
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                {matrixCounts.withReviews}/{appsList.length} Apps
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1.5">
              {globalAtomicStats.total.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span>{globalAtomicStats.published} Live</span>
              <span>•</span>
              <span>{globalAtomicStats.pending} Pending</span>
              {globalAtomicStats.rejected > 0 && (
                <>
                  <span>•</span>
                  <span>{globalAtomicStats.rejected} Rejected</span>
                </>
              )}
            </div>
          </div>

          {/* Card 2: Published Live */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Published (Live)
              </span>
              <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                {publishedPct}%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-1.5">
              {globalAtomicStats.published.toLocaleString()}
            </div>
            <div className="w-full h-1.5 bg-emerald-200/60 dark:bg-emerald-950 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, publishedPct))}%` }}
              />
            </div>
          </div>

          {/* Card 3: Pending Moderation */}
          <div
            onClick={() => {
              setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending');
            }}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              statusFilter === 'pending'
                ? 'bg-amber-100/80 dark:bg-amber-950/50 border-amber-400 dark:border-amber-700 ring-2 ring-amber-400/30'
                : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Pending Queue
              </span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-300 mt-1.5">
              {globalAtomicStats.pending.toLocaleString()}
            </div>
            <div className="text-[10px] font-bold text-amber-700/80 dark:text-amber-400/80 mt-1">
              {statusFilter === 'pending' ? 'Showing Pending Only (Tap to Clear)' : 'Tap to filter Pending Queue →'}
            </div>
          </div>

          {/* Card 4: Overall Ranking Index & Star Distribution */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Overall Rating Index
              </span>
              <div className="flex items-center gap-0.5 text-amber-500">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {Number(globalAtomicStats.averageRating || 4.7).toFixed(1)}
                </span>
              </div>
            </div>
            <div className="space-y-1 mt-2">
              {[5, 4, 3, 2, 1].map(star => {
                const cnt = Number(globalDist[String(star)] || 0);
                const pct = globalAtomicStats.total > 0 ? Math.round((cnt / globalAtomicStats.total) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600 dark:text-slate-400">
                    <span className="w-4">{star}★</span>
                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-7 text-right">{cnt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. ATOMIC CATALOG MATRIX (WHEN VIEWING ALL APPS)
             OR DEDICATED APP WORKSPACE HEADER (WHEN VIEWING A SPECIFIC APP)
         ===================================================================== */}
      {selectedAppId === 'all' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Atomic Reviews Catalog Distribution Matrix</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tap any application card to open its dedicated review workspace, or add a review directly.
              </p>
            </div>

            {/* Matrix Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: `All Apps (${matrixCounts.all})` },
                { id: 'with_reviews', label: `Has Reviews (${matrixCounts.withReviews})` },
                { id: 'pending', label: `Needs Review (${matrixCounts.pendingApps})` },
                { id: 'empty', label: `0 Reviews (${matrixCounts.emptyApps})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAppMatrixFilter(tab.id as any)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                    appMatrixFilter === tab.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 border-slate-200/70 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Sort Controls for Catalog Matrix */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={appGridSearch}
                onChange={e => setAppGridSearch(e.target.value)}
                placeholder="Search app in matrix by name, slug, or category..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              {appGridSearch && (
                <button
                  type="button"
                  onClick={() => setAppGridSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Sort:
              </span>
              <select
                value={appMatrixSort}
                onChange={e => setAppMatrixSort(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="most_reviews">Most Reviews First</option>
                <option value="highest_rating">Highest Rated First</option>
                <option value="lowest_rating">Lowest Rated First</option>
                <option value="pending_first">Pending Moderation First</option>
                <option value="empty_first">Zero Reviews First</option>
                <option value="name">App Name (A–Z)</option>
              </select>
            </div>
          </div>

          {/* App Cards Grid */}
          {filteredCatalogApps.length === 0 ? (
            <div className="text-center py-8 bg-slate-50/60 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                No applications match the selected matrix filter.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {(showAllCatalogApps ? filteredCatalogApps : filteredCatalogApps.slice(0, 12)).map(app => {
                  const st: AppReviewCountsData = app._stats;
                  const targetKey = String(app.slug || app.id);
                  const starDist = st.starCounts || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
                  const positivePct = st.total > 0
                    ? Math.round((((Number(starDist['5']) || 0) + (Number(starDist['4']) || 0)) / st.total) * 100)
                    : 0;

                  return (
                    <div
                      key={app.id || app.slug}
                      onClick={() => setSelectedAppId(targetKey)}
                      className="group p-3.5 rounded-2xl bg-slate-50/70 hover:bg-blue-50/50 dark:bg-slate-800/40 dark:hover:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/60 transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={getOptimizedImageUrl(app.icon_url || '/logo.png', 96)}
                            alt={app.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200/60 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-900"
                            loading="lazy"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {app.name}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                              <span className="truncate">{(app.category || 'Apps').split(',')[0]}</span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                {Number(st.avgRating || 4.6).toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenCreateModal(String(app.id));
                          }}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-blue-600 hover:text-white text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer shrink-0"
                          title={`Quick add review for ${app.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Atomic Counters Bar */}
                      <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-slate-900 dark:text-white">
                              {st.total} {st.total === 1 ? 'Review' : 'Reviews'}
                            </span>
                            {st.published > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                                {st.published} Live
                              </span>
                            )}
                            {st.pending > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold animate-pulse">
                                {st.pending} Pending
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                            Open →
                          </span>
                        </div>

                        {/* Mini sentiment progress bar */}
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              st.total === 0 ? 'w-0' : 'bg-gradient-to-r from-emerald-500 to-blue-500'
                            }`}
                            style={{ width: st.total > 0 ? `${Math.max(12, positivePct)}%` : '0%' }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredCatalogApps.length > 12 && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowAllCatalogApps(prev => !prev)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer border-0"
                  >
                    {showAllCatalogApps
                      ? 'Show Top 12 Apps Only'
                      : `Show All ${filteredCatalogApps.length} Catalog Apps (${filteredCatalogApps.length - 12} more)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ===================================================================
           DEDICATED APP REVIEW WORKSPACE HEADER (100% Reconciled Inside View)
           =================================================================== */
        <div className="bg-white dark:bg-slate-900 border-2 border-blue-500/30 dark:border-blue-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedAppId('all');
                  setRatingFilter('all');
                  setStatusFilter('all');
                }}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer border-0 shrink-0"
                title="Back to All Catalog Apps"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {selectedAppObj && (
                <img
                  src={getOptimizedImageUrl(selectedAppObj.icon_url || '/logo.png', 120)}
                  alt={selectedAppObj.name}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-900"
                />
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                    {selectedAppObj?.name || selectedAppId}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase">
                    App Workspace
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>Slug: <code className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedAppObj?.slug || selectedAppId}</code></span>
                  {selectedAppObj?.slug && (
                    <>
                      <span>•</span>
                      <a
                        href={`/app/${selectedAppObj.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                      >
                        <span>View Live Public Page</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenCreateModal(selectedAppObj ? String(selectedAppObj.id) : selectedAppId)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer border-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Review to {selectedAppObj?.name || 'App'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedAppId('all');
                  setRatingFilter('all');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer border-0"
              >
                <span>All Apps Matrix</span>
              </button>
            </div>
          </div>

          {/* Reconciled Per-App Score Summary & Interactive Star Filter */}
          {selectedAppStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
                <div className="text-center shrink-0 pr-4 border-r border-slate-200 dark:border-slate-700">
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-none">
                    {Number(selectedAppStats.avgRating || 4.6).toFixed(1)}
                  </div>
                  <div className="flex items-center justify-center gap-0.5 my-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${s <= Math.round(Number(selectedAppStats.avgRating || 5)) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                      />
                    ))}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    {selectedAppStats.total} Total
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 flex-1 text-center">
                  <div className="p-2 rounded-xl bg-emerald-500/10">
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {selectedAppStats.published}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">Live</div>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-500/10">
                    <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {selectedAppStats.pending}
                    </div>
                    <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300">Pending</div>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-500/10">
                    <div className="text-lg font-black text-rose-600 dark:text-rose-400">
                      {selectedAppStats.rejected}
                    </div>
                    <div className="text-[10px] font-bold text-rose-700 dark:text-rose-300">Rejected</div>
                  </div>
                </div>
              </div>

              {/* Interactive Star Breakdown (Tap a bar to filter by star rating) */}
              <div className="md:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                    Star Breakdown (Tap any row to filter)
                  </span>
                  {ratingFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setRatingFilter('all')}
                      className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer bg-transparent border-0 p-0 text-[11px] font-bold"
                    >
                      Clear {ratingFilter}★ filter
                    </button>
                  )}
                </div>
                {[5, 4, 3, 2, 1].map(star => {
                  const count = Number(selectedAppStats.starCounts?.[String(star)] || 0);
                  const pct = selectedAppStats.total > 0 ? Math.round((count / selectedAppStats.total) * 100) : 0;
                  const isSelected = ratingFilter === String(star);
                  return (
                    <div
                      key={star}
                      onClick={() => setRatingFilter(isSelected ? 'all' : String(star))}
                      className={`flex items-center gap-2.5 px-2 py-0.5 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-500/15 ring-1 ring-blue-500/40' : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <span className="w-6 text-xs font-extrabold text-slate-700 dark:text-slate-300">{star} ★</span>
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-16 text-right text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          3. UNIFIED REVIEWS MODERATION & MANAGEMENT FEED
             (Works seamlessly for BOTH Global Catalog & Single App Workspace!)
         ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {selectedAppObj
                  ? `Reviews Feed for ${selectedAppObj.name} (${totalCount})`
                  : `Live Global Reviews Feed Across All Apps (${totalCount})`}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedAppObj
                  ? 'Every addition, edit, status change, or deletion updates the outside card and public bundle immediately.'
                  : 'Moderate recent reviews across the entire catalog, or filter by status, star rating, or application.'}
              </p>
            </div>
          </div>

          {/* App Quick Switcher Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedAppId}
              onChange={e => setSelectedAppId(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[220px] truncate cursor-pointer"
            >
              <option value="all">All Catalog Apps ({globalAtomicStats.total})</option>
              {enrichedCatalogApps.map(a => (
                <option key={a.id} value={a.slug || a.id}>
                  {a.name} ({a._stats.total})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Box */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search review text, player name, or app name..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published (Live)</option>
            <option value="pending">Pending Moderation</option>
            <option value="rejected">Rejected</option>
            <option value="flagged">Flagged / Reported</option>
          </select>

          {/* Rating Filter */}
          <select
            value={ratingFilter}
            onChange={e => setRatingFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">All Star Ratings</option>
            <option value="5">5 Stars Only (★★★★★)</option>
            <option value="4">4 Stars Only (★★★★)</option>
            <option value="3">3 Stars Only (★★★)</option>
            <option value="2">2 Stars Only (★★)</option>
            <option value="1">1 Star Only (★)</option>
          </select>

          {/* Sort Order */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
            <option value="helpful">Most Helpful Votes</option>
          </select>
        </div>

        {/* Bulk Selection Action Bar */}
        {reviews.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedIds.size === reviews.length && reviews.length > 0}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>
                {selectedIds.size > 0
                  ? `${selectedIds.size} review(s) selected`
                  : `Select All on Page (${reviews.length})`}
              </span>
            </label>

            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={bulkProcessing}
                  onClick={() => handleBulkAction('publish')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer border-0 disabled:opacity-50"
                >
                  Approve ({selectedIds.size})
                </button>
                <button
                  type="button"
                  disabled={bulkProcessing}
                  onClick={() => handleBulkAction('pending')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold cursor-pointer border-0 disabled:opacity-50"
                >
                  Hold Pending
                </button>
                <button
                  type="button"
                  disabled={bulkProcessing}
                  onClick={() => handleBulkAction('reject')}
                  className="px-2.5 py-1 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-[11px] font-bold cursor-pointer border-0 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={bulkProcessing}
                  onClick={() => handleBulkAction('pin')}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold cursor-pointer border-0 disabled:opacity-50"
                >
                  Pin
                </button>
                <button
                  type="button"
                  disabled={bulkProcessing}
                  onClick={() => handleBulkAction('delete')}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer border-0 disabled:opacity-50"
                >
                  Delete ({selectedIds.size})
                </button>
              </div>
            )}
          </div>
        )}

        {/* Reviews List */}
        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
            <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                {selectedAppObj
                  ? `No reviews match current filters for ${selectedAppObj.name}`
                  : 'No reviews match the current filter criteria'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add a manual review or generate authentic player reviews in AI Review Studio.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleOpenCreateModal(selectedAppObj ? String(selectedAppObj.id) : undefined)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer border-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Manual Review</span>
              </button>
              {onNavigateToAIStudio && (
                <button
                  type="button"
                  onClick={onNavigateToAIStudio}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer border-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open AI Review Studio</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(rev => {
              const isSelected = selectedIds.has(rev.id);
              const status = String(rev.status || 'published').toLowerCase();

              return (
                <div
                  key={rev.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-400 dark:border-blue-600'
                      : rev.isPinned
                        ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-300/70 dark:border-amber-800/50'
                        : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOne(rev.id)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                    />

                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Top Meta Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                            {rev.userName || 'Player'}
                          </span>

                          {/* Star Rating Pill */}
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-700 dark:text-amber-300 text-xs font-black">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {rev.rating}
                          </span>

                          {/* Status Pill */}
                          {status === 'published' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase">
                              <CheckCircle2 className="w-3 h-3" />
                              Live
                            </span>
                          )}
                          {status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                          {status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px] font-black uppercase">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          )}

                          {rev.isPinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase">
                              <Pin className="w-3 h-3" />
                              Pinned
                            </span>
                          )}

                          {rev.reported && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase">
                              <AlertTriangle className="w-3 h-3" />
                              Flagged
                            </span>
                          )}

                          {/* App Badge (Click to jump into that app's workspace) */}
                          {selectedAppId === 'all' && (rev.appName || rev.appSlug || rev.appId) && (
                            <button
                              type="button"
                              onClick={() => setSelectedAppId(rev.appSlug || rev.appId)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold transition-colors cursor-pointer border-0"
                              title="Open this app's review workspace"
                            >
                              <span>App: {rev.appName || rev.appSlug || rev.appId}</span>
                              <span>→</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                          {Number(rev.helpful_count) > 0 && (
                            <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                              <ThumbsUp className="w-3 h-3" />
                              {rev.helpful_count}
                            </span>
                          )}
                          <span>{formatReviewDate(rev.timestamp || rev.created_at)}</span>
                        </div>
                      </div>

                      {/* Review Comment Body */}
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line break-words">
                        {rev.reviewText || rev.comment}
                      </p>

                      {/* Official Admin Reply Box (if present) */}
                      {rev.adminReply && rev.adminReply.text && (
                        <div className="mt-2 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 flex items-start gap-2">
                          <CornerDownRight className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <span className="font-black text-blue-700 dark:text-blue-300 mr-1.5">
                              {rev.adminReply.author || 'Official Support'}:
                            </span>
                            <span className="text-slate-700 dark:text-slate-300">{rev.adminReply.text}</span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/70">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {status !== 'published' && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(rev, 'published')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer border-0"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                          )}
                          {status !== 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(rev, 'pending')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-[11px] font-bold cursor-pointer border-0"
                            >
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </button>
                          )}
                          {status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(rev, 'rejected')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-rose-500/15 hover:text-rose-600 text-slate-600 dark:text-slate-400 text-[11px] font-bold cursor-pointer border-0"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickTogglePin(rev)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border-0 ${
                              rev.isPinned
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            <Pin className="w-3 h-3" />
                            <span>{rev.isPinned ? 'Unpin' : 'Pin'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setReplyingReview(rev);
                              setReplyText(rev.adminReply?.text || '');
                              setReplyAuthor(rev.adminReply?.author || 'Official Support');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer border-0"
                          >
                            <CornerDownRight className="w-3 h-3" />
                            <span>Reply</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(rev)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer border-0"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteReview(rev)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-600 hover:text-white text-[11px] font-bold transition-colors cursor-pointer border-0"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Page {currentPage} of {totalPages} ({totalCount} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer border-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer border-0"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          4. CREATE / EDIT REVIEW MODAL
         ===================================================================== */}
      {(isCreateModalOpen || editingReview) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {editingReview ? 'Edit Review & Recalculate Index' : 'Add Manual Player Review'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingReview(null);
                }}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 cursor-pointer border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModalForm} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Application
                </label>
                <select
                  value={formData.appId}
                  onChange={e => setFormData(prev => ({ ...prev, appId: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="">Select Application...</option>
                  {appsList.map(a => (
                    <option key={a.id} value={String(a.id)}>
                      {a.name} ({a.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Player Name
                  </label>
                  <input
                    type="text"
                    value={formData.userName}
                    onChange={e => setFormData(prev => ({ ...prev, userName: e.target.value }))}
                    placeholder="e.g. Rahul Sharma"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Star Rating
                  </label>
                  <select
                    value={formData.rating}
                    onChange={e => setFormData(prev => ({ ...prev, rating: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value={5}>5 Stars (★★★★★)</option>
                    <option value={4}>4 Stars (★★★★)</option>
                    <option value={3}>3 Stars (★★★)</option>
                    <option value={2}>2 Stars (★★)</option>
                    <option value={1}>1 Star (★)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Review Comment
                </label>
                <textarea
                  rows={4}
                  value={formData.reviewText}
                  onChange={e => setFormData(prev => ({ ...prev, reviewText: e.target.value }))}
                  placeholder="Write natural player review..."
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="published">Published (Live)</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Helpful Votes
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.helpful_count}
                    onChange={e => setFormData(prev => ({ ...prev, helpful_count: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.timestamp}
                    onChange={e => setFormData(prev => ({ ...prev, timestamp: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formData.isPinned}
                  onChange={e => setFormData(prev => ({ ...prev, isPinned: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <span>Pin this review to the top of the app's review feed</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingReview(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer border-0 disabled:opacity-50"
                >
                  {submittingModal ? 'Saving...' : editingReview ? 'Save Changes' : 'Create Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. OFFICIAL ADMIN / DEVELOPER REPLY MODAL
         ===================================================================== */}
      {replyingReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Official Reply to {replyingReview.userName}
              </h3>
              <button
                type="button"
                onClick={() => setReplyingReview(null)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 cursor-pointer border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReply} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Responder Badge Title
                </label>
                <input
                  type="text"
                  value={replyAuthor}
                  onChange={e => setReplyAuthor(e.target.value)}
                  placeholder="Official Support"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reply Message (Leave empty to remove reply)
                </label>
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Thank you for your feedback..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReplyingReview(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer border-0 disabled:opacity-50"
                >
                  {submittingModal ? 'Saving...' : 'Save Official Reply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReviewsTab;
