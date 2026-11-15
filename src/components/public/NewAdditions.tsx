import React, { useMemo, useState } from 'react';
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
  const [failedIcons, setFailedIcons] = useState<Record<string, boolean>>({});
  if (newApps.length === 0) return null;

  return (
    <aside data-nosnippet className="px-0 animate-fade-in">
      <h2 className="text-base xs:text-lg sm:text-xl font-bold mb-2 xs:mb-3 mt-1.5 xs:mt-3 sm:mt-4 text-zinc-900 dark:text-zinc-100 flex items-center px-0">
        New Additions <BadgeCheck className="w-4 h-4 xs:w-5 xs:h-5 text-blue-500 fill-blue-500/20 ml-1.5" />
      </h2>
      <div className="flex overflow-x-auto gap-2.5 xs:gap-3 sm:gap-4 px-2.5 sm:px-1 pt-2 pb-2 mb-1.5 scrollbar-none snap-x snap-mandatory -mx-2.5 sm:mx-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {newApps.slice(0, 10).map((app, index) => (
          <div
            key={`${app.id}-${index}`}
            className="flex-none w-[70px] xs:w-[78px] sm:w-[96px] snap-start"
          >
            <Link 
              to={`/app/${app.slug}`} 
              onMouseEnter={() => preloadAppDetails(app.slug)}
              onFocus={() => preloadAppDetails(app.slug)}
              className="flex flex-col gap-1.5 xs:gap-2 group"
            >
              <div className="relative w-full aspect-square">
                <div className="w-full h-full rounded-[16px] xs:rounded-[20px] sm:rounded-[24px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-black/5 dark:border-white/10 shadow-sm group-hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.1)] transition-all flex items-center justify-center">
                  {!failedIcons[app.id] && app.icon_url ? (
                    <img 
                      src={getOptimizedImageUrl(app.icon_url, 120)} 
                      alt={app.name} 
                      loading={index < 6 ? "eager" : "lazy"}
                      decoding="async"
                      {...(index === 0 ? { fetchPriority: "high" as const } : { fetchPriority: "low" as const })}
                      width={104}
                      height={104}
                      className="w-full h-full object-cover group-hover:-translate-y-0.5 transition-transform duration-300 block" 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (app.icon_url && target.src !== app.icon_url && !target.dataset.retried) {
                          target.dataset.retried = '1';
                          target.src = app.icon_url;
                        } else {
                          setFailedIcons(prev => ({ ...prev, [app.id]: true }));
                        }
                      }}
                    />
                  ) : (
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                      {(app.name || 'A').substring(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                {app.is_hot && app.is_new ? (
                  <div className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none">
                    <span className="inline-flex items-center rounded-[7px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.18)] font-black text-[8px] sm:text-[9px] uppercase tracking-wider">
                      <span className="bg-[#d32f2f] text-white px-1.5 py-0.5">HOT</span>
                      <span className="bg-[#008738] text-white px-1.5 py-0.5">NEW</span>
                    </span>
                  </div>
                ) : app.is_hot ? (
                  <div className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none">
                    <span className="bg-[#d32f2f] text-white text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-[7px] shadow-[0_2px_8px_rgba(0,0,0,0.15)] uppercase tracking-wider block">
                      HOT
                    </span>
                  </div>
                ) : app.is_new ? (
                  <div className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none">
                    <span className="bg-[#008738] text-white text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-[7px] shadow-[0_2px_8px_rgba(0,0,0,0.15)] uppercase tracking-wider block">
                      NEW
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="px-0.5 text-center">
                <h3 className="text-[11px] xs:text-xs font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-tight">{app.name}</h3>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </aside>
  );
});
