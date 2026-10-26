import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import ImageUpload from '../ImageUpload';

interface AdminDevelopersTabProps {
  developersList: any[];
  handleAddDeveloper: () => void;
  handleRemoveDeveloper: (index: number) => void;
  handleDeveloperChange: (index: number, field: string, value: any) => void;
  handleSaveDevelopers: (e: React.FormEvent) => void;
  saving: boolean;
}

export const AdminDevelopersTab: React.FC<AdminDevelopersTabProps> = ({
  developersList,
  handleAddDeveloper,
  handleRemoveDeveloper,
  handleDeveloperChange,
  handleSaveDevelopers,
  saving,
}) => {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Developers Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure profile details of developers on the team page.</p>
        </div>
        <button 
          type="button"
          onClick={handleAddDeveloper} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold text-xs transition-all cursor-pointer border-0 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Developer
        </button>
      </div>
      
      <form onSubmit={handleSaveDevelopers} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {developersList.map((dev: any, index: number) => (
            <div key={`developer-${index}`} className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-5 shadow-sm relative animate-fade-in">
              <button
                type="button"
                onClick={() => handleRemoveDeveloper(index)}
                className="absolute top-4 right-4 text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg hover:bg-rose-500 hover:text-white transition-all border border-rose-100 dark:border-rose-900/30 cursor-pointer z-10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Name</label>
                  <input required type="text" value={dev.name} onChange={(e) => handleDeveloperChange(index, 'name', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Role</label>
                  <input required type="text" value={dev.role} onChange={(e) => handleDeveloperChange(index, 'role', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Image URL (Avatar)</label>
                  <ImageUpload value={dev.image_url} onChange={(val) => handleDeveloperChange(index, 'image_url', val)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">GitHub URL (Optional)</label>
                  <input type="text" value={dev.github} onChange={(e) => handleDeveloperChange(index, 'github', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Twitter URL (Optional)</label>
                  <input type="text" value={dev.twitter} onChange={(e) => handleDeveloperChange(index, 'twitter', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Bio (Optional)</label>
                  <textarea rows={2} value={dev.bio} onChange={(e) => handleDeveloperChange(index, 'bio', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 resize-none"></textarea>
                </div>
              </div>
            </div>
          ))}
          {developersList.length === 0 && (
            <div className="col-span-1 md:col-span-2 text-center py-12 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl font-medium italic text-sm">
              No developers added yet.
            </div>
          )}
        </div>
        
        <button type="submit" disabled={saving} className="min-h-[46px] px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm tracking-wide rounded-xl shadow-sm transition-all cursor-pointer border-0 ml-auto block">
          Sync Developers to Live
        </button>
      </form>
    </div>
  );
};
