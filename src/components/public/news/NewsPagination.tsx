import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NewsPaginationProps {
  currentPage: number;
  totalPages: number;
  paginationRange: (number | string)[];
  onPageChange: (page: number) => void;
}

export default function NewsPagination({
  currentPage,
  totalPages,
  paginationRange,
  onPageChange,
}: NewsPaginationProps) {
  if (totalPages <= 1) return null;

  const getPageUrl = (page: number) => {
    return page <= 1 ? '/news' : `/news?page=${page}`;
  };

  return (
    <nav aria-label="News pagination" className="mt-10 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
      {currentPage > 1 ? (
        <Link
          to={getPageUrl(currentPage - 1)}
          onClick={(e) => {
            e.preventDefault();
            onPageChange(currentPage - 1);
          }}
          className="min-h-[40px] min-w-[40px] px-2.5 sm:px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1 text-xs font-semibold cursor-pointer no-underline"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </Link>
      ) : (
        <span
          className="min-h-[40px] min-w-[40px] px-2.5 sm:px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 opacity-40 cursor-not-allowed flex items-center justify-center gap-1 text-xs font-semibold select-none"
          aria-disabled="true"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </span>
      )}

      {paginationRange.map((page, index) => {
        if (page === '...') {
          return (
            <span key={`ellipsis-${index}`} className="px-2 py-1 text-xs text-zinc-400 select-none">
              ...
            </span>
          );
        }

        const pageNum = Number(page);
        const isCurrent = pageNum === currentPage;
        return (
          <Link
            key={`page-${page}`}
            to={getPageUrl(pageNum)}
            onClick={(e) => {
              e.preventDefault();
              onPageChange(pageNum);
            }}
            aria-current={isCurrent ? 'page' : undefined}
            className={`w-10 h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer no-underline ${
              isCurrent
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 pointer-events-none'
                : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            {page}
          </Link>
        );
      })}

      {currentPage < totalPages ? (
        <Link
          to={getPageUrl(currentPage + 1)}
          onClick={(e) => {
            e.preventDefault();
            onPageChange(currentPage + 1);
          }}
          className="min-h-[40px] min-w-[40px] px-2.5 sm:px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1 text-xs font-semibold cursor-pointer no-underline"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <span
          className="min-h-[40px] min-w-[40px] px-2.5 sm:px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 opacity-40 cursor-not-allowed flex items-center justify-center gap-1 text-xs font-semibold select-none"
          aria-disabled="true"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </span>
      )}
    </nav>
  );
}
