import React from 'react';
import { Sparkles, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PromotionSection = React.memo(() => {
  return (
    <div className="mx-0 mb-10 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Interactive Feature Showcase Card */}
        <div className="aspect-video rounded-2xl sm:rounded-[24px] overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 border border-black/5 dark:border-white/5 shadow-sm relative group min-h-[200px] w-full flex flex-col justify-between p-6 sm:p-8 text-white">
          <div className="absolute inset-0 bg-radial-at-tr from-blue-500/10 via-transparent to-transparent opacity-80 pointer-events-none" />
          <div className="relative z-10">
            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-bold uppercase tracking-wider text-blue-300 border border-white/10">
              Platform Verification
            </span>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight mt-3 mb-1">
              Real-Time Security & Safety Audits
            </h3>
            <p className="text-zinc-300 text-xs sm:text-sm font-medium leading-relaxed max-w-sm">
              Every application cataloged on our platform undergoes automated hash integrity checks, SHA-256 validation, and safety advisory reviews.
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <Link
              to="/safety"
              className="px-4 py-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-xl text-xs font-semibold backdrop-blur-md border border-white/15 transition-all flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              View Safety Status
            </Link>
          </div>
        </div>

        {/* Secure Access Hub Card */}
        <div className="bg-blue-600 rounded-2xl sm:rounded-[24px] p-6 sm:p-8 flex flex-col justify-between text-white relative overflow-hidden shadow-md group min-h-[200px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
          
          <div className="relative z-10 w-full max-w-[280px]">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">Editor's Choice</h3>
            <p className="text-blue-100 text-xs sm:text-sm font-medium leading-relaxed mb-6">Discover the most innovative and carefully crafted applications curated by our team.</p>
          </div>

          <div className="relative z-10 flex items-center gap-4">
            <Link
              to="/categories"
              className="bg-white text-blue-600 px-6 py-3 rounded-full font-semibold text-xs sm:text-sm shadow-sm hover:bg-blue-50 transition-all active:scale-95 flex items-center gap-2 no-underline"
            >
              <Sparkles className="w-4 h-4" />
              Explore Selection
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
});
