import React from 'react';
import { Star, ThumbsUp, Flag, ChevronDown, ChevronUp } from 'lucide-react';
import { formatReviewDate } from '../../lib/communityFirebase';

export interface Review {
  id: string;
  app_id: string;
  username: string;
  rating: number;
  comment: string;
  created_at: string;
  helpful_count: number;
  source?: 'google' | 'community' | string;
  isPinned?: boolean;
  reported?: boolean;
  report_count?: number;
  adminReply?: {
    text: string;
    author: string;
    timestamp: string;
  } | null;
}

const AVATAR_COLORS = [
  'bg-emerald-500 text-emerald-100',
  'bg-sky-500 text-sky-100',
  'bg-violet-500 text-violet-100',
  'bg-amber-500 text-amber-100',
  'bg-rose-500 text-rose-100',
  'bg-indigo-500 text-indigo-100',
  'bg-teal-500 text-teal-100',
];

export const getAvatarStyle = (name: string): string => {
  const index = name ? name.toLowerCase().charCodeAt(0) % AVATAR_COLORS.length : 0;
  return AVATAR_COLORS[index];
};

interface ReviewItemProps {
  rev: Review;
  isReported: boolean;
  isExpanded: boolean;
  isVoted: boolean;
  onToggleExpand: (id: string) => void;
  onHelpfulVote: (id: string) => void;
  onReport: (id: string) => void;
}

export function ReviewItem({
  rev,
  isReported,
  isExpanded,
  isVoted,
  onToggleExpand,
  onHelpfulVote,
  onReport,
}: ReviewItemProps) {
  const commentText = (rev.comment && rev.comment.trim()) 
    ? rev.comment.trim() 
    : ((rev as any).reviewText && (rev as any).reviewText.trim() ? (rev as any).reviewText.trim() : '');
  const username = (rev.username && rev.username.trim() && rev.username.toLowerCase() !== 'player') 
    ? rev.username.trim() 
    : ((rev as any).userName && (rev as any).userName.trim() ? (rev as any).userName.trim() : (rev.username || 'Player'));
  const isLong = commentText.length > 150;
  const displayedComment = isLong && !isExpanded 
    ? `${commentText.substring(0, 150)}...` 
    : commentText;

  return (
    <div
      className={`cv-auto p-3 xs:p-4 sm:p-5 border rounded-xl xs:rounded-2xl flex gap-2.5 xs:gap-3.5 sm:gap-4 transition-all text-left ${
        isReported || rev.reported
          ? 'bg-rose-500/[0.04] dark:bg-rose-500/[0.08] border-rose-500/20 opacity-90'
          : 'bg-zinc-50/50 dark:bg-zinc-900/30 border-black/5 dark:border-white/10'
      }`}
    >
      {/* Avatar */}
      <div className={`w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-full font-black text-xs sm:text-sm flex items-center justify-center shrink-0 uppercase shadow-sm ${getAvatarStyle(username)}`}>
        {username ? username.charAt(0).toUpperCase() : 'P'}
      </div>

      {/* Content column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200 truncate">
              {username}
            </span>
            {(isReported || rev.reported) && (
              <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-450 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-500/10 shrink-0 select-none uppercase tracking-wide animate-pulse">
                Flagged
              </span>
            )}
            {rev.isPinned && (
              <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0 select-none uppercase tracking-wide">
                Pinned
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase shrink-0">
            {formatReviewDate(rev.created_at || (rev as any).timestamp)}
          </span>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-0.5 mb-2.5 text-amber-500">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star 
              key={`star-${rev.id}-${s}`} 
              className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-700'}`} 
            />
          ))}
        </div>

        {/* Expandable Review Text */}
        <div 
          className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed break-words whitespace-pre-wrap flex flex-col relative select-text"
        >
          <p>{displayedComment}</p>
          
          {isLong && (
            <button
              type="button"
              onClick={() => onToggleExpand(rev.id)}
              aria-label={isExpanded ? 'Show less review text' : `Read full review by ${rev.username || 'user'}`}
              className="self-start inline-flex items-center gap-0.5 text-[11px] font-black text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 mt-2 cursor-pointer transition-all uppercase tracking-wide select-none outline-none"
            >
              <span>{isExpanded ? 'Show less' : 'Read more'}</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          {rev.adminReply && rev.adminReply.text && (
            <div className="mt-3 p-3 bg-zinc-100/80 dark:bg-zinc-800/60 rounded-xl border border-black/5 dark:border-white/5 text-[11px] text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  {rev.adminReply.author || 'Developer Response'}
                </span>
                {rev.adminReply.timestamp && (
                  <span className="text-[9px] text-zinc-400">
                    {formatReviewDate(rev.adminReply.timestamp)}
                  </span>
                )}
              </div>
              <p className="leading-relaxed whitespace-pre-wrap">{rev.adminReply.text}</p>
            </div>
          )}
        </div>

        {/* Footer Help voting Panel */}
        <div className="flex items-center gap-4 mt-4 pt-3.5 border-t border-black/[0.03] dark:border-white/[0.03]">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Was this review helpful?
          </span>
          <button
            type="button"
            onClick={() => onHelpfulVote(rev.id)}
            disabled={isVoted}
            aria-label={`Vote helpful for review by ${rev.username || 'user'}`}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
              isVoted
                ? 'bg-blue-500/10 text-blue-500 cursor-default'
                : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 active:scale-95 cursor-pointer'
            }`}
          >
            <ThumbsUp className="w-3 h-3" />
            <span>Helpful {rev.helpful_count > 0 && `(${rev.helpful_count})`}</span>
          </button>

          <button
            type="button"
            onClick={() => onReport(rev.id)}
            disabled={isReported || rev.reported}
            aria-label={`Report review by ${rev.username || 'user'}`}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ml-auto ${
              isReported || rev.reported
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 cursor-default font-black'
                : 'bg-black/5 hover:bg-rose-500/10 hover:text-rose-600 dark:bg-white/5 dark:hover:bg-rose-500/15 text-zinc-500 dark:text-zinc-400 active:scale-95 cursor-pointer'
            }`}
          >
            <Flag className="w-3 h-3" />
            <span>{isReported || rev.reported ? 'Reported' : 'Report'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}

export default ReviewItem;
