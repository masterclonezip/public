import React from 'react';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AppSpecsBarProps {
  rating?: number;
  hasReviews?: boolean;
  file_size?: string;
  category?: string;
  version?: string;
}

export function AppSpecsBar({ rating, hasReviews, file_size, category, version }: AppSpecsBarProps) {
  // Extract specific meaningful category
  const displayCategory = React.useMemo(() => {
    if (!category) return 'General';
    const parts = category.split(',').map(c => c.trim()).filter(Boolean);
    const nonGeneric = parts.filter(c => {
      const lower = c.toLowerCase();
      return lower !== 'all apps' && lower !== 'all' && lower !== 'apps' && lower !== 'general';
    });
    return nonGeneric.length > 0 ? nonGeneric[0] : (parts[0] || 'General');
  }, [category]);

  const isRated = typeof rating === 'number' && rating > 0;

  return (
    <div className="w-full grid grid-cols-4 py-2 xxs:py-2.5 xs:py-3.5 sm:py-4 mb-3 sm:mb-6 border-y border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/10 dark:bg-zinc-900/10">
      {/* Column 1: Rating */}
      <div className="flex flex-col items-center justify-center px-0.5 xxs:px-1 xs:px-2 text-center min-w-0">
        <div className="flex items-center gap-0.5 font-extrabold text-[11px] xxs:text-xs xs:text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
          <span>{isRated ? rating.toFixed(1) : '--'}</span>
          <Star className={`w-2 h-2 xxs:w-2.5 xxs:h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 ${isRated ? 'fill-current text-orange-500' : 'text-zinc-300 dark:text-zinc-600'}`} />
        </div>
        <div className="text-[7px] xxs:text-[8px] xs:text-[10px] sm:text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5 xs:mt-1 truncate max-w-full">
          {isRated ? 'Rating' : 'Unrated'}
        </div>
      </div>

      {/* Column 2: Size */}
      <div className="flex flex-col items-center justify-center px-0.5 xxs:px-1 xs:px-2 text-center border-l border-zinc-200 dark:border-zinc-800/80 min-w-0">
        <div className="font-extrabold text-[11px] xxs:text-xs xs:text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate max-w-full">
          {file_size || '45 MB'}
        </div>
        <div className="text-[7px] xxs:text-[8px] xs:text-[10px] sm:text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5 xs:mt-1">Size</div>
      </div>

      {/* Column 3: Type */}
      <div className="flex flex-col items-center justify-center px-0.5 xxs:px-1 xs:px-2 text-center border-l border-zinc-200 dark:border-zinc-800/80 min-w-0">
        <Link 
          to={`/?tab=${encodeURIComponent(displayCategory)}`}
          className="font-extrabold text-[9px] xxs:text-[10px] xs:text-xs sm:text-sm text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 px-1 xxs:px-1.5 xs:px-2.5 py-0.5 rounded-full leading-none truncate max-w-full transition-colors"
          title={`View all ${displayCategory} apps`}
        >
          {displayCategory}
        </Link>
        <div className="text-[7px] xxs:text-[8px] xs:text-[10px] sm:text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5 xs:mt-1.5">Type</div>
      </div>

      {/* Column 4: Version */}
      <div className="flex flex-col items-center justify-center px-0.5 xxs:px-1 xs:px-2 text-center border-l border-zinc-200 dark:border-zinc-800/80 min-w-0">
        <div className="font-extrabold text-[11px] xxs:text-xs xs:text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate max-w-full">
          {version || '2.0.6'}
        </div>
        <div className="text-[7px] xxs:text-[8px] xs:text-[10px] sm:text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5 xs:mt-1">Version</div>
      </div>
    </div>
  );
}

export default AppSpecsBar;
