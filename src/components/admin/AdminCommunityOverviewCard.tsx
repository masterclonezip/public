import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  Clock,
  Star,
  Activity,
  Layers,
  Flame,
  Database,
  ArrowRight,
  Check,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { 
  fetchAdminCommunityOverviewStats, 
  getLiveAtomicReviewStatsSync,
  reloadAdminCommunityBackup,
  AdminCommunityStats,
  AdminCommunityTopApp
} from '../../lib/adminCommunityFirebase';
import { toast } from '../Toast';
import { getOptimizedImageUrl } from '../../seo/utils';
import { adminFetch } from '../../services/adminAuthService';

interface AdminCommunityOverviewCardProps {
  onTabChange?: (tab: string) => void;
}

export const AdminCommunityOverviewCard: React.FC<AdminCommunityOverviewCardProps> = ({ onTabChange }) => {
  const [stats, setStats] = useState<AdminCommunityStats | null>(() => {
    const live = getLiveAtomicReviewStatsSync();
    if (live && live.globalStats && live.globalStats.total > 0) {
      return {
        totalReviews: live.globalStats.total,
        publishedReviews: live.globalStats.published,
        pendingReviews: live.globalStats.pending,
        rejectedReviews: live.globalStats.rejected || 0,
        flaggedReviews: live.globalStats.flagged || 0,
        totalReports: 0,
        pendingReports: 0,
        averageRating: live.globalStats.averageRating ?? 0,
        liveStatus: (import.meta as any).env?.VITE_COMMUNITY_FIREBASE_PROJECT_ID ? 'live' : 'offline',
        statusMessage: (import.meta as any).env?.VITE_COMMUNITY_FIREBASE_PROJECT_ID ? 'Live (Atomic Shield)' : 'Review DB Offline • Local Mode',
        projectId: (import.meta as any).env?.VITE_COMMUNITY_FIREBASE_PROJECT_ID || '',
        topApps: [],
        recentReviews: [],
        appCounts: live.appCounts || {}
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(() => !stats);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadingBackup, setReloadingBackup] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadStats = useCallback(async (isForce = false) => {
    if (isForce) setRefreshing(true);
    else if (!stats) setLoading(true);

    try {
      const data = await fetchAdminCommunityOverviewStats(isForce);
      setStats(data);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (isForce) {
        toast(`Live statistics updated: ${data.totalReviews?.toLocaleString()} total reviews across catalog`, 'success');
      }
    } catch (e) {
      console.error('[AdminCommunityOverview] Error loading stats:', e);
      if (isForce) toast('Failed to refresh community statistics', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [stats]);

  const handleReloadBackup = async () => {
    try {
      setReloadingBackup(true);
      const res = await reloadAdminCommunityBackup();
      if (res.success) {
        toast(res.message, 'success');
        await loadStats(true);
      } else {
        toast(res.message || 'Failed to reload local backup', 'error');
      }
    } catch (err: any) {
      toast('Error triggering disk backup reload', 'error');
    } finally {
      setReloadingBackup(false);
    }
  };

  const handleQuickApproveReview = async (reviewId: string) => {
    try {
      setApprovingId(reviewId);
      const res = await adminFetch(`/api/v1/admin/community/reviews/${reviewId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'published' })
      });
      if (res.ok) {
        toast('Review marked as published', 'success');
        // Optimistically update recent reviews list
        setStats(prev => {
          if (!prev) return prev;
          const updatedRecent = prev.recentReviews?.map(r => 
            r.id === reviewId ? { ...r, status: 'published' } : r
          );
          return {
            ...prev,
            publishedReviews: prev.publishedReviews + 1,
            pendingReviews: Math.max(0, prev.pendingReviews - 1),
            recentReviews: updatedRecent
          };
        });
      } else {
        toast('Failed to publish review', 'error');
      }
    } catch (e) {
      toast('Error approving review', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const handleNavigateToApp = (appId: string) => {
    if (onTabChange) {
      onTabChange('reviews');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('admin-select-app-reviews', { detail: { appId } }));
      }, 50);
    }
  };

  useEffect(() => {
    loadStats(false);

    const handleAtomicUpdate = (e: any) => {
      if (e.detail?.globalStats) {
        setStats(prev => ({
          ...(prev || {
            flaggedReviews: 0,
            totalReports: 0,
            pendingReports: 0,
            liveStatus: 'live',
            statusMessage: 'Live (Atomic Shield)',
            projectId: (import.meta as any).env?.VITE_COMMUNITY_FIREBASE_PROJECT_ID || '',
            topApps: [],
            recentReviews: [],
            appCounts: {}
          }),
          totalReviews: e.detail.globalStats.total,
          publishedReviews: e.detail.globalStats.published,
          pendingReviews: e.detail.globalStats.pending,
          rejectedReviews: e.detail.globalStats.rejected || 0,
          averageRating: e.detail.globalStats.averageRating ?? 0,
          appCounts: e.detail.appCounts || prev?.appCounts || {}
        }));
      }
    };

    window.addEventListener('atomic_review_counts_updated', handleAtomicUpdate);
    return () => window.removeEventListener('atomic_review_counts_updated', handleAtomicUpdate);
  }, [loadStats]);

  const publishedPercent = stats && stats.totalReviews > 0 
    ? Math.round((stats.publishedReviews / stats.totalReviews) * 100) 
    : 0;
  const pendingPercent = stats && stats.totalReviews > 0 
    ? Math.round((stats.pendingReviews / stats.totalReviews) * 100) 
    : 0;

  const totalReviewsCount = stats?.totalReviews || 0;
  const ratingDist = stats?.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const topApps = stats?.topApps || [];
  const recentReviews = stats?.recentReviews || [];

  return (
    <div 
      id="admin-community-firebase-overview"
      className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-200/30 dark:shadow-none relative overflow-hidden transition-all backdrop-blur-sm space-y-6"
    >
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-slate-100 dark:border-slate-800/80 pb-5">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 flex-shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Community Firebase Engine & Reviews Platform
              </h3>
              {stats?.projectId ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-800/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Cloud Sync
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/50 dark:border-amber-800/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Review DB Offline • Local Mode
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span>Dedicated Project:</span>
              <code className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded font-mono text-[11px]">
                {stats?.projectId || (import.meta as any).env?.VITE_COMMUNITY_FIREBASE_PROJECT_ID || 'Not configured'}
              </code>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Zero-Quota Aggregation Active
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {lastUpdated && (
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 hidden md:flex items-center gap-1 mr-1">
              <Clock className="w-3.5 h-3.5" />
              Synced {lastUpdated}
            </span>
          )}

          <button
            id="reload-community-backup-btn"
            type="button"
            onClick={handleReloadBackup}
            disabled={reloadingBackup || refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all border-0 cursor-pointer disabled:opacity-50"
            title="Reload in-memory cache directly from local backup disk"
          >
            <Database className={`w-3.5 h-3.5 ${reloadingBackup ? 'animate-pulse text-indigo-500' : ''}`} />
            <span className="hidden sm:inline">Disk Cache</span>
          </button>

          <button
            id="refresh-community-stats-btn"
            type="button"
            onClick={() => loadStats(true)}
            disabled={refreshing || reloadingBackup}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all border-0 cursor-pointer disabled:opacity-50"
            title="Perform exact low-cost Firestore aggregation recount"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Recount Stats</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Cards (2 cols on mobile, 4 cols on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
        <div 
          onClick={() => onTabChange && onTabChange('reviews')}
          className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 p-4 rounded-2xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            <span>Total Reviews</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-baseline gap-1.5">
            {loading ? '...' : (stats?.totalReviews?.toLocaleString() || '0')}
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Live</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex flex-wrap items-center gap-1 font-medium">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{stats?.publishedReviews?.toLocaleString() || 0}</span> pub
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">{stats?.pendingReviews || 0}</span> pend
            <span>•</span>
            <span className="text-slate-400 font-semibold">{stats?.appCoverageCount || 0} apps</span>
          </div>
        </div>

        <div 
          onClick={() => onTabChange && onTabChange('reviews')}
          className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 p-4 rounded-2xl cursor-pointer hover:border-amber-400 transition-all group"
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1.5">
              Pending Moderation
              {stats && stats.pendingReviews > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-900 dark:text-amber-300">
            {loading ? '...' : (stats?.pendingReviews || 0)}
          </div>
          <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1.5 font-medium">
            {stats && stats.pendingReviews > 0 ? 'Requires admin review' : 'Queue completely clear'}
          </div>
        </div>

        <div 
          onClick={() => onTabChange && onTabChange('reports')}
          className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 p-4 rounded-2xl cursor-pointer hover:border-rose-400 transition-all group"
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-1">
            <span>User Reports</span>
            <ChevronRight className="w-3.5 h-3.5 text-rose-600 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-900 dark:text-rose-300 flex items-baseline gap-1.5">
            {loading ? '...' : (stats?.pendingReports || 0)}
            <span className="text-xs font-normal text-rose-700/70 dark:text-rose-400/70">
              / {stats?.totalReports || 0} total
            </span>
          </div>
          <div className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-1.5 font-medium">
            Flagged app & content issues
          </div>
        </div>

        <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 p-4 rounded-2xl">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Catalog Sentiment
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-500 flex items-center gap-1.5">
            <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
            {loading ? '...' : Number(stats?.averageRating || 0).toFixed(1)}
            <span className="text-xs font-bold text-slate-400">/ 5.0</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            Weighted across verified reviews
          </div>
        </div>
      </div>

      {/* Moderation Health Bar & Star Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50/60 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 relative z-10">
        <div className="md:col-span-1 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Moderation Status</span>
            <span className="text-emerald-600 dark:text-emerald-400">{publishedPercent}% Published</span>
          </div>
          <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex shadow-inner">
            <div 
              className="bg-emerald-500 h-full transition-all duration-700" 
              style={{ width: `${publishedPercent}%` }} 
              title={`Published: ${stats?.publishedReviews || 0}`}
            />
            {pendingPercent > 0 && (
              <div 
                className="bg-amber-500 h-full transition-all duration-700" 
                style={{ width: `${pendingPercent}%` }} 
                title={`Pending: ${stats?.pendingReviews || 0}`}
              />
            )}
            {stats && stats.rejectedReviews > 0 && (
              <div 
                className="bg-rose-500 h-full transition-all duration-700" 
                style={{ width: `${Math.round((stats.rejectedReviews / (stats.totalReviews || 1)) * 100)}%` }} 
                title={`Rejected: ${stats.rejectedReviews}`}
              />
            )}
          </div>
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-0.5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {stats?.publishedReviews || 0} Live
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {stats?.pendingReviews || 0} Pending
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              {stats?.rejectedReviews || 0} Rejected
            </span>
          </div>
        </div>

        {/* Rating Breakdown Bars */}
        <div className="md:col-span-2 flex flex-col justify-center space-y-1.5">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5 flex items-center justify-between">
            <span>Star Rating Distribution</span>
            <span className="text-[11px] font-medium text-slate-400">
              {totalReviewsCount.toLocaleString()} total verified reviews
            </span>
          </div>
          {[5, 4, 3, 2, 1].map(star => {
            const count = (ratingDist as any)[star] || 0;
            const pct = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-6 font-bold text-slate-600 dark:text-slate-400 flex items-center gap-0.5 text-[11px]">
                  {star} <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                </span>
                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  {count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Reviewed Apps Leaderboard */}
      {topApps.length > 0 && (
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Top Reviewed Titles
              </h4>
            </div>
            <button
              type="button"
              onClick={() => onTabChange && onTabChange('reviews')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 border-0 bg-transparent cursor-pointer p-0"
            >
              <span>View All In Reviews Tab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {topApps.slice(0, 4).map(app => (
              <div
                key={app.id || app.slug}
                onClick={() => handleNavigateToApp(app.id || app.slug)}
                className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 p-3 rounded-2xl hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={getOptimizedImageUrl(app.icon_url || '', 80)}
                    alt={app.name}
                    className="w-10 h-10 rounded-xl object-cover bg-slate-200 dark:bg-slate-700 shadow-sm flex-shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {app.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {app.category || 'Arcade'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-[11px]">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {app.total} reviews
                  </span>
                  <span className="flex items-center gap-0.5 text-amber-500 font-black">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {app.avgRating || 4.8}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Reviews Moderation Stream */}
      {recentReviews.length > 0 && (
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Recent Community Activity
              </h4>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Live updates
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentReviews.slice(0, 4).map(rev => (
              <div 
                key={rev.id}
                className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {rev.userName || 'Verified Player'}
                      </span>
                      {rev.appName && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                          {rev.appName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star 
                          key={s} 
                          className={`w-2.5 h-2.5 ${s <= (rev.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} 
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic">
                    "{rev.reviewText}"
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-[11px]">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    rev.status === 'published' 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                      : (rev.status === 'pending' 
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300')
                  }`}>
                    {rev.status || 'published'}
                  </span>

                  {rev.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleQuickApproveReview(rev.id)}
                      disabled={approvingId === rev.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-all border-0 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />
                      <span>{approvingId === rev.id ? 'Approving...' : 'Quick Approve'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 relative z-10">
        <button
          type="button"
          onClick={() => onTabChange && onTabChange('reviews')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all border-0 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          Manage All Reviews ({stats?.totalReviews?.toLocaleString() || 0})
        </button>

        <button
          type="button"
          onClick={() => onTabChange && onTabChange('ai-reviews')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all border-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          AI Review Studio
        </button>

        <button
          type="button"
          onClick={() => onTabChange && onTabChange('reports')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border-0 cursor-pointer"
        >
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          User Flags {stats && stats.pendingReports > 0 ? `(${stats.pendingReports})` : ''}
        </button>
      </div>
    </div>
  );
};

export default AdminCommunityOverviewCard;
