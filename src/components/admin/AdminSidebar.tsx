import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Smartphone, 
  TrendingUp, 
  Menu, 
  X, 
  ShieldAlert, 
  LogOut, 
  FileText, 
  Newspaper, 
  Video as VideoIcon, 
  Github, 
  HelpCircle, 
  Users, 
  Layers, 
  Link as LinkIcon, 
  Settings,
  Shield,
  MessageSquare,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { AdminSidebarItem as SidebarItem } from './AdminSidebarItem';
import { AdminMobileMenu } from './AdminMobileMenu';
import { useData } from '../../contexts/DataContext';
import { fetchAdminCommunityOverviewStats, getLiveAtomicReviewStatsSync, AdminCommunityStats } from '../../lib/adminCommunityFirebase';
import { getOptimizedImageUrl } from '../../seo/utils';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  handleLogout: () => void;
  sessionTimeLeft: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const AdminSidebar = ({ 
  activeTab, 
  onTabChange, 
  isMobileMenuOpen, 
  setIsMobileMenuOpen, 
  handleLogout,
  sessionTimeLeft,
  onRefresh,
  isRefreshing
}: AdminSidebarProps) => {
  const { settings } = useData();
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

  useEffect(() => {
    let isMounted = true;
    fetchAdminCommunityOverviewStats()
      .then(data => {
        if (isMounted) setCommStats(data);
      })
      .catch(() => {});

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
      }
    };

    window.addEventListener('atomic_review_counts_updated', handleAtomicUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('atomic_review_counts_updated', handleAtomicUpdate);
    };
  }, []);

  const [localSessionTimeLeft, setLocalSessionTimeLeft] = useState(sessionTimeLeft || 15 * 60);

  useEffect(() => {
    let lastReset = Date.now();
    const timerId = setInterval(() => {
      setLocalSessionTimeLeft((prev) => {
        if (prev <= 1) {
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const resetTimer = () => {
      const now = Date.now();
      if (now - lastReset > 5000) {
        lastReset = now;
        setLocalSessionTimeLeft(15 * 60);
      }
    };

    window.addEventListener('keydown', resetTimer, { passive: true });
    window.addEventListener('click', resetTimer, { passive: true });
    return () => {
      clearInterval(timerId);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [handleLogout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTransformedUrl = (url?: string) => {
    const trimmed = (url || '').trim();
    if (!trimmed) return '/logo.png';
    if (trimmed.includes('res.cloudinary.com')) {
      return getOptimizedImageUrl(trimmed, 120) || '/logo.png';
    }
    return trimmed;
  };

  return (
    <>
      {/* 1. Mobile Navigation Portal (Optimized Glassy Classic View) */}
      <AdminMobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeTab={activeTab}
        onTabChange={onTabChange}
        handleLogout={handleLogout}
        sessionTimeLeft={localSessionTimeLeft}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        siteTitle={settings?.site_title || ''}
        logoUrl={settings?.logo_url}
        pendingReviewsCount={commStats?.pendingReviews}
        pendingReportsCount={commStats?.pendingReports}
      />

      {/* 2. Desktop Persistent Sidebar (Hidden on mobile) */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <img src={getTransformedUrl(settings?.logo_url)} 
                alt="Admin Logo" 
                className="w-10 h-10 object-contain drop-shadow-sm" 
                loading="lazy" 
                width={40} 
                height={40} 
              />
              <div>
                <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{settings?.site_title || 'MasterWorld'}</h1>
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Admin Portal</p>
              </div>
            </div>
            <div className="mt-4 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Session Time</span>
                <span className={`text-[10px] font-mono font-bold ${localSessionTimeLeft < 60 ? 'text-rose-500 animate-pulse' : 'text-slate-600 dark:text-slate-400'}`}>
                  {formatTime(localSessionTimeLeft)}
                </span>
              </div>
              <div className="mt-1 h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${localSessionTimeLeft < 60 ? 'bg-rose-500' : 'bg-blue-600'}`}
                  style={{ width: `${(localSessionTimeLeft / (15 * 60)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            <div className="pb-2 px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Main Management</div>
            <SidebarItem id="dashboard" icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={onTabChange} />
            <SidebarItem id="apps" icon={Smartphone} label="App Catalog" active={activeTab === 'apps'} onClick={onTabChange} />
            <SidebarItem id="banners" icon={TrendingUp} label="Banners & Ads" active={activeTab === 'banners'} onClick={onTabChange} />
            <SidebarItem id="categories" icon={Layers} label="Categories" active={activeTab === 'categories'} onClick={onTabChange} />
            
            <div className="pt-4 pb-2 px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Content Editor</div>
            <SidebarItem id="news" icon={Newspaper} label="News Section" active={activeTab === 'news'} onClick={onTabChange} />
            <SidebarItem id="videos" icon={VideoIcon} label="Video Guides" active={activeTab === 'videos'} onClick={onTabChange} />
            <SidebarItem id="faqs" icon={HelpCircle} label="Website FAQs" active={activeTab === 'faqs'} onClick={onTabChange} />
            <SidebarItem id="quick-links" icon={LinkIcon} label="Quick Links" active={activeTab === 'quick-links'} onClick={onTabChange} />

            <div className="pt-4 pb-2 px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Moderation & Community</div>
            <SidebarItem 
              id="reviews" 
              icon={MessageSquare} 
              label="App Reviews" 
              active={activeTab === 'reviews'} 
              onClick={onTabChange} 
              badge={commStats && commStats.pendingReviews > 0 ? (
                <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-white leading-none shadow-sm shadow-amber-500/30">
                  {commStats.pendingReviews}
                </span>
              ) : null}
            />
            <SidebarItem id="ai-reviews" icon={Sparkles} label="AI Review Studio" active={activeTab === 'ai-reviews'} onClick={onTabChange} />
            <SidebarItem 
              id="reports" 
              icon={ShieldAlert} 
              label="User Reports" 
              active={activeTab === 'reports'} 
              onClick={onTabChange} 
              badge={commStats && commStats.pendingReports > 0 ? (
                <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-rose-500 text-white leading-none shadow-sm shadow-rose-500/30">
                  {commStats.pendingReports}
                </span>
              ) : null}
            />

            <div className="pt-4 pb-2 px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">System & Sync</div>
            <SidebarItem id="github" icon={Github} label="GitHub Sync" active={activeTab === 'github'} onClick={onTabChange} />
            <SidebarItem id="developers" icon={Users} label="Developer Team" active={activeTab === 'developers'} onClick={onTabChange} />
            <SidebarItem id="security" icon={Shield} label="Security Panel" active={activeTab === 'security'} onClick={onTabChange} />
            <SidebarItem id="settings" icon={Settings} label="Global Settings" active={activeTab === 'settings'} onClick={onTabChange} />
          </nav>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {onRefresh && (
              <button 
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-3 w-full px-4 py-2 text-blue-600 dark:text-blue-400 font-bold text-sm hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-xl transition-all border-0 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                <span>{isRefreshing ? 'Syncing...' : 'Sync Data Now'}</span>
              </button>
            )}
            <button 
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2 text-rose-600 dark:text-rose-400 font-bold text-sm hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all border-0 cursor-pointer"
            >
              <LogOut size={18} />
              <span>Terminate Session</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
