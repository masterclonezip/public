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

  // Prevent scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

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
    >
      <div
        className="bg-white dark:bg-zinc-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl border-t sm:border border-black/5 dark:border-white/10 flex flex-col max-h-[90vh] sm:max-h-none animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-500">
              <Flag className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white leading-tight">
                Flag as inappropriate
              </h3>
              <p className="text-[10px] sm:text-xs font-semibold text-zinc-400 dark:text-zinc-500 truncate max-w-[200px] sm:max-w-[250px]">
                App: {app.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Wrapper */}
        <div className="p-5 overflow-y-auto max-h-[60vh] sm:max-h-[70vh] no-scrollbar">
          {submitted ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Check className="w-7 h-7 stroke-[3px]" />
              </div>
              <h4 className="text-base font-black text-zinc-900 dark:text-white mb-2">
                Report Submitted
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 max-w-sm mx-auto font-medium">
                Thank you for helping us keep our community safe. Our verification team will review {app.name} and take appropriate action shortly.
              </p>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 cursor-pointer uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Please select the reason why this app violates community guidelines or safety standards.
              </p>

              {/* Reasons */}
              <div className="space-y-2">
                {[
                  { id: 'harmful', label: 'Safety issue or malicious software' },
                  { id: 'spam', label: 'Spam, fake, or misleading metadata' },
                  { id: 'intellectual', label: 'Intellectual property or brand violation' },
                  { id: 'other', label: 'Other/safety violation' }
                ].map((option) => {
                  const selected = reason === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex items-center justify-between px-4 py-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none h-[52px] ${
                        selected
                          ? 'border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <span className="flex-1 pr-2 truncate">{option.label}</span>
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
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Provide more specific information to help our moderators review this application..."
                  rows={3}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl p-3 text-xs font-semibold text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none resize-none transition-all"
                  maxLength={500}
                />
                <div className="text-right text-[10px] text-zinc-400 dark:text-zinc-500 font-bold">
                  {comment.length}/500 chars
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-500/50 rounded-xl font-bold text-xs transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Flag className="w-3.5 h-3.5" />
                      Submit Flag
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

