import React from 'react';
import { 
  Zap, 
  Clock, 
  Star, 
  Sparkles, 
  ShieldCheck, 
  MessageSquare,
  Play,
  RotateCcw,
  Sliders,
  CheckCircle,
  UploadCloud,
  Layers
} from 'lucide-react';
import { StudioConfig, DateDistributionMode, RatingMixMode, LanguageToneMode, PublishMode } from './types';

interface Brain2BatchGeneratorProps {
  config: StudioConfig;
  onChangeConfig: (newConfig: Partial<StudioConfig>) => void;
  selectedAppCount: number;
  onLaunchBatch: () => Promise<void>;
  isGenerating: boolean;
  progress: { current: number; total: number; percent: number };
}

export const Brain2BatchGenerator: React.FC<Brain2BatchGeneratorProps> = ({
  config,
  onChangeConfig,
  selectedAppCount,
  onLaunchBatch,
  isGenerating,
  progress
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col h-full space-y-4">
      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Brain 2: High-Volume AutoBot</h3>
            <p className="text-[11px] text-slate-400">Autonomous bulk generator with realistic date spreads & persona scaling</p>
          </div>
        </div>

        <span className="self-start sm:self-auto text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700">
          Targeting {selectedAppCount} Apps
        </span>
      </div>

      {/* Publishing Mode: Two paths (Wait and Approve vs Direct Upload to Firebase) */}
      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
        <label className="text-xs text-slate-300 font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            <span>Publishing Destination Path</span>
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${config.publishMode === 'auto_direct' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
            {config.publishMode === 'auto_direct' ? '⚡ Direct Live Push' : '🛡️ Admin Review Gate'}
          </span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* Option 1: Wait & Approve */}
          <button
            type="button"
            onClick={() => onChangeConfig({ publishMode: 'wait_approve' })}
            className={`p-2.5 rounded-lg border text-left transition flex flex-col gap-1 ${
              config.publishMode === 'wait_approve'
                ? 'bg-emerald-950/30 border-emerald-500/60 text-slate-100 shadow-sm'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs flex items-center gap-1.5 text-emerald-300">
                <Layers className="w-3.5 h-3.5" />
                Wait & Approve Myself
              </span>
              {config.publishMode === 'wait_approve' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Reviews land in Staging Deck for your quick review or edits before 1-click publishing.
            </p>
          </button>

          {/* Option 2: Direct Upload to Firebase */}
          <button
            type="button"
            onClick={() => onChangeConfig({ publishMode: 'auto_direct' })}
            className={`p-2.5 rounded-lg border text-left transition flex flex-col gap-1 ${
              config.publishMode === 'auto_direct'
                ? 'bg-amber-950/30 border-amber-500/60 text-slate-100 shadow-sm'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs flex items-center gap-1.5 text-amber-300">
                <UploadCloud className="w-3.5 h-3.5" />
                Direct Upload to Firebase
              </span>
              {config.publishMode === 'auto_direct' && <CheckCircle className="w-3.5 h-3.5 text-amber-400" />}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Instant auto-post directly to Live Community collection as soon as generated.
            </p>
          </button>
        </div>
      </div>

      {/* Grid of Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Reviews Per App */}
        <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
          <label className="text-slate-300 font-medium flex items-center justify-between">
            <span>Reviews Per App</span>
            <span className="text-emerald-400 font-bold">{config.reviewsPerApp} reviews</span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={config.reviewsPerApp}
            onChange={e => onChangeConfig({ reviewsPerApp: Number(e.target.value) })}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>1 / app</span>
            <span>5 / app</span>
            <span>10 / app</span>
          </div>
        </div>

        {/* Date Distribution */}
        <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
          <label className="text-slate-300 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Date Distribution Schedule</span>
          </label>
          <select
            value={config.dateMode}
            onChange={e => onChangeConfig({ dateMode: e.target.value as DateDistributionMode })}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="today_and_yesterday">Today & Yesterday (50% / 50% Natural Split)</option>
            <option value="today_only">Today Only (Recent hours)</option>
            <option value="yesterday_only">Yesterday Only</option>
            <option value="last_3_days">Last 3 Days Spread</option>
            <option value="last_7_days">Last 7 Days (Natural History)</option>
          </select>
        </div>

        {/* Rating Ratio */}
        <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
          <label className="text-slate-300 font-medium flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>Rating Star Balance</span>
          </label>
          <select
            value={config.ratingMix}
            onChange={e => onChangeConfig({ ratingMix: e.target.value as RatingMixMode })}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="natural">Natural Mix (80% 5★, 15% 4★, 5% 3★)</option>
            <option value="all_5_star">Pure 5-Star (100% 5★)</option>
            <option value="high_praise">High Praise (90% 5★, 10% 4★)</option>
            <option value="balanced_critical">Realistic Mixed (60% 5★, 30% 4★, 10% 3★)</option>
          </select>
        </div>

        {/* Language & Tone */}
        <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
          <label className="text-slate-300 font-medium flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Language & Player Tone</span>
          </label>
          <select
            value={config.languageTone}
            onChange={e => onChangeConfig({ languageTone: e.target.value as LanguageToneMode })}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="hinglish_natural">Hinglish & Casual Indian Slang (Most Authentic)</option>
            <option value="natural_english">Casual Indian English (Colloquial)</option>
            <option value="short_punchy">Short & Punchy (1-2 sentences)</option>
            <option value="mixed_pro">Detailed Mixed Reviews</option>
          </select>
        </div>
      </div>

      {/* Focus Theme Topic input */}
      <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-lg border border-slate-800 text-xs">
        <label className="text-slate-300 font-medium">Batch Focus Topic (Optional Custom Theme)</label>
        <input
          type="text"
          value={config.customTopic}
          onChange={e => onChangeConfig({ customTopic: e.target.value })}
          placeholder="e.g. Fast withdrawal, VIP bonus, customer service, smooth 4G tables..."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Progress Bar (when active) */}
      {isGenerating && (
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              Batch generating reviews ({progress.current} of {progress.total} apps)...
            </span>
            <span className="font-bold">{progress.percent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Launch Action */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>
            {config.publishMode === 'auto_direct'
              ? 'AutoBot will post directly to Firebase Community. Zero read quota burn.'
              : 'Reviews land in Staging Deck for your final preview. Zero read quota burn.'}
          </span>
        </div>

        <button
          onClick={onLaunchBatch}
          disabled={isGenerating || selectedAppCount === 0}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium text-xs transition flex items-center justify-center gap-2 shadow-md shadow-amber-950"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>
            {isGenerating
              ? 'AutoBot Running...'
              : `Launch AutoBot (${selectedAppCount * config.reviewsPerApp} Reviews)`}
          </span>
        </button>
      </div>
    </div>
  );
};
