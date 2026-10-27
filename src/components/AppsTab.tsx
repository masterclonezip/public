import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  RefreshCw, 
  ChevronRight, 
  Search,
  Globe,
  Lock
} from 'lucide-react';
import { useAppForm } from '../hooks/useAppForm';
import { useAppFilters } from '../hooks/useAppFilters';
import { AppForm } from './admin/apps/AppForm';
import { AppInspector } from './admin/apps/AppInspector';

// Main AppsTab Component
const AppsTab = React.memo(({ appsList, editingAppId, setEditingAppId, handleDeleteApp, handleSaveApp, categories, saving, handleTogglePublicSync }: any) => {
  const editApp = editingAppId ? appsList.find((a: any) => a.id === editingAppId) : null;
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const {
    formFields,
    activeFormTab,
    setActiveFormTab,
    handleFieldChange,
    handleQuickClean
  } = useAppForm(editApp, editingAppId, appsList, categories);

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    filteredApps
  } = useAppFilters(appsList);

  const [displayLimit, setDisplayLimit] = useState(50);
  
  React.useEffect(() => {
    setDisplayLimit(50);
  }, [searchQuery, statusFilter, categoryFilter]);

  const selectedApp = appsList.find((a: any) => a.id === selectedAppId) || appsList[0];

  // Stats Counters
  const totalAppsCount = appsList.length;
  const syncedCount = appsList.filter((a: any) => a.sync_to_public !== false).length;
  const adminOnlyCount = appsList.filter((a: any) => a.sync_to_public === false).length;
  const verifiedCount = appsList.filter((a: any) => a.safety_status === 'Verified').length;
  const cautionCount = appsList.filter((a: any) => a.safety_status === 'Caution').length;
  const unsafeCount = appsList.filter((a: any) => a.safety_status === 'Unsafe').length;
  const newCount = appsList.filter((a: any) => a.is_new).length;
  const hotCount = appsList.filter((a: any) => a.is_hot).length;
  const soonCount = appsList.filter((a: any) => a.is_coming_soon).length;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Metrics Row at the Top */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
        {[
          { id: 'all', label: 'All Catalog', count: totalAppsCount, color: 'blue' },
          { id: 'synced', label: '🌐 Live Web', count: syncedCount, color: 'emerald' },
          { id: 'admin_only', label: '🔒 Admin Only', count: adminOnlyCount, color: 'amber' },
          { id: 'Verified', label: '🟢 Verified', count: verifiedCount, color: 'emerald' },
          { id: 'Caution', label: '🟡 Caution', count: cautionCount, color: 'amber' },
          { id: 'Unsafe', label: '🔴 Unsafe', count: unsafeCount, color: 'rose' },
          { id: 'is_new', label: '✨ New Tag', count: newCount, color: 'blue' },
          { id: 'is_hot', label: '🔥 Hot Tag', count: hotCount, color: 'rose' },
          { id: 'is_coming_soon', label: '⏳ Soon', count: soonCount, color: 'indigo' },
        ].map((stat) => (
          <button 
            key={stat.id}
            type="button"
            onClick={() => setStatusFilter(stat.id as any)}
            className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
              statusFilter === stat.id 
                ? `bg-${stat.color}-600 border-${stat.color}-600 text-white shadow-sm` 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-900 dark:text-white'
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-75">{stat.label}</div>
            <div className={`text-2xl font-bold mt-1 ${statusFilter === stat.id ? 'text-white' : `text-${stat.color}-600 dark:text-${stat.color}-400`} group-hover:scale-105 transition-transform`}>
              {stat.count}
            </div>
          </button>
        ))}
      </div>

      {/* Main Container - Two Columns Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Left Column - Compact App List & Quick Filters */}
        <div className={`lg:col-span-4 xl:col-span-4 ${(editingAppId !== null || selectedAppId) ? 'hidden lg:flex' : 'flex'} bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl p-3 border border-slate-200/60 dark:border-slate-800/60 h-[500px] lg:h-[780px] flex-col justify-between`}>
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Header row with Add App & Quick Search */}
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <LayoutDashboard className="w-4 h-4 text-blue-500" />
                Catalog
                <span className="text-[10px] bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold text-slate-500 dark:text-slate-400">
                  {filteredApps.length}
                </span>
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setEditingAppId("");
                  setActiveFormTab('general');
                }}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm border-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> New App
              </button>
            </div>

            {/* Quick Search and Dropdown Category Filter */}
            <div className="space-y-2 mb-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search apps, slug, keywords..." 
                  className="w-full bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl py-2 pl-9 pr-8 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-all placeholder-slate-400 dark:placeholder-slate-500"
                />
                {searchQuery && (
                  <button 
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-sm font-semibold p-0.5 border-0 bg-transparent cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="all">📁 All Categories</option>
                    {categories?.map((cat: string) => (
                      <option key={cat} value={cat.toLowerCase()}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <button 
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('all');
                      setStatusFilter('all');
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/40 dark:border-slate-700/40 rounded-xl p-2 text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Apps List Container */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar pb-4">
              {filteredApps.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/60 rounded-xl">
                  <LayoutDashboard className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">No applications match your search</p>
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
                        onDoubleClick={() => {
                          setEditingAppId(app.id);
                          setActiveFormTab('general');
                        }}
                        className={`group relative rounded-xl p-3 border transition-all cursor-pointer flex items-center gap-3 select-none ${
                          isBeingEdited 
                            ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/5' 
                            : isSelected 
                              ? 'border-blue-500/60 dark:border-blue-500/40 bg-white dark:bg-slate-900 shadow-sm ring-1 ring-blue-500/5' 
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <img 
                          src={app.icon_url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=128&h=128&fit=crop'} 
                          loading="lazy"
                          width={44}
                          height={44}
                          className="w-11 h-11 object-cover rounded-xl shadow-xs border border-slate-100 dark:border-slate-800 shrink-0" 
                          alt="" 
                        />
                        
                        <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-xs truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {app.name}
                          </h4>
                          <span className="text-[9px] font-mono font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                            #{app.serial_number || 0}
                          </span>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {app.category}
                        </p>

                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {app.sync_to_public === false ? (
                            <span className="bg-amber-100/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" /> DRAFT
                            </span>
                          ) : (
                            <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30 px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                              <Globe className="w-2.5 h-2.5" /> LIVE
                            </span>
                          )}

                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium leading-none ${
                            app.safety_status === 'Verified' 
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30' 
                              : app.safety_status === 'Caution'
                                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30'
                                : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30'
                          }`}>
                            {app.safety_status === 'Verified' ? 'Verified' : app.safety_status === 'Caution' ? 'Caution' : 'Unsafe'}
                          </span>

                          {app.is_hot && app.is_new ? (
                            <span className="inline-flex items-center rounded overflow-hidden text-[8px] font-black uppercase tracking-wider">
                              <span className="bg-[#d32f2f] text-white px-1.5 py-0.5">HOT</span>
                              <span className="bg-[#008738] text-white px-1.5 py-0.5">NEW</span>
                            </span>
                          ) : app.is_hot ? (
                            <span className="bg-[#d32f2f] text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">HOT</span>
                          ) : app.is_new ? (
                            <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">NEW</span>
                          ) : null}

                          {app.is_coming_soon && (
                            <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">SOON</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-transform ${isSelected ? 'translate-x-0.5 text-blue-500' : ''}`} />
                      </div>
                    </div>
                  );
                })}
                {filteredApps.length > displayLimit && (
                  <button
                    onClick={() => setDisplayLimit(prev => prev + 50)}
                    className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 mt-2"
                  >
                    Load More Apps ({filteredApps.length - displayLimit} remaining)
                  </button>
                )}
              </>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-3 mt-1.5 flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            <span>💡 Double-click an app to edit instantly</span>
            <span className="bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded">Console Ver 1.4</span>
          </div>

        </div>

        {/* Right Column - Inspector Panel or Editing Drawer Form */}
        <div className={`${(editingAppId !== null || selectedAppId) ? 'fixed inset-0 z-[999999] h-[100dvh] w-full flex lg:relative lg:inset-auto lg:z-auto lg:col-span-8 xl:col-span-8 lg:min-h-[780px] lg:max-h-[85vh] lg:h-[780px]' : 'hidden lg:flex lg:min-h-[780px] lg:col-span-8 xl:col-span-8 h-[500px]'} bg-white dark:bg-slate-900 border-0 lg:border border-slate-200/80 dark:border-slate-800 flex-col overflow-hidden shadow-2xl lg:shadow-sm rounded-none lg:rounded-2xl`}>
          {editingAppId !== null ? (
            <AppForm 
              editingAppId={editingAppId}
              formFields={formFields}
              activeFormTab={activeFormTab}
              setActiveFormTab={setActiveFormTab}
              handleFieldChange={handleFieldChange}
              handleSaveApp={handleSaveApp}
              handleQuickClean={handleQuickClean}
              setEditingAppId={setEditingAppId}
              categories={categories}
              saving={saving}
            />
          ) : (
            <AppInspector 
              selectedApp={selectedApp}
              setSelectedAppId={setSelectedAppId}
              setEditingAppId={setEditingAppId}
              setActiveFormTab={setActiveFormTab}
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
