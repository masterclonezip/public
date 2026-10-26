import React, { useState, useMemo } from 'react';
import { 
  Star, 
  Trash2, 
  Edit3, 
  Check, 
  Upload, 
  Clock, 
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Send,
  Eye,
  ThumbsUp
} from 'lucide-react';
import { StagedReview } from './types';

interface StagedQueueProps {
  stagedReviews: StagedReview[];
  onDeleteReview: (id: string) => void;
  onClearAll: () => void;
  onClearAppReviews?: (appId: string) => void;
  onUpdateReview: (id: string, updates: Partial<StagedReview>) => void;
  onPublishAllToFirestore: () => Promise<void>;
  onPublishAppToFirestore?: (appId: string) => Promise<void>;
  isPublishing: boolean;
  onBackToChat?: () => void;
}

export const StagedQueue: React.FC<StagedQueueProps> = ({
  stagedReviews,
  onDeleteReview,
  onClearAll,
  onClearAppReviews,
  onUpdateReview,
  onPublishAllToFirestore,
  onPublishAppToFirestore,
  isPublishing,
  onBackToChat
}) => {
  const [selectedAppId, setSelectedAppId] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [editUserName, setEditUserName] = useState('');
  const [editHelpfulCount, setEditHelpfulCount] = useState<number>(1);
  const [publishingAppId, setPublishingAppId] = useState<string | null>(null);

  // Group staged reviews by app
  const appGroups = useMemo(() => {
    const map = new Map<string, {
      appId: string;
      appName: string;
      appIcon?: string;
      appCategory?: string;
      reviews: StagedReview[];
      avgRating: number;
    }>();

    stagedReviews.forEach(r => {
      const key = String(r.appId || r.appSlug || 'unknown');
      if (!map.has(key)) {
        map.set(key, {
          appId: key,
          appName: r.appName || 'Unknown App',
          appIcon: r.appIcon,
          appCategory: r.appCategory,
          reviews: [],
          avgRating: 5
        });
      }
      map.get(key)!.reviews.push(r);
    });

    // Calculate average rating per group
    map.forEach(group => {
      const sum = group.reviews.reduce((acc, curr) => acc + (curr.rating || 5), 0);
      group.avgRating = Number((sum / group.reviews.length).toFixed(1));
    });

    return Array.from(map.values());
  }, [stagedReviews]);

  // Adjust selectedAppId if the currently selected app is cleared
  const activeAppGroup = useMemo(() => {
    if (selectedAppId === 'all') return null;
    return appGroups.find(g => g.appId === selectedAppId) || null;
  }, [appGroups, selectedAppId]);

  // Reviews to display in current view
  const visibleReviews = useMemo(() => {
    if (selectedAppId === 'all') return stagedReviews;
    return stagedReviews.filter(r => String(r.appId || r.appSlug || '') === selectedAppId);
  }, [stagedReviews, selectedAppId]);

  const startEdit = (review: StagedReview) => {
    setEditingId(review.id);
    setEditText(review.reviewText);
    setEditRating(review.rating);
    setEditUserName(review.userName);
    setEditHelpfulCount(typeof review.helpful_count === 'number' ? review.helpful_count : 1);
  };

  const saveEdit = (id: string) => {
    onUpdateReview(id, {
      reviewText: editText.trim(),
      rating: editRating,
      userName: editUserName.trim(),
      helpful_count: Math.max(0, editHelpfulCount)
    });
    setEditingId(null);
  };

  const handlePublishCurrentApp = async (appId: string) => {
    if (isPublishing) return;
    setPublishingAppId(appId);
    try {
      if (onPublishAppToFirestore) {
        await onPublishAppToFirestore(appId);
      } else {
        await onPublishAllToFirestore();
      }
    } finally {
      setPublishingAppId(null);
    }
  };

  const handleClearCurrentApp = (appId: string) => {
    if (onClearAppReviews) {
      onClearAppReviews(appId);
    } else {
      visibleReviews.forEach(r => onDeleteReview(r.id));
    }
  };

  if (stagedReviews.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 h-full min-h-[350px]">
        <div className="p-3.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
          <Layers className="w-8 h-8" />
        </div>
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Staging Deck is Empty</h4>
        <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
          Select apps and tap <strong>Start Generating</strong> in the AI Studio tab. Reviews will be organized here by app so you can inspect, edit, and publish them individually or all at once.
        </p>
        {onBackToChat && (
          <button
            type="button"
            onClick={onBackToChat}
            className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Chat</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col h-full space-y-3 overflow-hidden shadow-xs">
      {/* Top Header & Master Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          {onBackToChat && (
            <button
              type="button"
              onClick={onBackToChat}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold transition flex items-center gap-1 cursor-pointer mr-1"
              title="Return to Studio Chat"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Chat</span>
            </button>
          )}
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Staged Reviews Deck</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
            {stagedReviews.length} Total
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">across {appGroups.length} {appGroups.length === 1 ? 'app' : 'apps'}</span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onClearAll}
            disabled={isPublishing}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-red-500 transition flex items-center gap-1 cursor-pointer font-medium"
            title="Clear all staged reviews across all apps"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Deck</span>
          </button>

          <button
            onClick={onPublishAllToFirestore}
            disabled={isPublishing}
            className="text-xs px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isPublishing ? 'Publishing...' : `Publish All (${stagedReviews.length})`}</span>
          </button>
        </div>
      </div>

      {/* Per-App Selection Pills Bar - Lets admin pick which app's reviews to inspect */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-shrink-0 scrollbar-none">
        <button
          onClick={() => setSelectedAppId('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            selectedAppId === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Apps</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            selectedAppId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          }`}>
            {stagedReviews.length}
          </span>
        </button>

        {appGroups.map(group => {
          const isSelected = selectedAppId === group.appId;

          return (
            <button
              key={group.appId}
              onClick={() => setSelectedAppId(group.appId)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {group.appIcon ? (
                <img src={group.appIcon} alt="" className="w-4 h-4 rounded-sm object-cover" />
              ) : (
                <span className="w-4 h-4 rounded-sm bg-slate-300 dark:bg-slate-700 text-[9px] flex items-center justify-center font-bold">
                  {group.appName[0]}
                </span>
              )}
              <span className="max-w-[120px] truncate">{group.appName}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {group.reviews.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Target App Specific Focus Bar */}
      {activeAppGroup && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 flex items-center justify-between gap-2 flex-shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 overflow-hidden">
            {activeAppGroup.appIcon ? (
              <img src={activeAppGroup.appIcon} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0 border border-emerald-500/30" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                {activeAppGroup.appName[0]}
              </div>
            )}
            <div className="overflow-hidden">
              <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                {activeAppGroup.appName}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{activeAppGroup.reviews.length} staged reviews</span>
                <span>•</span>
                <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  {activeAppGroup.avgRating} avg
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => handleClearCurrentApp(activeAppGroup.appId)}
              disabled={isPublishing}
              className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:text-red-500 text-slate-600 dark:text-slate-300 font-medium transition cursor-pointer"
              title="Discard staged reviews for this app only"
            >
              Clear This App
            </button>

            <button
              onClick={() => handlePublishCurrentApp(activeAppGroup.appId)}
              disabled={isPublishing || publishingAppId === activeAppGroup.appId}
              className="text-[11px] px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Send className="w-3 h-3" />
              <span>
                {publishingAppId === activeAppGroup.appId
                  ? 'Pushing...'
                  : `Push ${activeAppGroup.appName} (${activeAppGroup.reviews.length}) to Firebase`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Reviews Cards List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
        {visibleReviews.map(r => {
          const isEditing = editingId === r.id;

          return (
            <div
              key={r.id}
              className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 text-xs space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              {/* Header: App Name, User, Date, Rating */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  {r.appIcon ? (
                    <img src={r.appIcon} alt="" className="w-5 h-5 rounded-md object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[9px] text-slate-500">
                      {(r.appName || 'A')[0]}
                    </div>
                  )}
                  <span className="font-bold text-slate-900 dark:text-slate-200 truncate">{r.appName}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 dark:text-slate-400 font-medium truncate">{r.userName}</span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {r.dateTag}
                  </span>

                  {/* Likes / Helpful Count Badge */}
                  <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-[10px] text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                    <ThumbsUp className="w-2.5 h-2.5" />
                    <span>{typeof r.helpful_count === 'number' ? r.helpful_count : 1} Likes</span>
                  </span>

                  <div className="flex items-center text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < r.rating ? 'fill-current' : 'text-slate-300 dark:text-slate-700'}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => (isEditing ? saveEdit(r.id) : startEdit(r))}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                    title={isEditing ? 'Save Changes' : 'Edit Review'}
                  >
                    {isEditing ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Edit3 className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => onDeleteReview(r.id)}
                    className="p-1 rounded text-slate-400 hover:text-red-500 transition cursor-pointer"
                    title="Delete Review"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Body: Edit mode or display mode */}
              {isEditing ? (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={editUserName}
                      onChange={e => setEditUserName(e.target.value)}
                      placeholder="User Name"
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-200"
                    />

                    {/* Interactive Clickable Star Selector */}
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2">
                      <span className="text-[11px] text-slate-500 mr-1">Rating:</span>
                      {[1, 2, 3, 4, 5].map(starNum => (
                        <button
                          key={starNum}
                          type="button"
                          onClick={() => setEditRating(starNum)}
                          className="cursor-pointer hover:scale-110 transition p-0.5"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              starNum <= editRating ? 'text-amber-500 fill-current' : 'text-slate-300 dark:text-slate-700'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-[11px] font-bold text-amber-500 ml-1">{editRating}★</span>
                    </div>

                    {/* Helpful / Likes Count Editor */}
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1">
                      <ThumbsUp className="w-3 h-3 text-blue-500" />
                      <span className="text-[11px] text-slate-500">Likes:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editHelpfulCount}
                        onChange={e => setEditHelpfulCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-14 bg-slate-100 dark:bg-slate-800 rounded px-1.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400 text-center"
                      />
                    </div>
                  </div>

                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={2}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500"
                  />

                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(r.id)}
                      className="px-3 py-1 rounded bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed font-normal">
                  "{r.reviewText}"
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
