import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface AdminQuickLinksTabProps {
  quickLinksList: any[];
  handleAddQuickLink: () => void;
  handleRemoveQuickLink: (index: number) => void;
  handleQuickLinkChange: (index: number, field: string, value: any) => void;
  handleSaveQuickLinks: (e: React.FormEvent) => void;
  saving: boolean;
}

export const AdminQuickLinksTab: React.FC<AdminQuickLinksTabProps> = ({
  quickLinksList,
  handleAddQuickLink,
  handleRemoveQuickLink,
  handleQuickLinkChange,
  handleSaveQuickLinks,
  saving,
}) => {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Navigation Hub Links</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure quick navigation links shown in the user dashboard.</p>
        </div>
        <button 
          type="button"
          onClick={handleAddQuickLink} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold text-xs transition-all cursor-pointer border-0 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Link
        </button>
      </div>
      
      <form onSubmit={handleSaveQuickLinks} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickLinksList.map((link: any, index: number) => (
            <div key={`quick-link-${index}`} className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-5 shadow-sm relative">
              <button
                type="button"
                onClick={() => handleRemoveQuickLink(index)}
                className="absolute top-4 right-4 text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg hover:bg-rose-500 hover:text-white transition-all border border-rose-100 dark:border-rose-900/30 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Title</label>
                  <input required type="text" value={link.title} onChange={(e) => handleQuickLinkChange(index, 'title', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Subtitle</label>
                  <input required type="text" value={link.subtitle} onChange={(e) => handleQuickLinkChange(index, 'subtitle', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">URL Path</label>
                    <input required type="text" value={link.url} onChange={(e) => handleQuickLinkChange(index, 'url', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Color Variant</label>
                    <select value={link.color} onChange={(e) => handleQuickLinkChange(index, 'color', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500">
                      <option value="blue">Blue</option>
                      <option value="emerald">Emerald</option>
                      <option value="amber">Amber</option>
                      <option value="rose">Rose</option>
                      <option value="purple">Purple</option>
                    </select>
                  </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Icon Name</label>
                    <select value={link.icon} onChange={(e) => handleQuickLinkChange(index, 'icon', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500">
                      <option value="compass">Compass (Explore)</option>
                      <option value="newspaper">Newspaper (News)</option>
                      <option value="video">Video (Media)</option>
                      <option value="book-open">Book Open (Guides)</option>
                    </select>
                </div>
              </div>
            </div>
          ))}
          {quickLinksList.length === 0 && (
            <div className="col-span-1 md:col-span-2 text-center py-12 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl font-medium italic text-sm">
              No quick links added yet.
            </div>
          )}
        </div>
        
        <button type="submit" disabled={saving} className="min-h-[46px] px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm tracking-wide rounded-xl shadow-sm transition-all cursor-pointer border-0 ml-auto block">
          Sync Links to Live
        </button>
      </form>
    </div>
  );
};
