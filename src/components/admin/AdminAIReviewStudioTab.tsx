import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Sparkles,
  Key,
  Layers,
  MessageSquare,
  CheckCircle2,
  Trash2,
  Edit3,
  UploadCloud,
  Brain,
  Plus,
  History,
  Check,
  X,
  ShieldAlert,
  Activity,
  Wifi,
  AlertCircle,
  Loader2,
  Cpu,
  Smartphone
} from 'lucide-react';
import {
  StudioConfig,
  StagedReview,
  ChatMessage,
  AIStudioBrainMemory,
  BrainDirective,
  AppGenerationProgress,
  AIConnectionStatus
} from './aistudio/types';
import {
  loadStudioConfig,
  saveStudioConfig,
  loadStagedReviews,
  saveStagedReviews,
  loadChatHistory,
  saveChatHistory,
  loadBrainMemory,
  saveBrainMemory,
  appendBrainActionLog,
  recordAppsGeneratedInBrain,
  loadStudioSettingsFromCloud,
  normalizeClientModelId
} from './aistudio/storage';
import {
  generateReviewsForAppWithGemini,
  sendChatMessageToGemini,
  verifyStudioConnection,
  SUPPORTED_GEMINI_MODELS
} from './aistudio/geminiEngine';
import { formatReviewDatePreview } from './aistudio/dateEngine';
import { ApiKeyModal } from './aistudio/ApiKeyModal';
import { AppSelector } from './aistudio/AppSelector';
import { ChatWorkspace } from './aistudio/ChatWorkspace';
import { toast } from '../Toast';
import {
  createAdminReviewItem,
  batchCreateAdminReviews,
  registerCatalogAppsForReviews,
  fetchAdminAppReviewCounts,
  getConsolidatedReviewsForApp
} from '../../lib/communityFirebase';

interface AdminAIReviewStudioTabProps {
  appsList: any[];
  newsList?: any[];
  videosList?: any[];
  faqsList?: any[];
  developersList?: any[];
  settings?: any;
  handleSaveSettings?: (newSettings: any) => void;
}

export const AdminAIReviewStudioTab: React.FC<AdminAIReviewStudioTabProps> = ({
  appsList = [],
  newsList = [],
  videosList = [],
  faqsList = [],
  developersList = [],
  settings,
  handleSaveSettings
}) => {
  const [config, setConfig] = useState<StudioConfig>(() =>
    loadStudioConfig(settings?.gemini_api_key, settings?.gemini_model)
  );
  const configRef = useRef<StudioConfig>(config);
  const userModifiedConfigRef = useRef<boolean>(false);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const [stagedReviews, setStagedReviews] = useState<StagedReview[]>(() => loadStagedReviews());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => loadChatHistory());
  const [brainMemory, setBrainMemory] = useState<AIStudioBrainMemory>(() => loadBrainMemory());

  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [appReviewCounts, setAppReviewCounts] = useState<Record<string, number>>({});
  const [activeView, setActiveView] = useState<'workspace' | 'queue' | 'brain'>('workspace');
  const [mobileShowAppsDrawer, setMobileShowAppsDrawer] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [appProgressList, setAppProgressList] = useState<AppGenerationProgress[]>([]);

  // Live Backend Connection Status
  const [connectionStatus, setConnectionStatus] = useState<AIConnectionStatus>(() => ({
    state: 'checking',
    model: normalizeClientModelId(config.model)
  }));

  // Inline editing state for Staged Queue
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    authorName: string;
    rating: number;
    content: string;
    createdAt: string;
    helpfulCount: number;
  } | null>(null);
  const [queueFilterAppId, setQueueFilterAppId] = useState<string>('all');

  // Brain directive form state
  const [newDirectiveText, setNewDirectiveText] = useState('');
  const [newDirectiveCategory, setNewDirectiveCategory] = useState<BrainDirective['category']>('custom');

  // Run live backend verification of current key + model
  const runLiveConnectionCheck = useCallback(async (overrideKey?: string, overrideModel?: string) => {
    const keyToTest = overrideKey !== undefined ? overrideKey : configRef.current.apiKey;
    const modelToTest = normalizeClientModelId(overrideModel || configRef.current.model);

    setConnectionStatus(prev => ({
      ...prev,
      state: 'checking',
      model: modelToTest
    }));

    const status = await verifyStudioConnection(keyToTest, modelToTest);
    setConnectionStatus(status);
    return status;
  }, []);

  useEffect(() => {
    registerCatalogAppsForReviews(Array.isArray(appsList) ? appsList : []);
  }, [appsList]);

  // Initial Cloud Settings Sync + Live Connection Check
  useEffect(() => {
    let mounted = true;
    registerCatalogAppsForReviews(Array.isArray(appsList) ? appsList : []);

    fetchAdminAppReviewCounts()
      .then(counts => {
        if (!mounted || !counts) return;
        const mapped: Record<string, number> = {};
        const rawMap = counts.appCounts || counts || {};
        Object.entries(rawMap).forEach(([k, v]: [string, any]) => {
          if (k === 'globalStats' || k === 'appCounts') return;
          mapped[k] = typeof v === 'number' ? v : v?.total || 0;
        });
        setAppReviewCounts(mapped);
      })
      .catch(() => {});

    // Immediately run connection check with current local config (takes ~120ms)
    runLiveConnectionCheck(configRef.current.apiKey, configRef.current.model);

    loadStudioSettingsFromCloud()
      .then(async cloud => {
        if (!mounted || userModifiedConfigRef.current) return;

        let shouldRecheck = false;
        let effectiveKey = configRef.current.apiKey;
        let effectiveModel = configRef.current.model;

        if (cloud.config) {
          const cloudUpdated = cloud.config.updatedAt || 0;
          const localUpdated = configRef.current.updatedAt || 0;

          setConfig(prev => {
            if (userModifiedConfigRef.current) return prev;

            const next: StudioConfig =
              cloudUpdated > localUpdated
                ? { ...prev, ...cloud.config }
                : { ...cloud.config, ...prev };

            if (!prev.apiKey && cloud.config?.apiKey) {
              next.apiKey = cloud.config.apiKey;
              shouldRecheck = true;
            } else if (prev.apiKey) {
              next.apiKey = prev.apiKey;
            }

            if (prev.model && localUpdated >= cloudUpdated) {
              next.model = normalizeClientModelId(prev.model);
            } else if (cloud.config?.model) {
              const cloudModel = normalizeClientModelId(cloud.config.model);
              if (cloudModel !== prev.model) shouldRecheck = true;
              next.model = cloudModel;
            }

            effectiveKey = next.apiKey;
            effectiveModel = next.model;
            configRef.current = next;
            return next;
          });
        }

        if (cloud.brain) {
          setBrainMemory(prev => {
            const merged = { ...prev, ...cloud.brain };
            saveBrainMemory(merged);
            return merged;
          });
        }

        if (shouldRecheck && !userModifiedConfigRef.current) {
          await runLiveConnectionCheck(effectiveKey, effectiveModel);
        }
      })
      .catch(() => {});

    const handleExternalSync = (e: Event) => {
      const customEvt = e as CustomEvent<StudioConfig>;
      if (customEvt.detail && typeof customEvt.detail === 'object') {
        const synced = customEvt.detail;
        if (
          synced.apiKey !== configRef.current.apiKey ||
          synced.model !== configRef.current.model
        ) {
          configRef.current = synced;
          setConfig(synced);
          runLiveConnectionCheck(synced.apiKey, synced.model);
        }
      }
    };
    window.addEventListener('aistudio-config-sync', handleExternalSync);

    return () => {
      mounted = false;
      window.removeEventListener('aistudio-config-sync', handleExternalSync);
    };
  }, [runLiveConnectionCheck]);

  // Persist staged reviews and chat history
  useEffect(() => {
    saveStagedReviews(stagedReviews);
  }, [stagedReviews]);

  useEffect(() => {
    saveChatHistory(chatMessages);
  }, [chatMessages]);

  const handleUpdateConfig = useCallback(
    (partial: Partial<StudioConfig>, verifyIfModelOrKeyChanged = false) => {
      userModifiedConfigRef.current = true;
      setConfig(prev => {
        const next = saveStudioConfig({
          ...prev,
          ...partial,
          model: normalizeClientModelId(partial.model || prev.model),
          updatedAt: Date.now()
        });
        configRef.current = next;

        if (verifyIfModelOrKeyChanged || partial.apiKey !== undefined || partial.model !== undefined) {
          runLiveConnectionCheck(next.apiKey, next.model);
        }

        return next;
      });
    },
    [runLiveConnectionCheck]
  );

  const handleSaveFromModal = useCallback(
    (newConfig: StudioConfig, newStatus: AIConnectionStatus) => {
      userModifiedConfigRef.current = true;
      const saved = saveStudioConfig(newConfig);
      configRef.current = saved;
      setConfig(saved);
      setConnectionStatus(newStatus);

      if (newStatus.state === 'connected') {
        toast(`Connected to ${newStatus.model} (${newStatus.latencyMs}ms)`, 'success');
      } else if (newStatus.errorMessage) {
        toast(newStatus.errorMessage, 'error');
      }
    },
    []
  );

  const handleToggleApp = (appId: string) => {
    setSelectedAppIds(prev =>
      prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
    );
  };

  const handleSelectBatchApps = (ids: string[]) => {
    setSelectedAppIds(ids);
  };

  const selectedApps = useMemo(() => {
    return appsList.filter(a => selectedAppIds.includes(String(a.id)));
  }, [appsList, selectedAppIds]);

  const publishSingleReviewToCloud = async (review: StagedReview): Promise<boolean> => {
    try {
      const matchedApp = appsList.find(
        a =>
          String(a.id || '').toLowerCase() === String(review.appId || '').toLowerCase() ||
          String(a.slug || '').toLowerCase() === String(review.appId || '').toLowerCase()
      );
      await createAdminReviewItem({
        appId: String(matchedApp?.id || review.appId || ''),
        appSlug: String(matchedApp?.slug || ''),
        appName: String(matchedApp?.name || review.appName || ''),
        userName: review.authorName,
        rating: review.rating,
        reviewText: review.content,
        status: 'published',
        isPinned: review.isPinned,
        timestamp: review.createdAt,
        helpful_count: review.helpfulCount
      });
      return true;
    } catch (e) {
      console.error('Failed to publish review:', e);
      return false;
    }
  };

  const handleExecuteGeneration = async (
    customPromptInstruction?: string,
    overrideConfig?: StudioConfig
  ) => {
    const activeConfig = overrideConfig || configRef.current;

    if (selectedApps.length === 0) {
      toast('Please select at least 1 target app on the left panel first.', 'error');
      setMobileShowAppsDrawer(true);
      return;
    }

    // Verify backend connection if missing/invalid key
    if (
      connectionStatus.state === 'missing_key' ||
      connectionStatus.state === 'invalid_key'
    ) {
      const recheck = await runLiveConnectionCheck(activeConfig.apiKey, activeConfig.model);
      if (recheck.state !== 'connected') {
        toast(
          recheck.errorMessage || 'Please add a valid Google AI Studio API Key first.',
          'error'
        );
        setIsKeyModalOpen(true);
        return;
      }
    }

    setIsGenerating(true);
    const totalApps = selectedApps.length;
    const perApp = Math.max(1, Math.min(50, Number(activeConfig.reviewsPerApp) || 5));

    const initialProgress: AppGenerationProgress[] = selectedApps.map(app => ({
      appId: String(app.id),
      appName: app.name || app.title || 'App',
      appIcon: app.icon || app.icon_url || app.logo || '',
      totalTarget: perApp,
      completedCount: 0,
      status: 'waiting'
    }));
    setAppProgressList(initialProgress);

    const startMsgId = `gen-${Date.now()}`;
    setChatMessages(prev => [
      ...prev,
      {
        id: startMsgId,
        role: 'assistant',
        text: `🚀 **Starting Marketplace Crowd Generation (${activeConfig.model})**\n\n- **Target Apps (${totalApps})**: ${selectedApps
          .slice(0, 6)
          .map(a => a.name || a.title)
          .join(', ')}${totalApps > 6 ? ` +${totalApps - 6} more` : ''}\n- **Volume**: ${perApp} reviews/app (${
          totalApps * perApp
        } total)\n- **Style**: \`${activeConfig.marketplaceStyle}\` • **Rating Curve**: \`${
          activeConfig.ratingMix
        }\`\n- **Active Strategy Brief**: ${
          activeConfig.activeSessionDirective || customPromptInstruction || 'Deep Dossier + Crowd Mix'
        }`,
        timestamp: new Date().toISOString(),
        isGenerating: true,
        modelUsed: activeConfig.model
      }
    ]);

    const newlyGenerated: StagedReview[] = [];
    let publishedCount = 0;
    let failedAppsCount = 0;
    let firstErrorMsg = '';

    for (let i = 0; i < selectedApps.length; i++) {
      const app = selectedApps[i];
      const currentAppId = String(app.id);

      setAppProgressList(prev =>
        prev.map(item =>
          item.appId === currentAppId ? { ...item, status: 'generating', completedCount: 0 } : item
        )
      );

      try {
        let existingReviewsForThisApp: { authorName?: string; content?: string }[] = [];
        try {
          const rawList = getConsolidatedReviewsForApp(currentAppId);
          if (Array.isArray(rawList)) {
            existingReviewsForThisApp = rawList.map((r: any) => ({
              authorName: r.userName || r.authorName,
              content: r.reviewText || r.content
            }));
          }
        } catch (_) {}

        const stagedForThisApp = stagedReviews
          .filter(r => r.appId === currentAppId)
          .map(r => ({ authorName: r.authorName, content: r.content }));

        const combinedExisting = [
          ...existingReviewsForThisApp,
          ...stagedForThisApp,
          ...newlyGenerated
            .filter(r => r.appId === currentAppId)
            .map(r => ({ authorName: r.authorName, content: r.content }))
        ];

        const batch = await generateReviewsForAppWithGemini(
          app,
          activeConfig,
          customPromptInstruction,
          (reviewItem, currentIdx, totalTarget) => {
            setAppProgressList(prev =>
              prev.map(item =>
                item.appId === currentAppId
                  ? {
                      ...item,
                      completedCount: currentIdx,
                      totalTarget,
                      status: currentIdx >= totalTarget ? 'completed' : 'generating',
                      lastReviewPreview: `${reviewItem.authorName} (${reviewItem.rating}★ • ${
                        reviewItem.personaTag || 'User'
                      }): "${reviewItem.content.slice(0, 85)}..."`
                    }
                  : item
              )
            );
          },
          brainMemory.directives,
          combinedExisting,
          chatMessages
        );

        if (activeConfig.autoPublish) {
          for (const rev of batch) {
            const ok = await publishSingleReviewToCloud(rev);
            if (ok) {
              publishedCount++;
              rev.status = 'published';
              setAppReviewCounts(prev => ({
                ...prev,
                [rev.appId]: (prev[rev.appId] || 0) + 1
              }));
            } else {
              newlyGenerated.push(rev);
            }
          }
        } else {
          newlyGenerated.push(...batch);
        }

        setAppProgressList(prev =>
          prev.map(item =>
            item.appId === currentAppId
              ? { ...item, completedCount: batch.length, status: 'completed' }
              : item
          )
        );
      } catch (err: any) {
        failedAppsCount++;
        const errMsg = err?.message || 'Generation failed';
        if (!firstErrorMsg) firstErrorMsg = errMsg;
        setAppProgressList(prev =>
          prev.map(item =>
            item.appId === currentAppId
              ? { ...item, status: 'error', errorMsg: errMsg }
              : item
          )
        );
      }
    }

    if (newlyGenerated.length > 0) {
      setStagedReviews(prev => [...newlyGenerated, ...prev]);
    }

    const totalDone = newlyGenerated.length + publishedCount;
    if (totalDone > 0) {
      const generatedAppIds = selectedApps.map(a => String(a.id));
      const generatedAppNames = selectedApps.map(a => a.name || a.title || 'App');
      setBrainMemory(prev => {
        const withApps = recordAppsGeneratedInBrain(prev, generatedAppIds);
        return appendBrainActionLog(
          withApps,
          activeConfig.autoPublish ? 'published' : 'generated',
          `${
            activeConfig.autoPublish ? 'Auto-published' : 'Generated & staged'
          } ${totalDone} crowd-authentic reviews (${activeConfig.marketplaceStyle}) across ${
            selectedApps.length
          } app(s)`,
          generatedAppNames,
          totalDone
        );
      });
    }

    setIsGenerating(false);

    if (totalDone > 0) {
      const samplePreview = (newlyGenerated[0] || null)
        ? `\n\n**Sample Generated Review (${newlyGenerated[0].appName} — ${newlyGenerated[0].personaTag})**:\n> *"${newlyGenerated[0].content}"* — **${newlyGenerated[0].authorName}** (${newlyGenerated[0].rating}★)`
        : '';

      const summaryText = activeConfig.autoPublish
        ? `✅ **Auto-Publish Complete!** Published **${publishedCount} authentic reviews** directly to live Community Firestore.${samplePreview}`
        : `✅ **Staged ${newlyGenerated.length} Authentic Reviews!**\n\nEvery review was crafted using each app's real catalog dossier, your active session strategy, and **${activeConfig.marketplaceStyle}** personas.${samplePreview}\n\nOpen the **Staged Queue (${
            stagedReviews.length + newlyGenerated.length
          })** tab above to inspect, edit, or publish them live.`;

      setChatMessages(prev =>
        prev.map(m =>
          m.id === startMsgId
            ? { ...m, text: summaryText, isGenerating: false, generatedCount: totalDone }
            : m
        )
      );
      toast(
        activeConfig.autoPublish
          ? `Published ${publishedCount} reviews live!`
          : `Staged ${newlyGenerated.length} reviews in queue!`,
        'success'
      );
    } else {
      setChatMessages(prev =>
        prev.map(m =>
          m.id === startMsgId
            ? {
                ...m,
                text: `❌ **Generation Halted**\n\n${
                  firstErrorMsg ||
                  'Could not generate reviews. Please check your API key and selected model in API Key & Model settings.'
                }`,
                isGenerating: false
              }
            : m
        )
      );
      toast(firstErrorMsg || 'Review generation failed. Check API Key & Model.', 'error');
    }
  };

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    const updatedHistory = [...chatMessages, userMsg];
    setChatMessages(updatedHistory);

    const lower = text.toLowerCase().trim();
    const isDirectGenerateCommand =
      lower === 'generate' ||
      lower === 'generate now' ||
      lower === 'start' ||
      lower === 'start generating' ||
      lower === 'go ahead and generate';

    if (isDirectGenerateCommand && selectedApps.length > 0) {
      await handleExecuteGeneration(configRef.current.activeSessionDirective);
      return;
    }

    const thinkingId = `thinking-${Date.now()}`;
    setChatMessages(prev => [
      ...prev,
      {
        id: thinkingId,
        role: 'assistant',
        text: 'Analyzing app dossiers & updating your session strategy...',
        timestamp: new Date().toISOString()
      }
    ]);

    const coPilotRes = await sendChatMessageToGemini(
      text,
      updatedHistory,
      configRef.current,
      selectedApps,
      brainMemory.directives,
      {
        allApps: appsList,
        newsList,
        videosList,
        faqsList,
        developersList,
        settings
      }
    );

    // Apply any structured config adjustments returned by the AI Co-Pilot
    let nextConfig = { ...configRef.current };
    const patchObj: Partial<StudioConfig> = {};

    if (coPilotRes.configPatches && typeof coPilotRes.configPatches === 'object') {
      const p = coPilotRes.configPatches;
      if (typeof p.reviewsPerApp === 'number' && p.reviewsPerApp >= 1 && p.reviewsPerApp <= 50) {
        patchObj.reviewsPerApp = p.reviewsPerApp;
      }
      if (p.ratingMix) patchObj.ratingMix = p.ratingMix;
      if (p.marketplaceStyle) patchObj.marketplaceStyle = p.marketplaceStyle;
      if (p.lengthDistribution) patchObj.lengthDistribution = p.lengthDistribution;
      if (p.languageMix) patchObj.languageMix = p.languageMix;
      if (Array.isArray(p.focusTopics) && p.focusTopics.length > 0) {
        patchObj.focusTopics = p.focusTopics;
      }
      if (p.humanImperfectionLevel) patchObj.humanImperfectionLevel = p.humanImperfectionLevel;
      if (typeof p.customDays === 'number' && p.customDays >= 1) {
        patchObj.dateRangeMode = 'custom_days';
        patchObj.customDays = p.customDays;
      }
      if (typeof p.likesProbability === 'number') patchObj.likesProbability = p.likesProbability;
      if (typeof p.maxLikesPerReview === 'number') patchObj.maxLikesPerReview = p.maxLikesPerReview;
      if (typeof p.autoPublish === 'boolean') patchObj.autoPublish = p.autoPublish;
    }

    if (coPilotRes.compiledStrategyBrief) {
      patchObj.activeSessionDirective = coPilotRes.compiledStrategyBrief;
    } else if (!coPilotRes.error) {
      patchObj.activeSessionDirective = text;
    }

    if (Object.keys(patchObj).length > 0) {
      nextConfig = saveStudioConfig({
        ...nextConfig,
        ...patchObj,
        updatedAt: Date.now()
      });
      configRef.current = nextConfig;
      setConfig(nextConfig);
    }

    setChatMessages(prev =>
      prev.map(m =>
        m.id === thinkingId
          ? {
              ...m,
              text: coPilotRes.reply,
              appliedAdjustments: coPilotRes.appliedAdjustments,
              modelUsed: coPilotRes.modelUsed || nextConfig.model
            }
          : m
      )
    );

    // If the user's message also explicitly asked to generate reviews now and apps are selected, trigger generation with the newly updated config!
    const wantsImmediateGen =
      !coPilotRes.error &&
      selectedApps.length > 0 &&
      (lower.includes('generate now') ||
        lower.includes('start generating') ||
        (lower.startsWith('generate ') && lower.includes('review')));

    if (wantsImmediateGen) {
      await handleExecuteGeneration(nextConfig.activeSessionDirective, nextConfig);
    }
  };

  const handleClearChat = () => {
    handleUpdateConfig({ activeSessionDirective: '' });
    const fresh: ChatMessage[] = [
      {
        id: `reset-${Date.now()}`,
        role: 'assistant',
        text: 'Session chat and strategy brief reset! Select target apps on the left and tell me how you want today’s reviews styled, or click **Generate**.',
        timestamp: new Date().toISOString()
      }
    ];
    setChatMessages(fresh);
    saveChatHistory(fresh);
    toast('Chat history & session strategy reset', 'info');
  };

  const handlePublishAllStaged = async (targetAppId?: string) => {
    const toPublish =
      targetAppId && targetAppId !== 'all'
        ? stagedReviews.filter(r => r.appId === targetAppId)
        : stagedReviews;

    if (toPublish.length === 0 || isPublishing) return;
    setIsPublishing(true);

    registerCatalogAppsForReviews(appsList);

    const remaining: StagedReview[] =
      targetAppId && targetAppId !== 'all'
        ? stagedReviews.filter(r => r.appId !== targetAppId)
        : [];

    try {
      const payload = toPublish.map(review => {
        const matchedApp = appsList.find(
          a =>
            String(a.id || '').toLowerCase() === String(review.appId || '').toLowerCase() ||
            String(a.slug || '').toLowerCase() === String(review.appId || '').toLowerCase()
        );
        return {
          appId: String(matchedApp?.id || review.appId || ''),
          appSlug: String(matchedApp?.slug || ''),
          appName: String(matchedApp?.name || review.appName || ''),
          userName: review.authorName,
          rating: review.rating,
          reviewText: review.content,
          status: 'published' as const,
          isPinned: review.isPinned,
          timestamp: review.createdAt,
          helpful_count: review.helpfulCount
        };
      });

      const created = await batchCreateAdminReviews(payload);
      const successCount = created.length;

      setStagedReviews(remaining);
      setIsPublishing(false);

      if (successCount > 0) {
        const publishedApps = Array.from(new Set(toPublish.map(r => r.appName)));
        const publishedIds = Array.from(new Set(toPublish.map(r => r.appId)));
        setBrainMemory(prev => {
          const withApps = recordAppsGeneratedInBrain(prev, publishedIds);
          return appendBrainActionLog(
            withApps,
            'published',
            `Published ${successCount} staged reviews to live Community Firestore`,
            publishedApps,
            successCount
          );
        });
        toast(`Published ${successCount} reviews to live database!`, 'success');
      }
    } catch (e) {
      setIsPublishing(false);
      toast('Error publishing staged reviews. Please retry.', 'error');
    }
  };

  const handleAddBrainDirective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDirectiveText.trim()) return;
    const newDir: BrainDirective = {
      id: `dir-${Date.now()}`,
      rule: newDirectiveText.trim(),
      category: newDirectiveCategory,
      active: true,
      createdAt: new Date().toISOString()
    };
    setBrainMemory(prev => {
      const updated = {
        ...prev,
        directives: [newDir, ...prev.directives]
      };
      return appendBrainActionLog(
        updated,
        'directive_added',
        `Added permanent [${newDirectiveCategory}] rule: "${newDir.rule}"`,
        [],
        1
      );
    });
    setNewDirectiveText('');
    toast('Permanent rule added to AI Studio Brain!', 'success');
  };

  const handleToggleDirective = (id: string) => {
    setBrainMemory(prev => {
      const updated = {
        ...prev,
        directives: prev.directives.map(d => (d.id === id ? { ...d, active: !d.active } : d))
      };
      saveBrainMemory(updated);
      return updated;
    });
  };

  const handleDeleteDirective = (id: string) => {
    setBrainMemory(prev => {
      const updated = {
        ...prev,
        directives: prev.directives.filter(d => d.id !== id)
      };
      saveBrainMemory(updated);
      return updated;
    });
    toast('Brain rule removed', 'info');
  };

  const handleStartEdit = (rev: StagedReview) => {
    setEditingReviewId(rev.id);
    setEditDraft({
      authorName: rev.authorName,
      rating: rev.rating,
      content: rev.content,
      createdAt: rev.createdAt.slice(0, 16),
      helpfulCount: rev.helpfulCount || 0
    });
  };

  const handleSaveEdit = (id: string) => {
    if (!editDraft) return;
    setStagedReviews(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        let isoDate = r.createdAt;
        try {
          isoDate = new Date(editDraft.createdAt).toISOString();
        } catch (_) {}
        return {
          ...r,
          authorName: editDraft.authorName.trim() || r.authorName,
          rating: editDraft.rating,
          content: editDraft.content.trim() || r.content,
          createdAt: isoDate,
          helpfulCount: Math.max(0, Number(editDraft.helpfulCount) || 0)
        };
      })
    );
    setEditingReviewId(null);
    setEditDraft(null);
    toast('Staged review updated', 'success');
  };

  const handleDeleteStaged = (id: string) => {
    setStagedReviews(prev => prev.filter(r => r.id !== id));
  };

  const activeDirectivesCount = useMemo(
    () => brainMemory.directives.filter(d => d.active).length,
    [brainMemory.directives]
  );

  // Group staged reviews by app for quick filtering in Queue tab
  const stagedAppsSummary = useMemo(() => {
    const map = new Map<string, { appId: string; appName: string; count: number }>();
    stagedReviews.forEach(r => {
      const existing = map.get(r.appId);
      if (existing) {
        existing.count++;
      } else {
        map.set(r.appId, { appId: r.appId, appName: r.appName, count: 1 });
      }
    });
    return Array.from(map.values());
  }, [stagedReviews]);

  const filteredStagedReviews = useMemo(() => {
    if (queueFilterAppId === 'all') return stagedReviews;
    return stagedReviews.filter(r => r.appId === queueFilterAppId);
  }, [stagedReviews, queueFilterAppId]);

  return (
    <div className="animate-fade-in space-y-3">
      {/* Top Studio Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
                  AI Review Studio
                </h2>

                {/* Live Verified Backend Status Pill */}
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(true)}
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border transition-all cursor-pointer ${
                    connectionStatus.state === 'connected'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                      : connectionStatus.state === 'checking'
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse'
                  }`}
                  title="Click to configure or test Gemini API Key & Model"
                >
                  {connectionStatus.state === 'connected' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>
                        Connected • {connectionStatus.model}
                        {connectionStatus.latencyMs ? ` (${connectionStatus.latencyMs}ms)` : ''}
                      </span>
                    </>
                  ) : connectionStatus.state === 'checking' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Verifying {connectionStatus.model}...</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      <span>
                        {connectionStatus.state === 'missing_key'
                          ? 'Add API Key'
                          : 'Key / Model Error'}
                      </span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Play Store, Flipkart &amp; Amazon Crowd Psychology • Deep App Dossier • Live Co-Pilot Controls
              </p>
            </div>
          </div>

          {/* Mobile Target Apps Drawer Button */}
          <button
            type="button"
            onClick={() => setMobileShowAppsDrawer(v => !v)}
            className="lg:hidden px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Apps ({selectedAppIds.length})</span>
          </button>
        </div>

        {/* Right Controls: Direct Model Switcher, View Tabs & API Key Button */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          {/* Instant Live Model Switcher Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Cpu className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <select
              value={normalizeClientModelId(config.model)}
              onChange={e => handleUpdateConfig({ model: e.target.value }, true)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[175px] sm:max-w-[220px] truncate"
              title="Switch Active Gemini Model Immediately"
            >
              {SUPPORTED_GEMINI_MODELS.map(m => (
                <option key={m.id} value={m.id} className="bg-white dark:bg-slate-900">
                  {m.id} ({m.badge})
                </option>
              ))}
            </select>
          </div>

          {/* Main View Switcher Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveView('workspace')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'workspace'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Co-Pilot</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('queue')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'queue'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Queue</span>
              {stagedReviews.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px]">
                  {stagedReviews.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveView('brain')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'brain'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Brain</span>
              <span className="px-1.5 py-0.2 rounded-full bg-violet-600 text-white text-[10px]">
                {activeDirectivesCount}
              </span>
            </button>
          </div>

          {/* API Key & Model Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsKeyModalOpen(true)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              connectionStatus.state === 'connected'
                ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-indigo-500" />
            <span>API Key</span>
          </button>
        </div>
      </div>

      {/* Mobile Collapsible App Selector Drawer */}
      {mobileShowAppsDrawer && (
        <div className="lg:hidden bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl overflow-hidden shadow-lg max-h-[60vh] flex flex-col animate-fade-in">
          <div className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/50 border-b border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              Select Target Apps ({selectedAppIds.length} selected)
            </span>
            <button
              type="button"
              onClick={() => setMobileShowAppsDrawer(false)}
              className="px-2.5 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Done
            </button>
          </div>
          <div className="flex-1 overflow-y-auto h-[380px]">
            <AppSelector
              apps={appsList}
              selectedAppIds={selectedAppIds}
              onToggleApp={handleToggleApp}
              onSelectBatch={handleSelectBatchApps}
              appReviewCounts={appReviewCounts}
              appLastGeneratedMap={brainMemory.appLastGeneratedMap}
            />
          </div>
        </div>
      )}

      {/* Main Split-Screen Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden min-h-[680px] lg:h-[calc(100vh-200px)]">
        {/* Left Sidebar: Target App Selector (Desktop) */}
        <div className="hidden lg:block lg:col-span-4 xl:col-span-3 h-full overflow-hidden border-r border-slate-200 dark:border-slate-800">
          <AppSelector
            apps={appsList}
            selectedAppIds={selectedAppIds}
            onToggleApp={handleToggleApp}
            onSelectBatch={handleSelectBatchApps}
            appReviewCounts={appReviewCounts}
            appLastGeneratedMap={brainMemory.appLastGeneratedMap}
          />
        </div>

        {/* Right Panel: Active View */}
        <div className="lg:col-span-8 xl:col-span-9 h-full flex flex-col overflow-hidden">
          {activeView === 'workspace' ? (
            <ChatWorkspace
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              onQuickGenerate={() =>
                handleExecuteGeneration(configRef.current.activeSessionDirective)
              }
              onClearChat={handleClearChat}
              config={config}
              onUpdateConfig={partial => handleUpdateConfig(partial, false)}
              selectedAppsCount={selectedAppIds.length}
              isGenerating={isGenerating}
              appProgressList={appProgressList}
            />
          ) : activeView === 'queue' ? (
            /* Staged Reviews Queue View */
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Staged Reviews Queue ({stagedReviews.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Inspect, edit text/timestamps/likes, or push live to Community Firestore.
                  </p>
                </div>

                {stagedReviews.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (queueFilterAppId === 'all') {
                          setStagedReviews([]);
                          toast('Cleared all staged reviews', 'info');
                        } else {
                          setStagedReviews(prev =>
                            prev.filter(r => r.appId !== queueFilterAppId)
                          );
                          setQueueFilterAppId('all');
                          toast('Cleared staged reviews for selected app', 'info');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 transition-colors cursor-pointer"
                    >
                      {queueFilterAppId === 'all' ? 'Discard All' : 'Discard App Queue'}
                    </button>

                    <button
                      type="button"
                      disabled={isPublishing}
                      onClick={() => handlePublishAllStaged(queueFilterAppId)}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>
                        {isPublishing
                          ? 'Publishing...'
                          : queueFilterAppId === 'all'
                          ? `Publish All (${stagedReviews.length})`
                          : `Publish App (${filteredStagedReviews.length})`}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Per-App Filter Chips */}
              {stagedAppsSummary.length > 1 && (
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                  <button
                    type="button"
                    onClick={() => setQueueFilterAppId('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                      queueFilterAppId === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    All Apps ({stagedReviews.length})
                  </button>
                  {stagedAppsSummary.map(g => (
                    <button
                      key={g.appId}
                      type="button"
                      onClick={() => setQueueFilterAppId(g.appId)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                        queueFilterAppId === g.appId
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {g.appName} ({g.count})
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5">
                {filteredStagedReviews.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
                    <Layers className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      No Staged Reviews in Queue
                    </p>
                    <p className="text-xs mt-1 max-w-sm">
                      Select target apps and use the Co-Pilot tab to generate authentic crowd reviews.
                    </p>
                  </div>
                ) : (
                  filteredStagedReviews.map(rev => {
                    const isEditing = editingReviewId === rev.id;
                    return (
                      <div
                        key={rev.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500/30 transition-all shadow-2xs"
                      >
                        {isEditing && editDraft ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                  Reviewer Name
                                </label>
                                <input
                                  type="text"
                                  value={editDraft.authorName}
                                  onChange={e =>
                                    setEditDraft({ ...editDraft, authorName: e.target.value })
                                  }
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                  Rating (1–5)
                                </label>
                                <select
                                  value={editDraft.rating}
                                  onChange={e =>
                                    setEditDraft({
                                      ...editDraft,
                                      rating: parseInt(e.target.value, 10)
                                    })
                                  }
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs dark:text-white"
                                >
                                  {[5, 4, 3, 2, 1].map(n => (
                                    <option key={n} value={n}>
                                      {n} Stars
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                  Helpful Likes
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={500}
                                  value={editDraft.helpfulCount}
                                  onChange={e =>
                                    setEditDraft({
                                      ...editDraft,
                                      helpfulCount: parseInt(e.target.value, 10) || 0
                                    })
                                  }
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                  Review Date &amp; Time
                                </label>
                                <input
                                  type="datetime-local"
                                  value={editDraft.createdAt}
                                  onChange={e =>
                                    setEditDraft({ ...editDraft, createdAt: e.target.value })
                                  }
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs dark:text-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                Review Text
                              </label>
                              <textarea
                                rows={2}
                                value={editDraft.content}
                                onChange={e =>
                                  setEditDraft({ ...editDraft, content: e.target.value })
                                }
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs dark:text-white"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingReviewId(null);
                                  setEditDraft(null);
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(rev.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" /> Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                                  {rev.appName}
                                </span>
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {rev.authorName}
                                </span>
                                {rev.personaTag && (
                                  <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20 text-[10px] font-bold">
                                    {rev.personaTag}
                                  </span>
                                )}
                                <span className="text-amber-500 text-xs font-bold">
                                  {'★'.repeat(rev.rating)}
                                  {'☆'.repeat(5 - rev.rating)}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  • {formatReviewDatePreview(rev.createdAt)}
                                </span>
                                {rev.helpfulCount > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                                    👍 {rev.helpfulCount}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                {rev.content}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={async () => {
                                  const ok = await publishSingleReviewToCloud(rev);
                                  if (ok) {
                                    setStagedReviews(prev => prev.filter(r => r.id !== rev.id));
                                    setAppReviewCounts(prev => ({
                                      ...prev,
                                      [rev.appId]: (prev[rev.appId] || 0) + 1
                                    }));
                                    toast(`Published review by ${rev.authorName}!`, 'success');
                                  } else {
                                    toast('Failed to publish review', 'error');
                                  }
                                }}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                                title="Publish Immediately"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(rev)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Edit Review"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStaged(rev.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Delete Staged Review"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Brain Rules & Action History View */
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-transparent flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    Permanent AI Studio Brain &amp; Guardrails
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Rules enabled here are permanently injected into every review generation and Co-Pilot session.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300">
                    Generated: <span className="text-indigo-600 dark:text-indigo-400">{brainMemory.totalGeneratedAllTime}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 font-bold text-emerald-700 dark:text-emerald-300">
                    Published: <span>{brainMemory.totalPublishedAllTime}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 xl:grid-cols-12 gap-5">
                <div className="xl:col-span-7 space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-violet-500" />
                      Add Permanent Rule to Brain
                    </h4>
                    <form onSubmit={handleAddBrainDirective} className="space-y-2.5">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={newDirectiveCategory}
                          onChange={e => setNewDirectiveCategory(e.target.value as any)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
                        >
                          <option value="tone">Tone &amp; Persona</option>
                          <option value="vocabulary">Vocabulary / Banned Words</option>
                          <option value="formatting">Length &amp; Formatting</option>
                          <option value="safety">Safety &amp; Compliance</option>
                          <option value="custom">Custom Rule</option>
                        </select>
                        <input
                          type="text"
                          value={newDirectiveText}
                          onChange={e => setNewDirectiveText(e.target.value)}
                          placeholder="e.g. Always mention at least one specific tool/mode from the app description..."
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white"
                        />
                        <button
                          type="submit"
                          disabled={!newDirectiveText.trim()}
                          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0"
                        >
                          Save Rule
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="space-y-2">
                    {brainMemory.directives.map(dir => (
                      <div
                        key={dir.id}
                        className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                          dir.active
                            ? 'bg-white dark:bg-slate-900 border-violet-200 dark:border-violet-900/50'
                            : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={dir.active}
                            onChange={() => handleToggleDirective(dir.id)}
                            className="mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                          />
                          <div className="space-y-1 min-w-0">
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400">
                              {dir.category}
                            </span>
                            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                              {dir.rule}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteDirective(dir.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="xl:col-span-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-indigo-500" />
                    Recent Studio Activity Log
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2.5 max-h-[420px] overflow-y-auto">
                    {brainMemory.actionLogs.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        No studio activity recorded yet.
                      </div>
                    ) : (
                      brainMemory.actionLogs.map(log => (
                        <div
                          key={log.id}
                          className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                              {log.actionType}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatReviewDatePreview(log.timestamp)}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 font-medium">
                            {log.summary}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API Key & Model Engine Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        config={config}
        connectionStatus={connectionStatus}
        onSaveConfigAndStatus={handleSaveFromModal}
      />
    </div>
  );
};

export default AdminAIReviewStudioTab;
