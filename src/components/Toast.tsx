import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

type ToastListener = (toast: ToastMessage) => void;
const listeners = new Set<ToastListener>();

export const toast = (message: string, type: ToastType = 'success') => {
  const id = Math.random().toString(36).substr(2, 9);
  const newToast = { id, message, type };
  listeners.forEach(listener => listener(newToast));
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleAdd = (newToast: ToastMessage) => {
      setToasts(prev => [...prev, newToast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 5000);
    };

    listeners.add(handleAdd);
    return () => {
      listeners.delete(handleAdd);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-4 inset-x-4 sm:inset-x-auto sm:top-auto sm:bottom-6 sm:right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none items-center sm:items-end">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl shadow-xl border backdrop-blur-md text-xs sm:text-sm font-semibold w-full sm:w-auto sm:min-w-[320px] sm:max-w-md ${
              t.type === 'success'
                ? 'bg-white/95 dark:bg-slate-900/95 border-emerald-300 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200'
                : t.type === 'error'
                ? 'bg-white/95 dark:bg-slate-900/95 border-rose-300 dark:border-rose-800/60 text-rose-950 dark:text-rose-200'
                : 'bg-white/95 dark:bg-slate-900/95 border-blue-300 dark:border-blue-800/60 text-blue-950 dark:text-blue-200'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            </div>
            <div className="flex-1 max-h-36 overflow-y-auto leading-snug break-words">
              {t.message}
            </div>
            <button 
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
