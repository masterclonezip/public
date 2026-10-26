import React, { useState, useEffect } from 'react';
import { FileText, Newspaper, ShieldAlert, MessageSquare, TrendingUp, Sparkles, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import FirebaseStatusPanel from '../FirebaseStatusPanel';
import { AdminCommunityOverviewCard } from './AdminCommunityOverviewCard';
import { fetchAdminCommunityOverviewStats, getLiveAtomicReviewStatsSync, AdminCommunityStats } from '../../lib/adminCommunityFirebase';

interface DashboardOverviewProps {
  apps: any[];
  news: any[];
  updates?: any[];
  onTabChange?: (tab: string) => void;
}

export const AdminDashboardOverview = React.memo(({ apps, news, onTabChange }: DashboardOverviewProps) => {
  const [commStats, setCommStats] = useState<AdminCommunityStats | null>(() => {
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
        averageRating: live.globalStats.averageRating || 4.5,
        liveStatus: 'live',
        statusMessage: 'Live (Atomic Shield)',
        projectId: (import.meta as any).env?.VITE_COMMUNITY_FIREBASE_PROJECT_ID || '',
        topApps: [],
        recentReviews: [],
        appCounts: live.appCounts || {}
      };
    }
    return null;
  });
  const [loadingStats, setLoadingStats] = useState(() => !commStats);

  useEffect(() => {
    let isMounted = true;
    fetchAdminCommunityOverviewStats()
      .then(stats => {
        if (isMounted) {
          setCommStats(stats);
          setLoadingStats(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingStats(false);
      });

    const handleAtomicUpdate = (e: any) => {
      if (!isMounted) return;
      if (e.detail?.globalStats) {
        setCommStats(prev => ({
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
          averageRating: e.detail.globalStats.averageRating || 4.5,
          appCounts: e.detail.appCounts || prev?.appCounts || {}
        }));
        setLoadingStats(false);
      }
    };

    window.addEventListener('atomic_review_counts_updated', handleAtomicUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('atomic_review_counts_updated', handleAtomicUpdate);
    };
  }, []);

  const chartData = [
    { name: 'Mon', apps: Math.max(0, apps.length - 5), traffic: 4000 },
    { name: 'Tue', apps: Math.max(0, apps.length - 4), traffic: 3000 },
    { name: 'Wed', apps: Math.max(0, apps.length - 3), traffic: 5000 },
    { name: 'Thu', apps: Math.max(0, apps.length - 2), traffic: 2780 },
    { name: 'Fri', apps: Math.max(0, apps.length - 1), traffic: 4890 },
    { name: 'Sat', apps: Math.max(0, apps.length - 0), traffic: 6390 },
    { name: 'Sun', apps: apps.length + 2, traffic: 8490 },
  ];

  return (
    <div className="animate-fade-in space-y-6 md:space-y-8">
      <div className="border-b border-slate-200/50 dark:border-slate-800/50 pb-5">
        <h2 className="text-3xl font-black bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent tracking-tight">Platform Overview</h2>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">Live administrative telemetry, community reviews, and database status.</p>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <div 
          onClick={() => onTabChange && onTabChange('apps')}
          className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/80 p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm hover:shadow-md shadow-blue-500/5 flex items-center justify-between relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer"
        >
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
          <div className="relative z-10 min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sm:tracking-widest mb-1 truncate">Total Apps</div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white">{apps.length}</div>
          </div>
          <div className="relative z-10 w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0 ml-2">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </div>
        </div>
        
        <div 
          onClick={() => onTabChange && onTabChange('news')}
          className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/80 p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm hover:shadow-md shadow-indigo-500/5 flex items-center justify-between relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer"
        >
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
          <div className="relative z-10 min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sm:tracking-widest mb-1 truncate">News Articles</div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white">{news?.length || 0}</div>
          </div>
          <div className="relative z-10 w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0 ml-2">
            <Newspaper className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </div>
        </div>

        <div 
          onClick={() => onTabChange && onTabChange('reviews')}
          className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/80 p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm hover:shadow-md shadow-amber-500/5 flex items-center justify-between relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer"
        >
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
          <div className="relative z-10 min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sm:tracking-widest mb-1 flex items-center gap-1 truncate">
              <span>Pending Reviews</span>
              {commStats && commStats.pendingReviews > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              )}
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              {loadingStats ? '...' : (commStats?.pendingReviews ?? 0)}
            </div>
          </div>
          <div className="relative z-10 w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0 ml-2">
            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </div>
        </div>

        <div 
          onClick={() => onTabChange && onTabChange('reviews')}
          className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/80 p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm hover:shadow-md shadow-emerald-500/5 flex items-center justify-between relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer"
        >
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="relative z-10 min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sm:tracking-widest mb-1 truncate">Total Reviews</div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              {loadingStats ? '...' : (commStats?.totalReviews?.toLocaleString() ?? '0')}
            </div>
          </div>
          <div className="relative z-10 w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0 ml-2">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </div>
        </div>
      </div>

      {/* Community Firebase Engine & Live Moderation Card */}
      <AdminCommunityOverviewCard onTabChange={onTabChange} />
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-700/50 p-6 rounded-[2rem] shadow-xl shadow-blue-500/5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest flex items-center gap-2">
             <TrendingUp className="w-4 h-4 text-blue-500" /> Platform Traffic & Activity
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }} />
                <Area type="monotone" dataKey="traffic" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTraffic)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <FirebaseStatusPanel />
        </div>
      </div>
    </div>
  );
});

AdminDashboardOverview.displayName = 'AdminDashboardOverview';

export default AdminDashboardOverview;
