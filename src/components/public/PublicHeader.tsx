import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { Menu, ShieldCheck, Info, Send, MoreHorizontal, Search, Video, Users, Trash2, HelpCircle, Sparkles } from 'lucide-react';
import { useData } from '../../contexts/DataContextPublic';
import { resolveSiteLogoUrl, getSizedLogoUrl } from '../../seo/utils';
import LanguageSelector from '../LanguageSelector';
import SupportWidget from '../SupportWidget';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import LightSearch from '../LightSearch';
import { MobileMenuModal } from './MobileMenuModal';

export function PublicHeader() {
  const { settings, apps = [], fetchApps } = useData();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const { scrollDirection, scrolled } = useScrollDirection();
  
  const isHeaderHidden = scrollDirection === 'down' && !menuOpen && !searchOpen;

  const resolvedLogoUrl = resolveSiteLogoUrl(settings);
  const triggerHaptic = () => {
    if (window.navigator && window.navigator.vibrate) {
      setTimeout(() => {
        try {
          window.navigator.vibrate(10);
        } catch (e) {}
      }, 0);
    }
  };

  const handleOpenSearch = () => {
    triggerHaptic();
    if (apps.length < 25 && fetchApps) fetchApps();
    setSearchOpen(true);
  };

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [moreOpen]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        if (apps.length < 25 && fetchApps) fetchApps();
        setSearchOpen(true);
      }
    };
    const handleOpenSearchEvent = () => {
      if (apps.length < 25 && fetchApps) fetchApps();
      setSearchOpen(true);
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('open-search-modal', handleOpenSearchEvent);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('open-search-modal', handleOpenSearchEvent);
    };
  }, [apps.length, fetchApps]);

  return (
    <>
      <header 
        suppressHydrationWarning={true}
        className={`sticky top-0 z-50 transition-transform duration-200 ease-out will-change-transform ${
          isHeaderHidden ? '-translate-y-full pointer-events-none' : 'translate-y-0 pointer-events-auto'
        } ${
          scrolled 
            ? 'bg-white dark:bg-[#090d16] sm:bg-white/95 sm:dark:bg-[#090d16]/95 border-b border-black/10 dark:border-white/10 shadow-sm py-2' 
            : 'bg-white dark:bg-[#090d16] sm:bg-white/90 sm:dark:bg-[#090d16]/90 border-b border-black/5 dark:border-white/10 py-2.5 sm:py-3'
        }`}
      >
        <div className="w-full max-w-7xl px-1.5 xxs:px-2.5 xs:px-4 sm:px-6 lg:px-8 mx-auto relative flex justify-between items-center">
          <Link to="/" onClick={triggerHaptic} className="flex items-center gap-1 xxs:gap-1.5 xs:gap-2.5 sm:gap-3 group min-w-0">
            <div className="p-0 transition-transform group-hover:scale-[1.03] duration-300 shrink-0">
              {resolvedLogoUrl ? (
                <img 
                  src={getSizedLogoUrl(resolvedLogoUrl, 240, 'auto', 'c_fit')} 
                  width={40} 
                  height={40} 
                  loading="eager" 
                  fetchPriority="high" 
                  decoding="async" 
                  className="w-6 h-6 xxs:w-7 xxs:h-7 xs:w-8 xs:h-8 sm:w-11 sm:h-11 object-contain drop-shadow-sm" 
                  alt={`${settings.site_title || 'Official'} Logo`} 
                />
              ) : (
                <div className="w-6 h-6 xxs:w-7 xxs:h-7 xs:w-8 xs:h-8 sm:w-11 sm:h-11 bg-blue-500 rounded-xl flex items-center justify-center text-white font-semibold text-xs sm:text-base">
                  {settings.site_title?.substring(0, 1)}
                </div>
              )}
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-xs xxs:text-sm xs:text-base sm:text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white truncate max-w-[90px] xxs:max-w-[120px] xs:max-w-[170px] sm:max-w-none">
                {settings.site_title}
              </span>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-4 lg:gap-8 text-sm font-medium">
            <Link to="/" onClick={triggerHaptic} className={`transition-all p-2 tracking-wide relative ${pathname === '/' ? 'text-blue-600' : 'text-zinc-600 hover:text-blue-500 dark:text-zinc-300'}`}>
              {t('Home')}
              {pathname === '/' && <div className="absolute -bottom-1 left-2 right-2 h-[2px] bg-blue-600 rounded-t-full transition-all duration-300" />}
            </Link>
            <Link to="/news" onClick={triggerHaptic} className={`transition-all p-2 tracking-wide relative ${pathname.startsWith('/news') ? 'text-blue-600' : 'text-zinc-600 hover:text-blue-500 dark:text-zinc-300'}`}>
              {t('News')}
              {pathname.startsWith('/news') && <div className="absolute -bottom-1 left-2 right-2 h-[2px] bg-blue-600 rounded-t-full transition-all duration-300" />}
            </Link>
            <div
              ref={moreMenuRef}
              className="relative group/more"
              onMouseEnter={() => setMoreOpen(true)}
              onMouseLeave={() => setMoreOpen(false)}
            >
              <button 
                type="button"
                aria-expanded={moreOpen}
                aria-haspopup="true"
                aria-label="More navigation links"
                className={`transition-all p-2 tracking-wide flex items-center gap-1 relative cursor-pointer ${['/new-apps', '/videos', '/faq', '/developers', '/contact', '/privacy', '/report-removal', '/terms', '/about', '/responsibility', '/notice', '/ethics', '/disclaimer'].includes(pathname) ? 'text-blue-600' : 'text-zinc-600 hover:text-blue-500 dark:text-zinc-300'}`}
                onClick={() => {
                  triggerHaptic();
                  setMoreOpen(prev => !prev);
                }}
              >
                More <MoreHorizontal className="w-4 h-4 ml-1" />
              </button>
              
              {moreOpen && (
                <div 
                  className="absolute top-full right-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-lg overflow-hidden py-1.5 z-50 transition-all duration-200 animate-in fade-in slide-in-from-top-1"
                >
                  {[
                    { to: '/new-apps', label: 'New Releases', icon: Sparkles },
                    { to: '/videos', label: 'Videos', icon: Video },
                    { to: '/about', label: 'About Us', icon: Info },
                    { to: '/developers', label: 'Our Team', icon: Users },
                    { to: '/faq', label: 'FAQs', icon: HelpCircle },
                    { to: '/contact', label: 'Contact', icon: Send },
                    { to: '/responsibility', label: 'Safety', icon: ShieldCheck },
                    { to: '/privacy', label: 'Privacy', icon: ShieldCheck },
                    { to: '/report-removal', label: 'Report & Removal', icon: Trash2 },
                    { to: '/terms', label: 'Terms', icon: ShieldCheck },
                    { to: '/notice', label: 'Notice', icon: ShieldCheck },
                    { to: '/ethics', label: 'Ethics', icon: ShieldCheck },
                    { to: '/disclaimer', label: 'Disclaimer', icon: ShieldCheck },
                  ].map((item: any, idx: number) => (
                    item.to ? (
                      <Link 
                        key={`more-link-${item.to}-${idx}`}
                        to={item.to} 
                        onClick={() => { setMoreOpen(false); triggerHaptic(); }}
                        className={`flex items-center gap-3 px-4 py-2 text-[13px] font-medium transition-colors ${pathname === item.to ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5'}`}
                      >
                        <item.icon className="w-4 h-4 opacity-70 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ) : (
                      <button 
                        key={`more-btn-${item.label}-${idx}`}
                        onClick={() => { setMoreOpen(false); triggerHaptic(); if (item.action) item.action(); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium transition-colors text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <item.icon className="w-4 h-4 opacity-70 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    )
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 ml-4 border-l border-zinc-200 dark:border-zinc-800 pl-4 h-6">
              <button 
                type="button"
                onClick={handleOpenSearch}
                className="flex items-center justify-between gap-2 bg-zinc-100/70 dark:bg-zinc-800/60 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-all text-left px-3.5 py-1.5 w-44 lg:w-56 rounded-full group outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer border border-black/5 dark:border-white/5"
                aria-label="Search Store"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-500 transition-colors shrink-0" />
                  <span className="text-[13px] text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors truncate">{t('Search')}</span>
                </span>
                <kbd className="hidden lg:inline-block text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 bg-white/80 dark:bg-zinc-900/80 px-1.5 py-0.5 rounded border border-black/5 dark:border-white/5 shrink-0">
                  ⌘K
                </kbd>
              </button>

              <div className="w-40">
                <LanguageSelector />
              </div>

              {settings.helpline_telegram && (
                <a 
                  href={settings.helpline_telegram.startsWith('http') ? settings.helpline_telegram : `https://t.me/${settings.helpline_telegram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-500/25 transition-colors"
                  aria-label="Telegram"
                >
                  <Send className="w-3.5 h-3.5" />
                </a>
              )}
              <SupportWidget />
            </div>
          </nav>

          <div className="md:hidden flex items-center gap-1 xxs:gap-1.5 xs:gap-2 sm:gap-3 shrink-0">
            <button 
              type="button"
              onClick={handleOpenSearch}
              className="flex items-center justify-center w-8 h-8 xs:w-9 xs:h-9 bg-zinc-100 dark:bg-zinc-800 rounded-full active:scale-95 transition-all text-zinc-600 dark:text-zinc-300 cursor-pointer"
              aria-label="Search"
            >
              <Search className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
            </button>

            {settings.helpline_telegram && (
              <a 
                href={settings.helpline_telegram.startsWith('http') ? settings.helpline_telegram : `https://t.me/${settings.helpline_telegram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-8 h-8 xs:w-9 xs:h-9 bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-full active:scale-95 transition-transform"
                aria-label="Telegram"
              >
                <Send className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
              </a>
            )}
            <SupportWidget />
            <button 
              type="button"
              className="flex items-center justify-center w-8 h-8 xs:w-9 xs:h-9 bg-zinc-900 dark:bg-white rounded-full active:scale-95 transition-transform cursor-pointer"
              onClick={() => { triggerHaptic(); setMenuOpen(true); }}
              aria-label="Open menu"
            >
              <Menu className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-white dark:text-zinc-900" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <MobileMenuModal
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          onOpenSearch={() => {
            setMenuOpen(false);
            handleOpenSearch();
          }}
          siteTitle={settings.site_title || ''}
          logoUrl={resolvedLogoUrl}
          triggerHaptic={triggerHaptic}
          helplineTelegram={settings.helpline_telegram}
        />
      )}

      {searchOpen && (
        <LightSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      )}
    </>
  );
}

export default PublicHeader;
