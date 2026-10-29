import {
  StudioConfig,
  StagedReview,
  ChatMessage,
  BrainDirective,
  AIConnectionStatus,
  MarketplaceStyle,
  ReviewLengthMix,
  ReviewLanguageMix,
  ReviewFocusTopic
} from './types';
import { generateReviewTimestamp } from './dateEngine';
import {
  normalizeClientModelId,
  isValidClientApiKey,
  maskClientApiKey,
  parseClientApiKeys,
  loadStudioConfig
} from './storage';
import siteBrainSnapshot from '../../../lib/aiStudioBrain.json';

export function buildFailoverModelChain(primaryModel?: string): string[] {
  const norm = normalizeClientModelId(primaryModel);
  const chain = [
    norm,
    'gemini-2.5-flash',
    'gemini-3-flash-preview',
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite-preview',
    'gemini-flash-latest',
    'gemini-2.5-pro'
  ];
  return chain.filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);
}

export const SUPPORTED_GEMINI_MODELS = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash (Recommended • Instant & Reliable)',
    badge: 'Fastest & Best',
    desc: 'Sub-second response speed, high human nuance, and generous free-tier rate limits.'
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash Preview (Next-Gen Crowd Psychology)',
    badge: 'Next-Gen',
    desc: 'Latest Gemini 3 low-latency reasoning for ultra-authentic Play Store, Amazon & Flipkart personas.'
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash-Lite (Ultra-High Quota • Bulk Speed)',
    badge: 'Max Quota',
    desc: 'Lowest latency and highest requests-per-minute for generating across many apps.'
  },
  {
    id: 'gemini-3.1-flash-lite-preview',
    label: 'Gemini 3.1 Flash-Lite Preview (Fast High-Volume)',
    badge: 'Fast Lite',
    desc: 'Next-gen lightweight model optimized for rapid batch generation.'
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro (Deep Analytical & Strategy)',
    badge: 'Pro Reasoning',
    desc: 'Deepest content comprehension for complex app dossiers and nuanced critiques.'
  },
  {
    id: 'gemini-flash-latest',
    label: 'Gemini Flash Latest (Auto-Updated Alias)',
    badge: 'Auto Alias',
    desc: 'Automatically points to Google’s current rolling Flash release.'
  }
];

export const MARKETPLACE_STYLE_OPTIONS: {
  id: MarketplaceStyle;
  label: string;
  shortLabel: string;
  desc: string;
}[] = [
  {
    id: 'blended_authentic',
    label: 'All-in-One Crowd Mix (Play Store + Flipkart/Amazon + Hinglish)',
    shortLabel: 'Crowd Mix (Best)',
    desc: 'Realistic blend of Play Store users, Flipkart/Amazon value reviewers, casual Hinglish, and quick one-liners.'
  },
  {
    id: 'play_store',
    label: 'Google Play Store Native (Device, Update & Daily Usage)',
    shortLabel: 'Play Store Style',
    desc: 'Focuses on app features, version updates, phone models (Redmi/Realme/Samsung/Vivo), and 4G/5G performance.'
  },
  {
    id: 'amazon_flipkart',
    label: 'Amazon & Flipkart Verified Reviewer (Value, Pros/Cons & Verdict)',
    shortLabel: 'Amazon / Flipkart',
    desc: 'Practical buyer-style reviews: what the app actually provides, comparison with alternatives, and honest verdict.'
  },
  {
    id: 'hinglish_casual',
    label: 'Desi Hinglish + English Conversational Crowd',
    shortLabel: 'Hinglish Crowd',
    desc: 'Natural Indian mobile user voice mixing Roman Hindi and English ("Mast app hai, features kaafi useful hain").'
  },
  {
    id: 'ultra_short_crowd',
    label: 'Fast Micro-Comments & One-Liners (4–14 Words)',
    shortLabel: 'Short 1-Liners',
    desc: 'How 60% of real users comment: brief, casual, lowercase or punchy 1-sentence reactions.'
  },
  {
    id: 'critical_tester',
    label: 'Honest Power-User & Balanced QA Feedback',
    shortLabel: 'Power User / QA',
    desc: 'Detailed observations praising specific app features while noting realistic minor wishes or quirks.'
  }
];

export const FOCUS_TOPIC_OPTIONS: {
  id: ReviewFocusTopic;
  label: string;
  desc: string;
}[] = [
  {
    id: 'what_app_provides',
    label: 'What the App Provides',
    desc: 'Specific modes, tools, rooms, levels, or benefits described in the app catalog.'
  },
  {
    id: 'onboarding_ease',
    label: 'Setup, Login & Size',
    desc: 'Download size, quick registration/OTP, clean menu layout, beginner friendliness.'
  },
  {
    id: 'daily_experience',
    label: 'Real-Life Usage Story',
    desc: 'How/when they use it (evening relaxation, commute, with friends/family, daily routine).'
  },
  {
    id: 'device_network',
    label: 'Phone & Network Reality',
    desc: 'Battery usage, heating, low-RAM budget phones, Jio/Airtel 4G/5G stability.'
  },
  {
    id: 'comparison_verdict',
    label: 'Comparison vs Others',
    desc: 'Why they kept this app after trying 2–3 cluttered or laggy alternatives.'
  },
  {
    id: 'feature_requests',
    label: 'Constructive Wishes',
    desc: 'Realistic minor suggestions (dark mode, notification toggle, regional language, etc.).'
  }
];

const INDIAN_REVIEWER_NAMES = [
  'Aarav Sharma', 'Vivaan Patel', 'Aditya Verma', 'Vihaan Gupta', 'Arjun Singh',
  'Sai Kumar', 'Reyansh Reddy', 'Ayaan Khan', 'Krishna Nair', 'Ishaan Joshi',
  'Shaurya Mishra', 'Atharv Pandey', 'Dhruv Choudhary', 'Kabir Malhotra', 'Rishi Tiwari',
  'Ananya Desai', 'Diya Mehta', 'Priya Iyer', 'Kavya Menon', 'Aadhya Rao',
  'Saanvi Chatterjee', 'Myra Mukherjee', 'Ira Banerjee', 'Anika Bose', 'Prisha Sengupta',
  'Rohan Deshmukh', 'Vikram Chauhan', 'Neha Agarwal', 'Pooja Thakur', 'Rahul Saxena',
  'Suresh Natarajan', 'Karthik Subramanian', 'Deepak Yadav', 'Manish Rathore', 'Nitin Kulkarni',
  'Gaurav Bhardwaj', 'Harshita Dubey', 'Swati Kashyap', 'Tarun Gill', 'Yashvardhan Chauhan',
  'Abhishek Pathak', 'Siddharth Roy', 'Megha Nambiar', 'Rajat Hegde', 'Shubham Bisht',
  'Pranav Bora', 'Tushar Kalita', 'Ankita Phukan', 'Mayank Goswami', 'VarunD_99',
  'Rohit_Gamer07', 'Akash K.', 'Pradeep S', 'Sandeep_Raj', 'Nikhil M.',
  'Kiran Patil', 'Ajay Vishwakarma', 'Sachin Pawar', 'Pankaj Soni', 'Mohit Jangid'
];

// Strictly scrub any accidental real-money or gambling phrases AND robotic AI cliches
const SENSITIVE_REPLACEMENTS: [RegExp, string][] = [
  [/\bwithdraw(al|als|ing|n)?\b/gi, 'reward progress'],
  [/\b(real\s*cash|real\s*money|cash\s*out|cash\s*prize|win\s*cash|earn\s*money|earning\s*app)\b/gi, 'in-app points'],
  [/\b(paytm|upi|bank\s*transfer|phonepe|gpay|google\s*pay|imps|neft|kyc|pan\s*card)\b/gi, 'account profile'],
  [/\b(deposit(s|ed|ing)?|add\s*cash|recharge\s*money)\b/gi, 'unlock'],
  [/\b(betting|gambling|wager|jackpot\s*cash|satta|matka|casino)\b/gi, 'gameplay'],
  [/\b(paisa|paise|rupees|rs\.?\s*\d+|₹\s*\d+|lakh|crore)\b/gi, 'score'],
  [/\b(game-changer|testament to|delve into|unparalleled|second to none)\b/gi, 'solid']
];

export function sanitizeReviewText(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText.trim();
  for (const [pattern, replacement] of SENSITIVE_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}

export function pickUniqueNames(count: number, usedNames: Set<string>): string[] {
  const available = INDIAN_REVIEWER_NAMES.filter(n => !usedNames.has(n));
  const shuffled = [...(available.length >= count ? available : INDIAN_REVIEWER_NAMES)].sort(
    () => 0.5 - Math.random()
  );
  const selected = shuffled.slice(0, count);
  selected.forEach(n => usedNames.add(n));
  return selected;
}

export function generateRatingsArray(count: number, mix: StudioConfig['ratingMix']): number[] {
  const ratings: number[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    if (mix === 'all_5_star') {
      ratings.push(5);
    } else if (mix === 'mostly_positive') {
      if (r < 0.68) ratings.push(5);
      else if (r < 0.92) ratings.push(4);
      else if (r < 0.98) ratings.push(3);
      else ratings.push(2);
    } else if (mix === 'balanced_realistic') {
      if (r < 0.45) ratings.push(5);
      else if (r < 0.75) ratings.push(4);
      else if (r < 0.90) ratings.push(3);
      else if (r < 0.96) ratings.push(2);
      else ratings.push(1);
    } else if (mix === 'critical_feedback') {
      if (r < 0.15) ratings.push(5);
      else if (r < 0.35) ratings.push(4);
      else if (r < 0.70) ratings.push(3);
      else if (r < 0.90) ratings.push(2);
      else ratings.push(1);
    } else {
      ratings.push(5);
    }
  }
  return ratings;
}

export function generateHelpfulLikes(rating: number, contentLength: number, config: StudioConfig): number {
  const prob = typeof config.likesProbability === 'number' ? config.likesProbability : 70;
  const maxLikes = typeof config.maxLikesPerReview === 'number' ? config.maxLikesPerReview : 14;
  if (maxLikes <= 0 || Math.random() * 100 > prob) return 0;

  const lengthBoost = contentLength > 140 ? 1.35 : contentLength < 45 ? 0.5 : 1.0;
  const roll = Math.random();
  let base = 1;
  if (roll < 0.55) {
    base = Math.floor(Math.random() * Math.max(2, Math.floor(maxLikes * 0.3))) + 1;
  } else if (roll < 0.88) {
    base = Math.floor(Math.random() * Math.max(3, Math.floor(maxLikes * 0.65))) + 2;
  } else {
    base = Math.floor(Math.random() * maxLikes) + 1;
  }
  return Math.min(maxLikes, Math.max(1, Math.round(base * lengthBoost)));
}

function stripHtmlToCleanText(html?: string, maxLen = 2200): string {
  if (!html) return '';
  return String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export interface AppDeepDossier {
  appId: string;
  appName: string;
  category: string;
  developer: string;
  version: string;
  size: string;
  rating: string;
  downloads: string;
  metaTitle: string;
  metaDescription: string;
  h1Title: string;
  featuresList: string[];
  whatAppProvidesSummary: string;
  faqsSummary: string[];
  adminCallouts: string[];
}

export function extractAppDeepDossier(app: any): AppDeepDossier {
  const appName = (app?.name || app?.title || 'Application').trim();
  const category = (app?.category || 'Mobile Utility & Entertainment').trim();
  const developer = (app?.developer || app?.author || app?.company || 'Official Developer').trim();
  const version = (app?.version || 'Latest').trim();
  const size = (app?.size || app?.file_size || 'Lightweight').trim();
  const rating = String(app?.rating || '4.6');
  const downloads = String(app?.downloads || '10K+');
  const metaTitle = (app?.meta_title || app?.seo_title || '').trim();
  const metaDescription = (app?.meta_description || app?.seo_description || '').trim();
  const h1Title = (app?.h1_title || app?.custom_h1 || '').trim();

  const rawFeatures: string[] = [];
  if (Array.isArray(app?.features)) {
    app.features.forEach((f: any) => {
      const clean = stripHtmlToCleanText(String(f || ''), 160);
      if (clean) rawFeatures.push(clean);
    });
  } else if (typeof app?.features === 'string' && app.features.trim()) {
    app.features.split(/[,|\n•]+/).forEach((f: string) => {
      const clean = stripHtmlToCleanText(f, 160);
      if (clean && clean.length > 2) rawFeatures.push(clean);
    });
  }
  if (app?.features_html) {
    stripHtmlToCleanText(app.features_html, 1000)
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 3)
      .forEach(s => rawFeatures.push(s));
  }

  const rawAbout = [
    stripHtmlToCleanText(app?.description_html, 1600),
    stripHtmlToCleanText(app?.description, 1000),
    stripHtmlToCleanText(app?.about, 600),
    stripHtmlToCleanText(app?.short_description, 400),
    metaDescription
  ]
    .filter(Boolean)
    .join('\n');

  const faqsSummary: string[] = [];
  if (Array.isArray(app?.faqs)) {
    app.faqs.slice(0, 6).forEach((faq: any) => {
      const q = stripHtmlToCleanText(faq?.question || faq?.q, 160);
      const a = stripHtmlToCleanText(faq?.answer || faq?.a, 240);
      if (q && a) faqsSummary.push(`Q: ${q} -> A: ${a}`);
    });
  }

  const adminCallouts: string[] = [];
  if (app?.idea_box_content || app?.idea_box_msg) {
    adminCallouts.push(`Highlight: ${stripHtmlToCleanText(app.idea_box_content || app.idea_box_msg, 220)}`);
  }
  if (app?.security_box_content || app?.yellow_box_msg) {
    adminCallouts.push(`Security Info: ${stripHtmlToCleanText(app.security_box_content || app.yellow_box_msg, 220)}`);
  }

  const safeFeatures = Array.from(new Set(rawFeatures))
    .map(f => sanitizeReviewText(f))
    .filter(Boolean)
    .slice(0, 10);

  return {
    appId: String(app?.id || app?.slug || appName),
    appName,
    category,
    developer,
    version,
    size,
    rating,
    downloads,
    metaTitle: sanitizeReviewText(metaTitle),
    metaDescription: sanitizeReviewText(metaDescription),
    h1Title: sanitizeReviewText(h1Title),
    featuresList: safeFeatures,
    whatAppProvidesSummary: sanitizeReviewText(rawAbout).slice(0, 1800),
    faqsSummary: faqsSummary.map(f => sanitizeReviewText(f)),
    adminCallouts: adminCallouts.map(c => sanitizeReviewText(c))
  };
}

function buildClientThinkingConfig(modelId: string): Record<string, any> | undefined {
  const m = (modelId || '').toLowerCase();
  if (m.startsWith('gemini-3') || m.startsWith('gemini-4')) {
    return { thinkingLevel: m.includes('flash-lite') ? 'MINIMAL' : 'LOW' };
  }
  if (m.startsWith('gemini-2.5-pro')) {
    return { thinkingBudget: 128 };
  }
  if (m.startsWith('gemini-2.5-flash') || m === 'gemini-flash-latest') {
    return { thinkingBudget: 0 };
  }
  return undefined;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function isKeyErrorString(msg: string): boolean {
  const u = (msg || '').toUpperCase();
  return (
    u.includes('API_KEY_INVALID') ||
    u.includes('API KEY NOT VALID') ||
    (u.includes('INVALID_ARGUMENT') && u.includes('API KEY')) ||
    (u.includes('PERMISSION_DENIED') && u.includes('KEY')) ||
    u.includes('UNAUTHENTICATED')
  );
}

/**
 * Industrial Sub-250ms Connection & Model Verifier:
 * 1. If a custom API key is provided (or stored in local config), verifies directly against Google's
 *    zero-quota model metadata endpoint in ~120ms AND syncs the key/model to the backend server in parallel.
 * 2. If no custom key is on the client, checks the backend server for a saved studio key or GEMINI_API_KEY env var.
 */
export async function verifyStudioConnection(
  apiKey?: string,
  model?: string,
  deepPing = false
): Promise<AIConnectionStatus> {
  const savedCfg = loadStudioConfig();
  const effectiveKey =
    apiKey !== undefined ? apiKey.trim() : (savedCfg.apiKey || '').trim();
  const normalizedModel = normalizeClientModelId(model || savedCfg.model);
  const startTime = Date.now();

  // Path A: Direct Ultra-Fast Verification when a valid client API key is present
  const clientKeys = parseClientApiKeys(effectiveKey);
  if (clientKeys.length > 0) {
    // Sync key & model to backend brain asynchronously so server is always in sync
    fetchWithTimeout(
      '/api/v1/admin/community/aistudio-gemini',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          apiKey: effectiveKey,
          model: normalizedModel,
          deepPing
        })
      },
      5000
    ).catch(() => {});

    const candidateModels = buildFailoverModelChain(normalizedModel);
    let sawInvalidKey = false;
    let lastDirectErr = '';

    for (const candidateKey of clientKeys) {
      let keyInvalid = false;

      for (const candidateModel of candidateModels) {
        try {
          const metaUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            candidateModel
          )}?key=${encodeURIComponent(candidateKey)}`;

          const metaRes = await fetchWithTimeout(metaUrl, { method: 'GET' }, 4500);
          const metaJson: any = await metaRes.json().catch(() => ({}));

          if (!metaRes.ok) {
            const errMsg = metaJson?.error?.message || `HTTP ${metaRes.status}`;
            lastDirectErr = errMsg;
            if (isKeyErrorString(errMsg) || metaRes.status === 400 || metaRes.status === 403) {
              if (isKeyErrorString(errMsg)) {
                sawInvalidKey = true;
                keyInvalid = true;
                break; // Try next key if multiple keys were pasted
              }
            }
            // Try next model on 404 / 503 / 429
            continue;
          }

          if (deepPing) {
            const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
              candidateModel
            )}:generateContent?key=${encodeURIComponent(candidateKey)}`;
            const thinkingConfig = buildClientThinkingConfig(candidateModel);
            const pingRes = await fetchWithTimeout(
              genUrl,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ role: 'user', parts: [{ text: 'Reply with OK' }] }],
                  generationConfig: {
                    temperature: 0.1,
                    ...(thinkingConfig ? { thinkingConfig } : {})
                  }
                })
              },
              6500
            );
            const pingJson: any = await pingRes.json().catch(() => ({}));

            if (pingRes.ok) {
              return {
                state: 'connected',
                model: candidateModel,
                requestedModel: normalizedModel,
                latencyMs: Math.max(1, Date.now() - startTime),
                keySource: 'custom',
                keyMask: maskClientApiKey(effectiveKey),
                warningMessage:
                  candidateModel !== normalizedModel
                    ? `Model "${normalizedModel}" had temporary high demand; auto-routed to ${candidateModel}.`
                    : undefined,
                lastCheckedAt: Date.now()
              };
            }

            const pingErr = pingJson?.error?.message || `HTTP ${pingRes.status}`;
            lastDirectErr = pingErr;
            if (isKeyErrorString(pingErr)) {
              sawInvalidKey = true;
              keyInvalid = true;
              break;
            }
            // If 503 (high demand) or 429 (quota) or 404 on deepPing, immediately test next model in candidateModels!
            continue;
          }

          return {
            state: 'connected',
            model: candidateModel,
            requestedModel: normalizedModel,
            latencyMs: Math.max(1, Date.now() - startTime),
            keySource: 'custom',
            keyMask: maskClientApiKey(effectiveKey),
            warningMessage:
              candidateModel !== normalizedModel
                ? `Model "${normalizedModel}" unavailable; auto-routed to ${candidateModel}.`
                : undefined,
            lastCheckedAt: Date.now()
          };
        } catch (err: any) {
          lastDirectErr = err?.message || 'Network timeout';
        }
      }

      if (!keyInvalid && lastDirectErr && !sawInvalidKey) {
        // Metadata succeeded on key earlier or all models had transient spike; if metadata of primaryModel worked, still mark connected with warning
        try {
          const quickUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key=${encodeURIComponent(
            candidateKey
          )}`;
          const quickRes = await fetchWithTimeout(quickUrl, { method: 'GET' }, 3500);
          if (quickRes.ok) {
            return {
              state: 'connected',
              model: 'gemini-2.5-flash',
              requestedModel: normalizedModel,
              latencyMs: Math.max(1, Date.now() - startTime),
              keySource: 'custom',
              keyMask: maskClientApiKey(effectiveKey),
              warningMessage: `API Key verified. Google reported temporary high demand on ${normalizedModel}; auto-failover to Gemini 2.5 Flash / Lite is active.`,
              lastCheckedAt: Date.now()
            };
          }
        } catch (_) {}
      }
    }

    if (sawInvalidKey) {
      return {
        state: 'invalid_key',
        model: normalizedModel,
        requestedModel: normalizedModel,
        keySource: 'custom',
        keyMask: maskClientApiKey(effectiveKey),
        errorMessage: 'Invalid Gemini API Key. Please check that you copied the full key from Google AI Studio.',
        lastCheckedAt: Date.now()
      };
    }
  }

  // Path B: Backend Server Verification (for server_env key or fallback)
  try {
    const res = await fetchWithTimeout(
      '/api/v1/admin/community/aistudio-gemini',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          apiKey: effectiveKey,
          clearKey: apiKey === '',
          deepPing,
          model: normalizedModel
        })
      },
      5500
    );

    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success) {
      return {
        state: 'connected',
        model: data.model || normalizedModel,
        requestedModel: data.requestedModel || normalizedModel,
        latencyMs: data.latencyMs || Math.max(1, Date.now() - startTime),
        keySource: data.keySource || (effectiveKey ? 'custom' : 'server_env'),
        keyMask: data.keyMask || maskClientApiKey(effectiveKey),
        warningMessage: data.warning || undefined,
        lastCheckedAt: Date.now()
      };
    }

    const errText = data?.error || `HTTP ${res.status}`;
    const isMissing =
      !effectiveKey &&
      (res.status === 400 ||
        errText.toLowerCase().includes('no valid gemini api key') ||
        res.status === 404);
    const isInvalid =
      errText.toLowerCase().includes('invalid gemini api key') ||
      errText.toLowerCase().includes('not valid');

    return {
      state: isMissing ? 'missing_key' : isInvalid ? 'invalid_key' : 'error',
      model: data?.model || normalizedModel,
      requestedModel: normalizedModel,
      keySource: data?.keySource || 'none',
      keyMask: data?.keyMask || maskClientApiKey(effectiveKey),
      errorMessage: isMissing
        ? 'No API key connected yet. Click "API Key" to paste your Google AI Studio key.'
        : errText,
      lastCheckedAt: Date.now()
    };
  } catch (err: any) {
    if (!isValidClientApiKey(effectiveKey)) {
      return {
        state: 'missing_key',
        model: normalizedModel,
        requestedModel: normalizedModel,
        keySource: 'none',
        errorMessage: 'Paste your Google AI Studio API key in "API Key & Model" to connect instantly.',
        lastCheckedAt: Date.now()
      };
    }
    return {
      state: 'error',
      model: normalizedModel,
      requestedModel: normalizedModel,
      errorMessage:
        err?.name === 'AbortError'
          ? 'Connection timed out. Please check your network or try Gemini 2.5 Flash.'
          : err?.message || 'Network error reaching Gemini endpoint',
      lastCheckedAt: Date.now()
    };
  }
}

/**
 * Direct Low-Latency REST Caller to Google's Gemini Edge API.
 * Used when the Admin has configured their custom API key in the studio for instantaneous (<1.5s) ChatGPT-like speed,
 * with automatic fallback to `gemini-2.5-flash` if a preview model is rate-limited.
 */
async function callGeminiDirectEdge(params: {
  apiKey: string;
  model: string;
  systemInstruction?: string;
  contents: any[];
  temperature?: number;
  responseMimeType?: string;
}): Promise<{
  ok: boolean;
  text: string;
  modelUsed: string;
  isInvalidKey?: boolean;
  error?: string;
}> {
  const keys = parseClientApiKeys(params.apiKey);
  const primaryModel = normalizeClientModelId(params.model);
  const candidates = buildFailoverModelChain(primaryModel);

  if (keys.length === 0) {
    return {
      ok: false,
      text: '',
      modelUsed: primaryModel,
      isInvalidKey: true,
      error: 'No valid Gemini API Key configured.'
    };
  }

  let lastError = '';
  let allKeysInvalid = true;

  for (const currentKey of keys) {
    let thisKeyInvalid = false;

    for (const currentModel of candidates) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          currentModel
        )}:generateContent?key=${encodeURIComponent(currentKey)}`;

        const thinkingConfig = buildClientThinkingConfig(currentModel);
        const generationConfig: Record<string, any> = {
          temperature: params.temperature ?? 0.88
        };
        if (params.responseMimeType) {
          generationConfig.responseMimeType = params.responseMimeType;
        }
        if (thinkingConfig) {
          generationConfig.thinkingConfig = thinkingConfig;
        }

        const bodyPayload: Record<string, any> = {
          contents: params.contents,
          generationConfig
        };

        if (params.systemInstruction) {
          bodyPayload.systemInstruction = {
            parts: [{ text: params.systemInstruction }]
          };
        }

        const res = await fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload)
          },
          18000
        );

        const json: any = await res.json().catch(() => ({}));

        if (res.ok) {
          allKeysInvalid = false;
          const parts = json?.candidates?.[0]?.content?.parts;
          if (Array.isArray(parts)) {
            const extractedText = parts
              .filter((p: any) => typeof p?.text === 'string' && !p?.thought)
              .map((p: any) => p.text)
              .join('')
              .trim();
            const fallbackText =
              extractedText ||
              parts
                .map((p: any) => p?.text || '')
                .join('')
                .trim();

            if (fallbackText) {
              return {
                ok: true,
                text: fallbackText,
                modelUsed: currentModel
              };
            }
          }
        }

        const errMsg = json?.error?.message || `HTTP ${res.status}`;
        lastError = errMsg;

        if (isKeyErrorString(errMsg)) {
          thisKeyInvalid = true;
          break; // Move to next API key if available
        }

        allKeysInvalid = false;

        // If 503 (high demand), 429 (quota/rate-limit), 404 (not found), or 5xx, immediately try next model in candidates!
        continue;
      } catch (err: any) {
        allKeysInvalid = false;
        lastError =
          err?.name === 'AbortError'
            ? `Model ${currentModel} timed out`
            : err?.message || 'Direct Gemini connection error';
      }
    }

    if (!thisKeyInvalid) {
      allKeysInvalid = false;
    }
  }

  return {
    ok: false,
    text: '',
    modelUsed: primaryModel,
    isInvalidKey: allKeysInvalid,
    error: allKeysInvalid
      ? 'Invalid Gemini API Key. Please check your key in API Key & Model settings.'
      : lastError || 'Direct Gemini call failed'
  };
}

/**
 * Industrial Dual-Path Gemini Execution Engine:
 * 1. If the Admin has configured a custom API key, executes directly against Google's edge with
 *    low-latency `thinkingConfig` (< 1.5s response time) and automatic server proxy failover.
 * 2. If no custom key is in the browser, routes through `/api/v1/admin/community/aistudio-gemini`
 *    using the server's saved key or `GEMINI_API_KEY` environment variable.
 */
async function callGeminiProxy(params: {
  apiKey?: string;
  model: string;
  systemInstruction?: string;
  contents: any[];
  temperature?: number;
  responseMimeType?: string;
}): Promise<{
  ok: boolean;
  text: string;
  modelUsed?: string;
  error?: string;
}> {
  const savedCfg = loadStudioConfig();
  const effectiveKey = (params.apiKey || savedCfg.apiKey || '').trim();
  const normalizedModel = normalizeClientModelId(params.model || savedCfg.model);

  // Path 1: Ultra-Fast Direct Edge Execution when a valid custom key is present
  if (isValidClientApiKey(effectiveKey)) {
    const directRes = await callGeminiDirectEdge({
      apiKey: effectiveKey,
      model: normalizedModel,
      systemInstruction: params.systemInstruction,
      contents: params.contents,
      temperature: params.temperature,
      responseMimeType: params.responseMimeType
    });

    if (directRes.ok) {
      return {
        ok: true,
        text: directRes.text,
        modelUsed: directRes.modelUsed
      };
    }

    if (directRes.isInvalidKey) {
      return {
        ok: false,
        text: '',
        modelUsed: directRes.modelUsed,
        error: directRes.error
      };
    }
  }

  // Path 2: Server-Side Gemini Proxy (with strict 24s timeout)
  try {
    const serverRes = await fetchWithTimeout(
      '/api/v1/admin/community/aistudio-gemini',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: effectiveKey,
          model: normalizedModel,
          systemInstruction: params.systemInstruction,
          contents: params.contents,
          temperature: params.temperature ?? 0.9,
          responseMimeType: params.responseMimeType
        })
      },
      24000
    );

    const serverJson = await serverRes.json().catch(() => ({}));
    if (serverRes.ok && serverJson?.success && serverJson?.text) {
      return {
        ok: true,
        text: serverJson.text,
        modelUsed: serverJson.modelUsed || normalizedModel
      };
    }

    return {
      ok: false,
      text: '',
      modelUsed: serverJson?.modelUsed || normalizedModel,
      error: serverJson?.error || `Gemini API returned HTTP ${serverRes.status}`
    };
  } catch (err: any) {
    return {
      ok: false,
      text: '',
      modelUsed: normalizedModel,
      error:
        err?.name === 'AbortError'
          ? 'Request timed out. Please verify your API key or select Gemini 2.5 Flash.'
          : err?.message || 'Failed to connect to Gemini endpoint'
    };
  }
}

function buildMarketplaceStyleInstructions(config: StudioConfig): string {
  const style = config.marketplaceStyle || 'blended_authentic';
  const lengthMix = config.lengthDistribution || 'natural_mix';
  const langMix = config.languageMix || 'hinglish_mix';
  const topics = Array.isArray(config.focusTopics) && config.focusTopics.length > 0
    ? config.focusTopics
    : ['what_app_provides', 'onboarding_ease', 'daily_experience', 'device_network'];

  const styleMap: Record<MarketplaceStyle, string> = {
    blended_authentic: `MARKETPLACE PERSONA MIX (BLENDED REALISM):
- Distribute reviews across 4 distinct real-world comment archetypes:
  1. [Play Store Regulars - 35%]: Mention what the app provides, specific modes/tools from the dossier, update stability, or how it runs on their Android phone (Redmi, Realme, Vivo, Samsung M-series, Poco) over 4G/5G.
  2. [Amazon / Flipkart Value Reviewers - 25%]: Practical "worth downloading" mindset. Talk about what the app actually delivers vs expectations, why they kept it after uninstalling 2-3 cluttered apps, and a clear pros/cons takeaway.
  3. [Casual Hinglish Crowd - 20%]: Natural conversational Roman Hindi + English ("Bhai sach me kaafi useful app hai", "Interface simple hai aur features bhi kaam ke hain", "Timepass aur daily use ke liye best").
  4. [Fast One-Line Crowd - 20%]: Brief, natural 5 to 12 word comments ("good app works fine on my phone", "nice features and easy to understand 👍", "using since last week no issue so far").`,

    play_store: `MARKETPLACE PERSONA (GOOGLE PLAY STORE NATIVE):
- Write exactly like real Google Play Store mobile users in India.
- Reference specific features/modes the app provides, version update improvements, storage footprint, login/onboarding ease, battery/data usage on budget or mid-range Android phones, and honest star-matched feedback.`,

    amazon_flipkart: `MARKETPLACE PERSONA (AMAZON / FLIPKART VERIFIED REVIEWER STYLE):
- Write like practical, value-conscious Flipkart & Amazon reviewers evaluating a product after real usage ("Using this for 10 days now", "Does what it promises", "Pros: ... / Minor con: ...").
- Focus heavily on WHAT THE APP PROVIDES to the user, its practical utility/entertainment value, how easy it is for family/friends to use, and how it compares to other apps in the same category.`,

    hinglish_casual: `MARKETPLACE PERSONA (INDIAN HINGLISH + ENGLISH CROWD):
- Write in authentic, natural Roman Hindi + English code-switching used by real Indian mobile users ("Mast app hai bhai", "Features kaafi sahi diye hain, specially...", "Starting me doubt tha par ab daily use karta hu").
- Keep the phrasing organic and street-real — never textbook or stiff translation.`,

    ultra_short_crowd: `MARKETPLACE PERSONA (ULTRA-SHORT MICRO COMMENTS):
- Every review must be a fast, punchy 1-liner (between 4 and 15 words).
- Mix casual punctuation, occasional lowercase starts, and direct reactions about a specific feature or what the app offers.`,

    critical_tester: `MARKETPLACE PERSONA (POWER-USER & BALANCED QA TESTER):
- Write observant, nuanced reviews that highlight 1-2 specific things the app provides well alongside 1 realistic minor observation or feature wish (e.g., "Wish there was a compact list view", "Takes a few extra seconds on slow network", "Notification settings could be easier to find").`
  };

  const lengthMap: Record<ReviewLengthMix, string> = {
    natural_mix: `LENGTH DISTRIBUTION:
- 30% Short One-Liners (5 to 14 words)
- 50% Medium Natural Reviews (18 to 38 words, 1–2 sentences)
- 20% Detailed Experience Stories (40 to 70 words, 2–4 sentences explaining how they use the app and what it provides)`,
    short_punchy: `LENGTH DISTRIBUTION: Keep ALL reviews concise and punchy (5 to 16 words max, 1 sentence).`,
    medium_standard: `LENGTH DISTRIBUTION: Keep reviews 18 to 38 words (1–2 natural sentences).`,
    detailed_story: `LENGTH DISTRIBUTION: Write substantive 35 to 75 word reviews sharing specific usage context, what the app provides, and practical takeaways.`
  };

  const langMap: Record<ReviewLanguageMix, string> = {
    english_india: `LANGUAGE: Natural Indian English (relatable everyday phrasing, zero stiff corporate or western-slang clichés).`,
    hinglish_mix: `LANGUAGE: ~70% natural Indian English reviews and ~30% conversational Hinglish (Roman Hindi + English mix) reviews.`,
    global_english: `LANGUAGE: Clean, casual everyday English used by everyday mobile users.`,
    pure_hinglish: `LANGUAGE: Conversational Hinglish (Roman Hindi mixed with English terms) for every review.`
  };

  const topicDescriptions: Record<ReviewFocusTopic, string> = {
    what_app_provides: 'WHAT THE APP PROVIDES: Talk specifically about the core features, modes, tools, content, or services inside this app based on its dossier.',
    onboarding_ease: 'ONBOARDING & USABILITY: Mention download size, quick installation, easy menu navigation, or straightforward setup.',
    daily_experience: 'REAL-LIFE CONTEXT: Mention when/how they use it (evening break, commuting on metro/bus, with college friends/cousins, weekend relaxation).',
    device_network: 'DEVICE & NETWORK REALITY: Mention real-world performance on 4G/5G (Jio/Airtel) or mid-range Android phones (Redmi, Realme, Samsung, Vivo) and battery/storage impact.',
    comparison_verdict: 'COMPARISON VERDICT: Mention trying other apps in this category before settling on this one because it is cleaner or more reliable.',
    feature_requests: 'CONSTRUCTIVE WISHES: Include realistic minor user suggestions or grounded feedback when rating is 3★ or 4★.'
  };

  const imperfectionGuide =
    config.humanImperfectionLevel === 'raw_casual'
      ? 'HUMAN TEXTURE: Use raw mobile typing habits — occasional lowercase starts, casual shorthand ("v good", "gud", "nic", "tho"), minimal punctuation, zero essay structure.'
      : config.humanImperfectionLevel === 'polished'
      ? 'HUMAN TEXTURE: Clear, well-written everyday human sentences without typos, but still conversational and never robotic.'
      : 'HUMAN TEXTURE: Realistic mix — most reviews have normal casual grammar, while ~25% have relaxed mobile typing habits (lowercase start, missing period at end, or casual abbreviations).';

  return [
    styleMap[style] || styleMap.blended_authentic,
    lengthMap[lengthMix] || lengthMap.natural_mix,
    langMap[langMix] || langMap.hinglish_mix,
    `REQUIRED COMMENT ANGLES TO ROTATE ACROSS REVIEWS:\n${topics.map(t => `- ${topicDescriptions[t]}`).join('\n')}`,
    imperfectionGuide,
    `ANTI-AI-SLOP RULES (CRITICAL):
- NEVER use AI giveaway words: "seamlessly", "game-changer", "top-notch", "delve", "testament", "unparalleled", "elevate", "boasts", "comprehensive", "sleek", "intuitive interface" (use normal human words like "easy to use", "clean layout", "simple menu").
- NEVER start multiple reviews with the same opening word ("Really love...", "Great app...", "I have been using..."). Every review MUST start differently.
- NEVER write generic praise that could apply to any random app; anchor comments in what THIS specific app provides according to its Dossier.`
  ].join('\n\n');
}

export interface CoPilotChatResponse {
  reply: string;
  configPatches?: Partial<StudioConfig>;
  compiledStrategyBrief?: string;
  appliedAdjustments?: string[];
  modelUsed?: string;
  error?: string;
}

/**
 * Interactive AI Co-Pilot Chat that responds in ~1s and translates natural language into structured configPatches.
 */
export async function sendChatMessageToGemini(
  userMessage: string,
  chatHistory: ChatMessage[],
  config: StudioConfig,
  selectedApps: any[],
  brainDirectives: BrainDirective[] = [],
  siteContext?: {
    allApps?: any[];
    newsList?: any[];
    videosList?: any[];
    faqsList?: any[];
    developersList?: any[];
    settings?: any;
  }
): Promise<CoPilotChatResponse> {
  const activeRules = brainDirectives
    .filter(d => d.active)
    .map((d, i) => `${i + 1}. [${d.category.toUpperCase()}] ${d.rule}`)
    .join('\n');

  const allCatalogApps =
    siteContext?.allApps && siteContext.allApps.length > 0
      ? siteContext.allApps
      : (siteBrainSnapshot as any)?.apps || [];

  const selectedDossiers = selectedApps.slice(0, 6).map(app => {
    const d = extractAppDeepDossier(app);
    return [
      `• APP: "${d.appName}" (Category: ${d.category} | Dev: ${d.developer} | Size: ${d.size} | Ver: ${d.version})`,
      d.whatAppProvidesSummary ? `  What It Provides: ${d.whatAppProvidesSummary.slice(0, 380)}` : '',
      d.featuresList.length > 0 ? `  Key Features: ${d.featuresList.slice(0, 6).join(' | ')}` : ''
    ]
      .filter(Boolean)
      .join('\n');
  });

  const conversationHistoryText = chatHistory
    .slice(-8)
    .map(m => `${m.role === 'user' ? 'ADMIN' : 'AI CO-PILOT'}: ${m.text.slice(0, 400)}`)
    .join('\n\n');

  const systemInstruction = `You are the Lead Crowd Psychology & Review Strategy Architect for "${siteContext?.settings?.site_title || 'Platform'}".
Your role is to collaborate with the Admin to design ultra-authentic, human-indistinguishable user reviews for the platform's apps, AND automatically translate the Admin's natural-language requests into structured studio adjustments.

=== CURRENT SELECTED APPS (${selectedApps.length} selected out of ${allCatalogApps.length} catalog apps) ===
${selectedDossiers.length > 0 ? selectedDossiers.join('\n\n') : 'No apps currently checked in the left panel.'}

=== CURRENT STUDIO ADJUSTMENTS ===
- Reviews Per App: ${config.reviewsPerApp}
- Rating Mix: ${config.ratingMix} ('mostly_positive' | 'all_5_star' | 'balanced_realistic' | 'critical_feedback')
- Marketplace Style: ${config.marketplaceStyle} ('blended_authentic' | 'play_store' | 'amazon_flipkart' | 'hinglish_casual' | 'ultra_short_crowd' | 'critical_tester')
- Length Distribution: ${config.lengthDistribution} ('natural_mix' | 'short_punchy' | 'medium_standard' | 'detailed_story')
- Language Mix: ${config.languageMix} ('english_india' | 'hinglish_mix' | 'global_english' | 'pure_hinglish')
- Focus Topics: ${(config.focusTopics || []).join(', ')}
- Date Range Mode: ${config.dateRangeMode} (Custom Days: ${config.customDays}, Custom Months: ${config.customMonths})
- Helpful Likes: ${config.likesProbability}% chance, up to ${config.maxLikesPerReview} likes
- Publish Mode: ${config.autoPublish ? 'Auto-Publish Live' : 'Stage in Queue'}
- Previous Compiled Strategy Brief: ${config.activeSessionDirective || 'None yet'}

=== PERMANENT BRAIN DIRECTIVES ===
${activeRules || 'Standard safety and authenticity rules active.'}

=== HOW YOU MUST RESPOND (STRICT JSON) ===
Analyze the Admin's message ("${userMessage}") and the conversation history.
Return ONLY a valid JSON object matching this exact schema:
{
  "reply": "Your clear, helpful markdown response to the Admin. Explain how you will craft the reviews based on what the selected apps actually provide, how Play Store / Flipkart / Amazon / Hinglish users talk about these features, and confirm any parameter adjustments you just applied.",
  "configPatches": {
    // Include ONLY fields that the Admin explicitly or implicitly asked to change in their message! Leave out unchanged fields.
    // Allowed keys & values:
    // "reviewsPerApp": number (1 to 50),
    // "ratingMix": "mostly_positive" | "all_5_star" | "balanced_realistic" | "critical_feedback",
    // "marketplaceStyle": "blended_authentic" | "play_store" | "amazon_flipkart" | "hinglish_casual" | "ultra_short_crowd" | "critical_tester",
    // "lengthDistribution": "natural_mix" | "short_punchy" | "medium_standard" | "detailed_story",
    // "languageMix": "english_india" | "hinglish_mix" | "global_english" | "pure_hinglish",
    // "focusTopics": array of ["what_app_provides", "onboarding_ease", "daily_experience", "device_network", "comparison_verdict", "feature_requests"],
    // "humanImperfectionLevel": "natural" | "polished" | "raw_casual",
    // "customDays": number,
    // "likesProbability": number (0 to 100),
    // "maxLikesPerReview": number (0 to 50),
    // "autoPublish": boolean
  },
  "compiledStrategyBrief": "A comprehensive, cumulative 2-5 sentence master instruction brief that combines the Previous Compiled Strategy Brief with the Admin's latest instructions from this chat. Be specific about tone, what app features/mechanisms to emphasize, persona types, things to avoid, and special requests so the review generator executes it with 100% fidelity.",
  "appliedAdjustments": ["Short human-readable badges of any settings you updated, e.g. 'Reviews/App → 8', 'Style → Amazon & Flipkart', 'Language → Hinglish Mix'"]
}`;

  const proxyRes = await callGeminiProxy({
    apiKey: config.apiKey,
    model: config.model,
    systemInstruction,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `RECENT CONVERSATION HISTORY:\n${conversationHistoryText || '(Start of session)'}\n\nLATEST ADMIN MESSAGE:\n${userMessage}\n\nRespond with the JSON object now.`
          }
        ]
      }
    ],
    temperature: 0.75,
    responseMimeType: 'application/json'
  });

  if (!proxyRes.ok) {
    return {
      reply: `⚠️ **Gemini API Connection Issue (${proxyRes.modelUsed || config.model})**\n\n${proxyRes.error}\n\nPlease click **API Key** in the top bar to verify your Google AI Studio API key or switch to **Gemini 2.5 Flash**.`,
      error: proxyRes.error,
      modelUsed: proxyRes.modelUsed
    };
  }

  try {
    const cleanedJson = proxyRes.text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleanedJson);

    return {
      reply: parsed.reply || proxyRes.text,
      configPatches: parsed.configPatches && typeof parsed.configPatches === 'object' ? parsed.configPatches : undefined,
      compiledStrategyBrief:
        typeof parsed.compiledStrategyBrief === 'string' && parsed.compiledStrategyBrief.trim()
          ? parsed.compiledStrategyBrief.trim()
          : config.activeSessionDirective,
      appliedAdjustments: Array.isArray(parsed.appliedAdjustments) ? parsed.appliedAdjustments : [],
      modelUsed: proxyRes.modelUsed
    };
  } catch (_) {
    const combinedDirective = [config.activeSessionDirective, userMessage].filter(Boolean).join(' | ');
    return {
      reply: proxyRes.text,
      compiledStrategyBrief: combinedDirective,
      modelUsed: proxyRes.modelUsed
    };
  }
}

interface ReviewerPersonaSlot {
  index: number;
  authorName: string;
  rating: number;
  archetypeLabel: string;
  archetypeInstruction: string;
}

function assignPersonaSlotsForBatch(
  count: number,
  names: string[],
  ratings: number[],
  config: StudioConfig
): ReviewerPersonaSlot[] {
  const style = config.marketplaceStyle || 'blended_authentic';
  const archetypesByStyle: Record<MarketplaceStyle, { label: string; instruction: string }[]> = {
    blended_authentic: [
      {
        label: 'Play Store • Daily User',
        instruction: 'Write like a regular Google Play Store user talking about what this app provides, how a specific feature works in daily use, and how smoothly it runs on their Android phone.'
      },
      {
        label: 'Flipkart/Amazon • Value Verdict',
        instruction: 'Write like an Amazon/Flipkart verified reviewer evaluating whether the app delivers on its promises, what makes it better than 2-3 cluttered alternatives, and a practical takeaway.'
      },
      {
        label: 'Hinglish • Casual Desi User',
        instruction: 'Write in natural conversational Hinglish (Roman Hindi + English mix) talking casually about what they liked inside the app and how they use it with friends or in free time.'
      },
      {
        label: 'Crowd • Fast 1-Liner',
        instruction: 'Write a short, punchy 5 to 12 word micro-comment reacting directly to the app or a specific feature with casual mobile punctuation.'
      },
      {
        label: 'Play Store • Device & Network',
        instruction: 'Mention installing the latest version on a mid-range phone (e.g. Redmi, Realme, Samsung, Vivo) over 4G/5G, low storage/battery usage, and clean navigation.'
      },
      {
        label: 'Power User • Honest Feedback',
        instruction: 'Share a grounded, specific review praising the core offering while mentioning one realistic minor wish or observation.'
      }
    ],
    play_store: [
      {
        label: 'Play Store • Feature Focus',
        instruction: 'Talk specifically about the core features and modes this app provides and how easy the interface is to navigate.'
      },
      {
        label: 'Play Store • Android Device User',
        instruction: 'Mention performance on their Android phone (Redmi/Realme/Samsung/Vivo), quick loading on mobile data, and low battery drain.'
      },
      {
        label: 'Play Store • Quick Reaction',
        instruction: 'Write a brief 6 to 14 word Play Store comment about the latest update or daily experience.'
      },
      {
        label: 'Play Store • Long-Time User',
        instruction: 'Mention using the app for a couple of weeks after trying similar apps, noting what keeps them coming back.'
      }
    ],
    amazon_flipkart: [
      {
        label: 'Flipkart • Value & Utility Verdict',
        instruction: 'Evaluate what the app actually provides vs expectations, highlighting practical benefits and ease of setup.'
      },
      {
        label: 'Amazon • Pros & Cons Style',
        instruction: 'Write a structured, practical review sharing what works great and why it is worth keeping on the phone.'
      },
      {
        label: 'Verified User • Comparison',
        instruction: 'Compare this app favorably against 2-3 noisy/cluttered alternatives in the same category.'
      }
    ],
    hinglish_casual: [
      {
        label: 'Hinglish • Daily Timepass',
        instruction: 'Use natural Roman Hindi + English ("Bhai sach me...", "Kaafi sahi app hai...") talking about specific features.'
      },
      {
        label: 'Hinglish • Short Reaction',
        instruction: 'Write a short 6 to 14 word Hinglish comment praising the app or suggesting a small feature.'
      },
      {
        label: 'Hinglish • Friend Recommendation',
        instruction: 'Mention downloading it on a friend/cousin recommendation and finding the features genuinely useful.'
      }
    ],
    ultra_short_crowd: [
      {
        label: 'Crowd • 1-Line Reaction',
        instruction: 'Write a 4 to 11 word casual one-liner about the app.'
      },
      {
        label: 'Crowd • Short Feature Note',
        instruction: 'Write a 6 to 14 word casual comment mentioning one specific thing the app provides.'
      }
    ],
    critical_tester: [
      {
        label: 'QA Tester • Detailed Analysis',
        instruction: 'Praise specific capabilities from the app dossier while pointing out a realistic minor UI/feature suggestion.'
      },
      {
        label: 'Power User • Performance Check',
        instruction: 'Comment on onboarding, menu responsiveness, and one constructive improvement idea for the next update.'
      }
    ]
  };

  const pool = archetypesByStyle[style] || archetypesByStyle.blended_authentic;

  return Array.from({ length: count }, (_, idx) => {
    const rating = ratings[idx] ?? 5;
    const baseArchetype = pool[idx % pool.length];
    let ratingSpecificNote = '';
    if (rating === 5) {
      ratingSpecificNote = '5-STAR: Genuinely satisfied with what the app provides; mention 1-2 concrete specifics from the dossier.';
    } else if (rating === 4) {
      ratingSpecificNote = '4-STAR: Positive about the app and its features, with a tiny realistic wish or minor note (e.g., wish dark mode was easier to toggle or notification sound was softer).';
    } else if (rating === 3) {
      ratingSpecificNote = '3-STAR: Balanced/mixed — likes the core concept and features, but notes a minor hiccup (like occasional slow loading on weak 4G or wanting more customization).';
    } else {
      ratingSpecificNote = `${rating}-STAR: Constructive complaint (e.g., took two tries to load on an older 3GB RAM phone or waiting for an update to fix a minor screen lag), while staying polite and realistic.`;
    }

    return {
      index: idx,
      authorName: names[idx] || `User_${idx + 1}`,
      rating,
      archetypeLabel: baseArchetype.label,
      archetypeInstruction: `${baseArchetype.instruction} ${ratingSpecificNote}`
    };
  });
}

/**
 * Generates authentic, human-indistinguishable reviews in a single ultra-fast batch call (< 2 seconds per app)
 * and streams them progressively to the UI when step_by_step mode is enabled.
 */
export async function generateReviewsForAppWithGemini(
  app: any,
  config: StudioConfig,
  customPromptInstruction?: string,
  onReviewGenerated?: (review: StagedReview, currentIdx: number, total: number) => void,
  brainDirectives: BrainDirective[] = [],
  existingAppReviews: { authorName?: string; content?: string }[] = [],
  recentChatMessages: ChatMessage[] = []
): Promise<StagedReview[]> {
  const count = Math.max(1, Math.min(50, Number(config.reviewsPerApp) || 5));
  const dossier = extractAppDeepDossier(app);

  const usedNames = new Set<string>(
    existingAppReviews.map(r => (r.authorName || '').trim()).filter(Boolean)
  );
  const existingSnippets = existingAppReviews
    .slice(0, 10)
    .map(r => (r.content || '').slice(0, 85))
    .filter(Boolean);

  const names = pickUniqueNames(count, usedNames);
  const ratings = generateRatingsArray(count, config.ratingMix);
  const personaSlots = assignPersonaSlotsForBatch(count, names, ratings, config);

  const activeBrainRules = brainDirectives
    .filter(d => d.active)
    .map((d, idx) => `${idx + 1}. [${d.category.toUpperCase()}] ${d.rule}`)
    .join('\n');

  const recentUserChatContext = recentChatMessages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-6)
    .map(m => `${m.role === 'user' ? 'Admin' : 'Strategy Co-Pilot'}: ${m.text.slice(0, 300)}`)
    .join('\n');

  const masterStrategyDirective = [
    config.activeSessionDirective ? `Compiled Strategy Brief: ${config.activeSessionDirective}` : '',
    customPromptInstruction ? `Latest Admin Instruction: ${customPromptInstruction}` : ''
  ]
    .filter(Boolean)
    .join('\n');

  const marketplaceInstructions = buildMarketplaceStyleInstructions(config);

  const results: StagedReview[] = [];
  // Always use a fast batch chunk size of 15 to avoid sequential API call delays
  const chunkSize = 15;

  for (let startIdx = 0; startIdx < count; startIdx += chunkSize) {
    const chunkSlots = personaSlots.slice(startIdx, Math.min(count, startIdx + chunkSize));
    const alreadyGeneratedInThisRun = results.map(r => `- "${r.content}"`).join('\n');

    const systemInstruction = `You are an elite Marketplace Crowd Simulation Engine generating real-world user reviews for "${dossier.appName}".
Your reviews must be 100% indistinguishable from authentic human comments written on Google Play Store, Flipkart, Amazon Appstore, and Indian mobile communities.

=== COMPLETE APP MECHANISM & CONTENT DOSSIER (READ CAREFULLY) ===
- App Name: ${dossier.appName}
- Category: ${dossier.category}
- Developer: ${dossier.developer}
- Version: ${dossier.version} | Package Size: ${dossier.size}
${dossier.h1Title ? `- Headline: ${dossier.h1Title}` : ''}
${dossier.metaDescription ? `- Summary: ${dossier.metaDescription}` : ''}
${dossier.featuresList.length > 0 ? `- Specific Features & Capabilities:\n  • ${dossier.featuresList.join('\n  • ')}` : ''}
${dossier.whatAppProvidesSummary ? `- Full Description of What the App Provides & How It Works:\n${dossier.whatAppProvidesSummary}` : ''}
${dossier.faqsSummary.length > 0 ? `- Real App FAQs & Answers:\n  • ${dossier.faqsSummary.join('\n  • ')}` : ''}
${dossier.adminCallouts.length > 0 ? `- Platform Notes:\n  • ${dossier.adminCallouts.join('\n  • ')}` : ''}

=== MARKETPLACE COMMENT PSYCHOLOGY & STYLE RULES ===
${marketplaceInstructions}

${masterStrategyDirective ? `=== ADMIN & CO-PILOT SESSION STRATEGY (HIGHEST PRIORITY — FOLLOW STRICTLY) ===\n${masterStrategyDirective}\n` : ''}
${recentUserChatContext ? `=== RECENT CHAT DISCUSSION CONTEXT ===\n${recentUserChatContext}\n` : ''}
${activeBrainRules ? `=== PERMANENT PLATFORM SAFETY & TONE DIRECTIVES ===\n${activeBrainRules}\n` : ''}
${existingSnippets.length > 0 ? `=== EXISTING REVIEWS ON THIS APP (DO NOT REPEAT THESE ANGLES OR PHRASES) ===\n${existingSnippets.map(s => `- "${s}"`).join('\n')}\n` : ''}
${alreadyGeneratedInThisRun ? `=== ALREADY GENERATED IN THIS BATCH (DO NOT REPEAT OPENINGS OR SENTENCE STRUCTURES) ===\n${alreadyGeneratedInThisRun}\n` : ''}`;

    const slotPromptLines = chunkSlots
      .map(
        (slot, i) =>
          `Slot #${i + 1}: Reviewer="${slot.authorName}" | Star Rating=${slot.rating}★ | Persona="${slot.archetypeLabel}" -> ${slot.archetypeInstruction}`
      )
      .join('\n');

    const userPrompt = `Generate ${chunkSlots.length} distinct, authentic human reviews for "${dossier.appName}" matching these exact Reviewer Persona Slots:

${slotPromptLines}

CRITICAL OUTPUT REQUIREMENTS:
1. Return ONLY a valid JSON array of objects with this exact structure:
[
  {
    "slot": 1,
    "rating": 5,
    "personaTag": "Play Store • Daily User",
    "content": "The authentic review text here..."
  }
]
2. Every review MUST talk specifically about what "${dossier.appName}" provides, its actual features/category (${dossier.category}), or real user experience (onboarding, phone performance, comparison, daily routine) — NEVER generic filler.
3. Vary sentence length, openings, punctuation, and vocabulary across every single slot so they look written by ${chunkSlots.length} completely different people.`;

    const proxyRes = await callGeminiProxy({
      apiKey: config.apiKey,
      model: config.model,
      systemInstruction,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      temperature: 0.92,
      responseMimeType: 'application/json'
    });

    if (!proxyRes.ok) {
      throw new Error(proxyRes.error || `Gemini generation failed on model ${config.model}`);
    }

    let parsedItems: any[] = [];
    try {
      const cleaned = proxyRes.text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      parsedItems = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
    } catch (_) {
      const objMatches = proxyRes.text.match(/\{[\s\S]*?\}/g) || [];
      for (const rawObj of objMatches) {
        try {
          parsedItems.push(JSON.parse(rawObj));
        } catch (_) {}
      }
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      throw new Error('Gemini returned an unexpected response format. Please retry or switch to Gemini 2.5 Flash.');
    }

    for (let i = 0; i < chunkSlots.length; i++) {
      const slot = chunkSlots[i];
      const item = parsedItems[i] || parsedItems[0] || {};
      const rawContent = String(item.content || item.text || item.review || '').trim();
      const sanitizedContent = sanitizeReviewText(rawContent);

      if (!sanitizedContent) continue;

      const createdAt = generateReviewTimestamp(
        config,
        slot.index,
        count,
        results.length > 0 ? results[results.length - 1].createdAt : undefined
      );

      const stagedItem: StagedReview = {
        id: `staged-${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${slot.index}`,
        appId: String(app.id),
        appName: dossier.appName,
        appIcon: app.icon || app.icon_url || app.logo || '',
        authorName: slot.authorName,
        rating: slot.rating,
        content: sanitizedContent,
        createdAt,
        helpfulCount: generateHelpfulLikes(slot.rating, sanitizedContent.length, config),
        isPinned: slot.index === 0 && slot.rating === 5 && count >= 4 && Math.random() < 0.25,
        status: 'staged',
        personaTag: item.personaTag || slot.archetypeLabel
      };

      results.push(stagedItem);
      if (onReviewGenerated) {
        if (config.generationPacing === 'step_by_step' && i > 0) {
          await new Promise(r => setTimeout(r, 75));
        }
        onReviewGenerated(stagedItem, results.length, count);
      }
    }
  }

  return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
