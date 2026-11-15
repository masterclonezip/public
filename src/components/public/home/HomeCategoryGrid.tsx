import { ShieldCheck } from 'lucide-react';

interface HomeCategoryGridProps {
  categories: string[];
  setActiveTab: (tab: string) => void;
}

export default function HomeCategoryGrid({ categories, setActiveTab }: HomeCategoryGridProps) {
  const seen = new Set<string>();
  const uniqueCats = categories.filter(c => {
    const l = c.toLowerCase();
    if (seen.has(l)) return false;
    seen.add(l);
    return l !== (categories[0]?.toLowerCase() || 'all apps') && l !== 'top charts' && l !== 'categories';
  });

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4 animate-fade-in px-0">
      {uniqueCats.map((cat, idx) => {
        const slug = cat.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const href = slug ? `/category/${slug}` : '/categories';
        return (
          <a
            key={`cat-grid-${cat}-${idx}`}
            href={href}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
                e.preventDefault();
                setActiveTab(cat);
              }
            }}
            className="flex items-center gap-2.5 sm:gap-3.5 p-3 sm:p-4 min-h-[52px] glass-panel text-left active:scale-[0.98] transition-all duration-300 cursor-pointer no-underline"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="font-semibold text-xs xs:text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate">{cat}</span>
          </a>
        );
      })}
    </div>
  );
}
