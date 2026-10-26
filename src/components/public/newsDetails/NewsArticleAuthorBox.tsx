import React from 'react';

interface NewsArticleAuthorBoxProps {
  author: string;
  authorRole: string;
  authorDesc?: string;
  formattedDate: string;
  siteTitle: string;
}

export const NewsArticleAuthorBox: React.FC<NewsArticleAuthorBoxProps> = ({
  author,
  authorRole,
  authorDesc,
  formattedDate,
  siteTitle
}) => {
  return (
    <div className="my-8 p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-black/5 dark:border-white/10 flex items-start gap-3.5 text-left">
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
        {author.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">{author}</h4>
          <span className="text-[10px] sm:text-[11px] text-zinc-400">{formattedDate}</span>
        </div>
        <p className="text-[11px] sm:text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">{authorRole}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {authorDesc || `This publication represents verified reporting and independent testing by the ${siteTitle} editorial team.`}
        </p>
      </div>
    </div>
  );
};
