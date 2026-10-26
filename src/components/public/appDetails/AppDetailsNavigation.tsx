import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Newspaper, ArrowRight } from 'lucide-react';

interface AppDetailsNavigationProps {
  appName: string;
  relatedNewsCount: number;
  relatedNewsSlug?: string;
}

export const AppDetailsNavigation: React.FC<AppDetailsNavigationProps> = ({ appName, relatedNewsCount, relatedNewsSlug }) => {
  const newsLink = relatedNewsSlug ? `/news/${encodeURIComponent(relatedNewsSlug)}` : `/news?q=${encodeURIComponent(appName)}`;

  return (
    <div className="flex items-center justify-between gap-2 xs:gap-3 px-1 xs:px-2 sm:px-4 md:px-6 mb-3 xs:mb-4">
      <Link 
        to="/" 
        className="inline-flex items-center gap-1.5 xs:gap-2 text-xs xs:text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors group shrink-0"
      >
        <div className="p-1 xs:p-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 group-hover:-translate-x-1 transition-transform">
          <ArrowLeft className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
        </div>
        <span>Back to storefront</span>
      </Link>

      {/* Lightweight Related News Gateway Button */}
      <Link
        to={newsLink}
        className="inline-flex items-center gap-1 xs:gap-1.5 px-2 xs:px-3 py-1 xs:py-1.5 rounded-full text-[11px] xs:text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200/90 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 border border-black/5 dark:border-white/10 transition-all shadow-xs group cursor-pointer active:scale-95 shrink-0"
        title={`Read latest news and updates for ${appName}`}
      >
        <div className="p-0.5 xs:p-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
          <Newspaper className="w-3 h-3 xs:w-3.5 xs:h-3.5" />
        </div>
        <span>News</span>
        {relatedNewsCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] xs:text-[10px] font-bold leading-none">
            {relatedNewsCount}
          </span>
        )}
        <ArrowRight className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
};
