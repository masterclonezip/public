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
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [menuOpen]);

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const appUrl = app.canonical_url || `${window.location.origin}/app/${app.slug}`;
    const shareTitle = app.seo_title || app.meta_title || app.name;
    const shareText = app.seo_description || app.meta_description || app.short_description || `Download ${app.name}`;
    if (navigator.share) {
      navigator.share({
        title: shareTitle,
        text: shareText,
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
      className={`absolute right-1 xs:right-2 sm:right-4 top-1/2 -translate-y-1/2 ${menuOpen ? 'z-50' : 'z-20'}`} 
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
        className="p-1.5 xs:p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-full transition-all cursor-pointer relative"
        aria-label="More options"
      >
        <MoreVertical className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
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
          className="w-48 xs:w-52 bg-zinc-900 text-white rounded-xl shadow-2xl border border-zinc-700/80 overflow-hidden py-1 z-[99999] transition-all duration-150 animate-in fade-in zoom-in-95"
        >
          <button
            type="button"
            onClick={handleShare}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold hover:bg-zinc-800 transition-colors text-left cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>{copied ? 'Link Copied!' : 'Share app'}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenReport}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold hover:bg-zinc-800 transition-colors text-left border-t border-zinc-800/60 h-[44px] cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
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
  const displayIndex = index !== undefined ? index : (app.serial_number || 1);
  const isActuallyComingSoon = React.useMemo(() => {
    if (!app.is_coming_soon) return false;
    if (!app.publish_date) return true;
    return new Date(app.publish_date).getTime() > Date.now();
  }, [app.is_coming_soon, app.publish_date]);
  
  return (
    <div className={`relative group ${isMenuOpen ? 'z-[100] [content-visibility:visible] [contain:none]' : 'z-1 [content-visibility:auto] [contain-intrinsic-size:auto_84px]'}`}>
      <Link 
        to={`/app/${app.slug}`}
        onMouseEnter={() => preloadAppDetails(app)}
        onFocus={() => preloadAppDetails(app)}
        onTouchStart={() => preloadAppDetails(app)}
        className="flex items-center gap-1.5 xxs:gap-2 xs:gap-2.5 sm:gap-4 py-1.5 xxs:py-2 pl-1 pr-8 xxs:pr-9 xs:py-2.5 xs:pl-2 xs:pr-12 sm:pl-4 sm:pr-14 sm:py-3.5 mb-0 sm:mb-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200 rounded-xl sm:rounded-2xl relative active:bg-black/5 dark:active:bg-white/5 w-full"
      >
        <div className="w-3.5 xxs:w-4 xs:w-5 sm:w-7 text-[11px] xxs:text-xs xs:text-[14px] sm:text-[17px] font-black text-zinc-400 dark:text-zinc-500 text-center shrink-0">
          {displayIndex}
        </div>

        <div className="relative w-[52px] h-[52px] xxs:w-[60px] xxs:h-[60px] xs:w-[72px] xs:h-[72px] sm:w-[88px] sm:h-[88px] shrink-0">
          <div className="w-full h-full rounded-[14px] xxs:rounded-[16px] xs:rounded-[18px] sm:rounded-[22px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-sm border border-black/5 dark:border-white/10 relative z-10 transition-transform group-hover:-translate-y-0.5 duration-300">
            <img 
              src={getOptimizedImageUrl(app.icon_url, 120) || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=128&h=128&fit=crop"} 
              alt={`${app.name} app icon`} 
              width={88}
              height={88}
              loading={index !== undefined && index <= 6 ? "eager" : "lazy"}
              fetchPriority={index !== undefined && index <= 6 ? "high" : "low"}
              decoding="async"
              className="w-full h-full object-cover block"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (app.icon_url && target.src !== app.icon_url) {
                  target.src = app.icon_url;
                } else {
                  target.src = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=128&h=128&fit=crop";
                }
              }}
            />
          </div>
          {app.is_hot && app.is_new ? (
            <div className="absolute -top-1.5 -right-2 z-20 pointer-events-none">
              <span className="inline-flex items-center rounded-[6px] xs:rounded-[8px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.18)] font-black text-[7px] xxs:text-[8px] xs:text-[9px] sm:text-[10px] uppercase tracking-wider block">
                <span className="bg-[#d32f2f] text-white px-1 xs:px-1.5 py-0.5">HOT</span>
                <span className="bg-[#008738] text-white px-1 xs:px-1.5 py-0.5">NEW</span>
              </span>
            </div>
          ) : app.is_hot ? (
            <div className="absolute -top-1.5 -right-2 z-20 pointer-events-none">
              <span className="bg-[#d32f2f] text-white text-[7px] xxs:text-[8px] xs:text-[9px] sm:text-[10px] font-black px-1.5 xs:px-2 py-0.5 rounded-[6px] xs:rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.15)] uppercase tracking-wider block">HOT</span>
            </div>
          ) : app.is_new ? (
            <div className="absolute -top-1.5 -right-2 z-20 pointer-events-none">
              <span className="bg-[#008738] text-white text-[7px] xxs:text-[8px] xs:text-[9px] sm:text-[10px] font-black px-1.5 xs:px-2 py-0.5 rounded-[6px] xs:rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.15)] uppercase tracking-wider block">NEW</span>
            </div>
          ) : null}
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <h3 className="font-semibold text-xs xxs:text-sm xs:text-base sm:text-[17px] tracking-tight text-zinc-900 dark:text-zinc-100 truncate w-full">{app.name}</h3>
          <div className="text-[10px] xxs:text-[11px] xs:text-xs sm:text-[13px] font-normal text-zinc-500 dark:text-zinc-400 truncate">{app.category}</div>
          <div className="flex items-center gap-1 text-[9px] xxs:text-[10px] xs:text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
            <span>{(() => {
              const r = typeof app.rating === 'number' ? app.rating : parseFloat(String(app.rating || ''));
              return !isNaN(r) && r > 0 ? r.toFixed(1) : '5.0';
            })()}</span>
            <Star className="w-2.5 h-2.5 xs:w-3 xs:h-3 fill-current text-zinc-400" />
            {app.safety_status === 'Verified' && <ShieldCheck className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-blue-500 shrink-0 ml-0.5 xs:ml-1" />}
          </div>
        </div>
        
        {isActuallyComingSoon && (
          <div className="shrink-0 pr-1">
            <div className="bg-orange-500/10 text-orange-600 dark:text-orange-400 px-1.5 xxs:px-2 xs:px-3 py-0.5 xs:py-1 text-[8px] xxs:text-[9px] xs:text-[11px] font-black rounded-full tracking-wider">SOON</div>
          </div>
        )}
        
        <div className="absolute bottom-0 right-4 left-[70px] xxs:left-[80px] xs:left-[96px] sm:left-[144px] border-b border-black/5 dark:border-white/5 opacity-50 transition-opacity group-hover:opacity-0" />
      </Link>
      <AppOptionsMenu app={app} onMenuToggle={setIsMenuOpen} />
    </div>
  );
});

export const TopChartItem = React.memo(({ rank, app }: { rank: number; app: any }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const displayIndex = rank;
  const isActuallyComingSoon = React.useMemo(() => {
    if (!app.is_coming_soon) return false;
    if (!app.publish_date) return true;
    return new Date(app.publish_date).getTime() > Date.now();
  }, [app.is_coming_soon, app.publish_date]);

  return (
    <div className={`relative group ${isMenuOpen ? 'z-[100] [content-visibility:visible] [contain:none]' : 'z-1 [content-visibility:auto] [contain-intrinsic-size:auto_84px]'}`}>
      <Link 
        to={`/app/${app.slug}`}
        onMouseEnter={() => preloadAppDetails(app)}
        onFocus={() => preloadAppDetails(app)}
        onTouchStart={() => preloadAppDetails(app)}
        className="flex items-center gap-1.5 xxs:gap-2 xs:gap-2.5 sm:gap-4 py-1.5 xxs:py-2 pl-1 pr-8 xxs:pr-9 xs:py-2.5 xs:pl-2 xs:pr-12 sm:pl-4 sm:pr-14 sm:py-3.5 mb-0 sm:mb-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200 rounded-xl sm:rounded-2xl relative active:bg-black/5 dark:active:bg-white/5 w-full"
      >
        <div className="w-3.5 xxs:w-4 xs:w-5 sm:w-7 text-[11px] xxs:text-xs xs:text-[14px] sm:text-[17px] font-black text-zinc-400 dark:text-zinc-500 text-center shrink-0">
          {displayIndex}
        </div>
        
        <div className="relative w-[52px] h-[52px] xxs:w-[60px] xxs:h-[60px] xs:w-[72px] xs:h-[72px] sm:w-[88px] sm:h-[88px] shrink-0">
          <div className="w-full h-full rounded-[14px] xxs:rounded-[16px] xs:rounded-[18px] sm:rounded-[22px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-sm border border-black/5 dark:border-white/10 relative z-10 transition-transform group-hover:-translate-y-0.5 duration-300">
            <img 
              src={getOptimizedImageUrl(app.icon_url, 180) || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=128&h=128&fit=crop"} 
              alt={`${app.name} app icon`} 
              width={88}
              height={88}
              loading={rank <= 8 ? "eager" : "lazy"}
              fetchPriority={rank <= 8 ? "high" : "low"}
              decoding="async"
              className="w-full h-full object-cover block"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (app.icon_url && target.src !== app.icon_url) {
                  target.src = app.icon_url;
                } else {
                  target.src = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=128&h=128&fit=crop";
                }
              }}
            />
          </div>
          {app.is_hot && app.is_new ? (
            <div className="absolute -top-1.5 -right-2 z-20 pointer-events-none">
              <span className="inline-flex items-center rounded-[6px] xs:rounded-[8px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.18)] font-black text-[7px] xxs:text-[8px] xs:text-[9px] sm:text-[10px] uppercase tracking-wider block">
                <span className="bg-[#d32f2f] text-white px-1 xs:px-1.5 py-0.5">HOT</span>
                <span className="bg-[#008738] text-white px-1 xs:px-1.5 py-0.5">NEW</span>
              </span>
            </div>
          ) : app.is_hot ? (
            <div className="absolute -top-1.5 -right-2 z-20 pointer-events-none">
              <span className="bg-[#d32f2f] text-white text-[7px] xxs:text-[8px] xs:text-[9px] sm:text-[10px] font-black px-1.5 xs:px-2 py-0.5 rounded-[6px] xs:rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.15)] uppercase tracking-wider block">HOT</span>
            </div>
          ) : app.is_new ? (
            <div className="absolute -top-1.5 -right-2 z-20 pointer-events-none">
              <span className="bg-[#008738] text-white text-[7px] xxs:text-[8px] xs:text-[9px] sm:text-[10px] font-black px-1.5 xs:px-2 py-0.5 rounded-[6px] xs:rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.15)] uppercase tracking-wider block">NEW</span>
            </div>
          ) : null}
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <h3 className="font-semibold text-xs xxs:text-sm xs:text-base sm:text-[17px] tracking-tight text-zinc-900 dark:text-zinc-100 truncate w-full">{app.name}</h3>
          <div className="text-[10px] xxs:text-[11px] xs:text-xs sm:text-[13px] font-normal text-zinc-500 dark:text-zinc-400 truncate">{app.category}</div>
          <div className="flex items-center gap-1 text-[9px] xxs:text-[10px] xs:text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
            <span>{(() => {
              const r = typeof app.rating === 'number' ? app.rating : parseFloat(String(app.rating || ''));
              return !isNaN(r) && r > 0 ? r.toFixed(1) : '5.0';
            })()}</span>
            <Star className="w-2.5 h-2.5 xs:w-3 xs:h-3 fill-current text-zinc-400" />
            {app.safety_status === 'Verified' && <ShieldCheck className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-blue-500 shrink-0 ml-0.5 xs:ml-1" />}
          </div>
        </div>
        
        {isActuallyComingSoon && (
          <div className="shrink-0 pr-1">
            <div className="bg-orange-500/10 text-orange-600 dark:text-orange-400 px-1.5 xxs:px-2 xs:px-3 py-0.5 xs:py-1 text-[8px] xxs:text-[9px] xs:text-[11px] font-black rounded-full tracking-wider">SOON</div>
          </div>
        )}
        
        <div className="absolute bottom-0 right-4 left-[70px] xxs:left-[80px] xs:left-[96px] sm:left-[144px] border-b border-black/5 dark:border-white/5 opacity-50 transition-opacity group-hover:opacity-0" />
      </Link>
      <AppOptionsMenu app={app} onMenuToggle={setIsMenuOpen} />
    </div>
  );
});

export const AppListItemSkeleton = () => (
  <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-4 py-2 pl-1 pr-9 xs:py-2.5 xs:pl-2 xs:pr-12 sm:px-4 sm:py-3.5 mb-0 sm:mb-2 animate-pulse rounded-xl sm:rounded-2xl relative select-none">
    <div className="w-4 xs:w-5 sm:w-7 text-center shrink-0">
      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3 xs:w-4 mx-auto" />
    </div>
    <div className="relative w-[52px] h-[52px] xxs:w-[60px] xxs:h-[60px] xs:w-[72px] xs:h-[72px] sm:w-[88px] sm:h-[88px] shrink-0">
      <div className="w-full h-full rounded-[14px] xxs:rounded-[16px] xs:rounded-[18px] sm:rounded-[22px] bg-zinc-200 dark:bg-zinc-700" />
    </div>
    <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
      <div className="bg-zinc-200 dark:bg-zinc-800 rounded h-4 w-1/3" />
      <div className="bg-zinc-200 dark:bg-zinc-800 rounded h-3 w-1/4" />
      <div className="bg-zinc-200 dark:bg-zinc-800 rounded h-3 w-8" />
    </div>
    <div className="absolute bottom-0 right-4 left-[70px] xxs:left-[80px] xs:left-[96px] sm:left-[144px] border-b border-black/5 dark:border-white/5 opacity-50" />
  </div>
);

export const TopChartItemSkeleton = ({ rank }: { rank: number }) => (
  <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-4 py-2 pl-1 pr-9 xs:py-2.5 xs:pl-2 xs:pr-12 sm:px-4 sm:py-3.5 mb-0 sm:mb-2 animate-pulse rounded-xl sm:rounded-2xl relative select-none">
    <div className="w-4 xs:w-5 sm:w-7 text-xs xs:text-sm font-bold text-zinc-300 dark:text-zinc-700 text-center shrink-0">{rank}</div>
    <div className="relative w-[52px] h-[52px] xxs:w-[60px] xxs:h-[60px] xs:w-[72px] xs:h-[72px] sm:w-[88px] sm:h-[88px] shrink-0">
      <div className="w-full h-full rounded-[14px] xxs:rounded-[16px] xs:rounded-[18px] sm:rounded-[22px] bg-zinc-200 dark:bg-zinc-800" />
    </div>
    <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
      <div className="bg-zinc-200 dark:bg-zinc-800 rounded h-4 w-1/2" />
      <div className="bg-zinc-200 dark:bg-zinc-800 rounded h-3 w-1/3" />
      <div className="bg-zinc-200 dark:bg-zinc-800 rounded h-3 w-8" />
    </div>
    <div className="absolute bottom-0 right-4 left-[70px] xxs:left-[80px] xs:left-[96px] sm:left-[144px] border-b border-black/5 dark:border-white/5 opacity-50" />
  </div>
);

export const NewAdditionItemSkeleton = () => (
  <div className="flex flex-col gap-2 animate-pulse p-1 select-none">
    <div className="aspect-square rounded-[18px] bg-zinc-200 dark:bg-zinc-800 w-full" />
    <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3 mx-auto mt-1" />
  </div>
);
