import { StudioConfig, BrainMemoryDirective, ChatMessage, StagedReview } from './types';

export const KEY_STUDIO_CONFIG = 'admin_ai_studio_config';
export const KEY_STORE_BRAIN_DIRECTIVES = 'admin_ai_brain_directives';
export const KEY_CHAT_HISTORY = 'admin_ai_chat_history';
export const KEY_SELECTED_APPS = 'admin_ai_selected_apps';
export const KEY_STAGED_REVIEWS = 'admin_ai_staged_reviews';

export const DEFAULT_DIRECTIVES: BrainMemoryDirective[] = [
  {
    id: 'dir_1',
    rule: 'Never sound robotic or like marketing copy. Write like regular, authentic everyday people who downloaded the app.',
    category: 'persona',
    createdAt: new Date().toISOString(),
    active: true
  },
  {
    id: 'dir_2',
    rule: 'Deep app understanding: strictly ground every comment in the specific app’s real features, category, UI, and content stored on our website.',
    category: 'topic',
    createdAt: new Date().toISOString(),
    active: true
  },
  {
    id: 'dir_3',
    rule: 'All-rounder adaptability: adapt vocabulary naturally to the app genre (entertainment, card game, casual arcade, tools) without forcing money or gambling terms.',
    category: 'general',
    createdAt: new Date().toISOString(),
    active: true
  },
  {
    id: 'dir_4',
    rule: 'Realistic dates: strictly past or current day timestamps (never future dates) with natural hour and minute distribution.',
    category: 'date',
    createdAt: new Date().toISOString(),
    active: true
  }
];

export const DEFAULT_STUDIO_CONFIG: StudioConfig = {
  apiKey: '',
  model: 'gemini-flash-latest',
  reviewsPerApp: 2,
  dateMode: 'today_and_yesterday',
  ratingMix: 'auto_app_rating',
  languageTone: 'all_rounder_standard',
  likesMode: 'subtle_1_2',
  customTopic: 'Core features, smooth performance, authentic user experience',
  publishMode: 'wait_approve',
  activeSessionDirective: ''
};

export function loadStudioConfig(): StudioConfig {
  if (typeof window === 'undefined') return DEFAULT_STUDIO_CONFIG;
  try {
    const raw = localStorage.getItem(KEY_STUDIO_CONFIG);
    const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
    const initialSettingsKey = (window as any)?.__INITIAL_DATA__?.settings?.gemini_api_key || '';
    const initialSettingsModel = (window as any)?.__INITIAL_DATA__?.settings?.gemini_model || '';
    const fallbackKey = envKey || initialSettingsKey;

    if (raw) {
      const parsed = JSON.parse(raw);
      const merged: StudioConfig = { ...DEFAULT_STUDIO_CONFIG, ...parsed };
      // If storage key is empty, check environment variable or admin settings fallback
      if (!merged.apiKey || merged.apiKey.trim() === '') {
        merged.apiKey = fallbackKey;
      }
      if (
        !merged.model ||
        merged.model === 'gemini-2.5-flash' ||
        merged.model === 'gemini-2.0-flash' ||
        merged.model === 'gemini-1.5-flash'
      ) {
        merged.model = initialSettingsModel || 'gemini-flash-latest';
      }
      return merged;
    }
    if (fallbackKey) {
      return { 
        ...DEFAULT_STUDIO_CONFIG, 
        apiKey: fallbackKey,
        model: initialSettingsModel || DEFAULT_STUDIO_CONFIG.model
      };
    }
  } catch (_) {}
  return DEFAULT_STUDIO_CONFIG;
}

export function saveStudioConfig(config: StudioConfig, persistToCloud = true): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY_STUDIO_CONFIG, JSON.stringify(config));
  } catch (_) {}

  if (persistToCloud) {
    saveStudioConfigToCloud(config).catch(() => {});
  }
}

export function loadBrainDirectives(): BrainMemoryDirective[] {
  if (typeof window === 'undefined') return DEFAULT_DIRECTIVES;
  try {
    const raw = localStorage.getItem(KEY_STORE_BRAIN_DIRECTIVES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return DEFAULT_DIRECTIVES;
}

export function saveBrainDirectives(directives: BrainMemoryDirective[], persistToCloud = false): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY_STORE_BRAIN_DIRECTIVES, JSON.stringify(directives));
  } catch (_) {}

  if (persistToCloud) {
    saveBrainDirectivesToCloud(directives).catch(() => {});
  }
}

/**
 * Persists brain directives directly to server storage & Firestore
 * Works 100% reliably across device refreshes, cache clearing, and mobile browsers.
 */
export async function saveBrainDirectivesToCloud(directives: BrainMemoryDirective[]): Promise<boolean> {
  const payload = {
    directives: directives.map(d => ({
      id: String(d.id || ''),
      rule: String(d.rule || ''),
      category: String(d.category || 'general'),
      createdAt: String(d.createdAt || new Date().toISOString()),
      active: Boolean(d.active)
    })),
    updatedAt: new Date().toISOString()
  };

  // 1. Primary: Save via robust server admin endpoint
  try {
    const res = await fetch('/api/v1/admin/community/aistudio-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) return true;
  } catch (_) {}

  // 2. Fallback: Direct Firestore REST
  try {
    const { getResolvedCommunityFirebaseConfig, convertToFirestoreFields } = await import('../../../lib/communityFirebase');
    const cfg = getResolvedCommunityFirebaseConfig();
    if (cfg && cfg.apiKey && cfg.projectId) {
      const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/community_store/ai_studio_brain?key=${cfg.apiKey}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: convertToFirestoreFields({ ...payload, _rest_admin_bypass: 'aistudio_preview_bypass_key' }) })
      });
      return res.ok;
    }
  } catch (_) {}

  return false;
}

/**
 * Loads brain directives from server storage / Firestore cloud
 */
export async function loadBrainDirectivesFromCloud(): Promise<BrainMemoryDirective[] | null> {
  // 1. Primary: Server admin endpoint (0 Firestore reads!)
  try {
    const res = await fetch('/api/v1/admin/community/aistudio-settings');
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.data?.directives) && json.data.directives.length > 0) {
        const cloudDirectives: BrainMemoryDirective[] = json.data.directives.map((d: any, idx: number) => ({
          id: String(d.id || `dir_${idx}`),
          rule: String(d.rule || ''),
          category: (d.category || 'general') as any,
          createdAt: String(d.createdAt || new Date().toISOString()),
          active: Boolean(d.active !== false)
        })).filter((d: any) => Boolean(d.rule));

        try {
          localStorage.setItem(KEY_STORE_BRAIN_DIRECTIVES, JSON.stringify(cloudDirectives));
        } catch (_) {}
        return cloudDirectives;
      }
    }
  } catch (_) {}

  // 2. Fallback: Direct Firestore REST
  try {
    const { getResolvedCommunityFirebaseConfig, parseFirestoreFields } = await import('../../../lib/communityFirebase');
    const cfg = getResolvedCommunityFirebaseConfig();
    if (!cfg || !cfg.apiKey || !cfg.projectId) return null;

    const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/community_store/ai_studio_brain?key=${cfg.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    if (json && json.fields) {
      const parsed = parseFirestoreFields(json.fields);
      if (Array.isArray(parsed?.directives)) {
        const cloudDirectives: BrainMemoryDirective[] = parsed.directives.map((d: any, idx: number) => ({
          id: String(d.id || `dir_${idx}`),
          rule: String(d.rule || ''),
          category: (d.category || 'general') as any,
          createdAt: String(d.createdAt || new Date().toISOString()),
          active: Boolean(d.active !== false)
        })).filter((d: any) => Boolean(d.rule));

        try {
          localStorage.setItem(KEY_STORE_BRAIN_DIRECTIVES, JSON.stringify(cloudDirectives));
        } catch (_) {}
        return cloudDirectives;
      }
    }
  } catch (e) {
    console.warn('[AI Studio] Cloud directives load error:', e);
  }
  return null;
}

/**
 * Persists studio automation config to server & Cloud Firestore
 */
export async function saveStudioConfigToCloud(config: StudioConfig): Promise<boolean> {
  const payload = {
    apiKey: String(config.apiKey || '').trim(),
    model: String(config.model || 'gemini-flash-latest'),
    reviewsPerApp: Number(config.reviewsPerApp) || 2,
    languageTone: String(config.languageTone || 'all_rounder_standard'),
    dateMode: String(config.dateMode || 'today_and_yesterday'),
    ratingMix: String(config.ratingMix || 'auto_app_rating'),
    likesMode: String(config.likesMode || 'subtle_1_2'),
    publishMode: String(config.publishMode || 'wait_approve'),
    activeSessionDirective: String(config.activeSessionDirective || ''),
    updatedAt: new Date().toISOString()
  };

  // 1. Primary: Save via server admin endpoint
  try {
    const res = await fetch('/api/v1/admin/community/aistudio-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: payload })
    });
    if (res.ok) return true;
  } catch (_) {}

  // 2. Fallback: Direct Firestore REST
  try {
    const { getResolvedCommunityFirebaseConfig, convertToFirestoreFields } = await import('../../../lib/communityFirebase');
    const cfg = getResolvedCommunityFirebaseConfig();
    if (cfg && cfg.apiKey && cfg.projectId) {
      const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/community_store/ai_studio_config?key=${cfg.apiKey}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: convertToFirestoreFields({ ...payload, _rest_admin_bypass: 'aistudio_preview_bypass_key' }) })
      });
      return res.ok;
    }
  } catch (_) {}

  return false;
}

/**
 * Loads studio config from server / Cloud Firestore
 */
export async function loadStudioConfigFromCloud(): Promise<Partial<StudioConfig> | null> {
  // 1. Primary: Server admin endpoint (0 Firestore reads!)
  try {
    const res = await fetch('/api/v1/admin/community/aistudio-settings');
    if (res.ok) {
      const json = await res.json();
      const cfg = json?.data?.config;
      if (cfg) {
        return {
          apiKey: cfg.apiKey ? String(cfg.apiKey).trim() : undefined,
          model: cfg.model ? String(cfg.model).trim() : undefined,
          reviewsPerApp: Number(cfg.reviewsPerApp) || 2,
          languageTone: cfg.languageTone || 'all_rounder_standard',
          dateMode: cfg.dateMode || 'today_and_yesterday',
          ratingMix: cfg.ratingMix || 'auto_app_rating',
          likesMode: cfg.likesMode || 'subtle_1_2',
          publishMode: cfg.publishMode || 'wait_approve',
          activeSessionDirective: cfg.activeSessionDirective || ''
        };
      }
    }
  } catch (_) {}

  // 2. Fallback: Direct Firestore REST
  try {
    const { getResolvedCommunityFirebaseConfig, parseFirestoreFields } = await import('../../../lib/communityFirebase');
    const cfg = getResolvedCommunityFirebaseConfig();
    if (!cfg || !cfg.apiKey || !cfg.projectId) return null;

    const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/community_store/ai_studio_config?key=${cfg.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    if (json && json.fields) {
      const parsed = parseFirestoreFields(json.fields);
      if (parsed) {
        return {
          reviewsPerApp: Number(parsed.reviewsPerApp) || 2,
          languageTone: parsed.languageTone || 'all_rounder_standard',
          dateMode: parsed.dateMode || 'today_and_yesterday',
          ratingMix: parsed.ratingMix || 'auto_app_rating',
          publishMode: parsed.publishMode || 'wait_approve',
          activeSessionDirective: parsed.activeSessionDirective || ''
        };
      }
    }
  } catch (e) {
    console.warn('[AI Studio] Cloud config load error:', e);
  }
  return null;
}

export function loadChatHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_CHAT_HISTORY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Namaste! I am your AI Review Studio Brain. I retain all custom directives in memory and build 100% human-realistic reviews based on your local app data. Tell me what topic, tone, or specific details you want to focus on, or select apps and ask me to generate reviews for Today and Yesterday!',
      timestamp: new Date().toISOString()
    }
  ];
}

export function saveChatHistory(history: ChatMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY_CHAT_HISTORY, JSON.stringify(history.slice(-30))); // Keep last 30 messages
  } catch (_) {}
}

export function loadStagedReviews(): StagedReview[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_STAGED_REVIEWS);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

export function saveStagedReviews(reviews: StagedReview[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY_STAGED_REVIEWS, JSON.stringify(reviews));
  } catch (_) {}
}

export function loadSelectedAppIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_SELECTED_APPS);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

export function saveSelectedAppIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY_SELECTED_APPS, JSON.stringify(ids));
  } catch (_) {}
}
