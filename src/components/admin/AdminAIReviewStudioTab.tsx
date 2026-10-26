import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Layers, 
  Key, 
  Sparkles, 
  Square, 
  HardDrive,
  RotateCcw,
  Sliders,
  BrainCircuit,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { toast } from '../Toast';
import { 
  StudioConfig, 
  BrainMemoryDirective, 
  ChatMessage, 
  StagedReview 
} from './aistudio/types';
import { 
  loadStudioConfig, 
  saveStudioConfig, 
  loadBrainDirectives, 
  saveBrainDirectives, 
  loadChatHistory, 
  saveChatHistory, 
  loadStagedReviews, 
  saveStagedReviews, 
  loadSelectedAppIds, 
  saveSelectedAppIds,
  loadBrainDirectivesFromCloud,
  loadStudioConfigFromCloud
} from './aistudio/storage';
import { 
  sendChatMessageToGemini, 
  generateReviewsForAppWithGemini,
  detectConfigUpdatesFromChat
} from './aistudio/geminiEngine';
import { AppSelector } from './aistudio/AppSelector';
import { ChatWorkspace } from './aistudio/ChatWorkspace';
import { StagedQueue } from './aistudio/StagedQueue';
import { ApiKeyModal } from './aistudio/ApiKeyModal';
import { createAdminReviewItem } from '../../lib/communityFirebase';
import { mockApps } from '../../lib/staticData';

interface AdminAIReviewStudioTabProps {
  appsList: any[];
  onReviewsGenerated?: () => void;
}

export const AdminAIReviewStudioTab: React.FC<AdminAIReviewStudioTabProps> = ({
  appsList = [],
  onReviewsGenerated
}) => {
  // Navigation: 'studio' (Main Chat) | 'staged' (Queue Deck)
  const [activeTab, setActiveTab] = useState<'studio' | 'staged'>('studio');

  // Persistent State
  const [config, setConfig] = useState<StudioConfig>(loadStudioConfig);
  const [directives, setDirectives] = useState<BrainMemoryDirective[]>(loadBrainDirectives);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(loadChatHistory);
  const [stagedReviews, setStagedReviews] = useState<StagedReview[]>(loadStagedReviews);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>(() => {
    const saved = loadSelectedAppIds();
    if (saved.length > 0) return saved;
    return appsList.slice(0, 5).map(a => String(a.id || a.slug));
  });

  // Drawers & Modals
  const [showControlsDrawer, setShowControlsDrawer] = useState(false);
  const [showDirectives, setShowDirectives] = useState(false);
  const [appSearch, setAppSearch] = useState('');
  const [appCategory, setAppCategory] = useState('all');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isAppSelectorModalOpen, setIsAppSelectorModalOpen] = useState(false);

  // Async Execution States
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, percent: 0, currentAppName: '' });

  // Real-time AI Connection Status (Synced with API Key & Model)
  const [aiStatus, setAiStatus] = useState<{
    status: 'connected' | 'disconnected' | 'testing';
    latencyMs?: number;
    model: string;
  }>(() => {
    const hasKey = Boolean((config.apiKey || '').trim());
    return {
      status: hasKey ? 'connected' : 'disconnected',
      model: config.model || 'gemini-flash-latest'
    };
  });

  // Keep aiStatus continuously synchronized with stored config & key
  useEffect(() => {
    const hasKey = Boolean((config.apiKey || '').trim());
    setAiStatus(prev => ({
      ...prev,
      status: hasKey ? 'connected' : 'disconnected',
      model: config.model || 'gemini-flash-latest'
    }));
  }, [config.apiKey, config.model]);

  // Abort control ref for instantaneous Stop AI generation
  const abortGenerationRef = useRef<boolean>(false);

  // Sync to local storage (instant local-first, zero reloads)
  useEffect(() => { saveStudioConfig(config, false); }, [config]);
  useEffect(() => { saveBrainDirectives(directives, false); }, [directives]);
  useEffect(() => { saveChatHistory(chatHistory); }, [chatHistory]);
  useEffect(() => { saveStagedReviews(stagedReviews); }, [stagedReviews]);
  useEffect(() => { saveSelectedAppIds(selectedAppIds); }, [selectedAppIds]);

  // Load cloud directives & config on mount so they survive refresh and cache clearing
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cloudDirs = await loadBrainDirectivesFromCloud();
        if (mounted && cloudDirs && cloudDirs.length > 0) {
          setDirectives(cloudDirs);
        }
        const cloudConf = await loadStudioConfigFromCloud();
        if (mounted && cloudConf) {
          setConfig(prev => ({ ...prev, ...cloudConf }));
        }
      } catch (e) {
        console.warn('[AI Studio] Initial cloud load error:', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Handle immediate stop AI generation
  const handleStopGeneration = () => {
    if (!isGenerating) return;
    abortGenerationRef.current = true;
    setIsGenerating(false);
    const stopMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'assistant',
      text: '⏹ AI generation was stopped by Admin. Any reviews produced up to this point have been safely preserved in your Staged Deck.',
      timestamp: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, stopMsg]);
    toast('AI generation stopped. Progress saved.', 'info');
  };

  // Handle Chat message send
  const handleSendChatMessage = async (text: string) => {
    const lower = text.toLowerCase().trim();
    if (
      lower === 'stop' || 
      lower === 'cancel' || 
      lower.includes('stop generating') || 
      lower.includes('stop the working') ||
      lower.includes('stop ai')
    ) {
      if (isGenerating) {
        handleStopGeneration();
        return;
      }
    }

    const chatConfigUpdates = detectConfigUpdatesFromChat(text);
    if (!lower.startsWith('start') && !lower.startsWith('generate') && !lower.includes('stop')) {
      setConfig(prev => ({
        ...prev,
        ...chatConfigUpdates,
        activeSessionDirective: text.trim()
      }));
    } else if (Object.keys(chatConfigUpdates).length > 0) {
      setConfig(prev => ({ ...prev, ...chatConfigUpdates }));
    }

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    setIsSendingChat(true);

    try {
      const replyText = await sendChatMessageToGemini(text, updatedHistory, directives, config);
      const botMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, botMsg]);
    } catch (err: any) {
      toast(err.message || 'Error communicating with AI Brain', 'error');
    } finally {
      setIsSendingChat(false);
    }
  };

  // Add directive to Store Brain
  const handleAddDirective = (rule: string) => {
    const newDir: BrainMemoryDirective = {
      id: `dir_${Date.now()}`,
      rule,
      category: 'general',
      createdAt: new Date().toISOString(),
      active: true
    };
    const updated = [...directives, newDir];
    setDirectives(updated);
    saveBrainDirectives(updated, true);
    toast('New rule taught to Store Brain memory & cloud!', 'success');
  };

  const handleRemoveDirective = (id: string) => {
    const updated = directives.filter(d => d.id !== id);
    setDirectives(updated);
    saveBrainDirectives(updated, true);
  };

  // Core generation logic - 100% Local-First Memory (Zero Firestore Quota Burn)
  const handleExecuteGeneration = async (customInstruction?: string) => {
    // 90%+ Local-First Strategy: Search in-memory appsList, then local static mockApps backup
    const targets = selectedAppIds.map(targetId => {
      // 1. Primary check in in-memory catalog
      const inApps = appsList.find(a => 
        String(a.id || a.slug) === targetId || 
        String(a.id) === targetId || 
        a.slug === targetId
      );
      if (inApps && (inApps.description_html || inApps.seo_description)) {
        return inApps;
      }

      // 2. Local memory fallback from bundled mockApps (100% local, 0 Firestore reads)
      const inMock = (mockApps || []).find((a: any) => 
        String(a.id || a.slug) === targetId || 
        String(a.id) === targetId || 
        a.slug === targetId
      );
      if (inMock) {
        return inApps ? { ...inMock, ...inApps } : inMock;
      }

      return inApps || null;
    }).filter(Boolean);

    if (targets.length === 0) {
      toast('Please select at least 1 app from the catalog', 'error');
      setIsAppSelectorModalOpen(true);
      return;
    }

    let effectiveInstruction = customInstruction;
    if (!effectiveInstruction || effectiveInstruction.toLowerCase().startsWith('start')) {
      const recentUserThoughts = chatHistory
        .filter(m => 
          m.sender === 'user' && 
          !m.text.toLowerCase().startsWith('start') && 
          !m.text.toLowerCase().startsWith('generate now') &&
          m.text.trim().length > 3
        )
        .slice(-3)
        .map(m => m.text.trim());

      effectiveInstruction = recentUserThoughts.length > 0 
        ? recentUserThoughts.join(' | ') 
        : (config.activeSessionDirective || config.customTopic || 'Natural everyday user reviews based strictly on the app content stored on the website.');
    }

    abortGenerationRef.current = false;
    setIsGenerating(true);
    setBatchProgress({ current: 0, total: targets.length, percent: 0, currentAppName: targets[0]?.name || '' });

    let totalAutopilotGenerated = 0;
    let directPublishedCount = 0;

    for (let i = 0; i < targets.length; i++) {
      if (abortGenerationRef.current) break;

      const app = targets[i];
      const appTitle = app.name || app.title || `App ${i + 1}`;
      const appRatingStr = app.rating ? `${Number(app.rating).toFixed(1)}★` : '4.5★';

      setBatchProgress({
        current: i + 1,
        total: targets.length,
        percent: Math.round(((i + 1) / targets.length) * 100),
        currentAppName: appTitle
      });

      // Dedicated Step 1: Announce starting this individual app
      const stepStartMsg: ChatMessage = {
        id: `msg_start_${Date.now()}_${i}`,
        sender: 'assistant',
        text: `⏳ [${i + 1}/${targets.length}] Analyzing "${appTitle}" website content & directives... Generating ${config.reviewsPerApp} reviews now.`,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, stepStartMsg]);

      try {
        const generated = await generateReviewsForAppWithGemini(
          app,
          config.reviewsPerApp,
          directives,
          config,
          effectiveInstruction
        );

        if (abortGenerationRef.current) break;

        if (config.publishMode === 'auto_direct') {
          for (const review of generated) {
            if (abortGenerationRef.current) break;
            try {
              await createAdminReviewItem({
                appId: review.appId,
                appName: review.appName,
                appSlug: review.appSlug,
                userName: review.userName,
                rating: review.rating,
                reviewText: review.reviewText,
                timestamp: review.timestamp,
                status: 'published',
                helpful_count: typeof review.helpful_count === 'number' ? review.helpful_count : 1
              });
              directPublishedCount++;
            } catch (_) {}
          }
        } else {
          // 🚀 REAL-TIME AUTOPILOT STREAM: Immediately stock this app's reviews in Staged Deck!
          totalAutopilotGenerated += generated.length;
          setStagedReviews(prev => [...generated, ...prev]);
        }

        // Live Chat Progress Event
        const isLast = i === targets.length - 1;
        const liveMsg: ChatMessage = {
          id: `msg_auto_${Date.now()}_${i}`,
          sender: 'assistant',
          text: `✅ [${appTitle}] completed (${i + 1}/${targets.length})! Generated ${generated.length} reviews (Balanced to ${appRatingStr}) with realistic likes. ${!isLast ? `Pacing Google AI Studio quota before next app ("${targets[i + 1]?.name || 'Next'}") ...` : '🎉 Autopilot completed all selected apps!'}`,
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, liveMsg]);

        // Healthy 2.2s pacing delay between apps to prevent Google AI Studio 429 quota exhaustion
        if (!isLast && !abortGenerationRef.current) {
          await new Promise(resolve => setTimeout(resolve, 2200));
        }
      } catch (err: any) {
        console.warn(`[Autopilot] Error on ${appTitle}, continuing smoothly:`, err);
        const errMsg: ChatMessage = {
          id: `msg_auto_err_${Date.now()}_${i}`,
          sender: 'assistant',
          text: `⚠️ [${appTitle}] encountered a temporary issue (${err?.message || 'retry needed'}). Safely preserved all generated reviews and advancing to next app...`,
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, errMsg]);
      }
    }

    const wasStopped = abortGenerationRef.current;
    setIsGenerating(false);

    if (wasStopped) {
      toast(`Autopilot stopped! ${config.publishMode === 'auto_direct' ? directPublishedCount : totalAutopilotGenerated} reviews safely preserved.`, 'info');
    } else if (config.publishMode === 'auto_direct') {
      toast(`Directly posted ${directPublishedCount} reviews to Live Community!`, 'success');
      if (onReviewsGenerated) onReviewsGenerated();
    } else {
      toast(`Autopilot complete! ${totalAutopilotGenerated} reviews stocked across all apps.`, 'success');
    }
  };

  // Publish staged reviews for a single targeted app to Firestore Community
  const handlePublishAppToFirestore = async (appId: string) => {
    const appReviews = stagedReviews.filter(r => String(r.appId || r.appSlug || '') === appId);
    if (appReviews.length === 0) return;
    setIsPublishing(true);

    try {
      let publishedCount = 0;
      for (const review of appReviews) {
        await createAdminReviewItem({
          appId: review.appId,
          appName: review.appName,
          appSlug: review.appSlug,
          userName: review.userName,
          rating: review.rating,
          reviewText: review.reviewText,
          timestamp: review.timestamp,
          status: 'published',
          helpful_count: typeof review.helpful_count === 'number' ? review.helpful_count : 1
        });
        publishedCount++;
      }

      setStagedReviews(prev => prev.filter(r => String(r.appId || r.appSlug || '') !== appId));
      toast(`Successfully published ${publishedCount} reviews for ${appReviews[0]?.appName || 'app'} to Live Community!`, 'success');
      if (onReviewsGenerated) onReviewsGenerated();
    } catch (err: any) {
      toast(`Error publishing: ${err.message}`, 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClearAppReviews = (appId: string) => {
    setStagedReviews(prev => prev.filter(r => String(r.appId || r.appSlug || '') !== appId));
    toast('Cleared reviews for this app', 'info');
  };

  // Publish all staged reviews to Firestore Community (Write-Only)
  const handlePublishAllToFirestore = async () => {
    if (stagedReviews.length === 0) return;
    setIsPublishing(true);

    try {
      let publishedCount = 0;
      for (const review of stagedReviews) {
        await createAdminReviewItem({
          appId: review.appId,
          appName: review.appName,
          appSlug: review.appSlug,
          userName: review.userName,
          rating: review.rating,
          reviewText: review.reviewText,
          timestamp: review.timestamp,
          status: 'published',
          helpful_count: typeof review.helpful_count === 'number' ? review.helpful_count : 1
        });
        publishedCount++;
      }

      setStagedReviews([]);
      toast(`Successfully published ${publishedCount} reviews to Live Community!`, 'success');
      if (onReviewsGenerated) onReviewsGenerated();
    } catch (err: any) {
      toast(`Error publishing: ${err.message}`, 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const totalReviewsToProduce = selectedAppIds.length * config.reviewsPerApp;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sleek Master Single Navigation Bar - No Layer Shift, No Dual Boxes */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-2 shadow-xs z-20 flex-shrink-0 flex-wrap">
        {/* Left: Master AI Studio branding + Hard Disk indicator + Target Apps button */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
            <Bot className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <span className="hidden xs:inline">Master AI Studio</span>
            <span className="xs:hidden">AI Studio</span>
          </div>

          <div 
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            title="Local Storage Hard Disk: 100% website admin content • Zero Firestore read quota burn"
          >
            <HardDrive className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-blue-500 dark:text-blue-400" />
            <span className="hidden sm:inline text-[11px]">Hard Disk</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>

          <button
            type="button"
            onClick={() => setIsAppSelectorModalOpen(true)}
            className="px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1 sm:gap-1.5 transition cursor-pointer active:scale-95 shadow-xs"
            title="Select target catalog apps"
          >
            <Layers className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Target ({selectedAppIds.length})</span>
          </button>
        </div>

        {/* Center: Rotating system / Generation Progress / Queued Summary */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          {isGenerating ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 font-medium animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin flex-shrink-0" />
              <span>Generating app {batchProgress.current} of {batchProgress.total}</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">({batchProgress.percent}%)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{totalReviewsToProduce} comments queued</span>
            </div>
          )}
        </div>

        {/* Right: Staged Deck, Key, Settings, Memory, Generate/Stop, Reset */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Staged Deck Toggle */}
          <button
            onClick={() => setActiveTab(activeTab === 'studio' ? 'staged' : 'studio')}
            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 text-xs cursor-pointer ${
              activeTab === 'staged' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{activeTab === 'staged' ? 'Back to Chat' : 'Staged Deck'}</span>
            {stagedReviews.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                {stagedReviews.length}
              </span>
            )}
          </button>

          {/* API Key Modal Trigger with Live Connection Indicator */}
          <button
            onClick={() => setIsApiKeyModalOpen(true)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              aiStatus.status === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20'
            }`}
            title="Configure Gemini Model & API Key"
          >
            <Key className={`w-3.5 h-3.5 ${aiStatus.status === 'connected' ? 'text-emerald-500' : 'text-rose-500'}`} />
            <span className={`w-1.5 h-1.5 rounded-full ${aiStatus.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="font-bold text-[11px]">
              {aiStatus.status === 'connected'
                ? `AI Connected (${aiStatus.model.replace('gemini-', '').replace('-latest', '')})`
                : 'Set Key'}
            </span>
          </button>

          {/* Settings Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowControlsDrawer(!showControlsDrawer)}
            className={`px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 font-bold cursor-pointer active:scale-95 text-xs ${
              showControlsDrawer
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
            title="Configure Reviews per App, Tone, Timeline, and Target"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span className="hidden sm:inline">Settings</span>
            {showControlsDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Store Directives Memory Toggle */}
          <button
            type="button"
            onClick={() => setShowDirectives(!showDirectives)}
            className={`px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 font-bold cursor-pointer active:scale-95 text-xs ${
              showDirectives
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
            title="Persistent Directives"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span className="hidden md:inline">Memory</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-950 text-emerald-700 dark:text-emerald-400 font-bold">
              {directives.filter(d => d.active).length}
            </span>
          </button>

          {/* Generate / Stop AI Execution Button */}
          {isGenerating ? (
            <button
              type="button"
              onClick={handleStopGeneration}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black transition flex items-center gap-1.5 shadow-md shadow-rose-950 animate-pulse cursor-pointer active:scale-95 text-xs"
              title="Stop AI Generation"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop AI</span>
            </button>
          ) : (
            <button
              disabled={selectedAppIds.length === 0}
              onClick={() => handleExecuteGeneration()}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 text-xs"
              title="Generate Reviews for Selected Apps"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate ({totalReviewsToProduce})</span>
            </button>
          )}

          {/* Reset Chat History */}
          <button
            type="button"
            onClick={() => setChatHistory([])}
            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="Reset Chat History"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Autopilot Real-time Stream Banner (when active) */}
      {isGenerating && (
        <div className="bg-emerald-50 dark:bg-emerald-950/90 border-b border-emerald-200 dark:border-emerald-500/40 px-3 sm:px-4 py-2 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 flex-shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping flex-shrink-0" />
            <div className="truncate">
              <span className="font-bold text-emerald-900 dark:text-white">
                Autopilot running: App {batchProgress.current} of {batchProgress.total}
              </span>
              {batchProgress.currentAppName && (
                <span className="text-emerald-700 dark:text-emerald-300 font-bold ml-1.5 truncate">
                  • {batchProgress.currentAppName}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {activeTab === 'staged' ? (
              <button
                type="button"
                onClick={() => setActiveTab('studio')}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-xs active:scale-95"
                title="Return to Chat while Autopilot continues in background"
              >
                <span>Back to Chat</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('staged')}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-xs active:scale-95"
                title="Inspect real-time stocked reviews while Autopilot runs"
              >
                <Layers className="w-3 h-3" />
                <span>View Staged Stock ({stagedReviews.length})</span>
              </button>
            )}

            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{batchProgress.percent}%</span>
            <button
              type="button"
              onClick={handleStopGeneration}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-xs"
              title="Stop Autopilot immediately"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          </div>
        </div>
      )}

      {/* Full Body Workspace: Expands to 100% of the screen height & width on any device */}
      <div className="flex-1 h-full min-h-0 flex flex-col w-full overflow-hidden">
        {activeTab === 'studio' ? (
          <ChatWorkspace
            chatHistory={chatHistory}
            directives={directives}
            selectedAppIds={selectedAppIds}
            appsCount={appsList.length}
            config={config}
            onChangeConfig={updates => {
              setConfig(prev => {
                const next = { ...prev, ...updates };
                saveStudioConfig(next, true);
                return next;
              });
            }}
            onSendMessage={handleSendChatMessage}
            onAddDirective={handleAddDirective}
            onRemoveDirective={handleRemoveDirective}
            onClearChat={() => setChatHistory([])}
            onTriggerGeneration={handleExecuteGeneration}
            onStopGeneration={handleStopGeneration}
            onOpenAppSelector={() => setIsAppSelectorModalOpen(true)}
            isGenerating={isGenerating}
            isSendingChat={isSendingChat}
            batchProgress={batchProgress}
            showControlsDrawer={showControlsDrawer}
            setShowControlsDrawer={setShowControlsDrawer}
            showDirectives={showDirectives}
            setShowDirectives={setShowDirectives}
            aiStatus={aiStatus}
          />
        ) : (
          <StagedQueue
            stagedReviews={stagedReviews}
            onDeleteReview={id => setStagedReviews(prev => prev.filter(r => r.id !== id))}
            onClearAll={() => setStagedReviews([])}
            onClearAppReviews={handleClearAppReviews}
            onUpdateReview={(id, updates) =>
              setStagedReviews(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)))
            }
            onPublishAllToFirestore={handlePublishAllToFirestore}
            onPublishAppToFirestore={handlePublishAppToFirestore}
            isPublishing={isPublishing}
            onBackToChat={() => setActiveTab('studio')}
          />
        )}
      </div>

      {/* Full Dedicated App Selector Modal */}
      {isAppSelectorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full h-full sm:h-[92vh] sm:max-h-[800px] max-w-4xl shadow-2xl rounded-none sm:rounded-2xl overflow-hidden border-0 sm:border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            <AppSelector
              appsList={appsList}
              selectedAppIds={selectedAppIds}
              onChangeSelection={setSelectedAppIds}
              searchQuery={appSearch}
              setSearchQuery={setAppSearch}
              selectedCategory={appCategory}
              setSelectedCategory={setAppCategory}
              onClose={() => setIsAppSelectorModalOpen(false)}
              isModal={true}
              aiStatus={aiStatus}
            />
          </div>
        </div>
      )}

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        config={config}
        onSaveConfig={updates => {
          setConfig(prev => {
            const next = { ...prev, ...updates };
            saveStudioConfig(next, true);
            return next;
          });
          if (updates.apiKey) {
            setAiStatus({
              status: 'connected',
              model: updates.model || config.model || 'gemini-flash-latest'
            });
            toast('Gemini API key saved & AI connected!', 'success');
          }
        }}
      />
    </div>
  );
};

export default AdminAIReviewStudioTab;
