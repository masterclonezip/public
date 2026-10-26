import React from 'react';
import { CornerDownRight, X } from 'lucide-react';
import { ReviewData } from '../AdminReviewsTab';

interface ReplyReviewModalProps {
  replyModalReview: ReviewData | null;
  setReplyModalReview: (rev: ReviewData | null) => void;
  replyAuthor: string;
  setReplyAuthor: (author: string) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  onSaveReply: () => void;
}

export const ReplyReviewModal: React.FC<ReplyReviewModalProps> = ({
  replyModalReview,
  setReplyModalReview,
  replyAuthor,
  setReplyAuthor,
  replyText,
  setReplyText,
  onSaveReply
}) => {
  if (!replyModalReview) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
              <CornerDownRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Official Admin / Developer Reply
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Replying to {replyModalReview.userName} on {replyModalReview.appId}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setReplyModalReview(null)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-xs text-slate-600 dark:text-slate-300 italic">
            "{replyModalReview.reviewText}"
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Responder Name / Title
            </label>
            <input
              type="text"
              value={replyAuthor}
              onChange={(e) => setReplyAuthor(e.target.value)}
              placeholder="e.g. Official Support or Developer Team"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Official Reply Message
            </label>
            <textarea
              rows={4}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Thank you for your valuable feedback! We have updated the latest version to address this..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">Leave empty to remove existing official reply.</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setReplyModalReview(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveReply}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/25 transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
            >
              Publish Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
