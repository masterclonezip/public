import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { AppConfig } from '../../types';
import { getOptimizedImageUrl } from '../../seo/utils';

interface AppHeaderProps {
  app: AppConfig;
}

export default function AppHeader({ app }: AppHeaderProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const initialLetter = (app.name || 'A').trim().substring(0, 1).toUpperCase();
  const rawUrl = app.icon_url || '';
  const optimizedUrl = rawUrl ? (getOptimizedImageUrl(rawUrl, 512) || rawUrl) : '';
  const currentSrc = failedUrl === optimizedUrl ? rawUrl : optimizedUrl;
  const isFailed = Boolean(rawUrl && failedUrl === rawUrl);

  const handleImageError = () => {
    if (failedUrl !== optimizedUrl && optimizedUrl !== rawUrl) {
      setFailedUrl(optimizedUrl);
    } else {
      setFailedUrl(rawUrl);
    }
  };

  return (
    <div className="flex w-full items-center gap-3 xs:gap-4 sm:gap-6 mb-4 sm:mb-6 px-0 sm:px-4 md:px-6 mt-1 sm:mt-2">
      {/* App Icon Container */}
      <div className="relative w-[64px] h-[64px] xs:w-[72px] xs:h-[72px] sm:w-[96px] sm:h-[96px] md:w-[112px] md:h-[112px] shrink-0">
        <div className="w-full h-full rounded-[16px] xs:rounded-[18px] sm:rounded-[24px] overflow-hidden shadow-sm bg-zinc-100 dark:bg-zinc-800 border border-black/5 dark:border-white/10 relative">
          {rawUrl && !isFailed ? (
            <img 
              src={currentSrc} 
              alt={`${app.name} app icon`} 
              itemProp="image"
              loading="eager" 
              fetchPriority="high" 
              decoding="async"
              width={112} 
              height={112} 
              className="w-full h-full object-cover block relative z-10" 
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl xs:text-2xl sm:text-3xl font-bold text-zinc-500 dark:text-zinc-400 select-none">
              {initialLetter}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-col justify-center flex-1 min-w-0">
        <h1 className="text-lg xs:text-[22px] sm:text-3xl md:text-4xl font-black sm:font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug sm:leading-tight mb-0.5 xs:mb-1 break-words">
          {app.name}
        </h1>
        <div className="text-xs xs:text-sm sm:text-base font-semibold text-blue-600 dark:text-blue-400 mb-1 truncate">
          {app.developer || "Developer"}
        </div>
        <div className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-x-2 xs:gap-x-2.5 gap-y-1 mt-0.5 font-medium">
          {app.is_hot && app.is_new ? (
            <span className="inline-flex items-center rounded overflow-hidden shadow-xs font-black uppercase tracking-wider text-[9px] xs:text-[10px]">
              <span className="bg-[#d32f2f] text-white px-1.5 py-0.5">HOT</span>
              <span className="bg-[#008738] text-white px-1.5 py-0.5">NEW</span>
            </span>
          ) : app.is_hot ? (
            <span className="bg-[#d32f2f] text-white px-1.5 py-0.5 rounded uppercase font-black tracking-wider text-[9px] xs:text-[10px] shadow-xs">
              HOT
            </span>
          ) : app.is_new ? (
            <span className="bg-[#008738] text-white px-1.5 py-0.5 rounded uppercase font-black tracking-wider text-[9px] xs:text-[10px] shadow-xs">
              NEW
            </span>
          ) : null}
          {app.safety_status === 'Verified' ? (
            <span className="flex items-center text-emerald-600 dark:text-emerald-400 gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-emerald-500" /> Verified
            </span>
          ) : (
            <span className="flex items-center text-orange-500 gap-1 font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-orange-500" /> {app.safety_status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
