import { Star, SlidersHorizontal, ChevronDown } from 'lucide-react';

interface HomeFilterBarProps {
  ratingFilter: string;
  setRatingFilter: (val: string) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  searchTerm: string;
  activeTab: string;
}

export default function HomeFilterBar({
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
    <div className={`px-0 mb-3 xs:mb-4 mt-1 xs:mt-2 flex flex-wrap items-center gap-2 xs:gap-4 ${(!searchTerm && isHomeTab) ? 'justify-end' : 'justify-between'}`}>
      {(!(!searchTerm && isHomeTab)) && (
        <h2 className="text-lg xs:text-xl font-bold text-zinc-900 dark:text-zinc-100 m-0">
          {searchTerm ? 'Search Results' : 
           activeTab.toLowerCase() === 'top charts' ? 'Top Charts' : 
           activeTab}
        </h2>
      )}
      <div className="flex items-center gap-2 xs:gap-3 flex-wrap">
        {/* Star Rating Dropdown */}
        <div className="relative">
          <label className="sr-only">Filter by Rating</label>
          <div className="flex items-center gap-1 xs:gap-1.5 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-xl px-2 xs:px-3 py-1 xs:py-1.5 shadow-sm text-[11px] xs:text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer select-none">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 xs:w-3.5 xs:h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <span>{ratingFilter === 'all' ? 'Rating: All' : `${ratingFilter}+ Stars`}</span>
            </span>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              aria-label="Filter applications by rating"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            >
              <option value="all">All Ratings</option>
              <option value="4.5">4.5+ ★ Superior</option>
              <option value="4.0">4.0+ ★ Top Rated</option>
              <option value="3.5">3.5+ ★ Premium</option>
              <option value="3.0">3.0+ ★ Standard</option>
            </select>
            <ChevronDown className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-zinc-400 shrink-0" />
          </div>
        </div>

        {/* Sort By Dropdown */}
        <div className="relative">
          <label className="sr-only">Sort by Order</label>
          <div className="flex items-center gap-1 xs:gap-1.5 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-xl px-2 xs:px-3 py-1 xs:py-1.5 shadow-sm text-[11px] xs:text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer select-none">
            <span className="flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-blue-500 shrink-0" />
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
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            >
              <option value="default">Recommended</option>
              <option value="rating_desc">Rating (Highest First)</option>
              <option value="rating_asc">Rating (Lowest First)</option>
            </select>
            <ChevronDown className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-zinc-400 shrink-0" />
          </div>
        </div>

        {/* Clear filters if active */}
        {(ratingFilter !== 'all' || sortBy !== 'default') && (
          <button
            onClick={() => {
              setRatingFilter('all');
              setSortBy('default');
            }}
            className="text-[11px] xs:text-xs font-bold text-red-500 hover:text-red-650 transition-colors px-1.5 xs:px-2 py-1 cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
