import { StudioConfig, StagedReview, ChatMessage, AIStudioBrainMemory, BrainDirective, GenerationActionLog } from './types';
import { getDefaultStartDate, getDefaultEndDate } from './dateEngine';

const STORAGE_KEYS = {
  CONFIG: 'ai_review_studio_config_v1',
  LEGACY_CONFIG: 'admin_ai_studio_config',
  STAGED: 'ai_review_studio_staged_v1',
  CHAT: 'ai_review_studio_chat_v1',
  BRAIN: 'ai_review_studio_brain_v1'
};

const LEGACY_MODEL_MAP: Record<string, string> = {
  'gemini-3.8-flash': 'gemini-3-flash-preview',
  'gemini-3.7-flash': 'gemini-2.5-flash',
  'gemini-3.6-flash': 'gemini-2.5-flash-lite',
  'gemini-3.8-flash-lite': 'gemini-3.1-flash-lite-preview',
  'gemini-1.5-flash': 'gemini-2.5-flash',
  'gemini-1.5-flash-latest': 'gemini-2.5-flash',
  'gemini-1.5-pro': 'gemini-2.5-pro',
  'gemini-pro': 'gemini-2.5-pro'
};

export function normalizeClientModelId(rawModel?: string): string {
  const cleaned = (rawModel || '').trim().replace(/^models\//i, '');
  if (!cleaned) return 'gemini-2.5-flash';
  if (LEGACY_MODEL_MAP[cleaned]) {
    return LEGACY_MODEL_MAP[cleaned];
  }
  return cleaned;
}

export function isValidClientApiKey(rawKey?: string): boolean {
  const clean = (rawKey || '').trim();
  if (!clean || clean.length < 20) return false;
  const lower = clean.toLowerCase();
  if (
    lower === 'my_gemini_api_key' ||
    lower.includes('your_api_key') ||
    lower.includes('your-api-key') ||
    lower.includes('paste_your') ||
    lower.includes('placeholder')
  ) {
    return false;
  }
  return true;
}

export function maskClientApiKey(rawKey?: string): string {
  const clean = (rawKey || '').trim();
  if (!isValidClientApiKey(clean)) return '';
  if (clean.length <= 10) return '••••••';
  return `${clean.slice(0, 6)}••••${clean.slice(-4)}`;
}

const DEFAULT_BRAIN_DIRECTIVES: BrainDirective[] = [
  {
    id: 'dir-safety-1',
    rule: 'Strictly avoid real-money gambling, betting, cash withdrawal, Paytm/UPI, or financial earning terms. Focus on what the app provides, its core features, gameplay/utility modes, interface smoothness, and authentic user experiences.',
    category: 'safety',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'dir-tone-1',
    rule: 'Write like real people on Google Play Store, Flipkart, and Amazon: mix short punchy 1-liners, practical pros/cons, and casual conversational Indian English / Hinglish without robotic AI buzzwords.',
    category: 'tone',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'dir-format-1',
    rule: 'Every reviewer must sound like a distinct human user (e.g. commuter, college student, budget Android user, long-time user, or skeptical first-timer) talking about specific features of that exact app.',
    category: 'formatting',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export function getDefaultStudioConfig(initialSettingsKey?: string, initialSettingsModel?: string): StudioConfig {
  const cleanInitialKey = isValidClientApiKey(initialSettingsKey) ? (initialSettingsKey || '').trim() : '';
  return {
    apiKey: cleanInitialKey,
    model: normalizeClientModelId(initialSettingsModel || 'gemini-2.5-flash'),
    reviewsPerApp: 5,
    ratingMix: 'mostly_positive',
    tone: 'mixed_natural',
    marketplaceStyle: 'blended_authentic',
    lengthDistribution: 'natural_mix',
    languageMix: 'hinglish_mix',
    focusTopics: ['what_app_provides', 'onboarding_ease', 'daily_experience', 'device_network'],
    humanImperfectionLevel: 'natural',
    dateRangeMode: 'recent_days',
    customDays: 14,
    customMonths: 2,
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate(),
    autoPublish: false,
    likesProbability: 70,
    maxLikesPerReview: 14,
    generationPacing: 'batch_fast',
    activeSessionDirective: '',
    updatedAt: 0
  };
}

export function loadStudioConfig(initialSettingsKey?: string, initialSettingsModel?: string): StudioConfig {
  const defaults = getDefaultStudioConfig(initialSettingsKey, initialSettingsModel);
  try {
    const rawPrimary = localStorage.getItem(STORAGE_KEYS.CONFIG);
    const rawLegacy = localStorage.getItem(STORAGE_KEYS.LEGACY_CONFIG);
    const parsedPrimary = rawPrimary ? JSON.parse(rawPrimary) : null;
    const parsedLegacy = rawLegacy ? JSON.parse(rawLegacy) : null;

    let parsed = parsedPrimary || parsedLegacy;
    if (parsedPrimary && parsedLegacy) {
      parsed = (parsedLegacy.updatedAt || 0) > (parsedPrimary.updatedAt || 0) ? parsedLegacy : parsedPrimary;
    }

    if (parsed && typeof parsed === 'object') {
      const merged: StudioConfig = { ...defaults, ...parsed };

      if (isValidClientApiKey(parsed.apiKey)) {
        merged.apiKey = parsed.apiKey.trim();
      } else if (isValidClientApiKey(initialSettingsKey)) {
        merged.apiKey = (initialSettingsKey || '').trim();
      } else {
        merged.apiKey = '';
      }

      if (parsed.model && String(parsed.model).trim()) {
        merged.model = normalizeClientModelId(parsed.model);
      } else if (initialSettingsModel && String(initialSettingsModel).trim()) {
        merged.model = normalizeClientModelId(initialSettingsModel);
      } else {
        merged.model = 'gemini-2.5-flash';
      }

      if (!Array.isArray(merged.focusTopics) || merged.focusTopics.length === 0) {
        merged.focusTopics = defaults.focusTopics;
      }

      return merged;
    }
  } catch (e) {
    console.warn('Failed to load AI Studio config from localStorage:', e);
  }
  return defaults;
}

export function saveStudioConfig(config: StudioConfig): StudioConfig {
  const normalized: StudioConfig = {
    ...config,
    apiKey: isValidClientApiKey(config.apiKey) ? config.apiKey.trim() : '',
    model: normalizeClientModelId(config.model),
    updatedAt: Date.now()
  };

  try {
    const serialized = JSON.stringify(normalized);
    localStorage.setItem(STORAGE_KEYS.CONFIG, serialized);
    localStorage.setItem(STORAGE_KEYS.LEGACY_CONFIG, serialized);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aistudio-config-sync', { detail: normalized }));
    }
  } catch (e) {
    console.warn('Failed to save AI Studio config to localStorage:', e);
  }

  // Persist to Server Brain Memory asynchronously with a fast 4s timeout (never blocks UI)
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    fetch('/api/v1/admin/community/aistudio-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: normalized }),
      signal: ctrl.signal
    })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
  } catch (_) {}

  return normalized;
}

export function loadStagedReviews(): StagedReview[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STAGED);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load staged reviews:', e);
  }
  return [];
}

export function saveStagedReviews(reviews: StagedReview[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STAGED, JSON.stringify(reviews));
  } catch (e) {
    console.warn('Failed to save staged reviews:', e);
  }
}

export function loadChatHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHAT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load chat history:', e);
  }
  return [
    {
      id: 'welcome-msg',
      role: 'assistant',
      text: "Welcome to the **AI Review Studio & Crowd Psychology Engine**.\n\nI study the actual content, features, FAQs, and category mechanism of each selected app and generate authentic human reviews modeled on **Google Play Store**, **Amazon / Flipkart Verified Reviewers**, **Casual Hinglish Users**, and **Quick One-Line Crowd Comments**.\n\n**You can tell me anything in plain language or adjust the controls above:**\n- *\"Generate 8 reviews per app — mix Play Store and Flipkart style, talk about what the app actually provides, and keep 30% short one-liners.\"*\n- *\"Make comments for the selected apps sound like casual Indian college students & daily commuters using Hinglish.\"*\n- *\"Focus on onboarding ease, low-RAM phone performance, and add 1 constructive 4-star suggestion per app.\"*",
      timestamp: new Date().toISOString()
    }
  ];
}

export function saveChatHistory(messages: ChatMessage[]): void {
  try {
    const trimmed = messages.slice(-60);
    localStorage.setItem(STORAGE_KEYS.CHAT, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save chat history:', e);
  }
}

export function loadBrainMemory(): AIStudioBrainMemory {
  const defaultMemory: AIStudioBrainMemory = {
    version: '2.0.0',
    lastUpdated: new Date().toISOString(),
    directives: DEFAULT_BRAIN_DIRECTIVES,
    actionLogs: [],
    totalGeneratedAllTime: 0,
    totalPublishedAllTime: 0,
    appLastGeneratedMap: {}
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BRAIN);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultMemory,
        ...parsed,
        directives: Array.isArray(parsed.directives) && parsed.directives.length > 0
          ? parsed.directives
          : DEFAULT_BRAIN_DIRECTIVES,
        actionLogs: Array.isArray(parsed.actionLogs) ? parsed.actionLogs : [],
        appLastGeneratedMap: parsed.appLastGeneratedMap || {}
      };
    }
  } catch (e) {
    console.warn('Failed to load AI Studio Brain memory:', e);
  }
  return defaultMemory;
}

export function saveBrainMemory(memory: AIStudioBrainMemory): void {
  try {
    const updated: AIStudioBrainMemory = {
      ...memory,
      lastUpdated: new Date().toISOString(),
      actionLogs: (memory.actionLogs || []).slice(0, 100)
    };
    localStorage.setItem(STORAGE_KEYS.BRAIN, JSON.stringify(updated));

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    fetch('/api/v1/admin/community/aistudio-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brain: updated }),
      signal: ctrl.signal
    })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
  } catch (e) {
    console.warn('Failed to save AI Studio Brain memory:', e);
  }
}

export interface CloudStudioSettingsResponse {
  config: Partial<StudioConfig> | null;
  brain: AIStudioBrainMemory | null;
  hasServerEnvKey: boolean;
  serverEnvKeyMask: string;
  activeKeySource: 'custom' | 'saved_studio' | 'server_env' | 'none';
  activeKeyMask: string;
}

export async function loadStudioSettingsFromCloud(): Promise<CloudStudioSettingsResponse> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch('/api/v1/admin/community/aistudio-settings', {
      signal: ctrl.signal
    }).finally(() => clearTimeout(timer));

    if (res.ok) {
      const json = await res.json();
      const rawCfg = json?.data?.config;
      let cleanConfig: Partial<StudioConfig> | null = null;

      if (rawCfg && typeof rawCfg === 'object' && Object.keys(rawCfg).length > 0) {
        cleanConfig = {};
        if (isValidClientApiKey(rawCfg.apiKey)) {
          cleanConfig.apiKey = rawCfg.apiKey.trim();
        }
        if (rawCfg.model && String(rawCfg.model).trim()) {
          cleanConfig.model = normalizeClientModelId(rawCfg.model);
        }
        if (typeof rawCfg.reviewsPerApp === 'number') cleanConfig.reviewsPerApp = rawCfg.reviewsPerApp;
        if (rawCfg.ratingMix) cleanConfig.ratingMix = rawCfg.ratingMix;
        if (rawCfg.tone) cleanConfig.tone = rawCfg.tone;
        if (rawCfg.marketplaceStyle) cleanConfig.marketplaceStyle = rawCfg.marketplaceStyle;
        if (rawCfg.lengthDistribution) cleanConfig.lengthDistribution = rawCfg.lengthDistribution;
        if (rawCfg.languageMix) cleanConfig.languageMix = rawCfg.languageMix;
        if (Array.isArray(rawCfg.focusTopics) && rawCfg.focusTopics.length > 0) {
          cleanConfig.focusTopics = rawCfg.focusTopics;
        }
        if (rawCfg.humanImperfectionLevel) cleanConfig.humanImperfectionLevel = rawCfg.humanImperfectionLevel;
        if (rawCfg.dateRangeMode) cleanConfig.dateRangeMode = rawCfg.dateRangeMode;
        if (typeof rawCfg.customDays === 'number') cleanConfig.customDays = rawCfg.customDays;
        if (typeof rawCfg.customMonths === 'number') cleanConfig.customMonths = rawCfg.customMonths;
        if (rawCfg.startDate) cleanConfig.startDate = rawCfg.startDate;
        if (rawCfg.endDate) cleanConfig.endDate = rawCfg.endDate;
        if (typeof rawCfg.autoPublish === 'boolean') cleanConfig.autoPublish = rawCfg.autoPublish;
        if (typeof rawCfg.likesProbability === 'number') cleanConfig.likesProbability = rawCfg.likesProbability;
        if (typeof rawCfg.maxLikesPerReview === 'number') cleanConfig.maxLikesPerReview = rawCfg.maxLikesPerReview;
        if (rawCfg.generationPacing) cleanConfig.generationPacing = rawCfg.generationPacing;
        if (typeof rawCfg.activeSessionDirective === 'string') {
          cleanConfig.activeSessionDirective = rawCfg.activeSessionDirective;
        }
        if (typeof rawCfg.updatedAt === 'number') cleanConfig.updatedAt = rawCfg.updatedAt;
      }

      return {
        config: cleanConfig,
        brain: json?.data?.brain && typeof json.data.brain === 'object' ? json.data.brain : null,
        hasServerEnvKey: Boolean(json?.hasServerEnvKey),
        serverEnvKeyMask: json?.serverEnvKeyMask || '',
        activeKeySource: json?.activeKeySource || 'none',
        activeKeyMask: json?.activeKeyMask || ''
      };
    }
  } catch (_) {}

  return {
    config: null,
    brain: null,
    hasServerEnvKey: false,
    serverEnvKeyMask: '',
    activeKeySource: 'none',
    activeKeyMask: ''
  };
}

export function appendBrainActionLog(
  memory: AIStudioBrainMemory,
  actionType: GenerationActionLog['actionType'],
  summary: string,
  appNames: string[],
  count: number
): AIStudioBrainMemory {
  const newLog: GenerationActionLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    actionType,
    summary,
    appNames: appNames.slice(0, 10),
    count
  };

  const updated: AIStudioBrainMemory = {
    ...memory,
    actionLogs: [newLog, ...(memory.actionLogs || [])].slice(0, 100),
    totalGeneratedAllTime: actionType === 'generated' ? (memory.totalGeneratedAllTime || 0) + count : (memory.totalGeneratedAllTime || 0),
    totalPublishedAllTime: actionType === 'published' ? (memory.totalPublishedAllTime || 0) + count : (memory.totalPublishedAllTime || 0)
  };
  saveBrainMemory(updated);
  return updated;
}

export function recordAppsGeneratedInBrain(memory: AIStudioBrainMemory, appIds: string[]): AIStudioBrainMemory {
  const nowIso = new Date().toISOString();
  const nextMap = { ...(memory.appLastGeneratedMap || {}) };
  appIds.forEach(id => {
    if (id) nextMap[String(id)] = nowIso;
  });
  const updated: AIStudioBrainMemory = {
    ...memory,
    appLastGeneratedMap: nextMap
  };
  saveBrainMemory(updated);
  return updated;
}
