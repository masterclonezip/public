import React from 'react';
import { useData } from '../../contexts/DataContextPublic';
import { cn } from '../../lib/utilsPublic';

interface TabProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hideOnSearch?: boolean;
}

export const PlayStoreTabs = React.memo(({ activeTab, onTabChange, hideOnSearch }: TabProps) => {
  const { settings } = useData();

  const tabs = React.useMemo(() => {
    let list = settings?.categories && settings.categories.length > 0 
      ? settings.categories 
      : ["All Apps", "Games", "Apps", "Entertainment"];
      
    if (list.length > 0 && !list.some(c => c.toLowerCase() === 'all' || c.toLowerCase() === 'all apps' || c.toLowerCase() === 'home' || c.toLowerCase() === 'apps')) {
      list = ["All Apps", ...list];
    }
    return list;
  }, [settings?.categories]);
  
  const uniqueTabs = React.useMemo(() => {
    const seen = new Set<string>();
    return tabs.filter(tab => {
      const lower = tab.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  }, [tabs]);

  if (hideOnSearch) return null;
  
  const getTabHref = (tab: string): string => {
    const lower = tab.toLowerCase().trim();
    if (lower === 'all apps' || lower === 'all' || lower === 'home' || lower === 'apps') {
      return '/';
    }
    if (lower === 'categories') {
      return '/categories';
    }
    if (lower === 'top charts') {
      return '/?tab=Top%20Charts';
    }
    const slug = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug ? `/category/${slug}` : '/';
  };

  return (
    <div className="mb-2 sticky top-[42px] xxs:top-[46px] xs:top-[50px] sm:top-16 z-40 bg-[var(--bg-primary)] py-1 xxs:py-1.5 xs:py-2 px-0">
      <div className="flex overflow-x-auto no-scrollbar gap-1 xxs:gap-1.5 xs:gap-2">
        {uniqueTabs.map((tab) => (
          <a
            key={tab}
            href={getTabHref(tab)}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
                e.preventDefault();
                onTabChange(tab);
              }
            }}
            className={cn(
              "whitespace-nowrap px-2.5 xxs:px-3 xs:px-4 py-1 xxs:py-1.5 xs:py-2 text-[11px] xxs:text-xs xs:text-sm font-medium transition-all rounded-full border no-underline inline-flex items-center cursor-pointer",
              activeTab === tab 
                ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-700/60 hover:bg-zinc-200/80 dark:hover:bg-zinc-700"
            )}
          >
            {tab}
          </a>
        ))}
      </div>
    </div>
  );
});
