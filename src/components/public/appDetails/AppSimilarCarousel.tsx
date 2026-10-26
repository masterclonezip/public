import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getOptimizedImageUrl } from '../../../seo/utils';
import { preloadAppDetails } from '../../../lib/preloadHelper';

export interface RelatedAppItem {
  id: string | number;
  name: string;
  slug: string;
  icon_url: string;
  is_new?: boolean;
  is_hot?: boolean;
  serial_number?: number;
}

interface AppSimilarCarouselProps {
  relatedApps: RelatedAppItem[];
  specificCategory: string;
  totalCategoryCount?: number;
  isLoading?: boolean;
}

const SVG_PLACEHOLDER = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 86 86'%3E%3Crect width='86' height='86' rx='20' fill='%23e4e4e7'/%3E%3C/svg%3E";

export const AppSimilarCarousel: React.FC<AppSimilarCarouselProps> = ({ 
  relatedApps, 
  specificCategory,
  totalCategoryCount,
  isLoading = false
}) => {
  if ((!relatedApps || relatedApps.length === 0) && !isLoading) return null;

  if ((!relatedApps || relatedApps.length === 0) && isLoading) {
    return (
      <aside data-nosnippet aria-labelledby="related-apps-heading" className="my-5 xs:my-6 px-0 min-h-[228px] xs:min-h-[248px] sm:min-h-[268px]">
        <div className="flex items-center justify-between gap-2 mb-3 px-1 xs:px-2 sm:px-4 md:px-6">
          <h2 id="related-apps-heading" className="text-base xs:text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Similar Applications
          </h2>
          <div className="h-7 w-24 rounded-full bg-zinc-200/70 dark:bg-zinc-800/70 animate-pulse" />
        </div>
        <div className="grid grid-rows-2 grid-flow-col gap-x-3 xxs:gap-x-4 xs:gap-x-5 gap-y-3 xxs:gap-y-3.5 xs:gap-y-4 overflow-hidden pt-2.5 pb-2 px-2 xs:px-4 sm:px-0">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5 w-[68px] xxs:w-[76px] xs:w-[86px] sm:w-[98px] shrink-0">
              <div className="w-[58px] h-[58px] xxs:w-[66px] xxs:h-[66px] xs:w-[76px] xs:h-[76px] sm:w-[86px] sm:h-[86px] rounded-[24%] bg-zinc-200/70 dark:bg-zinc-800/70 animate-pulse" />
              <div className="h-3 w-14 rounded bg-zinc-200/70 dark:bg-zinc-800/70 animate-pulse" />
            </div>
          ))}
        </div>
      </aside>
    );
  }

  const displayTotal = totalCategoryCount && totalCategoryCount > 0 
    ? totalCategoryCount 
    : relatedApps.length;

  return (
    <aside data-nosnippet aria-labelledby="related-apps-heading" className="my-5 xs:my-6 px-0">
      <div className="flex items-center justify-between gap-2 mb-3 px-1 xs:px-2 sm:px-4 md:px-6">
        <div className="flex items-center gap-2 min-w-0">
          <h2 id="related-apps-heading" className="text-base xs:text-lg sm:text-xl font-bold flex items-center gap-1.5 xs:gap-2 text-zinc-900 dark:text-zinc-100 truncate">
            <span>Similar Applications</span>
            {specificCategory && specificCategory !== 'All Apps' && (
              <span className="text-[10px] xs:text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 xs:px-2.5 py-0.5 rounded-full border border-blue-200/50 dark:border-blue-800/50 truncate">
                {specificCategory}
              </span>
            )}
          </h2>
        </div>
        <Link 
          to={`/?tab=${encodeURIComponent(specificCategory)}`}
          className="inline-flex items-center gap-1.5 px-3 py-1 xs:px-3.5 xs:py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 active:scale-95 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-bold text-xs xs:text-xs transition-all border border-blue-200/70 dark:border-blue-800/70 shadow-2xs group shrink-0"
          title={`Explore all ${displayTotal} ${specificCategory} apps`}
        >
          <span>View all ({displayTotal})</span>
          <ArrowRight className="w-3 h-3 xs:w-3.5 xs:h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div 
        className="grid grid-rows-2 grid-flow-col gap-x-3 xxs:gap-x-4 xs:gap-x-5 gap-y-3 xxs:gap-y-3.5 xs:gap-y-4 overflow-x-auto pt-2.5 pb-2 snap-x snap-proximity touch-pan-y overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-2 xs:-mx-4 px-2 xs:px-4 sm:mx-0 sm:px-0"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y pan-x', overscrollBehaviorX: 'contain' }}
      >
        {relatedApps.map((relatedApp, index) => {
          const iconSrc = getOptimizedImageUrl(relatedApp.icon_url, 96) || 'https://via.placeholder.com/96';

          return (
            <Link
              key={`${relatedApp.id}-${index}`}
              to={`/app/${relatedApp.slug}`}
              onMouseEnter={() => preloadAppDetails(relatedApp.slug)}
              onFocus={() => preloadAppDetails(relatedApp.slug)}
              onTouchStart={() => preloadAppDetails(relatedApp.slug)}
              className="flex flex-col items-center justify-start gap-1 xxs:gap-1.5 xs:gap-2 w-[68px] xxs:w-[76px] xs:w-[86px] sm:w-[98px] snap-start group shrink-0 active:scale-95 transition-transform duration-150 ease-out"
            >
              <div className="relative inline-block shrink-0">
                <img
                  src={iconSrc}
                  alt={relatedApp.name}
                  width={86}
                  height={86}
                  decoding="async"
                  fetchPriority="low"
                  className="w-[58px] h-[58px] xxs:w-[66px] xxs:h-[66px] xs:w-[76px] xs:h-[76px] sm:w-[86px] sm:h-[86px] rounded-[24%] shadow-[0_2px_8px_rgba(0,0,0,0.08)] object-cover group-hover:scale-105 transition-transform duration-200 block pointer-events-none select-none"
                  loading="lazy"
                />
                {relatedApp.is_hot && relatedApp.is_new ? (
                  <span className="absolute -top-1.5 -right-1.5 z-20 inline-flex items-center rounded-full overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.25)] border border-white dark:border-zinc-900 font-black text-[7.5px] xxs:text-[8px] xs:text-[9px] uppercase tracking-wider leading-none select-none pointer-events-none">
                    <span className="bg-[#d32f2f] text-white px-1 xs:px-1.5 py-0.5">HOT</span>
                    <span className="bg-[#008738] text-white px-1 xs:px-1.5 py-0.5">NEW</span>
                  </span>
                ) : relatedApp.is_hot ? (
                  <span className="absolute -top-1.5 -right-1.5 z-20 bg-[#d32f2f] text-white font-black text-[7.5px] xxs:text-[8px] xs:text-[9px] px-1.5 py-0.5 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.25)] border border-white dark:border-zinc-900 uppercase tracking-wider leading-none select-none pointer-events-none flex items-center justify-center">
                    HOT
                  </span>
                ) : relatedApp.is_new ? (
                  <span className="absolute -top-1.5 -right-1.5 z-20 bg-[#008738] text-white font-black text-[7.5px] xxs:text-[8px] xs:text-[9px] px-1.5 py-0.5 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.25)] border border-white dark:border-zinc-900 uppercase tracking-wider leading-none select-none pointer-events-none flex items-center justify-center">
                    NEW
                  </span>
                ) : null}
              </div>
              <span className="text-[9.5px] xxs:text-[10.5px] xs:text-[11.5px] sm:text-[12px] font-semibold text-center text-zinc-800 dark:text-zinc-200 line-clamp-2 w-full px-0.5 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors pointer-events-none select-none">
                {relatedApp.name}
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
};
