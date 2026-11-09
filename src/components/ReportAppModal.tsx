import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Flag, X, Check } from 'lucide-react';
import { submitLiveReport } from '../lib/communityFirebase';

interface ReportAppModalProps {
  app: {
    id: string;
    name: string;
    slug?: string;
  };
  onClose: () => void;
}

export const ReportAppModal: React.FC<ReportAppModalProps> = ({ app, onClose }) => {
  const [reason, setReason] = useState('harmful');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Prevent scroll and listen for Escape key when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await submitLiveReport({
        type: 'app_flag',
        appId: app.id || app.slug || 'unknown',
        appName: app.name,
        reason: reason,
        description: comment
      });
    } catch (err) {
      console.error('Error submitting report:', err);
    } finally {
      setSubmitting(false);
      setSubmitted(true);
      if (window.navigator && window.navigator.vibrate) {
        try {
          window.navigator.vibrate([30, 50, 30]);
        } catch (_) {}
      }
    }
  };

  const modalNode = (
    <div 
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-app-modal-title"
    >
      <div
        className="bg-white dark:bg-zinc-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl border-t sm:border border-black/5 dark:border-white/10 flex flex-col max-h-[90vh] sm:max-h-none animate-in slide-in-from-bottom-4 duration-200 pb-[env(safe-area-inset-bottom,0px)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Bottom-Sheet Handle Bar */}
        <div className="w-10 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" aria-hidden="true" />

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3.5 sm:py-4 border-b border-black/5 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500 shrink-0">
              <Flag className="w-4 h-4 fill-current" />
            </div>
            <div className="min-w-0">
              <h3 id="report-app-modal-title" className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white leading-tight">
                Flag as inappropriate
              </h3>
              <p className="text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-[210px] sm:max-w-[260px]">
                App: {app.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 inline-flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Wrapper */}
        <div className="p-5 overflow-y-auto max-h-[65vh] sm:max-h-[70vh] no-scrollbar">
          {submitted ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 stroke-[2.5px]" />
              </div>
              <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-2">
                Report Submitted
              </h4>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 max-w-sm mx-auto font-medium">
                Thank you for helping us keep our community safe. Our verification team will review {app.name} and take appropriate action shortly.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto min-h-[44px] px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Select why this application violates community guidelines or safety standards.
              </p>

              {/* Reasons */}
              <div className="space-y-2">
                {[
                  { id: 'harmful', label: 'Safety issue or malicious software' },
                  { id: 'spam', label: 'Spam, fake, or misleading metadata' },
                  { id: 'intellectual', label: 'Intellectual property or brand violation' },
                  { id: 'other', label: 'Other safety or policy concern' }
                ].map((option) => {
                  const selected = reason === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs sm:text-[13px] font-semibold transition-all cursor-pointer select-none min-h-[50px] ${
                        selected
                          ? 'border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400 shadow-2xs'
                          : 'border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <span className="flex-1 pr-2">{option.label}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        selected ? 'border-blue-500 bg-blue-500' : 'border-zinc-300 dark:border-zinc-600'
                      }`}>
                        {selected && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <input
                        type="radio"
                        name="report_reason"
                        value={option.id}
                        checked={selected}
                        onChange={() => setReason(option.id)}
                        className="sr-only"
                      />
                    </label>
                  );
                })}
              </div>

              {/* Comment Textarea */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="report-app-details" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Additional details (optional)
                  </label>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium tabular-nums">
                    {comment.length}/500
                  </span>
                </div>
                <textarea
                  id="report-app-details"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Provide specific details to help our moderators review this application..."
                  rows={3}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 rounded-xl p-3 text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none resize-none transition-all"
                  maxLength={500}
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 min-h-[44px] py-2.5 text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 min-h-[44px] py-2.5 text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-500/50 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Flag className="w-3.5 h-3.5" />
                      <span>Submit Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalNode, document.body);
  }
  return modalNode;
};


export default ReportAppModal;

