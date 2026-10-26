import React, { useState, useEffect } from 'react';
import { 
  Edit2, 
  Trash2, 
  Compass, 
  AlertTriangle, 
  Sparkles, 
  MessageSquare,
  LayoutDashboard,
  Star,
  Globe,
  Lock,
  ExternalLink,
  FileDown,
  Loader2
} from 'lucide-react';
import { safeHtml } from '../../../lib/safeHtml';
import { exportAppToPdf } from '../../../lib/appPdfExport';
import { getCachedLiveAppStats } from '../../../lib/communityFirebase';

interface AppInspectorProps {
  selectedApp: any;
  setSelectedAppId: (id: string | null) => void;
  setEditingAppId: (id: string | null) => void;
  setActiveFormTab: (tab: any) => void;
  handleDeleteApp: (id: string) => void;
  handleTogglePublicSync?: (id: string) => Promise<void> | void;
}

export const AppInspector = ({ 
  selectedApp, 
  setSelectedAppId, 
  setEditingAppId, 
  setActiveFormTab, 
  handleDeleteApp,
  handleTogglePublicSync
}: AppInspectorProps) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [liveStats, setLiveStats] = useState<{ averageRating: number; totalReviews: number } | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    if (!selectedApp || isExportingPdf) return;
    try {
      setIsExportingPdf(true);
      await exportAppToPdf(selectedApp);
    } catch (err) {
      console.error('[AppInspector] PDF export error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  useEffect(() => {
    if (selectedApp?.id) {
      setLiveStats(null);
      // Fast instantaneous read from local atomic cache
      const cached = getCachedLiveAppStats(selectedApp.id, selectedApp.slug);
      if (cached && Number(cached.totalReviews) > 0) {
        setLiveStats({
          averageRating: Number(cached.averageRating) || 4.5,
          totalReviews: Number(cached.totalReviews) || 0
        });
      }

      fetch(`/api/v1/public/community/stats/${encodeURIComponent(selectedApp.id)}`)
        .then(async res => {
          const cType = res.headers.get('content-type') || '';
          if (res.ok && cType.includes('application/json')) {
            return res.json();
          }
          return null;
        })
        .then(data => {
          if (data && data.success && data.stats) {
            setLiveStats(data.stats);
          }
        })
        .catch(err => console.error("Error fetching live stats for inspector:", err));
    }
  }, [selectedApp?.id, selectedApp?.slug]);

  if (!selectedApp) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-8 text-center bg-slate-50/50 dark:bg-slate-900/10">
        <LayoutDashboard className="w-14 h-14 text-slate-300 dark:text-slate-700 animate-pulse mb-3" />
        <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Select an App</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mt-1">
          Select an application from the list to view its details or edit configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Selected App Header panel */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-start gap-4 shrink-0">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <button 
            type="button"
            onClick={() => setSelectedAppId(null)} 
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border-0 cursor-pointer"
          >
            ← Back to List
          </button>
        </div>
        <div className="flex items-start gap-4 w-full">
          <img 
            src={selectedApp.icon_url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=128&h=128&fit=crop'} 
            loading="lazy"
            width={64}
            height={64}
            className="w-16 h-16 object-cover rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800 bg-slate-100" 
            alt="" 
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-sm">
                {selectedApp.name}
              </h3>
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                Order #{selectedApp.serial_number || 0}
              </span>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Folder: <span className="text-blue-500 dark:text-blue-400 font-semibold">{selectedApp.category}</span>
            </p>

            <div className="flex flex-wrap gap-2 mt-2">
              <button 
                type="button"
                onClick={() => {
                  setEditingAppId(selectedApp.id);
                  setActiveFormTab('general');
                }}
                className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/40 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Configuration
              </button>
              {handleTogglePublicSync && (
                <button 
                  type="button"
                  onClick={() => handleTogglePublicSync(selectedApp.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                    selectedApp.sync_to_public !== false 
                      ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  }`}
                  title={selectedApp.sync_to_public !== false ? "Click to set this app to Admin Only (unsynced from public)" : "Click to publish this app to public website"}
                >
                  {selectedApp.sync_to_public !== false ? <Globe className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
                  <span>{selectedApp.sync_to_public !== false ? 'Live on Web' : 'Admin Only (Draft)'}</span>
                </button>
              )}
              <button 
                type="button"
                onClick={() => handleDeleteApp(selectedApp.id)}
                className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200/40 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button 
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-xs disabled:opacity-50"
                title="Download complete app spec sheet and metadata as a PDF"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                )}
                <span>{isExportingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Selected App Body Panel (Previews & Detailed Metrics) */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 pb-20 space-y-6 custom-scrollbar bg-white dark:bg-slate-900">
        {/* Sync Status Banner */}
        {selectedApp.sync_to_public === false ? (
          <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-xl p-3.5 flex items-start gap-3 shadow-xs">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <div className="font-bold flex items-center gap-1.5">
                Admin Only Mode (Unsynced)
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200/60 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 uppercase font-black tracking-wider">Draft</span>
              </div>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90 mt-1 leading-relaxed">
                This app and all its details stay strictly inside the Admin Panel. When pushing code via GitHub sync, it is completely excluded from the public website, catalog, sitemaps, and search index.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 rounded-xl p-3.5 flex items-start gap-3 shadow-xs">
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-xs text-emerald-800 dark:text-emerald-300">
              <div className="font-bold flex items-center gap-1.5">
                Public Website Sync Active
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200/60 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 uppercase font-black tracking-wider">Live</span>
              </div>
              <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400/90 mt-1 leading-relaxed">
                This app is published. Clicking GitHub Sync pushes this app directly to the public website, catalog, and sitemaps.
              </p>
            </div>
          </div>
        )}
        
        {/* Google SERP Preview simulator */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-500" />
            Google SEO Listing Simulation
          </h4>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs max-w-full font-sans">
            <div className="text-[12px] text-slate-500 dark:text-slate-400 font-normal truncate flex items-center gap-1">
              <span>{typeof window !== 'undefined' ? window.location.origin : ((import.meta as any).env?.VITE_PUBLIC_DOMAIN || 'https://example.com')}</span>
              <span className="text-slate-400">› app › {selectedApp.slug || selectedApp.id}</span>
            </div>
            <div className="text-[18px] text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer leading-tight truncate mt-0.5">
              {selectedApp.seo_title || selectedApp.name}
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-zinc-600 dark:text-zinc-400 my-1 font-medium">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                {liveStats ? liveStats.averageRating.toFixed(1) : (selectedApp.rating ? Number(selectedApp.rating).toFixed(1) : '4.8')}
              </span>
              <div className="flex text-[#fbbc04] gap-[1px]">
                {[...Array(5)].map((_, i) => {
                  const ratingVal = liveStats ? liveStats.averageRating : (selectedApp.rating ? Number(selectedApp.rating) : 4.8);
                  return (
                    <Star 
                      key={i} 
                      className={`w-3.5 h-3.5 ${i < Math.round(ratingVal) ? 'fill-current' : 'text-slate-300 dark:text-slate-600'}`} 
                    />
                  );
                })}
              </div>
              <span>({liveStats ? liveStats.totalReviews.toLocaleString() : (selectedApp.review_count ? Number(selectedApp.review_count).toLocaleString() : '0')})</span>
              <span>· Free · Android · Game</span>
            </div>
            <p className="text-[13px] text-slate-600 dark:text-slate-400 font-normal leading-normal mt-1 line-clamp-2">
              {selectedApp.seo_description || `Download ${selectedApp.name} for Android. Fully scanned, verified safe and offline bypass setup complete. Size: ${selectedApp.file_size || 'Unknown'}...`}
            </p>
          </div>
        </div>

        {/* Basic Meta Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rating Score</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 flex items-center gap-1">
              ⭐ {liveStats ? liveStats.averageRating.toFixed(1) : (selectedApp.rating !== undefined ? Number(selectedApp.rating).toFixed(1) : '4.8')} <span className="text-[10px] text-slate-400 font-normal">/ 5</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Ratings</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 flex items-center gap-1">
              👥 {liveStats ? liveStats.totalReviews.toLocaleString() : (selectedApp.review_count ? Number(selectedApp.review_count).toLocaleString() : '0')}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Package Size</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">
              📦 {selectedApp.file_size || 'Unknown'}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">App Version</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 font-mono">
              ℹ️ {selectedApp.version || '1.0'}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Developer</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 truncate" title={selectedApp.developer}>
              💻 {selectedApp.developer || 'Admin'}
            </div>
          </div>
        </div>

        {/* Secure Destination Link & Vault Status */}
        <div className="bg-slate-50/70 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Destination Link / Vault Status</span>
              {selectedApp.more_information_url ? (
                <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Encrypted in Vault
                </span>
              ) : (
                <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  No Link Configured
                </span>
              )}
            </div>
            <div className="mt-1 text-xs font-mono text-slate-700 dark:text-slate-200 truncate">
              {selectedApp.more_information_url || <span className="text-slate-400 italic">None (No clearance redirection)</span>}
            </div>
          </div>
          {selectedApp.more_information_url && (
            <div className="flex items-center gap-2 shrink-0">
              <a 
                href={selectedApp.more_information_url.startsWith('http') ? selectedApp.more_information_url : `https://${selectedApp.more_information_url}`}
                target="_blank"
                rel="noreferrer noopener"
                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                Test Link <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Custom alerts visualization */}
        {(selectedApp.red_box_msg || selectedApp.yellow_box_msg || selectedApp.idea_box_msg) && (
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Live Notification Alerts Previews</h4>
            
            {selectedApp.red_box_msg && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-800 dark:text-rose-300 flex gap-2.5 items-start">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block mb-0.5 text-rose-900 dark:text-rose-400">RED CRITICAL NOTICE</strong>
                  <span className="font-medium">{selectedApp.red_box_msg}</span>
                </div>
              </div>
            )}

            {selectedApp.yellow_box_msg && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex gap-2.5 items-start">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block mb-0.5 text-amber-900 dark:text-amber-400">YELLOW ALERT NOTICE</strong>
                  <span className="font-medium">{selectedApp.yellow_box_msg}</span>
                </div>
              </div>
            )}

            {selectedApp.idea_box_msg && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-800 dark:text-emerald-300 flex gap-2.5 items-start">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block mb-0.5 text-emerald-900 dark:text-emerald-400">GREEN RECOMMENDATION TIP</strong>
                  <span className="font-medium">{selectedApp.idea_box_msg}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEO Keywords panel */}
        {selectedApp.seo_keywords && (
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">SEO Discovery Tags</h4>
            <div className="flex flex-wrap gap-1.5">
              {selectedApp.seo_keywords.split(',').map((keyword: string, idx: number) => (
                <span key={idx} className="bg-slate-100 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg text-[10px] font-semibold">
                  #{keyword.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description HTML content summary */}
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">HTML Body Length Indicators</h4>
          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <button type="button" onClick={() => { setEditingAppId(selectedApp.id); setActiveFormTab('content'); }} className="bg-slate-50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/80 p-3.5 rounded-xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left w-full">
              <span>Description:</span>
              <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded font-mono font-bold text-slate-500">
                {selectedApp.description_html?.length || 0} chars
              </span>
            </button>
            <button type="button" onClick={() => { setEditingAppId(selectedApp.id); setActiveFormTab('content'); }} className="bg-slate-50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/80 p-3.5 rounded-xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left w-full">
              <span>Features List:</span>
              <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded font-mono font-bold text-slate-500">
                {selectedApp.features_html?.length || 0} chars
              </span>
            </button>
          </div>
        </div>

        {/* Selected App Interactive FAQs preview */}
        {selectedApp.faqs && selectedApp.faqs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              FAQ Items Accordion ({selectedApp.faqs.length})
            </h4>
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {selectedApp.faqs.map((faq: any, idx: number) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="bg-slate-50/20 dark:bg-slate-900/10 text-xs">
                    <button 
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full text-left p-3.5 font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer border-0"
                    >
                      <span>{faq.question}</span>
                      <span className="text-slate-400 font-bold">{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && (
                      <div 
                        className="p-3.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium leading-relaxed border-t border-slate-100 dark:border-slate-800"
                        dangerouslySetInnerHTML={{ __html: safeHtml(faq.answer ) }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
