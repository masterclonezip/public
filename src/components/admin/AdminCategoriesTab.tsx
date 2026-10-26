import React from 'react';
import { LayoutDashboard, Trash2, Save } from 'lucide-react';

interface AdminCategoriesTabProps {
  categoriesList: string[];
  setCategoriesList?: (cats: string[]) => void;
  newCatInput: string;
  setNewCatInput: (val: string) => void;
  handleAddCategory?: () => void;
  addCategory?: () => void;
  handleRemoveCategory?: (cat: string) => void;
  removeCategory?: (cat: string) => void;
  handleSaveCategories: (e: React.FormEvent) => void;
  saving: boolean;
}

export const AdminCategoriesTab = React.memo(({
  categoriesList,
  newCatInput,
  setNewCatInput,
  handleAddCategory,
  addCategory,
  handleRemoveCategory,
  removeCategory,
  handleSaveCategories,
  saving
}: AdminCategoriesTabProps) => {
  const onAdd = handleAddCategory || addCategory || (() => {});
  const onRemove = handleRemoveCategory || removeCategory || (() => {});

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl border border-black/10 dark:border-white/10 shadow-sm">
        <div>
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-blue-500" /> Manage Global Categories
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Add or remove categories for your applications.</p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSaveCategories} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Available Categories</label>
            <div className="flex flex-wrap gap-2 mb-6">
              {categoriesList.map((cat: string, index: number) => (
                <div key={index} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700">
                  <span>{cat}</span>
                  <button type="button" onClick={() => onRemove(cat)} className="text-slate-400 hover:text-rose-500 transition-colors focus:outline-none">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {categoriesList.length === 0 && <span className="text-sm text-slate-500 italic">No categories added yet.</span>}
            </div>
            
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Add New Category</label>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="e.g., Finance, Gaming, Utilities"
              />
              <button 
                type="button" 
                onClick={onAdd}
                className="px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
              >
                Add
              </button>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="submit" disabled={saving} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all flex items-center gap-2 shadow-sm disabled:opacity-50">
              {saving ? 'Saving...' : <><Save className="w-4 h-4"/> Save Categories</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

AdminCategoriesTab.displayName = 'AdminCategoriesTab';

export default AdminCategoriesTab;
