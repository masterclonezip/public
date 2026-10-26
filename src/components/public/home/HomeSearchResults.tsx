import { Search } from 'lucide-react';
import { AppListItem } from '../../PlayStoreUI';

interface HomeSearchResultsProps {
  searchTerm: string;
  filteredApps: any[];
  visibleCount: number;
  onClearSearch: () => void;
}

export default function HomeSearchResults({
  searchTerm,
  filteredApps,
  visibleCount,
  onClearSearch
}: HomeSearchResultsProps) {
  if (!searchTerm) return null;

  return (
    <div className="px-0 sm:px-1 mb-4">
      <div className="flex items-center justify-between bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl px-3 py-2 text-xs font-medium text-blue-900 dark:text-blue-200 mb-3">
        <span className="flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-blue-500" />
          <span>Showing results for <strong>"{searchTerm}"</strong> ({filteredApps.length} found)</span>
        </span>
        <button
          onClick={onClearSearch}
          className="text-blue-600 dark:text-blue-400 hover:underline font-bold text-xs cursor-pointer ml-2"
        >
          Clear Search
        </button>
      </div>
      <div className="space-y-2">
        {filteredApps.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
            <Search className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
            <p className="text-base font-bold text-zinc-800 dark:text-zinc-200">No applications matched "{searchTerm}"</p>
            <p className="text-xs text-zinc-400 mt-1">Try checking for typos or searching a broader keyword</p>
          </div>
        ) : (
          filteredApps.slice(0, visibleCount).map((app, index) => (
            <AppListItem key={`${app.id}-${index}`} app={app} index={index + 1} />
          ))
        )}
      </div>
    </div>
  );
}
