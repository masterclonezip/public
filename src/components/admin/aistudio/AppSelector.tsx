import React, { useMemo } from 'react';
import { Search, CheckSquare, Square, Layers, Check, X, Sparkles } from 'lucide-react';
import { getOptimizedImageUrl } from '../../../seo/utils';

interface AppSelectorProps {
  appsList: any[];
  selectedAppIds: string[];
  onChangeSelection: (ids: string[]) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onClose?: () => void;
  isModal?: boolean;
  aiStatus?: {
    status: 'connected' | 'disconnected' | 'testing';
    latencyMs?: number;
    model: string;
  };
}

export const AppSelector: React.FC<AppSelectorProps> = ({
  appsList,
  selectedAppIds,
  onChangeSelection,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  onClose,
  isModal = false,
  aiStatus
}) => {
  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    appsList.forEach(a => {
      if (a.category) set.add(a.category);
    });
    return ['all', ...Array.from(set)];
  }, [appsList]);

  // Filtered list
  const filteredApps = useMemo(() => {
    let list = appsList;
    if (selectedCategory !== 'all') {
      list = list.filter(a => (a.category || '').toLowerCase() === selectedCategory.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => 
        (a.name || '').toLowerCase().includes(q) || 
        (a.slug || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [appsList, selectedCategory, searchQuery]);

  const allFilteredSelected = useMemo(() => {
    if (filteredApps.length === 0) return false;
    return filteredApps.every(a => selectedAppIds.includes(String(a.id || a.slug)));
  }, [filteredApps, selectedAppIds]);

  const toggleApp = (id: string) => {
    if (selectedAppIds.includes(id)) {
      onChangeSelection(selectedAppIds.filter(item => item !== id));
    } else {
      onChangeSelection([...selectedAppIds, id]);
    }
  };

  const handleToggleAllFiltered = () => {
    if (allFilteredSelected) {
      // Deselect filtered
      const filteredIdSet = new Set(filteredApps.map(a => String(a.id || a.slug)));
      onChangeSelection(selectedAppIds.filter(id => !filteredIdSet.has(id)));
    } else {
      // Select filtered
      const combined = new Set([...selectedAppIds, ...filteredApps.map(a => String(a.id || a.slug))]);
      onChangeSelection(Array.from(combined));
    }
  };

  const selectTop10 = () => {
    const top10Ids = filteredApps.slice(0, 10).map(a => String(a.id || a.slug));
    onChangeSelection(Array.from(new Set([...selectedAppIds, ...top10Ids])));
  };

  const clearAllSelection = () => {
    onChangeSelection([]);
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col h-full w-full overflow-hidden shadow-2xl ${
      isModal 
        ? 'rounded-none sm:rounded-2xl max-h-[100dvh] sm:max-h-[90vh]' 
        : 'rounded-2xl'
    }`}>
      {/* Header with counter and actions */}
      <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Select Target Apps</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                {selectedAppIds.length} Selected
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              AI uses this website's local app catalog data to write reviews
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {aiStatus && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
              aiStatus.status === 'connected'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : aiStatus.status === 'testing'
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 animate-pulse'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                aiStatus.status === 'connected' ? 'bg-emerald-500 animate-pulse' : aiStatus.status === 'testing' ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
              <span className="font-bold text-[11px]">
                {aiStatus.status === 'connected'
                  ? `AI Connected (${aiStatus.model.replace('gemini-', '').replace('-latest', '')})`
                  : aiStatus.status === 'testing'
                  ? 'Testing AI...'
                  : 'Key Missing'}
              </span>
            </div>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition cursor-pointer flex-shrink-0"
              title="Close catalog modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Control bar: Quick select presets */}
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleToggleAllFiltered}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition flex items-center gap-1.5 cursor-pointer text-[11px]"
          >
            {allFilteredSelected ? (
              <>
                <Square className="w-3.5 h-3.5 text-slate-400" />
                <span>Deselect Filtered</span>
              </>
            ) : (
              <>
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Select All Filtered ({filteredApps.length})</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={selectTop10}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition text-[11px] cursor-pointer"
          >
            + Top 10 Apps
          </button>

          {selectedAppIds.length > 0 && (
            <button
              type="button"
              onClick={clearAllSelection}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 font-medium transition text-[11px] cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition text-xs shadow-xs cursor-pointer ml-auto"
          >
            Done ({selectedAppIds.length})
          </button>
        )}
      </div>

      {/* Search Input & Category Filters */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-2 flex-shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by app title, category, or developer..."
            className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition font-medium"
          />
        </div>

        {/* Category Filter Chips */}
        {categories.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar flex-shrink-0">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-[11px] px-2.5 py-1 rounded-lg whitespace-nowrap transition capitalize font-medium cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Apps Grid/List Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 pr-2">
        {filteredApps.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500">
            No matching applications found in catalog
          </div>
        ) : (
          filteredApps.map(app => {
            const id = String(app.id || app.slug);
            const isSelected = selectedAppIds.includes(id);
            const iconUrl = app.icon_url ? getOptimizedImageUrl(app.icon_url, 48) : '';

            return (
              <div
                key={id}
                onClick={() => toggleApp(id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/50 shadow-xs'
                    : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-950/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {/* App Icon */}
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-200 dark:border-white/5 relative">
                    {iconUrl ? (
                      <img 
                        src={iconUrl} 
                        alt={app.name} 
                        className="w-full h-full object-cover" 
                        loading="lazy" 
                        onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-bold">
                        {(app.name || 'A')[0]}
                      </div>
                    )}
                  </div>

                  {/* App Details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}`}>
                        {app.name}
                      </span>
                      {app.category && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                          {app.category}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {app.developer || app.developer_name || 'Verified App'}
                      {app.version ? ` • v${app.version}` : ''}
                    </p>
                  </div>
                </div>

                {/* Selection Checkbox */}
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'border border-slate-300 dark:border-slate-700 text-transparent group-hover:border-slate-400 dark:group-hover:border-slate-500'
                }`}>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer bar */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
        <span>Showing {filteredApps.length} of {appsList.length} apps</span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedAppIds.length} apps selected for generation</span>
      </div>
    </div>
  );
};
