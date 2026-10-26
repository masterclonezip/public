import React from 'react';
import { LayoutDashboard, Plus, Trash2, Save, Eraser, CheckCircle2 } from 'lucide-react';
import ImageUpload from '../ImageUpload';

interface AdminBannersTabProps {
  banners: any[];
  handleAddBanner: () => void;
  handleRemoveBanner?: (index: number) => void;
  handleDeleteBanner?: (id: string) => void;
  handleClearAllBanners?: () => void;
  handleUpdateBanner?: (index: number, field: string, value: any) => void;
  handleBannerChange?: (id: string, field: string, value: any) => void;
  handleSaveBanners?: (e: React.FormEvent) => void;
  saving: boolean;
  setSaving?: (saving: boolean) => void;
  appsList?: any[];
  newsList?: any[];
  saveSettings?: (settings: any) => Promise<void>;
  settings?: any;
  triggerHaptic?: () => void;
  toast?: (msg: string, type?: string) => void;
}

export const AdminBannersTab = React.memo(({
  banners,
  handleAddBanner,
  handleRemoveBanner,
  handleDeleteBanner,
  handleClearAllBanners,
  handleUpdateBanner,
  handleBannerChange,
  handleSaveBanners,
  saving,
  setSaving,
  saveSettings,
  settings,
  triggerHaptic,
  toast
}: AdminBannersTabProps) => {
  const onRemove = (index: number, id: string) => {
    if (handleDeleteBanner && id) {
      handleDeleteBanner(id);
    } else if (handleRemoveBanner) {
      handleRemoveBanner(index);
    }
  };

  const onClearAll = () => {
    if (window.confirm('Are you sure you want to remove ALL banners? After clearing, click "Save Changes" to apply.')) {
      if (handleClearAllBanners) {
        handleClearAllBanners();
      } else if (handleRemoveBanner) {
        // Fallback: remove backwards
        for (let i = banners.length - 1; i >= 0; i--) {
          const b = banners[i];
          if (handleDeleteBanner && b?.id) handleDeleteBanner(b.id);
          else if (handleRemoveBanner) handleRemoveBanner(i);
        }
      }
      if (toast) toast('All banners cleared from workspace. Click "Save Changes" to persist.', 'info');
    }
  };

  const onUpdate = (index: number, id: string, field: string, value: any) => {
    if (handleBannerChange && id) {
      handleBannerChange(id, field, value);
    } else if (handleUpdateBanner) {
      handleUpdateBanner(index, field, value);
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e?.preventDefault?.();
    if (handleSaveBanners) {
      handleSaveBanners(e);
    } else if (saveSettings && settings) {
      if (setSaving) setSaving(true);
      await saveSettings({ ...settings, banners });
      if (triggerHaptic) triggerHaptic();
      if (setSaving) setSaving(false);
      if (toast) toast(banners.length === 0 ? 'Banners cleared and disabled on website.' : 'Banners Synced to Frontend System.', 'success');
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-black/10 dark:border-white/10 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-blue-500" /> Home Page Banners
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              banners.length > 0 
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800' 
                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
            }`}>
              {banners.length > 0 ? `${banners.length} Active` : '0 Active (Hidden)'}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage promotional hero banners on the homepage. Remove all banners to completely hide the top banner carousel.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          {banners.length > 0 && (
            <button 
              type="button"
              onClick={onClearAll} 
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Eraser className="w-3.5 h-3.5"/> Remove All
            </button>
          )}
          
          <button 
            type="button"
            onClick={handleAddBanner} 
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-white transition-colors cursor-pointer border-0"
          >
            <Plus className="w-4 h-4"/> Add Banner
          </button>

          <button 
            type="button"
            onClick={onSave} 
            disabled={saving} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer border-0 uppercase tracking-wider"
          >
            {saving ? (
              'Saving...'
            ) : (
              <>
                <Save className="w-3.5 h-3.5"/> 
                {banners.length === 0 ? 'Save Changes (No Banners)' : `Save Changes (${banners.length})`}
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Banner Cards List */}
      <div className="grid gap-6">
        {banners.length === 0 ? (
          <div className="text-center py-12 px-6 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center border border-amber-200 dark:border-amber-800/60">
              <LayoutDashboard className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                No Banners Configured
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The public homepage will cleanly render without any top hero banner. Click <strong>"Save Changes"</strong> to apply this setting, or click <strong>"Add Banner"</strong> to create a new banner.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddBanner}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer border-0"
              >
                <Plus className="w-4 h-4" /> Add A Banner
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer border-0"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {saving ? 'Saving...' : 'Save "No Banners" State'}
              </button>
            </div>
          </div>
        ) : (
          banners.map((banner: any, index: number) => (
            <div key={banner.id || index} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black">
                    {index + 1}
                  </span>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {banner.title || `Banner #${index + 1}`}
                  </h4>
                </div>
                <button 
                  type="button"
                  onClick={() => onRemove(index, banner.id)} 
                  className="flex items-center gap-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 bg-transparent"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>

              {/* Title and Subtitle inputs */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Banner Heading / Title
                  </label>
                  <input 
                    type="text" 
                    value={banner.title || ''} 
                    onChange={(e) => onUpdate(index, banner.id, 'title', e.target.value)} 
                    placeholder="e.g. Featured Rummy App of the Week" 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Subtitle / Tagline
                  </label>
                  <input 
                    type="text" 
                    value={banner.subtitle || ''} 
                    onChange={(e) => onUpdate(index, banner.id, 'subtitle', e.target.value)} 
                    placeholder="e.g. Get ₹51 Instant Bonus with Fast Withdrawals" 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" 
                  />
                </div>
              </div>

              {/* Image & Target Link */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Banner Image (Recommended: 800x400)
                  </label>
                  <ImageUpload 
                    value={banner.image_url || banner.image} 
                    onChange={(val) => onUpdate(index, banner.id, banner.image_url !== undefined ? 'image_url' : 'image', val)} 
                    placeholder="Image URL or Upload" 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Target App or Redirect Link
                  </label>
                  <input 
                    type="text" 
                    value={banner.link || ''} 
                    onChange={(e) => onUpdate(index, banner.id, 'link', e.target.value)} 
                    placeholder="e.g. /app/rummy-wealth or https://..." 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" 
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Bottom Save bar */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {banners.length === 0 ? 'No banners active. Public site will display without banner section.' : `${banners.length} banner(s) ready to sync.`}
        </span>
        <button 
          type="button"
          onClick={onSave} 
          disabled={saving} 
          className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer border-0 text-xs uppercase tracking-wider"
        >
          {saving ? 'Saving...' : <><Save className="w-4 h-4"/> {banners.length === 0 ? 'Save Changes (Hide Banners)' : 'Save Banners'}</>}
        </button>
      </div>
    </div>
  );
});

AdminBannersTab.displayName = 'AdminBannersTab';

export default AdminBannersTab;
