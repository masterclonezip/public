import React, { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Calendar, Pin, Share2 } from 'lucide-react';
import { getOptimizedImageUrl } from '../../../seo/utils';
import { calculateReadingTime, formatNewsDate, getPlainTextSnippet } from './newsUtils';

interface NewsCardProps {
  item: any;
  index?: number;
  onShare: (item: any) => void;
}

function NewsCardComponent({ item, index, onShare }: NewsCardProps) {
  const navigate = useNavigate();
  const coverImage = item.og_image_url || item.image_url || item.logo_url || item.image || '';
  const optimizedCover = coverImage ? (getOptimizedImageUrl(coverImage, 600) || coverImage) : '';
  const readingTime = calculateReadingTime(item.content || item.description_html || item.description);
  const formattedDate = formatNewsDate(item.date, item.published_at, item.created_at);
  const snippet = getPlainTextSnippet(item.description || item.seo_description || item.content);
  const slugOrId = String(item.slug || item.id || '').trim();
  const articleUrl = `/news/${encodeURIComponent(slugOrId)}`;
  const category = (item.category || '').trim();
  const isEager = typeof index === 'number' && index < 3;

  const prefetchArticle = () => {
    import('../../../pages/NewsDetailPage').catch(() => {});
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return;
    }
    navigate(articleUrl);
  };

  return (
    <article 
      onClick={handleCardClick}
      onPointerEnter={prefetchArticle}
      onTouchStart={prefetchArticle}
      className="group bg-white dark:bg-zinc-900 overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-200 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 cursor-pointer text-left"
    >
      <Link 
        to={articleUrl} 
        className="relative w-full aspect-[16/9] overflow-hidden bg-zinc-100 dark:bg-zinc-800/60 block shrink-0 no-underline"
        aria-label={`Read full news article: ${item.title || 'News Article'}`}
      >
        {optimizedCover ? (
          <img 
            src={optimizedCover} 
            alt={item.title || 'News article thumbnail'} 
            className="w-full h-full object-cover object-center block transition-transform duration-200 group-hover:scale-[1.02]"
            loading={isEager ? 'eager' : 'lazy'}
            decoding="async"
            width={600}
            height={338}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
            <span className="text-xl font-black text-blue-600/30 dark:text-blue-400/30 tracking-widest uppercase">
              {category || 'News'}
            </span>
          </div>
        )}
        {item.is_pinned && (
          <div className="absolute top-2.5 left-2.5 bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1 z-10">
            <Pin className="w-3 h-3 fill-white" />
            <span>Pinned</span>
          </div>
        )}
        {category && (
          <div className="absolute bottom-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-white/10 z-10">
            {category}
          </div>
        )}
      </Link>

      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          {formattedDate && (
            <>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </span>
              <span>•</span>
            </>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{readingTime}</span>
          </span>
        </div>

        <Link 
          to={articleUrl} 
          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors block mb-2 no-underline"
        >
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white line-clamp-2 leading-snug">
            {item.title}
          </h2>
        </Link>

        {snippet && (
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed mb-4 flex-1">
            {snippet}
          </p>
        )}

        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-semibold mt-auto">
          <Link 
            to={articleUrl}
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 no-underline"
          >
            <span>Read Article →</span>
          </Link>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare(item);
            }}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Share article"
            aria-label="Share article"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default memo(NewsCardComponent);

