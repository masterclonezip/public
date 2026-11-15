import React from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Star, ShieldCheck, MoreVertical, Share2, Flag } from 'lucide-react';
import { cn, safeVibrate } from '../../lib/utilsPublic';
import { getOptimizedImageUrl } from '../../seo/utils';
import { preloadAppDetails } from '../../lib/preloadHelper';

const AppOptionsMenu = ({ app, onMenuToggle }: { app: any; onMenuToggle?: (isOpen: boolean) => void }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; right: number; openUpward: boolean }>({
    top: 0,
    right: 16,
    openUpward: false
  });
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const updateMenuPosition = React.useCallback(() => {
    if (!buttonRef.current || typeof window === 'undefined') return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = 96;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight + 16 && rect.top > menuHeight + 16;
    const top = openUpward ? Math.max(8, rect.top - menuHeight - 6) : Math.min(window.innerHeight - menuHeight - 8, rect.bottom + 6);
    const right = Math.max(8, window.innerWidth - rect.right);
    setCoords({ top, right, openUpward });
  }, []);

  React.useEffect(() => {
    onMenuToggle?.(menuOpen);
    if (menuOpen) {
      updateMenuPosition();
    }
  }, [menuOpen, onMenuToggle, updateMenuPosition]);

  React.useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    }
    function handleScrollOrResize() {
      setMenuOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const appUrl = `${window.location.origin}/app/${app.slug}`;
    const shareTitle = app.seo_title || app.meta_title || app.name;
    if (navigator.share) {
      navigator.share({
        title: shareTitle,
        url: appUrl,
      })
      .then(() => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          setMenuOpen(false);
        }, 1200);
      })
      .catch(() => {});
    } else {
      navigator.clipboard.writeText(appUrl).then(() => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          setMenuOpen(false);
        }, 1200);
      }).catch(() => {});
    }
  };

  const handleOpenReport = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    window.dispatchEvent(new CustomEvent('open-report-modal', { detail: { app } }));
  };

  return (
    <div 
      className={`absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 ${menuOpen ? 'z-50' : 'z-20'}`} 
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={menuOpen}
        aria-haspopup="true"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!menuOpen) updateMenuPosition();
          setMenuOpen(!menuOpen);
        }}
        className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-full transition-colors cursor-pointer relative"
        aria-label="More options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {menuOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            right: `${coords.right}px`,
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="w-52 bg-zinc-900 text-white rounded-xl shadow-2xl border border-zinc-700/80 overflow-hidden py-1 z-[99999] transition-all duration-150 animate-in fade-in zoom-in-95"
        >
          <button
            type="button"
            onClick={handleShare}
            className="w-full flex items-center gap-3 px-4 h-[44px] text-sm sm:text-xs font-semibold hover:bg-zinc-800 transition-colors text-left cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-zinc-400 shrink-0" />
            <span>{copied ? 'Link Copied!' : 'Share app'}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenReport}
            className="w-full flex items-center gap-3 px-4 h-[44px] text-sm sm:text-xs font-semibold hover:bg-zinc-800 transition-colors text-left border-t border-zinc-800/60 cursor-pointer"
          >
            <Flag className="w-4 h-4 text-zinc-400 shrink-0" />
            <span>Flag as inappropriate</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export const AppListItem = React.memo(({ app, index }: { app: any; index?: number }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [iconFailed, setIconFailed] = React.useState(false);
  const displayIndex = index !== undefined ? index : (app.serial_number || 1);
  const isActuallyComingSoon = React.useMemo(() => {
    if (!app.is_coming_soon) return false;
    if (!app.publish_date) return true;
    return new Date(app.publish_date).getTime() > Date.now();
  }, [app.is_coming_soon, app.publish_date]);
  
  return (
    <div className={`relative group ${isMenuOpen ? 'z-[100]' : 'z-1'}`}>
      <Link 
        to={`/app/${app.slug}`}
        onMouseEnter={() => preloadAppDetails(app)}
        onFocus={() => preloadAppDetails(app)}
        className="flex items-center gap-2 xs:gap-2.5 sm:gap-4 py-2 xs:py-2.5 pl-0.5 pr-10 sm:pl-3 sm:pr-12 sm:py-3 mb-0 sm:mb-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200 rounded-xl sm:rounded-2xl relative active:bg-black/5 dark:active:bg-white/5 w-full"
      >
        <div className="w-4 xs:w-5 sm:w-6 text-xs xs:text-[13px] sm:text-base font-black text-zinc-400 dark:text-zinc-500 text-center shrink-0 tabular-nums">
          {displayIndex}
        </div>

        <div className="relative w-[54px] h-[54px] xs:w-[60px] xs:h-[60px] sm:w-[76px] sm:h-[76px] shrink-0">
          <div className="w-full h-full rounded-[14px] xs:rounded-[16px] sm:rounded-[20px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-sm border border-black/5 dark:border-white/10 relative z-10 transition-transform group-hover:-translate-y-0.5 duration-300 flex items-center justify-center">
            {!iconFailed && app.icon_url ? (
              <img 
                src={getOptimizedImageUrl(app.icon_url, 120)} 
                alt={`${app.name} app icon`} 
                width={76}
                height={76}
                loading={index !== undefined && index <= 6 ? "eager" : "lazy"}
                fetchPriority={index !== undefined && index <= 6 ? "high" : "low"}
                decoding="async"
                className="w-full h-full object-cover block"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (app.icon_url && target.src !== app.icon_url && !target.dataset.retried) {
                    target.dataset.retried = '1';
                    target.src = app.icon_url;
                  } else {
                    setIconFailed(true);
                  }
                }}
              />
            ) : (
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                {(app.name || 'A').substring(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          {app.is_hot && app.is_new ? (
            <div className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none">
              <span className="inline-flex items-center rounded-[6px] xs:rounded-[7px] overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.18)] font-black text-[8px] xs:text-[9px] uppercase tracking-wider">
                <span className="bg-[#d32f2f] text-white px-1.5 py-0.5">HOT</span>
                <span className="bg-[#008738] text-white px-1.5 py-0.5">NEW</span>
              </span>
            </div>
          ) : app.is_hot ? (
            <div className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none">
              <span className="bg-[#d32f2f] text-white text-[8px] xs:text-[9px] font-black px-1.5 py-0.5 rounded-[6px] xs:rounded-[8px] shadow-[0_2px_6px_rgba(0,0,0,0.15)] uppercase tracking-wider block">HOT</span>
            </div>
          ) : app.is_new ? (
            <div className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none">
              <span className="bg-[#008738] text-white text-[8px] xs:text-[9px] font-black px-1.5 py-0.5 rounded-[6px] xs:rounded-[8px] shadow-[0_2px_6px_rgba(0,0,0,0.15)] uppercase tracking-wider block">NEW</span>
            </div>
          ) : null}
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <h3 className="font-semibold text-[14px] xs:text-[15px] sm:text-base tracking-tight text-zinc-900 dark:text-zinc-100 truncate w-full">{app.name}</h3>
          <div className="text-xs sm:text-[13px] font-normal text-zinc-500 dark:text-zinc-400 truncate">{app.category}</div>
          <div className="flex items-center gap-1 text-[11px] xs:text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
            <span>{(() => {
              const r = typeof app.rating === 'number' ? app.rating : parseFloat(String(app.rating || ''));
              return !isNaN(r) && r > 0 ? r.toFixed(1) : '5.0';
            })()}</span>
            <Star className="w-3 h-3 fill-current text-amber-400" />
            {app.safety_status === 'Verified' && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0 ml-1" />}
          </div>
        </div>
        
        {isActuallyComingSoon && (
          <div className="shrink-0 pr-1">
            <div className="bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 text-[10px] font-black rounded-full tracking-wider">SOON</div>
          </div>
        )}
        
        <div className="absolute bottom-0 right-4 left-[84px] xs:left-[98px] sm:left-[140px] border-b border-black/5 dark:border-white/5 opacity-50 transition-opacity group-hover:opacity-0" />
      </Link>
      <AppOptionsMenu app={app} onMenuToggle={setIsMenuOpen} />
    </div>
  );
});

export const TopChartItem = React.memo(({ rank, app }: { rank: number; app: any }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [iconFailed, setIconFailed] = React.useState(false);
  const displayIndex = rank;
  const isActuallyComingSoon = React.useMemo(() => {
    if (!app.is_coming_soon) return false;
    if (!app.publish_date) return true;
    return new Date(app.publish_date).getTime() > Date.now();
  }, [app.is_coming_soon, app.publish_date]);

  return (
    <div className={`relative group ${isMenuOpen ? 'z-[100]' : 'z-1'}`}>
      <Link 
        to={`/app/${app.slug}`}
        onMouseEnter={() => preloadAppDetails(app)}
        onFocus={() => preloadAppDetails(app)}
        className="flex items-center gap-2 xs:gap-2.5 sm:gap-4 py-2 xs:py-2.5 pl-0.5 pr-10 sm:pl-3 sm:pr-12 sm:py-3 mb-0 sm:mb-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200 rounded-xl sm:rounded-2xl relative active:bg-black/5 dark:active:bg-white/5 w-full"
      >
        <div className="w-4 xs:w-5 sm:w-6 text-xs xs:text-[13px] sm:text-base font-black text-zinc-400 dark:text-zinc-500 text-center shrink-0 tabular-nums">
          {displayIndex}
        </div>
        
        <div className="relative w-[54px] h-[54px] xs:w-[60px] xs:h-[60px] sm:w-[76px] sm:h-[76px] shrink-0">
          <div className="w-full h-full rounded-[14px] xs:rounded-[16px] sm:rounded-[20px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-sm border border-black/5 dark:border-white/10 relative z-10 transition-transform group-hover:-translate-y-0.5 duration-300 flex items-center justify-center">
            {!iconFailed && app.icon_url ? (
              <img 
                src={getOptimizedImageUrl(app.icon_url, 180)} 
                alt={`${app.name} app icon`} 
                width={76}
                height={76}
                loading={rank <= 8 ? "eager" : "lazy"}
                fetchPriority={rank <= 8 ? "high" : "low"}
                decoding="async"
                className="w-full h-full object-cover block"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (app.icon_url && target.src !== app.icon_url && !target.dataset.retried) {
                    target.dataset.retried = '1';
                    target.src = app.icon_url;
                  } else {
                    setIconFailed(true);
                  }
                }}
              />
            ) : (
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                {(app.name || 'A').substring(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          {app.is_hot && app.is_new ? (
            <div className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none">
              <span className="inline-flex items-center rounded-[6px] xs:rounded-[7px] overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.18)] font-black text-[8px] xs:text-[9px] uppercase tracking-wider">
                <span className="bg-[#d32f2f] text-white px-1.5 py-0.5">HOT</span>
                <span className="bg-[#008738] text-white px-1.5 py-0.5">NEW</span>
              </span>
            </div>
          ) : app.is_hot ? (
            <div className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none">
              <span className="bg-[#d32f2f] text-white text-[8px] xs:text-[9px] font-black px-1.5 py-0.5 rounded-[6px] xs:rounded-[8px] shadow-[0_2px_6px_rgba(0,0,0,0.15)] uppercase tracking-wider block">HOT</span>
            </div>
          ) : app.is_new ? (
            <div className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none">
              <span className="bg-[#008738] text-white text-[8px] xs:text-[9px] font-black px-1.5 py-0.5 rounded-[6px] xs:rounded-[8px] shadow-[0_2px_6px_rgba(0,0,0,0.15)] uppercase tracking-wider block">NEW</span>
            </div>
          ) : null}
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <h3 className="font-semibold text-[14px] xs:text-[15px] sm:text-base tracking-tight text-zinc-900 dark:text-zinc-100 truncate w-full">{app.name}</h3>
          <div className="text-xs sm:text-[13px] font-normal text-zinc-500 dark:text-zinc-400 truncate">{app.category}</div>
          <div className="flex items-center gap-1 text-[11px] xs:text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
            <span>{(() => {
              const r = typeof app.rating === 'number' ? app.rating : parseFloat(String(app.rating || ''));
              return !isNaN(r) && r > 0 ? r.toFixed(1) : '5.0';
            })()}</span>
            <Star className="w-3 h-3 fill-current text-amber-400" />
            {app.safety_status === 'Verified' && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0 ml-1" />}
          </div>
        </div>
        
        {isActuallyComingSoon && (
          <div className="shrink-0 pr-1">
            <div className="bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 text-[10px] font-black rounded-full tracking-wider">SOON</div>
          </div>
        )}
        
        <div className="absolute bottom-0 right-4 left-[84px] xs:left-[98px] sm:left-[140px] border-b border-black/5 dark:border-white/5 opacity-50 transition-opacity group-hover:opacity-0" />
      </Link>
      <AppOptionsMenu app={app} onMenuToggle={setIsMenuOpen} />
    </div>
  );
});

export const AppListItemSkeleton = () => (
  <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-4 py-2 xs:py-2.5 pl-0.5 pr-10 sm:pl-3 sm:pr-12 sm:py-3 mb-0 sm:mb-1.5 animate-pulse rounded-xl sm:rounded-2xl relative select-none">
    <div className="w-4 xs:w-5 sm:w-6 text-center shrink-0">
      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3 xs:w-4 mx-auto" />
    </div>
    <div className="relative w-[54px] h-[54px] xs:w-[60px] xs:h-[60px] sm:w-[76px] sm:h-[76px] shrink-0">
      <div className="w-full h-full rounded-[14px] xs:rounded-[16px] sm:rounded-[20px] bg-zinc-200 dark:bg-zinc-700" />
    </div>
    <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
      <div className="bg-zinc-200 dark:bg-zinc-800 rounded h-4 w-1/3" />
      <div className="bg-zinc-200 dark:bg-zinc-800 rounded h-3 w-1/4" />
      <div className="bg-zinc-200 dark:bg-zinc-800 rounded h-3 w-8" />
    </div>
    <div className="absolute bottom-0 right-4 left-[84px] xs:left-[98px] sm:left-[140px] border-b border-black/5 dark:border-white/5 opacity-50" />
  </div>
);

export const TopChartItemSkeleton = ({ rank }: { rank: number }) => (
  <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-4 py-2 xs:py-2.5 pl-0.5 pr-10 sm:pl-3 sm:pr-12 sm:py-3 mb-0 sm:mb-1.5 animate-pulse rounded-xl sm:rounded-2xl relative select-none">
    <div className="w-4 xs:w-5 sm:w-6 text-xs xs:text-sm font-bold text-zinc-300 dark:text-zinc-700 text-center shrink-0">{rank}</div>
    <div className="relative w-[54px] h-[54px] xs:w-[60px] xs:h-[60px] sm:w-[76px] sm:h-[76px] shrink-0">
      <div className="w-full h-full rounded-[14px] xs:rounded-[16px] sm:rounded-[20px] bg-zinc-200 dark:bg-zinc-800" />
    </div>
    <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
      <div className="bg-zinc-200 dark:bg-zinc-800 rounded h-4 w-1/2" />
      <div className="bg-zinc-200 dark:bg-zinc-800 rounded h-3 w-1/3" />
      <div className="bg-zinc-200 dark:bg-zinc-800 rounded h-3 w-8" />
    </div>
    <div className="absolute bottom-0 right-4 left-[84px] xs:left-[98px] sm:left-[140px] border-b border-black/5 dark:border-white/5 opacity-50" />
  </div>
);

export const NewAdditionItemSkeleton = () => (
  <div className="flex flex-col gap-2 animate-pulse p-1 select-none">
    <div className="aspect-square rounded-[18px] bg-zinc-200 dark:bg-zinc-800 w-full" />
    <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3 mx-auto mt-1" />
  </div>
);
