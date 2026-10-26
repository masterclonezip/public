import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface AdminWebsiteFaqsTabProps {
  websiteFaqsList: any[];
  handleAddWebsiteFaq: () => void;
  handleRemoveWebsiteFaq: (index: number) => void;
  handleWebsiteFaqChange: (index: number, field: string, value: any) => void;
  handleSaveWebsiteFaqs: (e: React.FormEvent) => void;
  saving: boolean;
}

export const AdminWebsiteFaqsTab: React.FC<AdminWebsiteFaqsTabProps> = ({
  websiteFaqsList,
  handleAddWebsiteFaq,
  handleRemoveWebsiteFaq,
  handleWebsiteFaqChange,
  handleSaveWebsiteFaqs,
  saving,
}) => {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Website FAQs Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Add, update, or remove Frequently Asked Questions on the homepage.</p>
        </div>
        <button 
          type="button"
          onClick={handleAddWebsiteFaq} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold text-xs transition-all cursor-pointer border-0 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add FAQ
        </button>
      </div>
      
      <form onSubmit={handleSaveWebsiteFaqs} className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {websiteFaqsList.map((faq: any, index: number) => (
            <div key={`website-faq-${index}`} className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-5 shadow-sm relative animate-fade-in">
              <button
                type="button"
                onClick={() => handleRemoveWebsiteFaq(index)}
                className="absolute top-4 right-4 text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg hover:bg-rose-500 hover:text-white transition-all border border-rose-100 dark:border-rose-900/30 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Question</label>
                  <input required type="text" value={faq.question} onChange={(e) => handleWebsiteFaqChange(index, 'question', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Answer</label>
                  <textarea required rows={3} value={faq.answer} onChange={(e) => handleWebsiteFaqChange(index, 'answer', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 resize-none"></textarea>
                </div>
              </div>
            </div>
          ))}
          {websiteFaqsList.length === 0 && (
            <div className="col-span-1 text-center py-12 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl font-medium italic text-sm">
              No website FAQs added yet.
            </div>
          )}
        </div>
        
        <button type="submit" disabled={saving} className="min-h-[46px] px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm tracking-wide rounded-xl shadow-sm transition-all cursor-pointer border-0 ml-auto block">
          Sync FAQs to Live
        </button>
      </form>
    </div>
  );
};
