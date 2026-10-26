import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Share2, Check } from 'lucide-react';
import { getOptimizedImageUrl } from '../../../seo/utils';

interface NewsArticleHeaderProps {
  title: string;
  category: string;
  formattedDate: string;
  author: string;
  readingTime: string;
  logoUrl?: string;
  copied: boolean;
  onShare: () => void;
}

export const NewsArticleHeader: React.FC<NewsArticleHeaderProps> = ({
  title,
  category,
  formattedDate,
  author,
  readingTime,
  logoUrl,
  copied,
  onShare
}) => {
  return (
    <>
      <div className="flex items-center justify-between gap-3 px-1 sm:px-4 mb-4">
        <Link 
          to="/news" 
          className="inline-flex items-center gap-2 text-xs xs:text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors group shrink-0"
        >
          <div className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 group-hover:-translate-x-1 transition-transform">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span>Back to News</span>
        </Link>

        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all border border-black/5 dark:border-white/10 shrink-0 cursor-pointer"
          title="Share article"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-600 dark:text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Share</span>
            </>
          )}
        </button>
      </div>

      <header className="mb-4 text-left px-1 sm:px-4">
        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
            {category}
          </span>
          <span className="text-zinc-400 dark:text-zinc-500 flex items-center gap-1 font-medium">
            <Calendar className="w-3 h-3" />
            {formattedDate}
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <span className="text-zinc-400 dark:text-zinc-500 flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3" />
            {readingTime}
          </span>
        </div>

        <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight mb-3">
          {title}
        </h1>

        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          <span>Reported by</span>
          <span className="font-bold text-zinc-800 dark:text-zinc-200">{author}</span>
        </div>
      </header>

      {logoUrl && (
        <div className="w-full aspect-video max-h-[420px] overflow-hidden mb-5 sm:mb-6 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 relative">
          <img 
            src={getOptimizedImageUrl(logoUrl, 800) || logoUrl} 
            srcSet={`${getOptimizedImageUrl(logoUrl, 480)} 480w, ${getOptimizedImageUrl(logoUrl, 800)} 800w, ${getOptimizedImageUrl(logoUrl, 1200)} 1200w`}
            sizes="(max-width: 640px) 100vw, 768px"
            alt={title}
            width={1200}
            height={675}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover block rounded-2xl"
          />
        </div>
      )}
    </>
  );
};
