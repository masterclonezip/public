import React from 'react';
import { ArrowLeft } from 'lucide-react';

export function AppDetailsSkeleton() {
  return (
    <div className="w-full select-none animate-fade-in" aria-busy="true" aria-label="Loading application details">
      {/* 1. Back button & News button matching AppDetails exact position */}
      <div className="flex items-center justify-between gap-3 px-1 sm:px-4 md:px-6 mb-4">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-500/60 dark:text-blue-400/60">
          <div className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20">
            <ArrowLeft className="w-4 h-4 text-blue-400/60" />
          </div>
          <span>Back to storefront</span>
        </div>
        <div className="h-7 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
      </div>

      <div className="w-full">
        {/* 2. AppHeader Skeleton: EXACT 1:1 match with AppHeader.tsx */}
        <div className="flex w-full items-center gap-2.5 xxs:gap-3 xs:gap-4 sm:gap-6 mb-3.5 sm:mb-6 px-1 xs:px-2 sm:px-4 md:px-6 mt-1 sm:mt-2">
          {/* App Icon rounded box */}
          <div className="w-[56px] h-[56px] xxs:w-[66px] xxs:h-[66px] xs:w-[80px] xs:h-[80px] sm:w-[102px] sm:h-[102px] md:w-[116px] md:h-[116px] shrink-0 rounded-[14px] xxs:rounded-[16px] xs:rounded-[20px] sm:rounded-[24px] bg-zinc-200 dark:bg-zinc-800 animate-pulse border border-black/5 dark:border-white/10 shadow-sm" />
          
          {/* Title, Developer, and Safety Badges */}
          <div className="flex flex-col justify-center flex-1 min-w-0 space-y-2">
            <div className="h-7 sm:h-9 w-44 sm:w-64 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="flex items-center gap-2 pt-0.5">
              <div className="h-3.5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
              <div className="h-3.5 w-14 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        {/* 3. AppSpecsBar Skeleton: EXACT 4-column layout matching AppSpecsBar.tsx */}
        <div className="w-full grid grid-cols-4 py-4 mb-6 border-y border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/10 dark:bg-zinc-900/10">
          {/* Col 1: Rating */}
          <div className="flex flex-col items-center justify-center px-2">
            <div className="h-4 sm:h-5 w-8 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-1.5" />
            <div className="h-2.5 sm:h-3 w-10 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
          {/* Col 2: Size */}
          <div className="flex flex-col items-center justify-center px-2 border-l border-zinc-200 dark:border-zinc-800/80">
            <div className="h-4 sm:h-5 w-12 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-1.5" />
            <div className="h-2.5 sm:h-3 w-8 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
          {/* Col 3: Type */}
          <div className="flex flex-col items-center justify-center px-2 border-l border-zinc-200 dark:border-zinc-800/80">
            <div className="h-4 sm:h-5 w-14 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse mb-1.5" />
            <div className="h-2.5 sm:h-3 w-8 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
          {/* Col 4: Version */}
          <div className="flex flex-col items-center justify-center px-2 border-l border-zinc-200 dark:border-zinc-800/80">
            <div className="h-4 sm:h-5 w-10 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-1.5" />
            <div className="h-2.5 sm:h-3 w-10 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>

        {/* 4. AppActionButtons Skeleton: Full width primary button + action pills */}
        <div className="flex flex-col sm:flex-row w-full justify-center items-center gap-3 mb-5 px-1 sm:px-4 md:px-6">
          <div className="w-full sm:flex-1 h-12 rounded-xl bg-blue-600/25 dark:bg-blue-600/20 border border-blue-500/20 animate-pulse" />
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-28 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse border border-black/5 dark:border-white/5" />
            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse border border-black/5 dark:border-white/5 shrink-0" />
          </div>
        </div>

        {/* 5. Similar Applications Section Skeleton */}
        <div className="my-6 px-1 sm:px-4 md:px-6">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 sm:h-6 w-40 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-3.5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="grid grid-rows-2 grid-flow-col gap-4 overflow-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={`sim-skel-${i}`} className="flex flex-col items-center gap-2 w-[88px] sm:w-[100px]">
                <div className="w-[84px] h-[84px] sm:w-[96px] sm:h-[96px] rounded-[24%] bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* 6. Screenshots Gallery Skeleton */}
        <div className="my-6 px-1 sm:px-4 md:px-6">
          <div className="h-5 sm:h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-3" />
          <div className="flex gap-4 overflow-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`shot-skel-${i}`} className="w-40 sm:w-52 h-64 sm:h-80 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse shrink-0 border border-black/5 dark:border-white/5" />
            ))}
          </div>
        </div>

        {/* 7. About Section Skeleton */}
        <div className="py-6 px-1 sm:px-4 md:px-6 border-t border-black/5 dark:border-white/5 space-y-3">
          <div className="h-5 sm:h-6 w-36 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-4" />
          <div className="h-3.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-3.5 w-[94%] bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-3.5 w-[88%] bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-3.5 w-[76%] bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default AppDetailsSkeleton;
