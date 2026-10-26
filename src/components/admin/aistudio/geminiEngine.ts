import { 
  StudioConfig, 
  BrainMemoryDirective, 
  ChatMessage, 
  StagedReview, 
  RatingMixMode, 
  LanguageToneMode,
  LikesRateMode 
} from './types';
import { generateRealisticUserName, generateRealisticTimestamp } from './dateEngine';
import { mockApps } from '../../../lib/staticData';

export function stripHtml(html?: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Generates an authentic, realistic like/helpful vote count for a comment.
 * Sometime 2, sometime 1, occasionally 3 or 0, matching natural app store engagement.
 */
export function generateRealisticHelpfulCount(
  likesMode: LikesRateMode = 'subtle_1_2',
  index = 0,
  total = 1
): number {
  if (likesMode === 'zero_none') return 0;

  const rand = Math.random();

  if (likesMode === 'modest_1_4') {
    // 1 to 4 likes
    if (rand < 0.35) return 1;
    if (rand < 0.70) return 2;
    if (rand < 0.90) return 3;
    return 4;
  }

  if (likesMode === 'natural_0_3') {
    // 0 to 3 likes
    if (rand < 0.25) return 0;
    if (rand < 0.60) return 1;
    if (rand < 0.88) return 2;
    return 3;
  }

  // Default 'subtle_1_2': User specifically requested "sometime two, sometime one like that, lower rate of likes"
  // ~40% 1 like, ~35% 2 likes, ~15% 0 likes, ~8% 3 likes, ~2% 4 likes
  if (rand < 0.40) return 1;
  if (rand < 0.75) return 2;
  if (rand < 0.90) return 0;
  if (rand < 0.98) return 3;
  return 4;
}

/**
 * Extracts all non-sensitive content entered by the Admin in the website database.
 * Operates 100% in local memory — ZERO Firestore read operations!
 */
export function extractAdminAppProfile(app: any) {
  // 100% Local-First: If app has missing description or SEO info, check local mockApps memory
  let baseApp = app;
  if (!baseApp?.description_html || !baseApp?.seo_description || !baseApp?.features_html) {
    const localMatch = (mockApps || []).find((a: any) => 
      (a.id && a.id === app.id) || 
      (a.slug && a.slug === app.slug) ||
      (a.name && app.name && a.name.toLowerCase().trim() === app.name.toLowerCase().trim())
    );
    if (localMatch) {
      baseApp = {
        ...localMatch,
        ...app,
        description_html: app.description_html || localMatch.description_html || '',
        seo_description: app.seo_description || localMatch.seo_description || localMatch.meta_description || '',
        seo_title: app.seo_title || localMatch.seo_title || localMatch.meta_title || '',
        features_html: app.features_html || localMatch.features_html || '',
        custom_admin_box_html: app.custom_admin_box_html || localMatch.custom_admin_box_html || '',
        release_notes: app.release_notes || localMatch.release_notes || ''
      };
    }
  }

  const appName = String(baseApp.name || baseApp.title || 'App').trim();
  const category = String(baseApp.category || 'General').trim();
  const developer = String(baseApp.developer || baseApp.developer_name || '').trim();
  const seoTitle = String(baseApp.seo_title || baseApp.meta_title || '').trim();
  const seoDescription = String(baseApp.seo_description || baseApp.meta_description || '').trim();
  const description = stripHtml(baseApp.description_html || baseApp.description || '').slice(0, 1400).trim();
  const features = stripHtml(baseApp.features_html || '').slice(0, 900).trim();
  const customBox = stripHtml(baseApp.custom_admin_box_html || baseApp.custom_admin_box_heading || '').slice(0, 400).trim();
  const releaseNotes = stripHtml(baseApp.release_notes || '').slice(0, 300).trim();
  const version = String(baseApp.version || '').trim();
  const fileSize = String(baseApp.file_size || '').trim();

  let faqsSummary = '';
  if (Array.isArray(baseApp.faqs) && baseApp.faqs.length > 0) {
    faqsSummary = baseApp.faqs.slice(0, 3).map((f: any) => `Q: ${stripHtml(f.question)} A: ${stripHtml(f.answer)}`).join(' | ');
  }

  const appRating = typeof baseApp.rating === 'number' 
    ? baseApp.rating 
    : (parseFloat(String(baseApp.rating || baseApp.rating_avg || '4.5')) || 4.5);

  return {
    appName,
    category,
    developer,
    seoTitle,
    seoDescription,
    description,
    features,
    customBox,
    releaseNotes,
    version,
    fileSize,
    faqsSummary,
    appRating
  };
}

/**
 * Safety scrubber: Strictly filters out any accidental real-money or withdrawal terminology
 * to guarantee 100% compliance with the user's non-real-money catalog rules.
 */
export function sanitizeReviewText(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // Replace banned money/withdrawal words with neutral app experience words
  const replacements: [RegExp, string][] = [
    [/\b(withdrawal|withdraw|withdrawing)\b/gi, 'performance'],
    [/\b(deposit|depositing)\b/gi, 'loading'],
    [/\b(upi|paytm|bank account|bank transfer)\b/gi, 'network connection'],
    [/\b(real money|cashout|cash out|earn money|earning money)\b/gi, 'experience'],
    [/\b(rupees|rs\.?|₹)\s*\d+/gi, 'points'],
    [/\b(bonus claim|referral bonus|sign up bonus|signup bonus)\b/gi, 'welcome features'],
    [/\b(payout|wallet balance)\b/gi, 'app features']
  ];

  for (const [regex, replacement] of replacements) {
    cleaned = cleaned.replace(regex, replacement);
  }

  return cleaned.trim();
}

/**
 * Generates an authentically balanced star rating distribution matching the target catalog rating.
 * Mathematically balances across 1 to 5 stars so the average matches the app's real score.
 */
export function generateBalancedRatingDistribution(targetRating: number, count: number): number[] {
  const clamped = Math.max(1.0, Math.min(5.0, Number(targetRating) || 4.5));
  const targetSum = Math.round(clamped * count);
  
  const base = Math.max(1, Math.min(5, Math.floor(clamped)));
  const arr: number[] = new Array(count).fill(base);
  let currentSum = base * count;

  while (currentSum < targetSum) {
    let added = false;
    for (let i = 0; i < count; i++) {
      if (arr[i] < 5 && currentSum < targetSum) {
        arr[i] += 1;
        currentSum += 1;
        added = true;
      }
    }
    if (!added) break;
  }

  // Organic variance trade to ensure realistic mix (e.g. 5★ and 3★ together instead of uniform 4s)
  if (count >= 3) {
    for (let t = 0; t < Math.min(count, 3); t++) {
      const idxHigh = arr.findIndex((v, i) => v < 5);
      const idxLow = arr.findIndex((v, i) => v > 1 && i !== idxHigh);
      if (idxHigh !== -1 && idxLow !== -1 && idxHigh !== idxLow) {
        if (arr[idxHigh] + 1 <= 5 && arr[idxLow] - 1 >= 1) {
          arr[idxHigh] += 1;
          arr[idxLow] -= 1;
        }
      }
    }
  }

  // Shuffle to randomize review ordering
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

/**
 * Resolves an authentic, realistic star rating distribution for a batch of reviews.
 * Seamlessly integrates the app's real catalog score or respects the Admin's manual override.
 */
export function resolveTargetRatings(
  ratingMix: RatingMixMode,
  appRating: number,
  count: number
): number[] {
  if (ratingMix === 'auto_app_rating' || !ratingMix) {
    return generateBalancedRatingDistribution(appRating, count);
  }

  const ratings: number[] = [];

  for (let i = 0; i < count; i++) {
    let r = 5;
    const rand = Math.random();

    switch (ratingMix) {
      case 'all_5_star':
        r = 5;
        break;
      case 'all_4_star':
        r = 4;
        break;
      case 'all_3_star':
        r = 3;
        break;
      case 'all_2_star':
        r = 2;
        break;
      case 'all_1_star':
        r = 1;
        break;
      case 'critical_bugs':
        // 60% 1-star, 40% 2-star
        r = rand < 0.6 ? 1 : 2;
        break;
      case 'organic_full_mix':
        // Full organic 1-5 star spread
        if (rand < 0.40) r = 5;
        else if (rand < 0.70) r = 4;
        else if (rand < 0.85) r = 3;
        else if (rand < 0.93) r = 2;
        else r = 1;
        break;
      case 'high_praise':
        r = rand < 0.9 ? 5 : 4;
        break;
      case 'balanced_critical':
        if (rand < 0.50) r = 5;
        else if (rand < 0.80) r = 4;
        else if (rand < 0.90) r = 3;
        else if (rand < 0.96) r = 2;
        else r = 1;
        break;
      case 'natural':
      default:
        if (rand < 0.75) r = 5;
        else if (rand < 0.95) r = 4;
        else r = 3;
        break;
    }
    ratings.push(r);
  }

  return ratings;
}

/**
 * Builds the strict system instruction enforcing knowledge isolation to ONLY the website content.
 */
function buildStrictSystemInstructions(directives: BrainMemoryDirective[], tone: LanguageToneMode): string {
  const activeDirectives = directives.filter(d => d.active).map(d => `- ${d.rule}`).join('\n');

  let toneGuideline = '';
  switch (tone) {
    case 'happy_with_emojis':
      toneGuideline = 'Write enthusiastic, genuinely happy comments with natural emojis (e.g. 😊, 👍, ⭐, ❤️, 🙌). Sounds like satisfied everyday mobile users.';
      break;
    case 'super_excited_emojis':
      toneGuideline = 'Write highly energetic, passionate reviews with vivid emojis (🔥, 🚀, 💯, ⭐, 🤩, 👏). Expresses true excitement about speed, graphics, and performance.';
      break;
    case 'hinglish_natural':
      toneGuideline = 'Use casual, natural colloquial phrasing typical of everyday mobile users (e.g. "kaafi smooth chal raha hai", "UI clean aur easy hai", "daily use ke liye badhiya app hai", "lag nahi karta bilkul").';
      break;
    case 'natural_english':
      toneGuideline = 'Use casual, natural everyday English. Avoid stiff corporate vocabulary. Friendly and human.';
      break;
    case 'short_punchy':
      toneGuideline = 'Keep each review strictly 1 to 2 short sentences. Punchy, authentic, and direct.';
      break;
    case 'detailed_feedback':
      toneGuideline = 'Write 2 to 3 sentences discussing specific interface features, ease of use, or content playback.';
      break;
    case 'honest_balanced':
      toneGuideline = 'Write balanced, authentic user reviews praising the strengths while noting minor suggestions (e.g. battery, dark mode).';
      break;
    case 'feature_focused':
      toneGuideline = 'Focus deeply on feature smoothness, clean navigation, responsive touch controls, and lightweight storage usage.';
      break;
    case 'beginner_friendly':
      toneGuideline = 'Write from the perspective of someone who just installed the app and found it extremely easy and intuitive to get started.';
      break;
    case 'daily_regular_user':
      toneGuideline = 'Write from the perspective of a loyal, regular user who uses this app frequently on their phone and appreciates its consistent stability.';
      break;
    case 'all_rounder_standard':
    default:
      toneGuideline = 'Write like standard, spontaneous human comments on an Instagram video or App Store review board. Genuine, concise, varied.';
      break;
  }

  return `You are the Dedicated In-House Review Creator for our website catalog.

CRITICAL INSTRUCTIONS:

1. ABSOLUTE KNOWLEDGE BOUNDARY (STRICTLY USE PROVIDED APP DOSSIER):
   - You MUST base all comments directly on the provided app dossier below (the real admin description, meta title, meta description, and listed features).
   - If a feature is NOT in the dossier, DO NOT invent or assume it.

2. STRICT BAN ON REAL-MONEY AND GAMBLING WORDS:
   - NEVER USE: "withdrawal", "deposit", "withdraw", "UPI", "cash", "money", "rupees", "₹", "bank", "payout", "wallet", "earning", "referral bonus", "bonus claim".
   - Talk strictly about what is actually in the app: table animations, controls, streaming quality, sound effects, battery efficiency, and stability.

3. SPONTANEOUS HUMAN COMMENTING PERSPECTIVE:
   - Write like real people leaving honest feedback under a post or on the app store.
   - For 5-star: Genuine appreciation, praises specific smooth details.
   - For 4-star: Satisfied with small helpful notes (e.g. "graphics are great, battery drains a little fast").
   - For 3-star: Neutral feedback, requests improvements like dark mode or faster reconnection.
   - For 2-star: Constructive complaint about lag, missing feature, or stuttering.
   - For 1-star: Direct bug or crash report on their device (e.g. "crashes after update", "loads too slow on mobile data").

PERSISTENT STORE BRAIN DIRECTIVES:
${activeDirectives || '- Write natural, authentic everyday user reviews.'}

TONE STYLE:
${toneGuideline}
`;
}

/**
 * Detects on-the-fly configuration updates directly from the Admin's conversational chat messages.
 * Automatically aligns review counts, rating strategy, language tone, or date timeline without manual clicks.
 */
export function detectConfigUpdatesFromChat(userMessage: string): Partial<StudioConfig> {
  const lower = userMessage.toLowerCase().trim();
  const updates: Partial<StudioConfig> = {};

  // 1. Reviews count detection (e.g. "5 reviews each", "10 reviews", "create 3 reviews")
  const countMatch = lower.match(/(\d+)\s*(reviews?|comments?|each|per app)/);
  if (countMatch && countMatch[1]) {
    const num = parseInt(countMatch[1], 10);
    if (num >= 1 && num <= 500) {
      updates.reviewsPerApp = num;
    }
  }

  // 2. Rating mix detection
  if (lower.includes('all 1 star') || lower.includes('1 star only') || lower.includes('one star only') || lower.includes('1-star only') || lower.includes('1 star review')) {
    updates.ratingMix = 'all_1_star';
  } else if (lower.includes('all 2 star') || lower.includes('2 star only') || lower.includes('two star only') || lower.includes('2-star only')) {
    updates.ratingMix = 'all_2_star';
  } else if (lower.includes('all 3 star') || lower.includes('3 star only') || lower.includes('three star only') || lower.includes('3-star only')) {
    updates.ratingMix = 'all_3_star';
  } else if (lower.includes('all 4 star') || lower.includes('4 star only') || lower.includes('four star only') || lower.includes('4-star only')) {
    updates.ratingMix = 'all_4_star';
  } else if (lower.includes('all 5 star') || lower.includes('5 star only') || lower.includes('five star only') || lower.includes('5-star only')) {
    updates.ratingMix = 'all_5_star';
  } else if (lower.includes('critical') || lower.includes('bug report') || lower.includes('crash review') || lower.includes('crashes')) {
    updates.ratingMix = 'critical_bugs';
  } else if (lower.includes('organic') || lower.includes('abnormally') || lower.includes('all kind of comment') || lower.includes('every kind of star') || lower.includes('mixing') || lower.includes('mix')) {
    updates.ratingMix = 'organic_full_mix';
  } else if (lower.includes('balance') || lower.includes('catalog') || lower.includes('app rating') || lower.includes('auto rating')) {
    updates.ratingMix = 'auto_app_rating';
  }

  // 3. Language tone detection
  if (lower.includes('emoji') || lower.includes('happy')) {
    updates.languageTone = 'happy_with_emojis';
  } else if (lower.includes('hinglish') || lower.includes('hindi') || lower.includes('desi') || lower.includes('slang')) {
    updates.languageTone = 'hinglish_natural';
  } else if (lower.includes('punchy') || lower.includes('short') || lower.includes('one line')) {
    updates.languageTone = 'short_punchy';
  } else if (lower.includes('detail') || lower.includes('deep feedback')) {
    updates.languageTone = 'detailed_feedback';
  } else if (lower.includes('feature') || lower.includes('ui smoothness')) {
    updates.languageTone = 'feature_focused';
  }

  // 4. Date mode detection
  if (lower.includes('today only') || lower.includes('only today')) {
    updates.dateMode = 'today_only';
  } else if (lower.includes('yesterday only')) {
    updates.dateMode = 'yesterday_only';
  } else if (lower.includes('last 2 days') || lower.includes('past 48 hours')) {
    updates.dateMode = 'last_2_days';
  } else if (lower.includes('today and yesterday') || lower.includes('today yesterday')) {
    updates.dateMode = 'today_and_yesterday';
  }

  // 5. Likes / helpful rate detection (e.g. "sometime two, sometime one", "lower rate of likes")
  if (
    lower.includes('lower rate of likes') || 
    lower.includes('two likes') || 
    lower.includes('one likes') || 
    lower.includes('1 or 2 likes') ||
    lower.includes('1-2 likes') ||
    lower.includes('subtle likes') ||
    lower.includes('few likes') ||
    lower.includes('sometime two') ||
    lower.includes('sometime one')
  ) {
    updates.likesMode = 'subtle_1_2';
  } else if (lower.includes('no likes') || lower.includes('zero likes') || lower.includes('without likes')) {
    updates.likesMode = 'zero_none';
  } else if (lower.includes('more likes') || lower.includes('high likes') || lower.includes('4 likes') || lower.includes('1-4 likes')) {
    updates.likesMode = 'modest_1_4';
  } else if (lower.includes('organic likes') || lower.includes('natural likes')) {
    updates.likesMode = 'natural_0_3';
  }

  return updates;
}

/**
 * Handles conversational discussion with the Master AI Brain (Brain 1).
 * Discusses review strategy and confirms understanding.
 */
export async function sendChatMessageToGemini(
  userMessage: string,
  chatHistory: ChatMessage[],
  directives: BrainMemoryDirective[],
  config: StudioConfig
): Promise<string> {
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
  const apiKey = (config.apiKey || '').trim() || envKey;
  const modelName = (config.model || '').trim() || 'gemini-flash-latest';

  const systemPrompt = `${buildStrictSystemInstructions(directives, config.languageTone)}

CHAT CO-PILOT ROLE:
You are conversing with the Admin. The Admin discusses today's overall review strategy, tone, persona, happiness level, emoji usage, date spreads, star rating focus (including 1-5 star mix or critical bug feedback), or specific app angles.
You understand them deeply, give constructive human-like suggestions, and maintain a friendly, cooperative tone.
You confirm that when generating reviews, you will strictly inspect each app's Meta Title, Meta Description, and full Admin Description stored on our website.`;

  // Handle stop command immediately if typed in chat
  const lowerMsg = userMessage.toLowerCase().trim();
  if (
    lowerMsg === 'stop' || 
    lowerMsg === 'cancel' || 
    lowerMsg.includes('stop generating') || 
    lowerMsg.includes('stop the working') ||
    lowerMsg.includes('stop ai')
  ) {
    return `⏹ Understood! I have stopped the AI generation process. Any reviews produced up to this point have been safely preserved in your Staged Deck.`;
  }

  // Local fallback response if no API key is available
  if (!apiKey) {
    if (lowerMsg.includes('start') || lowerMsg.includes('generate')) {
      return `Got it! I understand today's review strategy. Click "Start Generating Now" or the green start button above, and I will inspect each selected app's real website metadata and produce tailored comments one by one.`;
    }
    return `Understood! I've locked in your directive for today's review session: "${userMessage}". I will inspect each app's real admin metadata, match the ratings, and generate realistic human reviews. When you are ready, tap Start Generating!`;
  }

  // Format conversation history for Gemini API
  const contents: any[] = [
    {
      role: 'user',
      parts: [{ text: `${systemPrompt}\n\n[ADMIN INITIALIZATION]` }]
    },
    {
      role: 'model',
      parts: [{ text: 'Understood. I am your Dedicated Review Creator. I strictly follow your website admin content, adapt to your exact requested tone and rating mix, and talk like real everyday humans.' }]
    }
  ];

  // Append recent turns
  const recentHistory = chatHistory.slice(-10);
  for (const msg of recentHistory) {
    if (msg.id === 'welcome') continue;
    contents.push({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  }

  // Append current user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  // 1. Try server-side proxy
  try {
    const srvRes = await fetch('/api/v1/admin/community/aistudio-gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        model: modelName,
        systemInstruction: systemPrompt,
        contents,
        temperature: 0.75
      })
    });
    if (srvRes.ok) {
      const data = await srvRes.json();
      if (data?.text) return data.text.trim();
    }
  } catch (_) {}

  // 2. Direct client fallback
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 1200
        }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateText) return candidateText.trim();
    }
  } catch (_) {}

  return `Understood! I've locked in your strategy: "${userMessage}". I will inspect each app's real admin metadata one by one, maintain your exact directives, and produce natural comments with authentic likes. Tap Start Generating when ready!`;
}

/**
 * Generates realistic reviews for a specific app using Gemini API or smart local templates.
 * Uses micro-batching and multivariant perspective angles to ensure maximum comment diversity!
 */
export async function generateReviewsForAppWithGemini(
  app: any,
  countToGenerate: number,
  directives: BrainMemoryDirective[],
  config: StudioConfig,
  customInstructions?: string
): Promise<StagedReview[]> {
  const profile = extractAdminAppProfile(app);
  const targetRatings = resolveTargetRatings(config.ratingMix, profile.appRating, countToGenerate);

  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
  const apiKey = (config.apiKey || '').trim() || envKey;
  const modelName = (config.model || '').trim() || 'gemini-flash-latest';
  const systemPrompt = buildStrictSystemInstructions(directives, config.languageTone);

  let allParsedReviews: Array<{ rating: number; text: string }> = [];

  // Micro-batching helper: splits large generation requests (e.g. 10 or 20) into crisp 4-5 review bursts
  const CHUNK_SIZE = 5;
  const batchesCount = Math.ceil(countToGenerate / CHUNK_SIZE);

  for (let b = 0; b < batchesCount; b++) {
    const startIdx = b * CHUNK_SIZE;
    const endIdx = Math.min(countToGenerate, startIdx + CHUNK_SIZE);
    const batchRatings = targetRatings.slice(startIdx, endIdx);
    const batchCount = batchRatings.length;
    if (batchCount === 0) continue;

    const ratingInstruction = `Target Star Ratings for this batch of ${batchCount} reviews: [${batchRatings.join(', ')} Stars].
(App Catalog Rating: ${profile.appRating.toFixed(1)}/5.0). Match the sentiment of each star rating authentically!`;

    const prompt = `Generate exactly ${batchCount} authentic user reviews for this specific app using ONLY the content provided below.

--- WEBSITE ADMIN APP DOSSIER ---
App Name: "${profile.appName}"
Category: "${profile.category}"
Catalog Official Star Rating: ${profile.appRating.toFixed(1)} / 5.0
${profile.developer ? `Developer: "${profile.developer}"` : ''}
${profile.seoTitle ? `Official Meta Title: "${profile.seoTitle}"` : ''}
${profile.seoDescription ? `Official Meta Description: "${profile.seoDescription}"` : ''}
${profile.description ? `Admin Description: "${profile.description.slice(0, 1000)}"` : ''}
${profile.features ? `Core Features: "${profile.features.slice(0, 600)}"` : ''}
${profile.customBox ? `Admin Notice: "${profile.customBox}"` : ''}
${profile.releaseNotes ? `What's New: "${profile.releaseNotes}"` : ''}
${profile.version ? `Version: "${profile.version}"` : ''}
${profile.fileSize ? `Size: "${profile.fileSize}"` : ''}
---------------------------------

SESSION DIRECTIVE:
"${customInstructions || config.activeSessionDirective || 'Natural everyday user feedback reflecting the actual website features and content.'}"

RATING INSTRUCTION:
${ratingInstruction}

CRITICAL MULTIVARIANT VARIETY INSTRUCTION:
Every single comment in this batch of ${batchCount} MUST be completely distinct in perspective, length, and angle:
- Angle 1 (Quick / Informal Reaction): Casual, punchy comment (e.g. "mast chal raha hai", "clean UI", "op update").
- Angle 2 (Specific Feature Reaction): Specific detail from Meta Title/Description (e.g. card table animations, video streaming resolution, player controls).
- Angle 3 (Hardware / Performance): Battery consumption, frame rate smoothness, lightweight storage usage, or low RAM compatibility.
- Angle 4 (Constructive / Feature Request): Reasonable suggestion (e.g. asking for dark mode, faster table reconnect, audio toggle).
- Angle 5 (Daily Social Player): Playing with friends, regular daily enjoyment.

STRICT RULES:
1. ONLY USE THE APP CONTENT ABOVE. Comment specifically on what is in this app's Meta Title, Description, and Features.
2. STRICTLY FORBIDDEN: NO real-money, gambling, betting, withdrawal, deposit, UPI, cash, or rupees words.
3. OUTPUT FORMAT: Clean JSON array of objects with the exact requested ratings:
[
  { "rating": ${batchRatings[0] || 5}, "text": "comment text here" }
]`;

    let batchParsed: Array<{ rating: number; text: string }> = [];

    // 1. Primary: Server-side Gemini API proxy with automatic backoff and model rotation
    try {
      const srvRes = await fetch('/api/v1/admin/community/aistudio-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          model: modelName,
          systemInstruction: systemPrompt,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          temperature: 0.85,
          responseMimeType: 'application/json'
        })
      });

      if (srvRes.ok) {
        const srvData = await srvRes.json();
        const rawText = srvData.text || '';
        const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const arr = JSON.parse(jsonMatch[0]);
          if (Array.isArray(arr) && arr.length > 0) {
            const mapped = arr.map((item: any, idx: number) => ({
              rating: typeof item.rating === 'number' ? Math.min(5, Math.max(1, item.rating)) : (batchRatings[idx] || 5),
              text: sanitizeReviewText(String(item.text || item.review || item.comment || '').trim())
            })).filter((item: any) => item.text.length > 0);

            if (mapped.length > 0) {
              batchParsed = mapped;
            }
          }
        }
      }
    } catch (_) {}

    // 2. Secondary fallback: Direct Google AI Studio REST call with exponential backoff on 429
    if (batchParsed.length === 0 && apiKey) {
      const callGeminiForBatch = async (targetModel: string): Promise<boolean> => {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'X-goog-api-key': apiKey
              },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
                generationConfig: {
                  temperature: 0.85,
                  responseMimeType: 'application/json'
                }
              })
            });

            if (res.status === 429) {
              // Rate limit encountered: wait 2.2s before retry
              await new Promise(r => setTimeout(r, 2200));
              continue;
            }

            if (res.ok) {
              const data = await res.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
              const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                const arr = JSON.parse(jsonMatch[0]);
                if (Array.isArray(arr) && arr.length > 0) {
                  const mapped = arr.map((item: any, idx: number) => ({
                    rating: typeof item.rating === 'number' ? Math.min(5, Math.max(1, item.rating)) : (batchRatings[idx] || 5),
                    text: sanitizeReviewText(String(item.text || item.review || item.comment || '').trim())
                  })).filter((item: any) => item.text.length > 0);

                  if (mapped.length > 0) {
                    batchParsed = mapped;
                    return true;
                  }
                }
              }
            }
          } catch (_) {}
        }
        return false;
      };

      let success = await callGeminiForBatch(modelName);
      if (!success && modelName !== 'gemini-2.5-flash') {
        success = await callGeminiForBatch('gemini-2.5-flash');
      } else if (!success && modelName !== 'gemini-flash-latest') {
        success = await callGeminiForBatch('gemini-flash-latest');
      } else if (!success && modelName !== 'gemini-3.8-flash') {
        success = await callGeminiForBatch('gemini-3.8-flash');
      }
    }

    if (batchParsed.length > 0) {
      allParsedReviews.push(...batchParsed);
    } else {
      // High-variety multivariant smart generator strictly tailored to this app's dossier & user command
      const hasEmojis = config.languageTone === 'happy_with_emojis' || 
                        (customInstructions && customInstructions.toLowerCase().includes('emoji')) ||
                        (config.activeSessionDirective && config.activeSessionDirective.toLowerCase().includes('emoji'));

      // Extract specific app context terms
      const appKeyphrase = profile.seoTitle ? profile.seoTitle.replace(/[-|].*$/, '').trim() : profile.appName;
      const cleanDescSnippet = (profile.seoDescription || profile.description || '').replace(/[^\w\s]/g, ' ').split(/\s+/).slice(0, 8).join(' ');

      // Contextual phrase pools incorporating user commands and app identity
      const pool5Star = [
        hasEmojis ? `Really love ${profile.appName}! Interface is clean and loads very fast on my phone 👍✨` : `${profile.appName} runs with great stability and fast response times. Very satisfied with the experience.`,
        hasEmojis ? `Smooth graphics and no lag at all in ${appKeyphrase} 🔥 Recommended!` : `Excellent optimization on ${profile.appName}. Smooth table flow and clear visuals.`,
        hasEmojis ? `Best app in ${profile.category} so far! Audio is clear and matchmaking connects fast ❤️` : `Very lightweight on storage, simple controls, and starts up instantly. Great job by developers.`,
        hasEmojis ? `Playing daily with friends on ${profile.appName}, super fun experience 👏` : `Intuitive UI and responsive controls. Clean navigation across all sections.`,
        hasEmojis ? `Latest update made ${profile.appName} even smoother! Battery usage is very low ⭐⭐⭐⭐⭐` : `Solid update. High frame rate and no network disconnects on mobile data.`
      ];

      const pool4Star = [
        hasEmojis ? `Good overall experience on ${profile.appName}. Very responsive touch controls! Thoda battery drain optimize ho sakta hai 😊` : `Solid app with reliable performance. Features work as advertised in ${profile.category}.`,
        hasEmojis ? `Nice graphics and clean menu navigation! Sound effects are nice 👍` : `Loads quickly without freezing. Would appreciate dark theme in next build.`,
        hasEmojis ? `Fast table joins and stable gameplay flow on ${profile.appName} ⭐` : `Responsive touch controls and fair gameplay flow. Quite satisfied with daily usage.`,
        hasEmojis ? `Enjoying the features in ${profile.appName}, great graphics! 👌` : `Very good application. Minimal storage footprint and quick app launch.`
      ];

      const pool3Star = [
        `Decent performance on ${profile.appName}. UI is clean, but takes a few seconds to reconnect on 4G network.`,
        `Average experience in ${profile.category}. Works fine on Wi-Fi, hope to see lighter animations in next patch.`,
        `Features in ${profile.appName} are good, but menu navigation could be simplified.`
      ];

      const pool2Star = [
        `Facing occasional stuttering in ${profile.appName} on mobile data. Please optimize the loading speed in next patch.`,
        `Recent update caused slight delay on older Android phones. Hope developers roll out a quick patch.`,
        `Takes too long to load on low battery mode. Needs better background optimization.`
      ];

      const pool1Star = [
        `App froze after the latest update on my device. Please fix this bug soon.`,
        `Keeps closing unexpectedly when opening the main section. Needs a stability patch for Android.`,
        `Slow connection response on mobile data. Requires urgent optimization.`
      ];

      for (let i = 0; i < batchCount; i++) {
        const r = batchRatings[i] || 5;
        let text = '';

        if (r === 5) {
          text = pool5Star[i % pool5Star.length];
        } else if (r === 4) {
          text = pool4Star[i % pool4Star.length];
        } else if (r === 3) {
          text = pool3Star[i % pool3Star.length];
        } else if (r === 2) {
          text = pool2Star[i % pool2Star.length];
        } else {
          text = pool1Star[i % pool1Star.length];
        }

        allParsedReviews.push({ rating: r, text: sanitizeReviewText(text) });
      }
    }
  }

  // Transform into full StagedReview objects with realistic dates, usernames, and likes
  return allParsedReviews.slice(0, countToGenerate).map((item, idx) => {
    const dateResult = generateRealisticTimestamp(config.dateMode, idx, countToGenerate);
    const helpfulCount = generateRealisticHelpfulCount(config.likesMode || 'subtle_1_2', idx, countToGenerate);
    return {
      id: `stage_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      appId: String(app.id || app.slug || ''),
      appName: profile.appName,
      appSlug: app.slug || '',
      appIcon: app.icon_url || '',
      appCategory: profile.category,
      userName: generateRealisticUserName(),
      rating: item.rating || 5,
      reviewText: item.text.trim(),
      dateTag: dateResult.dateTag,
      timestamp: dateResult.isoTimestamp,
      status: 'staged',
      helpful_count: helpfulCount
    };
  });
}
