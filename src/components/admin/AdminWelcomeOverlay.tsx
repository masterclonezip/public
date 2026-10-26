import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Sparkles, Crown, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

interface AdminWelcomeOverlayProps {
  onComplete?: () => void;
  siteTitle?: string;
  adminName?: string;
}

export const AdminWelcomeOverlay: React.FC<AdminWelcomeOverlayProps> = ({
  onComplete,
  siteTitle = 'MasterWorld',
  adminName = 'Boss'
}) => {
  const [stage, setStage] = useState<number>(0); // 0: initial, 1: welcome boss, 2: to masterworld, 3: finishing
  const [isVisible, setIsVisible] = useState<boolean>(true);

  useEffect(() => {
    // Stage sequence
    const timer1 = setTimeout(() => setStage(1), 100);
    const timer2 = setTimeout(() => setStage(2), 1400);
    const timer3 = setTimeout(() => setStage(3), 3200);
    const timerEnd = setTimeout(() => {
      handleDismiss();
    }, 4000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timerEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 500);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="admin-welcome-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          onClick={handleDismiss}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden cursor-pointer select-none bg-slate-950/70 backdrop-blur-xl"
          style={{ willChange: 'opacity, transform' }}
        >
          {/* Ambient Lighting & Glow Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.25, 0.4, 0.25],
                rotate: [0, 90, 180]
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] bg-gradient-to-tr from-blue-600/30 via-indigo-500/25 to-amber-500/20 rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                scale: [1.1, 0.9, 1.1],
                opacity: [0.2, 0.35, 0.2],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] sm:w-[420px] h-[260px] sm:h-[420px] bg-cyan-500/20 rounded-full blur-2xl"
            />
          </div>

          {/* Center Card with Glassmorphism */}
          <motion.div
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: -16, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg p-6 sm:p-10 rounded-3xl bg-slate-900/80 border border-slate-700/60 shadow-2xl shadow-blue-950/50 backdrop-blur-2xl text-center text-white overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Subtle Light Reflection Line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

            {/* Top Badge: System Status */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-400 text-xs font-semibold tracking-wider uppercase mb-6 shadow-sm"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Masterworld Control</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </motion.div>

            {/* Stage 1: Welcome Back, Boss */}
            <div className="min-h-[110px] sm:min-h-[130px] flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                {stage >= 1 && (
                  <motion.div
                    key="stage-1"
                    initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-300">
                      Welcome back,
                    </span>
                    <motion.div
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.6, type: 'spring', stiffness: 200 }}
                      className="flex items-center gap-2"
                    >
                      <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow-sm">
                        {adminName}
                      </h1>
                      <Sparkles className="w-6 h-6 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stage 2: to Masterworld Admin Panel */}
              <AnimatePresence>
                {stage >= 2 && (
                  <motion.div
                    key="stage-2"
                    initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
                    className="mt-3 flex items-center justify-center gap-2 text-base sm:text-xl font-semibold text-blue-300/90"
                  >
                    <span className="text-slate-400 font-normal">to</span>
                    <span className="font-bold text-white tracking-wide underline decoration-blue-500/50 underline-offset-4">
                      {siteTitle} Admin Panel
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Stage 3: Security & Session Status Pill */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: stage >= 2 ? 1 : 0, scale: stage >= 2 ? 1 : 0.95 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 font-medium"
            >
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Session Verified</span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1.5 text-blue-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Secure Vault Active</span>
              </div>
            </motion.div>

            {/* Interactive Skip / Enter Action */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
            >
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-blue-600/30 active:scale-95 cursor-pointer border-0"
              >
                <span>Enter Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>

            {/* Countdown / Progress bar */}
            <div className="mt-5 w-full bg-slate-800/60 h-1 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3.8, ease: 'linear' }}
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-amber-400 rounded-full"
              />
            </div>

            <p className="mt-2 text-[10px] text-slate-500 font-medium">
              Click anywhere or press <kbd className="px-1 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700 text-[9px]">ESC</kbd> to skip
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
