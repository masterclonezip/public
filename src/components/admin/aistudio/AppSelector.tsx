import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckSquare,
  Square,
  Layers,
  Check,
  X,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { getOptimizedImageUrl } from '../../../seo/utils';

export interface AppSelectorProps {
  apps?: any[];
  appsList?: any[];
  selectedAppIds: string[];
  onToggleApp?: (appId: string) => void;
  onSelectBatch?: (ids: string[]) => void;
  onChangeSelection?: (ids: string[]) => void;
  appReviewCounts?: Record<string, number>;
  appLastGeneratedMap?: Record<string, string>;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  selectedCategory?: string;
  setSelectedCategory?: (cat: string) => void;
  onClose?: () => void;
  isModal?: boolean;
  aiStatus?: {
    status: 'connected' | 'disconnected' | 'testing';
    latencyMs?: number;
    model: string;
  };
}

export const AppSelector: React.FC<AppSelectorProps> = ({
  apps,
  appsList,
  selectedAppIds,
  onToggleApp,
  onSelectBatch,
  onChangeSelection,
  appReviewCounts = {},
  appLastGeneratedMap = {},
  searchQuery: extSearchQuery,
  setSearchQuery: extSetSearchQuery,
  selectedCategory: extSelectedCategory,
  setSelectedCategory: extSetSelectedCategory,
  onClose
}) => {
  const [internalSearch, setInternalSearch] = useState('');
  const [internalCategory, setInternalCategory] = useState('all');

  const searchQuery = extSearchQuery !== undefined ? extSearchQuery : internalSearch;
  const setSearchQuery = extSetSearchQuery || setInternalSearch;
  const selectedCategory = extSelectedCategory !== undefined ? extSelectedCategory : internalCategory;
  const setSelectedCategory = extSetSelectedCategory || setInternalCategory;

  const catalog = useMemo(() => apps || appsList || [], [apps, appsList]);

  const updateBatch = (ids: string[]) => {
    if (onSelectBatch) onSelectBatch(ids);
    else if (onChangeSelection) onChangeSelection(ids);
  };

  const toggleSingle = (id: string) => {
    if (onToggleApp) {
      onToggleApp(id);
    } else if (onChangeSelection) {
      if (selectedAppIds.includes(id)) {
        onChangeSelection(selectedAppIds.filter(x => x !== id));
      } else {
        onChangeSelection([...selectedAppIds, id]);
      }
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach(a => {
      if (a?.category) set.add(a.category);
    });
    return ['all', ...Array.from(set)];
  }, [catalog]);

  const filteredApps = useMemo(() => {
    let list = catalog;
    if (selectedCategory !== 'all') {
      list = list.filter(
        a => (a?.category || '').toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        a =>
          (a?.name || a?.title || '').toLowerCase().includes(q) ||
          (a?.category || '').toLowerCase().includes(q) ||
          (a?.developer || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [catalog, selectedCategory, searchQuery]);

  const handleSelectZeroReviews = () => {
    const zeroIds = filteredApps
      .filter(a => (appReviewCounts[String(a.id)] || 0) === 0)
      .map(a => String(a.id));
    updateBatch(zeroIds);
  };

  const handleSelectTop10 = () => {
    updateBatch(filteredApps.slice(0, 10).map(a => String(a.id)));
  };

  const handleSelectAllFiltered = () => {
    updateBatch(filteredApps.map(a => String(a.id)));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header & Quick Selection Filters */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Target Apps ({selectedAppIds.length}/{catalog.length})
            </span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search app name or category..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-7 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Dropdown + Quick Batch Buttons */}
        <div className="flex items-center gap-1.5">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleSelectTop10}
            className="px-2 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-200/70 dark:border-indigo-800/60 hover:bg-indigo-100 cursor-pointer whitespace-nowrap"
          >
            Top 10
          </button>
          <button
            type="button"
            onClick={handleSelectZeroReviews}
            className="px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200/70 dark:border-amber-800/60 hover:bg-amber-100 cursor-pointer whitespace-nowrap"
            title="Select apps with 0 existing reviews"
          >
            0 Revs
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] pt-0.5">
          <button
            type="button"
            onClick={handleSelectAllFiltered}
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Select All ({filteredApps.length})
          </button>
          {selectedAppIds.length > 0 && (
            <button
              type="button"
              onClick={() => updateBatch([])}
              className="font-bold text-rose-500 hover:underline cursor-pointer"
            >
              Clear ({selectedAppIds.length})
            </button>
          )}
        </div>
      </div>

      {/* App List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
        {filteredApps.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No matching apps found.
          </div>
        ) : (
          filteredApps.map(app => {
            const id = String(app.id);
            const isSelected = selectedAppIds.includes(id);
            const revCount = appReviewCounts[id] || 0;
            const lastGen = appLastGeneratedMap[id];
            const iconUrl = getOptimizedImageUrl(
              app.icon || app.icon_url || app.logo || '',
              64
            );

            return (
              <div
                key={id}
                onClick={() => toggleSingle(id)}
                className={`px-3.5 py-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/35'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200/70 dark:border-slate-700"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                      {(app.name || app.title || 'A').slice(0, 1)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {app.name || app.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="truncate max-w-[100px]">{app.category || 'App'}</span>
                      {lastGen && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          • AI Ready
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                    revCount > 0
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}
                >
                  <MessageSquare className="w-2.5 h-2.5" />
                  {revCount}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
