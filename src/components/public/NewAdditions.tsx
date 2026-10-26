import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import { AppConfig } from '../../types';
import { getOptimizedImageUrl } from '../../seo/utils';
import { preloadAppDetails } from '../../lib/preloadHelper';

interface NewAdditionsProps {
  loading?: boolean;
  apps: AppConfig[];
}

export default React.memo(function NewAdditions({ apps }: NewAdditionsProps) {
  const newApps = useMemo(() => apps.filter(app => app.is_new), [apps]);
  if (newApps.length === 0) return null;

  return (
    <aside data-nosnippet className="px-0 animate-fade-in">
      <h2 className="text-base xxs:text-lg xs:text-xl font-bold mb-2.5 xs:mb-4 mt-3 xs:mt-6 text-zinc-900 dark:text-zinc-100 flex items-center px-0">
        New Additions <BadgeCheck className="w-4 h-4 xs:w-5 xs:h-5 text-blue-500 fill-blue-500/20 ml-1.5" />
      </h2>
      <div className="flex overflow-x-auto gap-2 xxs:gap-2.5 xs:gap-3.5 sm:gap-4 px-2 xxs:px-3 xs:px-4 sm:px-1 pt-1.5 pb-2 mb-2 scrollbar-none snap-x snap-mandatory scroll-smooth -mx-2 xxs:-mx-3 xs:-mx-4 sm:-mx-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {newApps.slice(0, 10).map((app, index) => (
          <div
            key={`${app.id}-${index}`}
            className="flex-none w-[64px] xxs:w-[74px] xs:w-[88px] sm:w-[104px] snap-start"
          >
            <Link 
              to={`/app/${app.slug}`} 
              onMouseEnter={() => preloadAppDetails(app.slug)}
              onFocus={() => preloadAppDetails(app.slug)}
              className="flex flex-col gap-1 xxs:gap-1.5 xs:gap-2 group"
            >
              <div className="relative w-full aspect-square">
                <div className="w-full h-full rounded-[14px] xxs:rounded-[16px] xs:rounded-[20px] sm:rounded-[24px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-black/5 dark:border-white/10 shadow-sm group-hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.1)] transition-all">
                  <img 
                    src={getOptimizedImageUrl(app.icon_url, 120) || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=128&h=128&fit=crop"} 
                    alt={app.name} 
                    loading={index < 6 ? "eager" : "lazy"}
                    decoding="async"
                    {...(index === 0 ? { fetchPriority: "high" as const } : { fetchPriority: "low" as const })}
                    width={104}
                    height={104}
                    className="w-full h-full object-cover group-hover:-translate-y-0.5 transition-transform duration-300 block" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (app.icon_url && target.src !== app.icon_url) {
                        target.src = app.icon_url;
                      } else {
                        target.src = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=128&h=128&fit=crop";
                      }
                    }}
                  />
                </div>
                {app.is_hot && app.is_new ? (
                  <div className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none">
                    <span className="inline-flex items-center rounded-[6px] xs:rounded-[8px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.18)] font-black text-[7px] xs:text-[8px] sm:text-[9px] uppercase tracking-wider block">
                      <span className="bg-[#d32f2f] text-white px-1 xs:px-1.5 py-0.5">HOT</span>
                      <span className="bg-[#008738] text-white px-1 xs:px-1.5 py-0.5">NEW</span>
                    </span>
                  </div>
                ) : app.is_hot ? (
                  <div className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none">
                    <span className="bg-[#d32f2f] text-white text-[7px] xs:text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-[6px] xs:rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.15)] uppercase tracking-wider block">
                      HOT
                    </span>
                  </div>
                ) : app.is_new ? (
                  <div className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none">
                    <span className="bg-[#008738] text-white text-[7px] xs:text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-[6px] xs:rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.15)] uppercase tracking-wider block">
                      NEW
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="px-0.5 text-center">
                <h3 className="text-[9px] xs:text-[10px] sm:text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">{app.name}</h3>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </aside>
  );
});
