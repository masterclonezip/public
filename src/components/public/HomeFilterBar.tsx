import React from 'react';
import { Star, SlidersHorizontal, ChevronDown } from 'lucide-react';

interface HomeFilterBarProps {
  ratingFilter: string;
  setRatingFilter: (val: string) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  searchTerm: string;
  activeTab: string;
}

const HomeFilterBar = React.memo(function HomeFilterBar({
  ratingFilter,
  setRatingFilter,
  sortBy,
  setSortBy,
  searchTerm,
  activeTab
}: HomeFilterBarProps) {
  const isCategories = activeTab.toLowerCase() === 'categories';
  if (isCategories) return null;

  const isHomeTab = activeTab.toLowerCase() === 'all apps' || 
                    activeTab.toLowerCase() === 'all' || 
                    activeTab.toLowerCase() === 'home' || 
                    activeTab.toLowerCase() === 'apps';

  return (
    <div className={`px-0 mb-2.5 xs:mb-3.5 mt-0.5 xs:mt-1.5 flex flex-wrap items-center gap-2 xs:gap-3 ${(!searchTerm && isHomeTab) ? 'justify-end' : 'justify-between'}`}>
      {(!(!searchTerm && isHomeTab)) && (
        <h2 className="text-base xs:text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 m-0">
          {searchTerm ? 'Search Results' : 
           activeTab.toLowerCase() === 'top charts' ? 'Top Charts' : 
           activeTab}
        </h2>
      )}
      <div className="flex items-center gap-1.5 xs:gap-2.5 flex-wrap">
        {/* Star Rating Dropdown */}
        <div className="relative">
          <label className="sr-only">Filter by Rating</label>
          <div className="flex items-center gap-1.5 min-h-[36px] bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-1 shadow-xs text-xs sm:text-[13px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer select-none">
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <span>{ratingFilter === 'all' ? 'Rating: All' : `${ratingFilter}+ Stars`}</span>
            </span>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              aria-label="Filter applications by rating"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-base"
            >
              <option value="all">All Ratings</option>
              <option value="4.5">4.5+ ★ Superior</option>
              <option value="4.0">4.0+ ★ Top Rated</option>
              <option value="3.5">3.5+ ★ Premium</option>
              <option value="3.0">3.0+ ★ Standard</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </div>
        </div>

        {/* Sort By Dropdown */}
        <div className="relative">
          <label className="sr-only">Sort by Order</label>
          <div className="flex items-center gap-1.5 min-h-[36px] bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-1 shadow-xs text-xs sm:text-[13px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer select-none">
            <span className="flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>{
                sortBy === 'default' ? 'Recommended' : 
                sortBy === 'rating_desc' ? 'High Rating' : 
                'Low Rating'
              }</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort applications"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-base"
            >
              <option value="default">Recommended</option>
              <option value="rating_desc">Rating (Highest First)</option>
              <option value="rating_asc">Rating (Lowest First)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </div>
        </div>

        {/* Clear filters if active */}
        {(ratingFilter !== 'all' || sortBy !== 'default') && (
          <button
            type="button"
            onClick={() => {
              setRatingFilter('all');
              setSortBy('default');
            }}
            className="min-h-[36px] px-2.5 sm:px-3 rounded-lg sm:rounded-xl bg-red-50 dark:bg-red-500/10 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
});

export default HomeFilterBar;

