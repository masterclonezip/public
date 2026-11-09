import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  RefreshCw, 
  ChevronRight, 
  Search,
  Globe,
  Lock,
  Edit3
} from 'lucide-react';
import { useAppFilters } from '../hooks/useAppFilters';
import { AppForm } from './admin/apps/AppForm';
import { AppInspector } from './admin/apps/AppInspector';

// Main AppsTab Component
const AppsTab = React.memo(({ appsList, editingAppId, setEditingAppId, handleDeleteApp, handleSaveApp, categories, saving, handleTogglePublicSync }: any) => {
  const editApp = useMemo(
    () => (editingAppId ? appsList.find((a: any) => a.id === editingAppId) : null),
    [editingAppId, appsList]
  );
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [initialFormTab, setInitialFormTab] = useState<string>('general');

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    filteredApps
  } = useAppFilters(appsList);

  const [displayLimit, setDisplayLimit] = useState(25);
  
  React.useEffect(() => {
    setDisplayLimit(25);
  }, [searchQuery, statusFilter, categoryFilter]);

  const selectedApp = useMemo(
    () => appsList.find((a: any) => a.id === selectedAppId) || appsList[0],
    [appsList, selectedAppId]
  );

  // Single-pass O(N) memoized stats counters (eliminates 8 redundant .filter() loops on every render)
  const counts = useMemo(() => {
    let synced = 0, adminOnly = 0, verified = 0, caution = 0, unsafe = 0, isNew = 0, isHot = 0, isSoon = 0;
    for (const a of appsList || []) {
      if (a.sync_to_public !== false) synced++;
      else adminOnly++;
      if (a.safety_status === 'Verified') verified++;
      else if (a.safety_status === 'Caution') caution++;
      else if (a.safety_status === 'Unsafe') unsafe++;
      if (a.is_new) isNew++;
      if (a.is_hot) isHot++;
      if (a.is_coming_soon) isSoon++;
    }
    return {
      total: (appsList || []).length,
      synced,
      adminOnly,
      verified,
      caution,
      unsafe,
      isNew,
      isHot,
      isSoon
    };
  }, [appsList]);

  return (
    <div className="animate-fade-in space-y-2 sm:space-y-4">
      {/* Compact Swipeable Filter Strip on Mobile, 9-Col Grid on Desktop */}
      <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-0.5 lg:grid lg:grid-cols-9 lg:gap-2 lg:pb-0">
        {[
          { id: 'all', label: 'All', count: counts.total, activeCls: 'bg-blue-600 border-blue-600 text-white', countCls: 'text-blue-600 dark:text-blue-400' },
          { id: 'synced', label: '🌐 Live', count: counts.synced, activeCls: 'bg-emerald-600 border-emerald-600 text-white', countCls: 'text-emerald-600 dark:text-emerald-400' },
          { id: 'admin_only', label: '🔒 Draft', count: counts.adminOnly, activeCls: 'bg-amber-600 border-amber-600 text-white', countCls: 'text-amber-600 dark:text-amber-400' },
          { id: 'Verified', label: '🟢 Verified', count: counts.verified, activeCls: 'bg-emerald-600 border-emerald-600 text-white', countCls: 'text-emerald-600 dark:text-emerald-400' },
          { id: 'Caution', label: '🟡 Caution', count: counts.caution, activeCls: 'bg-amber-600 border-amber-600 text-white', countCls: 'text-amber-600 dark:text-amber-400' },
          { id: 'Unsafe', label: '🔴 Unsafe', count: counts.unsafe, activeCls: 'bg-rose-600 border-rose-600 text-white', countCls: 'text-rose-600 dark:text-rose-400' },
          { id: 'is_new', label: '✨ New', count: counts.isNew, activeCls: 'bg-blue-600 border-blue-600 text-white', countCls: 'text-blue-600 dark:text-blue-400' },
          { id: 'is_hot', label: '🔥 Hot', count: counts.isHot, activeCls: 'bg-rose-600 border-rose-600 text-white', countCls: 'text-rose-600 dark:text-rose-400' },
          { id: 'is_coming_soon', label: '⏳ Soon', count: counts.isSoon, activeCls: 'bg-indigo-600 border-indigo-600 text-white', countCls: 'text-indigo-600 dark:text-indigo-400' },
        ].map((stat) => (
          <button 
            key={stat.id}
            type="button"
            onClick={() => setStatusFilter(stat.id as any)}
            className={`shrink-0 px-2.5 py-1.5 lg:p-3 rounded-xl border text-left transition-all cursor-pointer flex lg:block items-center justify-between gap-1.5 ${
              statusFilter === stat.id 
                ? stat.activeCls 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">{stat.label}</div>
            <div className={`text-xs lg:text-xl font-black lg:mt-0.5 ${statusFilter === stat.id ? 'text-white' : stat.countCls}`}>
              {stat.count}
            </div>
          </button>
        ))}
      </div>

      {/* Main Container - Two Columns Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
        
        {/* Left Column - Compact App List & Quick Filters */}
        <div className={`lg:col-span-4 xl:col-span-4 ${(editingAppId !== null || selectedAppId) ? 'hidden lg:flex' : 'flex'} bg-white dark:bg-slate-900 rounded-2xl p-2 sm:p-3 border border-slate-200/80 dark:border-slate-800 lg:min-h-[760px] lg:max-h-[760px] lg:h-[760px] flex-col justify-between`}>
          <div className="flex flex-col h-full lg:overflow-hidden">
            
            {/* Header row with Add App & Quick Search */}
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <LayoutDashboard className="w-4 h-4 text-blue-500" />
                Apps ({filteredApps.length})
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setInitialFormTab('general');
                  setEditingAppId("");
                }}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs border-0 cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> New App
              </button>
            </div>

            {/* Quick Search and Dropdown Category Filter */}
            <div className="space-y-1.5 mb-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search apps, slug, keywords..." 
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl py-1.5 pl-8 pr-7 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
                {searchQuery && (
                  <button 
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold border-0 bg-transparent cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">📁 All Categories</option>
                  {categories?.map((cat: string) => (
                    <option key={cat} value={cat.toLowerCase()}>{cat}</option>
                  ))}
                </select>
                <button 
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setStatusFilter('all');
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Reset
                </button>
              </div>
            </div>

            {/* Apps List Container */}
            <div className="flex-1 lg:overflow-y-auto space-y-1.5 custom-scrollbar pb-2">
              {filteredApps.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-500 dark:text-slate-400">No applications match your filter</p>
                </div>
              ) : (
                <>
                  {filteredApps.slice(0, displayLimit).map((app: any) => {
                    const isSelected = selectedAppId === app.id;
                    const isBeingEdited = editingAppId === app.id;
                    
                    return (
                      <div 
                        key={app.id}
                        onClick={() => {
                          setSelectedAppId(app.id);
                          if (editingAppId !== null && editingAppId !== app.id) {
                            setEditingAppId(null);
                          }
                        }}
                        className={`group relative rounded-xl p-2 border transition-all cursor-pointer flex items-center gap-2.5 select-none ${
                          isBeingEdited 
                            ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/5' 
                            : isSelected 
                              ? 'border-blue-500/60 bg-blue-50/20 dark:bg-slate-800/80' 
                              : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <img 
                          src={app.icon_url || '/logo.png'} 
                          loading="lazy"
                          width={40}
                          height={40}
                          className="w-10 h-10 object-cover rounded-xl border border-slate-200/60 dark:border-slate-700 shrink-0" 
                          alt="" 
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">
                              {app.name}
                            </h4>
                            <span className="text-[9px] font-mono text-slate-400 shrink-0">
                              #{app.serial_number || 0}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (handleTogglePublicSync) handleTogglePublicSync(app.id);
                              }}
                              title="Tap to toggle Live / Draft status"
                              className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-0.5 cursor-pointer border ${
                                app.sync_to_public === false
                                  ? 'bg-amber-100/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
                                  : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/40'
                              }`}
                            >
                              {app.sync_to_public === false ? (
                                <><Lock className="w-2.5 h-2.5" /> DRAFT</>
                              ) : (
                                <><Globe className="w-2.5 h-2.5" /> LIVE</>
                              )}
                            </button>

                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[110px]">
                              {app.category}
                            </span>

                            {app.is_hot && (
                              <span className="bg-[#d32f2f] text-white px-1 py-0.2 rounded text-[8px] font-black uppercase">HOT</span>
                            )}
                            {app.is_new && (
                              <span className="bg-emerald-600 text-white px-1 py-0.2 rounded text-[8px] font-black uppercase">NEW</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInitialFormTab('general');
                              setEditingAppId(app.id);
                            }}
                            title="Edit Application"
                            className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer border-0 active:scale-95"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                  {filteredApps.length > displayLimit && (
                    <button
                      type="button"
                      onClick={() => setDisplayLimit(prev => prev + 30)}
                      className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 mt-1"
                    >
                      Load More ({filteredApps.length - displayLimit} left)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Inspector Panel or Editing Drawer Form */}
        <div className={`${(editingAppId !== null || selectedAppId) ? 'fixed inset-0 z-[999999] h-[100dvh] w-full flex lg:relative lg:inset-auto lg:z-auto lg:col-span-8 xl:col-span-8 lg:min-h-[760px] lg:max-h-[85vh] lg:h-[760px]' : 'hidden lg:flex lg:min-h-[760px] lg:col-span-8 xl:col-span-8 h-[500px]'} bg-white dark:bg-slate-900 border-0 lg:border border-slate-200/80 dark:border-slate-800 flex-col overflow-hidden shadow-2xl lg:shadow-sm rounded-none lg:rounded-2xl`}>
          {editingAppId !== null ? (
            <AppForm 
              editApp={editApp}
              editingAppId={editingAppId}
              appsList={appsList}
              initialFormTab={initialFormTab}
              handleSaveApp={handleSaveApp}
              setEditingAppId={setEditingAppId}
              categories={categories}
              saving={saving}
            />
          ) : (
            <AppInspector 
              selectedApp={selectedApp}
              setSelectedAppId={setSelectedAppId}
              setEditingAppId={setEditingAppId}
              setActiveFormTab={setInitialFormTab}
              handleDeleteApp={handleDeleteApp}
              handleTogglePublicSync={handleTogglePublicSync}
            />
          )}
        </div>

      </div>
    </div>
  );
});

export default AppsTab;
