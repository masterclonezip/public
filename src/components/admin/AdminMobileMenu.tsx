import React, { useMemo } from 'react';
import { 
  LayoutDashboard, 
  Smartphone, 
  TrendingUp, 
  Layers, 
  Newspaper, 
  Video as VideoIcon, 
  HelpCircle, 
  Link as LinkIcon, 
  MessageSquare, 
  Sparkles, 
  ShieldAlert, 
  Github, 
  Users, 
  Shield, 
  Settings, 
  X, 
  RefreshCw, 
  LogOut,
  ChevronRight
} from 'lucide-react';
import { safeVibrate } from '../../lib/utils';
import { getOptimizedImageUrl } from '../../seo/utils';

export interface AdminMenuItem {
  id: string;
  label: string;
  category: 'Main Management' | 'Content Editor' | 'Moderation & Community' | 'System & Sync';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  badge?: number | null;
}

interface AdminMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  handleLogout: () => void;
  sessionTimeLeft: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  siteTitle?: string;
  logoUrl?: string;
  pendingReviewsCount?: number;
  pendingReportsCount?: number;
}

export const AdminMobileMenu: React.FC<AdminMobileMenuProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  handleLogout,
  sessionTimeLeft,
  onRefresh,
  isRefreshing,
  siteTitle = '',
  logoUrl,
  pendingReviewsCount = 0,
  pendingReportsCount = 0
}) => {
  // Navigation categories & items
  const menuCategories = useMemo(() => [
    {
      name: 'Main Management',
      items: [
        { id: 'dashboard', label: 'Dashboard', category: 'Main Management', icon: LayoutDashboard, color: '#0284c7' },
        { id: 'apps', label: 'App Catalog', category: 'Main Management', icon: Smartphone, color: '#6366f1' },
        { id: 'banners', label: 'Banners & Ads', category: 'Main Management', icon: TrendingUp, color: '#9333ea' },
        { id: 'categories', label: 'Categories', category: 'Main Management', icon: Layers, color: '#c026d3' }
      ]
    },
    {
      name: 'Content Editor',
      items: [
        { id: 'news', label: 'News Section', category: 'Content Editor', icon: Newspaper, color: '#0891b2' },
        { id: 'videos', label: 'Video Guides', category: 'Content Editor', icon: VideoIcon, color: '#0d9488' },
        { id: 'faqs', label: 'Website FAQs', category: 'Content Editor', icon: HelpCircle, color: '#059669' },
        { id: 'quick-links', label: 'Quick Links', category: 'Content Editor', icon: LinkIcon, color: '#16a34a' }
      ]
    },
    {
      name: 'Moderation & Community',
      items: [
        { 
          id: 'reviews', 
          label: 'App Reviews', 
          category: 'Moderation & Community', 
          icon: MessageSquare, 
          color: '#d97706',
          badge: pendingReviewsCount > 0 ? pendingReviewsCount : null
        },
        { 
          id: 'ai-reviews', 
          label: 'AI Review Studio', 
          category: 'Moderation & Community', 
          icon: Sparkles, 
          color: '#db2777' 
        },
        { 
          id: 'reports', 
          label: 'User Reports', 
          category: 'Moderation & Community', 
          icon: ShieldAlert, 
          color: '#e11d48',
          badge: pendingReportsCount > 0 ? pendingReportsCount : null
        }
      ]
    },
    {
      name: 'System & Sync',
      items: [
        { id: 'github', label: 'GitHub Sync', category: 'System & Sync', icon: Github, color: '#0284c7' },
        { id: 'developers', label: 'Developer Team', category: 'System & Sync', icon: Users, color: '#4f46e5' },
        { id: 'security', label: 'Security Panel', category: 'System & Sync', icon: Shield, color: '#059669' },
        { id: 'settings', label: 'Global Settings', category: 'System & Sync', icon: Settings, color: '#d97706' }
      ]
    }
  ], [pendingReviewsCount, pendingReportsCount]);

  // Format session time
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

  const handleSelectTab = (tabId: string) => {
    safeVibrate(20);
    onTabChange(tabId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    /* TRUE 100% FULL-SCREEN MOBILE OVERLAY (No Pop-up, No Gaps, Edge-to-Edge) */
    <div 
      className="fixed inset-0 z-50 w-full h-[100dvh] bg-white dark:bg-slate-950 text-slate-900 dark:text-white lg:hidden flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-150"
    >
      {/* 1. TOP HEADER BAR: Full-Width Branding + Session Pill + Close */}
      <div className="w-full px-4 pt-3.5 pb-3 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-0.5 flex items-center justify-center shrink-0 shadow-xs">
            <img 
              src={getTransformedUrl(logoUrl)} 
              alt="Logo" 
              className="w-full h-full object-contain rounded-lg"
              loading="lazy" 
              width={36} 
              height={36} 
            />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight flex items-center gap-1.5 leading-none text-slate-900 dark:text-white">
              <span>{siteTitle}</span>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 uppercase tracking-widest">
                Portal
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-none">
              Master Administration
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            safeVibrate(15);
            onClose();
          }}
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 shadow-xs"
          aria-label="Close Navigation"
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. SESSION TIMER PROGRESS BAR */}
      <div className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800/50 shrink-0">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Session Time</span>
          <span className={`font-mono font-bold ${sessionTimeLeft < 60 ? 'text-rose-500 animate-pulse' : 'text-slate-700 dark:text-slate-300'}`}>
            {formatTime(sessionTimeLeft)}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${sessionTimeLeft < 60 ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
            style={{ width: `${Math.min(100, Math.max(0, (sessionTimeLeft / (15 * 60)) * 100))}%` }}
          />
        </div>
      </div>

      {/* 3. SCROLLABLE FULL-WIDTH CONTENT GRID: Smooth Light & Dark Mode */}
      <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4 custom-scrollbar">
        {menuCategories.map((category) => (
          <div key={category.name}>
            {/* Category Header */}
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {category.name}
              </span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600">
                {category.items.length} items
              </span>
            </div>

            {/* High-Contrast 2-Column Responsive Card Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {category.items.map((item) => {
                const isSelected = item.id === activeTab;
                const ItemIcon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`group relative p-3 rounded-2xl border flex items-center gap-2.5 transition-all duration-150 active:scale-97 text-left cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-700 dark:text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                        : 'bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800/90 border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xs'
                    }`}
                  >
                    {/* Icon Badge */}
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-150 group-hover:scale-105 shadow-xs"
                      style={{
                        backgroundColor: `${item.color}15`,
                        borderColor: `${item.color}35`,
                        color: item.color
                      }}
                    >
                      <ItemIcon size={17} />
                    </div>

                    {/* Label & Active State */}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate text-slate-900 dark:text-white leading-tight">
                        {item.label}
                      </div>
                      {isSelected && (
                        <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5 leading-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                          <span>Active</span>
                        </div>
                      )}
                    </div>

                    {/* Badge Counter */}
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white shrink-0 shadow-sm shadow-rose-500/30">
                        {item.badge}
                      </span>
                    )}

                    {!item.badge && !isSelected && (
                      <ChevronRight size={13} className="text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 4. FULL-WIDTH BOTTOM UTILITY ACTION BAR */}
      <div className="w-full px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl flex items-center gap-2.5 shrink-0 shadow-lg">
        {onRefresh && (
          <button 
            type="button"
            onClick={() => {
              safeVibrate(25);
              onRefresh();
            }}
            disabled={isRefreshing}
            className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-blue-600 dark:text-blue-400 font-bold text-xs bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/25 rounded-xl transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
          </button>
        )}

        <button 
          type="button"
          onClick={() => {
            safeVibrate([30, 60]);
            handleLogout();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-rose-600 dark:text-rose-400 font-bold text-xs bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/25 rounded-xl transition cursor-pointer active:scale-95 shadow-xs"
        >
          <LogOut size={14} />
          <span>Terminate</span>
        </button>
      </div>
    </div>
  );
};
