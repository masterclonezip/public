import React from 'react';
import { Plus, Edit3, X, Star, RefreshCw, CheckCircle2 } from 'lucide-react';
import { ReviewData } from '../AdminReviewsTab';

interface EditReviewModalProps {
  editModalReview: Partial<ReviewData> | null;
  setEditModalReview: (rev: Partial<ReviewData> | null) => void;
  isAddMode: boolean;
  appsList: any[];
  actioningId: string | null;
  onSave: (e: React.FormEvent) => void;
}

export const EditReviewModal: React.FC<EditReviewModalProps> = ({
  editModalReview,
  setEditModalReview,
  isAddMode,
  appsList,
  actioningId,
  onSave
}) => {
  if (!editModalReview) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
              {isAddMode ? <Plus className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isAddMode ? 'Create New Player Review' : 'Edit Review & Details'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Changes save directly to Firestore and auto-recalculate star distributions.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setEditModalReview(null)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSave} className="p-6 overflow-y-auto space-y-4">
          
          {/* App Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Target Application *
            </label>
            <select
              value={(() => {
                const curId = (editModalReview.appId || '').toLowerCase().trim();
                const curSlug = (editModalReview.appSlug || '').toLowerCase().trim();
                const hit = appsList.find(a => 
                  (a.id && String(a.id).toLowerCase() === curId) ||
                  (a.slug && String(a.slug).toLowerCase() === curSlug) ||
                  (a.slug && String(a.slug).toLowerCase() === curId) ||
                  (a.id && String(a.id).toLowerCase() === curSlug)
                );
                return hit ? (hit.slug || hit.id) : (editModalReview.appSlug || editModalReview.appId || '');
              })()}
              onChange={(e) => {
                const chosenKey = e.target.value;
                const chosenApp = appsList.find(a => 
                  String(a.slug || '').toLowerCase() === chosenKey.toLowerCase() || 
                  String(a.id || '').toLowerCase() === chosenKey.toLowerCase()
                );
                setEditModalReview({ 
                  ...editModalReview, 
                  appId: chosenApp?.id || chosenKey,
                  appSlug: chosenApp?.slug || chosenKey,
                  appName: chosenApp?.name || editModalReview.appName || ''
                });
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              required
            >
              <option value="" disabled>Select an Application</option>
              {appsList.map((app) => (
                <option key={app.id || app.slug} value={app.slug || app.id}>
                  {app.name} ({app.slug || app.id})
                </option>
              ))}
            </select>
          </div>

          {/* Author & Rating in row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Player / Author Name *
              </label>
              <input
                type="text"
                value={editModalReview.userName || ''}
                onChange={(e) => setEditModalReview({ ...editModalReview, userName: e.target.value })}
                placeholder="e.g. Rahul_Gamer"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Star Rating (1 - 5) *
              </label>
              <div className="flex items-center gap-1 py-1">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    type="button"
                    key={num}
                    onClick={() => setEditModalReview({ ...editModalReview, rating: num })}
                    className="p-1 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        num <= (editModalReview.rating || 5)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs font-black text-amber-500">
                  {editModalReview.rating || 5} Stars
                </span>
              </div>
            </div>
          </div>

          {/* Review Comment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Review Comment *
            </label>
            <textarea
              rows={4}
              value={editModalReview.reviewText || ''}
              onChange={(e) => setEditModalReview({ ...editModalReview, reviewText: e.target.value })}
              placeholder="Detailed feedback regarding gameplay, graphics, withdrawal, customer support..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Status, Pinned & Helpful Votes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={editModalReview.status || 'published'}
                onChange={(e) => setEditModalReview({ ...editModalReview, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
              >
                <option value="published">✅ Published</option>
                <option value="pending">⏳ Pending</option>
                <option value="rejected">❌ Hidden</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Helpful Votes
              </label>
              <input
                type="number"
                min="0"
                value={editModalReview.helpful_count ?? 0}
                onChange={(e) => setEditModalReview({ ...editModalReview, helpful_count: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="modal_pinned"
                checked={Boolean(editModalReview.isPinned)}
                onChange={(e) => setEditModalReview({ ...editModalReview, isPinned: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
              <label htmlFor="modal_pinned" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                Pin Review to Top
              </label>
            </div>
          </div>

          {/* Modal Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditModalReview(null)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actioningId === 'modal_save'}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/25 transition-all active:scale-95 cursor-pointer uppercase tracking-wider flex items-center gap-2"
            >
              {actioningId === 'modal_save' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isAddMode ? 'Create Review' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
