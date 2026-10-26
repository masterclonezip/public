import React, { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, 
  Newspaper, 
  Video, 
  ShieldCheck, 
  Info, 
  Users, 
  Send, 
  Trash2, 
  FileText, 
  Lock, 
  AlertCircle, 
  Scale, 
  Bell, 
  X, 
  ChevronRight,
  Shield,
  ExternalLink
} from 'lucide-react';
import LanguageSelector from '../LanguageSelector';
import { getOptimizedImageUrl } from '../../seo/utils';
import { safeVibrate } from '../../lib/utilsPublic';

interface MobileMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteTitle: string;
  logoUrl?: string;
  triggerHaptic?: () => void;
  helplineTelegram?: string;
}

interface PublicMenuCategory {
  title: string;
  items: {
    to: string;
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
  }[];
}

export function MobileMenuModal({
  isOpen,
  onClose,
  siteTitle,
  logoUrl,
  triggerHaptic,
  helplineTelegram
}: MobileMenuModalProps) {
  const { pathname } = useLocation();

  const handleTap = () => {
    safeVibrate(15);
    if (triggerHaptic) triggerHaptic();
  };

  // Prevent background scrolling and handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Structured Categorization matching the High-End Design System
  const categories: PublicMenuCategory[] = useMemo(() => [
    {
      title: 'Discover & Media',
      items: [
        { to: '/', label: 'Home', subtitle: 'App Directory', icon: LayoutGrid, color: '#0284c7' },
        { to: '/news', label: 'News Hub', subtitle: 'Updates & Guides', icon: Newspaper, color: '#0891b2' },
        { to: '/videos', label: 'Video Center', subtitle: 'Gameplay & Reviews', icon: Video, color: '#6366f1' }
      ]
    },
    {
      title: 'Trust & Transparency',
      items: [
        { to: '/responsibility', label: 'Safety Index', subtitle: 'Risk & Integrity', icon: ShieldCheck, color: '#10b981' },
        { to: '/about', label: 'About Us', subtitle: 'Transparency Mission', icon: Info, color: '#8b5cf6' },
        { to: '/developers', label: 'Developers', subtitle: 'Verified Creators', icon: Users, color: '#3b82f6' },
        { to: '/contact', label: 'Support Desk', subtitle: 'Direct Assistance', icon: Send, color: '#f59e0b' },
        { to: '/report-removal', label: 'Report & Removal', subtitle: 'Zero-Tolerance Policy', icon: Trash2, color: '#ef4444' }
      ]
    },
    {
      title: 'Legal & Compliance',
      items: [
        { to: '/terms', label: 'Terms of Use', subtitle: 'Platform Policies', icon: FileText, color: '#64748b' },
        { to: '/privacy', label: 'Privacy Policy', subtitle: 'Data Safety', icon: Lock, color: '#64748b' },
        { to: '/disclaimer', label: 'Disclaimer', subtitle: 'Editorial Standards', icon: AlertCircle, color: '#64748b' },
        { to: '/ethics', label: 'Code of Ethics', subtitle: 'Evaluation Rules', icon: Scale, color: '#64748b' },
        { to: '/notice', label: 'Official Notice', subtitle: 'Important Alerts', icon: Bell, color: '#64748b' }
      ]
    }
  ], []);

  const getTransformedUrl = (url?: string) => {
    if (url && url.includes('res.cloudinary.com')) {
      return getOptimizedImageUrl(url, 120);
    }
    return url || '/logo.png';
  };

  if (!isOpen) return null;

  return (
    /* TRUE 100% FULL-SCREEN MOBILE OVERLAY (Edge-to-Edge, Dual Theme, SEO-Friendly) */
    <div 
      className="fixed inset-0 z-[100] w-full h-[100dvh] bg-white dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Public Navigation Menu"
    >
      {/* 1. TOP HEADER BAR: Full-Width Branding + Portal Pill + Close */}
      <div className="w-full px-4 pt-3.5 pb-3 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl flex items-center justify-between shrink-0 shadow-xs">
        <Link 
          to="/" 
          onClick={() => { handleTap(); onClose(); }}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-0.5 flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105">
            {logoUrl ? (
              <img 
                src={getTransformedUrl(logoUrl)} 
                alt={`${siteTitle || 'Official'} Logo`} 
                className="w-full h-full object-contain rounded-lg"
                loading="lazy" 
                width={36} 
                height={36} 
              />
            ) : (
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div>
            <div className="text-sm font-black tracking-tight flex items-center gap-1.5 leading-none text-slate-900 dark:text-white">
              <span>{siteTitle || ''}</span>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 uppercase tracking-widest">
                Official
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-none">
              Transparency Directory
            </div>
          </div>
        </Link>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => { handleTap(); onClose(); }}
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 shadow-xs"
          aria-label="Close navigation menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. LANGUAGE SELECTOR BAR */}
      <div className="w-full px-4 py-2 bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800/50 shrink-0 flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Language & Region
        </span>
        <div className="w-36">
          <LanguageSelector />
        </div>
      </div>

      {/* 3. SCROLLABLE FULL-WIDTH CONTENT GRID: Grouped & Optimized */}
      <nav className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4 custom-scrollbar">
        {categories.map((category) => (
          <div key={category.title}>
            {/* Category Header */}
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {category.title}
              </span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600">
                {category.items.length} items
              </span>
            </div>

            {/* High-Contrast 2-Column Responsive Card Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {category.items.map((item) => {
                const isSelected = pathname === item.to;
                const ItemIcon = item.icon;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => { handleTap(); onClose(); }}
                    className={`group relative p-3 rounded-2xl border flex items-center gap-2.5 transition-all duration-150 active:scale-97 text-left cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-700 dark:text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                        : 'bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800/90 border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xs'
                    }`}
                    aria-current={isSelected ? 'page' : undefined}
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

                    {/* Label & Subtitle */}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate text-slate-900 dark:text-white leading-tight">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-none mt-0.5">
                        {isSelected ? (
                          <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                            Current Page
                          </span>
                        ) : (
                          item.subtitle
                        )}
                      </div>
                    </div>

                    {!isSelected && (
                      <ChevronRight size={13} className="text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 4. FULL-WIDTH BOTTOM FOOTER & HELPLINE BAR */}
      <div className="w-full px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shrink-0 shadow-lg flex flex-col gap-2">
        {helplineTelegram && (
          <a 
            href={helplineTelegram.startsWith('http') ? helplineTelegram : `https://t.me/${helplineTelegram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleTap}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-blue-600 dark:text-blue-400 font-bold text-xs bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/25 rounded-xl transition cursor-pointer active:scale-95 shadow-xs"
          >
            <Send size={13} />
            <span>Official Support Telegram</span>
            <ExternalLink size={11} className="opacity-70" />
          </a>
        )}

        <div className="text-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          &copy; {new Date().getFullYear()} {siteTitle ? `${siteTitle}. ` : ''}All rights reserved.
        </div>
      </div>
    </div>
  );
}

export default MobileMenuModal;
