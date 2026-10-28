import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Sliders,
  Play,
  Calendar,
  Star,
  MessageSquare,
  RotateCcw,
  Zap,
  CheckCircle2,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  Layers,
  Globe,
  FileText,
  Edit3,
  X
} from 'lucide-react';
import {
  ChatMessage,
  StudioConfig,
  AppGenerationProgress,
  ReviewFocusTopic
} from './types';
import {
  MARKETPLACE_STYLE_OPTIONS,
  FOCUS_TOPIC_OPTIONS
} from './geminiEngine';

interface ChatWorkspaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onQuickGenerate: (customPrompt?: string) => void;
  onClearChat: () => void;
  config: StudioConfig;
  onUpdateConfig: (partial: Partial<StudioConfig>) => void;
  selectedAppsCount: number;
  isGenerating: boolean;
  appProgressList?: AppGenerationProgress[];
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  messages,
  onSendMessage,
  onQuickGenerate,
  onClearChat,
  config,
  onUpdateConfig,
  selectedAppsCount,
  isGenerating,
  appProgressList = []
}) => {
  const [input, setInput] = useState('');
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [editingBrief, setEditingBrief] = useState(false);
  const [briefDraft, setBriefDraft] = useState(config.activeSessionDirective || '');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBriefDraft(config.activeSessionDirective || '');
  }, [config.activeSessionDirective]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const toggleFocusTopic = (topicId: ReviewFocusTopic) => {
    const current = Array.isArray(config.focusTopics) ? config.focusTopics : [];
    if (current.includes(topicId)) {
      if (current.length <= 1) return; // Keep at least 1 topic active
      onUpdateConfig({ focusTopics: current.filter(t => t !== topicId) });
    } else {
      onUpdateConfig({ focusTopics: [...current, topicId] });
    }
  };

  const currentStyleObj =
    MARKETPLACE_STYLE_OPTIONS.find(s => s.id === config.marketplaceStyle) ||
    MARKETPLACE_STYLE_OPTIONS[0];

  const quickPresets = [
    {
      label: 'Play Store + Flipkart Mix',
      prompt:
        'Set style to blended crowd mix (Play Store + Flipkart/Amazon + Hinglish). Talk specifically about what each app provides from its features and description, keep 30% short one-liners, and use a realistic 4.7-star mix.'
    },
    {
      label: 'What the App Provides Focus',
      prompt:
        'Focus deeply on what each app actually provides — its specific modes, tools, features, and practical daily value. Make every reviewer sound like they actually used the app for a week.'
    },
    {
      label: 'Amazon/Flipkart Pros & Verdict',
      prompt:
        'Switch to Amazon & Flipkart verified reviewer style. Have users compare this app with 2-3 cluttered apps they tried before, explain why they kept this one, and share practical pros and minor wishes.'
    },
    {
      label: 'Desi Hinglish + Fast 1-Liners',
      prompt:
        'Use natural Indian Hinglish and casual one-liners like real college students and daily commuters on Redmi/Realme/Vivo phones using Jio/Airtel 4G/5G.'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50/60 dark:bg-slate-950/60 overflow-hidden">
      {/* Top Compact Strategy & Adjustments Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Quick Inline Summary Pills */}
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => setShowAdjustments(v => !v)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showAdjustments
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/70 hover:bg-indigo-100'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Adjustments</span>
              {showAdjustments ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Quick Inline Count Stepper */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Qty:</span>
              <input
                type="number"
                min={1}
                max={50}
                value={config.reviewsPerApp}
                onChange={e =>
                  onUpdateConfig({
                    reviewsPerApp: Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1))
                  })
                }
                className="w-10 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-1 py-0.5 text-center font-bold text-slate-900 dark:text-white text-xs"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">/app</span>
            </div>

            {/* Quick Inline Marketplace Style Selector */}
            <select
              value={config.marketplaceStyle || 'blended_authentic'}
              onChange={e => onUpdateConfig({ marketplaceStyle: e.target.value as any })}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[180px] sm:max-w-[230px] truncate cursor-pointer"
              title="Marketplace Comment Style"
            >
              {MARKETPLACE_STYLE_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.shortLabel}
                </option>
              ))}
            </select>

            {/* Quick Inline Rating Mix Selector */}
            <select
              value={config.ratingMix}
              onChange={e => onUpdateConfig({ ratingMix: e.target.value as any })}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              title="Star Rating Distribution"
            >
              <option value="mostly_positive">4.7★ Realistic Mix</option>
              <option value="all_5_star">5.0★ Only</option>
              <option value="balanced_realistic">4.1★ Organic Mix</option>
              <option value="critical_feedback">2★–3★ Critical QA</option>
            </select>
          </div>

          {/* Right Actions: Generate Now & Clear */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={isGenerating || selectedAppsCount === 0}
              onClick={() => onQuickGenerate()}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {isGenerating
                  ? 'Generating...'
                  : `Generate (${selectedAppsCount * config.reviewsPerApp})`}
              </span>
            </button>

            <button
              type="button"
              onClick={onClearChat}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Reset Chat Session"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Active Compiled Strategy Brief Banner (Always visible if set, so Admin sees what AI remembers) */}
        <div className="mt-2 flex items-start justify-between gap-2 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50 rounded-xl px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              <FileText className="w-3 h-3 shrink-0" />
              <span>Active Session Strategy Brief (Locked into Generator)</span>
            </div>
            {editingBrief ? (
              <div className="mt-1.5 space-y-1.5">
                <textarea
                  value={briefDraft}
                  onChange={e => setBriefDraft(e.target.value)}
                  rows={2}
                  placeholder="Write any custom instructions for how today's reviews should be written..."
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-lg p-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateConfig({ activeSessionDirective: briefDraft.trim() });
                      setEditingBrief(false);
                    }}
                    className="px-2.5 py-1 bg-indigo-600 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                  >
                    Save Brief
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBriefDraft(config.activeSessionDirective || '');
                      setEditingBrief(false);
                    }}
                    className="px-2.5 py-1 text-slate-600 dark:text-slate-400 text-[11px] font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5 line-clamp-2">
                {config.activeSessionDirective ? (
                  config.activeSessionDirective
                ) : (
                  <span className="italic text-slate-500 dark:text-slate-400">
                    {currentStyleObj.desc} Chat below or click Edit to customize today&apos;s exact review instructions.
                  </span>
                )}
              </p>
            )}
          </div>

          {!editingBrief && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setEditingBrief(true)}
                className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                title="Edit Strategy Brief"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              {config.activeSessionDirective && (
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ activeSessionDirective: '' })}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                  title="Clear Strategy Brief"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Expandable Full Adjustments Drawer */}
        {showAdjustments && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in max-h-[52vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Marketplace Style Full Selector */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                  <Layers className="w-3 h-3 text-indigo-500" /> Platform Comment Style
                </label>
                <select
                  value={config.marketplaceStyle || 'blended_authentic'}
                  onChange={e => onUpdateConfig({ marketplaceStyle: e.target.value as any })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  {MARKETPLACE_STYLE_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Review Length Distribution */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                  <MessageSquare className="w-3 h-3 text-emerald-500" /> Comment Length Mix
                </label>
                <select
                  value={config.lengthDistribution || 'natural_mix'}
                  onChange={e => onUpdateConfig({ lengthDistribution: e.target.value as any })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value="natural_mix">Natural Mix (30% 1-Line, 50% Med, 20% Story)</option>
                  <option value="short_punchy">Short &amp; Punchy Only (5–15 Words)</option>
                  <option value="medium_standard">Medium Standard (1–2 Sentences)</option>
                  <option value="detailed_story">Detailed User Stories (2–4 Sentences)</option>
                </select>
              </div>

              {/* Language & Hinglish Balance */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                  <Globe className="w-3 h-3 text-blue-500" /> Language &amp; Dialect Mix
                </label>
                <select
                  value={config.languageMix || 'hinglish_mix'}
                  onChange={e => onUpdateConfig({ languageMix: e.target.value as any })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value="hinglish_mix">70% Indian English + 30% Hinglish</option>
                  <option value="english_india">100% Natural Indian English</option>
                  <option value="global_english">100% Clean Everyday English</option>
                  <option value="pure_hinglish">100% Conversational Hinglish</option>
                </select>
              </div>

              {/* Human Typing Imperfection Level */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Human Typing Texture
                </label>
                <select
                  value={config.humanImperfectionLevel || 'natural'}
                  onChange={e => onUpdateConfig({ humanImperfectionLevel: e.target.value as any })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value="natural">Natural Mobile Habits (Recommended)</option>
                  <option value="raw_casual">Raw Casual Shorthand (&quot;v good&quot;, lowercase)</option>
                  <option value="polished">Polished &amp; Clean Sentences</option>
                </select>
              </div>
            </div>

            {/* Focus Topics Multi-Select Chips */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                What Reviewers Should Talk About (Click to Toggle Topics)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FOCUS_TOPIC_OPTIONS.map(topic => {
                  const active = (config.focusTopics || []).includes(topic.id);
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => toggleFocusTopic(topic.id)}
                      title={topic.desc}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      {active && <CheckCircle2 className="w-3 h-3" />}
                      <span>{topic.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Distribution, Likes & Publish Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Date Range */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3 text-blue-500" /> Timestamp Spread
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={config.dateRangeMode}
                    onChange={e => onUpdateConfig({ dateRangeMode: e.target.value as any })}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="recent_days">Last 7 Days</option>
                    <option value="custom_days">Last X Days</option>
                    <option value="custom_months">Last X Months</option>
                    <option value="specific_range">Custom Dates</option>
                  </select>
                  {config.dateRangeMode === 'custom_days' && (
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={config.customDays}
                      onChange={e =>
                        onUpdateConfig({ customDays: Math.max(1, parseInt(e.target.value, 10) || 7) })
                      }
                      className="w-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1 text-xs font-bold text-center text-slate-800 dark:text-slate-200"
                    />
                  )}
                  {config.dateRangeMode === 'custom_months' && (
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={config.customMonths}
                      onChange={e =>
                        onUpdateConfig({ customMonths: Math.max(1, parseInt(e.target.value, 10) || 1) })
                      }
                      className="w-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1 text-xs font-bold text-center text-slate-800 dark:text-slate-200"
                    />
                  )}
                </div>
                {config.dateRangeMode === 'specific_range' && (
                  <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                    <input
                      type="date"
                      value={config.startDate}
                      onChange={e => onUpdateConfig({ startDate: e.target.value })}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-[10px] text-slate-800 dark:text-slate-200"
                    />
                    <input
                      type="date"
                      value={config.endDate}
                      onChange={e => onUpdateConfig({ endDate: e.target.value })}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-[10px] text-slate-800 dark:text-slate-200"
                    />
                  </div>
                )}
              </div>

              {/* Helpful Votes */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                  <ThumbsUp className="w-3 h-3 text-amber-500" /> Helpful Likes Distribution
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-[10px] text-slate-500">Rate%:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={config.likesProbability ?? 70}
                      onChange={e =>
                        onUpdateConfig({
                          likesProbability: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0))
                        })
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-[10px] text-slate-500">Max:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={config.maxLikesPerReview ?? 14}
                      onChange={e =>
                        onUpdateConfig({
                          maxLikesPerReview: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0))
                        })
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery & Pacing */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                  <Zap className="w-3 h-3 text-emerald-500" /> Speed &amp; Publish Mode
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConfig({
                        generationPacing:
                          config.generationPacing === 'step_by_step' ? 'batch_fast' : 'step_by_step'
                      })
                    }
                    className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer truncate"
                  >
                    {config.generationPacing === 'step_by_step' ? 'Step-by-Step' : 'Fast Batch'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateConfig({ autoPublish: !config.autoPublish })}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer truncate ${
                      config.autoPublish
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {config.autoPublish ? 'Auto-Publish' : 'Stage Queue'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex items-start gap-2.5 sm:gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  isUser
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-tl-none'
                }`}
              >
                {/* Applied Adjustments Badges if AI automatically tuned settings */}
                {!isUser && Array.isArray(msg.appliedAdjustments) && msg.appliedAdjustments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    {msg.appliedAdjustments.map((badge, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" /> {badge}
                      </span>
                    ))}
                  </div>
                )}

                <div className="whitespace-pre-wrap space-y-1.5">
                  {msg.text.split('\n').map((line, idx) => {
                    const boldFormatted = line.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return (
                          <strong key={pIdx} className="font-bold">
                            {part.slice(2, -2)}
                          </strong>
                        );
                      }
                      return part;
                    });
                    return <div key={idx}>{boldFormatted}</div>;
                  })}
                </div>

                <div
                  className={`text-[9px] mt-2 flex items-center justify-between gap-2 ${
                    isUser ? 'text-indigo-200' : 'text-slate-400'
                  }`}
                >
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {msg.modelUsed && <span className="font-mono">{msg.modelUsed}</span>}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Per-App Generation Progress Tracker */}
        {(isGenerating || appProgressList.length > 0) && (
          <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-4 shadow-md space-y-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                {isGenerating ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  {isGenerating
                    ? 'Generating Crowd-Authentic Reviews...'
                    : 'Batch Generation Complete'}
                </span>
              </div>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                {appProgressList.reduce((acc, a) => acc + a.completedCount, 0)} /{' '}
                {appProgressList.reduce((acc, a) => acc + a.totalTarget, 0)} Reviews
              </span>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {appProgressList.map(item => {
                const pct =
                  item.totalTarget > 0
                    ? Math.min(100, Math.round((item.completedCount / item.totalTarget) * 100))
                    : 0;
                return (
                  <div
                    key={item.appId}
                    className={`p-2.5 rounded-xl border transition-all ${
                      item.status === 'generating'
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800/60'
                        : item.status === 'completed'
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/70 dark:border-emerald-900/40'
                        : item.status === 'error'
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.appIcon ? (
                          <img
                            src={item.appIcon}
                            alt=""
                            className="w-5 h-5 rounded-md object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {item.appName.slice(0, 1)}
                          </div>
                        )}
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.appName}
                        </span>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {item.completedCount} / {item.totalTarget}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          item.status === 'completed'
                            ? 'bg-emerald-500'
                            : item.status === 'error'
                            ? 'bg-rose-500'
                            : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {item.errorMsg && (
                      <p className="mt-1.5 text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                        {item.errorMsg}
                      </p>
                    )}

                    {item.lastReviewPreview && !item.errorMsg && (
                      <div className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 italic truncate bg-white/70 dark:bg-slate-900/70 px-2 py-1 rounded border border-slate-200/40 dark:border-slate-800/50">
                        {item.lastReviewPreview}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Bottom Strategy Presets & Chat Input Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
        {/* 1-Click Strategy Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {quickPresets.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isGenerating}
              onClick={() => onSendMessage(chip.prompt)}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/50 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 text-[11px] font-semibold whitespace-nowrap transition-colors border border-slate-200/70 dark:border-slate-700/70 cursor-pointer disabled:opacity-40"
            >
              <Sparkles className="w-3 h-3 inline mr-1 text-indigo-500" />
              {chip.label}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isGenerating}
              placeholder={
                selectedAppsCount > 0
                  ? `Tell AI how to adjust reviews for ${selectedAppsCount} selected app(s), or type "Generate now"...`
                  : 'Discuss strategy with AI (e.g. "Set 8 reviews per app, Flipkart + Play Store style")...'
              }
              className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
